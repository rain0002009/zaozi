export type EquipmentCategory = 'weapon' | 'armor' | 'talisman';

export type WeaponActionType = 'melee' | 'ranged' | 'defense';
export type WeaponShape = '刀' | '枪' | '剑' | '戟' | '斧' | '弓' | '盾';
export type ElementType = 'none' | 'wood' | 'fire' | 'metal' | 'earth' | 'water';

export type TraitCategory = 'stat' | 'element' | 'mechanic';

export type TraitId =
  // 机制特性 (Mechanics)
  | 'swordBeam'
  | 'lifeSteal'
  | 'burn'
  | 'knockback'
  | 'instantKill'
  | 'chainLightning'
  | 'chill'
  | 'pierce'
  | 'thorns'
  | 'stun'
  | 'echo'
  // 数值特性 (Stats)
  | 'damage'
  | 'attackSpeed'
  | 'range'
  | 'projectileSpeed'
  | 'bonusHp'
  | 'damageReduction'
  | 'blockRate'
  // 元素特性 (Elements)
  | 'wood'
  | 'fire'
  | 'metal'
  | 'earth'
  | 'water'
  | 'thunder'
  | 'wind';

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
  category: TraitCategory;
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

export type EquipmentVisual = {
  textureKey?: string;
  imageDataUrl?: string; // 上传的外形图片 Base64
  gripAnchor: { x: number; y: number }; // 握持锚点 [0.0 ~ 1.0]，默认手柄位置 [0.2, 0.5]
  tipAnchor?: { x: number; y: number }; // 刃尖/发射锚点 [0.0 ~ 1.0]，用于刀光与弹道起点 [1.0, 0.5]
  rotationOffsetDeg?: number; // 外形贴图旋转校准角（度数，如 0, 45, 90）
  scale?: number;
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
  shape: WeaponShape;
  description: string;
  summary: string;
  traits: TraitInstance[];
  visual?: EquipmentVisual;
  type?: WeaponActionType;
  element?: ElementType;
  baseStats?: EquipmentBaseStats;
};

export function getEquipmentActionType(shape: WeaponShape): WeaponActionType {
  if (shape === '弓') return 'ranged';
  if (shape === '盾') return 'defense';
  return 'melee';
}

export function getEquipmentElement(equipment: CompoundEquipment): ElementType {
  const elemTrait = equipment.traits?.find((t) =>
    ['wood', 'fire', 'metal', 'earth', 'water'].includes(t.traitId)
  );
  if (elemTrait) return elemTrait.traitId as ElementType;
  return equipment.element || 'none';
}

