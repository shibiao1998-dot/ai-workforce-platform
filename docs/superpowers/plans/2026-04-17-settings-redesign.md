# Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the settings page into a full data management backend with enhanced employee management, 3-layer metric config overrides, and a unified data center for metrics/skills/tasks with drill-down, bulk ops, and CSV/Excel export.

**Architecture:** Server component page fetches initial data via Drizzle, passes to 3 client Tab components. Each Tab manages its own state. New `/api/data/*` routes handle CRUD with pagination/filtering. Avatar generation extracted into a shared module called fire-and-forget from the POST employee route. SheetJS (xlsx) added for Excel export.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (@base-ui/react), Drizzle ORM + SQLite, ECharts, SheetJS (xlsx), Gemini API (avatar generation)

**Spec:** `docs/superpowers/specs/2026-04-17-settings-redesign.md`

**No test framework** is configured in this project. Steps that would normally be TDD red/green are replaced with manual verification via dev server and API testing via curl.

---

## File Structure

### New Files

```
src/
├── app/api/
│   ├── employees/[id]/
│   │   ├── avatar/route.ts              # POST: trigger avatar generation
│   │   ├── avatar-status/route.ts       # GET: poll avatar generation status
│   │   └── skills/route.ts              # POST: batch create skills
│   ├── metric-configs/
│   │   └── resolve/route.ts             # GET: resolve effective baseline
│   └── data/
│       ├── metrics/
│       │   ├── route.ts                 # GET (list+paginate), POST (create), DELETE (bulk)
│       │   └── [id]/route.ts            # PUT (update)
│       ├── skill-metrics/
│       │   ├── route.ts                 # GET, POST, DELETE
│       │   └── [id]/route.ts            # PUT
│       ├── tasks/
│       │   ├── route.ts                 # GET, DELETE
│       │   └── [id]/route.ts            # PUT (editable fields only)
│       └── export/route.ts              # GET: CSV/Excel export
├── components/settings/
│   ├── employee-create-dialog.tsx        # 3-step create form
│   ├── employee-edit-dialog.tsx          # Edit form (reuses step layout)
│   ├── metric-config-global.tsx          # Global baseline tab
│   ├── metric-config-team.tsx            # Team override tab
│   ├── metric-config-employee.tsx        # Employee override tab
│   └── data-management/
│       ├── data-management-center.tsx    # Main container with 3 sub-tabs
│       ├── data-toolbar.tsx              # Unified search/filter/export toolbar
│       ├── data-table.tsx               # Generic paginated table with checkbox
│       ├── data-breadcrumb.tsx           # Drill-down breadcrumb
│       ├── data-summary-cards.tsx        # KPI cards for drill-down view
│       ├── metrics-tab.tsx              # Employee performance tab
│       ├── skill-metrics-tab.tsx        # Skill metrics tab
│       ├── tasks-tab.tsx                # Task data tab
│       ├── record-dialog.tsx            # Generic create/edit dialog
│       └── export-utils.ts             # CSV/Excel export logic
└── lib/
    └── avatar-generator.ts              # Extracted avatar generation module
```

### Modified Files

```
src/db/schema.ts                          # Add inactive status, avatarDescription, team to metricConfigs
src/lib/types.ts                          # Add inactive status, new types for data management
src/db/seed.ts                            # Update seed for inactive status, team-level configs
src/app/settings/page.tsx                 # 3 tabs, fetch additional data
src/components/settings/employee-manager.tsx    # Full rewrite: compact card list
src/components/settings/metric-config-manager.tsx  # Full rewrite: 3-layer tabs
src/app/api/employees/route.ts            # Enhanced POST with avatar trigger
src/app/api/employees/[id]/route.ts       # Add subTeam to PUT, support inactive
src/app/api/metric-configs/route.ts       # Add team/level filtering to GET
```

---

## Task 1: Schema Changes

**Files:**
- Modify: `src/db/schema.ts:3-16` (employees table), `src/db/schema.ts:101-109` (metricConfigs table)

- [ ] **Step 1: Add `inactive` to employees status enum and add `avatarDescription` column**

In `src/db/schema.ts`, update the `employees` table:

```ts
// line 8: expand status enum
status: text("status", { enum: ["active", "developing", "planned", "inactive"] }).notNull(),
// after description (line 13), add:
avatarDescription: text("avatar_description"),
```

- [ ] **Step 2: Add `team` column to metricConfigs table**

In `src/db/schema.ts`, update the `metricConfigs` table. After `employeeId` (line 103), add:

```ts
team: text("team", { enum: ["management", "design", "production"] }),
```

- [ ] **Step 3: Push schema changes to SQLite**

Run: `npm run db:push`
Expected: Schema synced successfully, no errors.

- [ ] **Step 4: Verify with a quick query**

Run: `npx tsx -e "import {db} from './src/db'; import {employees,metricConfigs} from './src/db/schema'; console.log('employees cols:', Object.keys(employees)); console.log('metricConfigs cols:', Object.keys(metricConfigs));"`
Expected: Output includes `avatarDescription` in employees and `team` in metricConfigs.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(schema): add inactive status, avatarDescription, metricConfigs.team"
```

---

## Task 2: Type Definitions Update

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `inactive` to EmployeeStatus**

```ts
// line 2
export type EmployeeStatus = "active" | "developing" | "planned" | "inactive";
```

- [ ] **Step 2: Add `avatarDescription` to Employee interface**

In the `Employee` interface (line 20-36), after `description: string | null`:

```ts
avatarDescription: string | null;
```

- [ ] **Step 3: Add `team` to MetricConfig interface**

In the `MetricConfig` interface (line 111-119), after `employeeId: string | null`:

```ts
team: TeamType | null;
```

- [ ] **Step 4: Add data management pagination types**

Append to the file:

```ts
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DataMetricRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string | null;
  team: TeamType;
  period: string;
  periodType: PeriodType;
  taskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  humanTimeSaved: number | null;
}

export interface DataSkillMetricRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string | null;
  team: TeamType;
  skillId: string;
  skillName: string;
  category: string | null;
  period: string;
  invocationCount: number;
  successRate: number | null;
  avgResponseTime: number | null;
}

export interface DataTaskRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string | null;
  team: TeamType;
  name: string;
  type: string;
  status: TaskStatus;
  qualityScore: number | null;
  tokenUsage: number | null;
  estimatedCost: number | null;
  retryCount: number | null;
  startTime: Date | null;
  actualEndTime: Date | null;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add inactive status, data management types"
```

---

## Task 3: Seed Data Update

**Files:**
- Modify: `src/db/seed.ts`

- [ ] **Step 1: Add team-level metric configs to seed**

In `src/db/seed.ts`, find the metric configs seeding section (around line 712-734). After the global configs, add team-level overrides:

```ts
// Team-level overrides for management
{ id: randomUUID(), employeeId: null, team: "management", taskType: "项目审计", humanBaseline: 5, costPerHour: 46.875, description: "管理团队项目审计基准", updatedAt: Date.now() },
{ id: randomUUID(), employeeId: null, team: "management", taskType: "绩效评估", humanBaseline: 4, costPerHour: 46.875, description: "管理团队绩效评估基准", updatedAt: Date.now() },
// Team-level overrides for production
{ id: randomUUID(), employeeId: null, team: "production", taskType: "剧本创作", humanBaseline: 4, costPerHour: 46.875, description: "生产团队剧本创作基准", updatedAt: Date.now() },
{ id: randomUUID(), employeeId: null, team: "production", taskType: "质量检查", humanBaseline: 0.5, costPerHour: 46.875, description: "生产团队质量检查基准", updatedAt: Date.now() },
```

Note: The seed insert for metricConfigs needs to include the new `team` field. Update existing global config inserts to include `team: null` explicitly.

- [ ] **Step 2: Add `avatarDescription` to seed employees**

For each employee in the SEED_EMPLOYEES array, add an `avatarDescription` field using the existing description from `scripts/generate-avatars.ts`. For example:

```ts
{ name: "AI审计官", ..., avatarDescription: "Mature male, mid-40s, dark navy suit with tie, silver-rimmed glasses, serious confident expression, short neat hair" },
```

Copy all 24 descriptions from `scripts/generate-avatars.ts` EMPLOYEES array into the seed data.

- [ ] **Step 3: Re-seed the database**

Run: `npm run db:seed`
Expected: Seed completes successfully with no errors.

- [ ] **Step 4: Verify seed data**

Run: `npx tsx -e "import {db} from './src/db'; import {metricConfigs} from './src/db/schema'; import {isNotNull} from 'drizzle-orm'; const r = db.select().from(metricConfigs).all(); console.log('total configs:', r.length); console.log('with team:', r.filter(c => c.team).length);"`
Expected: `total configs: 14` (10 global + 4 team), `with team: 4`

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add team-level metric configs, avatar descriptions"
```

---

## Task 4: Avatar Generator Module

**Files:**
- Create: `src/lib/avatar-generator.ts`

- [ ] **Step 1: Create the avatar generator module**

Extract the core generation logic from `scripts/generate-avatars.ts` into a reusable module:

```ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

const STYLE_PREFIX =
  "Create a professional 2D digital illustration portrait of a Chinese professional in LANDSCAPE orientation (wider than tall, 16:9 aspect ratio). " +
  "Clean modern style with soft shading. Frame the person from chest up, centered in the image with generous space around them. " +
  "Solid light gradient background, soft studio lighting. " +
  "The character should look approachable and competent. Do NOT crop tightly — leave breathing room above the head and on both sides.";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

const TITLE_TO_DESCRIPTION: Record<string, string> = {
  management: "professional business attire, confident executive presence",
  design: "creative casual style, artistic and innovative look",
  production: "smart casual with technical edge, focused and detail-oriented",
};

export function generateAvatarDescription(title: string, team: string): string {
  const teamStyle = TITLE_TO_DESCRIPTION[team] || TITLE_TO_DESCRIPTION.management;
  return `Professional, mid-30s, ${teamStyle}, neat appearance, Chinese professional working in ${title} role`;
}

export async function generateSingleAvatar(
  employeeId: string,
  name: string,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  loadEnvLocal();

  const gatewayUrl = process.env.GEMINI_GATEWAY_URL;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing GEMINI_GATEWAY_URL or GEMINI_API_KEY" };
  }

  const outputDir = resolve(process.cwd(), "public/avatars");
  mkdirSync(outputDir, { recursive: true });

  const prompt = `${STYLE_PREFIX} ${description}.`;
  const endpoint = `${gatewayUrl}/v1/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["text", "image"],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message: string };
    };

    if (json.error) {
      return { ok: false, error: json.error.message };
    }

    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, error: "No image data in response" };
    }

    const imgBuffer = Buffer.from(b64, "base64");
    const outPath = join(outputDir, `${name}.png`);
    writeFileSync(outPath, imgBuffer);

    await db
      .update(employees)
      .set({ avatar: `/avatars/${name}.png`, updatedAt: Date.now() })
      .where(eq(employees.id, employeeId));

    return { ok: true };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out after 90s" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 2: Verify module compiles**

Run: `npx tsc --noEmit src/lib/avatar-generator.ts 2>&1 | head -20`
Expected: No type errors (or only non-blocking warnings from other files).

- [ ] **Step 3: Commit**

```bash
git add src/lib/avatar-generator.ts
git commit -m "feat: extract avatar generator module from batch script"
```

---

## Task 5: Enhanced Employee API Routes

**Files:**
- Modify: `src/app/api/employees/route.ts`
- Modify: `src/app/api/employees/[id]/route.ts`
- Create: `src/app/api/employees/[id]/avatar/route.ts`
- Create: `src/app/api/employees/[id]/avatar-status/route.ts`
- Create: `src/app/api/employees/[id]/skills/route.ts`

- [ ] **Step 1: Enhance POST /api/employees to accept full fields + trigger avatar generation**

In `src/app/api/employees/route.ts`, update the POST handler. The current handler (around line 51) only inserts basic fields. Replace the POST function:

```ts
import { generateAvatarDescription, generateSingleAvatar } from "@/lib/avatar-generator";

// In POST handler, after const body = await req.json():
const id = randomUUID();
const avatarDesc = body.avatarDescription || generateAvatarDescription(body.title || "", body.team || "management");

await db.insert(employees).values({
  id,
  name: body.name,
  avatar: null,
  title: body.title,
  team: body.team || "management",
  status: body.status || "planned",
  subTeam: body.subTeam || null,
  soul: body.soul || null,
  identity: body.identity || null,
  description: body.description || null,
  avatarDescription: avatarDesc,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const created = await db.query.employees.findFirst({ where: eq(employees.id, id) });

// Fire-and-forget avatar generation
generateSingleAvatar(id, body.name, avatarDesc).catch((err) =>
  console.error(`Avatar generation failed for ${body.name}:`, err)
);

return NextResponse.json(created, { status: 201 });
```

- [ ] **Step 2: Enhance PUT /api/employees/[id] to support subTeam and inactive status**

In `src/app/api/employees/[id]/route.ts`, update the PUT handler's `.set()` call to include `subTeam`:

```ts
await db
  .update(employees)
  .set({
    name: body.name,
    avatar: body.avatar,
    title: body.title,
    team: body.team,
    status: body.status,
    subTeam: body.subTeam,
    soul: body.soul,
    identity: body.identity,
    description: body.description,
    avatarDescription: body.avatarDescription,
    updatedAt: Date.now(),
  })
  .where(eq(employees.id, id));
```

- [ ] **Step 3: Create POST /api/employees/[id]/avatar route**

Create `src/app/api/employees/[id]/avatar/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateAvatarDescription, generateSingleAvatar } from "@/lib/avatar-generator";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id),
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const desc = employee.avatarDescription || generateAvatarDescription(employee.title, employee.team);

  // Fire-and-forget
  generateSingleAvatar(id, employee.name, desc).catch((err) =>
    console.error(`Avatar generation failed for ${employee.name}:`, err)
  );

  return NextResponse.json({ status: "generating" });
}
```

- [ ] **Step 4: Create GET /api/employees/[id]/avatar-status route**

Create `src/app/api/employees/[id]/avatar-status/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    columns: { avatar: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = employee.avatar ? "completed" : "generating";
  return NextResponse.json({ status, avatar: employee.avatar });
}
```

- [ ] **Step 5: Create POST /api/employees/[id]/skills route**

Create `src/app/api/employees/[id]/skills/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    columns: { id: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const skillList: Array<{ name: string; level?: number; category?: string; description?: string }> = body.skills || [];

  if (skillList.length === 0) {
    return NextResponse.json({ error: "No skills provided" }, { status: 400 });
  }

  const values = skillList.map((s) => ({
    id: randomUUID(),
    employeeId: id,
    name: s.name,
    level: s.level ?? 3,
    category: s.category ?? null,
    description: s.description ?? null,
  }));

  await db.insert(skills).values(values);

  return NextResponse.json({ created: values.length }, { status: 201 });
}
```

- [ ] **Step 6: Verify all routes compile**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds or only has pre-existing warnings. No new type errors.

- [ ] **Step 7: Test enhanced POST /api/employees via curl**

Start dev server if not running: `npm run dev`

```bash
curl -s -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"AI测试员","title":"测试专家","team":"production","status":"planned","subTeam":"生产管理层","description":"测试用临时员工","soul":"严谨测试","identity":"QA专家"}' | jq .
```

Expected: Returns created employee JSON with `avatar: null`, `avatarDescription` populated.

- [ ] **Step 8: Test avatar status polling**

```bash
# Use the id from step 7
curl -s http://localhost:3000/api/employees/{id}/avatar-status | jq .
```

Expected: `{ "status": "generating" }` or `{ "status": "completed", "avatar": "/avatars/AI测试员.png" }`

- [ ] **Step 9: Test batch skills creation**

```bash
curl -s -X POST http://localhost:3000/api/employees/{id}/skills \
  -H "Content-Type: application/json" \
  -d '{"skills":[{"name":"自动化测试","level":4,"category":"核心能力"},{"name":"缺陷分析","level":3,"category":"分析能力"}]}' | jq .
```

Expected: `{ "created": 2 }`

- [ ] **Step 10: Clean up test data**

```bash
curl -s -X DELETE http://localhost:3000/api/employees/{id}
```

- [ ] **Step 11: Commit**

```bash
git add src/app/api/employees/ src/lib/avatar-generator.ts
git commit -m "feat(api): enhanced employee CRUD, avatar generation, batch skills"
```

---

## Task 6: Metric Config API Enhancements

**Files:**
- Modify: `src/app/api/metric-configs/route.ts`
- Create: `src/app/api/metric-configs/resolve/route.ts`

- [ ] **Step 1: Enhance GET /api/metric-configs with filtering**

Replace `src/app/api/metric-configs/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs } from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const team = searchParams.get("team");
  const employeeId = searchParams.get("employeeId");

  const conditions = [];

  if (level === "global") {
    conditions.push(isNull(metricConfigs.employeeId));
    conditions.push(isNull(metricConfigs.team));
  } else if (level === "team") {
    conditions.push(isNull(metricConfigs.employeeId));
    conditions.push(isNotNull(metricConfigs.team));
    if (team) conditions.push(eq(metricConfigs.team, team));
  } else if (level === "employee") {
    conditions.push(isNotNull(metricConfigs.employeeId));
    if (employeeId) conditions.push(eq(metricConfigs.employeeId, employeeId));
  }

  if (!level && team) {
    conditions.push(eq(metricConfigs.team, team));
  }

  const result = conditions.length > 0
    ? await db.select().from(metricConfigs).where(and(...conditions))
    : await db.select().from(metricConfigs);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();

  await db.insert(metricConfigs).values({
    id,
    employeeId: body.employeeId || null,
    team: body.team || null,
    taskType: body.taskType,
    humanBaseline: body.humanBaseline,
    costPerHour: body.costPerHour ?? 46.875,
    description: body.description || null,
    updatedAt: Date.now(),
  });

  const created = await db.select().from(metricConfigs).where(eq(metricConfigs.id, id));
  return NextResponse.json(created[0], { status: 201 });
}
```

- [ ] **Step 2: Create GET /api/metric-configs/resolve**

Create `src/app/api/metric-configs/resolve/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs, employees } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskType = searchParams.get("taskType");
  const employeeId = searchParams.get("employeeId");

  if (!taskType || !employeeId) {
    return NextResponse.json({ error: "taskType and employeeId are required" }, { status: 400 });
  }

  // Get the employee's team
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
    columns: { team: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // 1. Employee-level override
  const empOverride = await db.select().from(metricConfigs).where(
    and(eq(metricConfigs.taskType, taskType), eq(metricConfigs.employeeId, employeeId))
  );
  if (empOverride.length > 0) {
    return NextResponse.json({ ...empOverride[0], resolvedFrom: "employee" });
  }

  // 2. Team-level override
  const teamOverride = await db.select().from(metricConfigs).where(
    and(
      eq(metricConfigs.taskType, taskType),
      eq(metricConfigs.team, employee.team),
      isNull(metricConfigs.employeeId)
    )
  );
  if (teamOverride.length > 0) {
    return NextResponse.json({ ...teamOverride[0], resolvedFrom: "team" });
  }

  // 3. Global baseline
  const globalBaseline = await db.select().from(metricConfigs).where(
    and(
      eq(metricConfigs.taskType, taskType),
      isNull(metricConfigs.employeeId),
      isNull(metricConfigs.team)
    )
  );
  if (globalBaseline.length > 0) {
    return NextResponse.json({ ...globalBaseline[0], resolvedFrom: "global" });
  }

  return NextResponse.json({ error: "No baseline found" }, { status: 404 });
}
```

- [ ] **Step 3: Verify with curl**

