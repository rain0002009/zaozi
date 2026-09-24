# 架构重构阶段 4：基地设施领域工坊解耦与深度化 (Base Workshops Decoupling)

## 目标
1. 解决 `BaseScene.ts`（超过 1000 行）同时充当渲染舞台、手写板、字词锻造台、配方簿与出征关口的上帝模块问题；
2. 提炼两座自闭环的深层领域工坊模块：
   - `CalligraphyWorkshop`（毛笔宣纸造字工坊）：内聚笔画轨迹捕获、汉字候选匹配、笔画库存校验与【凝字成符】入库；
   - `ForgeWorkshop`（铸武工坊）：内聚自由字槽位管理、词组装备即时预览、拖拽放入/移出与锻造装备；
3. `BaseScene.ts` 缩减为纯粹的高阶容器与协调者，仅负责头部导航、关卡出征和两座工坊之间的刷新联动；
4. 验证打包构建与游戏交互无任何退化。

## 验收标准
- [x] 创建 `src/workshops/CalligraphyWorkshop.ts` 与 `src/workshops/ForgeWorkshop.ts`。
- [x] 重构 `BaseScene.ts` 接入两座工坊模块，大幅降低场景单文件复杂度。
- [x] 保持毛笔宣纸造字、快捷凝字、铸武台拖拽、天工配置台入口等交互体验完全一致。
- [x] `npm run build` 和 `npm test` 全部绿灯。
- [x] 编写 ADR-0019。

## 当前状态
已完成
