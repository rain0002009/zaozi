import { describe, it, expect } from 'vitest';
import { CombatEngine, CombatAttacker, CombatDefender } from './CombatEngine';
import { COMPOUND_WEAPONS } from '../state/GameState';

describe('CombatEngine Deep Domain Module', () => {
  const defaultAttacker: CombatAttacker = {
    x: 100,
    y: 100,
    comboStep: 1,
    side: 'right',
  };

  it('detects defenders within range and attack angle', () => {
    const weapon = COMPOUND_WEAPONS.木刀; // range ~105, damage 8
    const defenders: CombatDefender[] = [
      { id: 'enemy-1', x: 150, y: 100, hp: 50, maxHp: 50 }, // in front, within range
      { id: 'enemy-behind', x: 50, y: 100, hp: 50, maxHp: 50 }, // behind attacker
      { id: 'enemy-far', x: 300, y: 100, hp: 50, maxHp: 50 }, // too far
    ];

    const result = CombatEngine.resolveMeleeAttack(defaultAttacker, weapon, defenders);
    expect(result.hitCount).toBe(1);
    expect(result.hits[0].targetId).toBe('enemy-1');
    expect(result.hits[0].damage).toBe(8);
  });

  it('applies combo multipliers and heavy camera shake on combo step 3', () => {
    const weapon = COMPOUND_WEAPONS.木刀; // base damage 8
    const defender: CombatDefender = { id: 'target', x: 140, y: 100, hp: 100, maxHp: 100 };

    const step1 = CombatEngine.resolveMeleeAttack({ ...defaultAttacker, comboStep: 1 }, weapon, [defender]);
    const step2 = CombatEngine.resolveMeleeAttack({ ...defaultAttacker, comboStep: 2 }, weapon, [defender]);
    const step3 = CombatEngine.resolveMeleeAttack({ ...defaultAttacker, comboStep: 3 }, weapon, [defender]);

    expect(step1.hits[0].damage).toBe(8);
    expect(step2.hits[0].damage).toBe(10); // 8 * 1.2 = 9.6 => 10
    expect(step3.hits[0].damage).toBe(13); // 8 * 1.6 = 12.8 => 13

    expect(step1.cameraShake?.intensity).toBe(0.002);
    expect(step3.cameraShake?.intensity).toBe(0.005);
    expect(step3.cameraShake?.duration).toBe(90);
  });

  it('triggers burn damage and visual event for fire element weapon', () => {
    const fireBlade = COMPOUND_WEAPONS.炎刀; // fire element, damage 24
    const defender: CombatDefender = { id: 'target', x: 140, y: 100, hp: 100, maxHp: 100 };

    const result = CombatEngine.resolveMeleeAttack(defaultAttacker, fireBlade, [defender]);
    expect(result.hits[0].burnExtraDamage).toBeGreaterThan(0);
    expect(result.visualEvents.some((e) => e.type === 'fireBurst')).toBe(true);
  });

  it('triggers instant kill when enemy HP ratio is below execute threshold', () => {
    const spear = COMPOUND_WEAPONS.破阵枪; // has instantKill trait
    const weakenedDefender: CombatDefender = { id: 'low-hp', x: 150, y: 100, hp: 10, maxHp: 100 }; // 10% <= 15% threshold

    const result = CombatEngine.resolveMeleeAttack(defaultAttacker, spear, [weakenedDefender]);
    expect(result.hits[0].isInstantKill).toBe(true);
    expect(result.hits[0].damage).toBe(10); // executes remaining HP
    expect(result.visualEvents.some((e) => e.type === 'instantKillExecute')).toBe(true);
  });

  it('calculates life steal correctly on hit', () => {
    const lifeSpear = COMPOUND_WEAPONS.灵木枪; // has lifeSteal trait (10%)
    const defender: CombatDefender = { id: 'target', x: 150, y: 100, hp: 100, maxHp: 100 };

    const result = CombatEngine.resolveMeleeAttack(defaultAttacker, lifeSpear, [defender]);
    expect(result.hits[0].lifeStealAmount).toBeGreaterThanOrEqual(1);
    expect(result.totalLifeSteal).toBe(result.hits[0].lifeStealAmount);
  });

  it('supports distinct combo steps and multipliers for different weapon shapes', () => {
    const axe = COMPOUND_WEAPONS.开山斧; // shape 斧, 2 steps
    expect(axe.shape).toBe('斧');
    const axeDefender: CombatDefender = { id: 'target', x: 140, y: 100, hp: 300, maxHp: 300 };
    const axeStep1 = CombatEngine.resolveMeleeAttack({ ...defaultAttacker, comboStep: 1 }, axe, [axeDefender]);
    const axeStep2 = CombatEngine.resolveMeleeAttack({ ...defaultAttacker, comboStep: 2 }, axe, [axeDefender]);
    expect(axeStep1.hits[0].damage).toBe(Math.round(axe.stats.damage * 2.0));
    expect(axeStep2.hits[0].damage).toBe(Math.round(axe.stats.damage * 2.85));

    const sword = COMPOUND_WEAPONS.青钢剑; // shape 剑, 5 steps
    expect(sword.shape).toBe('剑');
    const swordDefender: CombatDefender = { id: 'target', x: 140, y: 100, hp: 300, maxHp: 300 };
    const swordStep5 = CombatEngine.resolveMeleeAttack({ ...defaultAttacker, comboStep: 5 }, sword, [swordDefender]);
    expect(swordStep5.hits[0].damage).toBe(Math.round(sword.stats.damage * 1.85));
    expect(swordStep5.cameraShake?.duration).toBe(90); // Finisher camera shake
  });

  it('extends attack range and emits swordBeamRelease visual event when swordBeam trait is equipped', () => {
    const woodKnife = COMPOUND_WEAPONS.木刀; // range: 68, no swordBeam
    const sword = COMPOUND_WEAPONS.青钢剑; // range: 110, has swordBeam (+45 extraRange)

    // Target is at distance 85 (x=185 vs attacker x=100)
    // WoodKnife range on step 1 is ~72.5px, cannot reach 85px
    const midRangeDefender: CombatDefender = { id: 'mid-dist', x: 185, y: 100, hp: 50, maxHp: 50 };

    const woodResult = CombatEngine.resolveMeleeAttack(defaultAttacker, woodKnife, [midRangeDefender]);
    expect(woodResult.hitCount).toBe(0);
    expect(woodResult.visualEvents.some((e) => e.type === 'swordBeamRelease')).toBe(false);

    // Sword has swordBeam, range easily reaches 85px
    const swordResult = CombatEngine.resolveMeleeAttack(defaultAttacker, sword, [midRangeDefender]);
    expect(swordResult.hitCount).toBe(1);
    expect(swordResult.hits[0].targetId).toBe('mid-dist');
    expect(swordResult.visualEvents.some((e) => e.type === 'swordBeamRelease')).toBe(true);
  });
});
