# ADR-0018: 纯逻辑战斗引擎接缝提炼与视图适配器解耦

## 状态
已接受

## 背景
`GameScene.ts` 原先作为巨型场景（超过 900 行），将 Arcade 物理、Tween 动画、刀光渲染、Camera Shake 与复杂的连击加成、击退位移、装备特性计算（灼烧、击退、眩晕）深度糅合。
由于缺乏接缝，无法对战斗公式与 10 项法则特性进行无画面的自动化测试；同时若引擎底座或渲染管线升级，极易引起连带破坏。

## 决策

### 1. 提炼深层纯逻辑战斗引擎 (CombatEngine)
- 创建 `src/combat/CombatEngine.ts`，暴露核心接口：
  `CombatEngine.resolveMeleeAttack(attacker, weapon, defenders, randomFn): CombatResolution`；
- 该引擎具有零 Phaser 依赖，无任何状态副作用，纯粹根据攻击者姿态、武器特性与防御者几何位置输出确定性战斗判定结果。

### 2. 10 种法则特性的原生逻辑驱动
- 在 `CombatEngine` 中集中实现瞬杀（instantKill）、吸血（lifeSteal）、连环雷击（chainLightning）、火焰灼伤（burn）与地裂眩晕（stun）等效果的纯数值与事件计算；
- 输出明确的结构化 `visualEvents`，供渲染层自适应播放。

### 3. GameScene 转为视图适配器 (View Adapter)
- `GameScene.resolveMeleeHit` 不再进行任何复杂的伤害数学公式计算，而是作为薄适配器收集场景中敌人的物理坐标与生命，调用 `CombatEngine`，并根据返回的事件列表执行视觉反馈。

## 后果
- 践行“接口即测试表面”，在 `src/combat/CombatEngine.test.ts` 中构建了连击倍率、瞬杀、吸血和灼烧的极速原生测试；
- 彻底隔离了底层游戏引擎（Phaser 3/4）与汉字装备战斗法则，提高了代码可测性与 AI 导航性。
