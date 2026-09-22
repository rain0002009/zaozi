import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_RIDDLES,
  getRandomRiddle,
  createRiddleSession,
  unlockNextHint,
  abandonRiddle,
} from '../src/state/RiddleState.ts';

test('CHARACTER_RIDDLES has at least 8 curated riddles with complete fields', () => {
  assert.ok(CHARACTER_RIDDLES.length >= 8, 'should have at least 8 riddles');
  for (const r of CHARACTER_RIDDLES) {
    assert.ok(r.id, 'riddle must have an id');
    assert.ok(r.clue, 'riddle must have a clue');
    assert.ok(r.targetWord, 'riddle must have a targetWord');
    assert.ok(r.hint1, 'riddle must have hint1 (structural)');
    assert.ok(r.hint2, 'riddle must have hint2 (semantic)');
  }
});

test('getRandomRiddle returns a valid riddle from the bank', () => {
  const riddle = getRandomRiddle(() => 0);
  assert.equal(riddle.id, CHARACTER_RIDDLES[0].id);
});

test('unlockNextHint unlocks hint 1 and hint 2 sequentially by deducting 1 carried stroke', () => {
  const riddle = CHARACTER_RIDDLES[0];
  const session = createRiddleSession(riddle);
  const carried = { '一': 2, '丨': 0, '丿': 1, '㇏': 0, '丶': 0, '㇇': 0 };

  // Unlock hint 1
  const res1 = unlockNextHint(session, carried);
  assert.equal(res1.success, true);
  assert.equal(session.unlockedHints, 1);
  assert.ok(res1.consumedStroke);
  assert.equal(carried['一'] + carried['丨'] + carried['丿'] + carried['㇏'] + carried['丶'] + carried['㇇'], 2);

  // Unlock hint 2
  const res2 = unlockNextHint(session, carried);
  assert.equal(res2.success, true);
  assert.equal(session.unlockedHints, 2);
  assert.equal(carried['一'] + carried['丨'] + carried['丿'] + carried['㇏'] + carried['丶'] + carried['㇇'], 1);

  // Attempt to unlock hint 3 (exceeds max)
  const res3 = unlockNextHint(session, carried);
  assert.equal(res3.success, false);
  assert.match(res3.reason || '', /所有线索已揭示/);
});

test('unlockNextHint fails when player has 0 carried strokes', () => {
  const riddle = CHARACTER_RIDDLES[0];
  const session = createRiddleSession(riddle);
  const emptyCarried = { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 };

  const res = unlockNextHint(session, emptyCarried);
  assert.equal(res.success, false);
  assert.match(res.reason || '', /笔画不足/);
  assert.equal(session.unlockedHints, 0);
});

test('abandonRiddle resets active secret route without penalizing player hp or strokes', () => {
  const expedition = {
    area: 1,
    hp: 80,
    maxHp: 100,
    carried: { '一': 3, '丨': 1, '丿': 2, '㇏': 0, '丶': 0, '㇇': 0 },
    route: 'secret_riddle',
  };

  abandonRiddle(expedition);
  assert.equal(expedition.route, undefined);
  assert.equal(expedition.hp, 80);
  assert.equal(expedition.carried['一'], 3);
});
