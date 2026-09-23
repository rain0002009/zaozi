export type EquipmentCategory = 'weapon' | 'armor' | 'talisman';

export type WeaponActionType = 'melee' | 'ranged' | 'defense';
export type WeaponShape = '刀' | '弓' | '枪' | '盾' | '斧';
export type ElementType = 'none' | 'wood' | 'fire' | 'metal' | 'earth' | 'water';

export type TraitId =
  | 'knockback'
  | 'burn'
  | 'instantKill'
  | 'chainLightning'
  | 'chill'
  | 'lifeSteal'
  | 'pierce'
  | 'thorns'
  | 'stun'
  | 'echo';

export type TraitParamDef = {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'string';
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description: string;
};

export type TraitMeta = {
  id: TraitId;
  name: string;
  icon: string;
  summary: string;
  applicableTo: EquipmentCategory[];
  params: TraitParamDef[];
};

export type TraitInstance = {
  traitId: TraitId;
  name: string;
  params: Record<string, number | boolean | string>;
};

export type EquipmentBaseStats = {
  damage?: number;
  attackSpeed?: number;
  range?: number;
  knockback?: number;
  projectileSpeed?: number;
  damageReduction?: number; // 0.0 ~ 1.0 (e.g. 0.35 = 35%)
  bonusHp?: number;
  blockRate?: number; // 0.0 ~ 1.0
};

export type CompoundEquipment = {
  id: string;
  name: string;
  category: EquipmentCategory;
  words: string[];
  type: WeaponActionType;
  shape: WeaponShape;
  element: ElementType;
  description: string;
  summary: string;
  baseStats: EquipmentBaseStats;
  traits: TraitInstance[];
};

