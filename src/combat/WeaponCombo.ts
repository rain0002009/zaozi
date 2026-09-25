import { WeaponShape } from '../data/equipmentTypes';

export type AttackSide = 'left' | 'right';

export type AttackMotionType = 'slash' | 'thrust' | 'overhead' | 'sweep' | 'shot';

export type AttackMotionName =
  | 'knife-downward-slash'
  | 'knife-rising-cut'
  | 'knife-finisher-lunge'
  | 'spear-mid-thrust'
  | 'spear-rapid-pierce'
  | 'spear-turn-thrust'
  | 'spear-dragon-lunge'
  | 'sword-level-thrust'
  | 'sword-horizontal-slash'
  | 'sword-rising-flick'
  | 'sword-spin-cut'
  | 'sword-beam-finisher'
  | 'halberd-overhead-chop'
  | 'halberd-sweeping-arc'
  | 'halberd-hook-cut'
  | 'axe-slam-smash'
  | 'axe-earthquake-sweep'
  | 'bow-single-shot'
  | 'bow-twin-volley'
  | 'bow-pierce-heavy'
  | (string & {});

export type WeaponAttack = {
  motionName: AttackMotionName;
  name: string; // 招式名称
  motionType: AttackMotionType;
  duration: number; // 招式总耗时 (ms)
  activeAt: number; // 命中判定开始时间 (ms)
  chainAt: number; // 可续接下一招输入时间 (ms)
  range: number; // 打击范围 / 判定距离 (px)
  arcDegrees: number; // 扇面攻击角度 (度数)
  damage: number; // 招式伤害倍率
  movementMultiplier: number; // 出招时移动衰减
  lungeDistance: number; // 出招向前垫步位移 (px)
  lungeDuration: number; // 垫步位移持续时间 (ms)
  knockback: number; // 招式击退力度基数
  isRanged?: boolean; // 是否远程弹道
  projectileCount?: number; // 远程单次发射弹道数
  pierceCount?: number; // 弹道穿透数
};

export type WeaponComboDefinition = {
  name: string;
  shape: WeaponShape;
  totalSteps: number;
  resetWindow: number; // 连招重置时间 (ms)
  attacks: readonly WeaponAttack[];
};

// 1. 刀（3连击 - 均衡劈撩）
export const KNIFE_COMBO: WeaponComboDefinition = {
  name: '基础刀法',
  shape: '刀',
  totalSteps: 3,
  resetWindow: 400,
  attacks: [
    {
      motionName: 'knife-downward-slash',
      name: '斜切下劈',
      motionType: 'slash',
      duration: 190,
      activeAt: 55,
      chainAt: 75,
      range: 112,
      arcDegrees: 120,
      damage: 1.0,
      movementMultiplier: 0.55,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 16,
    },
    {
      motionName: 'knife-rising-cut',
      name: '逆刃上挑',
      motionType: 'slash',
      duration: 170,
      activeAt: 50,
      chainAt: 68,
      range: 104,
      arcDegrees: 100,
      damage: 1.2,
      movementMultiplier: 0.55,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 14,
    },
    {
      motionName: 'knife-finisher-lunge',
      name: '垫步突斩',
      motionType: 'thrust',
      duration: 260,
      activeAt: 90,
      chainAt: 130,
      range: 126,
      arcDegrees: 140,
      damage: 1.6,
      movementMultiplier: 0,
      lungeDistance: 20,
      lungeDuration: 110,
      knockback: 28,
    },
  ],
};

