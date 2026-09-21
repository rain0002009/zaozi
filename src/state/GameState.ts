export const STROKES = ['一', '丨', '丿', '㇏', '丶', '㇇'] as const;

export type Stroke = (typeof STROKES)[number];

export type WordId =
  | '刀'
  | '弓'
  | '盾'
  | '木'
  | '火'
  | '金'
  | '石'
  | '水'
  | '十'
  | '人'
  | '大'
  | '风'
  | '雷'
  | '枪'
  | '斧';

export type WordType = '兵刃字' | '属性字' | '基础字';

export type WordDefinition = {
  id: WordId;
  name: string;
  type: WordType;
  summary: string;
  recipe: Partial<Inventory>;
};

export type CompoundWeaponId =
  | '基础刀'
  | '木刀'
  | '炎刀'
  | '金刀'
  | '石刃'
  | '木弓'
  | '烈火弓'
  | '磐石盾'
  | '疾风刃'
  | '奔雷刀'
  | '破阵枪'
  | '灵木枪'
  | '开山斧';

export type CompoundWeapon = {
  id: CompoundWeaponId;
  name: string;
  prefixWord?: WordId;
  coreWord: WordId;
  type: 'melee' | 'ranged' | 'defense';
  description: string;
  summary: string;
  stats: {
    damage: number;
    attackSpeed: number; // multiplier, e.g. 1.35
    range: number;
    knockback: number;
    element: 'none' | 'wood' | 'fire' | 'metal' | 'earth' | 'water';
    projectileSpeed?: number;
  };
};

export type RouteId = 'wilds' | 'ruins' | 'ember' | 'rift' | 'boss';
export type RunOutcome = 'retreat' | 'defeat' | 'victory';
export type Inventory = Record<Stroke, number>;

export type RouteDefinition = {
  id: RouteId;
  title: string;
  subtitle: string;
  danger: string;
  description: string;
  enemyBonus: number;
  lootMultiplier: number;
  accent: number;
};

export type Expedition = {
  area: number;
  hp: number;
  maxHp: number;
  carried: Inventory;
  route?: RouteId;
};

export type Settlement = {
  outcome: RunOutcome;
  areaReached: number;
  kept: Inventory;
  lost: number;
};

export type MetaState = {
  inventory: Inventory;
  unlockedWords: WordId[];
  equippedWords: WordId[];
  unlockedWeapons: CompoundWeaponId[];
  equippedWeapon: CompoundWeaponId;
  recipeBook: WordId[];
  victories: number;
};

const STORAGE_KEY = 'zaozi-save-v2';

export const WORDS: Record<WordId, WordDefinition> = {
  十: {
    id: '十',
    name: '十',
    type: '基础字',
    summary: '横平竖直，天地交汇。基础构字单元。',
    recipe: { '一': 1, '丨': 1 },
  },
  人: {
    id: '人',
    name: '人',
    type: '基础字',
    summary: '一撇一捺，立于天地。生命之初。',
    recipe: { '丿': 1, '㇏': 1 },
  },
  大: {
    id: '大',
    name: '大',
    type: '基础字',
    summary: '张臂顶天，气象广阔。',
    recipe: { '一': 1, '丿': 1, '㇏': 1 },
  },
  刀: {
    id: '刀',
    name: '刀',
    type: '兵刃字',
    summary: '短兵利刃，近身挥斩，可作为兵刃核心。',
    recipe: { '丿': 1, '㇇': 1 },
  },
  木: {
    id: '木',
    name: '木',
    type: '属性字',
    summary: '生机灵巧，用于铸武大幅提高挥舞攻速。',
    recipe: { '一': 1, '丨': 1, '丿': 1, '㇏': 1 },
  },
  火: {
    id: '火',
    name: '火',
    type: '属性字',
    summary: '炽烈暴虐，用于铸武附带火焰刀气与范围灼烧。',
    recipe: { '丶': 2, '丿': 1, '㇏': 1 },
  },
  金: {
    id: '金',
    name: '金',
    type: '属性字',
    summary: '刚硬锋锐，用于铸武扩大攻击范围并附带破甲击退。',
    recipe: { '一': 3, '丨': 1, '丿': 1, '㇏': 1, '丶': 2 },
  },
  石: {
    id: '石',
    name: '石',
    type: '属性字',
    summary: '厚重沉着，用于铸武附带重击地裂与短暂眩晕。',
    recipe: { '一': 2, '丨': 1, '丿': 1, '㇇': 1 },
  },
  水: {
    id: '水',
    name: '水',
    type: '属性字',
    summary: '润物不息，用于铸武击中恢复微量气血。',
    recipe: { '丨': 1, '㇇': 1, '丿': 1, '㇏': 1 },
  },
  弓: {
    id: '弓',
    name: '弓',
    type: '兵刃字',
    summary: '张弦蓄力，远程发射直线弹道兵刃。',
    recipe: { '一': 1, '㇇': 2 },
  },
  盾: {
    id: '盾',
    name: '盾',
    type: '兵刃字',
    summary: '坚壁抵挡，格挡伤害并可反击冲撞。',
    recipe: { '一': 3, '丨': 1, '丿': 2, '㇇': 1 },
  },
  风: {
    id: '风',
    name: '风',
    type: '属性字',
    summary: '疾风呼啸，用于铸武大幅提升攻速与身法，挥出狂暴风刃。',
    recipe: { '丿': 2, '㇇': 1, '丶': 1 },
  },
  雷: {
    id: '雷',
    name: '雷',
    type: '属性字',
    summary: '雷霆万钧，用于铸武攻击附带连环闪电链。',
    recipe: { '一': 2, '丨': 2, '丶': 4, '㇇': 1 },
  },
  枪: {
    id: '枪',
    name: '枪',
    type: '兵刃字',
    summary: '百兵之王，长兵远距离直线迅猛突刺。',
    recipe: { '一': 1, '丨': 1, '丿': 2, '㇏': 1, '㇇': 1 },
  },
  斧: {
    id: '斧',
    name: '斧',
    type: '兵刃字',
    summary: '开山巨斧，大范围重劈引发地裂冲击波。',
    recipe: { '丿': 2, '丶': 2, '丨': 1 },
  },
};

