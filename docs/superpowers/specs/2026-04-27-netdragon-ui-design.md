# 网龙风 UI 体系改造 — 设计方案

> 日期:2026-04-27
> 状态:待审阅
> 作者:产品经理(Bill) + 设计协作 Claude
> 范围:整个 AI Workforce Platform 的视觉体系重构

---

## 0. 背景与目标

AI Workforce Platform 目前采用标准 shadcn/ui + Tailwind 的通用后台风格,视觉上与任何一般 SaaS 管理面板区分不明显,缺少"网龙(NetDragon)"的品牌辨识度。本方案为平台引入一套完整的"网龙风 UI 体系",覆盖:

- **设计语言**(核心隐喻 + 性格词 + 视觉铁律)
- **Design Tokens**(颜色 / 字体 / 间距 / 阴影 / 动效)
- **AI 生成素材体系**(9 个家族 · 90 张素材 · 基于 gpt-image-2)
- **组件库改造**(15 个 shadcn 改造 + 12 个网龙专属组件 + 3 个素材原语)
- **旗舰页蓝图**(驾驶舱)
- **生产管线**(Prompt 工程 + 三闸审核 + 降级策略 + 性能预算)
- **分期路线**(5 阶段 · 6 周)

**最终交付形态**:规范文档 + 素材包 + 组件库 + 全站页面重构(用户选项 C)。

---

## 1. 关键决策摘要

| 决策 | 选择 | 备注 |
|---|---|---|
| 视觉基调 | B 教育科技感为基底 + A 游戏科幻感高光 + C 企业仪式点缀 | 混合方案,按场景分层 |
| AI 图角色 | ② 装饰素材(背景 / 插画 / 徽章 / 空状态) | UI 骨架手写代码,AI 图只做"皮肤" |
| 素材覆盖 | 极致沉浸(~90 张) | 用户坚持,配套四项风险缓解机制 |
| 交付范围 | C:规范 + 素材 + 组件库 + 全站页面重构 | 最彻底的方案 |
| 明暗模式 | 只做亮色 | 保留 Layer 3 深色高光仅用于展示区 |
| 品牌 VI | 无官方 VI,按"类网龙风"推测 | 后续拿到 VI 可覆盖调整 |
| 推进路径 | 乙:旗舰页优先 → 沉淀规范 → 扩散 | 产品经理主导,早见实物 |

**已向用户提醒并接受的风险**:
1. 一致性漂移(AI 生图每次略微不同)
2. 性能压力(素材总量大)
3. 成本(一次性 ~$16,一年维护 ~$22)
4. 维护成本(需要长期守规范)

**用户硬性要求**:批次 1 必须 top-tier 质量,HTML/CSS 蓝图永远代替不了真图,"震撼感"是生死线。

---

## 2. 设计语言

### 2.1 核心隐喻:数智工厂(Digital Craft Factory)

不展示"一群 AI 机器人",而是展示"一座运转中的 AI 工厂"。这个隐喻贯穿视觉、文案、素材和命名。

### 2.2 三组性格词

1. **通透 / 明亮**(B 教育科技)—— 大留白、柔光、透明玻璃质感
2. **精密 / 能量流动**(A 游戏科幻)—— 六边形暗纹、能量高亮、光流动效
3. **庄重 / 工艺**(C 企业仪式)—— 仅用于成就 / 里程碑 / 季度总结

### 2.3 五条视觉铁律

- 留白 > 填充(宁可空,不要挤)
- 一张图只讲一件事
- 动效只为"引导视线"服务(不炫技、不循环动)
- AI 素材 = 场景,不是贴图(每张要有叙事)
- 深色元素只在展示区,操作区永远明亮

---

## 3. Design Tokens

落地在 `src/app/globals.css`,以 `--nd-*` 命名空间,不污染 shadcn 原有变量。

### 3.1 颜色(3 层)

**Layer 1 · 基底层(日常操作)**
```
--nd-ink:          hsl(215 35% 15%)   深墨蓝   文字主色
--nd-ink-soft:     hsl(215 20% 40%)   柔墨蓝   次要文字
--nd-surface:      hsl(0 0% 100%)     纯白     卡片底
--nd-canvas:       hsl(215 30% 97%)   冷白     页面底
--nd-line:         hsl(215 20% 90%)   细线灰   分割线
```

