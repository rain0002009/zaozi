import { describe, it, expect } from 'vitest';
import {
  CHARACTER_RIDDLES,
  createRiddleSession,
  verifyAndUnlockGate,
  unlockNextHint,
  Inventory,
} from './RiddleState';

function createCarried(init: Partial<Inventory> = {}): Inventory {
  return { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0, ...init };
}

describe('RiddleState Domain Module', () => {
  const gaoRiddle = CHARACTER_RIDDLES.find((r) => r.id === 'riddle-gao')!;

  it('initializes a valid session with 0 unlocked hints', () => {
    const session = createRiddleSession(gaoRiddle);
    expect(session.riddle.targetWord).toBe('告');
    expect(session.unlockedHints).toBe(0);
    expect(session.isUnlocked).toBe(false);
  });

  it('rejects gate unlocking if submitted word is incorrect', () => {
    const session = createRiddleSession(gaoRiddle);
    const carried = createCarried({ '一': 5, '丨': 5, '丿': 5, '㇇': 5 });
    const res = verifyAndUnlockGate(session, '牛', carried);
    expect(res.success).toBe(false);
    expect(res.reason).toContain('碑文无应');
    expect(session.isUnlocked).toBe(false);
  });

  it('rejects gate unlocking when carried strokes are insufficient', () => {
    const session = createRiddleSession(gaoRiddle);
    const carried = createCarried({ '一': 1 }); // lacks others
    const res = verifyAndUnlockGate(session, '告', carried);
    expect(res.success).toBe(false);
    expect(res.reason).toContain('携带笔画不足');
    expect(session.isUnlocked).toBe(false);
  });

  it('unlocks gate and exact recipe strokes are deducted upon success', () => {
    const session = createRiddleSession(gaoRiddle);
    // recipe: { '丿': 1, '一': 3, '丨': 2, '㇇': 1 }
    const carried = createCarried({ '丿': 2, '一': 5, '丨': 4, '㇇': 3 });
    const res = verifyAndUnlockGate(session, '告', carried);
    expect(res.success).toBe(true);
    expect(session.isUnlocked).toBe(true);
    expect(carried['丿']).toBe(1);
    expect(carried['一']).toBe(2);
    expect(carried['丨']).toBe(2);
    expect(carried['㇇']).toBe(2);
  });

  it('unlocks hints by consuming one carried stroke with highest count', () => {
    const session = createRiddleSession(gaoRiddle);
    const carried = createCarried({ '一': 3, '丨': 1 });
    const res = unlockNextHint(session, carried);
    expect(res.success).toBe(true);
    expect(res.consumedStroke).toBe('一');
    expect(session.unlockedHints).toBe(1);
    expect(carried['一']).toBe(2);
  });
});
