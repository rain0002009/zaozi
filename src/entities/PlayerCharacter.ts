import Phaser from 'phaser';

export type PlayerAction = 'idle' | 'move' | 'attack' | 'dodge' | 'hurt' | 'dead';

type RigSprites = {
  rearArm: Phaser.GameObjects.Sprite;
  body: Phaser.GameObjects.Sprite;
  head: Phaser.GameObjects.Sprite;
  frontUpperArm: Phaser.GameObjects.Sprite;
  frontForearm: Phaser.GameObjects.Sprite;
  hand: Phaser.GameObjects.Sprite;
  weapon: Phaser.GameObjects.Sprite;
};

const ATTACK_ACTIVE_AT = 112;
const ATTACK_RECOVERY_AT = 155;
const ATTACK_DURATION = 280;
const ROOT = new Phaser.Math.Vector2(128, 164);
const SHOULDER = new Phaser.Math.Vector2(148, 112).subtract(ROOT);
const ELBOW = new Phaser.Math.Vector2(164, 137).subtract(ROOT);
const WRIST = new Phaser.Math.Vector2(161, 149).subtract(ROOT);
const HAND = new Phaser.Math.Vector2(162, 157).subtract(ROOT);
const UPPER_LENGTH = SHOULDER.distance(ELBOW);
const FOREARM_LENGTH = ELBOW.distance(WRIST);
const UPPER_NEUTRAL = Phaser.Math.Angle.Between(SHOULDER.x, SHOULDER.y, ELBOW.x, ELBOW.y);
const FOREARM_NEUTRAL = Phaser.Math.Angle.Between(ELBOW.x, ELBOW.y, WRIST.x, WRIST.y);
const GRIP_FROM_WRIST = HAND.clone().subtract(WRIST);

export class PlayerCharacter {
  readonly visual: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Ellipse;
  action: PlayerAction = 'idle';

  private actionElapsed = 0;
  private attackAngle = 0;
  private lockedAimAngle = 0;
  private displayAimAngle = 0;
  private attackHitSent = false;
  private hurtAngle = 0;
  private moveBlend = 0;
  private armBehindHead = false;
  private readonly rig: RigSprites;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.shadow = scene.add.ellipse(0, 24, 54, 18, 0x172019, 0.2);
    this.visual = scene.add.container(0, 0).setScale(0.5);
    parent.add([this.shadow, this.visual]);

