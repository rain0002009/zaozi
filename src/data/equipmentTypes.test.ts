import { describe, it, expect } from 'vitest';
import {
  TRAIT_REGISTRY,
  DEFAULT_EQUIPMENT_PRESETS,
  TraitId,
} from './equipmentTypes';

describe('Equipment Types & Trait Registry', () => {
  it('registers all 10 core combat and defense traits', () => {
    const expectedTraits: TraitId[] = [
      'knockback',
      'burn',
      'instantKill',
      'chainLightning',
      'chill',
      'lifeSteal',
      'pierce',
      'thorns',
      'stun',
      'echo',
    ];

    expectedTraits.forEach((traitId) => {
      expect(TRAIT_REGISTRY[traitId]).toBeDefined();
      expect(TRAIT_REGISTRY[traitId].name).toBeTruthy();
      expect(TRAIT_REGISTRY[traitId].params.length).toBeGreaterThan(0);
    });
  });

  it('includes classic default weapon presets with valid configurations', () => {
    expect(DEFAULT_EQUIPMENT_PRESETS.length).toBeGreaterThanOrEqual(14);

    const woodKnife = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.id === '木刀');
    expect(woodKnife).toBeDefined();
    expect(woodKnife?.words).toEqual(['木', '刀']);
    expect(woodKnife?.category).toBe('weapon');
    expect(woodKnife?.baseStats.damage).toBe(8);

    const shield = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.id === '磐石盾');
    expect(shield).toBeDefined();
    expect(shield?.category).toBe('armor');
    expect(shield?.baseStats.damageReduction).toBe(0.45);
    expect(shield?.traits.some((t) => t.traitId === 'thorns')).toBe(true);
  });

  it('ensures each mounted trait in default presets references valid traitId and has params', () => {
    DEFAULT_EQUIPMENT_PRESETS.forEach((eq) => {
      eq.traits.forEach((t) => {
        expect(TRAIT_REGISTRY[t.traitId]).toBeDefined();
        expect(t.params).toBeDefined();
      });
    });
  });
});