export const TRAIT_REGISTRY: Record<TraitId, TraitMeta> = {
  // === 1. 机制特性 (Mechanics) ===
  swordBeam: {
    id: 'swordBeam',
    name: '剑气',
    category: 'mechanic',
    icon: '✨',
    summary: '出招释放破空剑气/刀芒，延伸打击判定并刷出半月水墨弧光。',
    applicableTo: ['weapon'],
    params: [
      { key: 'extraRange', label: '剑气射程', type: 'number', defaultValue: 45, min: 10, max: 150, step: 5, unit: 'px', description: '剑气延伸打击距离' },
      { key: 'damageRatio', label: '剑气伤害比', type: 'number', defaultValue: 80, min: 20, max: 150, step: 5, unit: '%', description: '剑气伤害百分比' },
    ],
  },
  lifeSteal: {
    id: 'lifeSteal',
    name: '吸血',
    category: 'mechanic',
    icon: '🩸',
    summary: '造成伤害时按比例转化为自身当前生命。',
    applicableTo: ['weapon'],
    params: [
      { key: 'leechRatio', label: '吸血比例', type: 'number', defaultValue: 10, min: 1, max: 50, step: 1, unit: '%', description: '伤害转化为生命的比例' },
    ],
  },
  burn: {
    id: 'burn',
    name: '灼烧',
    category: 'mechanic',
    icon: '🔥',
    summary: '攻击引燃火势附着目标，造成多段持续火焰伤害。',
    applicableTo: ['weapon'],
    params: [
      { key: 'dps', label: '每秒火伤', type: 'number', defaultValue: 16, min: 1, max: 100, step: 1, unit: '点/秒', description: '每秒造成的火焰灼伤' },
      { key: 'duration', label: '持续时间', type: 'number', defaultValue: 3, min: 1, max: 10, step: 0.5, unit: '秒', description: '灼烧燃烧时长' },
      { key: 'chance', label: '点燃几率', type: 'number', defaultValue: 100, min: 5, max: 100, step: 5, unit: '%', description: '命中触发几率' },
    ],
  },
  knockback: {
    id: 'knockback',
    name: '击退',
    category: 'mechanic',
    icon: '💥',
    summary: '命中时强力击退敌人，造成受击位移与受击硬直。',
    applicableTo: ['weapon', 'armor'],
    params: [
      { key: 'force', label: '击退距离', type: 'number', defaultValue: 150, min: 20, max: 500, step: 10, unit: 'px', description: '击退位移冲击' },
      { key: 'stunMs', label: '受击硬直', type: 'number', defaultValue: 60, min: 0, max: 500, step: 10, unit: 'ms', description: '受击怪物动作阻滞时长' },
    ],
  },
  instantKill: {
    id: 'instantKill',
    name: '斩杀',
    category: 'mechanic',
    icon: '☠️',
    summary: '低血量直接处决，或有概率瞬间斩杀普通敌人。',
    applicableTo: ['weapon'],
    params: [
      { key: 'chance', label: '秒杀几率', type: 'number', defaultValue: 3, min: 0.5, max: 20, step: 0.5, unit: '%', description: '直接秒杀普通敌人概率' },
      { key: 'executeThreshold', label: '残血斩杀线', type: 'number', defaultValue: 15, min: 0, max: 40, step: 5, unit: '%', description: '敌人生命低于该比例时直接斩杀' },
    ],
  },
  chainLightning: {
    id: 'chainLightning',
    name: '闪电',
    category: 'mechanic',
    icon: '⚡',
    summary: '命中激荡雷电，电弧在周围多个敌人之间跳跃传导。',
    applicableTo: ['weapon'],
    params: [
      { key: 'jumpCount', label: '弹射数量', type: 'number', defaultValue: 3, min: 1, max: 8, step: 1, unit: '个', description: '电弧最多传导敌人数' },
      { key: 'decayRatio', label: '伤害衰减', type: 'number', defaultValue: 20, min: 0, max: 60, step: 5, unit: '%', description: '每次跳跃伤害递减幅度' },
      { key: 'chance', label: '触发几率', type: 'number', defaultValue: 100, min: 10, max: 100, step: 5, unit: '%', description: '连环雷击触发几率' },
    ],
  },
  chill: {
    id: 'chill',
    name: '冰冻',
    category: 'mechanic',
    icon: '❄️',
    summary: '霜气减速敌群移动与攻击，叠满后冻结敌人。',
    applicableTo: ['weapon', 'armor'],
    params: [
      { key: 'slowRatio', label: '减速比例', type: 'number', defaultValue: 35, min: 10, max: 80, step: 5, unit: '%', description: '降低敌人移动与攻速百分比' },
      { key: 'duration', label: '迟滞时长', type: 'number', defaultValue: 2.5, min: 0.5, max: 6, step: 0.5, unit: '秒', description: '迟滞效果持续时间' },
      { key: 'freezeSec', label: '冻结时长', type: 'number', defaultValue: 1.0, min: 0, max: 3, step: 0.2, unit: '秒', description: '叠满后完全冻结时长' },
    ],
  },
  pierce: {
    id: 'pierce',
    name: '穿透',
    category: 'mechanic',
    icon: '🌪️',
    summary: '攻击贯穿多名敌人，或在近战挥击时甩出延伸风刃。',
    applicableTo: ['weapon'],
    params: [
      { key: 'pierceCount', label: '穿透数量', type: 'number', defaultValue: 2, min: 1, max: 8, step: 1, unit: '次', description: '弹道或气刃穿透目标数' },
      { key: 'bladeRange', label: '风刃距离', type: 'number', defaultValue: 60, min: 0, max: 200, step: 10, unit: 'px', description: '挥斩延伸远端风刃射程' },
    ],
  },
  thorns: {
    id: 'thorns',
    name: '反伤',
    category: 'mechanic',
    icon: '🛡️',
    summary: '承受攻击时将所受伤害按比例反弹还击敌人。',
    applicableTo: ['armor'],
    params: [
      { key: 'reflectRatio', label: '反伤比例', type: 'number', defaultValue: 50, min: 10, max: 200, step: 5, unit: '%', description: '承受伤害反弹比例' },
    ],
  },
  stun: {
    id: 'stun',
    name: '眩晕',
    category: 'mechanic',
    icon: '🔨',
    summary: '重砸地面引发震波，击晕范围内的敌群无法动弹。',
    applicableTo: ['weapon', 'armor'],
    params: [
      { key: 'chance', label: '眩晕几率', type: 'number', defaultValue: 35, min: 5, max: 100, step: 5, unit: '%', description: '命中引发眩晕概率' },
      { key: 'duration', label: '眩晕时长', type: 'number', defaultValue: 1.2, min: 0.3, max: 3, step: 0.1, unit: '秒', description: '无法行动时长' },
      { key: 'radius', label: '震波范围', type: 'number', defaultValue: 80, min: 30, max: 200, step: 5, unit: 'px', description: '眩晕冲击半径' },
    ],
  },
  echo: {
    id: 'echo',
    name: '残影',
    category: 'mechanic',
    icon: '👥',
    summary: '出招瞬间分裂出墨色残影追击第二击。',
    applicableTo: ['weapon'],
    params: [
      { key: 'echoChance', label: '残影几率', type: 'number', defaultValue: 40, min: 10, max: 100, step: 5, unit: '%', description: '触发残影追击几率' },
      { key: 'echoDamageRatio', label: '残影伤害', type: 'number', defaultValue: 50, min: 20, max: 100, step: 5, unit: '%', description: '残影继承的伤害百分比' },
    ],
  },

  // === 2. 数值特性 (Stats) ===
  damage: {
    id: 'damage',
    name: '伤害',
    category: 'stat',
    icon: '🗡️',
    summary: '武器的基础物理攻击威力。',
    applicableTo: ['weapon'],
    params: [
      { key: 'value', label: '基础攻击力', type: 'number', defaultValue: 15, min: 1, max: 300, step: 1, unit: '点', description: '单次命中基础伤害' },
    ],
  },
  attackSpeed: {
    id: 'attackSpeed',
    name: '攻速',
    category: 'stat',
    icon: '⚡',
    summary: '武器连招挥砍或发射的频率倍率。',
    applicableTo: ['weapon'],
    params: [
      { key: 'value', label: '攻速倍率', type: 'number', defaultValue: 1.0, min: 0.3, max: 3.0, step: 0.05, unit: 'x', description: '连招出招速度倍率' },
    ],
  },
  range: {
    id: 'range',
    name: '范围',
    category: 'stat',
    icon: '📏',
    summary: '近战挥击判定长度或远程弹道射程。',
    applicableTo: ['weapon'],
    params: [
      { key: 'value', label: '有效射程', type: 'number', defaultValue: 120, min: 50, max: 800, step: 10, unit: 'px', description: '判定半径或飞行射程' },
    ],
  },
  projectileSpeed: {
    id: 'projectileSpeed',
    name: '弹速',
    category: 'stat',
    icon: '🏹',
    summary: '远程武器投射物的飞行移动速度。',
    applicableTo: ['weapon'],
    params: [
      { key: 'value', label: '飞行速度', type: 'number', defaultValue: 600, min: 100, max: 1500, step: 50, unit: 'px/s', description: '飞箭/弹道飞行速率' },
    ],
  },
  bonusHp: {
    id: 'bonusHp',
    name: '生命',
    category: 'stat',
    icon: '💚',
    summary: '装备增加的角色最大生命上限。',
    applicableTo: ['armor', 'talisman'],
    params: [
      { key: 'value', label: '生命加成', type: 'number', defaultValue: 30, min: 5, max: 300, step: 5, unit: '点', description: '提升最大生命值' },
    ],
  },
  damageReduction: {
    id: 'damageReduction',
    name: '减伤',
    category: 'stat',
    icon: '🛡️',
    summary: '承受伤害时的固定百分比受创减免。',
    applicableTo: ['armor', 'talisman'],
    params: [
      { key: 'value', label: '减伤比例', type: 'number', defaultValue: 25, min: 5, max: 80, step: 5, unit: '%', description: '受创伤害减免比例' },
    ],
  },
  blockRate: {
    id: 'blockRate',
    name: '格挡',
    category: 'stat',
    icon: '🧱',
    summary: '受到打击时完全阻挡伤害的概率。',
    applicableTo: ['armor'],
    params: [
      { key: 'value', label: '格挡几率', type: 'number', defaultValue: 25, min: 5, max: 80, step: 5, unit: '%', description: '完全免受伤害几率' },
    ],
  },

  // === 3. 元素属性特性 (Elements) ===
  wood: {
    id: 'wood',
    name: '木',
    category: 'element',
    icon: '🌿',
    summary: '青木灵气，柔韧轻盈，生生不息。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '木行灵威强度' },
    ],
  },
  fire: {
    id: 'fire',
    name: '火',
    category: 'element',
    icon: '🔥',
    summary: '赤炎神火，暴烈灼体，侵蚀燎原。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '火行灵威强度' },
    ],
  },
  metal: {
    id: 'metal',
    name: '金',
    category: 'element',
    icon: '⚔️',
    summary: '玄金锐气，坚刚锋锐，破甲断岳。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '金行灵威强度' },
    ],
  },
  earth: {
    id: 'earth',
    name: '土',
    category: 'element',
    icon: '⛰️',
    summary: '厚土磐石，重沉如峦，撼地碎骨。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '土行灵威强度' },
    ],
  },
  water: {
    id: 'water',
    name: '水',
    category: 'element',
    icon: '💧',
    summary: '玄冥奔流，冰寒润物，连绵不绝。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '水行灵威强度' },
    ],
  },
  thunder: {
    id: 'thunder',
    name: '雷',
    category: 'element',
    icon: '⚡',
    summary: '九霄天雷，霹雳惊空，威势无匹。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '雷行灵威强度' },
    ],
  },
  wind: {
    id: 'wind',
    name: '风',
    category: 'element',
    icon: '🌪️',
    summary: '狂飙疾风，倏忽无踪，撕裂虚空。',
    applicableTo: ['weapon', 'armor', 'talisman'],
    params: [
      { key: 'potency', label: '行属灵威', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1, unit: '重', description: '风行灵威强度' },
    ],
  },
};

