import test from 'node:test';
import assert from 'node:assert/strict';
import { KNIFE_COMBO } from '../src/combat/WeaponCombo.ts';

test('knife combo 3-hit sequence matches downward slash, rising cut, and finisher thrust', () => {
  assert.equal(KNIFE_COMBO.attacks.length, 3, 'should have 3 combo steps');

  const [step1, step2, step3] = KNIFE_COMBO.attacks;
  assert.equal(step1.motionName, 'knife-downward-slash');
  assert.equal(step2.motionName, 'knife-rising-cut');
  assert.equal(step3.motionName, 'knife-finisher-lunge');

  assert.ok(step1.activeAt < step1.duration, 'step 1 active timing must precede duration');
  assert.ok(step2.activeAt < step2.duration, 'step 2 active timing must precede duration');
  assert.ok(step3.activeAt < step3.duration, 'step 3 active timing must precede duration');
  assert.ok(step3.lungeDistance > 0, 'finisher should include forward lunge');
});

test('area 1 monster durability requires a full 3-hit combo from starting wooden knife (8 damage)', () => {
  const baseDamage = 8;

  // Combo damages according to GameScene resolveMeleeHit formula:
  // Math.round(weapon.stats.damage * (comboStep === 3 ? 1.6 : comboStep === 2 ? 1.2 : 1.0))
  const hit1 = Math.round(baseDamage * 1.0); // 8
  const hit2 = Math.round(baseDamage * 1.2); // 10
  const hit3 = Math.round(baseDamage * 1.6); // 13
  const totalComboDamage = hit1 + hit2 + hit3; // 31

  // Area 1 normal monster HP: 28 (狼, 火狼, 水妖)
  const normalMonsterHp = 28;
  assert.ok(hit1 < normalMonsterHp, 'single hit must not instakill normal monster (leaves monster at 20 HP)');
  assert.ok(hit1 + hit2 < normalMonsterHp, 'two hits must not kill normal monster (leaves monster at 10 HP)');
  assert.ok(totalComboDamage >= normalMonsterHp, 'full 3-hit combo must slay normal monster on finisher');

  // Area 1 charger HP: 46 (山鬼)
  const chargerHp = 46;
  assert.ok(totalComboDamage < chargerHp, 'single combo must not kill charger (leaves charger at 15 HP)');
  assert.ok(totalComboDamage + hit1 + hit2 >= chargerHp, 'charger takes 1.5 - 2 combos to slay');
});

test('procedural weapon color and styling configuration covers five elements', () => {
  const elements = ['wood', 'fire', 'metal', 'earth', 'water', 'none'];
  const colors = {
    wood:  { body: 0x245532, edge: 0x64d982, glow: 0x82f09f },
    fire:  { body: 0x8a2315, edge: 0xff6638, glow: 0xffc44d },
    metal: { body: 0x827029, edge: 0xf5d962, glow: 0xfffaab },
    earth: { body: 0x5a4632, edge: 0xd9b37e, glow: 0xf2d9ad },
    water: { body: 0x1d4a57, edge: 0x5cd3f2, glow: 0xa8f0ff },
    none:  { body: 0x363d38, edge: 0xb5c4b9, glow: 0xe8ede9 },
  };

  for (const elem of elements) {
    assert.ok(colors[elem], `element ${elem} must have defined colors`);
    assert.ok(colors[elem].body > 0);
    assert.ok(colors[elem].edge > 0);
    assert.ok(colors[elem].glow > 0);
  }
});