**Layer 2 · 品牌层**
```
--nd-primary:      hsl(218 95% 52%)   电光蓝   主交互色
--nd-primary-deep: hsl(225 75% 35%)   深潜蓝   hover / active
--nd-secondary:    hsl(172 85% 42%)   科技青   AI / 数据色
--nd-accent:       hsl(38 95% 58%)    琥珀金   高亮 / 徽章
--nd-violet:       hsl(268 75% 62%)   管理紫   管理团队
--nd-emerald:      hsl(156 72% 44%)   生产绿   生产团队
--nd-sapphire:     hsl(218 95% 52%)   设计蓝   设计团队(= primary)
```

**Layer 3 · 高光层(仅展示区)**
```
--nd-void:         hsl(225 50% 8%)    深空底
--nd-void-glow:    hsl(218 95% 52%)   电光蓝
--nd-void-edge:    hsl(172 85% 50%)   科技青
--nd-gold-line:    hsl(42 65% 58%)    古金(C 仪式感)
```

**语义色**
```
--nd-success: hsl(156 72% 44%)   = emerald
--nd-warning: hsl(38 95% 58%)    = accent
--nd-danger:  hsl(358 75% 55%)   朱红
--nd-info:    hsl(172 85% 42%)   = secondary
```

### 3.2 字体

```
--nd-font-sans:    "HarmonyOS Sans SC", "PingFang SC", "Noto Sans CJK SC",
                   "Inter", system-ui, sans-serif;
--nd-font-display: "Orbitron", "HarmonyOS Sans SC", sans-serif;
--nd-font-serif:   "Source Han Serif SC", "Noto Serif CJK", serif;
--nd-font-mono:    "JetBrains Mono", monospace;
```

所有字体均为 Google Fonts / 开源,无版权负担。Orbitron 仅用于"数字大标题高光"(KPI / Hero 数值)。

**字号阶梯(8 级)**
| 名称 | 值 | 用途 |
|---|---|---|
| xs | 11px/1.5 | 角标、辅助说明 |
| sm | 13px/1.5 | 次要信息 |
| base | 14px/1.6 | 正文(保留现有) |
| md | 16px/1.5 | 小标题 |
| lg | 20px/1.4 | 区块标题 |
| xl | 28px/1.2 | 页面标题 |
| 2xl | 40px/1.1 | 驾驶舱 KPI 大数字 |
| 3xl | 64px/1.0 | Hero 欢迎语 |

### 3.3 间距(章节节奏)

- 组件内部:`gap-2 / p-3 / p-4`(8~16px)
- 卡片之间:`gap-4 / gap-6`(16~24px)
- 章节之间:`py-10 / py-16`(40~64px)
- 页面首屏 Hero:`py-20`(80px)

### 3.4 圆角

```
--nd-radius-sm:   6px      小标签 / 徽章
--nd-radius-md:   10px     按钮 / 输入框 / tag
--nd-radius-lg:   16px     卡片(保留现有)
--nd-radius-xl:   24px     Hero 卡片 / 大块展示区
--nd-radius-full: 9999px
```

### 3.5 阴影(冷蓝光影)

不用灰影,用带冷色调的光影,增加科技浮动感。

```
--nd-shadow-xs:   0 1px 2px  hsl(218 80% 30% / 0.06)
--nd-shadow-sm:   0 2px 8px  hsl(218 80% 30% / 0.08)
--nd-shadow-md:   0 8px 24px hsl(218 80% 30% / 0.10)
--nd-shadow-lg:   0 16px 48px hsl(218 80% 30% / 0.14)
--nd-shadow-glow: 0 0 24px   hsl(218 95% 52% / 0.35)   仅激活态
```

### 3.6 动效

```
--nd-ease-out:    cubic-bezier(0.25, 1, 0.5, 1)        常规进场
--nd-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)    弹入(徽章)
--nd-dur-fast:    150ms                                 微交互
--nd-dur-base:    250ms                                 常规
--nd-dur-slow:    450ms                                 章节进场
```

