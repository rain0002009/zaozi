# 架构重构阶段 1：构建工具链与测试接缝现代化 (Toolchain & Testing Modernization)

## 目标
1. 升级核心开发依赖：更新 Vite、TypeScript，移除过时的 `@types/sharp`；
2. 引入基于 Vite 统一配置的测试运行器（Vitest）；
3. 建立“接口即测试表面（the interface is the test surface）”测试模式：将孤立于 `scripts/*.test.mjs` 的单测迁移为 `src/` 下同级原生测试；
4. 验证 HMR、打包构建（`npm run build`）与全部单测（`npm test`）绿灯通过。

## 验收标准
- [x] 移除 `@types/sharp`，更新 `typescript` 与 `vite`。
- [x] 安装并配置 `vitest`。
- [x] 在 `package.json` 中配置 `"test": "vitest run"` 与 `"test:watch": "vitest"`。
- [x] 迁移或建立领域状态单测（`src/state/RouteState.test.ts`, `src/state/RiddleState.test.ts`, `src/data/equipmentTypes.test.ts`），并确保通过。
- [x] `npm run build` 成功完成无类型或构建错误。

## 当前状态
已完成