/**
 * 辅助函数：安全读取装备特性的参数值
 */
export function getTraitParam<T = number>(
  equipment: CompoundEquipment,
  traitId: TraitId,
  paramKey: string,
  defaultValue: T
): T {
  const trait = equipment.traits?.find((t) => t.traitId === traitId);
  if (!trait || trait.params[paramKey] === undefined) return defaultValue;
  return trait.params[paramKey] as T;
}

/**
 * 辅助函数：将特性统一解析为战斗引擎基础数值，向下无缝兼容
 */
export function extractEquipmentStats(equipment: CompoundEquipment): EquipmentBaseStats {
  const traitDamage = getTraitParam<number | undefined>(equipment, 'damage', 'value', undefined);
  const damage = equipment.baseStats?.damage ?? traitDamage ?? 15;

  const traitAtkSpd = getTraitParam<number | undefined>(equipment, 'attackSpeed', 'value', undefined);
  const attackSpeed = equipment.baseStats?.attackSpeed ?? traitAtkSpd ?? 1.0;

  const traitRange = getTraitParam<number | undefined>(equipment, 'range', 'value', undefined);
  const range = equipment.baseStats?.range ?? traitRange ?? 120;

  const traitKnockback = getTraitParam<number | undefined>(equipment, 'knockback', 'force', undefined);
  const knockback = equipment.baseStats?.knockback ?? traitKnockback ?? 120;

  const traitProjSpd = getTraitParam<number | undefined>(equipment, 'projectileSpeed', 'value', undefined);
  const projectileSpeed = equipment.baseStats?.projectileSpeed ?? traitProjSpd;

  const traitBonusHp = getTraitParam<number | undefined>(equipment, 'bonusHp', 'value', undefined);
  const bonusHp = equipment.baseStats?.bonusHp ?? traitBonusHp;

  const traitDmgRed = getTraitParam<number | undefined>(equipment, 'damageReduction', 'value', undefined);
  const damageReduction = equipment.baseStats?.damageReduction ?? (traitDmgRed !== undefined ? traitDmgRed / 100 : undefined);

  const traitBlock = getTraitParam<number | undefined>(equipment, 'blockRate', 'value', undefined);
  const blockRate = equipment.baseStats?.blockRate ?? (traitBlock !== undefined ? traitBlock / 100 : undefined);

  return {
    damage,
    attackSpeed,
    range,
    knockback,
    projectileSpeed,
    bonusHp,
    damageReduction,
    blockRate,
  };
}

