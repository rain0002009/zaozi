# ADR-0017: 统一装备数据源与持久化存储适配器架构设计

## 状态
已接受

## 背景
在 `/improve-codebase-architecture` 的架构深审中，发现了两个关键的架构摩擦点：
1. **静态类型与动态配置割裂**：`GameState.ts` 内部使用静态联合类型 `CompoundWeaponId = '木刀' | '炎刀' | ...` 及硬编码字典，与新构建的数据驱动天工配置台（`equipmentTypes.ts`）存在数据模型脱节；
2. **缺乏存储接缝（Storage Seam）**：`GameState` 直接耦合浏览器底层的 `localStorage`，无法在无浏览器的自动化测试环境中实例化与验证。

## 决策

### 1. 提炼存储适配器接缝 (StorageAdapter Seam)
- 定义 `StorageAdapter` 接口（`getItem`, `setItem`, `removeItem`）；
- 提供生产环境的 `LocalStorageAdapter` 与测试环境的 `MemoryStorageAdapter`；
- 践行架构原则：“一个适配器是假设性接缝，两个适配器构成真实解耦”；
- `GameState` 构造函数接收 `StorageAdapter` 依赖注入，彻底解除对全局 `window.localStorage` 的硬编码调用。

### 2. 统一词组装备数据源 (Unified Equipment Repository)
- 将 `CompoundWeaponId` 泛化为动态字符串标识 `string`；
- `CompoundWeapon` 继承 `CompoundEquipment`，统一涵盖基础属性（伤害、攻速、射程、击退）与 10 项法则特性列表（`traits`）；
- `COMPOUND_WEAPONS` 通过 `DEFAULT_EQUIPMENT_PRESETS` 动态构建，确立单一事实来源（Single Source of Truth）。

### 3. 原生自动化测试覆盖
- 配合 Vitest，在 `src/state/GameState.test.ts` 中直接以 `MemoryStorageAdapter` 覆盖核心造字扣减、多字组词锻造、装备装配与持久化存取。

## 后果
- 实现了装备数据结构与法则特性在天工配置台与游戏运行态间的无缝统一；
- 彻底解决了状态管理模块在无浏览器环境下的自动化测试问题，单测执行耗时低于 20ms。
