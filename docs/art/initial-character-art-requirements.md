# 初始角色“人”侧身美术与武器连击需求

## 目标

重新设计战场上的初始角色“人”，用正常人形、稳定的侧身轮廓和可读的纸偶关节表现移动与武器动作。近战不再根据鼠标的任意角度旋转手臂和刀，而是攻击角色左侧或右侧，并通过每种武器独有的连击形成动作差异。

本需求覆盖新角色参考图、模块化透明素材、运行时纸偶骨架、短刀三段连击和相关战斗反馈。旧正面“人”字角色素材仅作历史参考，不再约束新设计。

## 领域边界

- “人”保留为初始角色的规则身份和 UI 名称，可决定属性、字数容量与成长路线。
- 角色、装备和特效可以表达汉字的含义，但轮廓不必包含对应汉字的字形。
- 缺少“人”字笔画结构不构成美术验收失败；角色首先要像一个动作自然、装备连接清楚的人。
- “刀”仍表现为可见短刀，“火”可以表现为火焰效果。这些属于字义表现，不要求素材长成对应字形。

## 已确定的角色设计

- 视角：轻度俯视的三分之二侧身，主要朝右；运行时按 rig 部件和转身进度镜像得到左朝向。
- 身份：中性的年轻成年游侠，不突出男性或女性特征，不采用儿童比例。
- 比例：约 4 头身，头、躯干、双臂和双腿在游戏尺寸下都能分辨。
- 服装：适合动作的小体量短打衣裤、布靴和束发，不使用宽大袖口、长披风、盔甲或复杂配饰。
- 风格：国风水墨纸偶，轮廓利落，保留少量飞白与纸张质感。
- 配色：深墨和米白为主，允许一个低饱和强调色；避免单一灰块导致四肢重叠。
- 持刀：待机时短刀斜向前下，手肘微弯；出第一刀前先用短预备动作提刀。
- 身份连续性：不要求继承旧角色的圆头、墨点五官、灰绿色短衣或“人”字双腿，可以完全重新设计。

## 游戏内尺寸

游戏逻辑画布为 `1024 × 768`，运行时等比缩放。

| 项目 | 规格 |
|------|------|
| 单个可编辑源素材画布 | 1024 × 1024 px，RGBA 透明 PNG |
| 单个运行时发布素材画布 | 256 × 256 px，RGBA 透明 PNG |
| 游戏内素材缩放 | 约 0.5 倍 |
| 可编辑源素材可见高度 | 约 576–608 px |
| 运行时发布素材可见高度 | 约 144–152 px；游戏内约 72–76 逻辑像素 |
| 角色碰撞半径 | 保持 27 逻辑像素 |
| 普通短刀攻击距离 | 第一刀 112px |
| 脚底基线 | 源画布 `y = 824`；运行时画布 `y = 206` |
| 角色根锚点 | 源画布 `(512,656)`；运行时画布 `(128,164)` |

`art/characters/ren/source/` 中的所有可编辑源素材共用一个 1024 × 1024 画布和 `(512,656)` 角色根坐标，经组合验收后确定性缩小到 `public/assets/characters/ren/source/` 中统一的 256 × 256 运行时画布。缩放前需要清理透明边缘，并让全透明像素继承邻近实体颜色，避免线性采样产生黑边或白边。最终关节锚点根据获批参考图实测，不沿用旧“人”字角色的肩、肘和腕坐标。

## 分层纸偶骨架

只制作一套右朝向素材，左朝向由运行时按 rig 部件镜像得到。普通转身和连击换侧必须根据转身进度分别处理上下身与支撑脚，不得依赖瞬间镜像整个视觉容器。运行时从后向前组合：

1. `shadow`：程序绘制的地面椭圆影，不需要出图。
2. `rear_thigh`：远侧大腿，以髋部为旋转点。
3. `rear_shin`：远侧小腿，以膝部为旋转点。
4. `rear_foot`：远侧脚，以踝部为旋转点。
5. `rear_arm`：远侧手臂，以肩部为旋转点。
6. `torso`：躯干和衣物主体。
7. `head`：头部与束发，以颈部连接点为旋转基准。
8. `front_thigh`：近侧大腿，以髋部为旋转点。
9. `front_shin`：近侧小腿，以膝部为旋转点。
10. `front_foot`：近侧脚，以踝部为旋转点。
11. `garment_hem`：独立衣摆，遮挡髋部连接并表现少量惯性摆动。
12. `weapon_upper_arm`：持刀上臂，以肩部为旋转点。
13. `weapon_forearm`：持刀前臂，以肘部为旋转点。
14. `weapon_hand`：手掌，以腕部为旋转点并覆盖一小段刀柄。
15. `weapon_knife`：独立短刀，刀柄锚点连接手掌握点。
16. `vfx`：程序生成的刀尖墨迹、墨点和受击反馈。

