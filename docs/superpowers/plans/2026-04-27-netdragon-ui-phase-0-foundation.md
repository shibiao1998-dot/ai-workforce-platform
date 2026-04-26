# 阶段 0 · 网龙风 UI 基建 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为网龙风 UI 体系铺好"设计 Tokens + 素材生产流水线 + 底层素材原语 + CI 性能预算"的基础设施,让阶段 1(旗舰页驾驶舱)可以直接开工。

**Architecture:** 本阶段不改任何业务页面、不改 shadcn 组件、不真正生成 90 张素材 —— 只铺路。产出四类基础设施:(1)`globals.css` 中的 `--nd-*` Tokens 和 `@theme` 扩展;(2)`scripts/` 下的素材生成流水线(复用 `generate-avatars.ts` 的风格,支持 catalog 驱动和批次筛选);(3)`src/components/netdragon/primitives/` 三个底层(NdAsset / NdAssetSvg / catalog loader);(4)CI 性能预算脚本。出口验收:一次 smoke-test 生 1 张测试图,端到端跑通"生成 → 后处理 → 入库 → `<NdAsset />` 在浏览器里渲染"。

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (CSS-first, `@theme` 块在 globals.css) · `better-sqlite3`/Drizzle(不涉及) · `tsx` 运行 scripts · `node:https`(调 gpt-image-2 网关,沿用现有做法)· `sharp`(新增,PNG → WebP + 多尺寸派生)

**重要约束(影响计划做法):**
- **项目无测试框架(无 Jest / Vitest / Playwright)**,CLAUDE.md 明确说明。因此本计划**不使用 TDD 的"写测试 → 跑红 → 跑绿"循环**,改用"**运行时验证 + 视觉验证**"—— 每个任务的最后一步是具体的终端命令或页面访问,并给出**预期输出**供验收。
- **Tailwind v4 无独立 config 文件** —— 所有主题扩展通过 `globals.css` 中的 `@theme inline { ... }` 块实现。
- **不产生真 AI 图,仅生成 1 张 smoke-test 图**。真正的批次 1 素材留在阶段 1 开工时再跑,避免本阶段就烧 prompt 预算。
- **不修改现有页面或 shadcn 组件**。这些留给阶段 1 和之后。

---

## 文件结构总览

### 新建文件

```
src/app/globals.css                                修改:新增 --nd-* tokens 和 @theme 扩展
src/components/netdragon/primitives/nd-asset.tsx   新建:图片原语,自动多尺寸 + WebP fallback + lazy
src/components/netdragon/primitives/nd-asset-svg.tsx 新建:SVG 替身原语
src/components/netdragon/primitives/nd-asset-catalog.ts 新建:素材清单 loader 和类型
src/components/netdragon/primitives/index.ts       新建:统一导出
src/components/netdragon/index.ts                  新建:顶级导出(本阶段仅转发 primitives)

scripts/nd-catalog.json                            新建:素材清单初版(2 条占位 + smoke-test)
scripts/nd-prompts/global-anchor.txt               新建:全局风格锚点
scripts/nd-prompts/family-hero.txt                 新建:hero 家族模板
scripts/nd-prompts/family-scene.txt                新建:scene 家族模板
scripts/nd-prompts/family-banner.txt               新建
scripts/nd-prompts/family-badge.txt                新建
scripts/nd-prompts/family-empty-state.txt          新建
scripts/nd-prompts/family-ornament.txt             新建
scripts/nd-prompts/family-widget-bg.txt            新建
scripts/nd-prompts/family-milestone.txt            新建
scripts/nd-prompts/family-texture.txt              新建

scripts/generate-netdragon-assets.ts               新建:主生成脚本(catalog 驱动 + --batch/--id 筛选)
scripts/nd-post-process.ts                         新建:PNG → WebP + 多尺寸派生(用 sharp)
scripts/nd-budget-check.ts                         新建:CI 性能预算扫描

public/netdragon/                                  新建目录(初始为空,.gitkeep 占位)
public/netdragon/.gitkeep                          新建

docs/netdragon-ui/README.md                        新建:使用文档占位(本阶段仅写"如何跑 smoke-test")

src/app/nd-smoke/page.tsx                          新建临时:smoke-test 页面(阶段 1 结束删除)
```

### 修改文件

```
package.json                                       修改:scripts 加 nd:generate / nd:postprocess / nd:budget-check
src/app/globals.css                                修改:新增 --nd-* tokens、@theme 扩展、@keyframes flow、.nd-flow class
.gitignore                                         修改:加 /public/netdragon/*.png(保留 .webp/.svg,忽略 PNG 母版)
```

### 不涉及(留给后续阶段)

- 任何 shadcn 组件改造(Card/Button/Badge 等)→ 阶段 1
- 任何业务组件(dashboard/、roster/ 等)→ 阶段 1 以后
- 任何 Nd 展示组件(NdVoidBlock、NdStatCard、NdPipelineFlow 等 12 个)→ 阶段 1 以后
- 真实 AI 素材(除 1 张 smoke-test 图)→ 阶段 1 批次 1

---

## 任务列表

### Task 0:准备工作 — 确认依赖和环境

**Files:**
- 无文件修改,仅做检查

**步骤:**

- [ ] **Step 1:确认 `.env.local` 中已配好 gpt-image-2 网关**

Run:
```bash
grep -E "^IMAGE_API_(GATEWAY_URL|KEY)=" .env.local | sed 's/=.*/=<set>/'
```
Expected output:
```
IMAGE_API_GATEWAY_URL=<set>
IMAGE_API_KEY=<set>
```

如输出为空,停下来让用户先配置 `.env.local`。不要自己生成假值继续。

- [ ] **Step 2:检查项目当前依赖里是否已有 sharp**

Run:
```bash
grep '"sharp"' package.json || echo "MISSING"
```
Expected output:`MISSING` (需要新增)

- [ ] **Step 3:安装 sharp 和 @types 依赖**

Run:
```bash
npm install --save-dev sharp
```
Expected:`added 1 package` 或类似,没有 ERR。

sharp 自带 TypeScript 类型声明,不需要单独的 @types。

- [ ] **Step 4:验证 sharp 能加载**

Run:
```bash
npx tsx -e "import('sharp').then(s => console.log('sharp version:', s.default.versions?.vips ?? 'ok'))"
```
Expected:输出一个版本字符串,如 `sharp version: 8.x.x` 或 `sharp version: ok`。

- [ ] **Step 5:创建目标目录**

Run:
```bash
mkdir -p public/netdragon scripts/nd-prompts src/components/netdragon/primitives docs/netdragon-ui
touch public/netdragon/.gitkeep
```
Expected:无输出,4 个目录已建。

- [ ] **Step 6:提交**

```bash
git add package.json package-lock.json public/netdragon/.gitkeep
git commit -m "chore(nd-ui): scaffold directories and add sharp dependency"
```

---

### Task 1:注入网龙 Design Tokens

**Files:**
- Modify: `src/app/globals.css`

**步骤:**

- [ ] **Step 1:在 globals.css 的 `@theme inline` 块末尾,新增网龙 Tokens**

打开 `src/app/globals.css`,找到 `@theme inline { ... }` 块的 **最后一行 `}` 之前**,插入如下内容(整块一次性插入):

