import { describe, it, expect } from 'vitest';
import {
  getWeaponCombo,
  WEAPON_COMBOS,
  KNIFE_COMBO,
  SPEAR_COMBO,
  SWORD_COMBO,
  HALBERD_COMBO,
  AXE_COMBO,
  BOW_COMBO,
} from './WeaponCombo';
import { WeaponShape } from '../data/equipmentTypes';

describe('WeaponCombo Multi-Archetype Sequence System', () => {
  it('defines distinct combo profiles with steps from 2 to 5', () => {
    expect(AXE_COMBO.attacks.length).toBe(2);
    expect(AXE_COMBO.totalSteps).toBe(2);

    expect(KNIFE_COMBO.attacks.length).toBe(3);
    expect(KNIFE_COMBO.totalSteps).toBe(3);

    expect(HALBERD_COMBO.attacks.length).toBe(3);
    expect(HALBERD_COMBO.totalSteps).toBe(3);

    expect(BOW_COMBO.attacks.length).toBe(3);
    expect(BOW_COMBO.totalSteps).toBe(3);

    expect(SPEAR_COMBO.attacks.length).toBe(4);
    expect(SPEAR_COMBO.totalSteps).toBe(4);

    expect(SWORD_COMBO.attacks.length).toBe(5);
    expect(SWORD_COMBO.totalSteps).toBe(5);
  });

  it('retrieves appropriate combo definition for each weapon shape', () => {
    const shapes: WeaponShape[] = ['刀', '枪', '剑', '戟', '斧', '弓'];
    shapes.forEach((shape) => {
      const combo = getWeaponCombo(shape);
      expect(combo).toBeDefined();
      expect(combo.shape).toBe(shape);
      expect(combo.attacks.length).toBeGreaterThanOrEqual(2);
      expect(combo.attacks.length).toBeLessThanOrEqual(5);
    });
  });

  it('verifies cadence timings and motion parameters for each attack', () => {
    Object.values(WEAPON_COMBOS).forEach((combo) => {
      expect(combo.resetWindow).toBeGreaterThan(0);
      combo.attacks.forEach((atk) => {
        expect(atk.duration).toBeGreaterThan(0);
        expect(atk.activeAt).toBeGreaterThan(0);
        expect(atk.activeAt).toBeLessThanOrEqual(atk.duration);
        expect(atk.chainAt).toBeGreaterThanOrEqual(atk.activeAt);
        expect(atk.damage).toBeGreaterThan(0);
        expect(atk.range).toBeGreaterThan(50);
        expect(atk.name).toBeTruthy();
        expect(atk.motionType).toBeTruthy();
      });
    });
  });

  it('configures bow as ranged multi-shot projectile sequence', () => {
    expect(BOW_COMBO.attacks[0].isRanged).toBe(true);
    expect(BOW_COMBO.attacks[0].projectileCount).toBe(1);

    expect(BOW_COMBO.attacks[1].isRanged).toBe(true);
    expect(BOW_COMBO.attacks[1].projectileCount).toBe(2);

    expect(BOW_COMBO.attacks[2].isRanged).toBe(true);
    expect(BOW_COMBO.attacks[2].pierceCount).toBe(3);
  });
});
