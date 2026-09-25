import Phaser from 'phaser';
import {
  AttackSide,
  WeaponAttack,
  WeaponComboDefinition,
  getWeaponCombo,
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
  readonly weaponSprite: Phaser.GameObjects.Image;

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

    // Weapon container
    this.weaponContainer = scene.add.container(14, 2);
    this.weaponGraphics = scene.add.graphics();
    // Weapon sprite for custom uploaded rubbings
    this.weaponSprite = scene.add.image(0, 0, '__dummy_weapon__').setVisible(false);
    this.weaponContainer.add([this.weaponGraphics, this.weaponSprite]);

    this.visual.add([this.bodyCircle, this.facingDot, this.labelText, this.weaponContainer]);
    this.refreshWeaponVisuals();
  }

  private get currentCombo(): WeaponComboDefinition {
    const weapon = gameState.getEquippedWeapon();
    return getWeaponCombo(weapon.shape || '刀');
  }

  get canAttack(): boolean {
    if (this.action === 'attack') {
      return true; // Always allow queuing next attack in buffer during current swing
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
    const attacks = this.currentCombo.attacks;
    return attacks[Math.max(0, Math.min(this.comboStep - 1, attacks.length - 1))];
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
    const totalSteps = this.currentCombo.attacks.length;
    this.comboStep = this.scene.time.now <= this.comboExpiresAt && this.comboStep > 0
      ? (this.comboStep % totalSteps) + 1
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
    const weapon = gameState.getEquippedWeapon();
    const speedMultiplier = weapon?.stats?.attackSpeed || 1.0;
    this.actionElapsed += delta * speedMultiplier;

    if (this.action !== 'attack' && this.action !== 'dodge' && this.action !== 'hurt' && this.action !== 'dead') {
      this.action = movement.lengthSq() > 0.01 ? 'move' : 'idle';
    }

    let attackEvent: AttackEvent | undefined;
    if (this.action === 'attack') {
      if (!this.attackHitSent && previousElapsed < this.attackSpec.activeAt && this.actionElapsed >= this.attackSpec.activeAt) {
        this.attackHitSent = true;
        attackEvent = { comboStep: this.comboStep, side: this.facing };
      }

      // Early combo chain cancel: if next attack is queued and chainAt is reached, chain immediately
      const canChainNow = this.queuedAttackAngle !== undefined && this.actionElapsed >= this.attackSpec.chainAt;
      const finishedFullDuration = this.actionElapsed >= this.attackSpec.duration;

      if (canChainNow || finishedFullDuration) {
        if (this.queuedAttackAngle !== undefined) {
          const queuedAngle = this.queuedAttackAngle;
          const totalSteps = this.currentCombo.attacks.length;
          this.comboStep = (this.comboStep % totalSteps) + 1;
          this.actionElapsed = 0;
          this.facing = Math.cos(queuedAngle) < 0 ? 'left' : 'right';
          this.attackHitSent = false;
          this.queuedAttackAngle = undefined;
        } else {
          this.comboExpiresAt = this.scene.time.now + this.currentCombo.resetWindow;
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

  private refreshWeaponVisuals(): void {
    const weapon = gameState.getEquippedWeapon();
    if (this.currentWeaponId === weapon.id) return;
    this.currentWeaponId = weapon.id;

    // Check if custom uploaded image exists
    const texKey = `weapon_rubbing_${weapon.id}`;
    if (weapon.visual?.imageDataUrl) {
      if (!this.scene.textures.exists(texKey)) {
        this.scene.textures.addBase64(texKey, weapon.visual.imageDataUrl);
        this.scene.textures.once(`addtexture-${texKey}`, () => {
          this.applyWeaponSprite(weapon, texKey);
        });
      } else {
        this.applyWeaponSprite(weapon, texKey);
      }
      return;
    }

    // Fall back to procedural ink graphics
    this.weaponSprite.setVisible(false);
    this.weaponGraphics.setVisible(true);
    this.drawProceduralWeapon(weapon);
  }

  private applyWeaponSprite(weapon: CompoundWeapon, texKey: string): void {
    this.weaponGraphics.clear().setVisible(false);
    this.weaponSprite.setTexture(texKey);
    this.weaponSprite.setVisible(true);

    const grip = weapon.visual?.gripAnchor ?? { x: 0.2, y: 0.5 };
    this.weaponSprite.setOrigin(grip.x, grip.y);

    const rotOffset = weapon.visual?.rotationOffsetDeg ?? 0;
    this.weaponSprite.setAngle(rotOffset);

    const scale = weapon.visual?.scale ?? 1.0;
    this.weaponSprite.setScale(scale);

    const tip = weapon.visual?.tipAnchor ?? { x: 1.0, y: 0.5 };
    const srcImg = this.scene.textures.get(texKey).getSourceImage();
    const w = (srcImg as any)?.width ?? 48;
    const h = (srcImg as any)?.height ?? 16;
    const dx = (tip.x - grip.x) * w;
    const dy = (tip.y - grip.y) * h;
    this.weaponTipDist = Math.max(20, Math.hypot(dx, dy) * scale);
  }

  private drawProceduralWeapon(weapon: CompoundWeapon): void {
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
    const shape = weapon.shape || '刀';

    if (shape === '枪') {
      this.weaponTipDist = 48;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-14, -1.5, 42, 3);
      this.weaponGraphics.fillStyle(c.tassel, 0.9);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(28, -4);
      this.weaponGraphics.lineTo(34, 0);
      this.weaponGraphics.lineTo(28, 4);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.fillStyle(c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(28, 0);
      this.weaponGraphics.lineTo(34, -5);
      this.weaponGraphics.lineTo(48, 0);
      this.weaponGraphics.lineTo(34, 5);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.lineStyle(2, c.edge, 1);
      this.weaponGraphics.strokePath();
    } else if (shape === '剑') {
      this.weaponTipDist = 36;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-8, -2, 10, 4);
      this.weaponGraphics.fillStyle(c.edge, 1);
      this.weaponGraphics.fillRect(2, -7, 3, 14); // 护手剑格
      this.weaponGraphics.fillStyle(c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(5, -3);
      this.weaponGraphics.lineTo(28, -2);
      this.weaponGraphics.lineTo(36, 0);
      this.weaponGraphics.lineTo(28, 2);
      this.weaponGraphics.lineTo(5, 3);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.lineStyle(2, c.edge, 1);
      this.weaponGraphics.strokePath();
      this.weaponGraphics.lineStyle(1, c.glow, 0.9);
      this.weaponGraphics.lineBetween(6, 0, 32, 0);
    } else if (shape === '戟') {
      this.weaponTipDist = 46;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-12, -2, 40, 4);
      // 侧向月牙刃
      this.weaponGraphics.lineStyle(2.5, c.edge, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.arc(26, -6, 8, 0, Math.PI);
      this.weaponGraphics.strokePath();
      // 戟尖枪头
      this.weaponGraphics.fillStyle(c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(26, -3);
      this.weaponGraphics.lineTo(46, 0);
      this.weaponGraphics.lineTo(26, 3);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
    } else if (shape === '斧') {
      this.weaponTipDist = 30;
      this.weaponGraphics.fillStyle(c.hilt, 1);
      this.weaponGraphics.fillRect(-10, -2, 34, 4);
      this.weaponGraphics.fillStyle(c.body, 1);
      this.weaponGraphics.beginPath();
      this.weaponGraphics.moveTo(14, -3);
      this.weaponGraphics.lineTo(12, -16);
      this.weaponGraphics.lineTo(26, -14);
      this.weaponGraphics.lineTo(30, 0);
      this.weaponGraphics.lineTo(26, 14);
      this.weaponGraphics.lineTo(12, 16);
      this.weaponGraphics.lineTo(14, 3);
      this.weaponGraphics.closePath();
      this.weaponGraphics.fillPath();
      this.weaponGraphics.lineStyle(2.5, c.edge, 1);
      this.weaponGraphics.strokePath();
    } else if (shape === '弓') {
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
      // 默认：刀
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
      this.weaponGraphics.strokePath();
      this.weaponGraphics.lineStyle(1, c.glow, 0.85);
      this.weaponGraphics.lineBetween(6, 0, 26, 0);
    }
  }

  private updateVisuals(delta: number): void {
    if (this.action === 'dead') return;

    this.refreshWeaponVisuals();
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
      const spec = this.attackSpec;
      const p = Math.min(1.0, this.actionElapsed / spec.duration);
      const activeP = spec.activeAt / spec.duration;
      const mType = spec.motionType;

      if (mType === 'overhead') {
        // 纵劈/重砸 (斧/戟)
        if (p < activeP) {
          const t = p / activeP;
          const ease = t * t;
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, -100, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 8 * facingSign * ease, baseWeaponY - 12 * ease);
          this.visual.setScale(0.9, 1.15);
          this.bodyCircle.setRotation(-0.12 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const smashP = Math.min(1, t * 2.2);
          if (smashP < 1) {
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-100, 65, smashP)));
            this.weaponContainer.setPosition(baseWeaponX + 16 * facingSign, baseWeaponY + 10);
            this.visual.setScale(1.25, 0.82);
            this.bodyCircle.setRotation(0.2 * facingSign);
          } else {
            const rec = (smashP - 1) / 1.2;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(65, -25, rec)));
            this.weaponContainer.setPosition(baseWeaponX + 4 * facingSign, baseWeaponY);
            this.visual.setScale(1.0, 1.0);
            this.bodyCircle.setRotation(0);
          }
        }
      } else if (mType === 'thrust') {
        // 刺击/贯穿突进 (枪/剑/刀末段)
        if (p < activeP) {
          const t = p / activeP;
          const ease = t * t;
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, 0, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 12 * facingSign * ease, baseWeaponY);
          this.visual.setScale(0.92, 1.08);
          this.bodyCircle.setRotation(-0.06 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const lungeP = Math.min(1, t * 2.2);
          if (lungeP < 1) {
            this.weaponContainer.setRotation(0);
            this.weaponContainer.setPosition(baseWeaponX + 28 * facingSign, baseWeaponY);
            this.visual.setScale(1.22, 0.88);
            this.bodyCircle.setRotation(0.14 * facingSign);
          } else {
            const rec = (lungeP - 1) / 1.2;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(0, -25, rec)));
            this.weaponContainer.setPosition(baseWeaponX + 4 * facingSign, baseWeaponY);
            this.visual.setScale(1.0, 1.0);
            this.bodyCircle.setRotation(0);
          }
        }
      } else if (mType === 'sweep') {
        // 大回旋扫 (戟/斧/剑)
        if (p < activeP) {
          const t = p / activeP;
          const ease = t * t;
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, -90, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 6 * facingSign, baseWeaponY);
          this.bodyCircle.setRotation(-0.15 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const sweepP = Math.min(1, t * 2.0);
          if (sweepP < 1) {
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-90, 90, sweepP)));
            this.weaponContainer.setPosition(baseWeaponX + 18 * facingSign, baseWeaponY);
            this.visual.setScale(1.15, 0.9);
            this.bodyCircle.setRotation(0.18 * facingSign);
          } else {
            const rec = (sweepP - 1) / 1.0;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(90, -25, rec)));
            this.weaponContainer.setPosition(baseWeaponX + 4 * facingSign, baseWeaponY);
            this.visual.setScale(1.0, 1.0);
            this.bodyCircle.setRotation(0);
          }
        }
      } else if (mType === 'shot') {
        // 远程弓矢速射与蓄力
        if (p < activeP) {
          const t = p / activeP;
          this.weaponContainer.setPosition(baseWeaponX - 8 * facingSign * t, baseWeaponY);
          this.weaponContainer.setRotation(0);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const snap = Math.sin(t * Math.PI) * 4;
          this.weaponContainer.setPosition(baseWeaponX + snap * facingSign, baseWeaponY);
        }
      } else {
        // 默认：slash 挥砍 (刀/剑)
        const isUpward = this.comboStep % 2 === 0;
        const startDeg = isUpward ? 65 : -75;
        const endDeg = isUpward ? -55 : 55;

        if (p < activeP) {
          const t = p / activeP;
          const ease = Math.sin(t * Math.PI * 0.5);
          this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(-25, startDeg, ease)));
          this.weaponContainer.setPosition(baseWeaponX - 4 * facingSign * ease, baseWeaponY + (isUpward ? 6 : -6) * ease);
          this.visual.setScale(0.95, 1.05);
          this.bodyCircle.setRotation(-0.08 * facingSign * ease);
        } else {
          const t = (p - activeP) / (1 - activeP);
          const slashProgress = Math.min(1, t * 2.8);
          if (slashProgress < 1) {
            const rot = Phaser.Math.Linear(startDeg, endDeg, slashProgress);
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(rot));
            this.weaponContainer.setPosition(baseWeaponX + 12 * facingSign, baseWeaponY + (isUpward ? -4 : 4));
            this.visual.setScale(1.18, 0.88);
            this.bodyCircle.setRotation(0.12 * facingSign);
          } else {
            const recT = (slashProgress - 1) / 1.8;
            this.weaponContainer.setRotation(Phaser.Math.DegToRad(Phaser.Math.Linear(endDeg, -25, recT)));
            this.weaponContainer.setPosition(baseWeaponX + 4 * facingSign, baseWeaponY);
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
