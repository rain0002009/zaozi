# 架构重构阶段 2：装备数据源与持久化存储适配器统一 (Unified Storage & Equipment Repository)

## 目标
1. 提炼存储接缝（Storage Seam）：定义 `StorageAdapter` 接口，提供 `LocalStorageAdapter`（浏览器端）与 `MemoryStorageAdapter`（测试端），践行“两个适配器构筑真实接缝”架构原则；
2. 统一词组装备数据源：消除 `GameState.ts` 中的静态联合类型硬编码与重复字典，将 `CompoundEquipment` 确立为全游统一数据结构；
3. 支持动态特性读取：使 `gameState.getEquippedWeapon()` 返回具有 `traits` 列表与标准化 stats 的完整装备实体；
4. 编写 `GameState` 在 `MemoryStorageAdapter` 下的原生单测，验证造字、锻造、装备切换与出征结算逻辑。

## 验收标准
- [x] 创建 `src/services/StorageAdapter.ts`（支持 LocalStorage 与 Memory 两种实现）。
- [x] 重构 `GameState.ts` 接入 `StorageAdapter`，解耦对原生 `localStorage` 的直接依赖。
- [x] 统一 `CompoundWeapon` 与 `CompoundEquipment`，支持动态装备 ID 与 10 项法则特性。
- [x] 编写 `src/state/GameState.test.ts` 并在 Vitest 中全绿通过。
- [x] 编写 ADR-0017 记录该架构决策。

## 当前状态
已完成
