export const STROKES = ['一', '丨', '丿', '㇏', '丶', '㇇'] as const;

export type Stroke = (typeof STROKES)[number];
export type WordId = '刀' | '火' | '盾';
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

type MetaState = {
  inventory: Inventory;
  unlockedWords: WordId[];
  equippedWords: WordId[];
  victories: number;
};

const STORAGE_KEY = 'zaozi-save-v1';

export const WORDS: Record<WordId, { type: string; summary: string; recipe: Partial<Inventory> }> = {
  刀: { type: '武器字', summary: '左键挥斩，可同时命中扇形内的敌人。', recipe: { '丿': 1, '㇇': 1 } },
  火: { type: '技能字', summary: '按 Q 或右键发射火字，命中后爆裂。', recipe: { '丶': 1, '丿': 2, '㇏': 1 } },
  盾: { type: '防具字', summary: '受到的伤害降低 35%。', recipe: { '一': 3, '丨': 1, '丿': 2, '㇇': 1 } },
};

export const ROUTES: Record<RouteId, RouteDefinition> = {
  wilds: {
    id: 'wilds', title: '枯字荒原', subtitle: '普通战斗', danger: '平稳',
    description: '游荡的狼群盘踞荒原，敌人较少。', enemyBonus: 0, lootMultiplier: 1, accent: 0x6e9b78,
  },
  ruins: {
    id: 'ruins', title: '残碑林', subtitle: '搜刮战斗', danger: '中等',
    description: '残碑孕育更多字灵，笔画掉落提高。', enemyBonus: 2, lootMultiplier: 1.45, accent: 0xb69a61,
  },
  ember: {
    id: 'ember', title: '妖火泽', subtitle: '远程战斗', danger: '危险',
    description: '水妖与火狼交错攻击，击败后可恢复生命。', enemyBonus: 1, lootMultiplier: 1.3, accent: 0xc86f59,
  },
  rift: {
    id: 'rift', title: '断墨窟', subtitle: '精英战斗', danger: '极险',
    description: '山鬼成群冲锋，获得的笔画数量显著提高。', enemyBonus: 3, lootMultiplier: 1.8, accent: 0x8d6b9f,
  },
  boss: {
    id: 'boss', title: '墨池核心', subtitle: '区域 Boss', danger: '首领',
    description: '击败「墨」，带着战利品返回基地。', enemyBonus: 0, lootMultiplier: 2.2, accent: 0x9b3f48,
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
    inventory: { '一': 2, '丨': 1, '丿': 2, '㇏': 1, '丶': 1, '㇇': 1 },
    unlockedWords: ['刀'],
    equippedWords: ['刀'],
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

  canCraft(word: WordId): boolean {
    if (this.meta.unlockedWords.includes(word)) return false;
    return Object.entries(WORDS[word].recipe).every(([stroke, amount]) =>
      this.meta.inventory[stroke as Stroke] >= (amount ?? 0),
    );
  }

  craft(word: WordId): boolean {
    if (!this.canCraft(word)) return false;
    for (const [stroke, amount] of Object.entries(WORDS[word].recipe)) {
      this.meta.inventory[stroke as Stroke] -= amount ?? 0;
    }
    this.meta.unlockedWords.push(word);
    this.meta.equippedWords.push(word);
    this.save();
    return true;
  }

  hasWord(word: WordId): boolean {
    return this.meta.equippedWords.includes(word);
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
      const unlocked = parsed.unlockedWords?.filter((word): word is WordId => word in WORDS) ?? ['刀'];
      const normalizedUnlocked: WordId[] = unlocked.includes('刀') ? unlocked : ['刀', ...unlocked];
      this.meta = {
        inventory: sanitizeInventory(parsed.inventory),
        unlockedWords: [...normalizedUnlocked],
        equippedWords: [...normalizedUnlocked],
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