/**
 * 默认装备库预设（覆盖 刀、枪、剑、戟、斧、弓 六大形态及防具）
 */
export const DEFAULT_EQUIPMENT_PRESETS: CompoundEquipment[] = [
  // ================= 1. 刀 (Knife - 3连击) =================
  {
    id: '木刀',
    name: '灵木刀',
    category: 'weapon',
    words: ['木', '刀'],
    type: 'melee',
    shape: '刀',
    element: 'wood',
    description: '以灵木雕琢而成的防身木刀，轻灵质朴。',
    summary: '基础近身连斩，攻速适中，初始出征防身良兵。',
    baseStats: { damage: 8, attackSpeed: 1.0, range: 68, knockback: 60 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 8 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.0 } },
      { traitId: 'range', name: '范围', params: { value: 68 } },
      { traitId: 'knockback', name: '击退', params: { force: 60, stunMs: 40 } },
      { traitId: 'wood', name: '木', params: { potency: 1 } },
    ],
    visual: {
      gripAnchor: { x: 0.2, y: 0.5 },
      tipAnchor: { x: 0.95, y: 0.5 },
      rotationOffsetDeg: 0,
      scale: 1.0,
    },
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
    baseStats: { damage: 14, attackSpeed: 1.0, range: 72, knockback: 75 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 14 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.0 } },
      { traitId: 'range', name: '范围', params: { value: 72 } },
      { traitId: 'knockback', name: '击退', params: { force: 75, stunMs: 50 } },
    ],
    visual: {
      gripAnchor: { x: 0.2, y: 0.5 },
      tipAnchor: { x: 0.95, y: 0.5 },
      rotationOffsetDeg: 0,
    },
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
    summary: '挥出烈焰刀芒，命中附带持续灼烧。',
    baseStats: { damage: 24, attackSpeed: 1.05, range: 110, knockback: 135 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 24 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.05 } },
      { traitId: 'range', name: '范围', params: { value: 110 } },
      { traitId: 'swordBeam', name: '剑气', params: { extraRange: 40, damageRatio: 75 } },
      { traitId: 'burn', name: '灼烧', params: { dps: 18, duration: 3.5, chance: 100 } },
      { traitId: 'fire', name: '火', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.2, y: 0.5 },
      tipAnchor: { x: 0.95, y: 0.5 },
      rotationOffsetDeg: 0,
    },
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
    summary: '攻速 +50%，挥斩甩出风刃穿透前排。',
    baseStats: { damage: 20, attackSpeed: 1.5, range: 120, knockback: 110 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 20 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.5 } },
      { traitId: 'range', name: '范围', params: { value: 120 } },
      { traitId: 'pierce', name: '穿透', params: { pierceCount: 3, bladeRange: 80 } },
      { traitId: 'wind', name: '风', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.2, y: 0.5 },
      tipAnchor: { x: 0.95, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },

  // ================= 2. 枪 (Spear - 4连击) =================
  {
    id: '破阵枪',
    name: '丈八破阵长枪',
    category: 'weapon',
    words: ['枪'],
    type: 'melee',
    shape: '枪',
    element: 'none',
    description: '丈八长枪，直线贯刺，破阵当先。',
    summary: '超远距离4段连环突刺，末段突进击退。',
    baseStats: { damage: 28, attackSpeed: 1.05, range: 175, knockback: 180 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 28 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.05 } },
      { traitId: 'range', name: '范围', params: { value: 175 } },
      { traitId: 'instantKill', name: '斩杀', params: { chance: 4, executeThreshold: 15 } },
      { traitId: 'knockback', name: '击退', params: { force: 180, stunMs: 70 } },
    ],
    visual: {
      gripAnchor: { x: 0.15, y: 0.5 },
      tipAnchor: { x: 0.98, y: 0.5 },
      rotationOffsetDeg: 0,
    },
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
    summary: '攻速迅猛，长枪突刺命中汲取敌群生命。',
    baseStats: { damage: 25, attackSpeed: 1.3, range: 180, knockback: 150 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 25 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.3 } },
      { traitId: 'range', name: '范围', params: { value: 180 } },
      { traitId: 'lifeSteal', name: '吸血', params: { leechRatio: 12 } },
      { traitId: 'wood', name: '木', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.15, y: 0.5 },
      tipAnchor: { x: 0.98, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },

  // ================= 3. 剑 (Sword - 5连击) =================
  {
    id: '青钢剑',
    name: '青钢游龙剑',
    category: 'weapon',
    words: ['金', '剑'],
    type: 'melee',
    shape: '剑',
    element: 'metal',
    description: '百炼玄金铸成，轻盈凌厉，剑出如走龙蛇。',
    summary: '五段连绵剑招，高频压制，打满释放破空剑气。',
    baseStats: { damage: 22, attackSpeed: 1.35, range: 110, knockback: 120 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 22 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.35 } },
      { traitId: 'range', name: '范围', params: { value: 110 } },
      { traitId: 'swordBeam', name: '剑气', params: { extraRange: 45, damageRatio: 80 } },
      { traitId: 'echo', name: '残影', params: { echoChance: 45, echoDamageRatio: 50 } },
      { traitId: 'metal', name: '金', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.18, y: 0.5 },
      tipAnchor: { x: 0.95, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },
  {
    id: '寒霜剑',
    name: '凝霜玄冰剑',
    category: 'weapon',
    words: ['水', '剑'],
    type: 'melee',
    shape: '剑',
    element: 'water',
    description: '寒潭玄冰凝聚之刃，剑锋所及霜华漫溢。',
    summary: '五连击高频冻结，极大削弱敌人攻速移速。',
    baseStats: { damage: 21, attackSpeed: 1.25, range: 132, knockback: 110 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 21 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.25 } },
      { traitId: 'range', name: '范围', params: { value: 132 } },
      { traitId: 'chill', name: '冰冻', params: { slowRatio: 40, duration: 3, freezeSec: 1.2 } },
      { traitId: 'water', name: '水', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.18, y: 0.5 },
      tipAnchor: { x: 0.95, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },

  // ================= 4. 戟 (Halberd - 3连击) =================
  {
    id: '破军戟',
    name: '破军画杆戟',
    category: 'weapon',
    words: ['金', '戟'],
    type: 'melee',
    shape: '戟',
    element: 'metal',
    description: '重型长兵，兼具枪矛刺击与巨斧大回旋挥砍。',
    summary: '纵劈 ➔ 180°大横扫 ➔ 倒钩截击，清群破阵神兵。',
    baseStats: { damage: 32, attackSpeed: 0.9, range: 165, knockback: 220 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 32 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 0.9 } },
      { traitId: 'range', name: '范围', params: { value: 165 } },
      { traitId: 'knockback', name: '击退', params: { force: 220, stunMs: 90 } },
      { traitId: 'metal', name: '金', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.22, y: 0.5 },
      tipAnchor: { x: 0.98, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },
  {
    id: '烈炎戟',
    name: '焚城烈火戟',
    category: 'weapon',
    words: ['火', '戟'],
    type: 'melee',
    shape: '戟',
    element: 'fire',
    description: '战戟两侧月牙附着炽热真火，横扫之处一片火海。',
    summary: '大范围横扫引燃灼烧，并附带强力击退。',
    baseStats: { damage: 34, attackSpeed: 0.88, range: 168, knockback: 210 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 34 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 0.88 } },
      { traitId: 'range', name: '范围', params: { value: 168 } },
      { traitId: 'burn', name: '灼烧', params: { dps: 20, duration: 4, chance: 100 } },
      { traitId: 'fire', name: '火', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.22, y: 0.5 },
      tipAnchor: { x: 0.98, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },

  // ================= 5. 斧 (Axe - 2连击) =================
  {
    id: '开山斧',
    name: '撼地开山斧',
    category: 'weapon',
    words: ['石', '斧'],
    type: 'melee',
    shape: '斧',
    element: 'earth',
    description: '厚重开山斧，重劈落地引发剧烈地裂震荡。',
    summary: '2段霸体高伤重劈，巨力砸地引发大范围眩晕。',
    baseStats: { damage: 45, attackSpeed: 0.65, range: 145, knockback: 300 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 45 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 0.65 } },
      { traitId: 'range', name: '范围', params: { value: 145 } },
      { traitId: 'stun', name: '眩晕', params: { chance: 60, duration: 1.8, radius: 120 } },
      { traitId: 'knockback', name: '击退', params: { force: 300, stunMs: 140 } },
      { traitId: 'earth', name: '土', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.2, y: 0.5 },
      tipAnchor: { x: 0.9, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },
  {
    id: '狂雷斧',
    name: '霹雳天雷战斧',
    category: 'weapon',
    words: ['雷', '斧'],
    type: 'melee',
    shape: '斧',
    element: 'fire',
    description: '斧身镌刻引雷咒，重斩落地引动天雷横扫。',
    summary: '重劈伴随雷霆轰顶，电弧在周围多个敌群跳跃。',
    baseStats: { damage: 42, attackSpeed: 0.7, range: 150, knockback: 260 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 42 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 0.7 } },
      { traitId: 'range', name: '范围', params: { value: 150 } },
      { traitId: 'chainLightning', name: '闪电', params: { jumpCount: 4, decayRatio: 15, chance: 100 } },
      { traitId: 'thunder', name: '雷', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.2, y: 0.5 },
      tipAnchor: { x: 0.9, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },

  // ================= 6. 弓 (Bow - 3连射) =================
  {
    id: '木弓',
    name: '青木长弓',
    category: 'weapon',
    words: ['木', '弓'],
    type: 'ranged',
    shape: '弓',
    element: 'wood',
    description: '柔韧青木制成，连续发射穿透木箭。',
    summary: '远程三段射击（单射 ➔ 双射 ➔ 贯穿），穿透敌人。',
    baseStats: { damage: 18, attackSpeed: 1.25, range: 480, knockback: 80, projectileSpeed: 620 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 18 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 1.25 } },
      { traitId: 'range', name: '范围', params: { value: 480 } },
      { traitId: 'projectileSpeed', name: '弹速', params: { value: 620 } },
      { traitId: 'pierce', name: '穿透', params: { pierceCount: 2, bladeRange: 0 } },
      { traitId: 'wood', name: '木', params: { potency: 1 } },
    ],
    visual: {
      gripAnchor: { x: 0.5, y: 0.5 },
      tipAnchor: { x: 0.8, y: 0.5 },
      rotationOffsetDeg: 0,
    },
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
    summary: '发射爆裂火箭，命中引燃地面产生火海。',
    baseStats: { damage: 26, attackSpeed: 0.95, range: 470, knockback: 130, projectileSpeed: 560 },
    traits: [
      { traitId: 'damage', name: '伤害', params: { value: 26 } },
      { traitId: 'attackSpeed', name: '攻速', params: { value: 0.95 } },
      { traitId: 'range', name: '范围', params: { value: 470 } },
      { traitId: 'projectileSpeed', name: '弹速', params: { value: 560 } },
      { traitId: 'burn', name: '灼烧', params: { dps: 22, duration: 4, chance: 100 } },
      { traitId: 'fire', name: '火', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.5, y: 0.5 },
      tipAnchor: { x: 0.8, y: 0.5 },
      rotationOffsetDeg: 0,
    },
  },

  // ================= 7. 防具 (Armor) =================
  {
    id: '磐石盾',
    name: '厚土磐石盾',
    category: 'armor',
    words: ['石', '盾'],
    type: 'defense',
    shape: '盾',
    element: 'earth',
    description: '玄石厚盾，坚不可摧，可抵御并反弹冲击。',
    summary: '减伤 45%，并反震受创伤害。',
    baseStats: { damage: 20, range: 80, knockback: 250, damageReduction: 0.45, bonusHp: 40 },
    traits: [
      { traitId: 'damageReduction', name: '减伤', params: { value: 45 } },
      { traitId: 'bonusHp', name: '生命', params: { value: 40 } },
      { traitId: 'thorns', name: '反伤', params: { reflectRatio: 50 } },
      { traitId: 'knockback', name: '击退', params: { force: 250, stunMs: 100 } },
      { traitId: 'earth', name: '土', params: { potency: 2 } },
    ],
    visual: {
      gripAnchor: { x: 0.5, y: 0.5 },
      tipAnchor: { x: 0.5, y: 0.1 },
      rotationOffsetDeg: 0,
    },
  },
];
