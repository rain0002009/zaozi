import {
  CompoundEquipment,
  DEFAULT_EQUIPMENT_PRESETS,
} from './equipmentTypes';
import { StorageAdapter, defaultStorageAdapter } from '../services/StorageAdapter';

export const EQUIPMENT_STORAGE_KEY = 'zaozi_weapon_editor_data';

export class EquipmentRepository {
  private storage: StorageAdapter;
  private cache: CompoundEquipment[] = [];
  private listeners: Set<(list: CompoundEquipment[]) => void> = new Set();

  constructor(storage: StorageAdapter = defaultStorageAdapter) {
    this.storage = storage;
    this.load();
  }

  /**
   * Loads custom equipment data from storage.
   * If no valid custom data exists, initializes with a deep clone of DEFAULT_EQUIPMENT_PRESETS.
   */
  public load(): CompoundEquipment[] {
    try {
      const raw = this.storage.getItem(EQUIPMENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cache = parsed;
          return this.cache;
        }
      }
    } catch {
      // Storage failure or corrupted data fallback
    }

    this.cache = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT_PRESETS));
    return this.cache;
  }

  /**
   * Returns all equipment in the repository.
   */
  public getAll(): CompoundEquipment[] {
    if (this.cache.length === 0) {
      this.load();
    }
    return this.cache;
  }

  /**
   * Finds equipment by its unique ID.
   */
  public getById(id: string): CompoundEquipment | undefined {
    return this.getAll().find((eq) => eq.id === id);
  }

  /**
   * Saves the entire equipment list to storage and notifies subscribers.
   */
  public saveAll(list: CompoundEquipment[]): void {
    this.cache = JSON.parse(JSON.stringify(list));
    this.storage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(this.cache, null, 2));
    this.notifyListeners();
  }

  /**
   * Adds or updates a single equipment item.
   */
  public saveItem(item: CompoundEquipment): void {
    const list = [...this.getAll()];
    const index = list.findIndex((e) => e.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.push(item);
    }
    this.saveAll(list);
  }

  /**
   * Deletes an equipment item by ID.
   */
  public deleteItem(id: string): boolean {
    const list = this.getAll().filter((e) => e.id !== id);
    if (list.length === this.cache.length) {
      return false;
    }
    this.saveAll(list);
    return true;
  }

  /**
   * Resets repository back to official default presets and persists it.
   */
  public resetToDefaults(): CompoundEquipment[] {
    this.cache = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT_PRESETS));
    this.storage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(this.cache, null, 2));
    this.notifyListeners();
    return this.cache;
  }

  /**
   * Exports the entire database as a formatted JSON string.
   */
  public exportJson(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Validates and imports equipment from a JSON string.
   */
  public importJson(jsonStr: string): { success: boolean; count?: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { success: false, error: 'JSON 内容必须是非空装备数组' };
      }
      for (const item of parsed) {
        if (!item.id || !item.name || !item.category || !Array.isArray(item.words) || !item.baseStats) {
          return {
            success: false,
            error: `装备项「${item?.name || item?.id || '未知'}」格式不符合规范，缺少必要属性`,
          };
        }
      }
      this.saveAll(parsed);
      return { success: true, count: parsed.length };
    } catch (err: any) {
      return { success: false, error: `JSON 解析失败: ${err.message}` };
    }
  }

  /**
   * Subscribes to database changes.
   */
  public subscribe(fn: (list: CompoundEquipment[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) {
      try {
        fn(this.cache);
      } catch (err) {
        console.error('EquipmentRepository listener error:', err);
      }
    }
  }
}

export const equipmentRepository = new EquipmentRepository();
