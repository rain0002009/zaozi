import { strokeService } from '../services/StrokeService';

export const STROKES = ['一', '丨', '丿', '㇏', '丶', '㇇'] as const;

export type Stroke = (typeof STROKES)[number];

export type WordId = string;

export type WordType = '兵刃字' | '属性字' | '基础字' | '造化字';

export type WordDefinition = {
  id: WordId;
  name: string;
  type: WordType;
  summary: string;
  recipe: Partial<Inventory>;
};

import {
  CompoundEquipment,
  DEFAULT_EQUIPMENT_PRESETS,
  ElementType,
  extractEquipmentStats,
  getEquipmentActionType,
  getEquipmentElement,
} from '../data/equipmentTypes';
import { equipmentRepository } from '../data/EquipmentRepository';
import { StorageAdapter, defaultStorageAdapter } from '../services/StorageAdapter';

export type CompoundWeaponId = string;

export type CompoundWeapon = CompoundEquipment & {
  stats: {
    damage: number;
    attackSpeed: number; // multiplier, e.g. 1.35
    range: number;
    knockback: number;
    element: ElementType;
    projectileSpeed?: number;
    damageReduction?: number;
    bonusHp?: number;
  };
};

import { type RouteId, type RouteDefinition, ROUTES, generateRouteOptions } from './RouteState';
export type { RouteId, RouteDefinition };
export { ROUTES, generateRouteOptions };
export type RunOutcome = 'retreat' | 'defeat' | 'victory';
export type Inventory = Record<Stroke, number>;

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
  wordInventory: Partial<Record<WordId, number>>;
  unlockedWords: WordId[];
  equippedWords: WordId[];
  unlockedWeapons: CompoundWeaponId[];
  equippedWeapon: CompoundWeaponId;
  recipeBook: WordId[];
  victories: number;
};

const STORAGE_KEY = 'zaozi-save-v3';

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
    summary: '短兵利刃，近身挥斩。',
    recipe: { '丿': 1, '㇇': 1 },
  },
  木: {
    id: '木',
    name: '木',
    type: '属性字',
    summary: '生机灵巧，柔韧自如。',
    recipe: { '一': 1, '丨': 1, '丿': 1, '㇏': 1 },
  },
  火: {
    id: '火',
    name: '火',
    type: '属性字',
    summary: '炽烈暴虐，燎原不熄。',
    recipe: { '丶': 2, '丿': 1, '㇏': 1 },
  },
  金: {
    id: '金',
    name: '金',
    type: '属性字',
    summary: '刚硬锋锐，坚固无匹。',
    recipe: { '一': 3, '丨': 1, '丿': 1, '㇏': 1, '丶': 2 },
  },
  石: {
    id: '石',
    name: '石',
    type: '属性字',
    summary: '厚重沉着，如磐似峦。',
    recipe: { '一': 2, '丨': 1, '丿': 1, '㇇': 1 },
  },
  水: {
    id: '水',
    name: '水',
    type: '属性字',
    summary: '润物不息，奔流激荡。',
    recipe: { '丨': 1, '㇇': 1, '丿': 1, '㇏': 1 },
  },
  弓: {
    id: '弓',
    name: '弓',
    type: '兵刃字',
    summary: '张弦蓄力，发于百步之外。',
    recipe: { '一': 1, '㇇': 2 },
  },
  盾: {
    id: '盾',
    name: '盾',
    type: '兵刃字',
    summary: '坚壁抵挡，御敌身前。',
    recipe: { '一': 3, '丨': 1, '丿': 2, '㇇': 1 },
  },
  风: {
    id: '风',
    name: '风',
    type: '属性字',
    summary: '疾风呼啸，倏忽无踪。',
    recipe: { '丿': 2, '㇇': 1, '丶': 1 },
  },
  雷: {
    id: '雷',
    name: '雷',
    type: '属性字',
    summary: '雷霆万钧，势若破竹。',
    recipe: { '一': 2, '丨': 2, '丶': 4, '㇇': 1 },
  },
  枪: {
    id: '枪',
    name: '枪',
    type: '兵刃字',
    summary: '百兵之王，长兵远距离迅猛突刺。',
    recipe: { '一': 1, '丨': 1, '丿': 2, '㇏': 1, '㇇': 1 },
  },
  斧: {
    id: '斧',
    name: '斧',
    type: '兵刃字',
    summary: '开山巨斧，重劈撼地。',
    recipe: { '丿': 2, '丶': 2, '丨': 1 },
  },
  剑: {
    id: '剑',
    name: '剑',
    type: '兵刃字',
    summary: '百兵之君，灵动迅疾，连绵剑招。',
    recipe: { '一': 2, '丨': 2, '丿': 1, '丶': 2, '㇇': 1 },
  },
  戟: {
    id: '戟',
    name: '戟',
    type: '兵刃字',
    summary: '长柄破军，兼具直刺与大回旋重扫。',
    recipe: { '一': 2, '丨': 2, '丿': 2, '㇏': 1, '㇇': 1 },
  },
};