export const COMPOUND_WEAPONS: Record<CompoundWeaponId, CompoundWeapon> = {
  基础刀: {
    id: '基础刀',
    name: '素铁刀',
    coreWord: '刀',
    type: 'melee',
    description: '未融合任何属性字的普通短刀，手感朴实。',
    summary: '基础三连斩，左键挥击攻击侧敌人。',
    stats: {
      damage: 18,
      attackSpeed: 1.0,
      range: 110,
      knockback: 120,
      element: 'none',
    },
  },
  木刀: {
    id: '木刀',
    name: '灵木刀',
    prefixWord: '木',
    coreWord: '刀',
    type: 'melee',
    description: '以灵木雕琢而成的轻快利刃，轻若无物。',
    summary: '攻速 +40%，连斩极为迅捷，身法灵活。',
    stats: {
      damage: 16,
      attackSpeed: 1.4,
      range: 105,
      knockback: 100,
      element: 'wood',
    },
  },
  炎刀: {
    id: '炎刀',
    name: '赤炎刀',
    prefixWord: '火',
    coreWord: '刀',
    type: 'melee',
    description: '刀身缠绕炽烈墨火，挥击割裂空气引发爆燃。',
    summary: '挥出烈焰刀芒，命中敌群附带范围灼烧。',
    stats: {
      damage: 24,
      attackSpeed: 1.05,
      range: 125,
      knockback: 135,
      element: 'fire',
    },
  },
  金刀: {
    id: '金刀',
    name: '金精刃',
    prefixWord: '金',
    coreWord: '刀',
    type: 'melee',
    description: '金精玄铁锻造，锋利无匹，刃芒森寒。',
    summary: '范围 +30%，伤害提高，强力破甲击退。',
    stats: {
      damage: 28,
      attackSpeed: 0.9,
      range: 145,
      knockback: 190,
      element: 'metal',
    },
  },
  石刃: {
    id: '石刃',
    name: '碎石刃',
    prefixWord: '石',
    coreWord: '刀',
    type: 'melee',
    description: '巨石磨制的厚重钝刀，挥动有崩山之势。',
    summary: '势大力沉，命中引发地裂震波，概率眩晕。',
    stats: {
      damage: 32,
      attackSpeed: 0.75,
      range: 120,
      knockback: 220,
      element: 'earth',
    },
  },
  木弓: {
    id: '木弓',
    name: '青木弓',
    prefixWord: '木',
    coreWord: '弓',
    type: 'ranged',
    description: '柔韧青木制成，连续发射穿透木箭。',
    summary: '远程直线射击，连射速度快，穿透 1 名敌人。',
    stats: {
      damage: 16,
      attackSpeed: 1.25,
      range: 480,
      knockback: 80,
      element: 'wood',
      projectileSpeed: 620,
    },
  },
  烈火弓: {
    id: '烈火弓',
    name: '烈火弓',
    prefixWord: '火',
    coreWord: '弓',
    type: 'ranged',
    description: '弓弦附着妖火，射出的箭矢落地爆裂。',
    summary: '发射爆裂火箭，命中爆炸引燃地面产生火海。',
    stats: {
      damage: 25,
      attackSpeed: 0.9,
      range: 460,
      knockback: 140,
      element: 'fire',
      projectileSpeed: 550,
    },
  },
  磐石盾: {
    id: '磐石盾',
    name: '磐石盾',
    prefixWord: '石',
    coreWord: '盾',
    type: 'defense',
    description: '玄石厚盾，坚不可摧，可抵御并反弹冲击。',
    summary: '受创降低 45%，挥盾冲锋击飞前方所有敌群。',
    stats: {
      damage: 22,
      attackSpeed: 0.85,
      range: 90,
      knockback: 250,
      element: 'earth',
    },
  },
  疾风刃: {
    id: '疾风刃',
    name: '疾风刃',
    prefixWord: '风',
    coreWord: '刀',
    type: 'melee',
    description: '御风而铸的轻灵刀刃，挥刀若狂风过境。',
    summary: '攻速 +50%，挥斩附带青色风刃，撕裂前排。',
    stats: {
      damage: 20,
      attackSpeed: 1.5,
      range: 120,
      knockback: 110,
      element: 'wood',
    },
  },
  奔雷刀: {
    id: '奔雷刀',
    name: '奔雷刀',
    prefixWord: '雷',
    coreWord: '刀',
    type: 'melee',
    description: '刀铭引雷符，劈砍带起霹雳爆鸣与金蛇电弧。',
    summary: '命中引发电弧跳跃，对邻近敌人造成连环雷击。',
    stats: {
      damage: 26,
      attackSpeed: 1.1,
      range: 130,
      knockback: 150,
      element: 'fire',
    },
  },
  破阵枪: {
    id: '破阵枪',
    name: '破阵枪',
    coreWord: '枪',
    type: 'melee',
    description: '丈八长枪，直线贯刺，破阵当先。',
    summary: '超远距离直线突刺，攻击侧敌人受击硬直。',
    stats: {
      damage: 30,
      attackSpeed: 0.95,
      range: 180,
      knockback: 200,
      element: 'none',
    },
  },
  灵木枪: {
    id: '灵木枪',
    name: '灵木长枪',
    prefixWord: '木',
    coreWord: '枪',
    type: 'melee',
    description: '灵木为杆，刚柔并济，连环疾刺破甲。',
    summary: '攻速 +30%，枪出如龙，连续直刺贯穿敌阵。',
    stats: {
      damage: 26,
      attackSpeed: 1.3,
      range: 185,
      knockback: 160,
      element: 'wood',
    },
  },
  开山斧: {
    id: '开山斧',
    name: '开山巨斧',
    prefixWord: '石',
    coreWord: '斧',
    type: 'melee',
    description: '厚重开山斧，重劈落地引发剧烈地震波。',
    summary: '极高伤害与击退，下砸产生大范围冲击波。',
    stats: {
      damage: 42,
      attackSpeed: 0.65,
      range: 140,
      knockback: 280,
      element: 'earth',
    },
  },
};

