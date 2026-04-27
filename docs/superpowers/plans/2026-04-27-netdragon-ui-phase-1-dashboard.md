# 阶段 1 · 旗舰页驾驶舱 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把驾驶舱(`/dashboard`)改造成"网龙味扑面而来"的旗舰页,验证整套 Nd 组件 + 素材 + Tokens 在真实业务场景能跑通,为后续扩散到其他页面提供样板。

**Architecture:** 分 3 个 Step group,顺序依赖。Step A(素材)先跑 15 张顶级 AI 图 + 人工审核;Step B(组件)基于已就位的素材实现 6 个核心 Nd 组件 + 3 个 shadcn 改造(card/badge/progress);Step C(页面重构)用 Nd 组件从头重写 DashboardShell 的 5 个区块,保留现有业务数据流(服务端 data fetching + props 传递)不动。页面文件改造遵循"叠加而非推翻"原则:现有业务组件(kpi-section、team-status-panel 等)的 props 接口保持兼容,内部实现用 Nd 组件重绘视觉。

**Tech Stack:** 阶段 0 的基建 · Next.js 16 App Router · React 19 · Tailwind v4 · shadcn/ui(@base-ui/react) · `echarts-for-react`(已存在,保留) · gpt-image-2 API · sharp

**重要约束:**