```css
  /* ──────────────────────────────────────────────────────────
   * NetDragon UI Tokens
   * Namespace: --nd-*  (不污染 shadcn 原有变量)
   * ────────────────────────────────────────────────────────── */

  /* Layer 1 — 基底层(日常操作) */
  --color-nd-ink:          hsl(215 35% 15%);
  --color-nd-ink-soft:     hsl(215 20% 40%);
  --color-nd-surface:      hsl(0 0% 100%);
  --color-nd-canvas:       hsl(215 30% 97%);
  --color-nd-line:         hsl(215 20% 90%);

  /* Layer 2 — 品牌层 */
  --color-nd-primary:      hsl(218 95% 52%);
  --color-nd-primary-deep: hsl(225 75% 35%);
  --color-nd-secondary:    hsl(172 85% 42%);
  --color-nd-accent:       hsl(38 95% 58%);
  --color-nd-violet:       hsl(268 75% 62%);
  --color-nd-emerald:      hsl(156 72% 44%);
  --color-nd-sapphire:     hsl(218 95% 52%);

  /* Layer 3 — 高光层(仅展示区) */
  --color-nd-void:         hsl(225 50% 8%);
  --color-nd-void-glow:    hsl(218 95% 52%);
  --color-nd-void-edge:    hsl(172 85% 50%);
  --color-nd-gold-line:    hsl(42 65% 58%);

  /* 语义色 */
  --color-nd-success:      hsl(156 72% 44%);
  --color-nd-warning:      hsl(38 95% 58%);
  --color-nd-danger:       hsl(358 75% 55%);
  --color-nd-info:         hsl(172 85% 42%);

  /* 字体 */
  --font-nd-sans:    "HarmonyOS Sans SC", "PingFang SC", "Noto Sans CJK SC", "Inter", system-ui, sans-serif;
  --font-nd-display: "Orbitron", "HarmonyOS Sans SC", sans-serif;
  --font-nd-serif:   "Source Han Serif SC", "Noto Serif CJK", serif;
  --font-nd-mono:    "JetBrains Mono", monospace;

  /* 圆角 */
  --radius-nd-sm:   6px;
  --radius-nd-md:   10px;
  --radius-nd-lg:   16px;
  --radius-nd-xl:   24px;
  --radius-nd-full: 9999px;

  /* 阴影(冷蓝光影) */
  --shadow-nd-xs:   0 1px 2px hsl(218 80% 30% / 0.06);
  --shadow-nd-sm:   0 2px 8px hsl(218 80% 30% / 0.08);
  --shadow-nd-md:   0 8px 24px hsl(218 80% 30% / 0.10);
  --shadow-nd-lg:   0 16px 48px hsl(218 80% 30% / 0.14);
  --shadow-nd-glow: 0 0 24px hsl(218 95% 52% / 0.35);

  /* 动效 */
  --ease-nd-out:    cubic-bezier(0.25, 1, 0.5, 1);
  --ease-nd-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-nd-fast: 150ms;
  --duration-nd-base: 250ms;
  --duration-nd-slow: 450ms;

  /* 玻璃质感 */
  --color-nd-glass-bg:     hsl(0 0% 100% / 0.72);
  --color-nd-glass-border: hsl(218 50% 70% / 0.35);
```

注意:Tailwind v4 的 `@theme inline` 要求自定义变量遵循 `--<category>-<name>` 命名,才能被 `bg-nd-primary` / `text-nd-ink` / `shadow-nd-md` / `font-nd-display` / `rounded-nd-lg` 等工具类自动识别。所以用的是 `--color-nd-*` / `--font-nd-*` / `--radius-nd-*` / `--shadow-nd-*` / `--ease-nd-*` / `--duration-nd-*`,而不是 `--nd-*`。

- [ ] **Step 2:在 globals.css 文件末尾(`@layer base { ... }` 之后)新增能量流动 keyframe 和工具 class**

在 `src/app/globals.css` 文件的最后,在 `@layer base { ... }` 块后面,追加:

```css
/* ──────────────────────────────────────────────────────────
 * NetDragon · 能量流动动效
 * 任何元素加上 .nd-flow 即可让一道光沿水平方向循环流动
 * ────────────────────────────────────────────────────────── */
@keyframes nd-flow {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.nd-flow {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    hsl(218 95% 52% / 0.6) 45%,
    hsl(172 85% 50% / 0.8) 50%,
    hsl(218 95% 52% / 0.6) 55%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: nd-flow 2.5s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .nd-flow {
    animation: none;
    background-image: linear-gradient(90deg, hsl(218 95% 52% / 0.4), hsl(172 85% 50% / 0.4));
  }
}
```

- [ ] **Step 3:运行 dev 服务验证 CSS 能编译**

Run:
```bash
npm run dev
```

Expected:服务启动,控制台无 `SyntaxError` / `Unknown theme key` 一类的错误。看到 `Ready in ...` 即可。

如果有 Tailwind v4 相关错误,停下来检查 `@theme inline` 块的语法是否完整(所有变量必须在 `{}` 内,且用分号结尾)。

在别的终端 curl 一下首页看能否返回 200:
```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
```
Expected:`HTTP 200`(或 307 重定向到 /roster,都算成功)。

按 Ctrl+C 停 dev。

- [ ] **Step 4:提交**

```bash
git add src/app/globals.css
git commit -m "feat(nd-ui): add NetDragon design tokens and flow animation"
```

---

### Task 2:创建素材 Catalog 和 Prompt 模板(初版)

**Files:**
- Create: `scripts/nd-catalog.json`
- Create: `scripts/nd-prompts/global-anchor.txt`
- Create: `scripts/nd-prompts/family-hero.txt`
- Create: `scripts/nd-prompts/family-scene.txt`
- Create: `scripts/nd-prompts/family-banner.txt`
- Create: `scripts/nd-prompts/family-badge.txt`
- Create: `scripts/nd-prompts/family-empty-state.txt`
- Create: `scripts/nd-prompts/family-ornament.txt`
- Create: `scripts/nd-prompts/family-widget-bg.txt`
- Create: `scripts/nd-prompts/family-milestone.txt`
- Create: `scripts/nd-prompts/family-texture.txt`

**步骤:**

- [ ] **Step 1:创建全局锚点**

写入 `scripts/nd-prompts/global-anchor.txt`(原文,不加引号):

```
cinematic digital illustration in the style of NetDragon brand, semi-realistic with soft anime painterly quality, clean lines, vibrant but restrained color palette, core palette: electric blue #1E6EFF, tech cyan #14C7C1, amber gold #F5A623, deep ink navy #0B1A3A, pure white highlights; gentle rim light from top-right, soft ambient occlusion, subtle hexagonal tech pattern as environmental hint, ultra-clean composition with generous negative space, no text or logos, production-quality final asset for a SaaS dashboard, consistent lighting across all pieces; avoid: photorealistic human skin, watermarks, UI mockups with fake text, random 3D renders
```

- [ ] **Step 2:创建 hero 家族模板**

写入 `scripts/nd-prompts/family-hero.txt`:

```
wide horizontal cinematic hero banner for a dashboard page about <TOPIC>, atmospheric depth with background AI factory floor softly blurred, foreground focal element <HERO-SUBJECT>, flowing energy streams suggesting data pipelines, LANDSCAPE 16:9, left 40% of the image intentionally quieter to leave space for text overlay on the final page
```

- [ ] **Step 3:创建 scene 家族模板**

写入 `scripts/nd-prompts/family-scene.txt`:

```
portrait of an AI worker named <NAME> in their digital workstation, role: <ROLE>, centered medium shot, holographic screens and floating data panels around them, geometric hex-grid floor, ambient cyan-blue workshop lighting, <MOOD> expression, <GESTURE>, modern minimalist attire in <TEAM-COLOR>, friendly and professional demeanor, vertical portrait 4:5 framing
```

- [ ] **Step 4:创建 banner 家族模板**

写入 `scripts/nd-prompts/family-banner.txt`:

```
narrow horizontal section banner for <SECTION-THEME>, decorative hexagonal motifs on the right third, a single thin gold divider line, minimal and architectural, left 60% reserved as quiet space, aspect ratio roughly 4:1
```

- [ ] **Step 5:创建 badge 家族模板**

写入 `scripts/nd-prompts/family-badge.txt`:

```
circular achievement medal emblem, isolated on transparent background, metallic rim with subtle gold filigree, central icon concept <ICON-CONCEPT> rendered in electric blue and cyan gradient with soft glow, floating geometric particles around, no text, no outer background, PNG with alpha channel, 1:1 square ratio
```

- [ ] **Step 6:创建 empty-state 家族模板**

写入 `scripts/nd-prompts/family-empty-state.txt`:

```
small friendly illustration for a UI empty state conveying <FEELING>, minimal line art with soft gradient fills in the NetDragon palette, a central small-scene element <SUBJECT> floating in clean white space, gentle cyan ambient glow, rounded shapes, not somber, leaves plenty of whitespace around the focal element
```

- [ ] **Step 7:创建 ornament 家族模板**

写入 `scripts/nd-prompts/family-ornament.txt`:

```
abstract decorative graphic fragment, <MOTIF>, rendered in electric blue to cyan gradient with soft bloom, transparent background where possible, designed to be placed as a corner accent or divider, no text, no scene, purely decorative geometry
```

- [ ] **Step 8:创建 widget-bg 家族模板**

写入 `scripts/nd-prompts/family-widget-bg.txt`:

