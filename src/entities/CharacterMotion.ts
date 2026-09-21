import type { AttackMotionName, AttackSide } from '../combat/WeaponCombo';

export type MotionPoint = { x: number; y: number };

export type CharacterMotionInput = {
  elapsedMs: number;
  displacement: MotionPoint;
  facing: AttackSide;
  paused: boolean;
  action?: CharacterMotionAction;
};

export type CharacterMotionAction = {
  type: 'attack';
  name: AttackMotionName;
  actionElapsedMs: number;
  activeAtMs: number;
  chainAtMs: number;
  durationMs: number;
};

export type CharacterMotionPose = {
  action: 'locomotion' | AttackMotionName;
  phase: number;
  supportFoot: SupportFoot;
  feet: Record<SupportFoot, FootMotion>;
  travel: TravelKind;
  stride: MotionPoint;
  activity: number;
  bodyX: number;
  bodyY: number;
  torsoAngle: number;
  rearArmAngle: number;
  upperArmAngle: number;
  forearmAngle: number;
  bladeAngle: number;
};

export type SupportFoot = 'front' | 'rear';
export type TravelKind = 'forward' | 'backward' | 'sidestep' | 'diagonal' | 'stationary';

export type FootMotion = {
  sole: MotionPoint;
  lift: number;
  planted: boolean;
};

const GAIT_CYCLE_DISTANCE = 110;
const BLEND_DURATION_MS = 110;
const DIRECTION_BLEND_MS = 100;
const STANCE_END = 0.5;
const STANCE_TRAVEL = GAIT_CYCLE_DISTANCE * STANCE_END;
const BASE_SOLES: Record<SupportFoot, MotionPoint> = {
  rear: { x: 2, y: 20 },
  front: { x: 10, y: 21.5 },
};

type AttackKeyPose = Pick<CharacterMotionPose,
  | 'supportFoot' | 'feet' | 'bodyX' | 'bodyY' | 'torsoAngle' | 'rearArmAngle'
  | 'upperArmAngle' | 'forearmAngle' | 'bladeAngle'>;

type AttackPoseSet = { windup: AttackKeyPose; strike: AttackKeyPose; recovery: AttackKeyPose };

const FIRST_ATTACK_POSES: AttackPoseSet = {
  windup: {
    supportFoot: 'front',
    feet: {
      front: { sole: { x: 12, y: 21.5 }, lift: 0, planted: true },
      rear: { sole: { x: -8, y: 20 }, lift: 0, planted: false },
    },
    bodyX: 1,
    bodyY: 1,
    torsoAngle: -8,
    rearArmAngle: 12,
    upperArmAngle: -92,
    forearmAngle: -132,
    bladeAngle: -62,
  },
  strike: {
    supportFoot: 'front',
    feet: {
      front: { sole: { x: 12, y: 21.5 }, lift: 0, planted: true },
      rear: { sole: { x: 0, y: 20 }, lift: 0, planted: false },
    },
    bodyX: 5,
    bodyY: 6,
    torsoAngle: 10,
    rearArmAngle: -14,
    upperArmAngle: -72,
    forearmAngle: -4,
    bladeAngle: 55,
  },
  recovery: {
    supportFoot: 'front',
    feet: {
      front: { sole: { x: 12, y: 21.5 }, lift: 0, planted: true },
      rear: { sole: { x: 2, y: 20 }, lift: 0, planted: false },
    },
    bodyX: 3,
    bodyY: 3,
    torsoAngle: 5,
    rearArmAngle: -8,
    upperArmAngle: -66,
    forearmAngle: 10,
    bladeAngle: 58,
  },
};