export const TRAIT_REGISTRY: Record<TraitId, TraitMeta> = {
  knockback: {
    id: 'knockback',
    name: '击退震荡',
    icon: '💥',
    summary: '命中时强力震退敌群，造成受击位移与短暂动作阻滞。',
    applicableTo: ['weapon', 'armor'],
    params: [
      { key: 'force', label: '击退力度', type: 'number', defaultValue: 150, min: 20, max: 500, step: 10, unit: 'px', description: '击退位移冲击冲量' },
      { key: 'stunMs', label: '受击硬直', type: 'number', defaultValue: 60, min: 0, max: 500, step: 10, unit: 'ms', description: '受击怪物攻击与移动阻滞时长' },
    ],
  },
  burn: {
    id: 'burn',
    name: '烈焰灼烧',
    icon: '🔥',
    summary: '引燃墨火附着敌身，造成多段范围灼烧蔓延。',
    applicableTo: ['weapon'],
    params: [
      { key: 'dps', label: '每秒灼伤', type: 'number', defaultValue: 12, min: 1, max: 100, step: 1, unit: '点/秒', description: '每秒造成的火焰伤害' },
      { key: 'duration', label: '持续时间', type: 'number', defaultValue: 3, min: 1, max: 10, step: 0.5, unit: '秒', description: '灼烧燃烧时长' },
      { key: 'chance', label: '点燃概率', type: 'number', defaultValue: 100, min: 5, max: 100, step: 5, unit: '%', description: '命中触发点燃几率' },
    ],
  },
  instantKill: {
    id: 'instantKill',
    name: '一击必杀',
    icon: '☠️',
    summary: '锋芒夺魂，有概率直接处决普通怪物，或对濒死敌人直接斩杀。',
    applicableTo: ['weapon'],
    params: [
      { key: 'chance', label: '瞬杀概率', type: 'number', defaultValue: 3, min: 0.5, max: 20, step: 0.5, unit: '%', description: '命中直接处决普通敌人的几率' },
      { key: 'executeThreshold', label: '残血斩杀线', type: 'number', defaultValue: 15, min: 0, max: 40, step: 5, unit: '%', description: '敌人生命低于该比例时直接斩杀' },
    ],
  },
  chainLightning: {
    id: 'chainLightning',
    name: '奔雷连环',
    icon: '⚡',
    summary: '刀锋激荡雷霆，命中后电弧在周围多个敌群间弹射。',
    applicableTo: ['weapon'],
    params: [
      { key: 'jumpCount', label: '跳跃目标数', type: 'number', defaultValue: 3, min: 1, max: 8, step: 1, unit: '个', description: '电弧最多传导的敌人数' },
      { key: 'decayRatio', label: '伤害衰减', type: 'number', defaultValue: 20, min: 0, max: 60, step: 5, unit: '%', description: '每次跳跃伤害递减幅度' },
      { key: 'chance', label: '触发概率', type: 'number', defaultValue: 100, min: 10, max: 100, step: 5, unit: '%', description: '连环雷击触发几率' },
    ],
  },
  chill: {
    id: 'chill',
    name: '极寒迟滞',
    icon: '❄️',
    summary: '霜气凝结，大幅降低敌方移速与攻击节奏，满层触发短暂冰冻。',
    applicableTo: ['weapon', 'armor'],
    params: [
      { key: 'slowRatio', label: '减速幅度', type: 'number', defaultValue: 35, min: 10, max: 80, step: 5, unit: '%', description: '降低敌人移动与攻速百分比' },
      { key: 'duration', label: '减速时长', type: 'number', defaultValue: 2.5, min: 0.5, max: 6, step: 0.5, unit: '秒', description: '迟滞效果持续时间' },
      { key: 'freezeSec', label: '冰冻时长', type: 'number', defaultValue: 1.0, min: 0, max: 3, step: 0.2, unit: '秒', description: '叠满后完全冻结时长' },
    ],
  },
  lifeSteal: {
    id: 'lifeSteal',
    name: '墨血汲取',
    icon: '🩸',
    summary: '兵刃饮血吸墨，将造成的伤害按比例转化为自身当前生命。',
    applicableTo: ['weapon'],
    params: [
      { key: 'leechRatio', label: '吸血比例', type: 'number', defaultValue: 8, min: 1, max: 30, step: 1, unit: '%', description: '伤害转化为生命的比例' },
    ],
  },
  pierce: {
    id: 'pierce',
    name: '狂风穿透',
    icon: '🌪️',
    summary: '气劲穿透前排，箭矢贯通多重敌群或近战甩出穿透风刃。',
    applicableTo: ['weapon'],
    params: [
      { key: 'pierceCount', label: '穿透数量', type: 'number', defaultValue: 2, min: 1, max: 6, step: 1, unit: '次', description: '弹道或气刃可穿透的目标数' },
      { key: 'bladeRange', label: '额外风刃距离', type: 'number', defaultValue: 60, min: 0, max: 200, step: 10, unit: 'px', description: '挥斩延伸的远端风刃射程' },
    ],
  },
  thorns: {
    id: 'thorns',
    name: '荆棘反噬',
    icon: '🛡️',
    summary: '玄甲自生墨刺，承受近身打击时对攻击者反震受创伤害。',
    applicableTo: ['armor'],
    params: [
      { key: 'reflectRatio', label: '反伤比例', type: 'number', defaultValue: 45, min: 10, max: 150, step: 5, unit: '%', description: '将承受伤害按比例反震还击' },
    ],
  },
  stun: {
    id: 'stun',
    name: '震地眩晕',
    icon: '🔨',
    summary: '力拔千钧，重砸地面形成碎石震波，击晕范围内的敌群。',
    applicableTo: ['weapon', 'armor'],
    params: [
      { key: 'chance', label: '眩晕几率', type: 'number', defaultValue: 30, min: 5, max: 100, step: 5, unit: '%', description: '命中引发震波眩晕的概率' },
      { key: 'duration', label: '眩晕时长', type: 'number', defaultValue: 1.2, min: 0.3, max: 3, step: 0.1, unit: '秒', description: '敌群陷入不能动弹的时长' },
      { key: 'radius', label: '震波半径', type: 'number', defaultValue: 75, min: 30, max: 200, step: 5, unit: 'px', description: '落地震波扩散范围' },
    ],
  },
  echo: {
    id: 'echo',
    name: '墨影余波',
    icon: '👥',
    summary: '笔走龙蛇，出招瞬间留下一道墨色残影追击第二击。',
    applicableTo: ['weapon'],
    params: [
      { key: 'echoChance', label: '余波触发率', type: 'number', defaultValue: 35, min: 10, max: 100, step: 5, unit: '%', description: '触发墨影追击的概率' },
      { key: 'echoDamageRatio', label: '墨影伤害比', type: 'number', defaultValue: 50, min: 20, max: 100, step: 5, unit: '%', description: '第二道墨影继承的伤害百分比' },
    ],
  },
};