export const ROUTES: Record<RouteId, RouteDefinition> = {
  wilds: {
    id: 'wilds',
    title: '枯字荒原',
    subtitle: '普通战斗',
    danger: '平稳',
    description: '游荡的狼群盘踞荒原，主要掉落「丿」「㇏」笔画。',
    enemyBonus: 0,
    lootMultiplier: 1,
    accent: 0x6e9b78,
  },
  ruins: {
    id: 'ruins',
    title: '残碑林',
    subtitle: '搜刮战斗',
    danger: '中等',
    description: '残碑孕育更多字灵，主要掉落「一」「丨」笔画。',
    enemyBonus: 2,
    lootMultiplier: 1.45,
    accent: 0xb69a61,
  },
  ember: {
    id: 'ember',
    title: '妖火泽',
    subtitle: '远程战斗',
    danger: '危险',
    description: '水妖与火狼交错，主要掉落「丶」「㇇」笔画。',
    enemyBonus: 1,
    lootMultiplier: 1.3,
    accent: 0xc86f59,
  },
  rift: {
    id: 'rift',
    title: '断墨窟',
    subtitle: '精英战斗',
    danger: '极险',
    description: '山鬼成群冲锋，获得的珍贵笔画数量显著提高。',
    enemyBonus: 3,
    lootMultiplier: 1.8,
    accent: 0x8d6b9f,
  },
  boss: {
    id: 'boss',
    title: '墨池核心',
    subtitle: '区域 Boss',
    danger: '首领',
    description: '击败「墨」，带着全部战利品返回基地。',
    enemyBonus: 0,
    lootMultiplier: 2.2,
    accent: 0x9b3f48,
  },
};