```bash
# Get global configs
curl -s "http://localhost:3000/api/metric-configs?level=global" | jq '. | length'
# Expected: 10

# Get team configs
curl -s "http://localhost:3000/api/metric-configs?level=team" | jq '. | length'
# Expected: 4

# Resolve for an employee (use a real employee ID from the database)
curl -s "http://localhost:3000/api/metric-configs/resolve?taskType=项目审计&employeeId={id}" | jq .
# Expected: resolvedFrom "team" or "global" depending on overrides
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/metric-configs/
git commit -m "feat(api): metric-configs filtering, 3-layer resolve endpoint"
```

---

## Task 7: Employee Create Dialog (3-Step Form)

**Files:**
- Create: `src/components/settings/employee-create-dialog.tsx`

- [ ] **Step 1: Create the 3-step employee create dialog**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillInput {
  name: string;
  level: number;
  category: string;
  description: string;
}

interface CreateFormData {
  name: string;
  title: string;
  team: string;
  subTeam: string;
  status: string;
  description: string;
  soul: string;
  identity: string;
  skills: SkillInput[];
}

const INITIAL_FORM: CreateFormData = {
  name: "",
  title: "",
  team: "management",
  subTeam: "",
  status: "planned",
  description: "",
  soul: "",
  identity: "",
  skills: [],
};

interface EmployeeCreateDialogProps {
  onCreated: (employee: Record<string, unknown>) => void;
}