**能量流动(全局动效)**
- 进度条、连接线、激活态,统一使用 `flow` 关键帧(沿路径循环流动的光带)
- 用 `linear-gradient` + `background-position` 动画实现,全局复用一套 CSS class
- 默认开启 —— 用户可在「系统设置 → 外观」中关闭动效

### 3.7 透明玻璃

```
--nd-glass-bg:     hsl(0 0% 100% / 0.72)
--nd-glass-border: hsl(218 50% 70% / 0.35)
--nd-glass-blur:   16px
```

用于 Hero、浮层、详情弹窗等高层级界面。

---

## 4. 素材体系

### 4.1 9 个家族

```
assets/netdragon/
├── hero/              (6 张)  首屏 Hero 背景 — 每主页面一张
├── scene/             (24 张) 员工场景插画 — 每个 AI 员工一张
├── banner/            (9 张)  章节头图 — 3 团队 × 3 子版块
├── badge/             (18 张) 成就徽章 — 任务 / 质量 / 效率 / 创新
├── empty-state/       (8 张)  空状态插画
├── ornament/          (12 张) 页面装饰角标 — 六边形 / 流动光 / 粒子云
├── widget-bg/         (6 张)  卡片局部纹理底
├── milestone/         (4 张)  里程碑大图 — 季度 / 年度 / 周年
└── texture/           (3 张)  全局背景纹理(超淡)
                       总计:90 张
```

### 4.2 Prompt 三层拼接

```
[global-anchor.txt]      全局风格锚点(颜色 / 光线 / 密度 / Do & Don't)
+ [family-<name>.txt]    家族基座模板(构图 / 姿势 / 内容骨架)
+ [catalog.promptVars]   本张差异化变量替换到家族模板的 <PLACEHOLDER>
+ [tier modifier]        top-tier 素材追加"ultra-high quality..."
```

**全局锚点示例**:

```
cinematic digital illustration in the style of NetDragon brand,
semi-realistic with soft anime painterly quality, clean lines,
vibrant but restrained color palette, core palette: electric blue
#1E6EFF, tech cyan #14C7C1, amber gold #F5A623, deep ink navy #0B1A3A,
pure white highlights; gentle rim light from top-right, soft ambient
occlusion, subtle hexagonal tech pattern as environmental hint,
ultra-clean composition with generous negative space, no text or
logos, 16:9 aspect ratio unless specified, production-quality final
asset for a SaaS dashboard, consistent lighting across all pieces
```

### 4.3 一致性锚点(3 机制)

1. **种子批次**:同家族所有图一次会话内批量生成
2. **Reference Image 锚定**:第一张作为参考图传入后续 prompt,要求"in the exact same visual style"
3. **人工三审**:色调 / 光线方向 / 构图密度,任意一条不过立即重生成

### 4.4 资产规格

```
命名:<family>-<subject>-<variant>.png
     例:scene-ai-game-designer-idle.png
         badge-efficiency-gold.png
         hero-dashboard-default.png

格式:
  - 源文件:PNG(保留为"母版")
  - 生产文件:WebP,quality=85,两档尺寸 @1x / @2x
  - 徽章 / ornament:透明 PNG + 额外 SVG 替身(降级用)
  - Hero / Banner:裁切 3 尺寸(desktop 1920w / tablet 1024w / mobile 640w)

目录:
  public/netdragon/
    scene/
      ai-game-designer-idle.webp
      ai-game-designer-idle@2x.webp
    badge/
      efficiency-gold.webp
      efficiency-gold.svg         降级替身
```

### 4.5 生产工具链

```
scripts/
  generate-netdragon-assets.ts      主生成脚本(基于现有 generate:avatars 扩展)
  nd-catalog.json                   90 张素材清单(单一数据源)
  nd-prompts/
    global-anchor.txt
    family-<name>.txt × 9
  nd-post-process.ts                PNG → WebP + 多尺寸派生
  nd-generate-fallback.ts           徽章 / ornament 的 SVG 降级生成
```

### 4.6 Catalog 结构(示例)

