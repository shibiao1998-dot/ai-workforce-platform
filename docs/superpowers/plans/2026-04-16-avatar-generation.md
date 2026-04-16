# AI 员工头像批量生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Gemini API 为 24 名 AI 员工批量生成 2D 数字插画风格人像，集成到花名册卡片中。

**Architecture:** 一个独立的 build-time TypeScript 脚本调用 Gemini 3.1 Flash Image Preview API，顺序生成 24 张 512x768 PNG 人像存入 `public/avatars/`。seed.ts 更新 avatar 字段指向静态文件路径。

**Tech Stack:** TypeScript, tsx runner, Gemini API (OpenAI compatible format), Node.js fs/path/buffer

---

### Task 1: 环境配置 — .env.local + package.json script

**Files:**
- Create: `.env.local`
- Modify: `package.json` (scripts section)

- [ ] **Step 1: 创建 .env.local**

```
GEMINI_GATEWAY_URL=https://ai-gateway.aiae.ndhy.com
GEMINI_API_KEY=sk-nd-x0hURzXLt6ecXY5EAe524aFd016a48B58aCa75A5Af1e3
```

- [ ] **Step 2: 确认 .env.local 在 .gitignore 中**

Run: `grep '.env.local' .gitignore`
Expected: 至少一行匹配（Next.js 项目默认包含）。如果没有，添加 `.env.local` 到 `.gitignore`。

- [ ] **Step 3: 在 package.json scripts 中添加 generate:avatars**

在 `"db:seed"` 行之后添加：
```json
"generate:avatars": "tsx scripts/generate-avatars.ts"
```

- [ ] **Step 4: Commit**

```bash
git add .env.local package.json
git commit -m "chore: add avatar generation env config and npm script"
```

注意：如果 .env.local 被 gitignore 了（应该被忽略），则只 commit package.json。

---

### Task 2: 创建头像生成脚本

**Files:**
- Create: `scripts/generate-avatars.ts`

- [ ] **Step 1: 创建 scripts 目录**

```bash
mkdir -p scripts
```

- [ ] **Step 2: 创建 generate-avatars.ts**

写入以下完整脚本：

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const GATEWAY_URL = process.env.GEMINI_GATEWAY_URL;
const API_KEY = process.env.GEMINI_API_KEY;