export function EmployeeCreateDialog({ onCreated }: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (patch: Partial<CreateFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const addSkill = () =>
    updateForm({
      skills: [...form.skills, { name: "", level: 3, category: "核心能力", description: "" }],
    });

  const removeSkill = (idx: number) =>
    updateForm({ skills: form.skills.filter((_, i) => i !== idx) });

  const updateSkill = (idx: number, patch: Partial<SkillInput>) =>
    updateForm({
      skills: form.skills.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });

  const canNext = step === 1 ? form.name.trim() && form.title.trim() : true;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          title: form.title,
          team: form.team,
          subTeam: form.team === "production" ? form.subTeam || null : null,
          status: form.status,
          description: form.description || null,
          soul: form.soul || null,
          identity: form.identity || null,
        }),
      });
      const created = await res.json();

      if (form.skills.length > 0) {
        await fetch(`/api/employees/${created.id}/skills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: form.skills.filter((s) => s.name.trim()) }),
        });
      }

      onCreated(created);
      setOpen(false);
      setStep(1);
      setForm(INITIAL_FORM);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setStep(1); setForm(INITIAL_FORM); } }}>
      <DialogTrigger render={<Button size="sm"><Plus className="mr-1 h-4 w-4" />新增员工</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增 AI 员工</DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          步骤 {step}/3 — {step === 1 ? "基础信息" : step === 2 ? "人格设定" : "技能配置"}
        </div>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>名称 *</Label>
              <Input placeholder="如：AI数据分析师" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} />
            </div>
            <div>
              <Label>职位 *</Label>
              <Input placeholder="如：数据分析专家" value={form.title} onChange={(e) => updateForm({ title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>团队 *</Label>
                <Select value={form.team} onValueChange={(v) => updateForm({ team: v ?? form.team })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="management">管理团队</SelectItem>
                    <SelectItem value="design">设计团队</SelectItem>
                    <SelectItem value="production">生产团队</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.team === "production" && (
                <div>
                  <Label>子团队</Label>
                  <Select value={form.subTeam} onValueChange={(v) => updateForm({ subTeam: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="选择子团队" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="生产管理层">生产管理层</SelectItem>
                      <SelectItem value="内容生产层">内容生产层</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v) => updateForm({ status: v ?? form.status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">规划中</SelectItem>
                  <SelectItem value="developing">培养中</SelectItem>
                  <SelectItem value="active">在岗</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>描述</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="一句话介绍这位 AI 员工"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 2: Personality */}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label>灵魂 (Soul)</Label>
              <p className="text-xs text-muted-foreground mb-1">AI 员工的核心性格与工作哲学</p>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="如：严谨细致，追求零误差，对数据有天然的敏锐度"
                value={form.soul}
                onChange={(e) => updateForm({ soul: e.target.value })}
              />
            </div>
            <div>
              <Label>身份 (Identity)</Label>
              <p className="text-xs text-muted-foreground mb-1">角色定位与背景设定</p>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="如：资深审计专家，拥有10年财务审计经验"
                value={form.identity}
                onChange={(e) => updateForm({ identity: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="space-y-3">
            {form.skills.map((skill, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="技能名称"
                    value={skill.name}
                    onChange={(e) => updateSkill(idx, { name: e.target.value })}
                    className="flex-1 mr-2"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeSkill(idx)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={skill.category} onValueChange={(v) => updateSkill(idx, { category: v ?? skill.category })}>
                    <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="核心能力">核心能力</SelectItem>
                      <SelectItem value="分析能力">分析能力</SelectItem>
                      <SelectItem value="输出能力">输出能力</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(skill.level)} onValueChange={(v) => updateSkill(idx, { level: Number(v) })}>
                    <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((l) => (
                        <SelectItem key={l} value={String(l)}>Lv.{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed" onClick={addSkill}>
              <Plus className="mr-1 h-4 w-4" />添加技能
            </Button>
            <p className="text-xs text-muted-foreground">可选。也可以创建后在员工详情中管理技能。</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />上一步
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              下一步<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !form.name.trim() || !form.title.trim()}>
              {submitting ? "创建中..." : "创建员工"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/employee-create-dialog.tsx
git commit -m "feat(ui): 3-step employee create dialog"
```

---

## Task 8: Employee Manager Rewrite (Compact Card List)

**Files:**
- Modify: `src/components/settings/employee-manager.tsx` (full rewrite)

- [ ] **Step 1: Rewrite employee-manager.tsx as compact card list**

Replace the entire file content:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeCreateDialog } from "./employee-create-dialog";
import type { EmployeeListItem, TeamType } from "@/lib/types";

const TEAM_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  management: { label: "管理", border: "border-l-purple-600", bg: "bg-purple-50", text: "text-purple-700" },
  design: { label: "设计", border: "border-l-blue-600", bg: "bg-blue-50", text: "text-blue-700" },
  production: { label: "生产", border: "border-l-green-600", bg: "bg-green-50", text: "text-green-700" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  active: { label: "在岗", variant: "default", className: "bg-green-100 text-green-700 border-green-200" },
  developing: { label: "培养中", variant: "default", className: "bg-amber-100 text-amber-700 border-amber-200" },
  planned: { label: "规划中", variant: "default", className: "bg-blue-100 text-blue-700 border-blue-200" },
  inactive: { label: "下岗", variant: "default", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const TEAM_TABS = [
  { value: "all", label: "全部" },
  { value: "management", label: "管理" },
  { value: "design", label: "设计" },
  { value: "production", label: "生产" },
];

interface EmployeeManagerProps {
  initialEmployees: EmployeeListItem[];
}

export function EmployeeManager({ initialEmployees }: EmployeeManagerProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [teamFilter, setTeamFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = employees.filter((e) => {
    if (teamFilter !== "all" && e.team !== teamFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.title.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreated = (created: Record<string, unknown>) => {
    setEmployees((prev) => [
      ...prev,
      {
        id: created.id as string,
        name: created.name as string,
        avatar: null,
        title: created.title as string,
        team: created.team as TeamType,
        status: (created.status as string) || "planned",
        monthlyTaskCount: 0,
        adoptionRate: null,
        accuracyRate: null,
        description: (created.description as string) || null,
        subTeam: (created.subTeam as string) || null,
      } satisfies EmployeeListItem,
    ]);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus as EmployeeListItem["status"] } : e))
    );
  };

  // Poll for avatar updates on employees with null avatar
  const pollAvatars = useCallback(() => {
    const noAvatar = employees.filter((e) => !e.avatar);
    if (noAvatar.length === 0) return;

    noAvatar.forEach(async (emp) => {
      try {
        const res = await fetch(`/api/employees/${emp.id}/avatar-status`);
        const data = await res.json();
        if (data.status === "completed" && data.avatar) {
          setEmployees((prev) =>
            prev.map((e) => (e.id === emp.id ? { ...e, avatar: data.avatar } : e))
          );
        }
      } catch {}
    });
  }, [employees]);

  useEffect(() => {
    const interval = setInterval(pollAvatars, 5000);
    return () => clearInterval(interval);
  }, [pollAvatars]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">AI员工列表 ({employees.length}人)</h3>
          <div className="flex gap-1">
            {TEAM_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTeamFilter(t.value)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs transition-colors",
                  teamFilter === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索员工名称或职位..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
        </div>
        <EmployeeCreateDialog onCreated={handleCreated} />
      </div>

      {/* Employee cards */}
      <div className="space-y-2">
        {filtered.map((emp) => {
          const team = TEAM_CONFIG[emp.team] || TEAM_CONFIG.management;
          const status = STATUS_CONFIG[emp.status] || STATUS_CONFIG.planned;
          const isInactive = emp.status === "inactive";

          return (
            <div
              key={emp.id}
              className={cn(
                "flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card",
                "border-l-[3.5px]",
                isInactive ? "border-l-gray-400 opacity-70" : team.border
              )}
            >
              {/* Avatar */}
              <AiAvatar
                employeeId={emp.id}
                team={emp.team}
                avatar={emp.avatar}
                name={emp.name}
                size="md"
                className="rounded-lg"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{emp.name}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.className)}>
                    {status.label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", team.bg, team.text)}>
                    {team.label}团队
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {emp.title}{emp.description ? ` · ${emp.description}` : ""}
                </p>
              </div>

              {/* Metrics */}
              {!isInactive && emp.status === "active" ? (
                <div className="flex gap-5 shrink-0">
                  <div className="text-center">
                    <div className="text-sm font-bold">{emp.monthlyTaskCount}</div>
                    <div className="text-[10px] text-muted-foreground">本月任务</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {emp.adoptionRate != null ? `${emp.adoptionRate}%` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">采纳率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-green-600">
                      {emp.accuracyRate != null ? `${emp.accuracyRate}%` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">准确率</div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-5 shrink-0 invisible">
                  <div className="text-center"><div className="text-sm">—</div><div className="text-[10px]">—</div></div>
                  <div className="text-center"><div className="text-sm">—</div><div className="text-[10px]">—</div></div>
                  <div className="text-center"><div className="text-sm">—</div><div className="text-[10px]">—</div></div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-1.5 shrink-0">
                {emp.status === "active" && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="outline" size="sm" className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50">
                          下岗
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认下岗</AlertDialogTitle>
                        <AlertDialogDescription>
                          将 {emp.name} 设为下岗状态？历史数据将保留，可随时重新上岗。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleStatusChange(emp.id, "inactive")}>
                          确认下岗
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {emp.status === "inactive" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 border-green-200 text-green-600 hover:bg-green-50"
                    onClick={() => handleStatusChange(emp.id, "active")}
                  >
                    上岗
                  </Button>
                )}
                {(emp.status === "developing" || emp.status === "planned") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => handleStatusChange(emp.id, "active")}
                    >
                      上岗
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleStatusChange(emp.id, "inactive")}
                    >
                      下岗
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/settings` and check:
- Compact card list renders with avatars, team colors, status badges, metrics
- Team filter tabs work
- Search filters by name/title
- "新增员工" button opens the 3-step dialog
- Status change buttons (上岗/下岗) work

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/employee-manager.tsx
git commit -m "feat(ui): rewrite employee manager as compact card list"
```

---

## Task 8b: Employee Edit Dialog

**Files:**
- Create: `src/components/settings/employee-edit-dialog.tsx`
- Modify: `src/components/settings/employee-manager.tsx` (add edit button handler)

- [ ] **Step 1: Create EmployeeEditDialog**

Create `src/components/settings/employee-edit-dialog.tsx`. This component reuses the same 3-step layout as `EmployeeCreateDialog` but:
- Receives existing employee data as props (pre-fills all fields)
- Loads existing skills via `GET /api/employees/${id}` (the full employee endpoint returns skills)
- Saves via `PUT /api/employees/${id}` for employee fields
- For skills: deletes removed skills, adds new ones via `/api/employees/${id}/skills`
- Props: `{ employee: EmployeeListItem; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }`

The implementer should base this on `employee-create-dialog.tsx`, adding:
- `useEffect` to fetch full employee data (including skills) when dialog opens
- `PUT` instead of `POST` for saving employee fields
- Skill diffing logic: compare original skills with edited list

- [ ] **Step 2: Add edit button handler to employee-manager.tsx**

In the employee card's action buttons area, add an "编辑" button that opens the edit dialog:

```tsx
// Add state for edit
const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);

// In the card's action buttons:
<Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditingEmployee(emp)}>
  编辑
</Button>

// At component bottom, render the dialog:
{editingEmployee && (
  <EmployeeEditDialog
    employee={editingEmployee}
    open={!!editingEmployee}
    onOpenChange={(o) => { if (!o) setEditingEmployee(null); }}
    onSaved={() => { setEditingEmployee(null); /* refresh data */ }}
  />
)}
```

- [ ] **Step 3: Verify edit flow in browser**

Click "编辑" on an employee card. Dialog opens pre-filled. Edit a field, save, verify the card updates.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/employee-edit-dialog.tsx src/components/settings/employee-manager.tsx
git commit -m "feat(ui): employee edit dialog with 3-step form"
```

---

## Task 9: Settings Page Update (3 Tabs)

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Update settings page to 3 tabs and fetch additional data**

Replace `src/app/settings/page.tsx`:

```tsx
import { db } from "@/db";
import { employees, metrics, metricConfigs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeManager } from "@/components/settings/employee-manager";
import { MetricConfigManager } from "@/components/settings/metric-config-manager";
import { DataManagementCenter } from "@/components/settings/data-management/data-management-center";

async function getData() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      avatar: employees.avatar,
      title: employees.title,
      team: employees.team,
      status: employees.status,
      description: employees.description,
      subTeam: employees.subTeam,
    })
    .from(employees);

  const monthMetrics = await db
    .select()
    .from(metrics)
    .where(eq(metrics.period, currentMonth));

  const metricMap = new Map<string, { taskCount: number; adoptionRate: number | null; accuracyRate: number | null }>();
  for (const m of monthMetrics) {
    metricMap.set(m.employeeId, {
      taskCount: m.taskCount,
      adoptionRate: m.adoptionRate,
      accuracyRate: m.accuracyRate,
    });
  }

  const employeeList = allEmployees.map((e) => {
    const m = metricMap.get(e.id);
    return {
      ...e,
      monthlyTaskCount: m?.taskCount ?? 0,
      adoptionRate: m?.adoptionRate ?? null,
      accuracyRate: m?.accuracyRate ?? null,
    };
  });

  const configRows = await db
    .select({
      id: metricConfigs.id,
      employeeId: metricConfigs.employeeId,
      team: metricConfigs.team,
      taskType: metricConfigs.taskType,
      humanBaseline: metricConfigs.humanBaseline,
      costPerHour: metricConfigs.costPerHour,
      description: metricConfigs.description,
    })
    .from(metricConfigs);

  return { employeeList, configRows };
}

export default async function SettingsPage() {
  const { employeeList, configRows } = await getData();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">系统设置</h1>
      <p className="text-muted-foreground text-sm mb-6">管理 AI 员工、指标基准与业务数据</p>

      <Tabs defaultValue="employees">
        <TabsList className="mb-6">
          <TabsTrigger value="employees">员工管理</TabsTrigger>
          <TabsTrigger value="metrics">指标基准配置</TabsTrigger>
          <TabsTrigger value="data">数据指标管理</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeManager initialEmployees={employeeList} />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricConfigManager
            initialConfigs={configRows}
            employees={employeeList}
          />
        </TabsContent>

        <TabsContent value="data">
          <DataManagementCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Note: `MetricConfigManager` now receives `employees` prop for the employee override tab. `DataManagementCenter` fetches its own data client-side.

- [ ] **Step 2: Verify page loads with 3 tabs**

Open `http://localhost:3000/settings`. All 3 tabs should be visible. The "数据指标管理" tab content will be empty until we create that component — verify it doesn't error.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(ui): settings page with 3 tabs"
```

---

## Task 10: Metric Config Manager Rewrite (3-Layer Tabs)

**Files:**
- Modify: `src/components/settings/metric-config-manager.tsx` (full rewrite, becomes orchestrator)
- Create: `src/components/settings/metric-config-global.tsx`
- Create: `src/components/settings/metric-config-team.tsx`
- Create: `src/components/settings/metric-config-employee.tsx`

- [ ] **Step 1: Create MetricConfigGlobal component**

Create `src/components/settings/metric-config-global.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MetricConfigItem {
  id: string;
  employeeId: string | null;
  team: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

interface MetricConfigGlobalProps {
  configs: MetricConfigItem[];
  allConfigs: MetricConfigItem[];
  onRefresh: () => void;
}

export function MetricConfigGlobal({ configs, allConfigs, onRefresh }: MetricConfigGlobalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfigItem>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ taskType: "", humanBaseline: "", costPerHour: "46.875", description: "" });

  const globalConfigs = configs.filter((c) => !c.employeeId && !c.team);

  function getOverrideCount(taskType: string): number {
    return allConfigs.filter((c) => c.taskType === taskType && (c.employeeId || c.team)).length;
  }

  async function handleCreate() {
    await fetch("/api/metric-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: createForm.taskType,
        humanBaseline: Number(createForm.humanBaseline),
        costPerHour: Number(createForm.costPerHour),
        description: createForm.description || null,
      }),
    });
    setCreateOpen(false);
    setCreateForm({ taskType: "", humanBaseline: "", costPerHour: "46.875", description: "" });
    onRefresh();
  }

  async function handleSave(id: string) {
    await fetch(`/api/metric-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/metric-configs/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">全局基准配置</span>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="mr-1 h-4 w-4" />新增任务类型</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>新增任务类型基准</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>任务类型 *</Label><Input value={createForm.taskType} onChange={(e) => setCreateForm({ ...createForm, taskType: e.target.value })} /></div>
              <div><Label>人工基准耗时 (h) *</Label><Input type="number" value={createForm.humanBaseline} onChange={(e) => setCreateForm({ ...createForm, humanBaseline: e.target.value })} /></div>
              <div><Label>时薪 (¥/h)</Label><Input type="number" value={createForm.costPerHour} onChange={(e) => setCreateForm({ ...createForm, costPerHour: e.target.value })} /></div>
              <div><Label>说明</Label><Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={!createForm.taskType || !createForm.humanBaseline}>创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>任务类型</TableHead>
            <TableHead>人工基准耗时 (h)</TableHead>
            <TableHead>时薪 (¥/h)</TableHead>
            <TableHead>说明</TableHead>
            <TableHead className="text-center">覆盖数</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {globalConfigs.map((cfg) => {
            const isEditing = editingId === cfg.id;
            const overrides = getOverrideCount(cfg.taskType);
            return (
              <TableRow key={cfg.id}>
                <TableCell>{cfg.taskType}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input type="number" className="h-7 w-20" value={editForm.humanBaseline ?? ""} onChange={(e) => setEditForm({ ...editForm, humanBaseline: Number(e.target.value) })} />
                  ) : cfg.humanBaseline}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input type="number" className="h-7 w-24" value={editForm.costPerHour ?? ""} onChange={(e) => setEditForm({ ...editForm, costPerHour: Number(e.target.value) })} />
                  ) : `¥${cfg.costPerHour}`}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {isEditing ? (
                    <Input className="h-7" value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  ) : cfg.description}
                </TableCell>
                <TableCell className="text-center">
                  {overrides > 0 ? (
                    <Badge variant="outline" className="text-[10px]">{overrides} 覆盖</Badge>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(cfg.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(cfg.id); setEditForm(cfg); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>删除「{cfg.taskType}」基准？</AlertDialogTitle>
                            <AlertDialogDescription>此操作将影响所有依赖该任务类型的计算。{overrides > 0 && `还有 ${overrides} 个覆盖配置也会失去全局基准。`}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(cfg.id)}>确认删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Create MetricConfigTeam component**

Create `src/components/settings/metric-config-team.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricConfigItem {
  id: string;
  employeeId: string | null;
  team: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

interface MetricConfigTeamProps {
  configs: MetricConfigItem[];
  onRefresh: () => void;
}

const TEAMS = [
  { value: "management", label: "管理团队", color: "border-purple-600 bg-purple-50 text-purple-700" },
  { value: "design", label: "设计团队", color: "border-blue-600 bg-blue-50 text-blue-700" },
  { value: "production", label: "生产团队", color: "border-green-600 bg-green-50 text-green-700" },
];

export function MetricConfigTeam({ configs, onRefresh }: MetricConfigTeamProps) {
  const [selectedTeam, setSelectedTeam] = useState("management");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfigItem>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ taskType: "", humanBaseline: "", costPerHour: "" });

  const globalConfigs = configs.filter((c) => !c.employeeId && !c.team);
  const teamConfigs = configs.filter((c) => !c.employeeId && c.team === selectedTeam);

  const globalMap = new Map(globalConfigs.map((c) => [c.taskType, c]));
  const availableTaskTypes = globalConfigs
    .filter((g) => !teamConfigs.some((t) => t.taskType === g.taskType))
    .map((g) => g.taskType);

  async function handleAdd() {
    const global = globalMap.get(addForm.taskType);
    await fetch("/api/metric-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team: selectedTeam,
        taskType: addForm.taskType,
        humanBaseline: Number(addForm.humanBaseline) || global?.humanBaseline,
        costPerHour: Number(addForm.costPerHour) || global?.costPerHour || 46.875,
      }),
    });
    setAddOpen(false);
    setAddForm({ taskType: "", humanBaseline: "", costPerHour: "" });
    onRefresh();
  }

  async function handleSave(id: string) {
    await fetch(`/api/metric-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    onRefresh();
  }

  async function handleRemove(id: string) {
    await fetch(`/api/metric-configs/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      {/* Team selector */}
      <div className="flex gap-2 mb-4">
        {TEAMS.map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedTeam(t.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-medium border-2 transition-colors",
              selectedTeam === t.value ? t.color : "border-transparent bg-muted text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{TEAMS.find((t) => t.value === selectedTeam)?.label}的覆盖值（留空 = 使用全局基准）</span>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" disabled={availableTaskTypes.length === 0}><Plus className="mr-1 h-4 w-4" />添加覆盖</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>添加团队覆盖</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>任务类型</Label>
                <Select value={addForm.taskType} onValueChange={(v) => setAddForm({ ...addForm, taskType: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="选择任务类型" /></SelectTrigger>
                  <SelectContent>
                    {availableTaskTypes.map((tt) => <SelectItem key={tt} value={tt}>{tt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>覆盖基准耗时 (h)</Label><Input type="number" placeholder={`全局: ${globalMap.get(addForm.taskType)?.humanBaseline ?? ""}`} value={addForm.humanBaseline} onChange={(e) => setAddForm({ ...addForm, humanBaseline: e.target.value })} /></div>
              <div><Label>覆盖时薪 (¥/h)</Label><Input type="number" placeholder="留空使用全局" value={addForm.costPerHour} onChange={(e) => setAddForm({ ...addForm, costPerHour: e.target.value })} /></div>
              <Button className="w-full" onClick={handleAdd} disabled={!addForm.taskType}>添加</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teamConfigs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">该团队暂无覆盖配置，所有任务类型使用全局基准。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务类型</TableHead>
              <TableHead>全局基准</TableHead>
              <TableHead>团队覆盖值</TableHead>
              <TableHead>时薪覆盖</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamConfigs.map((cfg) => {
              const global = globalMap.get(cfg.taskType);
              const isEditing = editingId === cfg.id;
              return (
                <TableRow key={cfg.id}>
                  <TableCell>{cfg.taskType}</TableCell>
                  <TableCell className="text-muted-foreground line-through">{global?.humanBaseline ?? "—"}h</TableCell>
                  <TableCell className="font-semibold text-purple-700">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-20" value={editForm.humanBaseline ?? ""} onChange={(e) => setEditForm({ ...editForm, humanBaseline: Number(e.target.value) })} />
                    ) : `${cfg.humanBaseline}h`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-24" value={editForm.costPerHour ?? ""} onChange={(e) => setEditForm({ ...editForm, costPerHour: Number(e.target.value) })} />
                    ) : cfg.costPerHour !== global?.costPerHour ? `¥${cfg.costPerHour}` : "—（使用全局）"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(cfg.id)}><Check className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(cfg.id); setEditForm(cfg); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(cfg.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">仅显示有覆盖值的任务类型。其他任务类型自动使用全局基准。</p>
    </div>
  );
}
```

- [ ] **Step 3: Create MetricConfigEmployee component**

Create `src/components/settings/metric-config-employee.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/lib/types";

interface MetricConfigItem {
  id: string;
  employeeId: string | null;
  team: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

interface MetricConfigEmployeeProps {
  configs: MetricConfigItem[];
  employees: EmployeeListItem[];
  onRefresh: () => void;
}

export function MetricConfigEmployee({ configs, employees, onRefresh }: MetricConfigEmployeeProps) {
  const activeEmployees = employees.filter((e) => e.status !== "inactive");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(activeEmployees[0]?.id || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfigItem>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ taskType: "", humanBaseline: "", costPerHour: "" });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const globalConfigs = configs.filter((c) => !c.employeeId && !c.team);
  const teamConfigs = configs.filter((c) => !c.employeeId && c.team === selectedEmployee?.team);
  const empConfigs = configs.filter((c) => c.employeeId === selectedEmployeeId);

  const globalMap = new Map(globalConfigs.map((c) => [c.taskType, c]));
  const teamMap = new Map(teamConfigs.map((c) => [c.taskType, c]));
  const empMap = new Map(empConfigs.map((c) => [c.taskType, c]));

  const allTaskTypes = [...new Set(globalConfigs.map((c) => c.taskType))];
  const availableForAdd = allTaskTypes.filter((tt) => !empMap.has(tt));

  function getEffective(taskType: string): { value: number; source: "employee" | "team" | "global" } {
    const emp = empMap.get(taskType);
    if (emp) return { value: emp.humanBaseline, source: "employee" };
    const team = teamMap.get(taskType);
    if (team) return { value: team.humanBaseline, source: "team" };
    const global = globalMap.get(taskType);
    if (global) return { value: global.humanBaseline, source: "global" };
    return { value: 0, source: "global" };
  }

  const SOURCE_STYLE = {
    employee: "text-blue-700 bg-blue-50",
    team: "text-purple-700 bg-purple-50",
    global: "text-foreground bg-muted",
  };

  async function handleAdd() {
    await fetch("/api/metric-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: selectedEmployeeId,
        taskType: addForm.taskType,
        humanBaseline: Number(addForm.humanBaseline),
        costPerHour: Number(addForm.costPerHour) || 46.875,
      }),
    });
    setAddOpen(false);
    setAddForm({ taskType: "", humanBaseline: "", costPerHour: "" });
    onRefresh();
  }

  async function handleSave(id: string) {
    await fetch(`/api/metric-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    onRefresh();
  }

  async function handleRemove(id: string) {
    await fetch(`/api/metric-configs/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      {/* Employee selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">选择员工：</span>
        <Select value={selectedEmployeeId} onValueChange={(v) => setSelectedEmployeeId(v ?? selectedEmployeeId)}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {activeEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}（{e.team === "management" ? "管理" : e.team === "design" ? "设计" : "生产"}团队）</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" disabled={availableForAdd.length === 0}><Plus className="mr-1 h-4 w-4" />添加覆盖</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>为 {selectedEmployee?.name} 添加覆盖</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>任务类型</Label>
                <Select value={addForm.taskType} onValueChange={(v) => setAddForm({ ...addForm, taskType: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                  <SelectContent>
                    {availableForAdd.map((tt) => <SelectItem key={tt} value={tt}>{tt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>覆盖基准耗时 (h)</Label><Input type="number" value={addForm.humanBaseline} onChange={(e) => setAddForm({ ...addForm, humanBaseline: e.target.value })} /></div>
              <div><Label>覆盖时薪 (¥/h)</Label><Input type="number" placeholder="留空使用上层值" value={addForm.costPerHour} onChange={(e) => setAddForm({ ...addForm, costPerHour: e.target.value })} /></div>
              <Button className="w-full" onClick={handleAdd} disabled={!addForm.taskType || !addForm.humanBaseline}>添加</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info banner */}
      {selectedEmployee && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-4 text-xs text-amber-800">
          <strong>{selectedEmployee.name}</strong> 的最终生效值 = 员工覆盖 &gt; {selectedEmployee.team === "management" ? "管理" : selectedEmployee.team === "design" ? "设计" : "生产"}团队覆盖 &gt; 全局基准
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>任务类型</TableHead>
            <TableHead>全局</TableHead>
            <TableHead>团队</TableHead>
            <TableHead>员工覆盖</TableHead>
            <TableHead>✓ 生效值</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allTaskTypes.map((taskType) => {
            const global = globalMap.get(taskType);
            const team = teamMap.get(taskType);
            const emp = empMap.get(taskType);
            const effective = getEffective(taskType);
            const isEditing = emp && editingId === emp.id;

            return (
              <TableRow key={taskType}>
                <TableCell>{taskType}</TableCell>
                <TableCell className="text-muted-foreground">{global?.humanBaseline ?? "—"}h</TableCell>
                <TableCell className={team ? "text-purple-700" : "text-muted-foreground"}>{team ? `${team.humanBaseline}h` : "—"}</TableCell>
                <TableCell className={emp ? "font-semibold text-blue-700" : "text-muted-foreground"}>
                  {isEditing ? (
                    <Input type="number" className="h-7 w-20" value={editForm.humanBaseline ?? ""} onChange={(e) => setEditForm({ ...editForm, humanBaseline: Number(e.target.value) })} />
                  ) : emp ? `${emp.humanBaseline}h` : "—"}
                </TableCell>
                <TableCell>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-bold", SOURCE_STYLE[effective.source])}>
                    {effective.value}h（{effective.source === "employee" ? "员工" : effective.source === "team" ? "团队" : "全局"}）
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {emp ? (
                    isEditing ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(emp.id)}><Check className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(emp.id); setEditForm(emp); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">无覆盖</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite MetricConfigManager as orchestrator**

Replace `src/components/settings/metric-config-manager.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricConfigGlobal } from "./metric-config-global";
import { MetricConfigTeam } from "./metric-config-team";
import { MetricConfigEmployee } from "./metric-config-employee";
import type { EmployeeListItem } from "@/lib/types";

interface MetricConfigItem {
  id: string;
  employeeId: string | null;
  team: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

interface MetricConfigManagerProps {
  initialConfigs: MetricConfigItem[];
  employees: EmployeeListItem[];
}

export function MetricConfigManager({ initialConfigs, employees }: MetricConfigManagerProps) {
  const [configs, setConfigs] = useState(initialConfigs);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/metric-configs");
    const data = await res.json();
    setConfigs(data);
  }, []);

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5 mb-4 text-xs text-blue-800">
        <strong>覆盖优先级：</strong>员工覆盖 &gt; 团队覆盖 &gt; 全局基准。计算节省人时时，系统自动从最具体的层级取值。
      </div>

      <Tabs defaultValue="global">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="global">全局基准</TabsTrigger>
          <TabsTrigger value="team">团队覆盖</TabsTrigger>
          <TabsTrigger value="employee">员工覆盖</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <MetricConfigGlobal configs={configs} allConfigs={configs} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="team">
          <MetricConfigTeam configs={configs} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="employee">
          <MetricConfigEmployee configs={configs} employees={employees} onRefresh={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/settings` → "指标基准配置" tab:
- 3 sub-tabs visible (全局基准/团队覆盖/员工覆盖)
- Global tab shows existing configs with CRUD
- Team tab shows team selector, team overrides
- Employee tab shows employee selector, 3-column comparison, effective value highlighting

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/metric-config-*.tsx
git commit -m "feat(ui): 3-layer metric config with global/team/employee tabs"
```

---

## Task 11: Data Management API — Metrics CRUD

**Files:**
- Create: `src/app/api/data/metrics/route.ts`
- Create: `src/app/api/data/metrics/[id]/route.ts`

- [ ] **Step 1: Create GET + POST + DELETE for /api/data/metrics**

Create `src/app/api/data/metrics/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metrics, employees } from "@/db/schema";
import { eq, and, like, desc, asc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const team = searchParams.get("team") || "";
  const period = searchParams.get("period") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const sortField = searchParams.get("sort") || "period";
  const sortOrder = searchParams.get("order") || "desc";

  const conditions = [];
  if (team) conditions.push(eq(employees.team, team));
  if (period) conditions.push(eq(metrics.period, period));
  if (employeeId) conditions.push(eq(metrics.employeeId, employeeId));
  if (search) conditions.push(like(employees.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(metrics)
    .innerJoin(employees, eq(metrics.employeeId, employees.id))
    .where(where);
  const total = countResult[0]?.count ?? 0;

  const orderCol = sortField === "taskCount" ? metrics.taskCount
    : sortField === "adoptionRate" ? metrics.adoptionRate
    : sortField === "accuracyRate" ? metrics.accuracyRate
    : metrics.period;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: metrics.id,
      employeeId: metrics.employeeId,
      employeeName: employees.name,
      employeeAvatar: employees.avatar,
      team: employees.team,
      period: metrics.period,
      periodType: metrics.periodType,
      taskCount: metrics.taskCount,
      adoptionRate: metrics.adoptionRate,
      accuracyRate: metrics.accuracyRate,
      humanTimeSaved: metrics.humanTimeSaved,
    })
    .from(metrics)
    .innerJoin(employees, eq(metrics.employeeId, employees.id))
    .where(where)
    .orderBy(orderFn(orderCol))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();

  await db.insert(metrics).values({
    id,
    employeeId: body.employeeId,
    period: body.period,
    periodType: body.periodType || "monthly",
    taskCount: body.taskCount ?? 0,
    adoptionRate: body.adoptionRate ?? null,
    accuracyRate: body.accuracyRate ?? null,
    humanTimeSaved: body.humanTimeSaved ?? null,
    customMetrics: body.customMetrics ? JSON.stringify(body.customMetrics) : null,
    createdAt: Date.now(),
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ids: string[] = body.ids || [];

  for (const id of ids) {
    await db.delete(metrics).where(eq(metrics.id, id));
  }

  return NextResponse.json({ deleted: ids.length });
}
```

- [ ] **Step 2: Create PUT for /api/data/metrics/[id]**

Create `src/app/api/data/metrics/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metrics } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  await db.update(metrics).set({
    taskCount: body.taskCount,
    adoptionRate: body.adoptionRate,
    accuracyRate: body.accuracyRate,
    humanTimeSaved: body.humanTimeSaved,
  }).where(eq(metrics.id, id));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify with curl**

```bash
curl -s "http://localhost:3000/api/data/metrics?page=1&pageSize=5" | jq '.total, .totalPages, (.data | length)'
```
Expected: total > 0, data array has up to 5 items.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/data/metrics/
git commit -m "feat(api): data management metrics CRUD with pagination"
```

---

## Task 12: Data Management API — Skill Metrics CRUD

**Files:**
- Create: `src/app/api/data/skill-metrics/route.ts`
- Create: `src/app/api/data/skill-metrics/[id]/route.ts`

- [ ] **Step 1: Create GET + POST + DELETE for /api/data/skill-metrics**

Create `src/app/api/data/skill-metrics/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skillMetrics, skills, employees } from "@/db/schema";
import { eq, and, like, desc, asc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const team = searchParams.get("team") || "";
  const period = searchParams.get("period") || "";
  const category = searchParams.get("category") || "";
  const employeeId = searchParams.get("employeeId") || "";

  const conditions = [];
  if (team) conditions.push(eq(employees.team, team));
  if (period) conditions.push(eq(skillMetrics.period, period));
  if (category) conditions.push(eq(skills.category, category));
  if (employeeId) conditions.push(eq(skillMetrics.employeeId, employeeId));
  if (search) conditions.push(like(employees.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(skillMetrics)
    .innerJoin(employees, eq(skillMetrics.employeeId, employees.id))
    .innerJoin(skills, eq(skillMetrics.skillId, skills.id))
    .where(where);
  const total = countResult[0]?.count ?? 0;

  const rows = await db
    .select({
      id: skillMetrics.id,
      employeeId: skillMetrics.employeeId,
      employeeName: employees.name,
      employeeAvatar: employees.avatar,
      team: employees.team,
      skillId: skillMetrics.skillId,
      skillName: skills.name,
      category: skills.category,
      period: skillMetrics.period,
      invocationCount: skillMetrics.invocationCount,
      successRate: skillMetrics.successRate,
      avgResponseTime: skillMetrics.avgResponseTime,
    })
    .from(skillMetrics)
    .innerJoin(employees, eq(skillMetrics.employeeId, employees.id))
    .innerJoin(skills, eq(skillMetrics.skillId, skills.id))
    .where(where)
    .orderBy(desc(skillMetrics.period))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();

  await db.insert(skillMetrics).values({
    id,
    skillId: body.skillId,
    employeeId: body.employeeId,
    period: body.period,
    invocationCount: body.invocationCount ?? 0,
    successRate: body.successRate ?? null,
    avgResponseTime: body.avgResponseTime ?? null,
    createdAt: Date.now(),
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ids: string[] = body.ids || [];

  for (const id of ids) {
    await db.delete(skillMetrics).where(eq(skillMetrics.id, id));
  }

  return NextResponse.json({ deleted: ids.length });
}
```

- [ ] **Step 2: Create PUT for /api/data/skill-metrics/[id]**

Create `src/app/api/data/skill-metrics/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skillMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  await db.update(skillMetrics).set({
    invocationCount: body.invocationCount,
    successRate: body.successRate,
    avgResponseTime: body.avgResponseTime,
  }).where(eq(skillMetrics.id, id));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify with curl**

```bash
curl -s "http://localhost:3000/api/data/skill-metrics?page=1&pageSize=5" | jq '.total, (.data | length)'
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/data/skill-metrics/
git commit -m "feat(api): data management skill-metrics CRUD with pagination"
```

---

## Task 13: Data Management API — Tasks CRUD

**Files:**
- Create: `src/app/api/data/tasks/route.ts`
- Create: `src/app/api/data/tasks/[id]/route.ts`

- [ ] **Step 1: Create GET + DELETE for /api/data/tasks**

Create `src/app/api/data/tasks/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { eq, and, like, desc, asc, sql, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const team = searchParams.get("team") || "";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const conditions = [];
  if (team) conditions.push(eq(tasks.team, team));
  if (status) conditions.push(eq(tasks.status, status));
  if (type) conditions.push(eq(tasks.type, type));
  if (employeeId) conditions.push(eq(tasks.employeeId, employeeId));
  if (search) conditions.push(like(employees.name, `%${search}%`));
  if (startDate) conditions.push(gte(tasks.startTime, new Date(startDate).getTime()));
  if (endDate) conditions.push(lte(tasks.startTime, new Date(endDate).getTime()));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(where);
  const total = countResult[0]?.count ?? 0;

  const rows = await db
    .select({
      id: tasks.id,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      employeeAvatar: employees.avatar,
      team: tasks.team,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      qualityScore: tasks.qualityScore,
      tokenUsage: tasks.tokenUsage,
      retryCount: tasks.retryCount,
      startTime: tasks.startTime,
      actualEndTime: tasks.actualEndTime,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(where)
    .orderBy(desc(tasks.startTime))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const data = rows.map((r) => ({
    ...r,
    estimatedCost: r.tokenUsage ? Number((r.tokenUsage * 0.00015).toFixed(4)) : null,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ids: string[] = body.ids || [];

  for (const id of ids) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  return NextResponse.json({ deleted: ids.length });
}
```

- [ ] **Step 2: Create PUT for /api/data/tasks/[id]**

Note: This route path (`/api/data/tasks/[id]`) is separate from the existing `/api/tasks/[taskId]` — different path prefix, no conflict.

Create `src/app/api/data/tasks/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updateSet: Record<string, unknown> = {};
  if (body.qualityScore !== undefined) updateSet.qualityScore = body.qualityScore;
  if (body.retryCount !== undefined) updateSet.retryCount = body.retryCount;
  if (body.tokenUsage !== undefined) updateSet.tokenUsage = body.tokenUsage;
  if (body.status !== undefined) updateSet.status = body.status;

  if (Object.keys(updateSet).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(tasks).set(updateSet).where(eq(tasks.id, id));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify with curl**

```bash
curl -s "http://localhost:3000/api/data/tasks?page=1&pageSize=5" | jq '.total, (.data | length)'
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/data/tasks/
git commit -m "feat(api): data management tasks CRUD with pagination"
```

---

## Task 14: Export API

**Files:**
- Create: `src/app/api/data/export/route.ts`
- Create: `src/components/settings/data-management/export-utils.ts`

- [ ] **Step 1: Install xlsx dependency**

```bash
npm install xlsx
```

- [ ] **Step 2: Create export utility functions**

Create `src/components/settings/data-management/export-utils.ts`:

```ts
import * as XLSX from "xlsx";

export function downloadCSV(data: Record<string, unknown>[], filename: string, headers: { key: string; label: string }[]) {
  const BOM = "\uFEFF";
  const headerRow = headers.map((h) => h.label).join(",");
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h.key];
      if (val == null) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(",")
  );
  const csv = BOM + [headerRow, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadExcel(
  data: Record<string, unknown>[],
  filename: string,
  headers: { key: string; label: string }[],
  teamGroupKey?: string
) {
  const wb = XLSX.utils.book_new();

  if (teamGroupKey) {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const team = String(row[teamGroupKey] || "其他");
      if (!groups.has(team)) groups.set(team, []);
      groups.get(team)!.push(row);
    }
    const teamLabels: Record<string, string> = { management: "管理团队", design: "设计团队", production: "生产团队" };
    for (const [team, rows] of groups) {
      const sheetData = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h) => { obj[h.label] = row[h.key] ?? ""; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, teamLabels[team] || team);
    }
  } else {
    const sheetData = data.map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h) => { obj[h.label] = row[h.key] ?? ""; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "数据");
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

- [ ] **Step 3: Create server-side export API**

Create `src/app/api/data/export/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metrics, skillMetrics, tasks, employees, skills } from "@/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "metrics";
  const format = searchParams.get("format") || "csv";
  const team = searchParams.get("team") || "";
  const period = searchParams.get("period") || "";
  const search = searchParams.get("search") || "";

  let data: Record<string, unknown>[] = [];
  let headers: { key: string; label: string }[] = [];

  if (type === "metrics") {
    const conditions = [];
    if (team) conditions.push(eq(employees.team, team));
    if (period) conditions.push(eq(metrics.period, period));
    if (search) conditions.push(like(employees.name, `%${search}%`));

    const rows = await db
      .select({
        employeeName: employees.name,
        team: employees.team,
        period: metrics.period,
        taskCount: metrics.taskCount,
        adoptionRate: metrics.adoptionRate,
        accuracyRate: metrics.accuracyRate,
        humanTimeSaved: metrics.humanTimeSaved,
      })
      .from(metrics)
      .innerJoin(employees, eq(metrics.employeeId, employees.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(metrics.period));

    data = rows;
    headers = [
      { key: "employeeName", label: "员工" },
      { key: "team", label: "团队" },
      { key: "period", label: "期间" },
      { key: "taskCount", label: "任务数" },
      { key: "adoptionRate", label: "采纳率(%)" },
      { key: "accuracyRate", label: "准确率(%)" },
      { key: "humanTimeSaved", label: "节省人时(h)" },
    ];
  } else if (type === "skill-metrics") {
    const conditions = [];
    if (team) conditions.push(eq(employees.team, team));
    if (period) conditions.push(eq(skillMetrics.period, period));
    if (search) conditions.push(like(employees.name, `%${search}%`));

    const rows = await db
      .select({
        employeeName: employees.name,
        team: employees.team,
        skillName: skills.name,
        category: skills.category,
        period: skillMetrics.period,
        invocationCount: skillMetrics.invocationCount,
        successRate: skillMetrics.successRate,
        avgResponseTime: skillMetrics.avgResponseTime,
      })
      .from(skillMetrics)
      .innerJoin(employees, eq(skillMetrics.employeeId, employees.id))
      .innerJoin(skills, eq(skillMetrics.skillId, skills.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(skillMetrics.period));

    data = rows;
    headers = [
      { key: "employeeName", label: "员工" },
      { key: "team", label: "团队" },
      { key: "skillName", label: "技能" },
      { key: "category", label: "分类" },
      { key: "period", label: "期间" },
      { key: "invocationCount", label: "调用次数" },
      { key: "successRate", label: "成功率(%)" },
      { key: "avgResponseTime", label: "响应时间(ms)" },
    ];
  } else if (type === "tasks") {
    const conditions = [];
    if (team) conditions.push(eq(tasks.team, team));
    if (search) conditions.push(like(employees.name, `%${search}%`));

    const rows = await db
      .select({
        name: tasks.name,
        employeeName: employees.name,
        team: tasks.team,
        type: tasks.type,
        status: tasks.status,
        qualityScore: tasks.qualityScore,
        tokenUsage: tasks.tokenUsage,
        retryCount: tasks.retryCount,
        startTime: tasks.startTime,
      })
      .from(tasks)
      .innerJoin(employees, eq(tasks.employeeId, employees.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.startTime));

    data = rows.map((r) => ({
      ...r,
      estimatedCost: r.tokenUsage ? Number((r.tokenUsage * 0.00015).toFixed(4)) : null,
      startTime: r.startTime ? new Date(r.startTime).toISOString().slice(0, 19) : "",
    }));
    headers = [
      { key: "name", label: "任务名称" },
      { key: "employeeName", label: "员工" },
      { key: "team", label: "团队" },
      { key: "type", label: "类型" },
      { key: "status", label: "状态" },
      { key: "qualityScore", label: "质量分" },
      { key: "tokenUsage", label: "Token用量" },
      { key: "estimatedCost", label: "预估费用(¥)" },
      { key: "retryCount", label: "重试次数" },
      { key: "startTime", label: "开始时间" },
    ];
  }

  if (format === "csv") {
    const BOM = "\uFEFF";
    const headerRow = headers.map((h) => h.label).join(",");
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h.key];
        if (val == null) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    );
    const csv = BOM + [headerRow, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}_export.csv"`,
      },
    });
  }

  // Excel format
  const wb = XLSX.utils.book_new();
  const teamLabels: Record<string, string> = { management: "管理团队", design: "设计团队", production: "生产团队" };

  if (!team) {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const t = String(row.team || "其他");
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push(row);
    }
    for (const [t, rows] of groups) {
      const sheetData = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h) => { obj[h.label] = row[h.key] ?? ""; });
        return obj;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), teamLabels[t] || t);
    }
  } else {
    const sheetData = data.map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h) => { obj[h.label] = row[h.key] ?? ""; });
      return obj;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), teamLabels[team] || "数据");
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}_export.xlsx"`,
    },
  });
}
```

- [ ] **Step 4: Verify export**

```bash
curl -s "http://localhost:3000/api/data/export?type=metrics&format=csv" | head -5
```
Expected: CSV header row followed by data rows in Chinese.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/data/export/ src/components/settings/data-management/export-utils.ts package.json package-lock.json
git commit -m "feat(api): data export API (CSV + Excel) with SheetJS"
```

---

## Task 15: Data Management — Shared UI Components

**Files:**
- Create: `src/components/settings/data-management/data-toolbar.tsx`
- Create: `src/components/settings/data-management/data-table.tsx`
- Create: `src/components/settings/data-management/data-breadcrumb.tsx`
- Create: `src/components/settings/data-management/data-summary-cards.tsx`
- Create: `src/components/settings/data-management/record-dialog.tsx`

- [ ] **Step 1: Create DataToolbar component**

Create `src/components/settings/data-management/data-toolbar.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, FileSpreadsheet, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filters: FilterOption[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onAdd: () => void;
  addLabel?: string;
}

export function DataToolbar({
  search, onSearchChange, filters, filterValues, onFilterChange,
  selectedCount, onBulkDelete, onExportCSV, onExportExcel, onAdd, addLabel = "新增记录",
}: DataToolbarProps) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg mb-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索员工名称..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>
        {filters.map((f) => (
          <Select key={f.key} value={filterValues[f.key] || ""} onValueChange={(v) => onFilterChange(f.key, v ?? "")}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[100px]"><SelectValue placeholder={f.label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部{f.label}</SelectItem>
              {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {selectedCount > 0 && (
          <span className="text-xs text-muted-foreground mr-2">
            已选 <strong className="text-primary">{selectedCount}</strong> 条
          </span>
        )}
        {selectedCount > 0 && onBulkDelete && (
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive">
                <Trash2 className="mr-1 h-3.5 w-3.5" />批量删除
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>将删除已选的 {selectedCount} 条记录，此操作不可撤销。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={onBulkDelete}>确认删除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onExportCSV}>
          <FileText className="mr-1 h-3.5 w-3.5" />CSV
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onExportExcel}>
          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />Excel
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />{addLabel}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DataTable component**

Create `src/components/settings/data-management/data-table.tsx`:

```tsx
"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DataTable<T extends { id: string }>({
  columns, data, selectedIds, onSelectionChange,
  onEdit, onDelete, page, pageSize, total, totalPages, onPageChange,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selectedIds);
      data.forEach((r) => next.delete(r.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      data.forEach((r) => next.add(r.id));
      onSelectionChange(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  }

  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">
        显示 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} / 共 {total} 条
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
            </TableHead>
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}>
                {col.label}
              </TableHead>
            ))}
            {(onEdit || onDelete) && <TableHead className="text-right">操作</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleOne(row.id)} className="rounded" />
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col.key} className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </TableCell>
              ))}
              {(onEdit || onDelete) && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(row.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">每页 {pageSize} 条</span>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "px-2.5 py-1 rounded text-xs border",
                p === page ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {p}
            </button>
          ))}
          {totalPages > 7 && <span className="px-2 text-xs text-muted-foreground">...</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create DataBreadcrumb component**

Create `src/components/settings/data-management/data-breadcrumb.tsx`:

```tsx
"use client";

import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface DataBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function DataBreadcrumb({ items }: DataBreadcrumbProps) {
  if (items.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 mb-4 text-sm">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {item.onClick ? (
            <button onClick={item.onClick} className="text-primary hover:underline">{item.label}</button>
          ) : (
            <span className="font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create DataSummaryCards component**

Create `src/components/settings/data-management/data-summary-cards.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

interface SummaryCard {
  label: string;
  value: string | number;
  change?: { value: string; positive: boolean };
}

interface DataSummaryCardsProps {
  cards: SummaryCard[];
}

export function DataSummaryCards({ cards }: DataSummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card border border-border rounded-lg p-3.5">
          <div className="text-[11px] text-muted-foreground">{card.label}</div>
          <div className="text-2xl font-bold mt-0.5">{card.value}</div>
          {card.change && (
            <div className={cn("text-[11px] mt-0.5", card.change.positive ? "text-green-600" : "text-red-600")}>
              {card.change.positive ? "↑" : "↓"} {card.change.value} vs 上月
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create RecordDialog component**

Create `src/components/settings/data-management/record-dialog.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldDef[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

export function RecordDialog({ open, onOpenChange, title, fields, initialValues, onSubmit }: RecordDialogProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      fields.forEach((f) => {
        initial[f.key] = initialValues?.[f.key] != null ? String(initialValues[f.key]) : "";
      });
      setForm(initial);
    }
  }, [open, fields, initialValues]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const values: Record<string, unknown> = {};
      fields.forEach((f) => {
        const v = form[f.key];
        values[f.key] = f.type === "number" ? (v ? Number(v) : null) : v || null;
      });
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = fields.filter((f) => f.required).every((f) => form[f.key]?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label>{f.label}{f.required && " *"}</Label>
              {f.type === "select" ? (
                <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder || "选择"} /></SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === "textarea" ? (
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={f.placeholder}
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/data-management/data-toolbar.tsx src/components/settings/data-management/data-table.tsx src/components/settings/data-management/data-breadcrumb.tsx src/components/settings/data-management/data-summary-cards.tsx src/components/settings/data-management/record-dialog.tsx
git commit -m "feat(ui): data management shared components (toolbar, table, breadcrumb, cards, dialog)"
```

---

## Task 16: Data Management Center — Metrics Tab + Main Container

**Files:**
- Create: `src/components/settings/data-management/metrics-tab.tsx`
- Create: `src/components/settings/data-management/data-management-center.tsx`

- [ ] **Step 1: Create MetricsTab component**

Create `src/components/settings/data-management/metrics-tab.tsx`. This component implements the full metrics management with search, filtering, drill-down, CRUD, and export. It uses the shared components from Task 15 and follows the spec's drill-down and toolbar design.

The component should:
- Fetch data from `/api/data/metrics` with pagination and filtering params
- Use `DataToolbar` for search/filter/export/add
- Use `DataTable` for the paginated, selectable data table
- Use `DataBreadcrumb` for drill-down navigation (全部 → 团队 → 员工)
- Use `DataSummaryCards` when drilled down to show KPI summary
- Use `RecordDialog` for create/edit
- Team filter options: management(管理)/design(设计)/production(生产)
- Period filter: dynamically generated from last 6 months
- Export via `/api/data/export?type=metrics&format=csv|xlsx`
- Drill-down: clicking team badge → set team filter + update breadcrumb; clicking employee name → set employeeId filter + update breadcrumb
- Columns: 员工(avatar+name) | 团队 | 期间 | 任务数 | 采纳率 | 准确率 | 节省人时 | 操作

This is a large component (~200 lines). The implementer should use the shared components heavily and follow the existing fetch pattern (`useState` + `useEffect` + `useCallback` for data loading). Inline edit is handled by `RecordDialog` in edit mode (not row-inline like metric-config). The `AiAvatar` component renders in the employee column.

- [ ] **Step 2: Create DataManagementCenter container**

Create `src/components/settings/data-management/data-management-center.tsx`:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsTab } from "./metrics-tab";
import { SkillMetricsTab } from "./skill-metrics-tab";
import { TasksTab } from "./tasks-tab";

export function DataManagementCenter() {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-semibold">数据指标管理</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          统一管理所有业务数据指标，支持实时编辑、下钻分析和数据导出
        </p>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="metrics">📊 员工绩效</TabsTrigger>
          <TabsTrigger value="skill-metrics">⚡ 技能指标</TabsTrigger>
          <TabsTrigger value="tasks">📋 任务数据</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics"><MetricsTab /></TabsContent>
        <TabsContent value="skill-metrics"><SkillMetricsTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab /></TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Verify MetricsTab renders**

Open `http://localhost:3000/settings` → "数据指标管理" tab → "员工绩效" sub-tab. Should show paginated data table with toolbar.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/data-management/metrics-tab.tsx src/components/settings/data-management/data-management-center.tsx
git commit -m "feat(ui): data management center with metrics tab"
```

---

## Task 17: Data Management — Skill Metrics Tab

**Files:**
- Create: `src/components/settings/data-management/skill-metrics-tab.tsx`

- [ ] **Step 1: Create SkillMetricsTab component**

Create `src/components/settings/data-management/skill-metrics-tab.tsx`. This follows the same pattern as MetricsTab but with different columns and filters:

- Fetch from `/api/data/skill-metrics`
- Additional filter: skill category (核心能力/分析能力/输出能力)
- Columns: 员工(avatar+name) | 技能名称 | 分类 | 期间 | 调用次数 | 成功率 | 响应时间(ms) | 操作
- Same drill-down, export, CRUD patterns
- Export via `/api/data/export?type=skill-metrics&format=csv|xlsx`

The implementer should follow the MetricsTab as the reference implementation, adjusting columns, filters, API endpoint, and RecordDialog fields.

- [ ] **Step 2: Verify in browser**

Open settings → 数据指标管理 → 技能指标. Should show skill metrics data with category filter.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/data-management/skill-metrics-tab.tsx
git commit -m "feat(ui): data management skill-metrics tab"
```

---

## Task 18: Data Management — Tasks Tab

**Files:**
- Create: `src/components/settings/data-management/tasks-tab.tsx`

- [ ] **Step 1: Create TasksTab component**

Create `src/components/settings/data-management/tasks-tab.tsx`. Different from the other two tabs:

- Fetch from `/api/data/tasks`
- Additional filters: task status (running/completed/failed), task type
- Columns: 任务名称 | 员工 | 类型 | 状态 | 质量分 | Token用量 | 预估费用(¥) | 重试次数 | 开始时间 | 操作
- Only qualityScore, retryCount, tokenUsage, status are editable via RecordDialog
- Task name is clickable → navigates to `/production?taskId={id}` (production kanban detail)
- Status column renders colored badge (running=blue, completed=green, failed=red)
- 预估费用 = tokenUsage × 0.00015, displayed as ¥ format
- Export via `/api/data/export?type=tasks&format=csv|xlsx`

- [ ] **Step 2: Verify in browser**

Open settings → 数据指标管理 → 任务数据. Should show tasks with status badges and clickable task names.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/data-management/tasks-tab.tsx
git commit -m "feat(ui): data management tasks tab"
```

---

## Task 19: Final Integration Verification

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: Build succeeds with no type errors. Warnings about unused variables are acceptable.

- [ ] **Step 2: Re-seed database**

Run: `npm run db:seed`
Expected: Seed completes with team-level metric configs and avatar descriptions.

- [ ] **Step 3: Full browser verification**

Start dev server: `npm run dev`

Open `http://localhost:3000/settings` and verify all 3 tabs:

**Tab 1 — 员工管理:**
- Compact card list renders with avatars, team colors, metrics
- Team filter and search work
- "新增员工" 3-step dialog works (basic → personality → skills)
- 上岗/下岗 status toggle works
- New employee appears with fallback avatar, real avatar appears after generation

**Tab 2 — 指标基准配置:**
- 3 sub-tabs: 全局基准 / 团队覆盖 / 员工覆盖
- Global tab: CRUD all works, override count badge shows
- Team tab: team selector, add/edit/remove overrides
- Employee tab: employee selector, 3-column comparison, effective value highlights

**Tab 3 — 数据指标管理:**
- 3 sub-tabs: 员工绩效 / 技能指标 / 任务数据
- Each sub-tab: search, filter, paginated table, CRUD
- Drill-down: click team → filtered view with breadcrumb
- Export: CSV and Excel buttons download files
- Multi-select: checkbox selection, bulk delete

- [ ] **Step 4: Cross-module data verification**

Edit a metrics record in the data management center, then check:
1. Go to `/dashboard` — KPI cards should reflect the updated value (after page reload)
2. Go to `/roster` — employee card metrics should match

- [ ] **Step 5: Final commit**

```bash
git add -A
git status  # Review all changes
git commit -m "feat: complete settings page redesign — employee mgmt, 3-layer metric config, data management center"
```
