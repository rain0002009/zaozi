# 本地装备数据库构建与天工配置台双向生效 (Equipment Repository & Live Game Sync)

## 目标
解决天工配置台与游戏本体之间的数据脱节问题：
1. 建立 `EquipmentRepository` 作为本地武器与装备数据库；
2. 游戏本体（`GameState` 与 `COMPOUND_WEAPONS`）动态读取本地数据库，并在配置台修改保存后实时热生效；
3. 天工配置台增设「💾 保存生效」按键、Toast 弹窗反馈与「导出/导入」文件能力。

## 验收标准
- [x] 创建 `src/data/EquipmentRepository.ts`，实现 CRUD、JSON 导入导出、Pub/Sub 事件监听。
- [x] 编写 `src/data/EquipmentRepository.test.ts`，完成数据库增删改查、导入导出及持久化测试。
- [x] 重构 `src/state/GameState.ts`：动态读取 `equipmentRepository`，提供 `refreshCompoundWeapons` 及跨标签页同步。
- [x] 更新 `src/editor/WeaponEditor.ts`：添加「💾 保存生效」按键、重塑重置与导入导出逻辑、更新提示。
- [x] 更新 `CONTEXT.md` 中「天工配置台」定义。
- [x] 撰写 `docs/adr/ADR-0023-equipment-repository-local-database.md`。
- [x] `npm test` 30 项测试全部通过，`npm run build` 打包构建无阻碍。

## 当前状态
已完成 (Completed)