function emptyInventory(): Inventory {
  return { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 };
}

function sanitizeInventory(value?: Partial<Inventory>): Inventory {
  const result = emptyInventory();
  for (const stroke of STROKES) result[stroke] = Math.max(0, Math.floor(Number(value?.[stroke]) || 0));
  return result;
}

function defaultMeta(): MetaState {
  return {
    inventory: { '一': 4, '丨': 3, '丿': 4, '㇏': 3, '丶': 4, '㇇': 3 },
    unlockedWords: ['刀', '木', '十'],
    equippedWords: ['刀'],
    unlockedWeapons: ['基础刀', '木刀'],
    equippedWeapon: '木刀',
    recipeBook: ['刀', '木', '十'],
    victories: 0,
  };
}

class GameState {
  meta: MetaState = defaultMeta();
  expedition?: Expedition;

  constructor() {
    this.load();
  }

  startExpedition(): Expedition {
    this.expedition = { area: 1, hp: 100, maxHp: 100, carried: emptyInventory() };
    return this.expedition;
  }

  selectRoute(route: RouteId): void {
    if (!this.expedition) this.startExpedition();
    this.expedition!.route = route;
  }

  addCarried(stroke: Stroke, amount = 1): void {
    if (!this.expedition) return;
    this.expedition.carried[stroke] += amount;
  }

  advanceArea(): void {
    if (!this.expedition) return;
    this.expedition.area += 1;
    this.expedition.route = undefined;
  }

  /**
   * Checks whether a set of strokes matches any word recipe.
   */
  matchWordByStrokes(strokes: Stroke[]): WordId | undefined {
    const counts: Partial<Inventory> = {};
    for (const s of strokes) counts[s] = (counts[s] || 0) + 1;

    for (const [wordId, wordDef] of Object.entries(WORDS) as [WordId, WordDefinition][]) {
      const recipe = wordDef.recipe;
      const strokesInRecipe = Object.keys(recipe) as Stroke[];
      const strokesInInput = Object.keys(counts) as Stroke[];

      if (strokesInRecipe.length !== strokesInInput.length) continue;

      const matches = strokesInRecipe.every((s) => recipe[s] === counts[s]);
      if (matches) return wordId;
    }
    return undefined;
  }

  canSynthesizeWord(strokes: Stroke[]): { wordId?: WordId; error?: string } {
    if (strokes.length === 0) return { error: '请在米字格中放置笔画' };

    const wordId = this.matchWordByStrokes(strokes);
    if (!wordId) return { error: '当前笔画组合无法结成合法的汉字' };

    // Check if player has sufficient strokes in inventory
    const counts: Partial<Inventory> = {};
    for (const s of strokes) counts[s] = (counts[s] || 0) + 1;

    for (const [s, needed] of Object.entries(counts) as [Stroke, number][]) {
      if ((this.meta.inventory[s] ?? 0) < needed) {
        return { error: `仓中笔画「${s}」不足 (需要 ${needed}，拥有 ${this.meta.inventory[s] ?? 0})` };
      }
    }

    return { wordId };
  }

  synthesizeWord(strokes: Stroke[]): WordId | undefined {
    const check = this.canSynthesizeWord(strokes);
    if (!check.wordId) return undefined;

    const wordId = check.wordId;

    // Deduct strokes
    const counts: Partial<Inventory> = {};
    for (const s of strokes) counts[s] = (counts[s] || 0) + 1;
    for (const [s, needed] of Object.entries(counts) as [Stroke, number][]) {
      this.meta.inventory[s] -= needed;
    }

    // Unlock word & recipe book
    if (!this.meta.unlockedWords.includes(wordId)) {
      this.meta.unlockedWords.push(wordId);
    }
    if (!this.meta.recipeBook.includes(wordId)) {
      this.meta.recipeBook.push(wordId);
    }

    this.save();
    return wordId;
  }