// 2. 枪（4连击 - 长距疾刺）
export const SPEAR_COMBO: WeaponComboDefinition = {
  name: '六合长枪',
  shape: '枪',
  totalSteps: 4,
  resetWindow: 400,
  attacks: [
    {
      motionName: 'spear-mid-thrust',
      name: '中平直刺',
      motionType: 'thrust',
      duration: 200,
      activeAt: 95,
      chainAt: 115,
      range: 165,
      arcDegrees: 35,
      damage: 0.95,
      movementMultiplier: 0.6,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 15,
    },
    {
      motionName: 'spear-rapid-pierce',
      name: '连环疾刺',
      motionType: 'thrust',
      duration: 180,
      activeAt: 85,
      chainAt: 105,
      range: 175,
      arcDegrees: 35,
      damage: 1.05,
      movementMultiplier: 0.6,
      lungeDistance: 4,
      lungeDuration: 70,
      knockback: 14,
    },
    {
      motionName: 'spear-turn-thrust',
      name: '探海回刺',
      motionType: 'thrust',
      duration: 220,
      activeAt: 105,
      chainAt: 125,
      range: 180,
      arcDegrees: 45,
      damage: 1.25,
      movementMultiplier: 0.5,
      lungeDistance: 6,
      lungeDuration: 90,
      knockback: 20,
    },
    {
      motionName: 'spear-dragon-lunge',
      name: '游龙贯日',
      motionType: 'thrust',
      duration: 380,
      activeAt: 170,
      chainAt: 210,
      range: 215,
      arcDegrees: 50,
      damage: 2.1,
      movementMultiplier: 0,
      lungeDistance: 32,
      lungeDuration: 160,
      knockback: 36,
    },
  ],
};

// 3. 剑（5连击 - 灵动连绵）
export const SWORD_COMBO: WeaponComboDefinition = {
  name: '清风连环剑',
  shape: '剑',
  totalSteps: 5,
  resetWindow: 380,
  attacks: [
    {
      motionName: 'sword-level-thrust',
      name: '游龙平刺',
      motionType: 'thrust',
      duration: 180,
      activeAt: 85,
      chainAt: 105,
      range: 120,
      arcDegrees: 40,
      damage: 0.85,
      movementMultiplier: 0.7,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 10,
    },
    {
      motionName: 'sword-horizontal-slash',
      name: '抹喉横削',
      motionType: 'slash',
      duration: 170,
      activeAt: 80,
      chainAt: 100,
      range: 125,
      arcDegrees: 90,
      damage: 0.95,
      movementMultiplier: 0.7,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 12,
    },
    {
      motionName: 'sword-rising-flick',
      name: '上提挽花',
      motionType: 'slash',
      duration: 190,
      activeAt: 90,
      chainAt: 110,
      range: 120,
      arcDegrees: 110,
      damage: 1.05,
      movementMultiplier: 0.65,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 14,
    },
    {
      motionName: 'sword-spin-cut',
      name: '旋身回斩',
      motionType: 'sweep',
      duration: 210,
      activeAt: 100,
      chainAt: 120,
      range: 135,
      arcDegrees: 130,
      damage: 1.25,
      movementMultiplier: 0.6,
      lungeDistance: 8,
      lungeDuration: 90,
      knockback: 16,
    },
    {
      motionName: 'sword-beam-finisher',
      name: '破空剑气',
      motionType: 'slash',
      duration: 320,
      activeAt: 140,
      chainAt: 170,
      range: 165,
      arcDegrees: 150,
      damage: 1.85,
      movementMultiplier: 0,
      lungeDistance: 14,
      lungeDuration: 130,
      knockback: 26,
    },
  ],
};

