import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeutralRigPose,
  measureNeutralFootSoleErrors,
  measureRigConnections,
  RIG_JOINTS,
  RIG_PARTS,
  RIG_TEXTURE_KEYS,
} from '../src/entities/CharacterRig.ts';

test('the neutral character rig exposes the complete segmented body', () => {
  assert.deepEqual(RIG_PARTS.map((part) => part.name), [
    'rearThigh', 'rearShin', 'rearFoot', 'rearArm', 'torso', 'head',
    'frontThigh', 'frontShin', 'frontFoot', 'garmentHem',
    'weaponUpperArm', 'weaponForearm', 'knife', 'weaponHand',
  ]);
  assert.equal(RIG_PARTS.length, 14);
  assert.equal(new Set(RIG_TEXTURE_KEYS).size, 14);
  assert.deepEqual(RIG_PARTS.map((part) => part.layer), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]);
  assert.deepEqual(RIG_JOINTS.root, { x: 128, y: 164 });
  assert.deepEqual(RIG_JOINTS.weaponGrip, { x: 126, y: 138 });

  const pose = createNeutralRigPose();
  for (const part of RIG_PARTS) {
    assert.ok(pose[part.name], `${part.name} needs a neutral pose`);
    assert.equal(typeof pose[part.name].x, 'number');
    assert.equal(typeof pose[part.name].y, 'number');
    assert.equal(typeof pose[part.name].rotation, 'number');
  }
  assert.deepEqual(pose.rearThigh, { x: -4, y: -29, rotation: 0 });
  assert.deepEqual(pose.frontFoot, { x: 4, y: 44, rotation: 0 });
  for (const [name, error] of Object.entries(measureRigConnections(pose))) {
    assert.ok(error < 1, `${name} connection error should be below one logical pixel; got ${error}`);
  }
  for (const [name, error] of Object.entries(measureNeutralFootSoleErrors(pose))) {
    assert.ok(error < 1, `${name} placement error should be below one logical pixel; got ${error}`);
  }
});
