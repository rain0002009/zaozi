import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_RIDDLES,
  createRiddleSession,
  verifyAndUnlockGate,
} from '../src/state/RiddleState.ts';

test('verifyAndUnlockGate rejects mismatched character with zero deduction', () => {
  const riddle = CHARACTER_RIDDLES.find((r) => r.targetWord === '告');
  const session = createRiddleSession(riddle);
  const carried = { '一': 5, '丨': 5, '丿': 5, '㇏': 5, '丶': 5, '㇇': 5 };

  const result = verifyAndUnlockGate(session, '木', carried);
  assert.equal(result.success, false);
  assert.equal(result.reason, '碑文无应，此字非钥');
  assert.equal(session.isUnlocked, false);

  // Assert carried strokes are completely untouched
  assert.deepEqual(carried, { '一': 5, '丨': 5, '丿': 5, '㇏': 5, '丶': 5, '㇇': 5 });
});

test('verifyAndUnlockGate rejects matching character when carried strokes are insufficient', () => {
  const riddle = CHARACTER_RIDDLES.find((r) => r.targetWord === '告');
  const session = createRiddleSession(riddle);
  // '告' needs { '丿': 1, '一': 3, '丨': 2, '㇇': 1 }
  // Provide insufficient strokes (e.g. 0 of '一')
  const carried = { '一': 0, '丨': 5, '丿': 5, '㇏': 5, '丶': 5, '㇇': 5 };

  const result = verifyAndUnlockGate(session, '告', carried);
  assert.equal(result.success, false);
  assert.match(result.reason || '', /携带笔画不足/);
  assert.equal(session.isUnlocked, false);

  // Assert carried strokes are untouched
  assert.equal(carried['一'], 0);
  assert.equal(carried['丨'], 5);
});

test('verifyAndUnlockGate unlocks gate and deducts exact recipe strokes when matching and sufficient', () => {
  const riddle = CHARACTER_RIDDLES.find((r) => r.targetWord === '告');
  const session = createRiddleSession(riddle);
  const carried = { '一': 4, '丨': 3, '丿': 2, '㇏': 1, '丶': 1, '㇇': 2 };

  const result = verifyAndUnlockGate(session, '告', carried);
  assert.equal(result.success, true);
  assert.equal(session.isUnlocked, true);
  assert.ok(result.consumedStrokes);

  // Recipe for '告': { '丿': 1, '一': 3, '丨': 2, '㇇': 1 }
  // Carried should be reduced by exactly that
  assert.equal(carried['一'], 1); // 4 - 3
  assert.equal(carried['丨'], 1); // 3 - 2
  assert.equal(carried['丿'], 1); // 2 - 1
  assert.equal(carried['㇇'], 1); // 2 - 1
  assert.equal(carried['㇏'], 1); // unchanged
  assert.equal(carried['丶'], 1); // unchanged
});