export function buildCompoundWeapons(presets?: CompoundEquipment[]): Record<string, CompoundWeapon> {
  const result: Record<string, CompoundWeapon> = {};
  const list = presets || equipmentRepository.getAll();
  for (const preset of list) {
    const stats = extractEquipmentStats(preset);
    const derivedElem = getEquipmentElement(preset);
    const derivedActionType = preset.shape ? getEquipmentActionType(preset.shape) : (preset.type ?? 'melee');
    result[preset.id] = {
      ...preset,
      type: derivedActionType,
      element: derivedElem,
      stats: {
        damage: stats.damage ?? 15,
        attackSpeed: stats.attackSpeed ?? 1.0,
        range: stats.range ?? 120,
        knockback: stats.knockback ?? 120,
        element: derivedElem,
        projectileSpeed: stats.projectileSpeed,
        damageReduction: stats.damageReduction,
        bonusHp: stats.bonusHp,
      },
    };
  }
  return result;
}

export const COMPOUND_WEAPONS: Record<CompoundWeaponId, CompoundWeapon> = buildCompoundWeapons();

export function refreshCompoundWeapons(presets?: CompoundEquipment[]): void {
  const updated = buildCompoundWeapons(presets);
  for (const key of Object.keys(COMPOUND_WEAPONS)) {
    delete COMPOUND_WEAPONS[key];
  }
  Object.assign(COMPOUND_WEAPONS, updated);
}

// Auto-sync when equipment repository emits updates
equipmentRepository.subscribe((list) => {
  refreshCompoundWeapons(list);
});

// Cross-tab sync if in browser
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (e) => {
    if (e.key === 'zaozi_weapon_editor_data') {
      equipmentRepository.load();
      refreshCompoundWeapons();
    }
  });
}

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
    wordInventory: {},
    unlockedWords: [],
    equippedWords: [],
    unlockedWeapons: ['木刀'],
    equippedWeapon: '木刀',
    recipeBook: [],
    victories: 0,
  };
}