const SECOND_ATTACK_POSES: AttackPoseSet = {
  windup: {
    supportFoot: 'rear',
    feet: {
      front: { sole: { x: 13, y: 19.5 }, lift: 2.5, planted: false },
      rear: { sole: { x: 0, y: 20 }, lift: 0, planted: true },
    },
    bodyX: 2,
    bodyY: 3,
    torsoAngle: 5,
    rearArmAngle: -8,
    upperArmAngle: -66,
    forearmAngle: 10,
    bladeAngle: 58,
  },
  strike: {
    supportFoot: 'rear',
    feet: {
      front: { sole: { x: 8, y: 17 }, lift: 4.5, planted: false },
      rear: { sole: { x: 0, y: 20 }, lift: 0, planted: true },
    },
    bodyX: -4,
    bodyY: 2,
    torsoAngle: -7,
    rearArmAngle: 16,
    upperArmAngle: -100,
    forearmAngle: -122,
    bladeAngle: -55,
  },
  recovery: {
    supportFoot: 'rear',
    feet: {
      front: { sole: { x: 10, y: 19 }, lift: 2, planted: false },
      rear: { sole: { x: 1, y: 20 }, lift: 0, planted: true },
    },
    bodyX: -2,
    bodyY: 2,
    torsoAngle: -10,
    rearArmAngle: 18,
    upperArmAngle: 58,
    forearmAngle: 28,
    bladeAngle: -38,
  },
};

const THIRD_ATTACK_POSES: AttackPoseSet = {
  windup: {
    supportFoot: 'rear',
    feet: {
      front: { sole: { x: 8, y: 19 }, lift: 1, planted: false },
      rear: { sole: { x: 0, y: 20 }, lift: 0, planted: true },
    },
    bodyX: -2,
    bodyY: 2,
    torsoAngle: -12,
    rearArmAngle: 22,
    upperArmAngle: 62,
    forearmAngle: 32,
    bladeAngle: -42,
  },
  strike: {
    supportFoot: 'front',
    feet: {
      front: { sole: { x: 26, y: 21.5 }, lift: 0, planted: true },
      rear: { sole: { x: 12, y: 20 }, lift: 3, planted: false },
    },
    bodyX: 8,
    bodyY: 6,
    torsoAngle: 14,
    rearArmAngle: -24,
    upperArmAngle: -104,
    forearmAngle: -52,
    bladeAngle: 5,
  },
  recovery: {
    supportFoot: 'front',
    feet: {
      front: { sole: { x: 18, y: 21.5 }, lift: 0, planted: true },
      rear: { sole: { x: 8, y: 20 }, lift: 1, planted: false },
    },
    bodyX: 2,
    bodyY: 1,
    torsoAngle: -6,
    rearArmAngle: 10,
    upperArmAngle: -86,
    forearmAngle: -110,
    bladeAngle: -55,
  },
};

const ATTACK_POSES: Record<AttackMotionName, AttackPoseSet> = {
  'knife-downward-slash': FIRST_ATTACK_POSES,
  'knife-rising-cut': SECOND_ATTACK_POSES,
  'knife-finisher-lunge': THIRD_ATTACK_POSES,
};

