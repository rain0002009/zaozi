import { KNIFE_COMBO } from './WeaponCombo';
import { CompoundWeapon } from '../state/GameState';

export type CombatAttacker = {
  x: number;
  y: number;
  comboStep: number;
  side: 'left' | 'right';
};

export type CombatDefender = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

export type TargetHitResult = {
  targetId: string;
  damage: number;
  knockback: number;
  attackAngle: number;
  isInstantKill: boolean;
  lifeStealAmount: number;
  stunDurationMs?: number;
  burnExtraDamage?: number;
  chainTargetIds?: string[];
};

export type VisualCombatEvent =
  | { type: 'fireBurst'; x: number; y: number }
  | { type: 'chainLightning'; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'earthShockwave'; x: number; y: number; radius: number }
  | { type: 'instantKillExecute'; x: number; y: number };

export type CombatResolution = {
  hitCount: number;
  hitstopRemainingMs: number;
  cameraShake: { duration: number; intensity: number } | null;
  hits: TargetHitResult[];
  visualEvents: VisualCombatEvent[];
  totalLifeSteal: number;
};

function wrapAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export class CombatEngine {
  /**
   * Resolves a melee attack against defenders using attacker parameters and weapon traits.
   * Pure, deterministic, and independent of any rendering engine.
   */
  static resolveMeleeAttack(
    attacker: CombatAttacker,
    weapon: CompoundWeapon,
    defenders: CombatDefender[],
    randomFn: () => number = Math.random
  ): CombatResolution {
    const attackIndex = Math.max(0, Math.min(attacker.comboStep - 1, KNIFE_COMBO.attacks.length - 1));
    const attackSpec = KNIFE_COMBO.attacks[attackIndex];
    const attackAngle = attacker.side === 'right' ? 0 : Math.PI;

    const range = weapon.stats.range * (attackSpec.range / 105);
    const comboMultiplier = attacker.comboStep === 3 ? 1.6 : attacker.comboStep === 2 ? 1.2 : 1.0;
    const baseDamage = Math.round(weapon.stats.damage * comboMultiplier);
    const baseKnockback = weapon.stats.knockback * (attackSpec.knockback / 14);

    const halfArcRad = (attackSpec.arcDegrees / 2) * (Math.PI / 180);

    // Detect hits in range and arc
    const hitDefenders = defenders.filter((defender) => {
      const dx = defender.x - attacker.x;
      const dy = defender.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= range) return false;

      const angle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(wrapAngle(angle - attackAngle));
      return angleDiff < halfArcRad;
    });

    if (hitDefenders.length === 0) {
      return {
        hitCount: 0,
        hitstopRemainingMs: 0,
        cameraShake: null,
        hits: [],
        visualEvents: [],
        totalLifeSteal: 0,
      };
    }

    const hitstopRemainingMs = 40;
    const cameraShake = {
      duration: attacker.comboStep === 3 ? 90 : 45,
      intensity: attacker.comboStep === 3 ? 0.005 : 0.002,
    };

    const hits: TargetHitResult[] = [];
    const visualEvents: VisualCombatEvent[] = [];
    let totalLifeSteal = 0;

    // Check equipped traits
    const instantKillTrait = weapon.traits?.find((t) => t.traitId === 'instantKill');
    const burnTrait = weapon.traits?.find((t) => t.traitId === 'burn') || (weapon.stats.element === 'fire' ? { traitId: 'burn', name: '烈焰', params: { dps: 15, duration: 3, chance: 100 } } : undefined);
    const stunTrait = weapon.traits?.find((t) => t.traitId === 'stun') || (weapon.stats.element === 'earth' ? { traitId: 'stun', name: '眩晕', params: { chance: 100, duration: 0.7, radius: 60 } } : undefined);
    const lifeStealTrait = weapon.traits?.find((t) => t.traitId === 'lifeSteal');
    const chainLightningTrait = weapon.traits?.find((t) => t.traitId === 'chainLightning');

    for (const defender of hitDefenders) {
      let isInstantKill = false;

      // 1. Instant kill check
      if (instantKillTrait) {
        const chance = (Number(instantKillTrait.params.chance) || 3) / 100;
        const threshold = (Number(instantKillTrait.params.executeThreshold) || 15) / 100;
        const currentHpRatio = defender.hp / Math.max(1, defender.maxHp);

        if (currentHpRatio <= threshold || randomFn() < chance) {
          isInstantKill = true;
          visualEvents.push({ type: 'instantKillExecute', x: defender.x, y: defender.y });
        }
      }

      const finalDamage = isInstantKill ? defender.hp : baseDamage;

      // 2. Life steal check
      let lifeStealAmount = 0;
      if (lifeStealTrait) {
        const leechRatio = (Number(lifeStealTrait.params.leechRatio) || 8) / 100;
        lifeStealAmount = Math.max(1, Math.round(finalDamage * leechRatio));
        totalLifeSteal += lifeStealAmount;
      }

      // 3. Burn / Fire element check
      let burnExtraDamage: number | undefined;
      if (burnTrait) {
        const chance = (Number(burnTrait.params.chance) || 100) / 100;
        if (randomFn() <= chance) {
          burnExtraDamage = Math.round(finalDamage * 0.35);
          visualEvents.push({ type: 'fireBurst', x: defender.x, y: defender.y });
        }
      }

      // 4. Stun / Earth element check
      let stunDurationMs: number | undefined;
      if (stunTrait) {
        const chance = (Number(stunTrait.params.chance) || 100) / 100;
        if (randomFn() <= chance) {
          const durSec = Number(stunTrait.params.duration) || 0.7;
          stunDurationMs = Math.round(durSec * 1000);
          const radius = Number(stunTrait.params.radius) || 60;
          visualEvents.push({ type: 'earthShockwave', x: defender.x, y: defender.y, radius });
        }
      }

      // 5. Chain lightning check
      let chainTargetIds: string[] | undefined;
      if (chainLightningTrait) {
        const jumpCount = Number(chainLightningTrait.params.jumpCount) || 3;
        // Find other nearby defenders not already hit
        const otherDefenders = defenders.filter(
          (d) => d.id !== defender.id && !hitDefenders.some((hd) => hd.id === d.id)
        );
        const chained = otherDefenders.slice(0, jumpCount);
        if (chained.length > 0) {
          chainTargetIds = chained.map((c) => c.id);
          chained.forEach((c) => {
            visualEvents.push({
              type: 'chainLightning',
              fromX: defender.x,
              fromY: defender.y,
              toX: c.x,
              toY: c.y,
            });
          });
        }
      }

      hits.push({
        targetId: defender.id,
        damage: finalDamage,
        knockback: baseKnockback,
        attackAngle,
        isInstantKill,
        lifeStealAmount,
        stunDurationMs,
        burnExtraDamage,
        chainTargetIds,
      });
    }

    return {
      hitCount: hits.length,
      hitstopRemainingMs,
      cameraShake,
      hits,
      visualEvents,
      totalLifeSteal,
    };
  }
}