```json
{
  "hero-dashboard": {
    "family": "hero",
    "subject": "dashboard welcome",
    "promptVars": {
      "TOPIC": "AI workforce command center",
      "HERO-SUBJECT": "ethereal holographic dashboard suspended in clean factory space"
    },
    "sizes": [
      { "label": "desktop", "width": 1920, "height": 600 },
      { "label": "tablet",  "width": 1024, "height": 380 },
      { "label": "mobile",  "width": 640,  "height": 360 }
    ],
    "tier": "top",
    "fallback": { "type": "gradient", "from": "#0B1A3A", "to": "#142651" }
  }
}
```

---

## 5. 组件库改造

### 5.1 现有 shadcn 组件改造(15 个)

目标:换 Tokens,不换 API 和 props。现有页面不破坏。

| 组件 | 改造要点 |
|---|---|
| button | primary 渐变 + 冷蓝阴影 + hover 辉光;新增 variant: "energy" |
| card | 默认冷蓝阴影 sm,hover 升 md,圆角 lg;新增 variant: "glass" / "void" |
| badge | 状态色映射 nd-* 语义;新增 variant: "gold" |
| input | focus ring 双层(内 primary + 外微辉光) |
| select | 下拉面板加玻璃质感 + 冷蓝投影 |
| dialog | 遮罩 backdrop-blur,弹窗默认 glass variant |
| tabs | active tab 2px 电光蓝下划线 + 流光 |
| table | header 浅冷灰底,hover 行淡蓝光 |
| progress | 默认启用能量流动 |
| tooltip | 深墨蓝底 + 电光蓝细边 |
| separator | 新增 variant: "gold" |
| alert-dialog | 跟随 dialog |
| label | 小字上推 + tracking-wide |
| textarea | 跟随 input |
| skeleton | 冷蓝底 + 光流过 shimmer |

### 5.2 新增网龙专属组件(12 个)

路径:`src/components/netdragon/nd-*.tsx`

| 组件 | 用途 |
|---|---|
| NdHero | 页面 Hero 区(背景图 + 标题 + CTA) |
| NdStatCard | KPI 大数字卡(Orbitron + 流光边 + 趋势) |
| NdSectionBanner | 章节头图条(左文右图 + 光束分隔) |
| NdScenePortrait | 员工场景立绘(替代详情场景的 AiAvatar) |
| NdAchievementBadge | 成就徽章(弹入动效 + 光流环) |
| NdEnergyBar | 能量条(流动光,用于产能 / 进度) |
| NdPipelineFlow | 工序流水线(节点 + 流动光连线) |
| NdEmptyState | 空状态(插画 + 文案 + CTA) |
| NdGlassPanel | 玻璃面板(Hero 浮层 / 数据块容器) |
| NdVoidBlock | 深色高光块(驾驶舱 / 欢迎页) |
| NdTeamCrest | 团队徽记(三团队图腾) |
| NdMilestoneCard | 里程碑卡(C 仪式感,深蓝 + 金线 + serif) |

每个组件都支持 `fallback` prop,用于低网速 / 低端设备 / 素材加载失败时的降级形态。

### 5.3 素材包装层(3 个底层)

路径:`src/components/netdragon/primitives/`

- `nd-asset.tsx` —— 包装 next/image + 自动 @1x/@2x + WebP fallback 链 + lazy + fallback 插槽
- `nd-asset-svg.tsx` —— SVG 替身专用(徽章 / ornament 降级路径)
- `nd-asset-catalog.ts` —— 单一数据源,所有 90 张素材的清单

**纪律(用户确认接受)**:业务组件不直接写网龙样式,必须通过 `netdragon/` 包消费设计语言。

### 5.4 目录结构

```
src/components/
├── ui/                shadcn 原地改造,API 不变
├── netdragon/
│   ├── primitives/    3 个素材包装
│   ├── nd-*.tsx       12 个展示组件
│   └── index.ts       统一导出
├── dashboard/         业务组件,依赖 netdragon/
├── roster/            同上
├── production/        同上
```

---

## 6. 旗舰页「驾驶舱」视觉蓝图

### 6.1 5 区块结构