```
ultra-subtle background texture for a UI card interior, <PATTERN> pattern at very low contrast, almost white with a faint cool blue tint, meant to sit behind chart and text without distracting, absolutely no focal object
```

- [ ] **Step 9:创建 milestone 家族模板**

写入 `scripts/nd-prompts/family-milestone.txt`:

```
ceremonial dark-toned display card visual for <MILESTONE>, deep navy background, symmetric composition with thin gold frame lines, a central glowing emblem <EMBLEM>, soft spotlights from above, formal and celebratory atmosphere, generous negative space, no text
```

- [ ] **Step 10:创建 texture 家族模板**

写入 `scripts/nd-prompts/family-texture.txt`:

```
tileable subtle background texture, faint hexagonal tech grid with extremely low contrast, nearly white cool-tinted surface, meant to be applied as a full-page background at low opacity, seamless, no focal element
```

- [ ] **Step 11:创建 catalog 初版**

写入 `scripts/nd-catalog.json`:

```json
{
  "$schema": "./nd-catalog.schema.json",
  "version": "0.1.0",
  "assets": {
    "smoke-test": {
      "family": "ornament",
      "subject": "smoke test fragment",
      "promptVars": {
        "MOTIF": "a single hexagonal energy node emitting a soft glow, surrounded by 3-4 smaller orbiting polygons"
      },
      "sizes": [
        { "label": "default", "width": 1024, "height": 1024 }
      ],
      "tier": "normal",
      "fallback": { "type": "gradient", "from": "#1E6EFF", "to": "#14C7C1" }
    },
    "hero-dashboard": {
      "family": "hero",
      "subject": "dashboard welcome (placeholder for phase 1)",
      "promptVars": {
        "TOPIC": "AI workforce command center",
        "HERO-SUBJECT": "ethereal holographic dashboard suspended in clean factory space with soft morning light"
      },
      "sizes": [
        { "label": "desktop", "width": 1920, "height": 600 },
        { "label": "tablet",  "width": 1024, "height": 380 },
        { "label": "mobile",  "width": 640,  "height": 360 }
      ],
      "tier": "top",
      "fallback": { "type": "gradient", "from": "#0B1A3A", "to": "#142651" }
    },
    "scene-ai-game-designer": {
      "family": "scene",
      "subject": "AI Game Designer workstation (placeholder for phase 1)",
      "promptVars": {
        "NAME": "AI Game Designer",
        "ROLE": "game mechanic designer",
        "MOOD": "focused creative flow",
        "GESTURE": "hands lightly gesturing toward a floating 3D game world",
        "TEAM-COLOR": "sapphire blue"
      },
      "sizes": [
        { "label": "card", "width": 800, "height": 1000 }
      ],
      "tier": "top",
      "fallback": { "type": "svg", "path": "scene-generic.svg" }
    }
  }
}
```

本阶段 catalog 只需要 3 条:1 条 smoke-test(本阶段真跑),2 条占位(阶段 1 批次 1 会跑,先占好槽位用于验证 catalog 结构)。

- [ ] **Step 12:验证所有文件存在且大小合理**

Run:
```bash
ls -la scripts/nd-catalog.json scripts/nd-prompts/
```

Expected:
- `nd-catalog.json` 存在且 > 500 bytes
- `nd-prompts/` 下有 10 个 `.txt` 文件(1 个 global + 9 个 family)

```bash
cat scripts/nd-catalog.json | python3 -m json.tool > /dev/null && echo "valid JSON"
```

Expected:`valid JSON`

- [ ] **Step 13:提交**

```bash
git add scripts/nd-catalog.json scripts/nd-prompts/
git commit -m "feat(nd-ui): add initial asset catalog and nine prompt family templates"
```

---

### Task 3:实现素材生成主脚本

**Files:**
- Create: `scripts/generate-netdragon-assets.ts`

**步骤:**

- [ ] **Step 1:创建脚本文件**

写入 `scripts/generate-netdragon-assets.ts`:

```typescript
/**
 * NetDragon 素材生成主脚本
 *
 * 用法:
 *   npm run nd:generate -- --id=smoke-test              单张
 *   npm run nd:generate -- --batch=1                    按 tier=top 的一批
 *   npm run nd:generate -- --family=scene               按家族
 *   npm run nd:generate -- --dry-run                    只打印 prompt,不实际调 API
 *
 * 输出:
 *   public/netdragon/<family>/<id>.png (原始 PNG 母版)
 *   后续由 nd-post-process 派生 WebP 和多尺寸
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import https from "node:https";

// ───── .env.local 加载(沿用 generate-avatars.ts 做法)─────
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.warn("Warning: .env.local not found, relying on existing env vars");
    return;
  }
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

// ───── 类型 ─────
interface Size { label: string; width: number; height: number; }
interface Fallback {
  type: "gradient" | "svg" | "solid";
  from?: string; to?: string; color?: string; path?: string;
}
interface CatalogEntry {
  family: string;
  subject: string;
  promptVars: Record<string, string>;
  sizes: Size[];
  tier: "top" | "normal";
  fallback: Fallback;
}
interface Catalog {
  version: string;
  assets: Record<string, CatalogEntry>;
}

// ───── CLI 参数解析 ─────
interface CliArgs {
  id?: string;
  family?: string;
  batch?: string;
  dryRun: boolean;
}
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false };
  for (const a of argv) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--id=")) args.id = a.slice(5);
    else if (a.startsWith("--family=")) args.family = a.slice(9);
    else if (a.startsWith("--batch=")) args.batch = a.slice(8);
  }
  return args;
}

// ───── Prompt 拼装:global + family + vars + tier modifier ─────
function loadPromptFragment(file: string): string {
  const p = resolve(process.cwd(), "scripts/nd-prompts", file);
  if (!existsSync(p)) throw new Error(`Prompt fragment not found: ${p}`);
  return readFileSync(p, "utf-8").trim();
}

function buildPrompt(entry: CatalogEntry): string {
  const global = loadPromptFragment("global-anchor.txt");
  const family = loadPromptFragment(`family-${entry.family}.txt`);

  // 变量替换:<KEY> → value
  let familyFilled = family;
  for (const [k, v] of Object.entries(entry.promptVars)) {
    familyFilled = familyFilled.replaceAll(`<${k}>`, v);
  }

  const tierModifier = entry.tier === "top"
    ? "ultra-high quality, every detail intentional, production-ready final asset"
    : "";

  return [global, familyFilled, tierModifier].filter(Boolean).join("\n\n");
}

// ───── 批次筛选 ─────
function selectEntries(catalog: Catalog, args: CliArgs): Array<[string, CatalogEntry]> {
  const all = Object.entries(catalog.assets);
  if (args.id) {
    const hit = all.find(([k]) => k === args.id);
    if (!hit) throw new Error(`id not found in catalog: ${args.id}`);
    return [hit];
  }
  if (args.family) {
    return all.filter(([, v]) => v.family === args.family);
  }
  if (args.batch === "1") {
    return all.filter(([, v]) => v.tier === "top");
  }
  // 默认:全部
  return all;
}

// ───── 调用 gpt-image-2(沿用 generate-avatars.ts 的 node:https 写法)─────
interface GenResult { ok: boolean; sizeKB?: number; error?: string; }

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateOne(
  id: string,
  entry: CatalogEntry,
  prompt: string,
  size: Size,
  outDir: string,
  dryRun: boolean,
): Promise<GenResult> {
  if (dryRun) {
    console.log(`\n[DRY] id=${id} size=${size.width}x${size.height}`);
    console.log(`[DRY] prompt:\n${prompt}\n`);
    return { ok: true, sizeKB: 0 };
  }

  const gatewayUrl = process.env.IMAGE_API_GATEWAY_URL;
  const apiKey = process.env.IMAGE_API_KEY;
  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing IMAGE_API_GATEWAY_URL or IMAGE_API_KEY" };
  }

  const maxRetries = entry.tier === "top" ? 8 : 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await new Promise<GenResult>((resolvePromise) => {
      const url = new URL(`${gatewayUrl}/v1/images/generations`);
      const body = JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: `${size.width}x${size.height}`,
        quality: entry.tier === "top" ? "high" : "medium",
      });
      const req = https.request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
          Connection: "close",
        },
        timeout: 600_000,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            if (json.error) return resolvePromise({ ok: false, error: json.error.message });
            const b64 = json.data?.[0]?.b64_json;
            if (!b64) return resolvePromise({ ok: false, error: "No image data in response" });
            const imgBuffer = Buffer.from(b64, "base64");
            const familyDir = join(outDir, entry.family);
            mkdirSync(familyDir, { recursive: true });
            const outPath = join(familyDir, `${id}-${size.label}.png`);
            writeFileSync(outPath, imgBuffer);
            resolvePromise({ ok: true, sizeKB: Math.round(imgBuffer.length / 1024) });
          } catch (e) {
            resolvePromise({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        });
      });
      req.on("error", (e) => resolvePromise({ ok: false, error: e.message }));
      req.on("timeout", () => { req.destroy(); resolvePromise({ ok: false, error: "Timeout 600s" }); });
      req.write(body);
      req.end();
    });

    if (result.ok) return result;
    if (attempt < maxRetries) {
      console.log(`  Retry ${attempt}/${maxRetries} for ${id}-${size.label}...`);
      await sleep(10_000);
    } else {
      return result;
    }
  }
  return { ok: false, error: "Unreachable" };
}

// ───── main ─────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const catalogPath = resolve(process.cwd(), "scripts/nd-catalog.json");
  const catalog: Catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));

  const entries = selectEntries(catalog, args);
  if (entries.length === 0) {
    console.error("No entries matched the selection.");
    process.exit(1);
  }

  const outDir = resolve(process.cwd(), "public/netdragon");
  mkdirSync(outDir, { recursive: true });

  console.log(`\nNetDragon asset generation — ${entries.length} entries, dryRun=${args.dryRun}\n`);

  let succeeded = 0, failed = 0;
  const failures: string[] = [];

  for (const [id, entry] of entries) {
    const prompt = buildPrompt(entry);
    for (const size of entry.sizes) {
      console.log(`GEN  ${id} [${size.label} ${size.width}x${size.height}] tier=${entry.tier}`);
      const r = await generateOne(id, entry, prompt, size, outDir, args.dryRun);
      if (r.ok) {
        console.log(`OK   ${id}-${size.label} (${r.sizeKB} KB)`);
        succeeded++;
      } else {
        console.error(`FAIL ${id}-${size.label}: ${r.error}`);
        failed++;
        failures.push(`${id}-${size.label}: ${r.error}`);
      }
      if (!args.dryRun) await sleep(3_000);
    }
  }

  console.log("\n" + "─".repeat(50));
  console.log(`Summary: ${succeeded} succeeded, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
