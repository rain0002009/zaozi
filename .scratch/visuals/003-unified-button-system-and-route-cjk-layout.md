# 按钮规范重塑、仓中笔画被动化与行路图中文排版 (Unified Button System & Route CJK Layout)

## 目标
根据玩家反馈，集中攻克三项关键体验与视觉缺陷：
1. **仓中笔画无意义点击去除**：转为纯被动资源展示，移除残留的点击选中与手型光标；
2. **按钮样式统一重塑**：废除扭曲怪异的贝塞尔纺锤笔触与网页纯色直角块，全游统一重绘为规范平整、带有双层金属包边与微铆钉角扣的「古风印令按键」（鎏金/朱砂/乌木墨玉）；
3. **行路图文字溢出与重叠排版修复**：建立中文字符避头尾断行算法（Kinsoku Shori），适度扩展卡片高度并流式重排，彻底解决横向穿墙与垂直碰撞问题。

## 验收标准
- [x] 在 `src/visuals/textWrap.ts` 中实现中文避头尾断行算法，并在 `src/visuals/textWrap.test.ts` 中完成各路线文案断行测试。
- [x] 在 `src/visuals/InkTextures.ts` 中升级 `generateBrushButton` 为微圆角长矩形、质感渐变、双层金属包边与角铆钉的印令按键，并注册大号金色按键。
- [x] 重构 `src/scenes/RouteScene.ts`：卡片加高至 344px，描述文字智能折行，底部踏入按钮升级为印令按键，各元素留白充足、零重叠。
- [x] 重构 `src/scenes/BaseScene.ts`：移除 `selectedStrokeForPlacement` 及点击切换，仓中笔画栏纯被动展示。
- [x] 优化 `CalligraphyWorkshop.ts`、`ForgeWorkshop.ts`、`MenuScene.ts` 与 `GameScene.ts` 中的按钮样式与字色对比度。
- [x] `npm test` 23 项测试全部通过，`npm run build` 产物打包成功。
- [x] 更新 `CONTEXT.md`（新增「行路图」与「印令按键」）。
- [x] 撰写 `ADR-0022` 记录决策。

## 当前状态
已完成 (Completed)