export const DEFAULT_EQUIPMENT_PRESETS: CompoundEquipment[] = [
  {
    id: '木刀',
    name: '灵木刀',
    category: 'weapon',
    words: ['木', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'wood',
    description: '以灵木雕琢而成的防身木刀，轻灵质朴。',
    summary: '基础挥斩，攻速适中，初始出征防身良兵。',
    baseStats: {
      damage: 8,
      attackSpeed: 1.0,
      range: 105,
      knockback: 100,
    },
    traits: [
      {
        traitId: 'knockback',
        name: '击退震荡',
        params: { force: 100, stunMs: 40 },
      },
    ],
  },
  {
    id: '素铁刀',
    name: '素铁短刀',
    category: 'weapon',
    words: ['刀'],
    type: 'melee',
    shape: '刀',
    element: 'none',
    description: '未融合任何属性字的普通短刀，手感朴实。',
    summary: '朴素三连斩，左键挥击攻击侧敌人。',
    baseStats: {
      damage: 12,
      attackSpeed: 1.0,
      range: 110,
      knockback: 120,
    },
    traits: [],
  },
  {
    id: '炎刀',
    name: '赤炎神刀',
    category: 'weapon',
    words: ['火', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'fire',
    description: '刀身缠绕炽烈墨火，挥击割裂空气引发爆燃。',
    summary: '挥出烈焰刀芒，命中敌群附带范围灼烧。',
    baseStats: {
      damage: 24,
      attackSpeed: 1.05,
      range: 125,
      knockback: 135,
    },
    traits: [
      {
        traitId: 'burn',
        name: '烈焰灼烧',
        params: { dps: 18, duration: 3.5, chance: 100 },
      },
    ],
  },
  {
    id: '金刀',
    name: '金精玄刃',
    category: 'weapon',
    words: ['金', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'metal',
    description: '金精玄铁锻造，锋利无匹，刃芒森寒。',
    summary: '范围 +30%，强力破甲重创与远距离击退。',
    baseStats: {
      damage: 28,
      attackSpeed: 0.9,
      range: 145,
      knockback: 190,
    },
    traits: [
      {
        traitId: 'knockback',
        name: '击退震荡',
        params: { force: 190, stunMs: 80 },
      },
    ],
  },
  {
    id: '石刃',
    name: '碎石钝刃',
    category: 'weapon',
    words: ['石', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'earth',
    description: '巨石磨制的厚重钝刀，挥动有崩山之势。',
    summary: '势大力沉，重砸引发地裂震波，概率眩晕。',
    baseStats: {
      damage: 32,
      attackSpeed: 0.75,
      range: 120,
      knockback: 220,
    },
    traits: [
      {
        traitId: 'stun',
        name: '震地眩晕',
        params: { chance: 40, duration: 1.2, radius: 80 },
      },
    ],
  },
  {
    id: '木弓',
    name: '青木长弓',
    category: 'weapon',
    words: ['木', '弓'],
    type: 'ranged',
    shape: '弓',
    element: 'wood',
    description: '柔韧青木制成，连续发射穿透木箭。',
    summary: '远程直线射击，连射速度快，穿透 1 名敌人。',
    baseStats: {
      damage: 16,
      attackSpeed: 1.25,
      range: 480,
      knockback: 80,
      projectileSpeed: 620,
    },
    traits: [
      {
        traitId: 'pierce',
        name: '狂风穿透',
        params: { pierceCount: 2, bladeRange: 0 },
      },
    ],
  },
  {
    id: '烈火弓',
    name: '焚天烈火弓',
    category: 'weapon',
    words: ['火', '弓'],
    type: 'ranged',
    shape: '弓',
    element: 'fire',
    description: '弓弦附着妖火，射出的箭矢落地爆裂。',
    summary: '发射爆裂火箭，命中爆炸引燃地面产生火海。',
    baseStats: {
      damage: 25,
      attackSpeed: 0.9,
      range: 460,
      knockback: 140,
      projectileSpeed: 550,
    },
    traits: [
      {
        traitId: 'burn',
        name: '烈焰灼烧',
        params: { dps: 22, duration: 4, chance: 100 },
      },
    ],
  },
  {
    id: '磐石盾',
    name: '厚土磐石盾',
    category: 'armor',
    words: ['石', '盾'],
    type: 'defense',
    shape: '盾',
    element: 'earth',
    description: '玄石厚盾，坚不可摧，可抵御并反弹冲击。',
    summary: '受创减伤 45%，挥盾冲锋反弹并击飞敌群。',
    baseStats: {
      damage: 22,
      attackSpeed: 0.85,
      range: 90,
      knockback: 250,
      damageReduction: 0.45,
      bonusHp: 40,
    },
    traits: [
      {
        traitId: 'thorns',
        name: '荆棘反噬',
        params: { reflectRatio: 50 },
      },
      {
        traitId: 'knockback',
        name: '击退震荡',
        params: { force: 250, stunMs: 100 },
      },
    ],
  },
  {
    id: '疾风刃',
    name: '追风迅捷刃',
    category: 'weapon',
    words: ['风', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'wood',
    description: '御风而铸的轻灵刀刃，挥刀若狂风过境。',
    summary: '攻速 +50%，挥斩附带青色风刃，撕裂前排。',
    baseStats: {
      damage: 20,
      attackSpeed: 1.5,
      range: 120,
      knockback: 110,
    },
    traits: [
      {
        traitId: 'pierce',
        name: '狂风穿透',
        params: { pierceCount: 3, bladeRange: 80 },
      },
    ],
  },
  {
    id: '奔雷刀',
    name: '九霄奔雷刀',
    category: 'weapon',
    words: ['雷', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'fire',
    description: '刀铭引雷符，劈砍带起霹雳爆鸣与金蛇电弧。',
    summary: '命中引发电弧跳跃，对邻近敌人造成连环雷击。',
    baseStats: {
      damage: 26,
      attackSpeed: 1.1,
      range: 130,
      knockback: 150,
    },
    traits: [
      {
        traitId: 'chainLightning',
        name: '奔雷连环',
        params: { jumpCount: 4, decayRatio: 15, chance: 100 },
      },
    ],
  },
  {
    id: '破阵枪',
    name: '丈八破阵长枪',
    category: 'weapon',
    words: ['枪'],
    type: 'melee',
    shape: '枪',
    element: 'none',
    description: '丈八长枪，直线贯刺，破阵当先。',
    summary: '超远距离直线突刺，攻击侧敌人受击硬直。',
    baseStats: {
      damage: 30,
      attackSpeed: 0.95,
      range: 180,
      knockback: 200,
    },
    traits: [
      {
        traitId: 'instantKill',
        name: '一击必杀',
        params: { chance: 4, executeThreshold: 15 },
      },
    ],
  },
  {
    id: '灵木枪',
    name: '青藤灵木长枪',
    category: 'weapon',
    words: ['木', '枪'],
    type: 'melee',
    shape: '枪',
    element: 'wood',
    description: '灵木为杆，刚柔并济，连环疾刺破甲。',
    summary: '攻速 +30%，枪出如龙，汲取敌群生机。',
    baseStats: {
      damage: 26,
      attackSpeed: 1.3,
      range: 185,
      knockback: 160,
    },
    traits: [
      {
        traitId: 'lifeSteal',
        name: '墨血汲取',
        params: { leechRatio: 10 },
      },
    ],
  },
  {
    id: '开山斧',
    name: '撼地开山斧',
    category: 'weapon',
    words: ['石', '斧'],
    type: 'melee',
    shape: '斧',
    element: 'earth',
    description: '厚重开山斧，重劈落地引发剧烈地震波。',
    summary: '极高伤害与击退，下砸产生大范围冲击波与眩晕。',
    baseStats: {
      damage: 42,
      attackSpeed: 0.65,
      range: 140,
      knockback: 280,
    },
    traits: [
      {
        traitId: 'stun',
        name: '震地眩晕',
        params: { chance: 60, duration: 1.8, radius: 120 },
      },
      {
        traitId: 'knockback',
        name: '击退震荡',
        params: { force: 280, stunMs: 140 },
      },
    ],
  },
  {
    id: '风火刃',
    name: '风火双绝刃',
    category: 'weapon',
    words: ['风', '火', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'fire',
    description: '风助火势，烈风席卷炽热刀芒，双重爆发。',
    summary: '攻速 +40%，挥斩附带烈焰与风刃双重墨影余波。',
    baseStats: {
      damage: 32,
      attackSpeed: 1.4,
      range: 135,
      knockback: 150,
    },
    traits: [
      {
        traitId: 'burn',
        name: '烈焰灼烧',
        params: { dps: 20, duration: 3, chance: 100 },
      },
      {
        traitId: 'echo',
        name: '墨影余波',
        params: { echoChance: 40, echoDamageRatio: 50 },
      },
    ],
  },
];