```

- [ ] **Step 2:在 package.json 的 scripts 里新增 `nd:generate`**

修改 `package.json`,在 `"generate:avatars": "..."` 那一行之后追加一行:

```json
    "nd:generate": "tsx scripts/generate-netdragon-assets.ts",
```

注意前一行末尾的逗号要保留。完整上下文变成:

```json
    "db:seed": "tsx src/db/seed.ts",
    "generate:avatars": "tsx scripts/generate-avatars.ts",
    "nd:generate": "tsx scripts/generate-netdragon-assets.ts"
```

- [ ] **Step 3:dry-run 验证 prompt 拼装正确**

Run:
```bash
npm run nd:generate -- --id=smoke-test --dry-run
```

Expected:
- 看到 `[DRY] id=smoke-test size=1024x1024`
- 看到完整的 prompt 文本,其中包含三段拼接(全局锚点 + ornament 家族模板 + 填入后的 MOTIF)
- `Summary: 1 succeeded, 0 failed`
- exit 0

如果 prompt 里还残留 `<MOTIF>` 字样,说明变量替换失败,停下来检查 `buildPrompt` 的 `replaceAll` 逻辑。

- [ ] **Step 4:dry-run 验证批次筛选**

Run:
```bash
npm run nd:generate -- --batch=1 --dry-run
```

Expected:输出 2 条(hero-dashboard + scene-ai-game-designer,因为它们 tier=top),smoke-test 因为 tier=normal 不在 batch=1 里。

Run:
```bash
npm run nd:generate -- --family=scene --dry-run
```

Expected:只输出 scene-ai-game-designer 这 1 条。

- [ ] **Step 5:提交**

```bash
git add scripts/generate-netdragon-assets.ts package.json
git commit -m "feat(nd-ui): add catalog-driven asset generation script with dry-run and batch filter"
```

---

### Task 4:真实 smoke-test — 跑 1 张图验证端到端

**Files:**
- 无文件新建,仅真实调 API

**步骤:**

- [ ] **Step 1:真实生成 smoke-test 图**

Run:
```bash
npm run nd:generate -- --id=smoke-test
```

Expected:
- 控制台输出 `GEN smoke-test [default 1024x1024] tier=normal`
- 若 API 正常,输出 `OK smoke-test-default (xxx KB)`(KB 通常在 800-2500)
- 若失败,会按 normal tier 重试 3 次

**若 3 次全失败**:停下来,检查 `.env.local` 里的 `IMAGE_API_GATEWAY_URL` 是否可达;不要继续往下走。

- [ ] **Step 2:确认文件落地**

Run:
```bash
ls -la public/netdragon/ornament/
```

Expected:
- 存在 `smoke-test-default.png`
- 大小在 500KB ~ 3MB 之间

- [ ] **Step 3:人工视觉确认(用户参与)**

打开文件查看:
```bash
open public/netdragon/ornament/smoke-test-default.png
```

用户主观判断:图是否**符合网龙风基调**(电光蓝 + 科技青 + 六边形元素 + 干净构图)。

**这一步是"人工闸"的第一次预演**。如果用户看到后觉得色调不对/风格偏离太远,**不要继续 Task 5+**,而是:
- 返回 Task 2 调整 `global-anchor.txt` 或 `family-ornament.txt`
- 删除 `public/netdragon/ornament/smoke-test-default.png`
- 重跑 Task 4 Step 1,直到视觉通过

- [ ] **Step 4:提交(不提交 PNG 本体,只提交一个证明性的 checksum)**

先修改 `.gitignore`,在末尾追加:

```
# NetDragon original PNGs (母版)— 不入 git,避免仓库膨胀
/public/netdragon/**/*.png
```

Run:
```bash
git add .gitignore
git commit -m "chore(nd-ui): ignore NetDragon PNG masters (keep repo lean)"
```

可选:把 smoke-test 的 checksum 记入提交信息留痕:
```bash
shasum -a 256 public/netdragon/ornament/smoke-test-default.png
```

---

### Task 5:PNG 后处理 — WebP + 多尺寸派生

**Files:**
- Create: `scripts/nd-post-process.ts`
- Modify: `package.json`(加 `nd:postprocess` 脚本)

**步骤:**

- [ ] **Step 1:创建后处理脚本**

写入 `scripts/nd-post-process.ts`:

```typescript
/**
 * NetDragon 后处理脚本
 *
 * 读 catalog,对 public/netdragon/<family>/<id>-<label>.png 做:
 *   - 生成 <id>-<label>.webp     (quality 85,@1x)
 *   - 生成 <id>-<label>@2x.webp  (sharp resize 2x,但 gpt-image-2 原生已高清,这里实际是"identity"作为兜底)
 *
 * 用法:
 *   npm run nd:postprocess                     处理所有已存在的 PNG
 *   npm run nd:postprocess -- --id=smoke-test  只处理单张
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import sharp from "sharp";

interface Size { label: string; width: number; height: number; }
interface CatalogEntry { family: string; sizes: Size[]; }
interface Catalog { version: string; assets: Record<string, CatalogEntry>; }

interface Args { id?: string; }
function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (const a of argv) {
    if (a.startsWith("--id=")) args.id = a.slice(5);
  }
  return args;
}

async function processOne(
  id: string,
  entry: CatalogEntry,
  size: Size,
  publicDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const familyDir = join(publicDir, entry.family);
  const srcPng = join(familyDir, `${id}-${size.label}.png`);
  if (!existsSync(srcPng)) {
    return { ok: false, error: `source PNG missing: ${srcPng}` };
  }

  const dst1x = join(familyDir, `${id}-${size.label}.webp`);
  const dst2x = join(familyDir, `${id}-${size.label}@2x.webp`);

  try {
    // @1x:按 catalog 指定的 width 压到目标宽度(gpt-image-2 原生即目标尺寸,这里实际是 identity+压缩)
    await sharp(srcPng)
      .resize({ width: size.width, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dst1x);

    // @2x:原始图按 2x 宽度输出(若原图不够大,不放大,保持原宽)
    await sharp(srcPng)
      .resize({ width: size.width * 2, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dst2x);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const catalogPath = resolve(process.cwd(), "scripts/nd-catalog.json");
  const catalog: Catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
  const publicDir = resolve(process.cwd(), "public/netdragon");

  const entries = args.id
    ? Object.entries(catalog.assets).filter(([k]) => k === args.id)
    : Object.entries(catalog.assets);

  if (entries.length === 0) {
    console.error("No matching entries.");
    process.exit(1);
  }

  let ok = 0, fail = 0;
  const failures: string[] = [];

  for (const [id, entry] of entries) {
    for (const size of entry.sizes) {
      const familyDir = join(publicDir, entry.family);
      const srcPng = join(familyDir, `${id}-${size.label}.png`);
      if (!existsSync(srcPng)) {
        console.log(`SKIP ${id}-${size.label} (no source PNG yet)`);
        continue;
      }
      process.stdout.write(`PROC ${id}-${size.label} ... `);
      const r = await processOne(id, entry, size, publicDir);
      if (r.ok) {
        const w1 = statSync(join(familyDir, `${id}-${size.label}.webp`)).size;
        const w2 = statSync(join(familyDir, `${id}-${size.label}@2x.webp`)).size;
        console.log(`OK  @1x=${Math.round(w1/1024)}KB @2x=${Math.round(w2/1024)}KB`);
        ok++;
      } else {
        console.log(`FAIL ${r.error}`);
        failures.push(`${id}-${size.label}: ${r.error}`);
        fail++;
      }
    }
  }

  console.log("\n" + "─".repeat(50));
  console.log(`Summary: ${ok} processed, ${fail} failed`);
  if (fail > 0) {
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
```

- [ ] **Step 2:在 package.json 里加 `nd:postprocess`**

在 `nd:generate` 后面追加(注意前行逗号):

```json
    "nd:generate": "tsx scripts/generate-netdragon-assets.ts",
    "nd:postprocess": "tsx scripts/nd-post-process.ts"
```

- [ ] **Step 3:跑一次 smoke-test 的后处理**

Run:
```bash
npm run nd:postprocess -- --id=smoke-test
```

Expected:
- 输出 `PROC smoke-test-default ... OK  @1x=XXkB @2x=YYkB`
- `@1x` 通常 < 200KB,`@2x` 通常 < 500KB(smoke-test 是 1024×1024 的 ornament,远低于 hero 预算)
- `Summary: 1 processed, 0 failed`

- [ ] **Step 4:确认 WebP 文件落地**

Run:
```bash
ls -la public/netdragon/ornament/
```

Expected:
- `smoke-test-default.png`(原 PNG 母版)
- `smoke-test-default.webp`(新 @1x WebP)
- `smoke-test-default@2x.webp`(新 @2x WebP)

- [ ] **Step 5:提交**

```bash
git add scripts/nd-post-process.ts package.json public/netdragon/ornament/smoke-test-default.webp public/netdragon/ornament/smoke-test-default@2x.webp
git commit -m "feat(nd-ui): add PNG → WebP post-processing with @1x/@2x derivation"
```

WebP 进 git(体积可控),PNG 母版按 Task 4 Step 4 的 `.gitignore` 规则不进。

---

### Task 6:素材原语组件 — NdAssetCatalog(类型 + loader)

**Files:**
- Create: `src/components/netdragon/primitives/nd-asset-catalog.ts`

**步骤:**

- [ ] **Step 1:创建 catalog 类型和 loader**

写入 `src/components/netdragon/primitives/nd-asset-catalog.ts`:

```typescript
/**
 * NdAssetCatalog — 素材清单的运行时映射
 *
 * 设计意图:
 *   业务组件用 <NdAsset id="hero-dashboard" /> 引用素材,不写死路径。
 *   这里把 scripts/nd-catalog.json 转成浏览器可用的映射。
 *
 *   Next.js App Router 服务端组件默认能 import JSON,
 *   但为了显式且可预测,这里用 TypeScript 声明包一层。
 */

