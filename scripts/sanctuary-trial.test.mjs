import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimSafeSanctuaryReward,
  resolveTrialVictory,
  handleTrialFatalDamage,
} from '../src/state/RiddleState.ts';

test('claimSafeSanctuaryReward deposits standard high reward and advances area', () => {
  const expedition = {
    area: 1,
    hp: 80,
    maxHp: 100,
    carried: { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 },
    route: 'secret_riddle',
  };
  const meta = {
    inventory: { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 },
    wordInventory: {},
    unlockedWords: [],
    equippedWords: [],
    unlockedWeapons: ['木刀'],
    equippedWeapon: '木刀',
    recipeBook: [],
    victories: 0,
  };

  const reward = claimSafeSanctuaryReward(expedition, meta);
  assert.ok(reward.strokes);
  assert.ok(reward.weapon);

  // Assert carried strokes were received
  const totalCarried = Object.values(expedition.carried).reduce((a, b) => a + b, 0);
  assert.ok(totalCarried >= 6, 'should receive at least 6 carried strokes');

  // Assert weapon was unlocked
  assert.ok(meta.unlockedWeapons.includes(reward.weapon));

  // Assert area progressed and secret route cleared
  assert.equal(expedition.area, 2);
  assert.equal(expedition.route, undefined);
  assert.equal(expedition.hp, 80); // No HP lost
});

test('resolveTrialVictory deposits doubled top-tier reward and advances area', () => {
  const expedition = {
    area: 2,
    hp: 50,
    maxHp: 100,
    carried: { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 },
    route: 'secret_riddle',
  };
  const meta = {
    inventory: { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 },
    wordInventory: {},
    unlockedWords: [],
    equippedWords: [],
    unlockedWeapons: ['木刀'],
    equippedWeapon: '木刀',
    recipeBook: [],
    victories: 0,
  };

  const reward = resolveTrialVictory(expedition, meta);
  assert.ok(reward.strokes);
  assert.ok(reward.weapon);

  // Assert doubled carried strokes
  const totalCarried = Object.values(expedition.carried).reduce((a, b) => a + b, 0);
  assert.ok(totalCarried >= 12, 'should receive at least 12 carried strokes for double reward');

  // Assert top tier weapon was unlocked
  assert.ok(meta.unlockedWeapons.includes(reward.weapon));

  // Assert area progressed
  assert.equal(expedition.area, 3);
  assert.equal(expedition.route, undefined);
});

test('handleTrialFatalDamage clamps HP to 1 and preserves expedition continuity', () => {
  const expedition = {
    area: 1,
    hp: 0,
    maxHp: 100,
    carried: { '一': 4, '丨': 2, '丿': 3, '㇏': 1, '丶': 2, '㇇': 2 },
    route: 'secret_riddle',
  };

  const result = handleTrialFatalDamage(expedition);
  assert.equal(result.survived, true);
  assert.equal(result.finalHp, 1);
  assert.equal(expedition.hp, 1);

  // Carried strokes should not be wiped out by cheat-death protection
  assert.equal(expedition.carried['一'], 4);

  // Area progresses and route clears
  assert.equal(expedition.area, 2);
  assert.equal(expedition.route, undefined);
});
