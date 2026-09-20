export type AttackSide = 'left' | 'right';

export type WeaponPose = {
  bodyY: number;
  torsoAngle: number;
  shoulderX: number;
  shoulderY: number;
  upperArmAngle: number;
  forearmAngle: number;
  bladeAngle: number;
  rearArmAngle: number;
  rearLegAngle: number;
  frontLegAngle: number;
};

export type WeaponAttackPoses = {
  windup: WeaponPose;
  strike: WeaponPose;
  recovery: WeaponPose;
};

export type WeaponAttack = {
  duration: number;
  activeAt: number;
  chainAt: number;
  range: number;
  arcDegrees: number;
  damage: number;
  movementMultiplier: number;
  lungeDistance: number;
  lungeDuration: number;
  knockback: number;
  poses: WeaponAttackPoses;
};

export type WeaponComboDefinition = {
  resetWindow: number;
  attacks: readonly WeaponAttack[];
};

export const NEUTRAL_WEAPON_POSE: WeaponPose = {
  bodyY: 0,
  torsoAngle: 0,
  shoulderX: 0,
  shoulderY: 0,
  upperArmAngle: 0,
  forearmAngle: 0,
  bladeAngle: 0,
  rearArmAngle: 0,
  rearLegAngle: 0,
  frontLegAngle: 0,
};

export const KNIFE_COMBO: WeaponComboDefinition = {
  resetWindow: 450,
  attacks: [
    {
      duration: 260,
      activeAt: 143,
      chainAt: 156,
      range: 112,
      arcDegrees: 120,
      damage: 1,
      movementMultiplier: 0.55,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 16,
      poses: {
        windup: {
          bodyY: -2, torsoAngle: -8, shoulderX: 0, shoulderY: -1,
          upperArmAngle: -92, forearmAngle: -132, bladeAngle: -62,
          rearArmAngle: 12, rearLegAngle: -4, frontLegAngle: 5,
        },
        strike: {
          bodyY: 3, torsoAngle: 10, shoulderX: 2, shoulderY: 1,
          upperArmAngle: -72, forearmAngle: -4, bladeAngle: 55,
          rearArmAngle: -14, rearLegAngle: 5, frontLegAngle: -7,
        },
        recovery: {
          bodyY: 2, torsoAngle: 5, shoulderX: 1, shoulderY: 1,
          upperArmAngle: -66, forearmAngle: 10, bladeAngle: 58,
          rearArmAngle: -8, rearLegAngle: 2, frontLegAngle: -3,
        },
      },
    },
    {
      duration: 230,
      activeAt: 127,
      chainAt: 138,
      range: 104,
      arcDegrees: 100,
      damage: 1,
      movementMultiplier: 0.55,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 13,
      poses: {
        windup: {
          bodyY: 2, torsoAngle: 5, shoulderX: 1, shoulderY: 1,
          upperArmAngle: -66, forearmAngle: 10, bladeAngle: 58,
          rearArmAngle: -8, rearLegAngle: 2, frontLegAngle: -3,
        },
        strike: {
          bodyY: -2, torsoAngle: -7, shoulderX: 2, shoulderY: -2,
          upperArmAngle: -100, forearmAngle: -122, bladeAngle: -55,
          rearArmAngle: 16, rearLegAngle: -3, frontLegAngle: 4,
        },
        recovery: {
          bodyY: 0, torsoAngle: -10, shoulderX: -2, shoulderY: -1,
          upperArmAngle: 58, forearmAngle: 28, bladeAngle: -38,
          rearArmAngle: 18, rearLegAngle: -7, frontLegAngle: 8,
        },
      },
    },
    {
      duration: 360,
      activeAt: 198,
      chainAt: 216,
      range: 126,
      arcDegrees: 140,
      damage: 2,
      movementMultiplier: 0,
      lungeDistance: 18,
      lungeDuration: 160,
      knockback: 28,
      poses: {
        windup: {
          bodyY: 0, torsoAngle: -12, shoulderX: -2, shoulderY: -1,
          upperArmAngle: 62, forearmAngle: 32, bladeAngle: -42,
          rearArmAngle: 22, rearLegAngle: -10, frontLegAngle: 12,
        },
        strike: {
          bodyY: 4, torsoAngle: 14, shoulderX: 3, shoulderY: 2,
          upperArmAngle: -104, forearmAngle: -52, bladeAngle: 5,
          rearArmAngle: -24, rearLegAngle: 12, frontLegAngle: -16,
        },
        recovery: {
          bodyY: -1, torsoAngle: -6, shoulderX: 0, shoulderY: -1,
          upperArmAngle: -86, forearmAngle: -110, bladeAngle: -55,
          rearArmAngle: 10, rearLegAngle: -3, frontLegAngle: 4,
        },
      },
    },
  ],
};