import catalogJson from "../../../../scripts/nd-catalog.json";

export type NdAssetFamily =
  | "hero" | "scene" | "banner" | "badge"
  | "empty-state" | "ornament" | "widget-bg"
  | "milestone" | "texture";

export type NdAssetTier = "top" | "normal";

export interface NdAssetSize {
  label: string;
  width: number;
  height: number;
}

export type NdAssetFallback =
  | { type: "gradient"; from: string; to: string }
  | { type: "svg"; path: string }
  | { type: "solid"; color: string };

export interface NdAssetEntry {
  family: NdAssetFamily;
  subject: string;
  promptVars: Record<string, string>;
  sizes: NdAssetSize[];
  tier: NdAssetTier;
  fallback: NdAssetFallback;
}

interface CatalogShape {
  version: string;
  assets: Record<string, NdAssetEntry>;
}

const catalog = catalogJson as unknown as CatalogShape;

export const ND_CATALOG_VERSION = catalog.version;

export function getNdAsset(id: string): NdAssetEntry | undefined {
  return catalog.assets[id];
}

export function listNdAssets(filter?: {
  family?: NdAssetFamily;
  tier?: NdAssetTier;
}): Array<[string, NdAssetEntry]> {
  const all = Object.entries(catalog.assets);
  if (!filter) return all;
  return all.filter(([, e]) =>
    (!filter.family || e.family === filter.family) &&
    (!filter.tier || e.tier === filter.tier)
  );
}

/**
 * 给定 id 和 label,返回该素材在 public/ 下的路径(WebP 优先)
 * 不保证文件一定存在 —— 调用方需要处理加载失败。
 */
export function getNdAssetPath(id: string, label: string, density: "1x" | "2x" = "1x"): string | null {
  const entry = catalog.assets[id];
  if (!entry) return null;
  if (!entry.sizes.find((s) => s.label === label)) return null;
  const suffix = density === "2x" ? "@2x" : "";
  return `/netdragon/${entry.family}/${id}-${label}${suffix}.webp`;
}
```

- [ ] **Step 2:验证 TypeScript 能编译**

Run:
```bash
npx tsc --noEmit
```

Expected:无错误输出,exit 0。

若报 `Cannot find module '../../../../scripts/nd-catalog.json'`,说明 `tsconfig.json` 的 `resolveJsonModule` 未开启。打开 `tsconfig.json`,在 `compilerOptions` 里确认有 `"resolveJsonModule": true`(Next.js 16 默认开启;若没有则补上)。

- [ ] **Step 3:提交**

```bash
git add src/components/netdragon/primitives/nd-asset-catalog.ts
git commit -m "feat(nd-ui): add typed catalog loader for asset primitives"
```

---

### Task 7:素材原语组件 — NdAsset(图片渲染 + fallback)

**Files:**
- Create: `src/components/netdragon/primitives/nd-asset.tsx`

**步骤:**

- [ ] **Step 1:创建 NdAsset 组件**

写入 `src/components/netdragon/primitives/nd-asset.tsx`:

```typescript
/**
 * NdAsset — 所有网龙 AI 素材的统一渲染入口
 *
 * 职责:
 *   1. 通过 id 从 catalog 查到 WebP 路径
 *   2. 渲染 <img> 并启用 lazy loading
 *   3. 首选 @1x,支持 @2x 的 srcSet
 *   4. 加载失败时自动切到 fallback(gradient / svg / solid)
 *   5. 用户开了省流模式(saveData)时跳过图片,直接显示 fallback
 *
 * 用法:
 *   <NdAsset id="hero-dashboard" label="desktop" alt="驾驶舱欢迎" />
 *   <NdAsset id="badge-weekly-top" label="default" alt="本周明星" className="w-16 h-16" />
 */

"use client";

import { useEffect, useState } from "react";
import { getNdAsset, getNdAssetPath, type NdAssetFallback } from "./nd-asset-catalog";

interface NdAssetProps {
  id: string;
  label: string;
  alt: string;
  className?: string;
  /** 若传入,覆盖 catalog 定义 */
  fallbackOverride?: NdAssetFallback;
  /** 优先级高的图片(如首屏 hero)可传 eager */
  loading?: "lazy" | "eager";
}