if (!GATEWAY_URL || !API_KEY) {
  console.error("Missing GEMINI_GATEWAY_URL or GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const OUTPUT_DIR = resolve(process.cwd(), "public/avatars");
const MODEL = "gemini-3.1-flash-image-preview";
const DELAY_MS = 3000;
const TIMEOUT_MS = 90000;

const STYLE_PREFIX = `Create a professional 2D digital illustration portrait of a Chinese professional. Clean modern style with soft shading, head and shoulders composition, solid light gradient background, soft studio lighting. The character should look approachable and competent.`;

interface EmployeePrompt {
  name: string;
  description: string;
}

const EMPLOYEES: EmployeePrompt[] = [
  { name: "AI审计官", description: "Mature male, mid-40s, dark navy suit with tie, silver-rimmed glasses, serious confident expression, short neat hair" },
  { name: "AI项目绩效评估员", description: "Male, mid-30s, charcoal business suit, holding a tablet, analytical focused gaze, neat side-parted hair" },
  { name: "AI周版本管理员", description: "Female, late-20s, smart casual blazer over white shirt, energetic determined expression, shoulder-length hair" },
  { name: "AI生产线管理员", description: "Male, mid-30s, dark polo shirt with ID badge, commanding presence, short crew cut" },
  { name: "AI业务分析师", description: "Female, early-30s, light gray suit jacket, data-savvy look, glasses, hair in a low bun" },
  { name: "AI业务顾问", description: "Male, late-40s, premium dark suit, distinguished silver-streaked hair, wise calm expression" },
  { name: "AI人力专员", description: "Female, late-20s, soft pink blouse under navy cardigan, warm empathetic expression, long straight hair" },
  { name: "AI正向激励专员", description: "Female, early-30s, bright teal blazer, cheerful inspiring smile, wavy medium-length hair" },
  { name: "AI立项专员", description: "Male, late-20s, business casual shirt rolled sleeves, eager forward-leaning posture, young energetic look" },
  { name: "AI审核员", description: "Male, mid-30s, formal white shirt with dark vest, meticulous careful expression, glasses, neat hair" },
  { name: "AI战略规划师", description: "Male, mid-40s, dark turtleneck sweater, visionary thoughtful gaze, salt-and-pepper short hair" },
  { name: "AI产品经理", description: "Female, early-30s, white blouse with subtle pattern, confident articulate expression, bob haircut" },
  { name: "AI软件设计师", description: "Male, late-20s, casual hoodie with headphones around neck, creative focused look, slightly messy hair" },
  { name: "AI游戏设计师", description: "Male, mid-20s, graphic tee under open flannel shirt, playful creative smile, stylish undercut hair" },
  { name: "AI需求分析员", description: "Female, early-30s, structured navy blazer, attentive listening expression, hair pulled back" },
  { name: "AI生产评审员", description: "Male, mid-30s, crisp white shirt with sleeves rolled, evaluative sharp gaze, close-cropped hair" },
  { name: "AI质检员", description: "Female, late-20s, lab-style white coat over casual top, detail-oriented precise look, glasses, ponytail" },
  { name: "AI入库员", description: "Male, late-20s, utility vest over t-shirt, organized efficient demeanor, short practical hair" },
  { name: "AI生产监控员", description: "Male, early-30s, dark technical jacket, alert watchful expression, short buzz cut" },
  { name: "AI编剧", description: "Female, late-20s, cozy knit sweater, warm creative dreamy smile, loose wavy hair" },
  { name: "AI角色设计师", description: "Female, mid-20s, artistic scarf and denim jacket, imaginative bright expression, colorful hair accessory" },
  { name: "AI美术师", description: "Male, early-30s, paint-splattered apron over black tee, artistic passionate gaze, medium textured hair" },
  { name: "AI音效师", description: "Male, late-20s, professional headphones around neck, dark turtleneck, calm focused expression, neat medium hair" },
  { name: "AI字幕员", description: "Female, mid-20s, modern minimalist blouse, precise detail-oriented look, clean short bob" },
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateAvatar(emp: EmployeePrompt): Promise<{ ok: boolean; sizeKB?: number; error?: string }> {
  const outPath = join(OUTPUT_DIR, `${emp.name}.png`);
  if (existsSync(outPath)) {
    return { ok: true, sizeKB: 0 }; // already exists, skip
  }

  const prompt = `${STYLE_PREFIX} ${emp.description}`;
  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    modalities: ["text", "image"],
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const json = await res.json();

    if (json.error) {
      return { ok: false, error: json.error.message || JSON.stringify(json.error) };
    }

    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, error: "No image data in response" };
    }

    const buf = Buffer.from(b64, "base64");
    writeFileSync(outPath, buf);
    return { ok: true, sizeKB: Math.round(buf.length / 1024) };
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Generating avatars for ${EMPLOYEES.length} employees...`);
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const emp = EMPLOYEES[i];
    const outPath = join(OUTPUT_DIR, `${emp.name}.png`);

    if (existsSync(outPath)) {
      console.log(`[${i + 1}/${EMPLOYEES.length}] ${emp.name} — skipped (already exists)`);
      skipped++;
      continue;
    }

    const result = await generateAvatar(emp);

    if (result.ok) {
      console.log(`[${i + 1}/${EMPLOYEES.length}] ${emp.name} ✓ (${result.sizeKB}KB)`);
      success++;
    } else {
      console.log(`[${i + 1}/${EMPLOYEES.length}] ${emp.name} ✗ ${result.error}`);
      failures.push(`${emp.name}: ${result.error}`);
      failed++;
    }

    // Delay before next request (skip delay for last item)
    if (i < EMPLOYEES.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
  if (failures.length > 0) {
    console.log(`\nFailed employees:`);
    failures.forEach((f) => console.log(`  ${f}`));
    console.log(`\nRe-run the script to retry failed ones.`);
  }
}

main().catch(console.error);
```

- [ ] **Step 3: 验证脚本语法**

Run: `npx tsx --eval "import './scripts/generate-avatars.ts'" 2>&1 | head -5`
Expected: 应该报缺少 env 变量的错误（证明脚本能被解析），而不是语法错误。

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-avatars.ts
git commit -m "feat: add avatar generation script using Gemini API"
```

---

### Task 3: 运行脚本生成 24 张头像

**Files:**
- Output: `public/avatars/*.png` (24 files)

- [ ] **Step 1: 清理测试文件**

```bash
rm -f public/avatars/_test.png
```

- [ ] **Step 2: 运行生成脚本**

```bash
npm run generate:avatars
```

Expected output:
```
Generating avatars for 24 employees...
Model: gemini-3.1-flash-image-preview
Output: .../public/avatars

[1/24] AI审计官 ✓ (XXX KB)
[2/24] AI项目绩效评估员 ✓ (XXX KB)
...
[24/24] AI字幕员 ✓ (XXX KB)

--- Summary ---
Success: 24
Skipped: 0
Failed:  0
```

如果有失败的，重新运行脚本（已生成的会自动跳过）。

- [ ] **Step 3: 验证生成结果**

```bash
ls -la public/avatars/*.png | wc -l
```

Expected: 24 个文件。

```bash
ls -la public/avatars/*.png | awk '{sum+=$5} END {printf "Total: %.1f MB\n", sum/1024/1024}'
```

Expected: ~10-15 MB 总计。

- [ ] **Step 4: Commit 生成的头像**

```bash
git add public/avatars/
git commit -m "assets: add 24 AI employee portrait images"
```

---

### Task 4: 更新 seed.ts 中的 avatar 字段

**Files:**
- Modify: `src/db/seed.ts` — 每个员工的 `avatar: null` 改为 `avatar: "/avatars/{name}.png"`

- [ ] **Step 1: 更新 seed.ts**

在 `SEED_EMPLOYEES` 数组中，将每个员工对象的 `avatar` 字段（当前没有显式设置，在 seed 函数中硬编码为 `null`）改为使用员工名对应的路径。

修改 seed 函数中插入员工的部分（约第 400 行附近）：

将:
```typescript
avatar: null,
```

改为:
```typescript
avatar: `/avatars/${emp.name}.png`,
```

- [ ] **Step 2: 重新 seed 数据库**

```bash
npm run db:seed
```

Expected: `Seeded 24 employees.`

- [ ] **Step 3: 验证数据库中的 avatar 字段**

```bash
sqlite3 local.db "SELECT name, avatar FROM employees LIMIT 5;"
```

Expected: 每行显示 `/avatars/AI审计官.png` 格式的路径。

- [ ] **Step 4: 验证构建**

```bash
npm run build
```

Expected: 构建通过，0 error。

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: set avatar paths in seed data for generated portraits"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动 dev server**

```bash
npm run dev
```

- [ ] **Step 2: 浏览器验证花名册**

打开 `http://localhost:3000/roster`，确认：
- 24 张人像正确显示在卡片中
- 图片加载正常，没有 broken image
- 不同团队的卡片左边框颜色正确（紫/蓝/绿）

- [ ] **Step 3: 浏览器验证详情页**

点击任意员工卡片进入 `/roster/[id]`，确认：
- 头像在 profile tab 中正常显示
- 技能 tab 中的指标数据正常

- [ ] **Step 4: 停止 dev server，最终构建验证**

```bash
npm run build
```

Expected: 构建通过。
