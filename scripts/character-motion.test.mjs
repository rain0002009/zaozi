import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterMotion } from '../src/entities/CharacterMotion.ts';

const input = (x, y, overrides = {}) => ({
  elapsedMs: 50,
  displacement: { x, y },
  facing: 'right',
  paused: false,
  ...overrides,
});

test('gait phase advances from actual travel and freezes when blocked or paused', () => {
  const motion = new CharacterMotion();
  const initial = motion.advance(input(0, 0));
  const travelled = motion.advance(input(27.5, 0));
  assert.equal(Number((travelled.phase - initial.phase).toFixed(3)), 0.25);

  const blocked = motion.advance(input(0, 0));
  assert.equal(blocked.phase, travelled.phase);

  const paused = motion.advance(input(40, 0, { paused: true }));
  assert.equal(paused.phase, travelled.phase);
});

test('the supporting sole stays planted while the body travels', () => {
  const motion = new CharacterMotion();
  let rootX = 0;
  const plantedWorldX = [];
  for (let step = 0; step < 8; step += 1) {
    rootX += 2;
    const pose = motion.advance(input(2, 0, { elapsedMs: 10 }));
    assert.equal(pose.supportFoot, 'front');
    assert.equal(pose.feet.front.planted, true);
    plantedWorldX.push(rootX + pose.feet.front.sole.x);
  }
  assert.ok(Math.max(...plantedWorldX) - Math.min(...plantedWorldX) <= 1.5);
});

test('gait distinguishes forward, backward and sidestep travel while blending diagonals', () => {
  const forward = new CharacterMotion().advance(input(12, 0));
  const backward = new CharacterMotion().advance(input(-12, 0));
  const sidestep = new CharacterMotion().advance(input(0, 12));
  const diagonal = new CharacterMotion().advance(input(12, 12));

  assert.equal(forward.travel, 'forward');
  assert.equal(backward.travel, 'backward');
  assert.equal(sidestep.travel, 'sidestep');
  assert.equal(diagonal.travel, 'diagonal');
  assert.ok(diagonal.stride.x > sidestep.stride.x && diagonal.stride.y > 0);
  assert.ok(Math.abs(sidestep.stride.x) < 1.5);
});

test('forward, backward and sidestep gait cover contact, down, passing and lift phases', () => {
  const travels = [
    ['forward', 14, 0],
    ['backward', -14, 0],
    ['sidestep', 0, 14],
  ];
  for (const [kind, x, y] of travels) {
    const motion = new CharacterMotion();
    const samples = Array.from({ length: 4 }, () => motion.advance(input(x, y, { elapsedMs: 30 })));
    assert.ok(samples.every((sample) => sample.travel === kind), `${kind} classification should persist`);
    assert.ok(new Set(samples.map((sample) => sample.supportFoot)).size === 2, `${kind} should transfer support`);
    assert.ok(samples.some((sample) => sample.feet.front.lift > 0), `${kind} should lift the front foot`);
    assert.ok(samples.some((sample) => sample.feet.rear.lift > 0), `${kind} should lift the rear foot`);
  }
});

test('starting and stopping blend through a stable support over about one tenth of a second', () => {
  const motion = new CharacterMotion();
  const start = motion.advance(input(4, 0, { elapsedMs: 20 }));
  assert.ok(start.activity > 0 && start.activity < 0.35);
  const full = motion.advance(input(20, 0, { elapsedMs: 100 }));
  assert.ok(full.activity > 0.95);
  const settling = motion.advance(input(0, 0, { elapsedMs: 60 }));
  assert.ok(settling.activity > 0 && settling.activity < full.activity);
  const stopped = motion.advance(input(0, 0, { elapsedMs: 70 }));
  assert.ok(stopped.activity < 0.05);
  assert.ok(Math.abs(stopped.feet.front.sole.x - 10) < 0.1);
  assert.ok(Math.abs(stopped.feet.rear.sole.x - 2) < 0.1);
});

test('restarting from rest does not snap the swing foot back to an old phase', () => {
  const motion = new CharacterMotion();
  motion.advance(input(81.4, 0, { elapsedMs: 110 }));
  const stopped = motion.advance(input(0, 0, { elapsedMs: 110 }));
  const restarted = motion.advance(input(1.6, 0, { elapsedMs: 16 }));
  for (const foot of ['front', 'rear']) {
    const jump = Math.hypot(
      restarted.feet[foot].sole.x - stopped.feet[foot].sole.x,
      restarted.feet[foot].sole.y - stopped.feet[foot].sole.y,
    );
    assert.ok(jump <= 2, `${foot} foot should ease out of rest; got a ${jump.toFixed(2)}px jump`);
  }
});

test('resuming before the stop blend finishes keeps both feet continuous', () => {
  const motion = new CharacterMotion();
  motion.advance(input(27.5, 0, { elapsedMs: 110 }));
  const settling = motion.advance(input(0, 0, { elapsedMs: 50 }));
  const resumed = motion.advance(input(1.6, 0, { elapsedMs: 16 }));
  for (const foot of ['front', 'rear']) {
    const worldJump = Math.hypot(
      resumed.feet[foot].sole.x + 1.6 - settling.feet[foot].sole.x,
      resumed.feet[foot].sole.y - settling.feet[foot].sole.y,
    );
    assert.ok(worldJump <= 2, `${foot} foot should resume continuously; got a ${worldJump.toFixed(2)}px jump`);
  }
});

test('direction changes preserve support and phase while blending for about 100ms', () => {
  const motion = new CharacterMotion();
  const forward = motion.advance(input(8, 0, { elapsedMs: 100 }));
  const turning = motion.advance(input(0, 4, { elapsedMs: 20 }));
  assert.equal(turning.supportFoot, forward.supportFoot);
  assert.ok(turning.phase > forward.phase);
  assert.ok(turning.stride.x > 0 && turning.stride.y > 0);

  const sideways = motion.advance(input(0, 4, { elapsedMs: 100 }));
  assert.equal(sideways.supportFoot, forward.supportFoot);
  assert.ok(Math.abs(sideways.stride.x) < 0.1);
  assert.ok(sideways.stride.y > 0);
});

test('direction blending reaches its new heading within 100ms', () => {
  const motion = new CharacterMotion();
  motion.advance(input(8, 0, { elapsedMs: 100 }));

  let pose;
  for (let elapsed = 0; elapsed < 100; elapsed += 20) {
    pose = motion.advance(input(0, 2, { elapsedMs: 20 }));
  }

  assert.ok(Math.abs(pose.stride.x) < 0.01, `old heading remained in stride.x: ${pose.stride.x}`);
  assert.ok(pose.stride.y > 7.9);
});

test('reversing direction keeps a usable heading throughout the blend', () => {
  const motion = new CharacterMotion();
  motion.advance(input(8, 0, { elapsedMs: 100 }));

  const halfway = motion.advance(input(-5, 0, { elapsedMs: 50 }));
  assert.ok(Math.hypot(halfway.stride.x / 16, halfway.stride.y / 8) > 0.9);

  const reversed = motion.advance(input(-5, 0, { elapsedMs: 50 }));
  assert.ok(reversed.stride.x < -15.9);
});