```
区块 1 · Hero 欢迎区       Layer 3 深色高光
  - 组件:NdVoidBlock + NdHero
  - 素材:hero-dashboard + ornament-hexflow
  - 文案:拟人化叙事("24 位 AI 员工在岗 · 今日 187 个任务流转中 · 整体产能 92%")

区块 2 · 核心 KPI 矩阵     4 张白底卡
  - 组件:NdStatCard × 4
  - 内容:本月完成任务 / 平均采纳率 / 节省工时 / Token 成本
  - 特征:Orbitron 大数 + 顶部流光彩带

区块 3 · 产线 × 团队       左 2/3 + 右 1/3
  - 左:NdPipelineFlow(立项 → 设计 → 生产 → 评审 → 入库,节点间流光)
  - 右:三团队状态卡(NdTeamCrest + 紫 / 蓝 / 绿团队色)

区块 4 · 本周明星员工       3 张场景立绘卡
  - 组件:NdScenePortrait × 3
  - 素材:scene-ai-* 3 张
  - 特征:玻璃底部信息条 + 排名徽章

区块 5 · 活动流 + 热力图    左 3/5 + 右 2/5
  - 活动流:状态点使用流光;保留现有功能
  - 热力图:使用三团队色锚点
```

### 6.2 设计语言落点

- Layer 3 深色块仅用于 Hero,操作区保持明亮
- Orbitron 数字仅用于 KPI 大数值和百分比
- 能量流动动效在产线连线 / KPI 顶部光带 / 活动流状态点
- 玻璃质感用于明星员工卡底部信息条
- 三团队色在团队状态 / 热力图 / 产线节点作为锚点
- AI 素材:hero × 1 + scene × 3 + ornament × 2 = 批次 1 即可满足旗舰页

---

## 7. 生产管线

### 7.1 Prompt 三层拼接(见 §4.2)

### 7.2 三闸审核

**闸 1 · 程序校验(自动)**
- 尺寸 / 大小符合 catalog
- 色板占比 ≥ 30%:下采样到 64×64,每像素归到最近的锚点色(含 L1/L2/L3 所有色),Layer 2 品牌色(primary / secondary / accent)总占比 ≥ 30%
- 非全黑 / 全白 / 全糊:标准差 > 15(0-255 灰度)

**闸 2 · 人工审核(用户在 Visual Companion 里看 — 用户已同意每批次审核)**
- 色调在锚点色板内
- 光线方向统一(top-right rim)
- 构图密度一致
- 任一不过 → 重生成,最多 8 次(tier: "top")

**闸 3 · 一致性对比**
- 同家族全部并排对比
- 不合群单独重做

### 7.3 降级策略

`NdAsset` 底层统一处理,触发任一即降级:
- `navigator.connection.effectiveType` ∈ { `2g`, `slow-2g` }
- `navigator.connection.saveData === true`
- 图片加载超时 5s 或失败
- 用户在「系统设置 → 外观」手动关闭 AI 素材(用户已同意加此开关)

Fallback 类型:
```ts
type Fallback =
  | { type: "gradient"; from: string; to: string }
  | { type: "svg";      path: string }
  | { type: "solid";    color: string };
```

### 7.4 性能预算(CI 硬约束)

| 指标 | 上限 |
|---|---|
| 单张 @1x WebP | ≤ 80 KB |
| 单张 @2x WebP | ≤ 180 KB |
| 首屏图片总和 | ≤ 400 KB |
| 整站素材总量 | ≤ 18 MB |
| 驾驶舱首屏 LCP | ≤ 2.5s |
| 驾驶舱首屏 CLS | ≤ 0.1 |

CI 新增 `nd:budget-check` 步骤扫描 `public/netdragon/**`,超标立即失败。

### 7.5 成本预算

```
批次 1 (~15 张 · top-tier 迭代 8 次):  ~$4.8
批次 2 (~33 张 · 迭代 5 次):            ~$6.6
批次 3 (~42 张 · 迭代 3 次):            ~$5.0
首次生产合计:                            ~$16.4
一年维护(每月 5 张修改):                ~$6.0
一年总预算:                              ~$22.4
```

---

## 8. 分期路线

总工期:**~6 周**,5 个阶段。

