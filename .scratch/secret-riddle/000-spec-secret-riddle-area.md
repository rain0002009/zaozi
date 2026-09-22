# [SPEC] 字谜秘境高奖励区域与局内解谜古碑造字

**Triage Label**: `ready-for-agent`

## Problem Statement

在当前的出征循环中，玩家在各个路线节点间仅能经历单一维度的战斗搜刮，所有造字与武器锻造均被严格限制在局外基地中进行。这导致：
1. 出征过程中的路线抉择同质化，缺乏高风险、高回报的博弈机会；
2. 汉字主题的核心魅力（猜字谜、拆字造字、文化探索）未能在战斗探险中充分展开；
3. 玩家收集到的【携带笔画】在出征途中只是静态数字，无法在局内即时转化为解谜策略或战力突破。

玩家需要一种能够自然融合汉字谜题、允许在出征途中现场造字验证、并提供稳健免战与高危死斗双重选择的高奖励区域。

## Solution

在出征路线选择中引入有概率出现的特殊金色节点：**【字谜秘境】**。
1. **行路图节点**：路线选择时概率出现独立的字谜秘境节点，标明高收益与神秘特征，玩家自主抉择是否前往。
2. **解谜古碑与局内造字**：秘境入口树立镌刻汉字谜面的古碑，交互后呼出米字格宣纸手写画板，读取当前出征所收集的携带笔画。玩家根据谜面现场手写造字，并可消耗携带笔画获取部首或字义线索；猜不出或笔画不足时可随时转身离去返回常规路线。
3. **谜底即钥匙**：造出正确汉字并提交时，自动扣除对应携带笔画并将字作为钥匙瞬间消耗开启石门；答错仅作提示不产生任何扣损。
4. **两阶段博弈殿堂**：进入秘境后提供两座抉择神龛：
   - **【静谧宝阁】（稳健路线）**：免战直接领取高阶稀有笔画与进阶词组武器，安全前往下一节点；
   - **【死斗试炼】（搏命路线）**：挑战带有特殊字阵词条的秘境守护兽，胜利获得翻倍顶级至宝；战败触发古碑保命禁制，保留 1 点生命值被强制传送出秘境，出征不中断。

## User Stories

1. As an expedition explorer, I want to occasionally see a golden "Secret Riddle Area" node when selecting my next route, so that I have the opportunity to take on a high-reward challenge.
2. As an expedition explorer, I want the Secret Riddle Area card to clearly indicate its danger rating and high-reward nature, so that I can make an informed risk-reward decision before stepping in.
3. As an expedition explorer arriving at the secret area, I want to see an ancient riddle stele with an inscribed character riddle, so that I have a clear puzzle objective.
4. As an expedition explorer, I want to interact with the riddle stele to open a rice-paper calligraphy writing board, so that I can write and craft characters during an active expedition.
5. As an expedition explorer, I want the in-run calligraphy board to utilize only the strokes I have carried in the current expedition, so that my run progression directly impacts my ability to solve the puzzle.
6. As an expedition explorer who is unsure of the riddle answer, I want to spend 1 carried stroke to reveal a structural/radical hint on the stele, so that I can narrow down the possible character solutions.
7. As an expedition explorer who needs further help, I want to spend another carried stroke to reveal a semantic/word-association hint, so that I have enough context to deduce the answer.
8. As an expedition explorer who lacks the necessary strokes or cannot solve the riddle, I want to click a "Turn Back and Leave" button, so that I can safely return to route selection without losing any health, strokes, or progress.
9. As an expedition explorer, I want submitting an incorrect character to display a "the stele remains silent" feedback message without consuming any strokes or characters, so that I can freely attempt answers without punishment.
10. As an expedition explorer, I want submitting the correct riddle character to verify that I possess the required strokes, deduct those strokes, synthesize the character, and immediately consume it as a key to open the stone gates, so that my inventory remains clean and focused on the run.
11. As an expedition explorer entering the unlocked secret chamber, I want to be presented with two distinct altars—the "Safe Sanctuary" and the "Trial of Deadly Combat", so that I can choose between guaranteed safety and high-risk glory.
12. As an expedition explorer low on health or carrying valuable loot, I want to select the Safe Sanctuary altar to immediately claim rare high-tier strokes and an upgraded compound weapon without fighting, so that I can safely bolster my run.
13. As an ambitious expedition explorer with a strong combat setup, I want to select the Trial of Deadly Combat altar to teleport into a trial arena against a glyph ward guardian with special battle modifiers, so that I can test my combat mastery.
14. As an expedition explorer victorious in the Trial of Deadly Combat, I want to receive doubled top-tier rewards (exclusive legendary compound weapons and top-grade golden strokes), so that my high-risk decision feels overwhelmingly rewarding.
15. As an expedition explorer defeated during the Trial of Deadly Combat, I want an ancient protective talisman to activate upon fatal damage, retaining 1 HP and teleporting me out of the secret area, so that my expedition continues rather than suffering an immediate run-ending wipeout.
16. As an expedition explorer completing or escaping the secret area, I want to seamlessly transition to the next route selection with all earned rewards and surviving stats intact, so that my overall expedition loop remains cohesive.