战斗运行时需要以下透明 PNG：

```text
ren_rear_thigh_side.png
ren_rear_shin_side.png
ren_rear_foot_side.png
ren_rear_arm_side.png
ren_torso_side.png
ren_head_side.png
ren_front_thigh_side.png
ren_front_shin_side.png
ren_front_foot_side.png
ren_garment_hem_side.png
ren_weapon_upper_arm_side.png
ren_weapon_forearm_side.png
ren_weapon_hand_side.png
ren_weapon_knife.png
```

刀不得烘焙进手掌、前臂或躯干。大腿、小腿和脚必须包含足够的隐藏关节重叠区，不能直接裁切整腿后留下透明切口。远侧腿使用略低的明度与对比度并保持不透明；近、远侧四肢不得为了省层而合并进躯干。

部件名称、渲染层序、关节锚点和默认姿势由唯一的角色 rig 定义维护；素材校验、加载与动画共同读取该定义，不分别硬编码。

## 朝向与输入规则

- 鼠标位于角色右侧超过 20px 时朝右，位于左侧超过 20px 时朝左。
- 鼠标处在角色垂直中线左右各 20px 的死区内时保持当前朝向，避免快速抖动。
- 移动方向不改变角色朝向；角色可以背离移动方向进行侧移。
- 普通移动时攻击侧随鼠标立即更新，视觉在约 80ms 内完成原地转身并交换近、远腿职责，落地脚不能瞬移。
- 每一招开始时读取攻击侧，并在该招持续期间锁定。
- 连击进入下一招时可以重新读取鼠标位置并转身；上半身立即转向，下盘在下一招预备阶段完成重心和支撑脚转换，不得在单招中途瞬间镜像下盘。
- 鼠标的上下位置不改变近战挥刀轨迹或命中中心。
- 近战只攻击左侧或右侧，正上与正下是需要靠走位处理的盲区。
- 火球及未来的远程武器、投射物和法术可以使用各自的全方向瞄准规则。

## 武器连击规则

- 每次点击只触发一招；按住鼠标不自动完成整套连击。
- 当前招式进度达到约 60% 后开放下一招输入和闪避取消。
- 输入窗口中的点击会缓存，并在当前招式结束时续接下一招。
- 命中或挥空都可以继续连击。
- 两招衔接间隔超过 450ms，或发生闪避、受击、死亡、切换武器时，连击重置到第一招。
- 每种近战武器独立定义招式数量、时长、输入窗口、伤害时点、轨迹、范围、伤害、位移和反馈。
- 左右攻击侧是近战通用规则；短刀、长枪和锤等武器通过不同连击与范围形成差异。
- 每招可以同时命中范围内的多个敌人，但对同一敌人最多结算一次。

## 初始短刀三段连击

| 招式 | 时长 | 动作 | 判定 | 伤害 | 移动与效果 |
|------|------|------|------|------|------------|
| 第一刀 | 260ms | 从侧上方向侧下方斜劈 | 112px、120°，水平朝向攻击侧 | 1 | 移速为正常的 55%，标准击退 |
| 第二刀 | 230ms | 从侧下方向侧上方反向上撩 | 104px、100°，水平朝向攻击侧 | 1 | 移速为正常的 55%，位移较小 |
| 第三刀 | 360ms | 前踏后完成更宽、更重的横斩 | 126px、140°，水平朝向攻击侧 | 2 | 锁定前踏方向，更强击退与轻微镜头震动 |

- 每招约在自身进度 55% 时进入有效帧并结算一次伤害。
- 第一刀从前下方待机位提至侧上方后下劈，不能瞬间跳到轨迹起点。
- 第二刀利用第一刀的收势反向撩回，不重新播放完整待机预备。
- 第三刀由躯干转动与前踏带动肩、肘、腕和刀完成重斩。
- 第一刀以前脚支撑、双膝下沉并由后脚发力；第二刀把重心转移到后脚并让前脚卸力；第三刀由后脚蹬地、前脚踏出完成现有前踏。
- 攻击期间停止普通步态。前两刀的移动输入只微调招式站位，不重新播放走路循环。
- 三招的刀柄锚点必须始终贴合可见手掌握点；刀不能在静止手中独立旋转。
- 左侧连击的稳定关键姿势是右侧姿势的镜像，轨迹、判定与持刀手同时换侧；连续动作中的下盘通过支撑脚转换进入镜像姿势，不瞬间翻转。

## 非攻击状态

非攻击状态只更新视觉动作，不修改现有玩法时长、无敌窗口、速度、受击规则和碰撞半径。

### 待机 `idle`