  /**
   * Checks whether a recognized character can be synthesized based on inventory strokes.
   */
  canSynthesizeCharacter(wordId: WordId): {
    canSynthesize: boolean;
    error?: string;
    missing?: Partial<Inventory>;
    recipe: Partial<Inventory>;
  } {
    const def = WORDS[wordId];
    if (!def) {
      return { canSynthesize: false, error: '此字尚未收录至兵道真言', recipe: {} };
    }

    const recipe = def.recipe;
    const missing: Partial<Inventory> = {};
    let can = true;

    for (const [stroke, needed] of Object.entries(recipe) as [Stroke, number][]) {
      const have = this.meta.inventory[stroke] ?? 0;
      if (have < needed) {
        can = false;
        missing[stroke] = needed - have;
      }
    }

    if (!can) {
      const missingStr = Object.entries(missing)
        .map(([s, n]) => `${s}×${n}`)
        .join(' ');
      return { canSynthesize: false, error: `仓中笔画不足，尚缺：${missingStr}`, missing, recipe };
    }

    return { canSynthesize: true, recipe };
  }

  /**
   * Synthesizes a recognized character, deducting strokes and unlocking it into the word library.
   */
  synthesizeCharacter(wordId: WordId): boolean {
    const check = this.canSynthesizeCharacter(wordId);
    if (!check.canSynthesize) return false;

    const def = WORDS[wordId];
    for (const [stroke, needed] of Object.entries(def.recipe) as [Stroke, number][]) {
      this.meta.inventory[stroke] -= needed;
    }

    if (!this.meta.unlockedWords.includes(wordId)) {
      this.meta.unlockedWords.push(wordId);
    }
    if (!this.meta.recipeBook.includes(wordId)) {
      this.meta.recipeBook.push(wordId);
    }

    this.save();
    return true;
  }

  canForgeWeapon(prefix: WordId, core: WordId): CompoundWeaponId | undefined {
    for (const [wId, weapon] of Object.entries(COMPOUND_WEAPONS) as [CompoundWeaponId, CompoundWeapon][]) {
      if (weapon.prefixWord === prefix && weapon.coreWord === core) {
        return wId;
      }
    }
    return undefined;
  }

  forgeWeapon(prefix: WordId, core: WordId): CompoundWeaponId | undefined {
    const weaponId = this.canForgeWeapon(prefix, core);
    if (!weaponId) return undefined;

    if (!this.meta.unlockedWeapons.includes(weaponId)) {
      this.meta.unlockedWeapons.push(weaponId);
    }
    this.meta.equippedWeapon = weaponId;
    this.save();
    return weaponId;
  }

  equipWeapon(weaponId: CompoundWeaponId): void {
    if (this.meta.unlockedWeapons.includes(weaponId)) {
      this.meta.equippedWeapon = weaponId;
      this.save();
    }
  }

  getEquippedWeapon(): CompoundWeapon {
    return COMPOUND_WEAPONS[this.meta.equippedWeapon] || COMPOUND_WEAPONS.基础刀;
  }

  hasWord(word: WordId): boolean {
    return this.meta.unlockedWords.includes(word);
  }

  settle(outcome: RunOutcome): Settlement {
    const run = this.expedition ?? { area: 1, carried: emptyInventory() };
    const keepRatio = outcome === 'defeat' ? 0.25 : 1;
    const kept = emptyInventory();
    let lost = 0;
    for (const stroke of STROKES) {
      kept[stroke] = Math.floor(run.carried[stroke] * keepRatio);
      lost += run.carried[stroke] - kept[stroke];
      this.meta.inventory[stroke] += kept[stroke];
    }
    if (outcome === 'victory') this.meta.victories += 1;
    const settlement = { outcome, areaReached: run.area, kept, lost };
    this.expedition = undefined;
    this.save();
    return settlement;
  }

  inventoryTotal(inventory: Inventory): number {
    return STROKES.reduce((total, stroke) => total + inventory[stroke], 0);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<MetaState>;
      const unlockedWords = parsed.unlockedWords?.filter((w): w is WordId => w in WORDS) ?? ['刀', '木', '十'];
      const unlockedWeapons = parsed.unlockedWeapons?.filter((w): w is CompoundWeaponId => w in COMPOUND_WEAPONS) ?? ['基础刀', '木刀'];
      const equippedWeapon = (parsed.equippedWeapon && parsed.equippedWeapon in COMPOUND_WEAPONS)
        ? parsed.equippedWeapon
        : '木刀';

      this.meta = {
        inventory: sanitizeInventory(parsed.inventory),
        unlockedWords,
        equippedWords: unlockedWords,
        unlockedWeapons,
        equippedWeapon,
        recipeBook: parsed.recipeBook?.filter((w): w is WordId => w in WORDS) ?? unlockedWords,
        victories: Math.max(0, Math.floor(Number(parsed.victories) || 0)),
      };
    } catch {
      this.meta = defaultMeta();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.meta));
    } catch {
      // A blocked storage API should not prevent a run from continuing.
    }
  }
}

export const gameState = new GameState();