- **这是阶段 1 生死线**。Step A 批次 1 出图如果不够"网龙味",**止步迭代 prompt,不进入 Step B**。
- 批次 1 的 15 张素材一次性生成,同一 session 保持风格一致(spec §4.3 一致性锚点 #1)。每张 top-tier 允许最多 8 次重试。
- **业务数据流 / API 路由不动**。本阶段只改视觉层。DashboardPage(`page.tsx`)保留 server component 取数逻辑,`DashboardShell` 的 props 接口保持兼容。
- **项目无测试框架**,沿用阶段 0 的"运行时命令 + 视觉验收"模式。
- **每新素材经过闸 1(自动色板/尺寸) + 闸 2(人工 Visual Companion 审核) + 闸 3(同家族一致性对比)**。用户已明确同意每批次亲自审图。
- **`/nd-smoke` 页面阶段 1 结束后删除**。

**阶段 1 出口验收(生死线):**
- 所有 15 张素材入库 + 人工三闸审核全过
- 驾驶舱页面 Lighthouse 性能 ≥ 90
- 用户打开 `/dashboard` 亲口说"这就是网龙味"
- 如果不达标 → 迭代,不进入阶段 2

---

## 文件结构总览

### Step A:素材生成(15 张 + catalog 扩展)

```
scripts/nd-catalog.json             扩展:新增 13 个 entry(hero-dashboard/scene×6 候选/badge×6 候选/ornament×2)
public/netdragon/hero/              新建目录:hero-dashboard-{desktop,tablet,mobile}.webp + @2x
public/netdragon/scene/             新建目录:scene-ai-{game-designer, role-designer, screenwriter, product-manager, character-designer, movie-artist}-card.webp + @2x
public/netdragon/badge/             新建目录:badge-{weekly-top, efficiency-gold, quality-gold, innovation-gold, collab-gold, reliability-gold}-default.webp + @2x
public/netdragon/ornament/          扩展:ornament-{hexflow, lightstream}-default.webp + @2x
public/netdragon/_fallback/         扩展:scene-generic.svg(已有) + badge-generic.svg(新增)
scripts/nd-prompts/                 按 reviewer 建议,hero 和 scene 在阶段 0 已加 DNA 锚点;badge/ornament 本步骤可能微调
```

### Step B:组件(3 改造 + 6 新增 + 1 shared helper)

```
# shadcn 改造(只改样式,不改 API):
src/components/ui/card.tsx          新增 variant: "glass" | "void"
src/components/ui/badge.tsx         新增 variant: "gold"
src/components/ui/progress.tsx      默认启用 .nd-flow 动效

# Nd 新组件:
src/components/netdragon/nd-void-block.tsx          深色 Hero 载体(Layer 3 高光,含星舰暗纹)
src/components/netdragon/nd-stat-card.tsx           KPI 大数字卡(Orbitron + 顶部流光带 + 趋势箭头)
src/components/netdragon/nd-pipeline-flow.tsx       产线水平流水线(节点 + 流动光连线)
src/components/netdragon/nd-team-crest.tsx          团队徽记(管理紫/设计蓝/生产绿,3 种渐变变体)
src/components/netdragon/nd-scene-portrait.tsx      员工场景立绘卡(玻璃底部信息条 + 排名徽章)
src/components/netdragon/nd-achievement-badge.tsx   成就徽章(弹入动效 + 光流环 + tooltip)

src/components/netdragon/index.ts                   更新:导出 6 个新组件
```

### Step C:驾驶舱重构(5 区块)

```
src/components/dashboard/dashboard-shell.tsx       重构:5 区块布局,用 Nd 组件替换现有视觉
src/components/dashboard/kpi-section.tsx           重构:内部改用 NdStatCard × 4
src/components/dashboard/team-status-panel.tsx     重构:内部改用 NdTeamCrest × 3
src/components/dashboard/task-feed.tsx             保留功能,微调样式(活动流状态点加 .nd-flow)
src/components/dashboard/achievement-feed.tsx      保留功能,改用 NdAchievementBadge
src/components/dashboard/operational-index-gauge.tsx   整合进 Hero 区,作为 NdVoidBlock 右侧浮动指标(不再独立大卡)
src/components/dashboard/team-comparison-chart.tsx     保留 echarts,容器改为 bg-nd-surface shadow-nd-md
src/components/dashboard/leaderboard-panel.tsx         保留,样式微调(名次徽章改用 NdAchievementBadge)
src/components/dashboard/activity-heatmap.tsx           保留,团队色锚点用 --color-nd-violet/sapphire/emerald

# 新增区块 3 "产线 × 团队" 的数据源:
src/lib/dashboard-data.ts          新增函数 getPipelineFlowStats() — 5 个节点的今日任务计数
```

### 不涉及(留给阶段 2+)

- 其他 9 个 Nd 组件(NdHero/NdSectionBanner/NdEnergyBar/NdEmptyState/NdGlassPanel/NdMilestoneCard 等)→ 阶段 2 沉淀时可能回补
- 其余 12 个 shadcn 改造(button/input/select/dialog/tabs/table/tooltip/separator/alert-dialog/label/textarea/skeleton)→ 阶段 3+
- 花名册 / 生产看板 / 组织架构 / 系统设置 / 帮助中心 → 阶段 3-4
- 其余 75 张素材(阶段 2 批次 2 + 阶段 3 批次 3)

---

## 任务列表

---

# Step A:素材批次 1(15 张)

## Task A1:扩展 catalog 条目

**Files:**
- Modify: `scripts/nd-catalog.json`

**步骤:**

- [ ] **Step 1:在 catalog 的 assets 中新增 13 个条目**

读当前的 `scripts/nd-catalog.json`,在 `"assets"` 对象中保留现有 3 条(smoke-test, hero-dashboard, scene-ai-game-designer),在 scene-ai-game-designer 之后追加 13 个新条目。**保持 JSON 格式正确,注意逗号位置**。完整的 catalog 目标状态:

```json
{
  "$schema": "./nd-catalog.schema.json",
  "version": "0.2.0",
  "assets": {
    "smoke-test": { /* 保持不变 */ },
    "hero-dashboard": { /* 保持不变 */ },
    "scene-ai-game-designer": { /* 保持不变 */ },

    "scene-ai-role-designer": {
      "family": "scene",
      "subject": "AI Role Designer workstation",
      "promptVars": {
        "NAME": "AI Role Designer",
        "ROLE": "character and IP visual designer",
        "MOOD": "inspired and observant",
        "GESTURE": "one hand sketching in the air, one hand resting on a holo-palette",
        "TEAM-COLOR": "sapphire blue"
      },
      "sizes": [{ "label": "card", "width": 800, "height": 1000 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "scene-generic.svg" }
    },
    "scene-ai-screenwriter": {
      "family": "scene",
      "subject": "AI Screenwriter workstation",
      "promptVars": {
        "NAME": "AI Screenwriter",
        "ROLE": "narrative and story designer",
        "MOOD": "thoughtful and immersed",
        "GESTURE": "leaning slightly forward reading floating story cards",
        "TEAM-COLOR": "emerald green"
      },
      "sizes": [{ "label": "card", "width": 800, "height": 1000 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "scene-generic.svg" }
    },
    "scene-ai-product-manager": {
      "family": "scene",
      "subject": "AI Product Manager workstation",
      "promptVars": {
        "NAME": "AI Product Manager",
        "ROLE": "structured feature orchestration",
        "MOOD": "composed and focused",
        "GESTURE": "arranging colored tags on a floating kanban",
        "TEAM-COLOR": "sapphire blue"
      },
      "sizes": [{ "label": "card", "width": 800, "height": 1000 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "scene-generic.svg" }
    },
    "scene-ai-character-designer": {
      "family": "scene",
      "subject": "AI Character Designer workstation",
      "promptVars": {
        "NAME": "AI Character Designer",
        "ROLE": "original character concept artist",
        "MOOD": "playful and creative",
        "GESTURE": "conducting a floating 3D character turnaround",
        "TEAM-COLOR": "emerald green"
      },
      "sizes": [{ "label": "card", "width": 800, "height": 1000 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "scene-generic.svg" }
    },
    "scene-ai-movie-artist": {
      "family": "scene",
      "subject": "AI Movie Artist workstation",
      "promptVars": {
        "NAME": "AI Movie Artist",
        "ROLE": "cinematic scene and camera director",
        "MOOD": "precise and cinematic",
        "GESTURE": "framing a shot with both hands in front of a floating 3D set",
        "TEAM-COLOR": "emerald green"
      },
      "sizes": [{ "label": "card", "width": 800, "height": 1000 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "scene-generic.svg" }
    },

    "badge-weekly-top": {
      "family": "badge",
      "subject": "Weekly Top Performer medal",
      "promptVars": {
        "ICON-CONCEPT": "a five-pointed star fused with a coiled cyber-dragon, floating above a tiny Enterprise-starship saucer silhouette"
      },
      "sizes": [{ "label": "default", "width": 512, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "badge-generic.svg" }
    },
    "badge-efficiency-gold": {
      "family": "badge",
      "subject": "Efficiency gold medal",
      "promptVars": {
        "ICON-CONCEPT": "a stylized lightning bolt passing through a hexagonal gem, with a subtle dragon-scale texture on the rim"
      },
      "sizes": [{ "label": "default", "width": 512, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "badge-generic.svg" }
    },
    "badge-quality-gold": {
      "family": "badge",
      "subject": "Quality gold medal",
      "promptVars": {
        "ICON-CONCEPT": "a shield with a checkmark in its center, flanked by two dragon whiskers made of light ribbons"
      },
      "sizes": [{ "label": "default", "width": 512, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "badge-generic.svg" }
    },
    "badge-innovation-gold": {
      "family": "badge",
      "subject": "Innovation gold medal",
      "promptVars": {
        "ICON-CONCEPT": "a glowing idea-spark emerging from a dragon's mouth, composed of hexagonal data fragments"
      },
      "sizes": [{ "label": "default", "width": 512, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "badge-generic.svg" }
    },
    "badge-collab-gold": {
      "family": "badge",
      "subject": "Collaboration gold medal",
      "promptVars": {
        "ICON-CONCEPT": "three interlocking hexagonal nodes connected by flowing blue-cyan energy ribbons forming a triangle"
      },
      "sizes": [{ "label": "default", "width": 512, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "badge-generic.svg" }
    },
    "badge-reliability-gold": {
      "family": "badge",
      "subject": "Reliability gold medal",
      "promptVars": {
        "ICON-CONCEPT": "a fortified octagonal core with an infinity loop made of dragon-energy encircling it"
      },
      "sizes": [{ "label": "default", "width": 512, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "svg", "path": "badge-generic.svg" }
    },

    "ornament-hexflow": {
      "family": "ornament",
      "subject": "hex-flow decorative band for top-right corners",
      "promptVars": {
        "MOTIF": "a flowing cascade of interconnected hexagons forming a half-arch in the top-right area, with a tiny cyber-dragon tail curling through it, positioned against transparent background for overlay use"
      },
      "sizes": [{ "label": "default", "width": 1024, "height": 512 }],
      "tier": "top",
      "fallback": { "type": "gradient", "from": "#1E6EFF", "to": "#14C7C1" }
    },
    "ornament-lightstream": {
      "family": "ornament",
      "subject": "horizontal light stream for section dividers",
      "promptVars": {
        "MOTIF": "a single horizontal beam of flowing blue-cyan energy with soft particles drifting along it, 4:1 aspect, meant to be placed as a divider between page sections, hints of Enterprise-starship warp-nacelle on the right end"
      },
      "sizes": [{ "label": "default", "width": 1600, "height": 400 }],
      "tier": "top",
      "fallback": { "type": "gradient", "from": "#1E6EFF", "to": "#14C7C1" }
    }
  }
}
```

- [ ] **Step 2:验证 JSON 有效**

Run:
```bash
cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && python3 -m json.tool scripts/nd-catalog.json > /dev/null && echo "valid JSON"
```

Expected:`valid JSON`

- [ ] **Step 3:dry-run 所有新增条目验证 prompt 拼装**

Run:
```bash
npm run nd:generate -- --batch=1 --dry-run 2>&1 | grep -c "^\[DRY\]"
```

Expected:数字 16(=1 hero × 3 sizes + 6 scene × 1 size + 6 badge × 1 size + 2 ornament × 1 size — 但 smoke-test 不在 batch=1,hero 3 sizes 都算,所以是 3+6+6+2=17?不对,hero 是 1 entry × 3 sizes,scene 是 6 entries × 1 size,badge 是 6 × 1,ornament 是 2 × 1,加起来 3+6+6+2=17)。**正确的期望:17**。

- [ ] **Step 4:提交**

```bash
git add scripts/nd-catalog.json
git commit -m "feat(nd-ui): extend catalog with batch-1 entries (hero + 6 scenes + 6 badges + 2 ornaments)"
```

---

## Task A2:添加 badge-generic.svg 降级替身

**Files:**
- Create: `public/netdragon/_fallback/badge-generic.svg`

**步骤:**

- [ ] **Step 1:创建通用徽章 SVG 替身**

写入 `public/netdragon/_fallback/badge-generic.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="成就徽章(降级)">
  <defs>
    <radialGradient id="ndBadgeBg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#14C7C1"/>
      <stop offset="60%" stop-color="#1E6EFF"/>
      <stop offset="100%" stop-color="#0B1A3A"/>
    </radialGradient>
    <radialGradient id="ndBadgeRim" cx="0.5" cy="0.5" r="0.5">
      <stop offset="90%" stop-color="#F5A623" stop-opacity="0"/>
      <stop offset="100%" stop-color="#F5A623" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#ndBadgeBg)"/>
  <circle cx="256" cy="256" r="240" fill="url(#ndBadgeRim)" opacity="0.7"/>
  <polygon points="256,140 310,210 396,220 332,282 348,370 256,328 164,370 180,282 116,220 202,210"
           fill="#ffffff" opacity="0.85"/>
  <circle cx="256" cy="256" r="30" fill="#1E6EFF" opacity="0.6"/>
</svg>
```

- [ ] **Step 2:确认文件存在**

Run:
```bash
ls -la public/netdragon/_fallback/
```

Expected:看到 `scene-generic.svg`(已有)和 `badge-generic.svg`(新增,~500 字节)

- [ ] **Step 3:提交**

```bash
git add public/netdragon/_fallback/badge-generic.svg
git commit -m "feat(nd-ui): add generic badge fallback svg"
```

---

## Task A3:生成批次 1 素材(17 个文件)

**这是阶段 1 生死线的开始**。如果出图不够"网龙味",整个阶段 1 止步迭代 prompt。

**Files:**
- 生成到:`public/netdragon/{hero,scene,badge,ornament}/*.png`

**步骤:**

- [ ] **Step 1:运行批次 1 生成**

Run:
```bash
cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run nd:generate -- --batch=1 2>&1 | tee /tmp/nd-batch1.log
```

Expected:
- 17 个 GEN 行,17 个 OK 行(每个 entry 每个 size 一行)
- `Summary: 17 succeeded, 0 failed`
- 耗时:约 10-15 分钟(3 秒间隔 × 17 + 每张 API 耗时 20-60 秒)

**如果有任何 FAIL**:
- 单个文件失败 → 跑 `--id=<那个 id>` 单独重试(top tier 允许 8 次)
- 超过 2 个失败 → 停下来让用户介入

- [ ] **Step 2:人工闸 2 审核(用户亲自看图)**

生成完毕后,把 17 个 PNG 路径列出来,让用户用 Preview / IDE 打开每一张,按以下标准审核:

三条硬标准(任一不过 → 重生成该图):
- 色调在电光蓝 / 科技青 / 琥珀金 / 深墨蓝 锚点内,不应有异色主导
- 光线方向统一(top-right rim light)
- 构图密度一致(不能这张极简、下一张堆满)

品牌 DNA 检查:
- hero: 应当看到星舰舰桥内饰 + 右上角数字龙能量带
- scene: 应当看到星舰舰桥工位 + 龙能量丝带 + 员工职业特征
- badge: 应当是圆形勋章 + 透明背景 + 金边描线 + 内部图标符合 ICON-CONCEPT
- ornament-hexflow: 应当是右上角装饰弧 + 龙尾缠绕
- ornament-lightstream: 应当是水平能量带 + 右端星舰引擎暗示

- [ ] **Step 3:不合格图的重生成循环**

对用户标记为"不合格"的图:
```bash
npm run nd:generate -- --id=<id>
```
重复直到通过。top tier 最多 8 次/张。若 8 次都不过,报警,调整 prompt 或把该 entry 改为 normal tier 后重试。

- [ ] **Step 4:闸 3 同家族一致性对比**

同家族的图并排对比(用户在图片查看器里多图并排):
- 6 张 scene 并排:色调、光线角度、画面密度是否同一个世界的产物?
- 6 张 badge 并排:金边粗细、中心图标风格、背景是否一致?
- 2 张 ornament 并排:风格语言是否统一?

不合群的图单独重做。

- [ ] **Step 5:确认文件落地**

Run:
```bash
ls public/netdragon/hero/ public/netdragon/scene/ public/netdragon/badge/ public/netdragon/ornament/
```

Expected:
- hero/: hero-dashboard-desktop.png / -tablet.png / -mobile.png
- scene/: 6 个 scene-ai-*-card.png
- badge/: 6 个 badge-*-default.png
- ornament/: ornament-hexflow-default.png / ornament-lightstream-default.png / 旧 smoke-test(Task 4) / 其他
- 总共至少 17 个新 PNG

- [ ] **Step 6:记录本批次哈希(追溯用)**

Run:
```bash
cd /Users/bill_huang/workspace/claudecode/myproject/AIproject
for d in hero scene badge ornament; do
  echo "=== $d ==="
  shasum -a 256 public/netdragon/$d/*.png 2>/dev/null | awk '{print $2 " " substr($1,1,12)}'
done > /tmp/batch1-hashes.txt
cat /tmp/batch1-hashes.txt
```

(作为追溯信息,不提交 — PNG 不入 git)

- [ ] **Step 7:不提交(PNG 由 .gitignore 规则排除,WebP 下一步生成)**

这一步只是"生成好素材,等 Task A4 派生 WebP 后再一起提交"。

---

## Task A4:后处理 + 预算检查

**Files:**
- 生成到:`public/netdragon/{hero,scene,badge,ornament}/*.webp` + `*@2x.webp`

**步骤:**

- [ ] **Step 1:后处理所有批次 1 图**

Run:
```bash
npm run nd:postprocess 2>&1 | tee /tmp/nd-postprocess.log
```

Expected:
- 17 个 PROC 行 + OK(非 smoke-test 的)
- smoke-test 已经有 WebP,会被覆盖或 skip 取决于 script 逻辑
- `Summary: 17 processed, 0 failed` (smoke-test 会再处理一次,实际可能 18)

- [ ] **Step 2:预算检查**

Run:
```bash
npm run nd:budget-check
```

Expected:
- 所有 badge 和 ornament @1x 应 < 80KB(他们的源尺寸较小,压缩后通常 30-60KB)
- hero @2x 可能 150-300KB(在 400KB 限额内)
- scene @1x 可能接近 80KB(800×1000 分辨率较大,压 WebP 后通常 60-80KB)
- **如果 scene 超 80KB**:需要降 WebP quality 到 80 或 75。stop,report,ask user。
- exit 0

- [ ] **Step 3:提交 WebP(PNG 母版按 .gitignore 留在本地)**

Run:
```bash
git add public/netdragon/hero/*.webp public/netdragon/scene/*.webp public/netdragon/badge/*.webp public/netdragon/ornament/*.webp
git commit -m "feat(nd-ui): batch-1 assets approved (17 webp derivatives: 1 hero + 6 scenes + 6 badges + 2 ornaments)"
```

---

## Task A5:catalog 版本提升

**Files:**
- Modify: `scripts/nd-catalog.json`(version 字段)

**步骤:**

- [ ] **Step 1:把 catalog version 从 0.1.0 改到 0.2.0**

只改一个字段,`"version": "0.1.0"` → `"version": "0.2.0"`。

(此前 Task A1 已经把 version 改为 0.2.0 — 这一步如果 A1 就改了,跳过本 task。否则补改。)

实际检查:如果 `grep '"version"' scripts/nd-catalog.json` 显示 0.2.0,说明 A1 已改,本 task 跳过并标记完成。

- [ ] **Step 2:提交(如有改动)**

```bash
git add scripts/nd-catalog.json
git commit -m "chore(nd-ui): bump catalog version to 0.2.0 (batch-1 complete)"
```

---

# Step B:Nd 组件 + shadcn 改造

本步骤所有组件都基于 Step A 的素材已就位的假设。开发时可以用现有 smoke-test WebP 做视觉占位。

## Task B1:shadcn Card — 添加 glass / void variants

**Files:**
- Modify: `src/components/ui/card.tsx`

**步骤:**

- [ ] **Step 1:读现有 card.tsx**

先用 Read tool 读 `src/components/ui/card.tsx` 全文。它是 shadcn 标准实现,基本结构:
```tsx
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />
}
```

- [ ] **Step 2:用 class-variance-authority(cva)加 variant 支持**

修改成如下形式(在文件顶部导入 cva,定义 cardVariants,Card 组件接受 `variant` prop):

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-nd-lg text-card-foreground transition-shadow",
  {
    variants: {
      variant: {
        default: "bg-card border shadow-nd-sm hover:shadow-nd-md",
        glass:
          "bg-[color:var(--color-nd-glass-bg)] border border-[color:var(--color-nd-glass-border)] shadow-nd-md backdrop-blur-[var(--nd-glass-blur)]",
        void:
          "bg-[color:var(--color-nd-void)] text-white border border-[color:var(--color-nd-void-edge)]/30 shadow-nd-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />
}

// CardHeader, CardTitle, CardContent, CardFooter — 保留现有,仅更新 Card 主组件
```

**保留现有所有 sub-components**(CardHeader / CardTitle / CardDescription / CardContent / CardFooter),只改 Card 主组件。

- [ ] **Step 3:验证 tsc + build**

Run:
```bash
npx tsc --noEmit && npm run build
```

Expected:都成功。

- [ ] **Step 4:验证现有页面不坏**

Run:
```bash
npm run dev &
sleep 5
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/dashboard
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/roster
kill %1
```

Expected:两个 200。

- [ ] **Step 5:提交**

```bash
git add src/components/ui/card.tsx
git commit -m "feat(nd-ui): add glass and void variants to Card component"
```

---

## Task B2:shadcn Badge — 添加 gold variant

**Files:**
- Modify: `src/components/ui/badge.tsx`

**步骤:**

- [ ] **Step 1:读现有 badge.tsx**

Read 全文。Badge 通常也是 cva-based,找到 `variants.variant` 对象。

- [ ] **Step 2:添加 gold variant**

在现有 variants.variant 对象中,在最后一个 variant(默认可能是 `outline` 或 `destructive`)之后追加:

```tsx
        gold:
          "border-transparent bg-gradient-to-r from-[color:var(--color-nd-accent)] to-[color:var(--color-nd-gold-line)] text-[color:var(--color-nd-ink)] shadow-nd-sm",
```

(如果 variants 文件结构不是 cva,而是 switch-case 或 class map,按相同思路处理,保留所有现有 variant)

- [ ] **Step 3:验证 tsc + build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4:提交**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat(nd-ui): add gold variant to Badge component"
```

---

## Task B3:shadcn Progress — 默认启用 .nd-flow

**Files:**
- Modify: `src/components/ui/progress.tsx`

**步骤:**

- [ ] **Step 1:读现有 progress.tsx**

Read 全文。shadcn Progress 通常用 @base-ui/react 的 Progress.Root + Progress.Indicator。

- [ ] **Step 2:在 Indicator 上加 .nd-flow class**

找到 `<Progress.Indicator` 或 `<div>` 部分代表进度条填充的元素,在它的 className 里追加 `nd-flow`。

例如原本:
```tsx
<Progress.Indicator className="bg-primary transition-all" style={{ transform: ... }} />
```
改成:
```tsx
<Progress.Indicator className="bg-primary nd-flow transition-all" style={{ transform: ... }} />
```

注意 `.nd-flow` 本身会覆盖 background-image,可能和 `bg-primary` 冲突。读 globals.css 的 `.nd-flow` 定义回想一下 — 它设置 `background-image: linear-gradient(...)` 和 `background-size: 200% 100%`。在有 `bg-primary` 的元素上,`nd-flow` 的 linear-gradient 会覆盖纯色。这是预期的:进度条本色被流光覆盖。若希望保留底色,需要在 `.nd-flow` CSS 里把 linear-gradient 的透明度再调低,或改用伪元素。

**简化做法**:接受流光覆盖本色,因为这就是"能量流动"的视觉意图。

- [ ] **Step 3:验证 build + 视觉**

```bash
npx tsc --noEmit && npm run build
```

然后 `npm run dev`,打开 `/dashboard`,找任何现有进度条(比如 operational-index 或 kpi 里可能有),肉眼确认流光效果。

- [ ] **Step 4:提交**

```bash
git add src/components/ui/progress.tsx
git commit -m "feat(nd-ui): enable flow animation on Progress indicator by default"
```

---

## Task B4:NdVoidBlock — Hero 深色载体

**Files:**
- Create: `src/components/netdragon/nd-void-block.tsx`

**步骤:**

- [ ] **Step 1:创建 NdVoidBlock 组件**

写入 `src/components/netdragon/nd-void-block.tsx`:

```tsx
/**
 * NdVoidBlock — Layer 3 深色高光载体
 *
 * 用于页面 Hero 区的深色块,携带星舰暗纹 SVG 装饰。
 * 不承担 Hero 的文本/CTA 布局 — 仅提供"深底+霓虹光效+暗纹"的外壳,
 * 由调用方往 children 里塞具体内容。
 */

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NdVoidBlockProps {
  children?: ReactNode;
  className?: string;
}

export function NdVoidBlock({ children, className }: NdVoidBlockProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-nd-xl p-8 text-white shadow-nd-lg",
        "bg-[color:var(--color-nd-void)]",
        className,
      )}
    >
      {/* 霓虹光晕 - 紫 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-10 h-60 w-60 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-nd-violet), transparent 70%)" }}
      />
      {/* 霓虹光晕 - 青 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -bottom-10 h-60 w-60 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-nd-void-edge), transparent 70%)" }}
      />

      {/* 星舰暗纹 SVG - 右侧 */}
      <svg
        aria-hidden
        viewBox="0 0 800 300"
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-25"
      >
        <defs>
          <linearGradient id="ndvbHex" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-nd-void-edge)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-nd-primary)" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* 星舰碟形轮廓暗示 */}
        <ellipse cx="620" cy="170" rx="180" ry="28" fill="none" stroke="url(#ndvbHex)" strokeWidth="1.5" />
        <ellipse cx="620" cy="170" rx="120" ry="18" fill="none" stroke="url(#ndvbHex)" strokeWidth="1" />
        {/* 六边形能量节点 */}
        <polygon
          points="520,60 560,40 600,60 600,100 560,120 520,100"
          fill="none"
          stroke="url(#ndvbHex)"
          strokeWidth="1.2"
        />
        <polygon
          points="640,80 680,60 720,80 720,120 680,140 640,120"
          fill="none"
          stroke="url(#ndvbHex)"
          strokeWidth="1.2"
        />
        {/* 虚线流光 */}
        <line
          x1="0"
          y1="230"
          x2="800"
          y2="230"
          stroke="var(--color-nd-void-edge)"
          strokeWidth="0.5"
          strokeDasharray="3 8"
          opacity="0.5"
        />
      </svg>

      {/* 内容层 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2:导出**

修改 `src/components/netdragon/index.ts` 在末尾追加:
```ts
export { NdVoidBlock } from "./nd-void-block";
```

- [ ] **Step 3:验证 tsc + eslint + build**

```bash
npx tsc --noEmit && npx eslint src/components/netdragon/nd-void-block.tsx && npm run build
```

- [ ] **Step 4:提交**

```bash
git add src/components/netdragon/nd-void-block.tsx src/components/netdragon/index.ts
git commit -m "feat(nd-ui): add NdVoidBlock for Layer-3 hero containers"
```

---

## Task B5:NdStatCard — KPI 大数字卡

**Files:**
- Create: `src/components/netdragon/nd-stat-card.tsx`

**步骤:**

- [ ] **Step 1:创建组件**

写入 `src/components/netdragon/nd-stat-card.tsx`:

```tsx
/**
 * NdStatCard — 驾驶舱 KPI 大数字卡
 *
 * 视觉特征:
 *   - 顶部 2px 流光彩带(电光蓝 → 团队色)
 *   - Orbitron 字体大数字
 *   - 趋势箭头 + 同环比百分比(可选)
 */

"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

type Tone = "primary" | "violet" | "emerald" | "accent";

interface NdStatCardProps {
  label: string;
  value: string | number;
  /** 大数字旁的单位,例如 "%" / "k" / "¥" */
  unit?: string;
  /** 趋势百分比(正=上升,负=下降,null=无) */
  trendPct?: number | null;
  /** 趋势是否"越高越好"(accuracy ↑ = good,cost ↑ = bad) */
  higherIsBetter?: boolean;
  /** 副标题(例如"≈ 79 个 FTE/月") */
  footer?: string;
  /** 顶部流光带色调 */
  tone?: Tone;
  className?: string;
  onClick?: () => void;
}

const TONE_GRADIENT: Record<Tone, string> = {
  primary: "from-transparent via-[color:var(--color-nd-primary)] to-transparent",
  violet: "from-transparent via-[color:var(--color-nd-violet)] to-transparent",
  emerald: "from-transparent via-[color:var(--color-nd-emerald)] to-transparent",
  accent: "from-transparent via-[color:var(--color-nd-accent)] to-transparent",
};

export function NdStatCard({
  label,
  value,
  unit,
  trendPct,
  higherIsBetter = true,
  footer,
  tone = "primary",
  className,
  onClick,
}: NdStatCardProps) {
  const isClickable = !!onClick;

  const trendColor =
    trendPct == null
      ? "text-nd-ink-soft"
      : (trendPct > 0) === higherIsBetter
        ? "text-[color:var(--color-nd-success)]"
        : "text-[color:var(--color-nd-danger)]";

  const TrendIcon =
    trendPct == null
      ? Minus
      : trendPct > 0
        ? ArrowUp
        : trendPct < 0
          ? ArrowDown
          : Minus;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-nd-lg bg-nd-surface p-5 shadow-nd-sm transition-shadow",
        isClickable && "cursor-pointer hover:shadow-nd-md",
        className,
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick?.() : undefined}
    >
      {/* 顶部流光彩带 */}
      <div
        aria-hidden
        className={cn(
          "absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r",
          TONE_GRADIENT[tone],
        )}
      />

      <div className="text-xs font-medium uppercase tracking-wider text-nd-ink-soft">
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-nd-display text-4xl font-bold leading-none tracking-tight text-nd-ink">
          {value}
        </span>
        {unit && <span className="text-lg text-nd-ink-soft">{unit}</span>}
      </div>

      {(trendPct != null || footer) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trendPct != null && (
            <span className={cn("inline-flex items-center gap-0.5", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trendPct).toFixed(1)}%
            </span>
          )}
          {footer && <span className="text-nd-ink-soft">{footer}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2:导出**

在 `src/components/netdragon/index.ts` 末尾追加:
```ts
export { NdStatCard } from "./nd-stat-card";
```

- [ ] **Step 3:验证 tsc + eslint + build**

```bash
npx tsc --noEmit && npx eslint src/components/netdragon/nd-stat-card.tsx && npm run build
```

- [ ] **Step 4:提交**

```bash
git add src/components/netdragon/nd-stat-card.tsx src/components/netdragon/index.ts
git commit -m "feat(nd-ui): add NdStatCard with Orbitron value and trend indicator"
```

---

## Task B6:NdTeamCrest — 团队徽记

**Files:**
- Create: `src/components/netdragon/nd-team-crest.tsx`

**步骤:**

- [ ] **Step 1:创建组件**

写入 `src/components/netdragon/nd-team-crest.tsx`:

```tsx
/**
 * NdTeamCrest — 管理/设计/生产三团队的徽记
 *
 * 仅渲染视觉本身(尺寸由 className 控制),不含标题/描述。
 */

"use client";

import { cn } from "@/lib/utils";

export type NdTeamKey = "management" | "design" | "production";

interface NdTeamCrestProps {
  team: NdTeamKey;
  className?: string;
}

const GRADIENTS: Record<NdTeamKey, string> = {
  management: "from-[color:var(--color-nd-violet)] to-[color:var(--color-nd-primary)]",
  design: "from-[color:var(--color-nd-sapphire)] to-[color:var(--color-nd-void-edge)]",
  production: "from-[color:var(--color-nd-emerald)] to-[color:var(--color-nd-void-edge)]",
};

const GLOW: Record<NdTeamKey, string> = {
  management: "shadow-[0_0_18px_var(--color-nd-violet)]",
  design: "shadow-[0_0_18px_var(--color-nd-primary)]",
  production: "shadow-[0_0_18px_var(--color-nd-emerald)]",
};

export function NdTeamCrest({ team, className }: NdTeamCrestProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-full bg-gradient-to-br",
        GRADIENTS[team],
        GLOW[team],
        className,
      )}
      aria-label={team}
    >
      {/* 内部六边形图腾 */}
      <svg viewBox="0 0 40 40" className="h-3/5 w-3/5 text-white/90">
        <polygon
          points="20,4 34,12 34,28 20,36 6,28 6,12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <polygon
          points="20,10 28,14 28,26 20,30 12,26 12,14"
          fill="currentColor"
          fillOpacity="0.25"
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2:导出**

```ts
export { NdTeamCrest, type NdTeamKey } from "./nd-team-crest";
```

- [ ] **Step 3:验证 + 提交**

```bash
npx tsc --noEmit && npx eslint src/components/netdragon/nd-team-crest.tsx && npm run build
git add src/components/netdragon/nd-team-crest.tsx src/components/netdragon/index.ts
git commit -m "feat(nd-ui): add NdTeamCrest glowing hexagon totems for 3 teams"
```

---

## Task B7:NdAchievementBadge — 成就徽章

**Files:**
- Create: `src/components/netdragon/nd-achievement-badge.tsx`

**步骤:**

- [ ] **Step 1:创建组件**

写入 `src/components/netdragon/nd-achievement-badge.tsx`:

```tsx
/**
 * NdAchievementBadge — 基于 NdAsset 的徽章展示
 *
 * 职责:显示徽章 WebP,悬停显示 tooltip(名称 + 描述)
 *       支持 "gold / silver / bronze" 变体影响光环颜色
 */

"use client";

import { cn } from "@/lib/utils";
import { NdAsset } from "./primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type BadgeRank = "gold" | "silver" | "bronze";

interface NdAchievementBadgeProps {
  /** catalog 里的 badge 素材 id,例如 "badge-efficiency-gold" */
  assetId: string;
  name: string;
  description?: string;
  rank?: BadgeRank;
  /** 外层尺寸(默认 h-12 w-12) */
  size?: number;
  className?: string;
}

const RANK_RING: Record<BadgeRank, string> = {
  gold: "ring-2 ring-[color:var(--color-nd-accent)]/70",
  silver: "ring-2 ring-slate-400/70",
  bronze: "ring-2 ring-orange-400/70",
};

export function NdAchievementBadge({
  assetId,
  name,
  description,
  rank = "gold",
  size = 48,
  className,
}: NdAchievementBadgeProps) {
  const dimPx = `${size}px`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "relative inline-flex items-center justify-center rounded-full",
              RANK_RING[rank],
              className,
            )}
            style={{ width: dimPx, height: dimPx }}
          >
            <NdAsset
              id={assetId}
              label="default"
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        }
      />
      <TooltipContent>
        <div className="font-semibold">{name}</div>
        {description && <div className="mt-0.5 text-xs opacity-80">{description}</div>}
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2:导出**

```ts
export { NdAchievementBadge } from "./nd-achievement-badge";
```

- [ ] **Step 3:验证 + 提交**

```bash
npx tsc --noEmit && npx eslint src/components/netdragon/nd-achievement-badge.tsx && npm run build
git add src/components/netdragon/nd-achievement-badge.tsx src/components/netdragon/index.ts
git commit -m "feat(nd-ui): add NdAchievementBadge wrapping NdAsset with tooltip"
```

---

## Task B8:NdScenePortrait — 员工场景立绘卡

**Files:**
- Create: `src/components/netdragon/nd-scene-portrait.tsx`

**步骤:**

- [ ] **Step 1:创建组件**

写入 `src/components/netdragon/nd-scene-portrait.tsx`:

```tsx
/**
 * NdScenePortrait — 员工场景立绘卡(驾驶舱"明星员工" / 花名册大尺寸卡)
 *
 * 结构:
 *   - 全屏背景:NdAsset (scene 家族 WebP)
 *   - 右上角:排名徽章(可选)
 *   - 底部玻璃信息条:员工名 + 职位 + 副信息
 */

"use client";

import { cn } from "@/lib/utils";
import { NdAsset } from "./primitives";
import type { ReactNode } from "react";

interface NdScenePortraitProps {
  assetId: string;
  name: string;
  title: string;
  meta?: string;
  rankBadge?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NdScenePortrait({
  assetId,
  name,
  title,
  meta,
  rankBadge,
  className,
  onClick,
}: NdScenePortraitProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        "group relative aspect-[4/5] overflow-hidden rounded-nd-lg shadow-nd-md",
        "transition-transform duration-300",
        isClickable && "cursor-pointer hover:-translate-y-1 hover:shadow-nd-lg",
        className,
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick?.() : undefined}
    >
      {/* 背景立绘 */}
      <NdAsset
        id={assetId}
        label="card"
        alt={`${name} - ${title}`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />

      {/* 右上角排名徽章 */}
      {rankBadge && (
        <div className="absolute right-3 top-3 z-10">{rankBadge}</div>
      )}

      {/* 底部玻璃信息条 */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-3",
          "bg-[color:var(--color-nd-glass-bg)] backdrop-blur-[var(--nd-glass-blur)]",
          "border-t border-[color:var(--color-nd-glass-border)]",
        )}
      >
        <div className="text-sm font-bold leading-tight text-nd-ink">{name}</div>
        <div className="mt-0.5 text-xs text-nd-ink-soft">{title}</div>
        {meta && <div className="mt-1 text-[11px] text-nd-ink-soft/80">{meta}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2:导出 + 验证 + 提交**

```ts
export { NdScenePortrait } from "./nd-scene-portrait";
```

```bash
npx tsc --noEmit && npx eslint src/components/netdragon/nd-scene-portrait.tsx && npm run build
git add src/components/netdragon/nd-scene-portrait.tsx src/components/netdragon/index.ts
git commit -m "feat(nd-ui): add NdScenePortrait for large employee showcase cards"
```

---

## Task B9:NdPipelineFlow — 产线水平流水线

**Files:**
- Create: `src/components/netdragon/nd-pipeline-flow.tsx`

**步骤:**

- [ ] **Step 1:创建组件**

写入 `src/components/netdragon/nd-pipeline-flow.tsx`:

```tsx
/**
 * NdPipelineFlow — 水平工序流水线
 *
 * 展示:立项 → 设计 → 生产 → 评审 → 入库(或任意节点序列)
 * 每个节点有:标签 + 计数;节点间连线带能量流动光带。
 */

"use client";

import { cn } from "@/lib/utils";

interface PipelineNode {
  key: string;
  label: string;
  count: number;
  /** 该节点是否已激活(有任务流过),未激活节点灰化 */
  active?: boolean;
}

interface NdPipelineFlowProps {
  nodes: PipelineNode[];
  className?: string;
}

export function NdPipelineFlow({ nodes, className }: NdPipelineFlowProps) {
  return (
    <div className={cn("relative py-6", className)}>
      {/* 底部连线(静态渐变) */}
      <div
        aria-hidden
        className="absolute left-12 right-12 top-1/2 h-px -translate-y-1/2"
        style={{
          background:
            "linear-gradient(90deg, var(--color-nd-primary), var(--color-nd-void-edge), var(--color-nd-emerald))",
          opacity: 0.35,
        }}
      />

      {/* 流光覆盖条(动态) */}
      <div
        aria-hidden
        className="nd-flow absolute left-12 right-12 top-1/2 h-0.5 -translate-y-1/2"
      />

      {/* 节点 */}
      <div className="relative z-10 flex items-start justify-between">
        {nodes.map((n) => (
          <div key={n.key} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold",
                n.active
                  ? "bg-gradient-to-br from-[color:var(--color-nd-primary)] to-[color:var(--color-nd-void-edge)] text-white shadow-nd-glow"
                  : "bg-[color:var(--color-nd-line)] text-nd-ink-soft",
              )}
            >
              {n.label}
            </div>
            <div className="font-nd-display text-xs text-nd-ink">{n.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2:导出 + 验证 + 提交**

```ts
export { NdPipelineFlow } from "./nd-pipeline-flow";
```

```bash
npx tsc --noEmit && npx eslint src/components/netdragon/nd-pipeline-flow.tsx && npm run build
git add src/components/netdragon/nd-pipeline-flow.tsx src/components/netdragon/index.ts
git commit -m "feat(nd-ui): add NdPipelineFlow horizontal process viz with nd-flow"
```

---

# Step C:驾驶舱页面重构

## Task C1:添加 `getPipelineFlowStats` 数据函数

**Files:**
- Modify: `src/lib/dashboard-data.ts`

**步骤:**

- [ ] **Step 1:读现有文件,找到函数导出位置**

Read 全文,找合适位置插入新函数。它应该与 `getTeamStatus`、`getRecentTasks` 等并列。

- [ ] **Step 2:新增函数**

在现有导出函数之后追加:

```ts
export interface PipelineNodeStat {
  key: string;   // "intake" | "design" | "production" | "review" | "archive"
  label: string; // 中文节点名
  count: number; // 今日处于该节点的任务数
}

/**
 * 返回今日任务在产线 5 个节点上的分布。
 *
 * 节点定义(与 task.status 映射):
 *   intake     := queued / pending
 *   design     := in_progress AND step.family === "design"
 *   production := in_progress AND step.family === "production"
 *   review     := review / qa
 *   archive    := completed (today)
 */
export async function getPipelineFlowStats(): Promise<PipelineNodeStat[]> {
  // 实现:根据项目现有的 task 表 / task_steps 表查询
  // 此处给出占位实现,具体查询逻辑需要读 src/db/schema.ts 中 tasks 和 task_steps 的字段确定
  // 若现有数据模型无法精确支持 5 节点分布,先用 task.status 近似:
  //   queued    → intake
  //   running   → production(暂归一)
  //   review    → review
  //   completed → archive(今日完成)
  //   failed/rejected → 不计入

  // PLACEHOLDER IMPLEMENTATION — implementer 需要读实际 schema 后实现
  const today = new Date().toISOString().slice(0, 10);
  void today; // 暂用占位,避免 unused var lint
  return [
    { key: "intake", label: "立项", count: 0 },
    { key: "design", label: "设计", count: 0 },
    { key: "production", label: "生产", count: 0 },
    { key: "review", label: "评审", count: 0 },
    { key: "archive", label: "入库", count: 0 },
  ];
}
```

**注意**:implementer 需要读 `src/db/schema.ts` 了解 `tasks` 和 `task_steps` 的实际字段,然后把 PLACEHOLDER 换成真实查询。如果 schema 不足以支持精细的 5 节点分布,按注释中的"退化映射"实现即可。

- [ ] **Step 3:验证 + 提交**

```bash
npx tsc --noEmit && npm run build
git add src/lib/dashboard-data.ts
git commit -m "feat(dashboard): add pipeline flow stats query for dashboard hero row"
```

---

## Task C2:重构 KpiSection 使用 NdStatCard

**Files:**
- Modify: `src/components/dashboard/kpi-section.tsx`

**步骤:**

- [ ] **Step 1:读现有 kpi-section.tsx**

了解现有 props(接收 `kpiItems: KpiItem[]`)和渲染结构。

- [ ] **Step 2:重写渲染层,用 NdStatCard 替换**

保留 props,但内部用 `<NdStatCard>` 代替原有的 `<KpiCard>` 或自定义 div。4 张 KPI(完成任务 / 采纳率 / 节省工时 / Token 成本)的 tone 分别设为:

- 完成任务:`primary`
- 采纳率:`emerald`
- 节省工时:`accent`
- Token 成本:`violet`(或按实际 KpiItem 里的色彩偏好映射)

根据现有 `KpiItem` 类型(应该已有 `label`、`value`、`trendPct` 等字段),映射到 NdStatCard 的 props。如果没有 `higherIsBetter` 字段,按 key 硬映射(cost 类 false,其他 true)。

- [ ] **Step 3:删除不再使用的旧 kpi-card.tsx(如无其他引用)**

Run:
```bash
grep -rn "from.*kpi-card" src/ 2>&1 | head -5
```

如果只有 kpi-section 引用了它,把 `src/components/dashboard/kpi-card.tsx` 删除:
```bash
git rm src/components/dashboard/kpi-card.tsx
```

如果其他文件还引用了,保留不动。

- [ ] **Step 4:验证 + 提交**

```bash
npx tsc --noEmit && npm run build
git add src/components/dashboard/kpi-section.tsx
git commit -m "refactor(dashboard): migrate KpiSection to NdStatCard"
```

---

## Task C3:重构 TeamStatusPanel 使用 NdTeamCrest

**Files:**
- Modify: `src/components/dashboard/team-status-panel.tsx`

**步骤:**

- [ ] **Step 1:读现有**

了解它如何渲染 3 个团队(management/design/production)的状态。

- [ ] **Step 2:替换视觉**

每个团队的图标 / 色块用 `<NdTeamCrest team="management|design|production" />` 替换。保留现有的数字、百分比文字和 onClick 行为。

整体布局:用 Card variant="default" 包裹,内部 3 行:

```tsx
<Card className="p-4">
  <h3 className="text-sm font-semibold text-nd-ink mb-3">团队状态</h3>
  <div className="flex flex-col gap-2">
    {teams.map((t) => (
      <div
        key={t.team}
        onClick={() => onTeamClick?.(t.team)}
        className="flex items-center gap-3 rounded-nd-md p-2 hover:bg-nd-canvas cursor-pointer"
      >
        <NdTeamCrest team={t.team} className="w-8" />
        <div className="flex-1">
          <div className="text-sm font-medium text-nd-ink">{t.label}</div>
          <div className="text-xs text-nd-ink-soft">
            {t.activeCount}/{t.totalCount} 在岗 · 产能 {Math.round(t.healthRate * 100)}%
          </div>
        </div>
        <div className="font-nd-display text-sm font-bold text-nd-ink">
          {Math.round(t.healthRate * 100)}%
        </div>
      </div>
    ))}
  </div>
</Card>
```

(具体字段名按现有 TeamStatus 类型映射)

- [ ] **Step 3:验证 + 提交**

```bash
npx tsc --noEmit && npm run build
git add src/components/dashboard/team-status-panel.tsx
git commit -m "refactor(dashboard): migrate TeamStatusPanel to NdTeamCrest"
```

---

## Task C4:重构 AchievementFeed 使用 NdAchievementBadge

**Files:**
- Modify: `src/components/dashboard/achievement-feed.tsx`

**步骤:**

- [ ] **Step 1:读现有,看它怎么展示 achievements**

- [ ] **Step 2:把每条成就的视觉元素替换**

原本可能用 emoji 展示 `achievementEmoji`,现在改成:
- 如果该成就对应一个 catalog 里的 badge asset(通过 `achievementKey` → `assetId` 映射),用 `<NdAchievementBadge assetId={...} name={achievementName} rank="gold" size={36} />`
- 如果映射不存在,回退到 emoji(现有行为)

在 achievement-feed.tsx 内定义一个小 map:
```ts
const ACHIEVEMENT_ASSET_MAP: Record<string, string> = {
  "weekly_top": "badge-weekly-top",
  "efficiency_gold": "badge-efficiency-gold",
  "quality_gold": "badge-quality-gold",
  "innovation_gold": "badge-innovation-gold",
  "collab_gold": "badge-collab-gold",
  "reliability_gold": "badge-reliability-gold",
};
```

只对 map 里的成就用徽章,其他保留 emoji。

- [ ] **Step 3:验证 + 提交**

```bash
npx tsc --noEmit && npm run build
git add src/components/dashboard/achievement-feed.tsx
git commit -m "refactor(dashboard): use NdAchievementBadge for mapped achievements"
```

---

## Task C5:整个 DashboardShell 的 5 区块重构

这是阶段 1 最大的任务,集成所有前序工作。

**Files:**
- Modify: `src/components/dashboard/dashboard-shell.tsx`

**步骤:**

- [ ] **Step 1:读现有 shell 全文,理解 props 和 state**

已经读过。关键 state:selectedTeam / selectedEmployeeId / selectedTaskId / drawerTeam。

- [ ] **Step 2:在 shell 文件顶部追加数据类型和 Nd 组件导入**

```tsx
import {
  NdVoidBlock,
  NdStatCard,
  NdPipelineFlow,
  NdScenePortrait,
  NdAchievementBadge,
} from "@/components/netdragon";
```

- [ ] **Step 3:新增 Hero 区(区块 1)**

在现有 `<h1>` 标题下方,替换当前的 `OperationalIndexGauge + TeamStatusPanel` 两列,改为:

```tsx
{/* 区块 1 · Hero 欢迎区 */}
<NdVoidBlock className="mb-4">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-xs tracking-widest text-[color:var(--color-nd-void-edge)]">
        NETDRAGON · DIGITAL CRAFT FACTORY
      </div>
      <h1 className="mt-2 text-3xl font-bold">早安,今日产线已启动</h1>
      <p className="mt-2 text-sm opacity-70">
        {summary.totalActive ?? 24} 位 AI 员工在岗 ·{" "}
        今日 <span className="font-nd-display text-[color:var(--color-nd-accent)]">{summary.todayTaskCount ?? "—"}</span> 个任务流转中 ·{" "}
        整体产能 <span className="font-nd-display text-[color:var(--color-nd-void-edge)]">{Math.round((summary.operationalIndex ?? 0) * 100)}%</span>
      </p>
    </div>
    {/* 右侧可放 NdAsset id="ornament-hexflow" 作为装饰 */}
  </div>
</NdVoidBlock>
```

**注意**:`summary.totalActive` / `summary.todayTaskCount` 字段可能不存在。implementer 需要:
- 检查 `DashboardSummary` 类型是否有这些字段
- 如果没有,回退到用 `teamStatus` 汇总:`totalActive = sum(teamStatus.activeCount)`;`todayTaskCount` 从 recent tasks 数量近似或用 summary 的 `monthlyTaskCount`

保留 `OperationalIndexGauge` 组件文件本身(它的 props 可能被其他页面用),但在此处不再渲染 — 它的核心数字已经集成到 Hero 副文案。

- [ ] **Step 4:区块 2 · KPI 矩阵**

原本 `<KpiSection kpiItems={...} />` 保留不动(Task C2 已改)。

- [ ] **Step 5:区块 3 · 产线 × 团队**

**新增**这一区块(原本驾驶舱没有产线展示):

需要在 DashboardShellProps 新增 `pipelineNodes: PipelineNodeStat[]` 字段,然后在 `DashboardPage`(`src/app/dashboard/page.tsx`)中调用 `getPipelineFlowStats()` 传入。

在 shell 的合适位置插入:

```tsx
{/* 区块 3 · 产线 × 团队 */}
<div className="mb-4 grid grid-cols-3 gap-4">
  <Card className="col-span-2 p-4">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-nd-ink">今日产线流转</h3>
      <span className="text-xs text-nd-ink-soft">实时更新</span>
    </div>
    <NdPipelineFlow nodes={pipelineNodes.map((n) => ({ ...n, active: n.count > 0 }))} />
  </Card>
  <TeamStatusPanel teamStatus={teamStatus} onTeamClick={setDrawerTeam} />
</div>
```

同步修改 `src/app/dashboard/page.tsx`,导入 `getPipelineFlowStats` 并加入 Promise.all,把结果传给 DashboardShell。

- [ ] **Step 6:区块 4 · 本周明星员工**

在 shell 合适位置新增:

```tsx
{/* 区块 4 · 本周明星员工 */}
<div className="mb-4">
  <h3 className="mb-3 text-sm font-semibold text-nd-ink">本周明星员工</h3>
  <div className="grid grid-cols-3 gap-4">
    {leaderboard.slice(0, 3).map((entry, i) => (
      <NdScenePortrait
        key={entry.employeeId}
        assetId={`scene-${entry.employeeSlug ?? "ai-game-designer"}`}  // 需要 employee slug 映射到 catalog id
        name={entry.employeeName}
        title={entry.employeeTitle ?? "AI 员工"}
        meta={`本周 ${entry.taskCount} 任务 · 采纳率 ${Math.round(entry.adoptionRate * 100)}%`}
        rankBadge={
          i === 0 ? (
            <span className="rounded-full bg-[color:var(--color-nd-accent)] px-2 py-0.5 text-[10px] font-bold text-nd-ink">
              ★ No.1
            </span>
          ) : (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-nd-ink">
              No.{i + 1}
            </span>
          )
        }
        onClick={() => handleEmployeeClick(entry.employeeId)}
      />
    ))}
  </div>
</div>
```

**重要**:只有批次 1 生成了 6 个 scene 素材(game-designer, role-designer, screenwriter, product-manager, character-designer, movie-artist)。如果 leaderboard 的 top 3 员工不在这 6 个里,就会 missing。implementer 需要:
- 在 DashboardShell 里加一个**映射函数**:员工 id → catalog scene id
- 映射不到的员工,NdScenePortrait 会自动走 fallback(scene-generic.svg,已有)

- [ ] **Step 7:区块 5 · 活动流 + 热力图**

保留现有 `<ActivityHeatmap>` 和 `<TaskFeed>` 的功能,但布局调整:

```tsx
<div className="grid grid-cols-5 gap-4">
  <Card className="col-span-3 p-4">
    <TaskFeed tasks={recentTasks} onTaskClick={setSelectedTaskId} />
  </Card>
  <Card className="col-span-2 p-4">
    <ActivityHeatmap
      data={heatmapData}
      filterTeam={selectedTeam}
      onEmployeeClick={handleEmployeeClick}
    />
  </Card>
</div>
```

把 `LeaderboardPanel` 和 `TeamComparisonChart` 挪到这个区块下面的第二行(或删除 —— 明星员工区块已经展示了 top 3,leaderboard 功能有部分重叠)。

**implementer 判断**:如果 leaderboard / team-comparison 功能和新区块重叠明显,**把它们合并到明星员工下方的附加信息中,或直接删除**。以"减法"为主,不要让页面信息密度过高。

- [ ] **Step 8:整体容器背景换成 bg-nd-canvas**

把 shell 最外层的 `linear-gradient(135deg, #f0f4f8, #e8eef5)` 改成:

```tsx
<div className="min-h-screen bg-nd-canvas p-6">
```

- [ ] **Step 9:验证 build + 视觉走查**

```bash
npx tsc --noEmit && npm run build
npm run dev &
sleep 5
open http://localhost:3000/dashboard
```

然后肉眼验证:
- 5 区块都在、顺序正确
- Hero 深色块、右上角装饰、拟人化文案到位
- KPI 4 卡(顶部流光带、Orbitron 数字)
- 产线 5 节点 + 流光连线
- 3 张明星员工立绘卡(玻璃底条)
- 活动流 + 热力图
- 整体冷蓝基调,Layer 3 只出现在 Hero

杀 dev。

- [ ] **Step 10:提交**

```bash
git add src/components/dashboard/dashboard-shell.tsx src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): rebuild 5-block NetDragon-style flagship layout"
```

---

## Task C6:Lighthouse 性能验证(阶段 1 出口生死线)

**Files:**
- 无修改,仅验证

**步骤:**

- [ ] **Step 1:Production build + 本地 start**

```bash
npm run build
npm run start &
sleep 5
```

- [ ] **Step 2:运行 Lighthouse**

用 Chrome DevTools 的 Lighthouse 面板跑 `/dashboard`,Desktop 模式,只跑 Performance。

**出口指标**:
- Performance score ≥ 90
- LCP ≤ 2.5s
- CLS ≤ 0.1

如果不达标:
- LCP 高:检查 hero 图是否 eager loading(默认 NdAsset 是 lazy,Hero 背景要传 `loading="eager"`)
- CLS 高:NdScenePortrait 没有 aspect-ratio 容器导致布局抖动 → 确认 className 有 `aspect-[4/5]`
- Performance 综合低:运行 `npm run build` 的输出,看 bundle 哪里大

- [ ] **Step 3:人工视觉生死线验收**

在 Chrome 正常浏览模式下访问 `/dashboard`,用户(产品经理你本人)亲自打开。

三条硬问题:
1. 这就是你心里想的"网龙味"吗?
2. 每个区块是否承载了足够的信息而不显得空洞?
3. 有没有任何一块感觉"不对"、不够网龙、或者和其他地方风格不一致?

如果任一条回答"否",阶段 1 **止步**,iterate,不进入阶段 2。

- [ ] **Step 4:停 dev,提交 Lighthouse 报告快照(可选)**

```bash
kill %1
# 可选:把 Lighthouse 报告导出成 JSON 存在 docs/netdragon-ui/phase-1-lighthouse.json 作为留档
```

无代码提交(纯验收步骤)。如果有修复,按修复内容单独 commit。

- [ ] **Step 5:阶段 1 完成声明**

到这里,阶段 1 全部完成,包括:
- ✅ 17 张批次 1 素材生成 + 人工三闸审核
- ✅ 3 个 shadcn 组件改造(card/badge/progress)
- ✅ 6 个 Nd 新组件
- ✅ 驾驶舱 5 区块重构
- ✅ Lighthouse ≥ 90 + 用户肉眼验收

**进入阶段 2 的前置条件**:本阶段所有 Task A/B/C 的 Step 都已打勾 + 用户对 `/dashboard` 亲自点头 + Lighthouse 达标。

---

## Self-Review

**1. Spec 覆盖检查(对照 spec §8 阶段 1):**

| spec 要求 | plan 任务 |
|---|---|
| 批次 1 素材(15 张,top-tier 允许 8 次迭代) | Task A1 + A3 + A4(实际 17 个文件,1 hero×3 + 6 scene + 6 badge + 2 ornament)|
| hero-dashboard + 6 scene + 6 badge + 2 ornament | Task A1 catalog entries 对齐 spec §4.1 的家族划分 |
| 6 个核心 Nd 组件 | Task B4-B9(NdVoidBlock / NdStatCard / NdPipelineFlow / NdTeamCrest / NdScenePortrait / NdAchievementBadge)|
| 3 个 shadcn 改造(card / badge / progress) | Task B1-B3 |
| 驾驶舱 5 区块重构 | Task C5 |
| Lighthouse ≥ 90 | Task C6 |
| 用户肉眼"这就是网龙味" | Task C6 Step 3 |

spec §7.2 闸 2 Visual Companion 审核在 Task A3 Step 2 明确提及(实际上让用户在图片查看器并排看,等价于 Visual Companion 的功能,减少一层工具依赖)。

**2. 占位符扫描**:
- Task C1 的 `getPipelineFlowStats` 有 PLACEHOLDER 注释,implementer 需要基于 schema 实现。这是**刻意保留的占位**,因为我不知道 `tasks.status` 的实际枚举值。已明确要求 implementer 读 schema.ts 后补。
- 其他无 TBD / TODO。

**3. 类型一致性**:
- `NdStatCard` 的 tone 在 Task B5 定义为 `"primary"|"violet"|"emerald"|"accent"`,Task C2 使用时选值对齐。
- `NdTeamCrest` 的 team 类型 `NdTeamKey = "management"|"design"|"production"`,与项目既有 team 枚举一致。
- `NdAchievementBadge` 的 rank = `"gold"|"silver"|"bronze"`,Task C4 只用 "gold"(映射都叫 `*_gold`)。
- `NdScenePortrait` 的 assetId 是字符串,Task C5 Step 6 需要 slug 映射函数,可能需要 employee schema 里有 slug 字段或用 id 的转换规则。implementer 在 Task C5 时验证。

**4. 风险项明确标出**:
- Step A(素材)是生死线,不过不进 Step B
- Step B 的 B3(Progress + .nd-flow 覆盖底色)可能视觉争议,在 Step 2 说明
- Step C5 的 scene asset 映射是潜在缺口,明星员工若不在 6 个 scene 覆盖范围内需 fallback
- Task C6 的 Lighthouse 是最终关卡,不达标 iterate
