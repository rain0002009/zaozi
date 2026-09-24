# 架构重构阶段 3：提炼深层战斗引擎接缝 (Deepening Combat Engine Seam)

## 目标
1. 建立战斗领域接缝（Combat Seam）：将 `GameScene.ts` 中混杂的连击判定、伤害算式、距离弧度检测与 10 项法则特性逻辑抽取为纯无状态的 `CombatEngine` 模块；
2. 践行“接口即测试表面（the interface is the test surface）”：提供 `resolveMeleeAttack` 与 `calculateHitBounds` 等简洁高杠杆接口，以输入/输出纯数据驱动；
3. 将 `GameScene.ts` 重构为 Phaser 视图适配器（View Adapter），只负责消费 `CombatResolution` 输出并执行动画/音效/震屏渲染；
4. 编写 `src/combat/CombatEngine.test.ts` 原生单测，验证连击倍率、击退冲量、火焰灼烧、一击必杀与吸血等特性规则；
5. 编写 ADR-0018 记录战斗接缝的解耦决策。

## 验收标准
- [x] 创建 `src/combat/CombatEngine.ts`，定义清晰的输入与输出数据契约。
- [x] 支持 10 种装备特性的统一逻辑计算（瞬杀判定、吸血、连环跳跃、燃烧爆发、地裂眩晕等）。
- [x] `GameScene.ts` 接入 `CombatEngine`，移除场景内硬编码的伤害与五行判定。
- [x] 编写 `src/combat/CombatEngine.test.ts` 并在 Vitest 中全绿通过。
- [x] 编写 ADR-0018。

## 当前状态
已完成
