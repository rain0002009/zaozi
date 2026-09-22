export type RouteId = 'wilds' | 'ruins' | 'ember' | 'rift' | 'boss' | 'secret_riddle';

export type RouteDefinition = {
  id: RouteId;
  title: string;
  subtitle: string;
  danger: string;
  description: string;
  enemyBonus: number;
  lootMultiplier: number;
  accent: number;
};

export const ROUTES: Record<RouteId, RouteDefinition> = {
  wilds: {
    id: 'wilds',
    title: '枯字荒原',
    subtitle: '普通战斗',
    danger: '平稳',
    description: '游荡的狼群盘踞荒原，主要掉落「丿」「㇏」笔画。',
    enemyBonus: 0,
    lootMultiplier: 1,
    accent: 0x6e9b78,
  },
  ruins: {
    id: 'ruins',
    title: '残碑林',
    subtitle: '搜刮战斗',
    danger: '中等',
    description: '残碑孕育更多字灵，主要掉落「一」「丨」笔画。',
    enemyBonus: 2,
    lootMultiplier: 1.45,
    accent: 0xb69a61,
  },
  ember: {
    id: 'ember',
    title: '妖火泽',
    subtitle: '远程战斗',
    danger: '危险',
    description: '水妖与火狼交错，主要掉落「丶」「㇇」笔画。',
    enemyBonus: 1,
    lootMultiplier: 1.3,
    accent: 0xc86f59,
  },
  rift: {
    id: 'rift',
    title: '断墨窟',
    subtitle: '精英战斗',
    danger: '极险',
    description: '山鬼成群冲锋，获得的珍贵笔画数量显著提高。',
    enemyBonus: 3,
    lootMultiplier: 1.8,
    accent: 0x8d6b9f,
  },
  boss: {
    id: 'boss',
    title: '墨池核心',
    subtitle: '区域 Boss',
    danger: '首领',
    description: '击败「墨」，带着全部战利品返回基地。',
    enemyBonus: 0,
    lootMultiplier: 2.2,
    accent: 0x9b3f48,
  },
  secret_riddle: {
    id: 'secret_riddle',
    title: '字谜秘境',
    subtitle: '古碑解谜',
    danger: '造化',
    description: '古碑耸立阻挡前路，破译字谜方可进入殿堂获取高额奖励。',
    enemyBonus: 0,
    lootMultiplier: 2.5,
    accent: 0xd4af37,
  },
};

export function generateRouteOptions(
  area: number,
  randomFn: () => number = Math.random
): RouteId[] {
  if (area >= 3) {
    return ['boss'];
  }
  const baseRoutes: RouteId[] = area === 1 ? ['wilds', 'ruins'] : ['ember', 'rift'];
  // Probability: 20% (range 15%~25%)
  const roll = randomFn();
  if (roll <= 0.20) {
    return [...baseRoutes, 'secret_riddle'];
  }
  return baseRoutes;
}
