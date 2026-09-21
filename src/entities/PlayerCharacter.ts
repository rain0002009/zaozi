import Phaser from 'phaser';
import {
  AttackSide,
  KNIFE_COMBO,
  WeaponAttack,
} from '../combat/WeaponCombo';
import { RigConnectionErrors, RigPartName } from './CharacterRig';
import { CharacterMotionPose } from './CharacterMotion';

export type PlayerAction = 'idle' | 'move' | 'attack' | 'dodge' | 'hurt' | 'dead';

export type AttackEvent = {
  comboStep: number;
  side: AttackSide;
};

export type RigSnapshot = {
  parts: { name: RigPartName; textureKey: string }[];
  connectionErrors: RigConnectionErrors;
  gait: {
    action: CharacterMotionPose['action'];
    phase: number;
    supportFoot: CharacterMotionPose['supportFoot'];
    travel: CharacterMotionPose['travel'];
    activity: number;
    soles: Record<CharacterMotionPose['supportFoot'], { x: number; y: number }>;
  };
};

export class PlayerCharacter {
  readonly visual: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly bodyCircle: Phaser.GameObjects.Arc;
  readonly facingDot: Phaser.GameObjects.Arc;
  readonly labelText: Phaser.GameObjects.Text;

  action: PlayerAction = 'idle';
  facing: AttackSide = 'right';
  comboStep = 0;

  private actionElapsed = 0;
  private queuedAttackAngle?: number;
  private comboExpiresAt = 0;
  private attackHitSent = false;
  private walkPhase = 0;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.shadow = scene.add.ellipse(0, 16, 44, 14, 0x172019, 0.3);
    this.visual = scene.add.container(0, 0);
    parent.add([this.shadow, this.visual]);

    // Simple geometric circle placeholder for character
    this.bodyCircle = scene.add.circle(0, 0, 20, 0x243226, 0.95)
      .setStrokeStyle(3, 0xd2c6ab);

    // Facing indicator dot
    this.facingDot = scene.add.circle(12, -4, 4, 0xe26a54);

    // '人' Character label in center
    this.labelText = scene.add.text(0, 0, '人', {
      fontFamily: 'serif',
      fontSize: '18px',
      color: '#ede3ce',
    }).setOrigin(0.5);

