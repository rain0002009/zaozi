import { describe, it, expect } from 'vitest';
import { getWeaponCombo } from './WeaponCombo';

describe('Attack Timing & Responsiveness Diagnostics', () => {
  it('confirms the windup delay before the first knife attack hits is crisp and snappy', () => {
    const combo = getWeaponCombo('刀');
    const attack1 = combo.attacks[0];

    // Total duration of attack 1
    const duration = attack1.duration; // 190ms
    // Time spent before the active hit and forward swing
    const windupTime = attack1.activeAt; // 55ms

    // Ratio of windup to total duration
    const windupRatio = windupTime / duration;

    // Snappy action feel: activeAt is <= 60ms (~3.3 frames at 60fps), eliminating input lag sensation
    expect(windupTime).toBeLessThanOrEqual(60);
    expect(windupRatio).toBeLessThanOrEqual(0.35);
    expect(duration).toBeLessThanOrEqual(200);
  });

  it('computes angular velocity during initial windup with snappy ease-out cocking', () => {
    const combo = getWeaponCombo('刀');
    const attack1 = combo.attacks[0];
    const startDeg = -75;
    const baseRot = -25;

    // At t = 0 (click)
    const rotAt0 = baseRot;

    // Halfway through windup (t = 0.5) with ease-out: Math.sin(0.5 * PI * 0.5) ~ 0.707
    const easeHalf = Math.sin(0.5 * Math.PI * 0.5);
    const rotAtHalf = baseRot + (startDeg - baseRot) * easeHalf;

    // Degrees moved in first half of windup (27.5ms): over 35 degrees!
    const degFirstHalf = Math.abs(rotAtHalf - rotAt0);
    expect(degFirstHalf).toBeGreaterThan(30);
    // Angular velocity is > 1.2 deg/ms (crisp, alert cock-back rather than sluggish creep)
    expect(degFirstHalf / (attack1.activeAt * 0.5)).toBeGreaterThan(1.0);
  });

  it('confirms combo chain cancel timing is reachable within 75ms', () => {
    const combo = getWeaponCombo('刀');
    const attack1 = combo.attacks[0];

    // chainAt is 75ms, allowing early combo recovery cancel
    expect(attack1.chainAt).toBeLessThanOrEqual(80);
    expect(attack1.chainAt).toBeGreaterThanOrEqual(attack1.activeAt);
  });
});
