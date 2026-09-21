import Phaser from 'phaser';
import {
  AttackSide,
  KNIFE_COMBO,
  NEUTRAL_WEAPON_POSE,
  WeaponAttack,
  WeaponPose,
} from '../combat/WeaponCombo';
import {
  createNeutralRigPose,
  RIG_CONNECTIONS,
  RIG_FOOT_SOLES,
  RIG_JOINTS,
  RIG_PARTS,
  RIG_ROOT,
  RigConnectionErrors,
  RigPartName,
} from './CharacterRig';
import { CharacterMotion, CharacterMotionPose, FootMotion } from './CharacterMotion';

export type PlayerAction = 'idle' | 'move' | 'attack' | 'dodge' | 'hurt' | 'dead';

export type AttackEvent = {
  comboStep: number;
  side: AttackSide;
};

export type RigSnapshot = {
  parts: { name: RigPartName; textureKey: string }[];
  connectionErrors: RigConnectionErrors;
  gait: {
    phase: number;
    supportFoot: CharacterMotionPose['supportFoot'];
    travel: CharacterMotionPose['travel'];
    activity: number;
    soles: Record<CharacterMotionPose['supportFoot'], { x: number; y: number }>;
  };
};

type RigSprites = Record<RigPartName, Phaser.GameObjects.Sprite>;

type LegChain = {
  thigh: Phaser.GameObjects.Sprite;
  shin: Phaser.GameObjects.Sprite;
  foot: Phaser.GameObjects.Sprite;
  hip: Phaser.Math.Vector2;
  knee: Phaser.Math.Vector2;
  ankle: Phaser.Math.Vector2;
  soleOffset: Phaser.Math.Vector2;
  upperOffset: Phaser.Math.Vector2;
  lowerOffset: Phaser.Math.Vector2;
  upperNeutralAngle: number;
  lowerNeutralAngle: number;
  bendDirection: number;
};

type LegDefinition = {
  thigh: 'rearThigh' | 'frontThigh';
  shin: 'rearShin' | 'frontShin';
  foot: 'rearFoot' | 'frontFoot';
  hip: Phaser.Math.Vector2;
  knee: Phaser.Math.Vector2;
  ankle: Phaser.Math.Vector2;
  sole: Phaser.Math.Vector2;
  bendDirection: number;
};

const ROOT = new Phaser.Math.Vector2(RIG_ROOT.x, RIG_ROOT.y);
const vector = (point: { x: number; y: number }): Phaser.Math.Vector2 => new Phaser.Math.Vector2(point.x, point.y);
const TORSO_PIVOT = vector(RIG_JOINTS.torsoPivot);
const HEAD_NECK = vector(RIG_JOINTS.headNeck);
const REAR_HIP = vector(RIG_JOINTS.rearHip);
const REAR_KNEE = vector(RIG_JOINTS.rearKnee);
const REAR_ANKLE = vector(RIG_JOINTS.rearAnkle);
const FRONT_HIP = vector(RIG_JOINTS.frontHip);
const FRONT_KNEE = vector(RIG_JOINTS.frontKnee);
const FRONT_ANKLE = vector(RIG_JOINTS.frontAnkle);
const REAR_SHOULDER = vector(RIG_JOINTS.rearShoulder);
const WEAPON_SHOULDER = vector(RIG_JOINTS.weaponShoulder);
const WEAPON_ELBOW = vector(RIG_JOINTS.weaponElbow);
const WEAPON_WRIST = vector(RIG_JOINTS.weaponWrist);
const WEAPON_GRIP = vector(RIG_JOINTS.weaponGrip);
const KNIFE_TIP = vector(RIG_JOINTS.knifeTip);

const UPPER_LENGTH = WEAPON_SHOULDER.distance(WEAPON_ELBOW);
const FOREARM_LENGTH = WEAPON_ELBOW.distance(WEAPON_WRIST);
const UPPER_NEUTRAL = Phaser.Math.Angle.Between(
  WEAPON_SHOULDER.x, WEAPON_SHOULDER.y, WEAPON_ELBOW.x, WEAPON_ELBOW.y,
);
const FOREARM_NEUTRAL = Phaser.Math.Angle.Between(
  WEAPON_ELBOW.x, WEAPON_ELBOW.y, WEAPON_WRIST.x, WEAPON_WRIST.y,
);
const GRIP_FROM_WRIST = WEAPON_GRIP.clone().subtract(WEAPON_WRIST);