export class GameState {
  meta: MetaState = defaultMeta();
  expedition?: Expedition;
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = defaultStorageAdapter) {
    this.storage = storage;
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

    // Add to wordInventory
    this.meta.wordInventory[wordId] = (this.meta.wordInventory[wordId] || 0) + 1;

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

  getWordRecipe(wordId: WordId): Partial<Inventory> {
    if (wordId in WORDS) {
      return WORDS[wordId as keyof typeof WORDS].recipe;
    }
    const seq = strokeService.getStrokeSequence(wordId);
    if (!seq) {
      return { '一': 1 };
    }
    const recipe: Partial<Inventory> = {};
    for (const s of seq) {
      let strokeKey: Stroke;
      if (s === 'h') strokeKey = '一';
      else if (s === 's') strokeKey = '丨';
      else if (s === 'p') strokeKey = '丿';
      else if (s === 'z') strokeKey = '㇇';
      else if (s === 'n') strokeKey = '丶';
      else strokeKey = '一';

      recipe[strokeKey] = (recipe[strokeKey] || 0) + 1;
    }
    return recipe;
  }

  getWordDefinition(wordId: WordId): WordDefinition {
    if (wordId in WORDS) {
      return WORDS[wordId as keyof typeof WORDS];
    }
    return {
      id: wordId,
      name: wordId,
      type: '造化字',
      summary: '笔墨天成，自生意蕴。',
      recipe: this.getWordRecipe(wordId),
    };
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
    const recipe = this.getWordRecipe(wordId);
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

    for (const [stroke, needed] of Object.entries(check.recipe) as [Stroke, number][]) {
      this.meta.inventory[stroke] -= needed;
    }

    // Add to wordInventory
    this.meta.wordInventory[wordId] = (this.meta.wordInventory[wordId] || 0) + 1;

    if (!this.meta.unlockedWords.includes(wordId)) {
      this.meta.unlockedWords.push(wordId);
    }
    if (!this.meta.recipeBook.includes(wordId)) {
      this.meta.recipeBook.push(wordId);
    }

    this.save();
    return true;
  }

  /**
   * Matches any weapon whose required words match the given words (order-independent).
   */
  canForgeWeapon(words: WordId[]): CompoundWeaponId | undefined {
    if (!words || words.length === 0) return undefined;
    const sortedInput = [...words].sort().join(',');

    for (const [wId, weapon] of Object.entries(COMPOUND_WEAPONS) as [CompoundWeaponId, CompoundWeapon][]) {
      const sortedRecipe = [...weapon.words].sort().join(',');
      if (sortedInput === sortedRecipe) {
        return wId;
      }
    }
    return undefined;
  }

  canPlayerForgeWeapon(words: WordId[]): { weaponId?: CompoundWeaponId; error?: string } {
    if (!words || words.length === 0) {
      return { error: '请放入字进行锻造' };
    }

    const weaponId = this.canForgeWeapon(words);
    if (!weaponId) {
      return { error: '当前汉字组合尚未参透武器真意' };
    }

    // Check if player has enough of each word in wordInventory
    const neededCounts: Partial<Record<WordId, number>> = {};
    for (const w of words) neededCounts[w] = (neededCounts[w] || 0) + 1;

    for (const [w, count] of Object.entries(neededCounts) as [WordId, number][]) {
      const have = this.meta.wordInventory[w] ?? 0;
      if (have < count) {
        return { error: `字「${w}」存量不足 (需 ${count}，拥有 ${have})` };
      }
    }

    return { weaponId };
  }

  forgeWeapon(words: WordId[]): CompoundWeaponId | undefined {
    const check = this.canPlayerForgeWeapon(words);
    if (!check.weaponId) return undefined;

    // Deduct words from wordInventory
    for (const w of words) {
      if (this.meta.wordInventory[w]) {
        this.meta.wordInventory[w] -= 1;
        if (this.meta.wordInventory[w] <= 0) {
          delete this.meta.wordInventory[w];
        }
      }
    }

    const weaponId = check.weaponId;
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
    return COMPOUND_WEAPONS[this.meta.equippedWeapon] || COMPOUND_WEAPONS.木刀;
  }

  hasWord(word: WordId): boolean {
    return (this.meta.wordInventory[word] ?? 0) > 0;
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
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<MetaState>;
      const unlockedWords = parsed.unlockedWords ?? [];
      const unlockedWeapons = parsed.unlockedWeapons?.filter((w): w is CompoundWeaponId => w in COMPOUND_WEAPONS) ?? ['木刀'];
      const equippedWeapon = (parsed.equippedWeapon && parsed.equippedWeapon in COMPOUND_WEAPONS)
        ? parsed.equippedWeapon
        : '木刀';

      const wordInventory: Partial<Record<WordId, number>> = {};
      if (parsed.wordInventory) {
        for (const [w, count] of Object.entries(parsed.wordInventory)) {
          if (typeof count === 'number' && count > 0) {
            wordInventory[w as WordId] = Math.floor(count);
          }
        }
      }

      this.meta = {
        inventory: sanitizeInventory(parsed.inventory),
        wordInventory,
        unlockedWords,
        equippedWords: unlockedWords,
        unlockedWeapons,
        equippedWeapon,
        recipeBook: parsed.recipeBook ?? unlockedWords,
        victories: Math.max(0, Math.floor(Number(parsed.victories) || 0)),
      };
    } catch {
      this.meta = defaultMeta();
    }
  }

  save(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.meta));
    } catch {
      // A blocked storage API should not prevent a run from continuing.
    }
  }
}

export const gameState = new GameState();