// 4. 戟（3连击 - 长柄横扫）
export const HALBERD_COMBO: WeaponComboDefinition = {
  name: '破军战戟',
  shape: '戟',
  totalSteps: 3,
  resetWindow: 480,
  attacks: [
    {
      motionName: 'halberd-overhead-chop',
      name: '纵身劈斩',
      motionType: 'overhead',
      duration: 290,
      activeAt: 150,
      chainAt: 175,
      range: 150,
      arcDegrees: 110,
      damage: 1.25,
      movementMultiplier: 0.45,
      lungeDistance: 6,
      lungeDuration: 100,
      knockback: 22,
    },
    {
      motionName: 'halberd-sweeping-arc',
      name: '回旋大横扫',
      motionType: 'sweep',
      duration: 330,
      activeAt: 170,
      chainAt: 195,
      range: 165,
      arcDegrees: 180,
      damage: 1.5,
      movementMultiplier: 0.4,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 26,
    },
    {
      motionName: 'halberd-hook-cut',
      name: '倒钩截击',
      motionType: 'slash',
      duration: 400,
      activeAt: 210,
      chainAt: 240,
      range: 180,
      arcDegrees: 120,
      damage: 2.2,
      movementMultiplier: 0,
      lungeDistance: 22,
      lungeDuration: 150,
      knockback: 36,
    },
  ],
};

// 5. 斧（2连击 - 重型破阵）
export const AXE_COMBO: WeaponComboDefinition = {
  name: '开山巨斧',
  shape: '斧',
  totalSteps: 2,
  resetWindow: 550,
  attacks: [
    {
      motionName: 'axe-slam-smash',
      name: '开山力劈',
      motionType: 'overhead',
      duration: 420,
      activeAt: 240,
      chainAt: 270,
      range: 140,
      arcDegrees: 105,
      damage: 2.0,
      movementMultiplier: 0.3,
      lungeDistance: 12,
      lungeDuration: 140,
      knockback: 38,
    },
    {
      motionName: 'axe-earthquake-sweep',
      name: '碎地横挥',
      motionType: 'sweep',
      duration: 480,
      activeAt: 270,
      chainAt: 310,
      range: 160,
      arcDegrees: 160,
      damage: 2.85,
      movementMultiplier: 0,
      lungeDistance: 18,
      lungeDuration: 160,
      knockback: 55,
    },
  ],
};

// 6. 弓（3连射 - 远距弹道）
export const BOW_COMBO: WeaponComboDefinition = {
  name: '连珠神弓',
  shape: '弓',
  totalSteps: 3,
  resetWindow: 450,
  attacks: [
    {
      motionName: 'bow-single-shot',
      name: '平射疾矢',
      motionType: 'shot',
      duration: 240,
      activeAt: 90,
      chainAt: 110,
      range: 480,
      arcDegrees: 15,
      damage: 1.0,
      movementMultiplier: 0.65,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 12,
      isRanged: true,
      projectileCount: 1,
      pierceCount: 1,
    },
    {
      motionName: 'bow-twin-volley',
      name: '双矢连珠',
      motionType: 'shot',
      duration: 270,
      activeAt: 100,
      chainAt: 125,
      range: 480,
      arcDegrees: 25,
      damage: 1.35,
      movementMultiplier: 0.65,
      lungeDistance: 0,
      lungeDuration: 0,
      knockback: 15,
      isRanged: true,
      projectileCount: 2,
      pierceCount: 1,
    },
    {
      motionName: 'bow-pierce-heavy',
      name: '穿心蓄力重矢',
      motionType: 'shot',
      duration: 380,
      activeAt: 160,
      chainAt: 195,
      range: 560,
      arcDegrees: 15,
      damage: 2.3,
      movementMultiplier: 0.2,
      lungeDistance: -6, // 蓄力后坐力微推
      lungeDuration: 100,
      knockback: 32,
      isRanged: true,
      projectileCount: 1,
      pierceCount: 3,
    },
  ],
};

export const WEAPON_COMBOS: Record<WeaponShape, WeaponComboDefinition> = {
  刀: KNIFE_COMBO,
  枪: SPEAR_COMBO,
  剑: SWORD_COMBO,
  戟: HALBERD_COMBO,
  斧: AXE_COMBO,
  弓: BOW_COMBO,
  盾: KNIFE_COMBO, // 盾牌缺省使用单手刀挥舞节奏
};

export function getWeaponCombo(shape: WeaponShape): WeaponComboDefinition {
  return WEAPON_COMBOS[shape] || KNIFE_COMBO;
}
