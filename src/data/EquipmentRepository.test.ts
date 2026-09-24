import { describe, it, expect, beforeEach } from 'vitest';
import { EquipmentRepository, EQUIPMENT_STORAGE_KEY } from './EquipmentRepository';
import { MemoryStorageAdapter } from '../services/StorageAdapter';
import { DEFAULT_EQUIPMENT_PRESETS, CompoundEquipment } from './equipmentTypes';

describe('EquipmentRepository Local Database', () => {
  let memoryStorage: MemoryStorageAdapter;
  let repo: EquipmentRepository;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    repo = new EquipmentRepository(memoryStorage);
  });

  it('loads default presets on initial load when storage is empty', () => {
    const list = repo.getAll();
    expect(list.length).toBe(DEFAULT_EQUIPMENT_PRESETS.length);
    expect(repo.getById('木刀')).toBeDefined();
    expect(repo.getById('木刀')?.baseStats.damage).toBe(8);
  });

  it('saves and loads customized equipment across sessions', () => {
    const customWeapon: CompoundEquipment = {
      id: '金光刀',
      name: '万道金光神刀',
      category: 'weapon',
      words: ['金', '刀'],
      type: 'melee',
      shape: '刀',
      element: 'metal',
      description: '金光护体，锋芒耀目。',
      summary: '伤害大幅提升，附带金光耀斑。',
      baseStats: { damage: 99, attackSpeed: 2.0, range: 200, knockback: 300 },
      traits: [],
    };

    repo.saveItem(customWeapon);
    expect(repo.getById('金光刀')?.baseStats.damage).toBe(99);

    // Re-create repo instance with same storage adapter
    const newRepo = new EquipmentRepository(memoryStorage);
    expect(newRepo.getById('金光刀')).toBeDefined();
    expect(newRepo.getById('金光刀')?.baseStats.damage).toBe(99);
  });

  it('resets to official defaults and persists it', () => {
    const woodKnife = repo.getById('木刀')!;
    woodKnife.baseStats.damage = 999;
    repo.saveItem(woodKnife);
    expect(repo.getById('木刀')?.baseStats.damage).toBe(999);

    repo.resetToDefaults();
    expect(repo.getById('木刀')?.baseStats.damage).toBe(8);
  });

  it('exports and imports valid JSON correctly', () => {
    const jsonStr = repo.exportJson();
    expect(jsonStr).toContain('木刀');

    const modJson = jsonStr.replace('"damage": 8', '"damage": 66');
    const result = repo.importJson(modJson);
    expect(result.success).toBe(true);
    expect(repo.getById('木刀')?.baseStats.damage).toBe(66);
  });

  it('rejects invalid JSON import', () => {
    const res1 = repo.importJson('invalid json');
    expect(res1.success).toBe(false);

    const res2 = repo.importJson('{"not": "an array"}');
    expect(res2.success).toBe(false);

    const res3 = repo.importJson('[{"bad": "item"}]');
    expect(res3.success).toBe(false);
  });

  it('notifies subscribers upon modification', () => {
    let notifiedCount = 0;
    const unsub = repo.subscribe(() => {
      notifiedCount++;
    });

    const knife = repo.getById('木刀')!;
    knife.baseStats.damage = 50;
    repo.saveItem(knife);

    expect(notifiedCount).toBe(1);
    unsub();

    repo.saveItem(knife);
    expect(notifiedCount).toBe(1);
  });
});