const createLegChain = (sprites: RigSprites, definition: LegDefinition): LegChain => ({
  thigh: sprites[definition.thigh],
  shin: sprites[definition.shin],
  foot: sprites[definition.foot],
  hip: definition.hip,
  knee: definition.knee,
  ankle: definition.ankle,
  soleOffset: definition.sole.clone().subtract(definition.ankle),
  upperOffset: definition.knee.clone().subtract(definition.hip),
  lowerOffset: definition.ankle.clone().subtract(definition.knee),
  upperNeutralAngle: Phaser.Math.Angle.Between(
    definition.hip.x, definition.hip.y, definition.knee.x, definition.knee.y,
  ),
  lowerNeutralAngle: Phaser.Math.Angle.Between(
    definition.knee.x, definition.knee.y, definition.ankle.x, definition.ankle.y,
  ),
  bendDirection: definition.bendDirection,
});

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
  private readonly motion = new CharacterMotion();
  private motionPose: CharacterMotionPose;
  private currentWeaponPose = copyPose(NEUTRAL_WEAPON_POSE);
  private attackStartPose = copyPose(NEUTRAL_WEAPON_POSE);
  private readonly rig: RigSprites;
  private readonly rearLeg: LegChain;
  private readonly frontLeg: LegChain;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.shadow = scene.add.ellipse(0, 24, 54, 18, 0x172019, 0.2);
    this.visual = scene.add.container(0, 0).setScale(0.5);
    parent.add([this.shadow, this.visual]);

    const sprites = Object.fromEntries(RIG_PARTS.map((part) => [
      part.name,
      this.jointedSprite(part.textureKey, new Phaser.Math.Vector2(part.anchor.x, part.anchor.y)),
    ])) as Record<RigPartName, Phaser.GameObjects.Sprite>;
    this.visual.add(RIG_PARTS.map((part) => sprites[part.name]));
    this.rig = sprites;
    this.rearLeg = createLegChain(sprites, {
      thigh: 'rearThigh',
      shin: 'rearShin',
      foot: 'rearFoot',
      hip: REAR_HIP,
      knee: REAR_KNEE,
      ankle: REAR_ANKLE,
      sole: vector(RIG_JOINTS.rearSole),
      bendDirection: 1,
    });
    this.frontLeg = createLegChain(sprites, {
      thigh: 'frontThigh',
      shin: 'frontShin',
      foot: 'frontFoot',
      hip: FRONT_HIP,
      knee: FRONT_KNEE,
      ankle: FRONT_ANKLE,
      sole: vector(RIG_JOINTS.frontSole),
      bendDirection: -1,
    });
    this.motionPose = this.motion.advance({
      elapsedMs: 0,
      displacement: { x: 0, y: 0 },
      facing: this.facing,
      paused: false,
    });
    const neutralPose = createNeutralRigPose();
    RIG_PARTS.forEach((part) => {
      const pose = neutralPose[part.name];
      sprites[part.name].setPosition(pose.x, pose.y).setRotation(pose.rotation);
    });
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

  rigSnapshot(): RigSnapshot {
    const connectionErrors = Object.fromEntries(RIG_CONNECTIONS.map((connection) => {
      const from = this.rig[connection.from].getWorldTransformMatrix().transformPoint(
        connection.fromPoint.x,
        connection.fromPoint.y,
      );
      const to = this.rig[connection.to].getWorldTransformMatrix().transformPoint(
        connection.toPoint.x,
        connection.toPoint.y,
      );
      return [connection.name, Math.hypot(from.x - to.x, from.y - to.y)];
    })) as RigConnectionErrors;
    const rearSole = this.rig.rearFoot.getWorldTransformMatrix().transformPoint(
      RIG_FOOT_SOLES.rearSole.point.x,
      RIG_FOOT_SOLES.rearSole.point.y,
    );
    const frontSole = this.rig.frontFoot.getWorldTransformMatrix().transformPoint(
      RIG_FOOT_SOLES.frontSole.point.x,
      RIG_FOOT_SOLES.frontSole.point.y,
    );
    return {
      parts: RIG_PARTS.map((part) => ({ name: part.name, textureKey: this.rig[part.name].texture.key })),
      connectionErrors,
      gait: {
        phase: this.motionPose.phase,
        supportFoot: this.motionPose.supportFoot,
        travel: this.motionPose.travel,
        activity: this.motionPose.activity,
        soles: {
          rear: { x: rearSole.x, y: rearSole.y },
          front: { x: frontSole.x, y: frontSole.y },
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

  update(
    delta: number,
    movement: Phaser.Math.Vector2,
    displacement: Phaser.Math.Vector2,
    aimAngle: number,
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

    const gaitDisplacement = this.action === 'move' ? displacement : Phaser.Math.Vector2.ZERO;
    this.motionPose = this.motion.advance({
      elapsedMs: delta,
      displacement: gaitDisplacement,
      facing: this.facing,
      paused: false,
    });
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

  private poseRigidLeg(chain: LegChain, angleDegrees: number): void {
    const { thigh, shin, foot, hip, knee, ankle } = chain;
    const rotation = Phaser.Math.DegToRad(angleDegrees);
    const hipPosition = local(hip);
    const kneePosition = knee.clone().subtract(hip).rotate(rotation).add(hipPosition);
    const anklePosition = ankle.clone().subtract(knee).rotate(rotation).add(kneePosition);
    thigh.setPosition(hipPosition.x, hipPosition.y).setRotation(rotation);
    shin.setPosition(kneePosition.x, kneePosition.y).setRotation(rotation);
    foot.setPosition(anklePosition.x, anklePosition.y).setRotation(rotation);
  }

  private poseGaitLeg(chain: LegChain, foot: FootMotion, bodyY: number): void {
    const { thigh, shin, foot: footSprite, hip } = chain;
    const hipPosition = local(hip);
    const footRotation = Phaser.Math.DegToRad(foot.lift * (chain.bendDirection > 0 ? -0.45 : 0.45));
    const targetSole = new Phaser.Math.Vector2(
      (foot.sole.x - this.motionPose.bodyX) * 2,
      (foot.sole.y - bodyY) * 2,
    );
    const targetAnkle = targetSole.subtract(chain.soleOffset.clone().rotate(footRotation));
    const hipToAnkle = targetAnkle.clone().subtract(hipPosition);
    const upperLength = chain.upperOffset.length();
    const lowerLength = chain.lowerOffset.length();
    const distance = Phaser.Math.Clamp(
      hipToAnkle.length(),
      Math.abs(upperLength - lowerLength) + 0.01,
      upperLength + lowerLength - 0.01,
    );
    const targetAngle = hipToAnkle.angle();
    const kneeOffset = Math.acos(Phaser.Math.Clamp(
      (distance * distance + upperLength * upperLength - lowerLength * lowerLength)
        / (2 * distance * upperLength),
      -1,
      1,
    ));
    const upperAngle = targetAngle - chain.bendDirection * kneeOffset;
    const kneePosition = hipPosition.clone().add(
      new Phaser.Math.Vector2(Math.cos(upperAngle), Math.sin(upperAngle)).scale(upperLength),
    );
    const lowerAngle = Phaser.Math.Angle.Between(
      kneePosition.x,
      kneePosition.y,
      targetAnkle.x,
      targetAnkle.y,
    );
    const anklePosition = kneePosition.clone().add(
      new Phaser.Math.Vector2(Math.cos(lowerAngle), Math.sin(lowerAngle)).scale(lowerLength),
    );

    thigh.setPosition(hipPosition.x, hipPosition.y).setRotation(upperAngle - chain.upperNeutralAngle);
    shin.setPosition(kneePosition.x, kneePosition.y).setRotation(lowerAngle - chain.lowerNeutralAngle);
    footSprite.setPosition(anklePosition.x, anklePosition.y).setRotation(footRotation);
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
      rearThigh, rearShin, rearFoot, rearArm, torso, head,
      frontThigh, frontShin, frontFoot, garmentHem,
      weaponUpperArm, weaponForearm, weaponHand, knife,
    } = this.rig;
    const now = this.scene.time.now;
    const breath = Math.sin(now * Math.PI * 2 / 1200);
    const gaitActive = this.action === 'move' || this.action === 'idle';
    const bob = gaitActive
      ? this.motionPose.bodyY + breath * (1 - this.motionPose.activity) * 1.5
      : breath * 0.4;

    const facingScale = this.facing === 'left' ? -1 : 1;
    this.visual.setScale(facingScale * 0.5, 0.5);
    this.visual.setPosition(gaitActive ? facingScale * this.motionPose.bodyX : 0, bob);
    this.visual.angle = 0;
    this.shadow.setScale(1 - bob * 0.012, 1 - bob * 0.006);

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

    if (gaitActive) {
      this.poseGaitLeg(this.rearLeg, this.motionPose.feet.rear, bob);
      this.poseGaitLeg(this.frontLeg, this.motionPose.feet.front, bob);
    } else {
      this.poseRigidLeg(this.rearLeg, weaponPose.rearLegAngle);
      this.poseRigidLeg(this.frontLeg, weaponPose.frontLegAngle);
    }
    rearArm.setPosition(rearShoulder.x, rearShoulder.y).setAngle(
      this.motionPose.rearArmAngle + breath * (1 - this.motionPose.activity) + weaponPose.rearArmAngle,
    );
    torso.setPosition(torsoPivot.x, torsoPivot.y).setAngle(
      this.motionPose.torsoAngle + movement.x * this.motionPose.activity * 0.8 + weaponPose.torsoAngle,
    );
    garmentHem.setPosition(torso.x, torso.y).setRotation(torso.rotation);
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
