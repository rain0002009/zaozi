import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterMotion } from '../src/entities/CharacterMotion.ts';
import { KNIFE_COMBO } from '../src/combat/WeaponCombo.ts';

const attackInput = (name, actionElapsedMs, timings, overrides = {}) => ({
  elapsedMs: 16,
  displacement: { x: 0, y: 0 },
  facing: 'right',
  paused: false,
  action: {
    type: 'attack',
    name,
    actionElapsedMs,
    ...timings,
  },
  ...overrides,
});

const motionTimings = ({ activeAt, chainAt, duration }) => ({
  activeAtMs: activeAt,
  chainAtMs: chainAt,
  durationMs: duration,
});
const [firstAttack, secondAttack, thirdAttack] = KNIFE_COMBO.attacks.map(motionTimings);

test('knife combo definitions expose gameplay values, timings, and motion names without rig poses', () => {
  const allowedFields = [
    'activeAt', 'arcDegrees', 'chainAt', 'damage', 'duration', 'knockback',
    'lungeDistance', 'lungeDuration', 'motionName', 'movementMultiplier', 'range',
  ];

  KNIFE_COMBO.attacks.forEach((attack) => {
    assert.deepEqual(Object.keys(attack).sort(), allowedFields.sort());
  });
});

test('the first knife attack sinks behind a planted front foot and drives from the rear leg', () => {
  const motion = new CharacterMotion();
  const windup = motion.advance(attackInput('knife-downward-slash', 69, firstAttack));
  const strike = motion.advance(attackInput('knife-downward-slash', 143, firstAttack));

  assert.equal(windup.action, 'knife-downward-slash');
  assert.equal(windup.supportFoot, 'front');
  assert.equal(windup.feet.front.planted, true);
  assert.equal(strike.supportFoot, 'front');
  assert.equal(strike.feet.front.planted, true);
  assert.ok(strike.bodyY > windup.bodyY + 3, 'the strike should visibly sink through both knees');
  assert.ok(strike.feet.rear.sole.x > windup.feet.rear.sole.x + 5, 'the rear foot should drive forward');
  assert.ok(strike.torsoAngle > windup.torsoAngle + 10, 'the torso should join the diagonal cut');
  assert.ok(strike.forearmAngle > windup.forearmAngle + 80, 'the weapon arm should complete the cut');
});

test('the second knife attack flows into rear-foot support while unloading the front foot', () => {
  const motion = new CharacterMotion();
  const firstRecovery = motion.advance(attackInput('knife-downward-slash', 260, firstAttack));
  const secondEntry = motion.advance(attackInput('knife-rising-cut', 0, secondAttack));
  const secondWindup = motion.advance(attackInput('knife-rising-cut', 61, secondAttack));
  const secondStrike = motion.advance(attackInput('knife-rising-cut', 127, secondAttack));

  assert.equal(secondEntry.bodyX, firstRecovery.bodyX, 'the next attack should start from the current pose');
  assert.equal(secondEntry.bodyY, firstRecovery.bodyY, 'the combo should not jump through neutral');
  assert.equal(secondStrike.action, 'knife-rising-cut');
  assert.equal(secondWindup.supportFoot, 'rear');
  assert.equal(secondStrike.supportFoot, 'rear');
  assert.equal(secondStrike.feet.rear.planted, true);
  assert.ok(secondStrike.feet.front.lift > 2, 'the front foot should visibly unload');
  assert.ok(secondStrike.bodyX < secondWindup.bodyX - 3, 'the centre of mass should transfer rearward');
  assert.ok(secondStrike.torsoAngle < secondWindup.torsoAngle - 8, 'the torso should reverse into the rising cut');
});

test('the third knife attack pushes from the rear foot and lands the front foot with the lunge', () => {
  const motion = new CharacterMotion();
  motion.advance(attackInput('knife-rising-cut', 230, secondAttack));
  const thirdEntry = motion.advance(attackInput('knife-finisher-lunge', 0, thirdAttack));
  const thirdWindup = motion.advance(attackInput('knife-finisher-lunge', 95, thirdAttack));
  const thirdStrike = motion.advance(attackInput('knife-finisher-lunge', 198, thirdAttack));
  const thirdRecovery = motion.advance(attackInput('knife-finisher-lunge', 360, thirdAttack));

  assert.equal(thirdEntry.bodyX, -2, 'the finisher should continue from the second recovery');
  assert.equal(thirdWindup.supportFoot, 'rear');
  assert.equal(thirdWindup.feet.rear.planted, true);
  assert.equal(thirdStrike.supportFoot, 'front');
  assert.equal(thirdStrike.feet.front.planted, true);
  assert.ok(thirdStrike.feet.front.sole.x > thirdWindup.feet.front.sole.x + 15, 'the front foot should step with the lunge');
  assert.ok(thirdStrike.bodyX > thirdWindup.bodyX + 8, 'the centre of mass should follow the finishing step');
  assert.ok(thirdRecovery.feet.front.sole.x < thirdStrike.feet.front.sole.x, 'the front foot should recover after landing');
});

test('attack movement keeps the action stance without replaying the locomotion cycle', () => {
  const motion = new CharacterMotion();
  const walking = motion.advance({
    elapsedMs: 100,
    displacement: { x: 22, y: 0 },
    facing: 'right',
    paused: false,
  });
  const attacking = motion.advance(attackInput(
    'knife-downward-slash',
    143,
    firstAttack,
    { displacement: { x: 6, y: 0 } },
  ));

  assert.equal(attacking.phase, walking.phase, 'attack movement must not advance the locomotion phase');
  assert.equal(attacking.action, 'knife-downward-slash');
  assert.equal(attacking.feet.front.planted, true);
  assert.ok(attacking.bodyY > 4, 'limited movement should retain the attack lower-body pose');
});

test('limited attack movement stays behind a planted support foot', () => {
  const motion = new CharacterMotion();
  const planted = motion.advance(attackInput('knife-downward-slash', 69, firstAttack));
  let playerX = 0;
  const plantedWorldX = playerX + planted.feet.front.sole.x;

  for (const actionElapsedMs of [85, 101, 117, 133]) {
    playerX += 3;
    const pose = motion.advance(attackInput(
      'knife-downward-slash',
      actionElapsedMs,
      firstAttack,
      { displacement: { x: 3, y: 0 } },
    ));
    assert.equal(pose.supportFoot, 'front');
    assert.ok(
      Math.abs(playerX + pose.feet.front.sole.x - plantedWorldX) <= 1.5,
      'the front support sole should absorb player movement instead of sliding across the ground',
    );
  }
});
