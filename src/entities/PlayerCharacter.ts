import Phaser from 'phaser';
import {
  AttackSide,
  KNIFE_COMBO,
  WeaponAttack,
} from '../combat/WeaponCombo';
import { RigConnectionErrors, RigPartName } from './CharacterRig';
import { CharacterMotionPose } from './CharacterMotion';
import { gameState, CompoundWeapon } from '../state/GameState';

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
  readonly weaponContainer: Phaser.GameObjects.Container;
  readonly weaponGraphics: Phaser.GameObjects.Graphics;

  action: PlayerAction = 'idle';
  facing: AttackSide = 'right';
  comboStep = 0;

  private actionElapsed = 0;
  private queuedAttackAngle?: number;
  private comboExpiresAt = 0;
  private attackHitSent = false;
  private walkPhase = 0;
  private currentWeaponId = '';
  private weaponTipDist = 34;

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

    // Procedural ink weapon container and graphics
    this.weaponContainer = scene.add.container(14, 2);
    this.weaponGraphics = scene.add.graphics();
    this.weaponContainer.add(this.weaponGraphics);

    this.visual.add([this.bodyCircle, this.facingDot, this.labelText, this.weaponContainer]);
    this.refreshWeaponGraphics();
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
    const mat = this.weaponContainer.getWorldTransformMatrix();
    const tip = mat.transformPoint(this.weaponTipDist, 0);
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

  private refreshWeaponGraphics(): void {
    const weapon = gameState.getEquippedWeapon();
    if (this.currentWeaponId === weapon.id) return;
    this.currentWeaponId = weapon.id;
    this.weaponGraphics.clear();

    const element = weapon.stats.element;
    const colors: Record<string, { body: number; edge: number; glow: number; hilt: number; tassel: number }> = {
      wood:  { body: 0x245532, edge: 0x64d982, glow: 0x82f09f, hilt: 0x483525, tassel: 0x38b860 },
      fire:  { body: 0x8a2315, edge: 0xff6638, glow: 0xffc44d, hilt: 0x361610, tassel: 0xff4422 },
      metal: { body: 0x827029, edge: 0xf5d962, glow: 0xfffaab, hilt: 0x3b3318, tassel: 0xe6b800 },
      earth: { body: 0x5a4632, edge: 0xd9b37e, glow: 0xf2d9ad, hilt: 0x2e2216, tassel: 0xa87c4f },
      water: { body: 0x1d4a57, edge: 0x5cd3f2, glow: 0xa8f0ff, hilt: 0x142329, tassel: 0x29a8cc },
      none:  { body: 0x363d38, edge: 0xb5c4b9, glow: 0xe8ede9, hilt: 0x202421, tassel: 0x8a2315 },
    };
    const c = colors[element] ?? colors.none;

    if (weapon.words.includes('枪') || weapon.name.includes('枪')) {
      this.weaponTipDist = 46;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-14, -1.5, 38, 3);
      this.weaponGraphics.fillStyle(c.tassel, 0.9);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(24, -4);
      this.weaponGraphics.lineTo(30, 0);
      this.weaponGraphics.lineTo(24, 4);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.fillStyle(c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(24, 0);
      this.weaponGraphics.lineTo(30, -5);
      this.weaponGraphics.lineTo(46, 0);
      this.weaponGraphics.lineTo(30, 5);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.lineStyle(2, c.edge, 1);
      this.weaponGraphics.strokePath();
      this.weaponGraphics.lineStyle(1.5, c.glow, 0.9);
      this.weaponGraphics.lineBetween(26, 0, 44, 0);
    } else if (weapon.words.includes('斧') || weapon.name.includes('斧')) {
      this.weaponTipDist = 30;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-10, -2, 34, 4);
      this.weaponGraphics.fillStyle(c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(14, -3);
      this.weaponGraphics.lineTo(12, -15);
      this.weaponGraphics.lineTo(24, -13);
      this.weaponGraphics.lineTo(28, 0);
      this.weaponGraphics.lineTo(24, 13);
      this.weaponGraphics.lineTo(12, 15);
      this.weaponGraphics.lineTo(14, 3);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.lineStyle(2.5, c.edge, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(12, -15);
      this.weaponGraphics.lineTo(24, -13);
      this.weaponGraphics.lineTo(28, 0);
      this.weaponGraphics.lineTo(24, 13);
      this.weaponGraphics.lineTo(12, 15);
      this.weaponGraphics.strokePath();
    } else if (weapon.words.includes('弓') || weapon.name.includes('弓')) {
      this.weaponTipDist = 20;
      this.weaponGraphics.lineStyle(3, c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(6, -18);
      this.weaponGraphics.lineTo(16, 0);
      this.weaponGraphics.lineTo(6, 18);
      this.weaponGraphics.strokePath();
      this.weaponGraphics.lineStyle(1, c.edge, 0.9);
      this.weaponGraphics.lineBetween(6, -18, 6, 18);
    } else {
      this.weaponTipDist = 34;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-8, -2, 10, 4);
      this.weaponGraphics.lineStyle(1.5, c.edge, 0.85);
      this.weaponGraphics.strokeCircle(-8, 0, 3);
      this.weaponGraphics.fillStyle(c.edge, 1);
      this.weaponGraphics.fillRect(2, -6, 3, 12);
      this.weaponGraphics.fillStyle(c.body, 0.95);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(5, -3);
      this.weaponGraphics.lineTo(24, -3);
      this.weaponGraphics.lineTo(34, 0);
      this.weaponGraphics.lineTo(26, 4);
      this.weaponGraphics.lineTo(5, 3);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.lineStyle(2, c.edge, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(5, -3);
      this.weaponGraphics.lineTo(24, -3);
      this.weaponGraphics.lineTo(34, 0);
      this.weaponGraphics.strokePath();
      this.weaponGraphics.lineStyle(1, c.glow, 0.85);
      this.weaponGraphics.lineBetween(6, 0, 26, 0);
    }
  }

  private updateVisuals(delta: number): void {
    if (this.action === 'dead') return;

    this.refreshWeaponGraphics();
    const facingSign = this.facing === 'left' ? -1 : 1;
    this.facingDot.setX(12 * facingSign);
    this.weaponContainer.setScale(facingSign, 1);

    const baseWeaponX = 14 * facingSign;
    const baseWeaponY = 2;

    if (this.action === 'move') {
      this.walkPhase += delta * 0.014;
      const bob = Math.abs(Math.sin(this.walkPhase)) * 4;
      this.visual.setY(-bob);
      this.visual.setScale(1.0 + Math.sin(this.walkPhase) * 0.05, 1.0 - Math.sin(this.walkPhase) * 0.05);
      this.shadow.setScale(1.0 - bob * 0.03, 1.0 - bob * 0.03);

      const sway = Math.sin(this.walkPhase);
      this.weaponContainer.setPosition(baseWeaponX, baseWeaponY - bob * 0.5);
      this.weaponContainer.setRotation(Phaser.Math.DegToRad(-25 + sway * 12));
      this.bodyCircle.setRotation(0);
      this.bodyCircle.setFillStyle(0x243226);
    } else if (this.action === 'attack') {
      const p = Math.min(1.0, this.actionElapsed / this.attackSpec.duration);
      const activeP = this.attackSpec.activeAt / this.attackSpec.duration;

      if (this.comboStep === 1) {
        // Step 1: Downward Slash (下劈)
        if (p < activeP) {
          const t = p / activeP;
          const ease = t * t;
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, -75, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 4 * facingSign * ease, baseWeaponY - 6 * ease);
          this.visual.setScale(0.95, 1.05);
          this.bodyCircle.setRotation(-0.08 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const slashProgress = Math.min(1, t * 2.5);
          if (slashProgress < 1) {
            const rot = Phaser.Math.Linear(-75, 55, slashProgress);
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(rot));
            this.weaponContainer.setPosition(baseWeaponX + 12 * facingSign, baseWeaponY + 4);
            this.visual.setScale(1.18, 0.88);
            this.bodyCircle.setRotation(0.14 * facingSign);
          } else {
            const recT = (slashProgress - 1) / 1.5;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(55, -25, recT)));
            this.weaponContainer.setPosition(baseWeaponX + 4 * facingSign, baseWeaponY);
            this.visual.setScale(1.0, 1.0);
            this.bodyCircle.setRotation(0);
          }
        }
      } else if (this.comboStep === 2) {
        // Step 2: Rising Cut (上挑)
        if (p < activeP) {
          const t = p / activeP;
          const ease = t * t;
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, 65, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 2 * facingSign, baseWeaponY + 6 * ease);
          this.visual.setScale(1.05, 0.95);
          this.bodyCircle.setRotation(-0.06 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const slashProgress = Math.min(1, t * 2.5);
          if (slashProgress < 1) {
            const rot = Phaser.Math.Linear(65, -55, slashProgress);
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(rot));
            this.weaponContainer.setPosition(baseWeaponX + 10 * facingSign, baseWeaponY - 8);
            this.visual.setScale(0.9, 1.15);
            this.bodyCircle.setRotation(-0.12 * facingSign);
          } else {
            const recT = (slashProgress - 1) / 1.5;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-55, -25, recT)));
            this.weaponContainer.setPosition(baseWeaponX + 2 * facingSign, baseWeaponY);
            this.visual.setScale(1.0, 1.0);
            this.bodyCircle.setRotation(0);
          }
        }
      } else {
        // Step 3: Finisher Thrust (前刺重突)
        if (p < activeP) {
          const t = p / activeP;
          const ease = t * t;
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, 0, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 10 * facingSign * ease, baseWeaponY);
          this.visual.setScale(0.9, 1.1);
          this.bodyCircle.setRotation(-0.05 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const slashProgress = Math.min(1, t * 2.2);
          if (slashProgress < 1) {
            this.weaponContainer.setRotation(0);
            this.weaponContainer.setPosition(baseWeaponX + 26 * facingSign, baseWeaponY);
            this.visual.setScale(1.25, 0.85);
            this.bodyCircle.setRotation(0.16 * facingSign);
          } else {
            const recT = (slashProgress - 1) / 1.2;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(0, -25, recT)));
            this.weaponContainer.setPosition(baseWeaponX + 6 * facingSign, baseWeaponY);
            this.visual.setScale(1.0, 1.0);
            this.bodyCircle.setRotation(0);
          }
        }
      }
    } else if (this.action === 'dodge') {
      this.visual.setScale(1.3, 0.7);
      this.weaponContainer.setRotation(Phaser.Math.DegToRad(45));
      this.weaponContainer.setPosition(baseWeaponX - 6 * facingSign, baseWeaponY + 8);
      this.bodyCircle.setRotation(0.15 * facingSign);
      this.bodyCircle.setFillStyle(0x243226);
    } else if (this.action === 'hurt') {
      this.bodyCircle.setFillStyle(0x883333);
      this.weaponContainer.setRotation(Phaser.Math.DegToRad(-65));
      this.weaponContainer.setPosition(baseWeaponX - 10 * facingSign, baseWeaponY - 4);
      this.visual.setScale(0.9, 1.1);
    } else {
      // Idle
      this.bodyCircle.setFillStyle(0x243226);
      this.bodyCircle.setRotation(0);
      this.visual.setX(0);
      this.visual.setY(0);
      this.visual.setScale(1.0, 1.0);
      const breathe = Math.sin(this.scene.time.now * 0.003) * 2;
      this.weaponContainer.setPosition(baseWeaponX, baseWeaponY + breathe);
      this.weaponContainer.setRotation(Phaser.Math.DegToRad(-25 + Math.sin(this.scene.time.now * 0.003) * 4));
    }
  }
}
