# ADR-0023: 本地装备数据库（EquipmentRepository）与天工配置台闭环联动

## 状态
已接受

## 背景
在天工配置台（`WeaponEditor`）具备了基础属性、汉字配方组合及法则特性的编辑能力后，存在严重的数据断层：
1. **静态硬编码脱节**：游戏本体（`GameState.ts`）在初始化时直接读取代码中编译好的只读预设（`DEFAULT_EQUIPMENT_PRESETS`），无法消费配置台中修改保存的数据；
2. **缺乏保存与流转闭环**：配置台缺乏显式的保存按钮、反馈 Toast 以及导入/导出规范，用户曾误以为必须手动复制 JSON 代码粘贴进代码库中才能生效；
3. **数据库技术选型权衡**：在讨论是否引入浏览器端 SQLite（如 WASM `sql.js`）时，经过对数据结构契合度、包体积、纯前端运行效率及 Git 差异比对等多维评估，确定轻量级文档型仓库为最优解。

## 决策

### 1. 构建轻量本地装备数据库（`EquipmentRepository`）
- 建立 `src/data/EquipmentRepository.ts`，由统一的 `StorageAdapter`（默认 `LocalStorageAdapter`，测试支持 `MemoryStorageAdapter`）驱动；
- 提供完备的仓储层 CRUD 能力：`getAll()`, `getById()`, `saveAll()`, `saveItem()`, `deleteItem()`, `resetToDefaults()`, `exportJson()`, `importJson()`；
- 支持发布/订阅（Pub/Sub）机制，在本地数据变更时广播通知关注者。

### 2. 游戏运行时全量动态同步
- 重构 `src/state/GameState.ts` 中的 `buildCompoundWeapons()`，使其动态从 `equipmentRepository.getAll()` 装载武器词条与属性；
- 暴露 `refreshCompoundWeapons()` 方法，并自动订阅 `equipmentRepository` 变更；
- 增加浏览器跨标签页/窗口 `storage` 事件监听，确保在独立标签页打开配置台保存时，游戏标签页无需刷新即可实时热更新装备库数值与配方；
- 锻造比对逻辑（`canPlayerForgeWeapon`）与实战出招（`getEquippedWeapon`）全部无缝基于最新的本地库数据执行。

### 3. 天工配置台交互全面升级
- 顶部导航栏增加金色高亮按键 **「💾 保存生效」**，点击即持久化并弹出浮动提示 Toast；
- 增加 **「📤 导出 JSON」** 与 **「📥 导入 JSON」**，导出标准 `zaozi-weapons-config.json` 备份；
- 更新重置逻辑，调用 `resetToDefaults()` 清空本地修改并一键还原官方默认数值；
- 修正底部提示文案，明确标明本地数据库已与游戏打通。

## 后果
- 彻底解决了“编辑器改了无法带入游戏”的断层问题，实现了即改即存即生效；
- 零第三方二进制包依赖（规避了 SQLite WASM 引入的 1~2MB 体积与异步初始化开销）；
- 完美契合武器嵌套多态词条的数据模型，支持无缝 JSON 导出分享与 Git 版本管理；
- 新增 7 项单元测试，全套 30 项测试与 Vite 打包全绿。