- 循环时长约 1200ms，保持侧身中立持刀姿势。
- 身体呼吸起伏不超过 2 逻辑像素，头与手臂有轻微延迟。
- 刀斜向前下，不举在头顶，不贴穿腿部或躯干。

### 移动 `move`

- 步态按实际移动距离推进，每移动约 110 逻辑像素完成一个左右脚完整周期；被边界阻挡或暂停时相位不继续推进。
- 前进采用后脚推动、前脚落地的正常步态；后退采用保持迎敌姿势的短步；纵向移动采用双腿不过度交叉的窄幅侧移，斜向输入在相邻步态间混合。
- 起步从最近的稳定支撑姿势进入，停步在约 100–120ms 内收脚；方向切换保留当前支撑脚和相位，并用约 100ms 混合到新步态。
- 支撑期内脚掌落地点保持稳定，远侧手臂与腿形成自然反向节奏。
- 持刀手摆幅较小，刀尖始终避开身体。
- 允许前进、后退和纵向侧移，不因移动方向翻面。
- 身体垂直起伏不超过 3 逻辑像素，避免整体图片滑行。

### 闪避 `dodge`

- 沿实际闪避速度方向压低重心、收身、跨步滑开并重新展开，保持侧身剪影，不完成整圈身体翻滚。
- 没有移动输入时使用鼠标方向；撞到场地边缘后根据实际剩余位移提前进入收势。
- 刀贴近身体并随手臂运动，不独立漂浮。
- 不使用角色残影代替身体动作，不改现有无敌窗口。

### 受击 `hurt`

- 身体沿来袭反方向屈膝失衡并由后脚重新支撑，头、持刀臂和刀有短暂惯性滞后。
- 从被打断的当前姿势用约 30–40ms 进入受击姿势，不先跳回待机。
- 使用少量墨点和命中闪烁，不通过任意翻面表示受击方向。

### 死亡 `death`

- 身体先失去腿部支撑并屈膝，再沿最后一次冲击的反方向倒下；没有冲击方向时向当前面对方向的侧后方倒下。
- 短刀先脱手或落地，身体最终保持倒地轮廓，不通过纵向压扁代替倒地。
- 结算遮罩在主体动作完成后出现，不立刻遮住角色。

## 墨迹与命中反馈

- 第一刀使用由上到下的细弧，第二刀使用由下到上的较短弧，第三刀使用更宽、更重的横向墨痕。
- 墨迹由刀尖的实际运动轨迹采样生成，不能用独立的实心半圆代替动作。
- 每段墨迹约在 140ms 内消散，前粗后细，不得比角色和刀更醒目。
- 第一、二刀使用命中闪烁与短暂停顿；只有第三刀增加轻微镜头震动和更强击退。
- 每招的可见轨迹必须落在对应的侧向判定区域内，不能出现画到头顶却命中侧面的错位。

## AGY 出图流程

不要一次生成 spritesheet，也不要在角色设计未确认前直接生成拆件。

1. 生成一张完整的右朝向中立姿势，确认角色身份、比例、服装、视角和持刀方式。
2. 用同一角色生成第一刀、第二刀和第三刀的关键姿势参考，检查身体、肩、肘、腕和刀的传力关系。
3. 用同一角色补充前进、后退、纵向侧移各四个步态阶段，以及闪避三阶段、受击和死亡终态的全身动作参考。
4. 参考图确认后，在统一 1024 × 1024 母图画布中补绘十四个透明部件；短刀单独生成，大腿、小腿、脚和衣摆必须包含隐藏连接区。
5. 人工校正根、髋、膝、踝、脚底、肩、肘、腕、握点和刀柄锚点，组合验证后确定性缩小到 256 × 256 运行时画布。
6. 组合回中立姿势、前进/后退/纵向步态周期和所有全身动作关键帧，验证连接与落脚后再接入游戏。

### 完整角色与动作参考提示词

```text
Use case: stylized game character concept
Asset type: side-facing character turnaround and melee action reference
Primary request: 为俯视动作 Roguelite 设计一名中性年轻游侠，正常人形，手持朴素短刀；展示右朝向中立姿势，以及下劈、反向上撩、重横斩三个连贯关键姿势
View: lightly top-down three-quarter side view, character primarily facing right
Body: about four heads tall, readable torso, two arms and two legs, adult proportions with restrained stylization
Clothing: compact Chinese-inspired travel clothes, fitted sleeves, trousers, cloth boots, tied hair; suitable for fast movement
Style/medium: Chinese ink-and-paper game art, crisp readable silhouette, restrained dry-brush texture
Color palette: deep ink, warm off-white, one muted accent color
Weapon: separate simple single-edged short knife, clearly held at the grip
Composition: full body and weapon visible in every pose, consistent identity and proportions, enough spacing between poses
Constraints: no Chinese character-shaped torso or limbs; no requirement to resemble the glyph 人; clear shoulder-elbow-wrist chain; no effects; no scenery; no text; no watermark
Avoid: front-facing pose; strict flat profile with overlapping limbs; child or chibi toddler proportions; oversized sleeves; long cape; heavy armor; ornate accessories; extra weapons; 3D plastic rendering
```