### 阶段 0 · 基建(~1 周)
- Tokens 写入 `globals.css` + Tailwind 配置
- `src/components/netdragon/primitives/` 三个底层
- `nd-catalog.json` 初版
- 9 个家族 prompt 模板 + 全局锚点
- `generate-netdragon-assets.ts` 主脚本
- PNG → WebP 后处理
- CI 性能预算 lint
- Visual Companion 审核闸 2 集成

**出口**:smoke-test 生 1 张,全流程跑通。

### 阶段 1 · 旗舰页驾驶舱(~1.5 周)— 生死线

**Step 1**:批次 1 素材生成(15 张,top-tier 迭代)

**Step 2**:6 个核心 Nd 组件 + 3 个 shadcn 改造(Card / Badge / Progress)

**Step 3**:驾驶舱 5 区块重构

**出口**:Lighthouse ≥ 90;用户打开说"这就是网龙味"。不达标止步迭代。

### 阶段 2 · 沉淀(~0.5 周)
- `docs/netdragon-ui/README.md` 设计语言
- `tokens.md` / `components.md` / `assets.md` / `prompt-cookbook.md`
- 修正阶段 1 发现的 Token 缺口和组件 API 不足

**出口**:另一个工程师按文档能独立实现新组件 / 生成新素材。

### 阶段 3 · 扩散 A(~1.5 周)
- 花名册(NdScenePortrait 升级员工卡 + banner + empty-state)
- 生产看板(NdPipelineFlow 做任务流转 + NdEnergyBar 产能条)
- 批次 2 素材(33 张)

### 阶段 4 · 扩散 B(~1.5 周)
- 组织架构(NdTeamCrest 节点头图 + 流光连线)
- 系统设置(加入"关闭 AI 素材"用户开关)
- 帮助中心(玻璃面板 + Nd 样式)
- 欢迎页(Layer 3 深色 Hero)
- 批次 3 素材(42 张)

### 冷静期
阶段之间至少 1 天冷静期,审美疲劳测试 + 决策是否按原计划继续。

### 风险预案

| 风险 | 预案 |
|---|---|
| 一致性漂移 | 三闸审核 + 同 session 批量 + reference-image 锚定 |
| 性能压力 | CI 预算 + Lighthouse 卡点 |
| 成本失控 | tier 决定迭代上限 |
| 维护成本 | 文档 + catalog 单一数据源 |
| 震撼感不够 | 阶段 1 Step 1 出口不过 → 止步迭代 |

---

## 9. 未决项 / 后续可能

1. **VI 资料若到位**:全套 Token(尤其是 `--nd-primary`)和 logo 需按官方 VI 覆盖调整,组件 API 不变。
2. **深色模式**:本期只做亮色;若未来有需要,Layer 3 已经是深色底,复用其色板即可扩展出深色主题。
3. **国际化**:当前所有文案中文,若未来做英文/繁体,拟人化叙事文案需要本地化重写。
4. **动效疲劳**:"能量流动"全局默认开启,需要观察长期使用是否产生疲劳;可在系统设置里给一个"减少动效"开关。
5. **第二期素材扩展**:如阶段 3/4 落地后产生新需求(如新业务页面),catalog 扩展即可,不触动规范。

---

## 10. 附录 · 决策索引(可追溯)

| 决策 | 用户选择 |
|---|---|
| 风格方向 | 采纳推荐:B 基底 + A 高光 + C 仪式 |
| AI 图角色 | ② 装饰素材 |
| 素材规模 | 极致沉浸 |
| 交付范围 | C 全面重构 |
| 明暗模式 | 只做亮色 |
| VI 资料 | 无,按相似感 |
| 推进路径 | 乙 旗舰页优先 |
| 核心隐喻 | 接受"数智工厂" |
| 字体 | 采纳 Orbitron + HarmonyOS Sans(免费) |
| 三团队色 | 保留微调 |
| 能量流动动效 | 接受,喜欢 |
| 90 张素材分类 | 接受 |
| Nd 组件命名与纪律 | 接受 |
| 5 区块 / 拟人化文案 | 接受 |
| 人工审核 | 愿意每批次审图 |
| 关闭 AI 素材开关 | 做 |
