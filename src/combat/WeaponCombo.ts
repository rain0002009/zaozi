export type AttackSide = 'left' | 'right';

export type AttackMotionName = 'knife-downward-slash' | 'knife-rising-cut' | 'knife-finisher-lunge';

export type WeaponAttack = {
  motionName: AttackMotionName;
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
};

export type WeaponComboDefinition = {
  resetWindow: number;
  attacks: readonly WeaponAttack[];
};

export const KNIFE_COMBO: WeaponComboDefinition = {
  resetWindow: 450,
  attacks: [
    {
      motionName: 'knife-downward-slash',
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
    },
    {
      motionName: 'knife-rising-cut',
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
    },
    {
      motionName: 'knife-finisher-lunge',
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
    },
  ],
};
