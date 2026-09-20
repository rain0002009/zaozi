import Phaser from 'phaser';
import {
  AttackSide,
  KNIFE_COMBO,
  NEUTRAL_WEAPON_POSE,
  WeaponAttack,
  WeaponPose,
} from '../combat/WeaponCombo';

export type PlayerAction = 'idle' | 'move' | 'attack' | 'dodge' | 'hurt' | 'dead';

export type AttackEvent = {
  comboStep: number;
  side: AttackSide;
};

type RigSprites = {
  rearLeg: Phaser.GameObjects.Sprite;
  rearArm: Phaser.GameObjects.Sprite;
  torso: Phaser.GameObjects.Sprite;
  head: Phaser.GameObjects.Sprite;
  frontLeg: Phaser.GameObjects.Sprite;
  weaponUpperArm: Phaser.GameObjects.Sprite;
  weaponForearm: Phaser.GameObjects.Sprite;
  weaponHand: Phaser.GameObjects.Sprite;
  knife: Phaser.GameObjects.Sprite;
};

const ROOT = new Phaser.Math.Vector2(128, 164);
const TORSO_PIVOT = new Phaser.Math.Vector2(128, 135);
const HEAD_NECK = new Phaser.Math.Vector2(123, 86);
const REAR_HIP = new Phaser.Math.Vector2(124, 135);
const FRONT_HIP = new Phaser.Math.Vector2(130, 135);
const REAR_SHOULDER = new Phaser.Math.Vector2(121, 89);
const WEAPON_SHOULDER = new Phaser.Math.Vector2(128, 89);
const WEAPON_ELBOW = new Phaser.Math.Vector2(117, 114);
const WEAPON_WRIST = new Phaser.Math.Vector2(126, 135);
const WEAPON_GRIP = new Phaser.Math.Vector2(126, 138);
const KNIFE_TIP = new Phaser.Math.Vector2(166, 138);

const UPPER_LENGTH = WEAPON_SHOULDER.distance(WEAPON_ELBOW);
const FOREARM_LENGTH = WEAPON_ELBOW.distance(WEAPON_WRIST);
const UPPER_NEUTRAL = Phaser.Math.Angle.Between(
  WEAPON_SHOULDER.x, WEAPON_SHOULDER.y, WEAPON_ELBOW.x, WEAPON_ELBOW.y,
);
const FOREARM_NEUTRAL = Phaser.Math.Angle.Between(
  WEAPON_ELBOW.x, WEAPON_ELBOW.y, WEAPON_WRIST.x, WEAPON_WRIST.y,
);
const GRIP_FROM_WRIST = WEAPON_GRIP.clone().subtract(WEAPON_WRIST);

const copyPose = (pose: WeaponPose): WeaponPose => ({ ...pose });

const interpolatePose = (from: WeaponPose, to: WeaponPose, progress: number): WeaponPose => ({
  bodyY: Phaser.Math.Linear(from.bodyY, to.bodyY, progress),
  torsoAngle: Phaser.Math.Linear(from.torsoAngle, to.torsoAngle, progress),
  shoulderX: Phaser.Math.Linear(from.shoulderX, to.shoulderX, progress),
  shoulderY: Phaser.Math.Linear(from.shoulderY, to.shoulderY, progress),
  upperArmAngle: Phaser.Math.Linear(from.upperArmAngle, to.upperArmAngle, progress),
  forearmAngle: Phaser.Math.Linear(from.forearmAngle, to.forearmAngle, progress),
  bladeAngle: Phaser.Math.Linear(from.bladeAngle, to.bladeAngle, progress),
  rearArmAngle: Phaser.Math.Linear(from.rearArmAngle, to.rearArmAngle, progress),
  rearLegAngle: Phaser.Math.Linear(from.rearLegAngle, to.rearLegAngle, progress),
  frontLegAngle: Phaser.Math.Linear(from.frontLegAngle, to.frontLegAngle, progress),
});

const local = (point: Phaser.Math.Vector2): Phaser.Math.Vector2 => point.clone().subtract(ROOT);

export class PlayerCharacter {
  readonly visual: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  action: PlayerAction = 'idle';
  facing: AttackSide = 'right';
  comboStep = 0;

  private actionElapsed = 0;
  private queuedAttackAngle?: number;
  private comboExpiresAt = 0;
  private lockedAimAngle = 0;
  private attackHitSent = false;
  private hurtAngle = 0;
  private moveBlend = 0;
  private currentWeaponPose = copyPose(NEUTRAL_WEAPON_POSE);
  private attackStartPose = copyPose(NEUTRAL_WEAPON_POSE);
  private readonly rig: RigSprites;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.shadow = scene.add.ellipse(0, 24, 54, 18, 0x172019, 0.2);
    this.visual = scene.add.container(0, 0).setScale(0.5);
    parent.add([this.shadow, this.visual]);