function renderFallback(fb: NdAssetFallback, alt: string, className?: string) {
  if (fb.type === "gradient") {
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{ background: `linear-gradient(135deg, ${fb.from}, ${fb.to})` }}
      />
    );
  }
  if (fb.type === "solid") {
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{ background: fb.color }}
      />
    );
  }
  // svg
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/netdragon/_fallback/${fb.path}`}
      alt={alt}
      className={className}
    />
  );
}

export function NdAsset({
  id,
  label,
  alt,
  className,
  fallbackOverride,
  loading = "lazy",
}: NdAssetProps) {
  const entry = getNdAsset(id);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // 仅客户端:若用户开了省流,直接 fallback
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData === true) setUseFallback(true);
    if (conn?.effectiveType && ["2g", "slow-2g"].includes(conn.effectiveType)) {
      setUseFallback(true);
    }
  }, []);

  if (!entry) {
    // catalog 里没有:返回一个 warning 样式的占位,不是硬错误
    return (
      <div
        role="img"
        aria-label={`缺失素材:${id}`}
        className={className}
        style={{ background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}
      >
        missing:{id}
      </div>
    );
  }

  const fb = fallbackOverride ?? entry.fallback;

  if (useFallback) {
    return renderFallback(fb, alt, className);
  }

  const src1x = getNdAssetPath(id, label, "1x");
  const src2x = getNdAssetPath(id, label, "2x");
  if (!src1x) return renderFallback(fb, alt, className);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src1x}
      srcSet={src2x ? `${src1x} 1x, ${src2x} 2x` : undefined}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setUseFallback(true)}
    />
  );
}
```

- [ ] **Step 2:创建 primitives 的 index.ts 统一导出**

写入 `src/components/netdragon/primitives/index.ts`:

```typescript
export { NdAsset } from "./nd-asset";
export {
  getNdAsset,
  getNdAssetPath,
  listNdAssets,
  ND_CATALOG_VERSION,
  type NdAssetEntry,
  type NdAssetFamily,
  type NdAssetFallback,
  type NdAssetSize,
  type NdAssetTier,
} from "./nd-asset-catalog";
```

- [ ] **Step 3:创建顶级 index.ts**

写入 `src/components/netdragon/index.ts`:

```typescript
export * from "./primitives";
```

本阶段只有 primitives,阶段 1 开始会有更多 Nd 组件在这里导出。

- [ ] **Step 4:TypeScript 编译验证**

Run:
```bash
npx tsc --noEmit
```

Expected:无错误。

- [ ] **Step 5:ESLint 验证**

Run:
```bash
npm run lint
```

Expected:无 error(warning 可以有,但不能有 error)。

- [ ] **Step 6:提交**

```bash
git add src/components/netdragon/
git commit -m "feat(nd-ui): add NdAsset primitive with fallback and save-data awareness"
```

---

### Task 8:SVG 替身原语 + fallback 目录

**Files:**
- Create: `src/components/netdragon/primitives/nd-asset-svg.tsx`
- Create: `public/netdragon/_fallback/scene-generic.svg`

**步骤:**

- [ ] **Step 1:创建 SVG 通用替身(供 scene 家族的 fallback 使用)**

写入 `public/netdragon/_fallback/scene-generic.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000" role="img" aria-label="AI 员工场景(降级)">
  <defs>
    <linearGradient id="ndScene" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#c7d2fe"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#ndScene)"/>
  <circle cx="400" cy="400" r="130" fill="#ffffff" opacity="0.9"/>
  <circle cx="400" cy="400" r="90" fill="#1E6EFF" opacity="0.15"/>
  <polygon points="340,600 460,600 470,680 330,680" fill="#ffffff" opacity="0.8"/>
  <polygon points="500,120 560,80 620,120 620,200 560,240 500,200" fill="none" stroke="#1E6EFF" stroke-width="2" opacity="0.35"/>
  <polygon points="180,800 240,760 300,800 300,880 240,920 180,880" fill="none" stroke="#14C7C1" stroke-width="2" opacity="0.35"/>
</svg>
```

- [ ] **Step 2:创建 NdAssetSvg 组件(供直接引用 SVG 替身 / ornament 降级场景)**

写入 `src/components/netdragon/primitives/nd-asset-svg.tsx`:

```typescript
/**
 * NdAssetSvg — 直接渲染 public/netdragon/_fallback/ 下的 SVG 资产
 *
 * 用途:徽章 / ornament 在首屏 / 高频区已知不走 WebP 时,直接引用 SVG
 *       以获得最佳性能(< 5KB,矢量,不依赖加载)。
 *
 * 用法:
 *   <NdAssetSvg path="scene-generic.svg" alt="通用场景" className="w-full h-auto" />
 */

interface NdAssetSvgProps {
  path: string;
  alt: string;
  className?: string;
}

export function NdAssetSvg({ path, alt, className }: NdAssetSvgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/netdragon/_fallback/${path}`}
      alt={alt}
      className={className}
    />
  );
}
```

- [ ] **Step 3:更新 primitives/index.ts 导出 NdAssetSvg**

修改 `src/components/netdragon/primitives/index.ts`,在 `export { NdAsset } ...` 行下面追加:

```typescript
export { NdAssetSvg } from "./nd-asset-svg";
```

完整文件现在是:

```typescript
export { NdAsset } from "./nd-asset";
export { NdAssetSvg } from "./nd-asset-svg";
export {
  getNdAsset,
  getNdAssetPath,
  listNdAssets,
  ND_CATALOG_VERSION,
  type NdAssetEntry,
  type NdAssetFamily,
  type NdAssetFallback,
  type NdAssetSize,
  type NdAssetTier,
} from "./nd-asset-catalog";
```

- [ ] **Step 4:TypeScript + ESLint 验证**

Run:
```bash
npx tsc --noEmit && npm run lint
```

Expected:两个都无 error。

- [ ] **Step 5:提交**

```bash
git add src/components/netdragon/primitives/nd-asset-svg.tsx src/components/netdragon/primitives/index.ts public/netdragon/_fallback/scene-generic.svg
git commit -m "feat(nd-ui): add NdAssetSvg and generic scene fallback svg"
```

---

### Task 9:Smoke-Test 页面 — 端到端视觉验证

**Files:**
- Create: `src/app/nd-smoke/page.tsx`

**步骤:**

- [ ] **Step 1:创建临时 smoke-test 页面**

写入 `src/app/nd-smoke/page.tsx`:

```tsx
/**
 * NetDragon 基建 smoke-test 页面
 *
 * 用途:验证 Task 1-8 的基建全部生效。阶段 1 结束后删除此文件。
 *
 * 验收点:
 *   1. 页面能打开(http://localhost:3000/nd-smoke)
 *   2. 能看到 4 个色块,分别用 bg-nd-primary / bg-nd-secondary / bg-nd-accent / bg-nd-emerald
 *   3. 看到一张 smoke-test WebP 图(生成于 Task 4-5)
 *   4. 看到一个带能量流动动效的进度条
 *   5. 看到一个字体为 Orbitron 的大数字
 *   6. 看到 scene-generic.svg 占位图(NdAssetSvg 直接渲染)
 */

import { NdAsset, NdAssetSvg } from "@/components/netdragon";