## Implementation Decisions

### Domain State & Service Contracts
- **Route Extension**: Extend the expedition route model with a `secret_riddle` route type, associated with custom danger ratings, accent styling, and descriptive lore.
- **Riddle Repository**: Implement a curated collection of character riddles. Each riddle entry defines:
  - Unique identifier
  - Riddle clue text (e.g., "一口吃掉牛尾巴")
  - Target character answer (e.g., "告")
  - Tier-1 structural hint (e.g., "上下结构，口字底")
  - Tier-2 semantic hint (e.g., "意为报告、宣告")
  - Stroke cost for hints (1 stroke per tier)
- **In-Run Stele Crafting Lifecycle**:
  - The in-run calligraphy board reuses the existing handwriting recognition engine.
  - Verification is transactional: strokes are only deducted and the word entity is only instantiated if the recognized character matches the riddle target and the player holds sufficient carried strokes.
  - Once validated, the synthesized word is consumed immediately to trigger the gate opening transition.
  - Incorrect submissions or canvas resets leave carried strokes completely untouched.
- **Two-Stage Sanctuary Architecture**:
  - The secret chamber is divided into two distinct state branches: Safe Sanctuary and Trial of Deadly Combat.
  - Safe Sanctuary directly deposits loot into carried inventory and updates equipped weapon/modifiers before triggering area completion.
  - Trial of Deadly Combat initializes an arena encounter with enhanced guardian enemy parameters and affix modifiers.
  - Combat resolution injects a fatal damage interceptor: when player health reaches zero within the trial area, health is clamped to 1, the trial encounter terminates as escaped, and the scene transitions to the subsequent route selection.

## Testing Decisions

### What Makes a Good Test
Tests must verify external behavioral contracts, domain state transitions, and resource invariants without coupling to internal UI rendering nodes or Phaser display objects:
1. **Route Generation Contract**: Verify that the route generation service produces the secret riddle node at the designated probability and respects level thresholds.
2. **Hint & Stroke Deduction Invariant**: Verify that purchasing hints deducts exactly the configured number of carried strokes and unlocks hint text sequentially, rejecting purchases when strokes are insufficient.
3. **Puzzle Verification Invariant**:
   - Verify that submitting a mismatched character does not modify carried strokes or character counts.
   - Verify that submitting a matching character with insufficient strokes is rejected.
   - Verify that submitting a matching character with sufficient strokes deducts the exact recipe strokes and transitions the state to unlocked.
4. **Abandonment Contract**: Verify that choosing to turn back leaves carried strokes and player HP intact and permits re-selecting another available route node.
5. **Two-Stage Reward Contract**:
   - Verify that selecting Safe Sanctuary grants standard high-tier loot and marks the area complete.
   - Verify that winning Trial of Deadly Combat grants double top-tier loot.
   - Verify that defeat in Trial of Deadly Combat clamps HP to 1, withholds trial rewards, and preserves expedition continuity.

### Modules Tested & Prior Art
- **Target Modules**: Domain state manager, route selection service, riddle verification service, and combat damage interception rules.
- **Prior Art**: Follows existing standalone unit and integration test scripts (`scripts/character-motion.test.mjs`, `scripts/character-attack-motion.test.mjs`) using Node.js native test runner (`node --test`).

## Out of Scope

1. **In-Run Freeform Weapon Forging**: In-run crafting is strictly constrained to solving the riddle stele. In-run weapon forging or arbitrary word inventory stacking remains exclusive to the base workshop.
2. **Multi-Riddle Chains / Branching Dungeons**: Each secret riddle area contains exactly one riddle and one two-stage choice; nested sub-dungeons are out of scope.
3. **Custom Procedural Riddle Generation**: Riddles are drawn from a verified curated dataset rather than dynamically generated via external LLM APIs during runtime.
4. **Multiplayer or Co-op Riddle Sharing**: Riddles and trials are strictly single-player offline experiences.

## Further Notes

- The cheat-death protection (clamping to 1 HP upon defeat in the trial) is a critical psychological safety net for a Roguelite, ensuring players are rewarded for taking the mental effort to solve the riddle without having their entire 20-minute run abruptly deleted if the combat trial proves too fierce.