    const rearArm = this.sprite('ren_rear_arm_front', 108, 112).setPosition(-20, -52);
    const body = this.sprite('ren_body_front');
    const head = this.sprite('ren_head_front', 128, 78).setPosition(0, -86);
    const frontUpperArm = this.sprite('ren_front_upper_arm_front', 148, 112).setPosition(SHOULDER.x, SHOULDER.y);
    const frontForearm = this.sprite('ren_front_forearm_front', 164, 137).setPosition(ELBOW.x, ELBOW.y);
    const hand = this.sprite('ren_hand_front', 161, 149).setPosition(WRIST.x, WRIST.y);
    const weapon = this.sprite('ren_weapon_knife', 38, 128).setPosition(HAND.x, HAND.y);
    this.visual.add([rearArm, body, head, frontUpperArm, frontForearm, weapon, hand]);
    this.rig = { rearArm, body, head, frontUpperArm, frontForearm, hand, weapon };
  }

  get canAttack(): boolean {
    return this.action !== 'attack' && this.action !== 'dodge' && this.action !== 'hurt' && this.action !== 'dead';
  }

  get canDodge(): boolean {
    return this.action !== 'dead' && this.action !== 'hurt' && (this.action !== 'attack' || this.actionElapsed >= ATTACK_RECOVERY_AT);
  }

  get movementMultiplier(): number {
    return this.action === 'attack' ? 0.45 : this.action === 'hurt' || this.action === 'dead' ? 0 : 1;
  }

  startAttack(angle: number): boolean {
    if (!this.canAttack) return false;
    this.action = 'attack';
    this.actionElapsed = 0;
    this.attackAngle = angle;
    this.attackHitSent = false;
    return true;
  }

  startDodge(angle: number): boolean {
    if (!this.canDodge) return false;
    this.action = 'dodge';
    this.actionElapsed = 0;
    this.lockedAimAngle = angle;
    return true;
  }

  startHurt(incomingAngle: number): void {
    if (this.action === 'dead' || this.action === 'dodge') return;
    this.action = 'hurt';
    this.actionElapsed = 0;
    this.hurtAngle = incomingAngle;
    this.lockedAimAngle = this.displayAimAngle;
  }

  startDeath(): void {
    this.action = 'dead';
    this.actionElapsed = 0;
    this.scene.tweens.add({ targets: this.rig.weapon, angle: 74, x: this.rig.weapon.x + 38, y: this.rig.weapon.y + 54, duration: 260, ease: 'Quad.easeIn' });
    this.scene.tweens.add({ targets: this.visual, alpha: 0.12, scaleY: 0.16, y: 32, duration: 560, ease: 'Quad.easeIn' });
  }

  update(delta: number, movement: Phaser.Math.Vector2, aimAngle: number): boolean {
    const previousElapsed = this.actionElapsed;
    this.actionElapsed += delta;

    if (this.action !== 'attack' && this.action !== 'dodge' && this.action !== 'hurt' && this.action !== 'dead') {
      this.action = movement.lengthSq() > 0.01 ? 'move' : 'idle';
    }

    let attackBecameActive = false;
    if (this.action === 'attack') {
      attackBecameActive = !this.attackHitSent && previousElapsed < ATTACK_ACTIVE_AT && this.actionElapsed >= ATTACK_ACTIVE_AT;
      if (attackBecameActive) this.attackHitSent = true;
      if (this.actionElapsed >= ATTACK_DURATION) this.finishAction(movement);
    } else if (this.action === 'dodge' && this.actionElapsed >= 260) {
      this.finishAction(movement);
    } else if (this.action === 'hurt' && this.actionElapsed >= 160) {
      this.finishAction(movement);
    }

    if (this.action === 'idle' || this.action === 'move') {
      this.displayAimAngle = Phaser.Math.Angle.RotateTo(this.displayAimAngle, aimAngle, delta * 0.014);
    }
    this.moveBlend = Phaser.Math.Linear(this.moveBlend, this.action === 'move' ? 1 : 0, Math.min(1, delta / 80));
    this.pose(movement);
    return attackBecameActive;
  }

  private sprite(frame: string, originX = 128, originY = 164): Phaser.GameObjects.Sprite {
    return this.scene.add.sprite(0, 0, frame).setOrigin(originX / 256, originY / 256);
  }

  private finishAction(movement: Phaser.Math.Vector2): void {
    this.action = movement.lengthSq() > 0.01 ? 'move' : 'idle';
    this.actionElapsed = 0;
  }

  private pose(movement: Phaser.Math.Vector2): void {
    if (this.action === 'dead') return;
    const { rearArm, body, head, frontUpperArm, frontForearm, hand, weapon } = this.rig;
    const now = this.scene.time.now;
    const step = Math.sin(now * Math.PI * 4 / 1000) * this.moveBlend;
    const breath = Math.sin(now * Math.PI * 2 / 1200);
    const bob = -Math.abs(step) * 3 + breath * (1 - this.moveBlend) * 2;
    const aim = this.action === 'attack' ? this.attackAngle
      : this.action === 'dodge' || this.action === 'hurt' ? this.lockedAimAngle : this.displayAimAngle;

    this.visual.setScale(0.5);
    this.visual.setPosition(0, bob);
    this.visual.angle = 0;
    this.shadow.setScale(1 - bob * 0.012, 1 - bob * 0.006);
    body.angle = step * 2 + movement.x * this.moveBlend * 2 + Math.cos(aim) * 1.5;
    head.setPosition(Math.cos(aim) * 3, -86 + Math.sin(aim) - bob * 0.25);
    head.angle = -body.angle * 0.3;
    rearArm.angle = -step * 5 + breath * (1 - this.moveBlend) * 2;

    let bladeAngle = aim;
    let handReach = 0;
    let sweep = 0;
    if (this.action === 'attack') {
      const elapsed = this.actionElapsed;
      if (elapsed < 70) {
        const windup = Phaser.Math.Easing.Sine.InOut(elapsed / 70);
        sweep = Phaser.Math.Linear(-15, -70, windup);
        handReach = -10 * windup;
      } else if (elapsed < ATTACK_RECOVERY_AT) {
        const release = Phaser.Math.Easing.Sine.InOut((elapsed - 70) / 85);
        sweep = Phaser.Math.Linear(-70, 65, release);
        handReach = Phaser.Math.Linear(-10, 20, release);
      } else {
        const recovery = Phaser.Math.Easing.Cubic.Out((elapsed - ATTACK_RECOVERY_AT) / 125);
        sweep = Phaser.Math.Linear(65, 0, recovery);
        handReach = Phaser.Math.Linear(20, 0, recovery);
      }
      bladeAngle += Phaser.Math.DegToRad(sweep);
      body.angle -= sweep * 0.07;
      head.angle -= sweep * 0.025;
      this.visual.y += Math.max(0, 1 - Math.abs(elapsed - 90) / 120) * 4;
    } else if (this.action === 'dodge') {
      const progress = Phaser.Math.Clamp(this.actionElapsed / 260, 0, 1);
      const tuck = Math.sin(progress * Math.PI);
      this.visual.angle = Math.cos(aim) * tuck * 18;
      this.visual.setScale(0.5 * (1 + tuck * 0.08), 0.5 * (1 - tuck * 0.28));
      this.visual.y += tuck * 10;
      handReach = -8 * tuck;
      bladeAngle -= Phaser.Math.DegToRad(35 * tuck);
    } else if (this.action === 'hurt') {
      const recoil = Math.sin((this.actionElapsed / 160) * Math.PI);
      this.visual.x = Math.cos(this.hurtAngle) * recoil * 12;
      this.visual.y += Math.sin(this.hurtAngle) * recoil * 8;
      this.visual.angle = Math.cos(this.hurtAngle) * recoil * 9;
      head.x += Math.cos(this.hurtAngle) * recoil * 5;
      handReach = -6 * recoil;
    }

    const behindHead = Math.sin(aim) < (this.armBehindHead ? -0.25 : -0.45);
    if (behindHead !== this.armBehindHead) {
      if (behindHead) {
        this.visual.moveBelow(hand, head);
        this.visual.moveBelow(weapon, hand);
        this.visual.moveBelow(frontForearm, weapon);
        this.visual.moveBelow(frontUpperArm, frontForearm);
      } else {
        this.visual.moveAbove(frontUpperArm, head);
        this.visual.moveAbove(frontForearm, frontUpperArm);
        this.visual.moveAbove(weapon, frontForearm);
        this.visual.moveAbove(hand, weapon);
      }
      this.armBehindHead = behindHead;
    }

    const shoulder = SHOULDER.clone().rotate(body.rotation);
    const handTarget = shoulder.clone().add(new Phaser.Math.Vector2(
      15 + Math.cos(aim) * (8 + handReach),
      29 + Math.sin(aim) * (8 + handReach),
    ));
    handTarget.add(new Phaser.Math.Vector2(-Math.sin(aim), Math.cos(aim)).scale(Math.sin(Phaser.Math.DegToRad(sweep)) * 5));
    const handRotation = bladeAngle - Math.PI / 2;
    const gripOffset = GRIP_FROM_WRIST.clone().rotate(handRotation);
    const wristTarget = handTarget.subtract(gripOffset);

    // Solve the elbow toward the wrist, then attach the hand and knife at the solved grip.
    const toWrist = wristTarget.subtract(shoulder);
    const distance = Phaser.Math.Clamp(toWrist.length(), Math.abs(UPPER_LENGTH - FOREARM_LENGTH) + 0.1, UPPER_LENGTH + FOREARM_LENGTH - 0.1);
    const wrist = shoulder.clone().add(toWrist.normalize().scale(distance));
    const shoulderAngle = Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x)
      - Math.acos(Phaser.Math.Clamp((UPPER_LENGTH ** 2 + distance ** 2 - FOREARM_LENGTH ** 2) / (2 * UPPER_LENGTH * distance), -1, 1));
    const elbow = shoulder.clone().add(new Phaser.Math.Vector2(Math.cos(shoulderAngle), Math.sin(shoulderAngle)).scale(UPPER_LENGTH));

    frontUpperArm.setPosition(shoulder.x, shoulder.y).setRotation(shoulderAngle - UPPER_NEUTRAL);
    frontForearm.setPosition(elbow.x, elbow.y).setRotation(
      Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) - FOREARM_NEUTRAL,
    );
    hand.setPosition(wrist.x, wrist.y).setRotation(handRotation);
    weapon.setPosition(wrist.x + gripOffset.x, wrist.y + gripOffset.y).setRotation(bladeAngle);
  }
}