const smoothstep = (value: number): number => value * value * (3 - 2 * value);
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const lerp = (from: number, to: number, progress: number): number => from + (to - from) * progress;
const add = (left: MotionPoint, right: MotionPoint): MotionPoint => ({ x: left.x + right.x, y: left.y + right.y });
const subtract = (left: MotionPoint, right: MotionPoint): MotionPoint => ({ x: left.x - right.x, y: left.y - right.y });
const normalize = (point: MotionPoint): MotionPoint => {
  const length = Math.hypot(point.x, point.y);
  return length > 0 ? { x: point.x / length, y: point.y / length } : { x: 0, y: 0 };
};
const blendDirection = (from: MotionPoint, to: MotionPoint, progress: number): MotionPoint => {
  const fromAngle = Math.atan2(from.y, from.x);
  const targetAngle = Math.atan2(to.y, to.x);
  const angleDelta = Math.atan2(Math.sin(targetAngle - fromAngle), Math.cos(targetAngle - fromAngle));
  const angle = fromAngle + angleDelta * progress;
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

const interpolateFoot = (from: FootMotion, to: FootMotion, progress: number): FootMotion => ({
  sole: {
    x: lerp(from.sole.x, to.sole.x, progress),
    y: lerp(from.sole.y, to.sole.y, progress),
  },
  lift: lerp(from.lift, to.lift, progress),
  planted: progress < 0.5 ? from.planted : to.planted,
});

const interpolateAttackPose = (
  from: AttackKeyPose,
  to: AttackKeyPose,
  progress: number,
): AttackKeyPose => ({
  supportFoot: progress < 0.5 ? from.supportFoot : to.supportFoot,
  feet: {
    front: interpolateFoot(from.feet.front, to.feet.front, progress),
    rear: interpolateFoot(from.feet.rear, to.feet.rear, progress),
  },
  bodyX: lerp(from.bodyX, to.bodyX, progress),
  bodyY: lerp(from.bodyY, to.bodyY, progress),
  torsoAngle: lerp(from.torsoAngle, to.torsoAngle, progress),
  rearArmAngle: lerp(from.rearArmAngle, to.rearArmAngle, progress),
  upperArmAngle: lerp(from.upperArmAngle, to.upperArmAngle, progress),
  forearmAngle: lerp(from.forearmAngle, to.forearmAngle, progress),
  bladeAngle: lerp(from.bladeAngle, to.bladeAngle, progress),
});

const classifyTravel = (direction: MotionPoint): TravelKind => {
  const horizontal = Math.abs(direction.x);
  const vertical = Math.abs(direction.y);
  if (horizontal < 0.01 && vertical < 0.01) return 'stationary';
  if (vertical < 0.35) return direction.x >= 0 ? 'forward' : 'backward';
  if (horizontal < 0.35) return 'sidestep';
  return 'diagonal';
};

export class CharacterMotion {
  private phase = 0.25;
  private activity = 0;
  private root = { x: 0, y: 0 };
  private travelDirection = { x: 1, y: 0 };
  private directionFrom = { x: 1, y: 0 };
  private directionTarget = { x: 1, y: 0 };
  private directionBlendElapsed = DIRECTION_BLEND_MS;
  private travel: TravelKind = 'stationary';
  private travelling = false;
  private stopActivity = 1;
  private startBlend = 1;
  private readonly startingFrom: Record<SupportFoot, MotionPoint> = {
    rear: { ...BASE_SOLES.rear },
    front: { ...BASE_SOLES.front },
  };
  private readonly settlingFrom: Record<SupportFoot, MotionPoint> = {
    rear: { ...BASE_SOLES.rear },
    front: { ...BASE_SOLES.front },
  };
  private supportFoot: SupportFoot = 'front';
  private readonly plantedAt: Record<SupportFoot, MotionPoint> = {
    rear: { ...BASE_SOLES.rear },
    front: { ...BASE_SOLES.front },
  };
  private currentPose = this.createPose();
  private activeAction: CharacterMotionPose['action'] = 'locomotion';
  private attackStartPose: AttackKeyPose = this.currentPose;
  private attackDisplacement: MotionPoint = { x: 0, y: 0 };

  advance(input: CharacterMotionInput): CharacterMotionPose {
    if (input.paused) return this.currentPose;

    const facingSign = input.facing === 'right' ? 1 : -1;
    const localInputDisplacement = { x: input.displacement.x * facingSign, y: input.displacement.y };
    const localDisplacement = input.action ? { x: 0, y: 0 } : localInputDisplacement;
    const distance = Math.hypot(localDisplacement.x, localDisplacement.y);
    const wasStationary = this.activity === 0;
    if (distance <= 0.001 && this.travelling) {
      this.travelling = false;
      this.stopActivity = Math.max(this.activity, 0.001);
      this.settlingFrom.front = { ...this.currentPose.feet.front.sole };
      this.settlingFrom.rear = { ...this.currentPose.feet.rear.sole };
    }
    const targetActivity = distance > 0.001 ? 1 : 0;
    const blendStep = input.elapsedMs / BLEND_DURATION_MS;
    this.activity = targetActivity > this.activity
      ? Math.min(targetActivity, this.activity + blendStep)
      : Math.max(targetActivity, this.activity - blendStep);
    if (distance > 0) {
      if (!this.travelling) {
        this.plantedAt[this.supportFoot] = add(this.root, this.currentPose.feet[this.supportFoot].sole);
        this.startingFrom.front = { ...this.currentPose.feet.front.sole };
        this.startingFrom.rear = { ...this.currentPose.feet.rear.sole };
        this.startBlend = 0;
        if (wasStationary) this.phase = this.supportFoot === 'front' ? 0.25 : 0.75;
      }
      this.travelling = true;
      const targetDirection = normalize(localDisplacement);
      if (wasStationary) {
        this.directionFrom = { ...targetDirection };
        this.directionTarget = { ...targetDirection };
        this.directionBlendElapsed = DIRECTION_BLEND_MS;
      } else if (this.directionTarget.x * targetDirection.x + this.directionTarget.y * targetDirection.y < 0.999) {
        this.directionFrom = { ...this.travelDirection };
        this.directionTarget = { ...targetDirection };
        this.directionBlendElapsed = 0;
      }
      this.directionBlendElapsed = Math.min(
        DIRECTION_BLEND_MS,
        this.directionBlendElapsed + input.elapsedMs,
      );
      const directionBlend = clamp01(this.directionBlendElapsed / DIRECTION_BLEND_MS);
      this.travelDirection = blendDirection(this.directionFrom, this.directionTarget, directionBlend);
      this.travel = classifyTravel(targetDirection);
      this.root = add(this.root, localDisplacement);
      this.phase = (this.phase + distance / GAIT_CYCLE_DISTANCE) % 1;
      this.startBlend = Math.min(1, this.startBlend + input.elapsedMs / BLEND_DURATION_MS);
      const nextSupport = this.phase < 0.5 ? 'front' : 'rear';
      if (nextSupport !== this.supportFoot) {
        this.supportFoot = nextSupport;
        const base = BASE_SOLES[nextSupport];
        this.plantedAt[nextSupport] = add(this.root, {
          x: base.x + this.travelDirection.x * STANCE_TRAVEL / 2,
          y: base.y + this.travelDirection.y * STANCE_TRAVEL / 2,
        });
      }
    }
    const locomotionPose = this.createPose();
    if (input.action?.type === 'attack') {
      if (this.activeAction !== input.action.name) {
        this.attackStartPose = this.currentPose;
        this.attackDisplacement = { x: 0, y: 0 };
      }
      this.activeAction = input.action.name;
      this.attackDisplacement = add(this.attackDisplacement, localInputDisplacement);
      this.currentPose = this.createAttackPose(input.action);
    } else {
      this.activeAction = 'locomotion';
      this.currentPose = locomotionPose;
    }
    return this.currentPose;
  }

  private createAttackPose(action: CharacterMotionAction): CharacterMotionPose {
    const poses = ATTACK_POSES[action.name];
    const windupAt = action.activeAtMs * 0.48;
    let pose: AttackKeyPose;
    if (action.actionElapsedMs < windupAt) {
      pose = interpolateAttackPose(
        this.attackStartPose,
        poses.windup,
        smoothstep(clamp01(action.actionElapsedMs / windupAt)),
      );
    } else if (action.actionElapsedMs < action.activeAtMs) {
      pose = interpolateAttackPose(
        poses.windup,
        poses.strike,
        smoothstep(clamp01((action.actionElapsedMs - windupAt) / (action.activeAtMs - windupAt))),
      );
    } else if (action.actionElapsedMs < action.chainAtMs) {
      pose = poses.strike;
    } else {
      pose = interpolateAttackPose(
        poses.strike,
        poses.recovery,
        1 - (1 - clamp01(
          (action.actionElapsedMs - action.chainAtMs) / (action.durationMs - action.chainAtMs),
        )) ** 3,
      );
    }
    return {
      action: action.name,
      phase: this.phase,
      feet: {
        front: {
          ...pose.feet.front,
          sole: subtract(pose.feet.front.sole, this.attackDisplacement),
        },
        rear: {
          ...pose.feet.rear,
          sole: subtract(pose.feet.rear.sole, this.attackDisplacement),
        },
      },
      supportFoot: pose.supportFoot,
      travel: 'stationary',
      stride: { x: 0, y: 0 },
      activity: 0,
      bodyX: pose.bodyX,
      bodyY: pose.bodyY,
      torsoAngle: pose.torsoAngle,
      rearArmAngle: pose.rearArmAngle,
      upperArmAngle: pose.upperArmAngle,
      forearmAngle: pose.forearmAngle,
      bladeAngle: pose.bladeAngle,
    };
  }

  private createPose(): CharacterMotionPose {
    const front = this.footPose('front');
    const rear = this.footPose('rear');
    const supportSole = this.supportFoot === 'front' ? front.sole : rear.sole;
    const supportBase = BASE_SOLES[this.supportFoot];
    return {
      action: 'locomotion',
      phase: this.phase,
      supportFoot: this.supportFoot,
      feet: { front, rear },
      travel: this.travel,
      stride: {
        x: this.travelDirection.x * 16 * this.activity,
        y: this.travelDirection.y * 8 * this.activity,
      },
      activity: this.activity,
      bodyX: Math.max(-18, Math.min(18, supportSole.x - supportBase.x)) * this.activity,
      bodyY: (3 + Math.abs(Math.sin(this.phase * Math.PI * 2)) * 2) * this.activity,
      torsoAngle: (
        this.travelDirection.x * 1.4
        + Math.sin(this.phase * Math.PI * 2) * this.travelDirection.y * 0.8
      ) * this.activity,
      rearArmAngle: -Math.sin(this.phase * Math.PI * 2) * 11 * this.travelDirection.x * this.activity,
      upperArmAngle: 0,
      forearmAngle: 0,
      bladeAngle: 0,
    };
  }

  private footPose(foot: SupportFoot): FootMotion {
    if (!this.travelling) {
      const progress = clamp01(this.activity / this.stopActivity);
      return {
        sole: {
          x: lerp(BASE_SOLES[foot].x, this.settlingFrom[foot].x, progress),
          y: lerp(BASE_SOLES[foot].y, this.settlingFrom[foot].y, progress),
        },
        lift: 0,
        planted: foot === this.supportFoot,
      };
    }
    const footPhase = foot === 'front' ? this.phase : (this.phase + 0.5) % 1;
    const planted = foot === this.supportFoot && footPhase < STANCE_END;
    if (planted) {
      return { sole: subtract(this.plantedAt[foot], this.root), lift: 0, planted: true };
    }
    const freeFoot = this.freeFoot(foot);
    if (this.startBlend >= 1) return freeFoot;
    const progress = smoothstep(this.startBlend);
    return {
      sole: {
        x: lerp(this.startingFrom[foot].x, freeFoot.sole.x, progress),
        y: lerp(this.startingFrom[foot].y, freeFoot.sole.y, progress),
      },
      lift: freeFoot.lift * progress,
      planted: false,
    };
  }

  private freeFoot(foot: SupportFoot): FootMotion {
    const footPhase = foot === 'front' ? this.phase : (this.phase + 0.5) % 1;
    const swing = Math.max(0, Math.min(1, (footPhase - STANCE_END) / (1 - STANCE_END)));
    const progress = smoothstep(swing);
    const travel = -STANCE_TRAVEL / 2 + STANCE_TRAVEL * progress;
    const base = BASE_SOLES[foot];
    return {
      sole: {
        x: base.x + this.travelDirection.x * travel,
        y: base.y + this.travelDirection.y * travel - Math.sin(swing * Math.PI) * 6,
      },
      lift: Math.sin(swing * Math.PI) * 6,
      planted: false,
    };
  }
}