### 透明拆件提示词模板

```text
Use case: modular 2D game character source asset
Input images: Image 1: approved right-facing neutral character; Image 2: approved action reference
Primary request: 生成同一角色的右朝向 <远侧大腿/远侧小腿/远侧脚/远侧手臂/躯干/头部/近侧大腿/近侧小腿/近侧脚/衣摆/持刀上臂/持刀前臂/手掌> 独立透明部件
View and identity: exactly match the approved lightly top-down three-quarter side view, proportions, clothing and colors
Composition: 1024x1024 transparent source canvas using the shared character root and the approved joint guide; output will be deterministically resized to 256x256 for runtime
Constraints: genuinely transparent background; clean alpha edges; preserve the complete hidden overlap at hip, knee and ankle joints; no cast shadow; no effects; no text; no watermark; do not include the knife in body or hand assets
Avoid: redesigning the character; changing camera angle; merging limbs into the torso; white or checkerboard background; cropped joints; additional accessories
```

## 文件交付结构

```text
art/characters/ren/
  reference/
    ren_side_neutral.png
    ren_knife_combo_reference.png
    ren_side_anchor_guide.png
  source/
    ren_rear_thigh_side.png
    ren_rear_shin_side.png
    ren_rear_foot_side.png
    ren_rear_arm_side.png
    ren_torso_side.png
    ren_head_side.png
    ren_front_thigh_side.png
    ren_front_shin_side.png
    ren_front_foot_side.png
    ren_garment_hem_side.png
    ren_weapon_upper_arm_side.png
    ren_weapon_forearm_side.png
    ren_weapon_hand_side.png
    ren_weapon_knife.png
```

`art/characters/ren/source/` 是唯一可编辑的高分辨率素材真源，`public/assets/characters/ren/source/` 必须由确定性脚本缩小并同步生成，不允许单独手工修改。新十四层 rig 通过验收后删除 `ren_rear_leg_side.png`、`ren_front_leg_side.png`、过时生成脚本和旧兼容路径。

## 素材验收标准

- [ ] 角色是正常人形，没有强制的人字躯干或字形四肢。
- [ ] 中性年轻游侠的身份、比例、服装和颜色在中立姿势与三段动作中一致。
- [ ] 右朝向为轻度俯视的三分之二侧身，镜像后左朝向仍然自然。
- [ ] 缩小到 72–76 逻辑像素高后，头、躯干、两臂、两腿、手和刀仍可区分。
- [ ] 十四个角色与武器部件都是真实透明背景，母图、运行时画布和根坐标一致。
- [ ] 髋、膝、踝、肩、肘、腕、手掌握点和刀柄锚点在组合与旋转时不脱节，连接误差不超过 1 逻辑像素。
- [ ] 远侧腿保持不透明且能与近侧腿区分，不形成难以辨认的平行双轮廓。
- [ ] 身体与手臂素材不包含刀、阴影、拖尾、火焰或受击效果。
- [ ] 素材外缘没有白边、矩形底或半透明脏像素。

## 游戏接入验收标准

- [ ] 鼠标左右控制朝向，20px 中线死区内不抖动；移动不改变朝向。
- [ ] 单招中途不翻面，招与招之间可以转身续击。
- [ ] 近战不能朝正上或正下追踪，左右三段的画面轨迹与命中范围一致。
- [ ] 三段连击按点击与输入窗口推进，挥空可续击，闪避、受击和超时会重置。
- [ ] 三段时长、范围、伤害、移动限制、击退与镜头反馈符合规格。
- [ ] 每招可命中多个敌人，同一招不会对同一敌人重复结算。
- [ ] 身体带动肩、肘、腕和刀完成动作，刀柄始终连接手掌。
- [ ] 前进、后退和纵向移动使用按实际路程推进的步态，支撑期脚掌漂移不超过 1.5 逻辑像素。
- [ ] 待机、移动、闪避、受击和死亡使用同一套侧身骨架且全身动作姿势可读。
- [ ] 转身、方向切换和连击换侧保持支撑脚与姿势连续，不出现脚部瞬移。
- [ ] 火球等远程能力仍可全方向瞄准。
- [ ] 1024×768 逻辑画布、1280×900 桌面视口与 390×844 窄屏 FIT 缩放下角色和刀均清晰，无 UI 遮挡。
