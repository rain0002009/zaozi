import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, generateRouteOptions } from '../src/state/RouteState.ts';

test('ROUTES configuration includes valid secret_riddle definition', () => {
  assert.ok(ROUTES.secret_riddle, 'secret_riddle should be defined in ROUTES');
  assert.equal(ROUTES.secret_riddle.id, 'secret_riddle');
  assert.equal(ROUTES.secret_riddle.title, '字谜秘境');
  assert.equal(ROUTES.secret_riddle.subtitle, '古碑解谜');
  assert.equal(ROUTES.secret_riddle.danger, '造化');
  assert.equal(ROUTES.secret_riddle.accent, 0xd4af37);
  assert.ok(ROUTES.secret_riddle.lootMultiplier >= 2.0, 'loot multiplier should reflect high reward');
});

test('generateRouteOptions produces standard routes when random roll is above threshold', () => {
  const routesArea1 = generateRouteOptions(1, () => 0.5);
  assert.deepEqual(routesArea1, ['wilds', 'ruins']);

  const routesArea2 = generateRouteOptions(2, () => 0.5);
  assert.deepEqual(routesArea2, ['ember', 'rift']);
});

test('generateRouteOptions appends secret_riddle route when random roll triggers (<= 0.20)', () => {
  const routesArea1 = generateRouteOptions(1, () => 0.15);
  assert.deepEqual(routesArea1, ['wilds', 'ruins', 'secret_riddle']);

  const routesArea2 = generateRouteOptions(2, () => 0.20);
  assert.deepEqual(routesArea2, ['ember', 'rift', 'secret_riddle']);
});

test('generateRouteOptions always returns boss route for area 3 regardless of roll', () => {
  const routesBossHighRoll = generateRouteOptions(3, () => 0.05);
  assert.deepEqual(routesBossHighRoll, ['boss']);

  const routesBossNormal = generateRouteOptions(3, () => 0.9);
  assert.deepEqual(routesBossNormal, ['boss']);
});