export default function NdSmokePage() {
  return (
    <main className="min-h-screen bg-nd-canvas p-10 font-nd-sans">
      <div className="mx-auto max-w-5xl space-y-10">
        <header>
          <h1 className="text-xl font-bold text-nd-ink">网龙基建 Smoke Test</h1>
          <p className="text-sm text-nd-ink-soft mt-2">
            这是阶段 0 的验收页面。阶段 1 结束后删除此文件。
          </p>
        </header>

        {/* 1. Token 色块 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            1. Tokens — 颜色
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-nd-lg bg-nd-primary shadow-nd-md p-4 text-white text-sm">
              primary · 电光蓝
            </div>
            <div className="rounded-nd-lg bg-nd-secondary shadow-nd-md p-4 text-white text-sm">
              secondary · 科技青
            </div>
            <div className="rounded-nd-lg bg-nd-accent shadow-nd-md p-4 text-nd-ink text-sm">
              accent · 琥珀金
            </div>
            <div className="rounded-nd-lg bg-nd-emerald shadow-nd-md p-4 text-white text-sm">
              emerald · 生产绿
            </div>
          </div>
        </section>

        {/* 2. Orbitron 字体 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            2. Tokens — 字体(Orbitron)
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6 text-center">
            <div className="text-sm text-nd-ink-soft">本月完成任务</div>
            <div className="text-5xl font-bold text-nd-ink font-nd-display mt-2">
              2,847
            </div>
          </div>
        </section>

        {/* 3. 能量流动 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            3. 能量流动动效(.nd-flow)
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <div className="h-2 rounded-nd-full bg-nd-line nd-flow" />
            <p className="text-xs text-nd-ink-soft mt-3">
              应当看到一道光从左到右循环流动。
            </p>
          </div>
        </section>

        {/* 4. NdAsset:真实 WebP */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            4. NdAsset — smoke-test WebP
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <NdAsset
              id="smoke-test"
              label="default"
              alt="Smoke test ornament"
              className="w-64 h-64 rounded-nd-lg object-cover"
              loading="eager"
            />
            <p className="text-xs text-nd-ink-soft mt-3">
              应当显示 Task 4 生成的 ornament 图。
            </p>
          </div>
        </section>

        {/* 5. NdAsset 的 fallback 路径:故意引用不存在的 id */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            5. NdAsset — fallback(引用不存在的 id)
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <NdAsset
              id="does-not-exist-xyz"
              label="default"
              alt="不存在的素材"
              className="w-64 h-64 rounded-nd-lg"
            />
            <p className="text-xs text-nd-ink-soft mt-3">
              应当显示红色 "missing:does-not-exist-xyz" 提示,而不是崩溃。
            </p>
          </div>
        </section>

        {/* 6. NdAssetSvg 直接渲染 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            6. NdAssetSvg — 直接渲染降级 SVG
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <NdAssetSvg
              path="scene-generic.svg"
              alt="通用场景占位"
              className="w-64 h-auto rounded-nd-lg"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2:启动 dev 服务器**

Run:
```bash
npm run dev
```

Expected:服务启动,等到 `Ready in ...`。

- [ ] **Step 3:在浏览器打开 smoke-test 页面**

用户手动访问:`http://localhost:3000/nd-smoke`

**逐项验收**(用户肉眼确认):

| 检查项 | 预期 |
|---|---|
| 页面能打开,无 500 错误 | 页面正常渲染 |
| 4 个色块显示正确颜色 | 电光蓝 / 科技青 / 琥珀金 / 生产绿 |
| 色块有圆角和冷蓝阴影 | `rounded-nd-lg` + `shadow-nd-md` 生效 |
| "2,847" 大数字字体是 Orbitron | 字符形态是科技感的几何字体(非默认无衬线) |
| 进度条光条从左到右循环流动 | `.nd-flow` 动效生效 |
| smoke-test WebP 图正常显示 | 显示 Task 4 生成的六边形能量节点图 |
| 不存在的素材显示红色 missing 提示 | NdAsset 的错误 fallback 生效 |
| scene-generic.svg 正常显示 | 淡蓝渐变 + 几何元素 |

**如果任一项不过**,停下来修,不要推到 Task 10。

- [ ] **Step 4:停掉 dev,提交**

按 Ctrl+C 停 dev,然后:

```bash
git add src/app/nd-smoke/page.tsx
git commit -m "feat(nd-ui): add phase-0 smoke-test page for end-to-end verification"
```

---

### Task 10:CI 性能预算脚本

**Files:**
- Create: `scripts/nd-budget-check.ts`
- Modify: `package.json`(加 `nd:budget-check`)

**步骤:**

- [ ] **Step 1:创建预算检查脚本**

写入 `scripts/nd-budget-check.ts`:

```typescript
/**
 * NetDragon 性能预算检查
 *
 * 规则(来自 spec §7.4):
 *   - 单张 @1x WebP ≤ 80 KB
 *   - 单张 @2x WebP ≤ 180 KB(例外:hero 家族允许 @2x ≤ 400KB,因为分辨率本就大)
 *   - 整站素材总量 ≤ 18 MB
 *
 * 扫描目录:public/netdragon/**\/*.webp
 * 超标 → 打印列表 + exit 1(供 CI 使用)
 */

import { readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const LIMIT_1X_KB = 80;
const LIMIT_2X_KB = 180;
const LIMIT_HERO_2X_KB = 400;
const LIMIT_TOTAL_MB = 18;

interface FileInfo { path: string; sizeKB: number; }

function walk(dir: string, out: FileInfo[] = []): FileInfo[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // public/netdragon 还没有就跳过
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith(".webp")) out.push({ path: full, sizeKB: Math.round(st.size / 1024) });
  }
  return out;
}

function main(): void {
  const root = resolve(process.cwd(), "public/netdragon");
  const files = walk(root);

  if (files.length === 0) {
    console.log("No .webp assets found under public/netdragon — skipping budget check.");
    return;
  }

  const violations: string[] = [];
  let totalKB = 0;

  for (const f of files) {
    totalKB += f.sizeKB;
    const rel = f.path.replace(process.cwd() + "/", "");
    const isHero = rel.includes("/hero/");
    const is2x = f.path.endsWith("@2x.webp");

    if (is2x) {
      const limit = isHero ? LIMIT_HERO_2X_KB : LIMIT_2X_KB;
      if (f.sizeKB > limit) {
        violations.push(`[@2x] ${rel} = ${f.sizeKB}KB (limit ${limit}KB)`);
      }
    } else {
      if (f.sizeKB > LIMIT_1X_KB) {
        violations.push(`[@1x] ${rel} = ${f.sizeKB}KB (limit ${LIMIT_1X_KB}KB)`);
      }
    }
  }

  const totalMB = totalKB / 1024;
  if (totalMB > LIMIT_TOTAL_MB) {
    violations.push(`[total] ${totalMB.toFixed(2)}MB (limit ${LIMIT_TOTAL_MB}MB)`);
  }

  console.log(`Scanned ${files.length} WebP files, total ${totalMB.toFixed(2)}MB`);

  if (violations.length > 0) {
    console.error("\nBudget violations:");
    for (const v of violations) console.error(`  ✗ ${v}`);
    process.exit(1);
  }

  console.log("✓ All assets within budget");
}

main();
```

- [ ] **Step 2:在 package.json 里加 `nd:budget-check`**

在 `nd:postprocess` 后面追加:

```json
    "nd:postprocess": "tsx scripts/nd-post-process.ts",
    "nd:budget-check": "tsx scripts/nd-budget-check.ts"
```

- [ ] **Step 3:跑一次预算检查(smoke-test 应当通过)**

Run:
```bash
npm run nd:budget-check
```

Expected:
- `Scanned 2 WebP files, total 0.XXMB`
- `✓ All assets within budget`
- exit 0

- [ ] **Step 4:人为制造一次预算违规,验证脚本会正确 fail**

Run:
```bash
# 临时复制一个大文件进 netdragon 目录制造违规
dd if=/dev/urandom of=public/netdragon/ornament/fake-violator.webp bs=1024 count=200
npm run nd:budget-check
```

Expected:
- 看到 `✗ [@1x] public/netdragon/ornament/fake-violator.webp = 200KB (limit 80KB)`
- exit 1(非 0)

Run 清理:
```bash
rm public/netdragon/ornament/fake-violator.webp
npm run nd:budget-check
```
Expected:又回到 `✓ All assets within budget`。

- [ ] **Step 5:提交**

```bash
git add scripts/nd-budget-check.ts package.json
git commit -m "feat(nd-ui): add asset performance budget check for CI"
```

---

### Task 11:基建使用文档 + 更新 .gitignore + 最终验收

**Files:**
- Create: `docs/netdragon-ui/README.md`
- Modify: `.gitignore`(确认 PNG 忽略规则)

**步骤:**

- [ ] **Step 1:创建使用文档**

写入 `docs/netdragon-ui/README.md`:

```markdown
# 网龙风 UI 基建 · 使用文档

本文档描述阶段 0 基建的用法。完整设计见
[spec](../superpowers/specs/2026-04-27-netdragon-ui-design.md)。

## 可用脚本

| 命令 | 作用 |
|---|---|
| `npm run nd:generate` | 根据 `scripts/nd-catalog.json` 生成素材(调用 gpt-image-2) |
| `npm run nd:postprocess` | 把 PNG 母版转成 WebP + 派生多尺寸 |
| `npm run nd:budget-check` | 扫描 public/netdragon/**/*.webp,超预算则 fail |

## 常用工作流

### 生成一张新素材

1. 在 `scripts/nd-catalog.json` 里加一条 entry,指定 family、promptVars、sizes、tier、fallback
2. 生成:
   ```bash
   npm run nd:generate -- --id=<your-id>
   ```
3. 肉眼确认 PNG 母版符合风格(`public/netdragon/<family>/<id>-<label>.png`)
4. 后处理:
   ```bash
   npm run nd:postprocess -- --id=<your-id>
   ```
5. 预算检查:
   ```bash
   npm run nd:budget-check
   ```
6. 在业务组件里引用:
   ```tsx
   import { NdAsset } from "@/components/netdragon";
   <NdAsset id="your-id" label="desktop" alt="描述" />
   ```

### 生成整批 top-tier 素材(阶段 1 开始用)

```bash
npm run nd:generate -- --batch=1      # 只跑 tier=top 的
npm run nd:postprocess                # 后处理所有已有 PNG
npm run nd:budget-check
```

### Dry-run(调试 prompt,不烧 API)

```bash
npm run nd:generate -- --id=<id> --dry-run
```

## 目录结构

```
scripts/
  nd-catalog.json          素材清单(单一数据源)
  nd-prompts/              9 个家族的 prompt 模板 + 1 个全局锚点
  generate-netdragon-assets.ts
  nd-post-process.ts
  nd-budget-check.ts

public/netdragon/
  <family>/                hero / scene / banner / ...
    <id>-<label>.png       PNG 母版(.gitignore,本地保留)
    <id>-<label>.webp      @1x WebP(入 git)
    <id>-<label>@2x.webp   @2x WebP(入 git)
  _fallback/               SVG 降级替身

src/components/netdragon/
  primitives/
    nd-asset.tsx           <NdAsset />
    nd-asset-svg.tsx       <NdAssetSvg />
    nd-asset-catalog.ts    catalog 的类型和 loader
    index.ts
  index.ts                 顶级导出
```

## Design Tokens

Tokens 在 `src/app/globals.css` 的 `@theme inline` 块中,以 `--color-nd-*` /
`--font-nd-*` / `--radius-nd-*` / `--shadow-nd-*` 命名。Tailwind v4 会自动
识别并生成 `bg-nd-primary` / `text-nd-ink` / `shadow-nd-md` / `font-nd-display`
/ `rounded-nd-lg` 等工具类。

能量流动动效通过 `.nd-flow` 这个 utility class 使用。

## 约束

- Tier 为 `top` 的素材允许 8 次 API 重试(色调/构图/细节追求最高质量)
- Tier 为 `normal` 只重试 3 次
- 单张 @1x WebP 预算 80KB,hero 家族 @2x 例外允许 400KB
- 业务组件不直接写 `bg-nd-*` 之类的 Tailwind 类做定制设计 —— 应当通过
  `netdragon/` 的高层组件消费设计语言(阶段 1 开始落地)
```

- [ ] **Step 2:确认 .gitignore 的 PNG 规则(Task 4 已加)**

Run:
```bash
grep "netdragon" .gitignore
```

Expected:看到 `/public/netdragon/**/*.png` 这一行。

若没有,补上:

```
# NetDragon PNG masters (keep local, avoid bloating repo)
/public/netdragon/**/*.png
```

- [ ] **Step 3:完整端到端验收**

**从零到一完整走一遍**,确认所有基建协同工作:

```bash
# 1. dry-run 验证 prompt 拼装
npm run nd:generate -- --id=smoke-test --dry-run

# 2. TypeScript 全量编译
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. 预算检查
npm run nd:budget-check

# 5. 启动 dev,访问 smoke-test 页
npm run dev
# 浏览器打开 http://localhost:3000/nd-smoke
# 肉眼确认 Task 9 的 6 项验收点
# 按 Ctrl+C 停 dev

# 6. build 验证生产构建
npm run build
```

Expected:
- 所有命令 exit 0
- `npm run build` 成功完成,无 TypeScript 错误
- dev 下 `/nd-smoke` 页面完整渲染且所有验收点通过

**任何一步失败,停下来修,不能带 bug 进阶段 1。**

- [ ] **Step 4:提交文档和最终验收**

```bash
git add docs/netdragon-ui/README.md .gitignore
git commit -m "docs(nd-ui): add phase-0 infrastructure usage documentation"
```

- [ ] **Step 5:阶段 0 完成声明**

到这里,阶段 0 的基建全部就位:

- ✅ Design Tokens 可用(`bg-nd-*` / `font-nd-display` / `shadow-nd-md` / `rounded-nd-lg` / `.nd-flow`)
- ✅ 素材生成流水线通(`nd:generate` → `nd:postprocess` → `nd:budget-check`)
- ✅ 素材原语可用(`<NdAsset />` / `<NdAssetSvg />` + catalog loader)
- ✅ CI 预算检查可用
- ✅ Smoke-test 页面作为 "Hello World" 已通过人工视觉验收

**进入阶段 1 的前置条件**:本阶段所有 Task 0-11 的 Step 都已打勾 + 用户对 smoke-test 页面亲自点头。

---

## Self-Review

**1. Spec 覆盖检查(对照 spec §8 阶段 0 交付物):**

| spec 要求 | plan 任务 |
|---|---|
| `src/app/globals.css` 注入 `--nd-*` tokens | Task 1 |
| Tailwind `@theme` 扩展 | Task 1 Step 1(Tailwind v4 无独立 config,在 globals.css `@theme inline` 中实现) |
| `src/components/netdragon/primitives/` 三底层 | Task 6(catalog)+ Task 7(NdAsset)+ Task 8(NdAssetSvg) |
| `scripts/nd-catalog.json` 初版 | Task 2 Step 11 |
| 9 家族 prompt 模板 + 全局锚点 | Task 2 Step 1-10 |
| `generate-netdragon-assets.ts` 主脚本(支持 --batch) | Task 3 |
| PNG → WebP 后处理 | Task 5 |
| CI 性能预算 lint | Task 10 |
| Visual Companion 审核闸 2 集成 | ⚠️ **未覆盖**。本计划没把"推图到 Visual Companion"写进去,因为阶段 0 还没真的跑批次。看下文补充 |
| 出口:smoke-test 全流程跑通 | Task 9 + Task 11 Step 3 |

**发现缺口**:Visual Companion 审核闸 2 的集成被延后了。实际上阶段 0 不需要 —— 本阶段只生成 1 张 smoke-test 图,用户 `open` 文件肉眼看一下即可(Task 4 Step 3)。真正的"批次审核流"是阶段 1 批次 1 才需要的,应在阶段 1 plan 里体现。**不补,保持阶段 0 最小范围。** 在阶段 1 plan 中明确承接。

**2. 占位符扫描**:无 "TBD" / "TODO" / "稍后" / "类似 Task X" 等。每个 code 步骤都给了完整代码。

**3. 类型一致性**:
- `NdAssetEntry` / `NdAssetSize` / `NdAssetFallback` 在 Task 6 定义,Task 7 使用 —— 一致
- `Catalog` / `CatalogEntry` 在 Task 3(生成脚本)和 Task 5(后处理)里各定义一次 —— 不冲突但有轻微重复。这两个脚本彼此独立,不 import 对方,所以轻微重复可接受,不值得为此抽一个 `nd-types.ts` 共享模块(YAGNI)。
- CLI 标志:Task 3 定义 `--id` / `--family` / `--batch` / `--dry-run`,Task 5 只用 `--id`,Task 10 无参数。风格一致(都用 `--key=value` 形式)。
- `font-nd-display` 在 Task 1 CSS 里定义为 `--font-nd-display`,Task 9 smoke 页面用 `font-nd-display` class 引用 —— 命名一致,Tailwind v4 规则会转换为 `.font-nd-display` 类。
- `bg-nd-primary` / `text-nd-ink` / `rounded-nd-lg` / `shadow-nd-md` / `.nd-flow` 在 Task 1 CSS 定义和 Task 9 页面使用两处都对齐。

**4. 可执行性 spot check**:
- Task 3 的 CLI 参数解析用了 `a.startsWith("--batch=")` —— 与 Task 3 Step 4 的调用 `--batch=1` 格式一致 ✓
- Task 7 用了 `"use client"`,但 Task 9 smoke 页面没加 —— 因为 smoke 页面本身是 server component,它引入 `NdAsset`(client)是合法的 Next 16 App Router 模式 ✓
- Task 1 的 `@theme inline` 扩展使用 `--color-nd-*` 命名,Task 9 用 `bg-nd-primary` 等 —— Tailwind v4 会自动生成这些类,正确 ✓

自审通过,无需返工。