    const rearLeg = this.jointedSprite('ren_rear_leg_side', REAR_HIP);
    const rearArm = this.jointedSprite('ren_rear_arm_side', REAR_SHOULDER);
    const torso = this.jointedSprite('ren_torso_side', TORSO_PIVOT);
    const head = this.jointedSprite('ren_head_side', HEAD_NECK);
    const frontLeg = this.jointedSprite('ren_front_leg_side', FRONT_HIP);
    const weaponUpperArm = this.jointedSprite('ren_weapon_upper_arm_side', WEAPON_SHOULDER);
    const weaponForearm = this.jointedSprite('ren_weapon_forearm_side', WEAPON_ELBOW);
    const weaponHand = this.jointedSprite('ren_weapon_hand_side', WEAPON_WRIST);
    const knife = this.jointedSprite('ren_weapon_knife', WEAPON_GRIP);
    this.visual.add([
      rearLeg, rearArm, torso, head, frontLeg,
      weaponUpperArm, weaponForearm, knife, weaponHand,
    ]);
    this.rig = {
      rearLeg, rearArm, torso, head, frontLeg,
      weaponUpperArm, weaponForearm, weaponHand, knife,
    };
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
    const tip = this.rig.knife.getWorldTransformMatrix().transformPoint(
      KNIFE_TIP.x - WEAPON_GRIP.x,
      KNIFE_TIP.y - WEAPON_GRIP.y,
    );
    return new Phaser.Math.Vector2(tip.x, tip.y);
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
    this.attackStartPose = copyPose(this.currentWeaponPose);
    this.facing = Math.cos(angle) < 0 ? 'left' : 'right';
    this.attackHitSent = false;
    this.queuedAttackAngle = undefined;
    return true;
  }

  startDodge(angle: number): boolean {
    if (!this.canDodge) return false;
    this.resetCombo();
    this.action = 'dodge';
    this.actionElapsed = 0;
    this.lockedAimAngle = angle;
    return true;
  }

  startHurt(incomingAngle: number): void {
    if (this.action === 'dead' || this.action === 'dodge') return;
    this.resetCombo();
    this.action = 'hurt';
    this.actionElapsed = 0;
    this.hurtAngle = incomingAngle;
  }

  startDeath(): void {
    this.resetCombo();
    this.action = 'dead';
    this.actionElapsed = 0;
    this.scene.tweens.add({ targets: this.rig.knife, angle: 74, x: this.rig.knife.x + 38, y: this.rig.knife.y + 54, duration: 260, ease: 'Quad.easeIn' });
    this.scene.tweens.add({ targets: this.visual, alpha: 0.12, scaleY: 0.16, y: 32, duration: 560, ease: 'Quad.easeIn' });
  }

  update(delta: number, movement: Phaser.Math.Vector2, aimAngle: number): AttackEvent | undefined {
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
        const completedAttack = this.attackSpec;
        this.currentWeaponPose = this.attackPoseAt(completedAttack, completedAttack.duration);
        if (this.queuedAttackAngle !== undefined) {
          const queuedAngle = this.queuedAttackAngle;
          this.comboStep = this.comboStep % KNIFE_COMBO.attacks.length + 1;
          this.actionElapsed = 0;
          this.attackStartPose = copyPose(this.currentWeaponPose);
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
    } else if (this.action === 'hurt' && this.actionElapsed >= 160) {
      this.finishAction(movement);
    }

    this.moveBlend = Phaser.Math.Linear(this.moveBlend, this.action === 'move' ? 1 : 0, Math.min(1, delta / 80));
    this.pose(delta, movement, aimAngle);
    return attackEvent;
  }

  private jointedSprite(frame: string, joint: Phaser.Math.Vector2): Phaser.GameObjects.Sprite {
    const position = local(joint);
    return this.scene.add.sprite(position.x, position.y, frame).setOrigin(joint.x / 256, joint.y / 256);
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

  private attackPoseAt(attack: WeaponAttack, elapsed: number): WeaponPose {
    const windupAt = attack.activeAt * 0.48;
    if (elapsed < windupAt) {
      const progress = Phaser.Math.Easing.Sine.InOut(Phaser.Math.Clamp(elapsed / windupAt, 0, 1));
      return interpolatePose(this.attackStartPose, attack.poses.windup, progress);
    }
    if (elapsed < attack.activeAt) {
      const progress = Phaser.Math.Easing.Sine.InOut(
        Phaser.Math.Clamp((elapsed - windupAt) / (attack.activeAt - windupAt), 0, 1),
      );
      return interpolatePose(attack.poses.windup, attack.poses.strike, progress);
    }
    if (elapsed < attack.chainAt) return copyPose(attack.poses.strike);
    const progress = Phaser.Math.Easing.Cubic.Out(
      Phaser.Math.Clamp((elapsed - attack.chainAt) / (attack.duration - attack.chainAt), 0, 1),
    );
    return interpolatePose(attack.poses.strike, attack.poses.recovery, progress);
  }

  private pose(delta: number, movement: Phaser.Math.Vector2, _aimAngle: number): void {
    if (this.action === 'dead') return;
    const {
      rearLeg, rearArm, torso, head, frontLeg,
      weaponUpperArm, weaponForearm, weaponHand, knife,
    } = this.rig;
    const now = this.scene.time.now;
    const step = Math.sin(now * Math.PI * 4 / 1000) * this.moveBlend;
    const breath = Math.sin(now * Math.PI * 2 / 1200);
    const bob = -Math.abs(step) * 3 + breath * (1 - this.moveBlend) * 1.5;

    this.visual.setScale(this.facing === 'left' ? -0.5 : 0.5, 0.5);
    this.visual.setPosition(0, bob);
    this.visual.angle = 0;
    this.shadow.setScale(1 - bob * 0.012, 1 - bob * 0.006);

    const rearHip = local(REAR_HIP);
    const frontHip = local(FRONT_HIP);
    const rearShoulder = local(REAR_SHOULDER);
    const torsoPivot = local(TORSO_PIVOT);
    let weaponPose = interpolatePose(
      this.currentWeaponPose,
      NEUTRAL_WEAPON_POSE,
      Math.min(1, this.action === 'attack' ? 0 : delta / 90),
    );
    if (this.action === 'attack') {
      weaponPose = this.attackPoseAt(this.attackSpec, this.actionElapsed);
      this.currentWeaponPose = copyPose(weaponPose);
    } else if (this.action === 'dodge') {
      const progress = Phaser.Math.Clamp(this.actionElapsed / 260, 0, 1);
      const tuck = Math.sin(progress * Math.PI);
      this.visual.angle = Math.cos(this.lockedAimAngle) * tuck * 18;
      const facingScale = this.facing === 'left' ? -1 : 1;
      this.visual.setScale(facingScale * 0.5 * (1 + tuck * 0.08), 0.5 * (1 - tuck * 0.28));
      this.visual.y += tuck * 10;
      weaponPose.upperArmAngle += 12 * tuck;
      weaponPose.forearmAngle += 18 * tuck;
      weaponPose.bladeAngle -= 35 * tuck;
    } else if (this.action === 'hurt') {
      const recoil = Math.sin((this.actionElapsed / 160) * Math.PI);
      this.visual.x = Math.cos(this.hurtAngle) * recoil * 12;
      this.visual.y += Math.sin(this.hurtAngle) * recoil * 8;
      this.visual.angle = Math.cos(this.hurtAngle) * recoil * 9;
      weaponPose.upperArmAngle += 8 * recoil;
      weaponPose.forearmAngle += 12 * recoil;
    }

    if (this.action !== 'attack') this.currentWeaponPose = copyPose(weaponPose);

    rearLeg.setPosition(rearHip.x, rearHip.y).setAngle(step * 10 + weaponPose.rearLegAngle);
    frontLeg.setPosition(frontHip.x, frontHip.y).setAngle(-step * 11 + weaponPose.frontLegAngle);
    rearArm.setPosition(rearShoulder.x, rearShoulder.y).setAngle(
      -step * 8 + breath * (1 - this.moveBlend) + weaponPose.rearArmAngle,
    );
    torso.setPosition(torsoPivot.x, torsoPivot.y).setAngle(
      step * 1.5 + movement.x * this.moveBlend * 1.5 + weaponPose.torsoAngle,
    );
    this.visual.y += weaponPose.bodyY;

    const torsoRotation = torso.rotation;
    const headPosition = local(HEAD_NECK).subtract(torsoPivot).rotate(torsoRotation).add(torsoPivot);
    head.setPosition(headPosition.x, headPosition.y - bob * 0.2).setRotation(-torsoRotation * 0.25);

    const shoulder = local(WEAPON_SHOULDER).subtract(torsoPivot).rotate(torsoRotation).add(torsoPivot)
      .add(new Phaser.Math.Vector2(weaponPose.shoulderX, weaponPose.shoulderY));
    const upperArmRotation = torsoRotation + Phaser.Math.DegToRad(weaponPose.upperArmAngle);
    const forearmRotation = torsoRotation + Phaser.Math.DegToRad(weaponPose.forearmAngle);
    const shoulderAngle = UPPER_NEUTRAL + upperArmRotation;
    const elbow = shoulder.clone().add(
      new Phaser.Math.Vector2(Math.cos(shoulderAngle), Math.sin(shoulderAngle)).scale(UPPER_LENGTH),
    );
    const forearmAngle = FOREARM_NEUTRAL + forearmRotation;
    const wrist = elbow.clone().add(
      new Phaser.Math.Vector2(Math.cos(forearmAngle), Math.sin(forearmAngle)).scale(FOREARM_LENGTH),
    );
    const knifeRotation = Phaser.Math.DegToRad(weaponPose.bladeAngle);
    const gripOffset = GRIP_FROM_WRIST.clone().rotate(knifeRotation);

    weaponUpperArm.setPosition(shoulder.x, shoulder.y).setRotation(upperArmRotation);
    weaponForearm.setPosition(elbow.x, elbow.y).setRotation(forearmRotation);
    weaponHand.setPosition(wrist.x, wrist.y).setRotation(knifeRotation);
    const grip = wrist.clone().add(gripOffset);
    knife.setPosition(grip.x, grip.y).setRotation(knifeRotation);
  }
}
