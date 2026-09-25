import { describe, it, expect } from 'vitest';
import {
  TRAIT_REGISTRY,
  DEFAULT_EQUIPMENT_PRESETS,
  TraitId,
  extractEquipmentStats,
  WeaponShape,
} from './equipmentTypes';

describe('Equipment Types & Trait Registry', () => {
  it('registers all mechanics, stats, and elements with concise names', () => {
    const expectedMechanics: TraitId[] = [
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

    expectedMechanics.forEach((traitId) => {
      expect(TRAIT_REGISTRY[traitId]).toBeDefined();
      expect(TRAIT_REGISTRY[traitId].name).toBeTruthy();
      expect(TRAIT_REGISTRY[traitId].params.length).toBeGreaterThan(0);
      expect(TRAIT_REGISTRY[traitId].category).toBe('mechanic');
    });

    // Check concise Chinese names
    expect(TRAIT_REGISTRY.lifeSteal.name).toBe('吸血');
    expect(TRAIT_REGISTRY.burn.name).toBe('灼烧');
    expect(TRAIT_REGISTRY.knockback.name).toBe('击退');
    expect(TRAIT_REGISTRY.instantKill.name).toBe('斩杀');
    expect(TRAIT_REGISTRY.chainLightning.name).toBe('闪电');
    expect(TRAIT_REGISTRY.chill.name).toBe('冰冻');
    expect(TRAIT_REGISTRY.pierce.name).toBe('穿透');
    expect(TRAIT_REGISTRY.thorns.name).toBe('反伤');
    expect(TRAIT_REGISTRY.stun.name).toBe('眩晕');
    expect(TRAIT_REGISTRY.echo.name).toBe('残影');

    // Stat traits
    expect(TRAIT_REGISTRY.damage.name).toBe('伤害');
    expect(TRAIT_REGISTRY.attackSpeed.name).toBe('攻速');
    expect(TRAIT_REGISTRY.range.name).toBe('范围');
  });

  it('covers all six weapon shapes plus defense', () => {
    const shapes: WeaponShape[] = ['刀', '枪', '剑', '戟', '斧', '弓'];
    shapes.forEach((shape) => {
      const match = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.shape === shape);
      expect(match).toBeDefined();
      expect(match?.visual?.gripAnchor).toBeDefined();
    });
  });

  it('extracts equipment stats smoothly from traits', () => {
    const woodKnife = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.id === '木刀')!;
    expect(woodKnife).toBeDefined();
    const stats = extractEquipmentStats(woodKnife);
    expect(stats.damage).toBe(8);
    expect(stats.attackSpeed).toBe(1.0);
    expect(stats.range).toBe(68);
    expect(stats.knockback).toBe(60);
    expect(woodKnife.traits.some((t) => t.traitId === 'swordBeam')).toBe(false);

    const sword = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.id === '青钢剑')!;
    expect(sword.traits.some((t) => t.traitId === 'swordBeam')).toBe(true);

    const spear = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.id === '灵木枪')!;
    expect(spear.traits.some((t) => t.traitId === 'lifeSteal')).toBe(true);

    const shield = DEFAULT_EQUIPMENT_PRESETS.find((e) => e.id === '磐石盾')!;
    expect(shield.traits.some((t) => t.traitId === 'thorns')).toBe(true);
    const shieldStats = extractEquipmentStats(shield);
    expect(shieldStats.damageReduction).toBe(0.45);
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