    this.visual.add([this.bodyCircle, this.facingDot, this.labelText]);
  }

  get canAttack(): boolean {
    if (this.action === 'attack') {
      return this.actionElapsed >= this.attackSpec.chainAt && this.queuedAttackAngle === undefined;
    }
    return this.action !== 'dodge' && this.action !== 'hurt' && this.action !== 'dead';
  }

  get canDodge(): boolean {
    return this.action !== 'dead' && this.action !== 'hurt'
      && (this.action !== 'attack' || this.actionElapsed >= this.attackSpec.chainAt);
  }

  get movementMultiplier(): number {
    return this.action === 'attack' ? this.attackSpec.movementMultiplier : this.action === 'hurt' || this.action === 'dead' ? 0 : 1;
  }

  private get attackSpec(): WeaponAttack {
    return KNIFE_COMBO.attacks[Math.max(0, this.comboStep - 1)];
  }

  facePointer(horizontalOffset: number): void {
    if ((this.action !== 'idle' && this.action !== 'move') || Math.abs(horizontalOffset) <= 20) return;
    this.facing = horizontalOffset < 0 ? 'left' : 'right';
  }

  rootMotion(delta: number): number {
    if (this.action !== 'attack' || this.attackSpec.lungeDistance === 0) return 0;
    const current = Math.min(this.actionElapsed, this.attackSpec.lungeDuration);
    const previous = Math.max(0, Math.min(this.actionElapsed - delta, this.attackSpec.lungeDuration));
    const distance = (current - previous) / this.attackSpec.lungeDuration * this.attackSpec.lungeDistance;
    return this.facing === 'right' ? distance : -distance;
  }

  weaponTipWorld(): Phaser.Math.Vector2 {
    const mat = this.visual.getWorldTransformMatrix();
    const facingSign = this.facing === 'left' ? -1 : 1;
    const tip = mat.transformPoint(26 * facingSign, 0);
    return new Phaser.Math.Vector2(tip.x, tip.y);
  }

  rigSnapshot(): RigSnapshot {
    const pos = this.visual.getWorldTransformMatrix().transformPoint(0, 0);
    return {
      parts: [],
      connectionErrors: {} as any,
      gait: {
        action: 'locomotion',
        phase: (this.walkPhase % (Math.PI * 2)) / (Math.PI * 2),
        supportFoot: 'front',
        travel: this.action === 'move' ? 'forward' : 'stationary',
        activity: this.action === 'move' ? 1 : 0,
        soles: {
          rear: { x: pos.x, y: pos.y },
          front: { x: pos.x, y: pos.y },
        },
      },
    };
  }

  startAttack(angle: number): boolean {
    if (!this.canAttack) return false;
    if (this.action === 'attack') {
      this.queuedAttackAngle = angle;
      return true;
    }
    this.comboStep = this.scene.time.now <= this.comboExpiresAt && this.comboStep > 0
      ? this.comboStep % KNIFE_COMBO.attacks.length + 1
      : 1;
    this.action = 'attack';
    this.actionElapsed = 0;
    this.facing = Math.cos(angle) < 0 ? 'left' : 'right';
    this.attackHitSent = false;
    this.queuedAttackAngle = undefined;
    return true;
  }

  startDodge(_angle: number): boolean {
    if (!this.canDodge) return false;
    this.resetCombo();
    this.action = 'dodge';
    this.actionElapsed = 0;
    return true;
  }

  startHurt(_incomingAngle: number): void {
    if (this.action === 'dead' || this.action === 'dodge') return;
    this.resetCombo();
    this.action = 'hurt';
    this.actionElapsed = 0;
  }

  startDeath(): void {
    this.resetCombo();
    this.action = 'dead';
    this.actionElapsed = 0;
    this.scene.tweens.add({
      targets: this.visual,
      alpha: 0.1,
      scaleY: 0.2,
      y: 12,
      duration: 500,
      ease: 'Quad.easeIn',
    });
  }

  update(
    delta: number,
    movement: Phaser.Math.Vector2,
    _displacement: Phaser.Math.Vector2,
    _aimAngle: number,
  ): AttackEvent | undefined {
    const previousElapsed = this.actionElapsed;
    this.actionElapsed += delta;

    if (this.action !== 'attack' && this.action !== 'dodge' && this.action !== 'hurt' && this.action !== 'dead') {
      this.action = movement.lengthSq() > 0.01 ? 'move' : 'idle';
    }

    let attackEvent: AttackEvent | undefined;
    if (this.action === 'attack') {
      if (!this.attackHitSent && previousElapsed < this.attackSpec.activeAt && this.actionElapsed >= this.attackSpec.activeAt) {
        this.attackHitSent = true;
        attackEvent = { comboStep: this.comboStep, side: this.facing };
      }
      if (this.actionElapsed >= this.attackSpec.duration) {
        if (this.queuedAttackAngle !== undefined) {
          const queuedAngle = this.queuedAttackAngle;
          this.comboStep = this.comboStep % KNIFE_COMBO.attacks.length + 1;
          this.actionElapsed = 0;
          this.facing = Math.cos(queuedAngle) < 0 ? 'left' : 'right';
          this.attackHitSent = false;
          this.queuedAttackAngle = undefined;
        } else {
          this.comboExpiresAt = this.scene.time.now + KNIFE_COMBO.resetWindow;
          this.finishAction(movement);
        }
      }
    } else if (this.action === 'dodge' && this.actionElapsed >= 260) {
      this.finishAction(movement);
    } else if (this.action === 'hurt' && this.actionElapsed >= 180) {
      this.finishAction(movement);
    }

    this.updateVisuals(delta);
    return attackEvent;
  }

  private finishAction(movement: Phaser.Math.Vector2): void {
    this.action = movement.lengthSq() > 0.01 ? 'move' : 'idle';
    this.actionElapsed = 0;
  }

  private resetCombo(): void {
    this.comboStep = 0;
    this.comboExpiresAt = 0;
    this.queuedAttackAngle = undefined;
  }

  private updateVisuals(delta: number): void {
    if (this.action === 'dead') return;

    const facingSign = this.facing === 'left' ? -1 : 1;
    this.facingDot.setX(12 * facingSign);

    if (this.action === 'move') {
      this.walkPhase += delta * 0.014;
      const bob = Math.abs(Math.sin(this.walkPhase)) * 4;
      this.visual.setY(-bob);
      this.visual.setScale(1.0 + Math.sin(this.walkPhase) * 0.05, 1.0 - Math.sin(this.walkPhase) * 0.05);
      this.shadow.setScale(1.0 - bob * 0.03, 1.0 - bob * 0.03);
    } else if (this.action === 'attack') {
      const p = Math.min(1.0, this.actionElapsed / this.attackSpec.duration);
      const lunge = Math.sin(p * Math.PI) * 8;
      this.visual.setX(lunge * facingSign);
      this.visual.setScale(1.15, 0.9);
    } else if (this.action === 'dodge') {
      this.visual.setScale(1.3, 0.7);
    } else if (this.action === 'hurt') {
      this.bodyCircle.setFillStyle(0x883333);
    } else {
      // Idle
      this.bodyCircle.setFillStyle(0x243226);
      this.visual.setX(0);
      this.visual.setY(0);
      this.visual.setScale(1.0, 1.0);
    }
  }
}
