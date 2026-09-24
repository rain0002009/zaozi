import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, COMPOUND_WEAPONS } from './GameState';
import { MemoryStorageAdapter } from '../services/StorageAdapter';

describe('GameState Domain Module with MemoryStorageAdapter Seam', () => {
  let memoryStorage: MemoryStorageAdapter;
  let state: GameState;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    state = new GameState(memoryStorage);
  });

  it('initializes with default meta and equipped weapon', () => {
    expect(state.meta.equippedWeapon).toBe('木刀');
    expect(state.meta.inventory['一']).toBe(4);
    expect(state.getEquippedWeapon().name).toBe('灵木刀');
    expect(state.getEquippedWeapon().stats.damage).toBe(8);
  });

  it('synthesizes word by deducting strokes and adding to wordInventory', () => {
    // Word '十' requires { '一': 1, '丨': 1 }
    const initialH = state.meta.inventory['一'];
    const initialS = state.meta.inventory['丨'];

    const wordId = state.synthesizeWord(['一', '丨']);
    expect(wordId).toBe('十');
    expect(state.meta.wordInventory['十']).toBe(1);
    expect(state.meta.inventory['一']).toBe(initialH - 1);
    expect(state.meta.inventory['丨']).toBe(initialS - 1);
    expect(state.meta.unlockedWords).toContain('十');
  });

  it('forges compound weapon by matching required words and deducting them', () => {
    // Populate word inventory with '木' and '刀'
    state.meta.wordInventory['木'] = 1;
    state.meta.wordInventory['刀'] = 1;

    const check = state.canPlayerForgeWeapon(['木', '刀']);
    expect(check.weaponId).toBe('木刀');

    const forged = state.forgeWeapon(['木', '刀']);
    expect(forged).toBe('木刀');
    expect(state.meta.equippedWeapon).toBe('木刀');
    expect(state.meta.wordInventory['木']).toBeUndefined();
    expect(state.meta.wordInventory['刀']).toBeUndefined();
  });

  it('persists and restores state across sessions via StorageAdapter', () => {
    state.meta.inventory['一'] = 99;
    state.meta.victories = 3;
    state.meta.unlockedWeapons.push('素铁刀');
    state.equipWeapon('素铁刀');
    state.save();

    // Create a new GameState instance sharing the same MemoryStorageAdapter
    const restoredState = new GameState(memoryStorage);
    expect(restoredState.meta.inventory['一']).toBe(99);
    expect(restoredState.meta.victories).toBe(3);
    expect(restoredState.meta.equippedWeapon).toBe('素铁刀');
  });

  it('contains valid traits and stats in COMPOUND_WEAPONS', () => {
    const fireBlade = COMPOUND_WEAPONS.炎刀;
    expect(fireBlade).toBeDefined();
    expect(fireBlade.stats.element).toBe('fire');
    expect(fireBlade.traits.some((t) => t.traitId === 'burn')).toBe(true);
  });
});
