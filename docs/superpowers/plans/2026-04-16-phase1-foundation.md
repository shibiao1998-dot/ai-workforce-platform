# AI Workforce Platform — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Next.js project with database schema, mock data for all 24 AI employees, global navigation, and the AI roster (list + detail pages with edit).

**Architecture:** Next.js 15 App Router + shadcn/ui dark theme + SQLite (via Drizzle ORM). All data served through `/api/` route handlers. UI components are server components by default; client components only where interactivity requires it.

**Tech Stack:** Next.js 15, TypeScript, shadcn/ui, Tailwind CSS, Drizzle ORM, SQLite (better-sqlite3), Lucide Icons, next-themes

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with nav + theme
│   ├── page.tsx                      # Redirect to /dashboard
│   ├── globals.css                   # Tailwind + dark theme overrides
│   ├── roster/
│   │   ├── page.tsx                  # Roster list page
│   │   └── [id]/
│   │       └── page.tsx              # Employee detail page
│   └── api/
│       └── employees/
│           ├── route.ts              # GET /api/employees, POST /api/employees
│           └── [id]/
│               └── route.ts         # GET/PUT/DELETE /api/employees/:id
├── components/
│   ├── nav/
│   │   └── sidebar.tsx              # Sidebar navigation
│   ├── roster/
│   │   ├── employee-card.tsx        # Grid card for roster list
│   │   ├── employee-grid.tsx        # Filtered/searched grid
│   │   ├── employee-detail.tsx      # Detail page shell with tabs
│   │   ├── tabs/
│   │   │   ├── profile-tab.tsx      # Profile tab (soul/identity/bio)
│   │   │   ├── skills-tab.tsx       # Skills tab
│   │   │   ├── metrics-tab.tsx      # Metrics tab (stub for Phase 2)
│   │   │   └── version-tab.tsx      # Version log tab
│   │   └── edit-employee-modal.tsx  # Edit modal for employee fields
│   └── ui/                          # shadcn/ui components (auto-generated)
├── db/
│   ├── index.ts                     # Drizzle client singleton
│   ├── schema.ts                    # All table definitions
│   └── seed.ts                      # 24 AI employees mock data seeder
└── lib/
    └── types.ts                     # Shared TypeScript types
```

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json` (via CLI)
- Create: `src/app/globals.css`
- Create: `tailwind.config.ts`
- Create: `components.json` (shadcn config)

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/bill_huang/workspace/claudecode/myproject/AIproject
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected output: `Success! Created project at .../AIproject`

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm better-sqlite3 drizzle-kit
npm install -D @types/better-sqlite3
npm install lucide-react next-themes class-variance-authority clsx tailwind-merge
```

Expected: packages installed with no peer-dep errors

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: choose `Default` style, `Slate` base color, CSS variables `Yes`.

- [ ] **Step 4: Install shadcn components needed for Phase 1**

```bash
npx shadcn@latest add button card badge tabs input label textarea dialog select
```

Expected: components written to `src/components/ui/`

- [ ] **Step 5: Configure dark theme globals in `src/app/globals.css`**

Replace the auto-generated CSS with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222 47% 6%;
    --foreground: 210 40% 96%;
    --card: 222 47% 9%;
    --card-foreground: 210 40% 96%;
    --popover: 222 47% 9%;
    --popover-foreground: 210 40% 96%;
    --primary: 196 100% 50%;
    --primary-foreground: 222 47% 6%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 96%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 96%;
    --destructive: 0 62% 60%;
    --destructive-foreground: 210 40% 96%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 196 100% 50%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with shadcn/ui dark theme"
```

---

### Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Write the schema**

Create `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  title: text("title").notNull(),
  team: text("team", { enum: ["management", "design", "production"] }).notNull(),
  status: text("status", { enum: ["active", "developing", "planned"] }).notNull(),
  soul: text("soul"),
  identity: text("identity"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull().default(3),
  category: text("category"),
});

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  periodType: text("period_type", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  taskCount: integer("task_count").notNull().default(0),
  adoptionRate: real("adoption_rate"),
  accuracyRate: real("accuracy_rate"),
  humanTimeSaved: real("human_time_saved"),
  customMetrics: text("custom_metrics"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  team: text("team", { enum: ["management", "design", "production"] }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  progress: integer("progress").notNull().default(0),
  currentStep: text("current_step"),
  startTime: integer("start_time", { mode: "timestamp" }),
  estimatedEndTime: integer("estimated_end_time", { mode: "timestamp" }),
  actualEndTime: integer("actual_end_time", { mode: "timestamp" }),
  metadata: text("metadata"),
});

export const taskOutputs = sqliteTable("task_outputs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["document", "resource", "report", "media", "other"] }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const versionLogs = sqliteTable("version_logs", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  date: text("date").notNull(),
  changelog: text("changelog").notNull(),
  capabilities: text("capabilities"),
});

export const metricConfigs = sqliteTable("metric_configs", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  taskType: text("task_type").notNull(),
  humanBaseline: real("human_baseline").notNull(),
  costPerHour: real("cost_per_hour").notNull().default(46.875),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

- [ ] **Step 2: Write the Drizzle client singleton**

Create `src/db/index.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "local.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
```

- [ ] **Step 3: Write drizzle.config.ts**

Create `drizzle.config.ts`:

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./local.db",
  },
} satisfies Config;
```

- [ ] **Step 4: Add scripts to package.json**

Edit `package.json`, add to the `"scripts"` section:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:seed": "tsx src/db/seed.ts"
```

Also install `tsx`:

```bash
npm install -D tsx
```

- [ ] **Step 5: Push schema to SQLite**

```bash
npm run db:push
```

Expected output: `[✓] Changes applied`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Drizzle ORM schema for all entities"
```

---

### Task 3: Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write shared TypeScript types**

Create `src/lib/types.ts`:

```typescript
export type TeamType = "management" | "design" | "production";
export type EmployeeStatus = "active" | "developing" | "planned";
export type PeriodType = "daily" | "weekly" | "monthly";
export type TaskStatus = "running" | "completed" | "failed";
export type OutputType = "document" | "resource" | "report" | "media" | "other";

export interface Employee {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  team: TeamType;
  status: EmployeeStatus;
  soul: string | null;
  identity: string | null;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  skills?: Skill[];
  metrics?: Metric[];
  versionLogs?: VersionLog[];
}

export interface Skill {
  id: string;
  employeeId: string;
  name: string;
  description: string | null;
  level: number;
  category: string | null;
}

export interface Metric {
  id: string;
  employeeId: string;
  period: string;
  periodType: PeriodType;
  taskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  humanTimeSaved: number | null;
  customMetrics: Record<string, unknown> | null;
  createdAt: Date | null;
}

export interface Task {
  id: string;
  employeeId: string;
  team: TeamType;
  name: string;
  type: string;
  status: TaskStatus;
  progress: number;
  currentStep: string | null;
  startTime: Date | null;
  estimatedEndTime: Date | null;
  actualEndTime: Date | null;
  metadata: Record<string, unknown> | null;
}

export interface TaskOutput {
  id: string;
  taskId: string;
  type: OutputType;
  title: string;
  content: string | null;
  url: string | null;
  createdAt: Date | null;
}

export interface VersionLog {
  id: string;
  employeeId: string;
  version: string;
  date: string;
  changelog: string;
  capabilities: Record<string, unknown> | null;
}

export interface MetricConfig {
  id: string;
  employeeId: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
  updatedAt: Date | null;
}

// API response shapes
export interface EmployeeListItem {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  team: TeamType;
  status: EmployeeStatus;
  monthlyTaskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 4: Mock Data Seeder (24 AI Employees)

**Files:**
- Create: `src/db/seed.ts`

- [ ] **Step 1: Write the seed file**

Create `src/db/seed.ts`:

```typescript
import { db } from "./index";
import { employees, skills, metrics, versionLogs } from "./schema";
import { randomUUID } from "crypto";

const now = new Date();

// Helper to generate monthly metrics for last 6 months
function genMetrics(employeeId: string, baseTaskCount: number, adoptionRate: number, accuracyRate: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      id: randomUUID(),
      employeeId,
      period,
      periodType: "monthly" as const,
      taskCount: Math.round(baseTaskCount * (0.8 + Math.random() * 0.4)),
      adoptionRate: Math.min(1, adoptionRate + (Math.random() - 0.5) * 0.1),
      accuracyRate: Math.min(1, accuracyRate + (Math.random() - 0.5) * 0.08),
      humanTimeSaved: Math.round(baseTaskCount * 2.5 * (0.8 + Math.random() * 0.4) * 10) / 10,
      customMetrics: null,
      createdAt: d,
    };
  });
}

const SEED_EMPLOYEES = [
  // === AI管理团队 (10人) ===
  {
    id: randomUUID(), name: "AI审计官", title: "项目审计专家",
    team: "management" as const, status: "active" as const,
    soul: "让每一个项目决策都有可追溯的质量基准",
    identity: "严谨、数据驱动、以事实说话的审计专家",
    description: "负责对所有在执行项目进行质量与合规审计，输出结构化审计报告，累计完成846次项目审计，Q1建议采纳率61%。",
    skills: [
      { name: "项目审计", level: 5, category: "核心能力", description: "质量基准检查与风险识别" },
      { name: "报告生成", level: 4, category: "输出能力", description: "结构化审计报告自动生成" },
      { name: "风险预警", level: 4, category: "核心能力", description: "项目风险识别与预警机制" },
    ],
    metrics: { taskCount: 140, adoptionRate: 0.61, accuracyRate: 0.88 },
    version: { version: "V2.1", changelog: "新增多项目并行审计能力，提升报告生成速度40%" },
  },
  {
    id: randomUUID(), name: "AI人力专员", title: "人力资源数据分析师",
    team: "management" as const, status: "active" as const,
    soul: "用数据驱动人员决策，让人才管理更科学",
    identity: "细致、洞察力强、以数据为核心的人力分析师",
    description: "负责人员数据盘点、绩效追踪与人才预警，每月输出人力健康报告，预警准确率达85%。",
    skills: [
      { name: "人员盘点", level: 5, category: "核心能力", description: "数据驱动的人员结构分析" },
      { name: "绩效追踪", level: 4, category: "核心能力", description: "多维度绩效指标跟踪" },
      { name: "预警分析", level: 5, category: "核心能力", description: "人员风险早期预警" },
    ],
    metrics: { taskCount: 60, adoptionRate: 0.78, accuracyRate: 0.85 },
    version: { version: "V1.5", changelog: "集成离职风险模型，预警准确率提升至85%" },
  },
  {
    id: randomUUID(), name: "AI决策官", title: "战略决策支持专家",
    team: "management" as const, status: "active" as const,
    soul: "为每个关键决策提供结构化的分析框架和数据支撑",
    identity: "理性、系统化思考、善于在复杂信息中提炼关键",
    description: "负责重大项目决策的前置分析，提供多方案对比、风险评估与建议报告，辅助管理层科学决策。",
    skills: [
      { name: "决策分析", level: 5, category: "核心能力", description: "结构化决策框架与多方案对比" },
      { name: "风险评估", level: 4, category: "核心能力", description: "系统性风险识别与量化" },
      { name: "报告撰写", level: 4, category: "输出能力", description: "高质量决策报告生成" },
    ],
    metrics: { taskCount: 45, adoptionRate: 0.72, accuracyRate: 0.82 },
    version: { version: "V1.2", changelog: "优化多方案对比模板，决策报告生成速度提升60%" },
  },
  {
    id: randomUUID(), name: "AI项目监控", title: "项目进度追踪官",
    team: "management" as const, status: "active" as const,
    soul: "让每个项目的进度透明可见，风险提前暴露",
    identity: "精准、实时追踪、善于识别进度偏差的监控专家",
    description: "实时监控所有在执行项目的进度、里程碑达成情况，自动识别延期风险并触发预警。",
    skills: [
      { name: "进度追踪", level: 5, category: "核心能力", description: "多项目实时进度监控" },
      { name: "里程碑管理", level: 4, category: "核心能力", description: "关键节点识别与追踪" },
      { name: "延期预警", level: 5, category: "核心能力", description: "智能延期风险识别" },
    ],
    metrics: { taskCount: 200, adoptionRate: 0.69, accuracyRate: 0.91 },
    version: { version: "V1.8", changelog: "新增多维度进度偏差分析，预警时效提升至T+1" },
  },
  {
    id: randomUUID(), name: "AI合规官", title: "合规与法务支持专家",
    team: "management" as const, status: "developing" as const,
    soul: "守住合规红线，让业务在安全边界内高速奔跑",
    identity: "严谨、规则驱动、善于发现潜在合规风险",
    description: "负责合同审查、合规检查与法务风险评估，目前处于开发中，计划Q2上线。",
    skills: [
      { name: "合同审查", level: 3, category: "核心能力", description: "合同条款风险识别" },
      { name: "合规检查", level: 4, category: "核心能力", description: "业务合规性自动检查" },
    ],
    metrics: { taskCount: 20, adoptionRate: 0.65, accuracyRate: 0.78 },
    version: { version: "V0.5", changelog: "完成基础合同审查能力，合规知识库建设中" },
  },
  {
    id: randomUUID(), name: "AI战略分析师", title: "市场与竞争情报分析师",
    team: "management" as const, status: "active" as const,
    soul: "洞察市场动向，为战略布局提供情报支撑",
    identity: "前瞻性强、善于整合多源信息、提炼战略洞察",
    description: "负责市场趋势分析、竞品情报收集与战略机会识别，每月产出战略情报简报。",
    skills: [
      { name: "市场分析", level: 5, category: "核心能力", description: "多维度市场趋势分析" },
      { name: "竞品研究", level: 4, category: "核心能力", description: "竞品动向追踪与对比" },
      { name: "战略简报", level: 4, category: "输出能力", description: "高质量战略洞察报告" },
    ],
    metrics: { taskCount: 35, adoptionRate: 0.74, accuracyRate: 0.80 },
    version: { version: "V1.3", changelog: "扩展数据源至12个竞品跟踪维度" },
  },
  {
    id: randomUUID(), name: "AI质量官", title: "产品质量管理专家",
    team: "management" as const, status: "active" as const,
    soul: "建立质量防线，让每一个产出都达到可交付标准",
    identity: "高标准、细节驱动、以质量为核心价值的管理专家",
    description: "负责产品与项目的质量管理，制定质量标准、执行质量检查、输出改进建议。",
    skills: [
      { name: "质量标准制定", level: 5, category: "核心能力", description: "行业最佳实践与内部质量基准" },
      { name: "质检执行", level: 5, category: "核心能力", description: "自动化质量检查流程" },
      { name: "改进分析", level: 4, category: "输出能力", description: "质量问题根因分析" },
    ],
    metrics: { taskCount: 180, adoptionRate: 0.71, accuracyRate: 0.89 },
    version: { version: "V2.0", changelog: "建立三层质量防线体系，覆盖设计/开发/交付全链路" },
  },
  {
    id: randomUUID(), name: "AI预算官", title: "财务预算分析专家",
    team: "management" as const, status: "developing" as const,
    soul: "让每一分预算都花在刀刃上，实现ROI最大化",
    identity: "精确计算、成本敏感、善于财务模型建构",
    description: "负责项目预算追踪、成本分析与ROI评估，目前开发中，计划Q3上线。",
    skills: [
      { name: "预算追踪", level: 3, category: "核心能力", description: "项目预算实时监控" },
      { name: "ROI分析", level: 3, category: "核心能力", description: "多维度投资回报分析" },
    ],
    metrics: { taskCount: 15, adoptionRate: 0.60, accuracyRate: 0.75 },
    version: { version: "V0.3", changelog: "基础预算追踪模型完成，ROI分析模板建设中" },
  },
  {
    id: randomUUID(), name: "AI知识官", title: "企业知识库管理专家",
    team: "management" as const, status: "active" as const,
    soul: "让组织知识流动起来，避免经验沉没在个人脑袋里",
    identity: "系统化整理、善于知识结构化、强调知识可复用",
    description: "负责企业知识的采集、整理、标注与检索优化，维护公司知识库体系。",
    skills: [
      { name: "知识采集", level: 4, category: "核心能力", description: "多源知识自动采集与清洗" },
      { name: "知识结构化", level: 5, category: "核心能力", description: "非结构化信息转结构化知识" },
      { name: "知识检索", level: 4, category: "核心能力", description: "语义检索与知识推荐" },
    ],
    metrics: { taskCount: 90, adoptionRate: 0.76, accuracyRate: 0.87 },
    version: { version: "V1.6", changelog: "知识库词条突破5000条，检索准确率提升至87%" },
  },
  {
    id: randomUUID(), name: "AI运营官", title: "业务运营数据分析师",
    team: "management" as const, status: "planned" as const,
    soul: "以数据驱动运营决策，让增长有迹可循",
    identity: "数据导向、善于发现运营异常、以增长为核心目标",
    description: "负责业务运营数据监控、增长分析与运营策略优化，计划Q4上线。",
    skills: [
      { name: "数据监控", level: 2, category: "核心能力", description: "业务核心指标监控" },
      { name: "增长分析", level: 2, category: "核心能力", description: "用户增长与转化分析" },
    ],
    metrics: { taskCount: 5, adoptionRate: 0.55, accuracyRate: 0.70 },
    version: { version: "V0.1", changelog: "需求调研完成，技术方案评估中" },
  },

  // === AI设计师团队 (4人) ===
  {
    id: randomUUID(), name: "AI产品经理", title: "产品需求分析与规划专家",
    team: "design" as const, status: "active" as const,
    soul: "将用户痛点转化为清晰可执行的产品方案",
    identity: "用户视角、逻辑缜密、善于需求挖掘和优先级判断",
    description: "负责需求收集、用户故事编写、PRD文档生成，支持7类业务事务的自动触发，文档采纳率75%。",
    skills: [
      { name: "需求分析", level: 5, category: "核心能力", description: "用户访谈分析与需求结构化" },
      { name: "PRD编写", level: 5, category: "输出能力", description: "标准化产品需求文档生成" },
      { name: "优先级判断", level: 4, category: "核心能力", description: "RICE/MoSCoW框架需求排序" },
    ],
    metrics: { taskCount: 85, adoptionRate: 0.75, accuracyRate: 0.83 },
    version: { version: "V2.3", changelog: "新增7类事务自动触发规则，支持敏捷迭代PRD模板" },
  },
  {
    id: randomUUID(), name: "AI UX设计师", title: "用户体验设计专家",
    team: "design" as const, status: "active" as const,
    soul: "用设计连接用户与产品，让每个交互都有温度",
    identity: "以用户为中心、审美敏锐、善于用可视化传达复杂逻辑",
    description: "负责用户研究、交互设计方案输出与设计系统维护，输出Figma可交付物。",
    skills: [
      { name: "用户研究", level: 4, category: "核心能力", description: "用研方案设计与洞察输出" },
      { name: "交互设计", level: 5, category: "核心能力", description: "线框图、流程图、原型设计" },
      { name: "设计系统", level: 4, category: "核心能力", description: "组件库与设计规范维护" },
    ],
    metrics: { taskCount: 60, adoptionRate: 0.79, accuracyRate: 0.84 },
    version: { version: "V1.7", changelog: "建立品牌设计系统，组件覆盖率达90%" },
  },
  {
    id: randomUUID(), name: "AI架构师", title: "系统架构设计专家",
    team: "design" as const, status: "active" as const,
    soul: "为系统奠定稳固可扩展的技术基础",
    identity: "系统化思维、善于技术选型与架构权衡",
    description: "负责系统架构设计、技术选型评估与架构文档输出，保障系统可扩展性与稳定性。",
    skills: [
      { name: "架构设计", level: 5, category: "核心能力", description: "分布式系统与微服务架构" },
      { name: "技术选型", level: 5, category: "核心能力", description: "技术方案评估与对比" },
      { name: "架构文档", level: 4, category: "输出能力", description: "C4模型架构文档生成" },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.81, accuracyRate: 0.88 },
    version: { version: "V1.4", changelog: "扩展微服务架构模板库至28个场景" },
  },
  {
    id: randomUUID(), name: "AI测试专家", title: "质量保障与自动化测试专家",
    team: "design" as const, status: "active" as const,
    soul: "用系统化测试保障每一次发布的质量",
    identity: "严谨细致、善于发现边界问题、以质量为底线",
    description: "负责测试方案设计、自动化测试用例生成与质量报告输出，覆盖功能/性能/安全多维度。",
    skills: [
      { name: "测试方案设计", level: 5, category: "核心能力", description: "全链路测试策略制定" },
      { name: "自动化测试", level: 4, category: "核心能力", description: "测试用例自动生成与执行" },
      { name: "性能测试", level: 4, category: "核心能力", description: "压测方案与瓶颈分析" },
    ],
    metrics: { taskCount: 110, adoptionRate: 0.77, accuracyRate: 0.92 },
    version: { version: "V2.0", changelog: "自动化测试覆盖率提升至85%，新增安全扫描模块" },
  },

  // === AI生产团队 (10人) ===
  {
    id: randomUUID(), name: "AI编剧", title: "内容脚本创作专家",
    team: "production" as const, status: "active" as const,
    soul: "用故事连接品牌与用户，让每个内容都有灵魂",
    identity: "创意丰富、擅长叙事结构、善于把握受众情感",
    description: "负责品牌内容脚本、营销文案与短视频脚本创作，月均产出剧本50+篇。",
    skills: [
      { name: "脚本创作", level: 5, category: "核心能力", description: "多类型内容脚本创作" },
      { name: "叙事结构", level: 5, category: "核心能力", description: "三幕式与非线性叙事" },
      { name: "营销文案", level: 4, category: "核心能力", description: "品牌传播文案撰写" },
    ],
    metrics: { taskCount: 50, adoptionRate: 0.73, accuracyRate: 0.82 },
    version: { version: "V1.9", changelog: "新增行业垂直脚本模板12套" },
  },
  {
    id: randomUUID(), name: "AI角色设计师", title: "虚拟角色与IP设计专家",
    team: "production" as const, status: "active" as const,
    soul: "赋予角色灵魂，让每个虚拟形象都有生命力",
    identity: "视觉化思维、善于创造有辨识度的角色形象",
    description: "负责虚拟角色的形象设计、性格设定与IP体系建设，累计设计角色200+。",
    skills: [
      { name: "角色形象设计", level: 5, category: "核心能力", description: "角色视觉形象生成" },
      { name: "性格体系", level: 4, category: "核心能力", description: "角色性格与行为逻辑设定" },
      { name: "IP体系", level: 4, category: "核心能力", description: "角色IP延伸设计" },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.76, accuracyRate: 0.85 },
    version: { version: "V1.6", changelog: "优化角色一致性生成，跨场景保持率提升至90%" },
  },
  {
    id: randomUUID(), name: "AI视频制作", title: "AI视频内容生产专家",
    team: "production" as const, status: "active" as const,
    soul: "让每一帧画面都精准传达品牌价值",
    identity: "视觉敏感、节奏感强、善于处理复杂视觉叙事",
    description: "负责短视频内容的AI辅助生产，包括分镜设计、素材调度与后期脚本，月产出视频30+条。",
    skills: [
      { name: "分镜设计", level: 4, category: "核心能力", description: "视频分镜脚本自动生成" },
      { name: "视频剪辑逻辑", level: 4, category: "核心能力", description: "剪辑节奏与转场设计" },
      { name: "素材管理", level: 5, category: "核心能力", description: "素材库智能调度" },
    ],
    metrics: { taskCount: 30, adoptionRate: 0.70, accuracyRate: 0.80 },
    version: { version: "V1.4", changelog: "支持竖屏/横屏双格式自动适配" },
  },
  {
    id: randomUUID(), name: "AI音频专家", title: "音频内容生产与处理专家",
    team: "production" as const, status: "active" as const,
    soul: "让声音成为品牌最有温度的触点",
    identity: "听觉敏感、擅长情绪氛围营造、善于声音品牌化",
    description: "负责品牌音频内容生产，包括配音脚本、音效设计与播客脚本，月产出音频40+条。",
    skills: [
      { name: "配音脚本", level: 5, category: "核心能力", description: "多风格配音文案创作" },
      { name: "音效设计", level: 4, category: "核心能力", description: "品牌声音设计与音效库" },
      { name: "播客策划", level: 4, category: "核心能力", description: "播客选题与脚本规划" },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.72, accuracyRate: 0.83 },
    version: { version: "V1.5", changelog: "新增5种音频风格模板，TTS质量优化" },
  },
  {
    id: randomUUID(), name: "AI质检员", title: "内容质量检查专家",
    team: "production" as const, status: "active" as const,
    soul: "守住内容质量底线，让每个发布都无懈可击",
    identity: "严格标准、细节导向、以规范为准绳",
    description: "负责所有AI生产内容的质量检查，打标准确率86%，实现生产流程的质量闭环。",
    skills: [
      { name: "内容质检", level: 5, category: "核心能力", description: "多维度内容质量评估" },
      { name: "打标分类", level: 5, category: "核心能力", description: "内容标签精准标注" },
      { name: "质量报告", level: 4, category: "输出能力", description: "质检结果可视化报告" },
    ],
    metrics: { taskCount: 420, adoptionRate: 0.86, accuracyRate: 0.86 },
    version: { version: "V2.4", changelog: "打标准确率提升至86%，新增敏感内容过滤模块" },
  },
  {
    id: randomUUID(), name: "AI资源管理", title: "数字资产库管理专家",
    team: "production" as const, status: "active" as const,
    soul: "建立有序可检索的数字资产体系，让资源产生复用价值",
    identity: "系统化管理、善于分类标准化、以资源可复用为目标",
    description: "负责数字资产的入库、分类、标注与检索优化，资源入库成功率92%。",
    skills: [
      { name: "资源入库", level: 5, category: "核心能力", description: "自动化资源采集与入库" },
      { name: "分类标注", level: 5, category: "核心能力", description: "多维度资源分类与标签" },
      { name: "检索优化", level: 4, category: "核心能力", description: "语义检索与推荐算法" },
    ],
    metrics: { taskCount: 300, adoptionRate: 0.82, accuracyRate: 0.92 },
    version: { version: "V2.1", changelog: "资源入库成功率提升至92%，检索响应优化至200ms内" },
  },
  {
    id: randomUUID(), name: "AI数据清洗", title: "训练数据处理专家",
    team: "production" as const, status: "active" as const,
    soul: "高质量数据是AI能力的根基，让每一条训练数据都有价值",
    identity: "精确、标准化、善于识别数据噪声",
    description: "负责AI训练数据的采集、清洗、格式化与质量验证，月处理数据量10万+条。",
    skills: [
      { name: "数据采集", level: 4, category: "核心能力", description: "多源数据自动采集" },
      { name: "数据清洗", level: 5, category: "核心能力", description: "噪声过滤与格式标准化" },
      { name: "质量验证", level: 4, category: "核心能力", description: "数据质量多维度评估" },
    ],
    metrics: { taskCount: 250, adoptionRate: 0.79, accuracyRate: 0.94 },
    version: { version: "V1.8", changelog: "清洗准确率提升至94%，支持15种数据格式" },
  },
  {
    id: randomUUID(), name: "AI内容分发", title: "内容发布与渠道管理专家",
    team: "production" as const, status: "developing" as const,
    soul: "让优质内容精准触达目标受众，实现传播价值最大化",
    identity: "渠道敏感、数据导向、善于内容与平台匹配",
    description: "负责内容跨平台发布策略与自动化分发，目前开发中，计划Q2上线。",
    skills: [
      { name: "渠道策略", level: 3, category: "核心能力", description: "多平台内容分发策略" },
      { name: "发布自动化", level: 3, category: "核心能力", description: "定时发布与平台API对接" },
    ],
    metrics: { taskCount: 25, adoptionRate: 0.65, accuracyRate: 0.75 },
    version: { version: "V0.6", changelog: "完成主流平台API对接，发布工作流设计中" },
  },
  {
    id: randomUUID(), name: "AI效果分析", title: "内容效果数据分析师",
    team: "production" as const, status: "planned" as const,
    soul: "用数据揭示什么内容真正有效，让创作有据可依",
    identity: "数据导向、善于发现内容传播规律",
    description: "负责内容效果的数据追踪与分析，计划Q3上线。",
    skills: [
      { name: "效果追踪", level: 2, category: "核心能力", description: "内容传播数据收集" },
      { name: "归因分析", level: 2, category: "核心能力", description: "内容效果归因模型" },
    ],
    metrics: { taskCount: 8, adoptionRate: 0.55, accuracyRate: 0.68 },
    version: { version: "V0.1", changelog: "需求分析完成，数据指标体系设计中" },
  },
  {
    id: randomUUID(), name: "AI本地化", title: "内容本地化与多语言专家",
    team: "production" as const, status: "planned" as const,
    soul: "消除语言壁垒，让内容在全球范围内自然流动",
    identity: "语言敏感、跨文化理解、善于保留内容灵魂的同时适应本地语境",
    description: "负责内容多语言翻译与本地化适配，计划Q4上线。",
    skills: [
      { name: "多语言翻译", level: 2, category: "核心能力", description: "高质量AI辅助翻译" },
      { name: "文化适配", level: 2, category: "核心能力", description: "跨文化内容本地化" },
    ],
    metrics: { taskCount: 5, adoptionRate: 0.50, accuracyRate: 0.65 },
    version: { version: "V0.1", changelog: "支持语言范围评估中，翻译质量基准测试进行中" },
  },
];

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(versionLogs);
  await db.delete(metrics);
  await db.delete(skills);
  await db.delete(employees);

  for (const emp of SEED_EMPLOYEES) {
    const employeeId = emp.id;
    const ts = new Date();

    // Insert employee
    await db.insert(employees).values({
      id: employeeId,
      name: emp.name,
      avatar: null,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      soul: emp.soul,
      identity: emp.identity,
      description: emp.description,
      createdAt: ts,
      updatedAt: ts,
    });

    // Insert skills
    for (const skill of emp.skills) {
      await db.insert(skills).values({
        id: randomUUID(),
        employeeId,
        name: skill.name,
        level: skill.level,
        category: skill.category,
        description: skill.description,
      });
    }

    // Insert 6 months of metrics
    const monthlyMetrics = genMetrics(
      employeeId,
      emp.metrics.taskCount,
      emp.metrics.adoptionRate,
      emp.metrics.accuracyRate
    );
    for (const m of monthlyMetrics) {
      await db.insert(metrics).values(m);
    }

    // Insert version log
    await db.insert(versionLogs).values({
      id: randomUUID(),
      employeeId,
      version: emp.version.version,
      date: "2026-04-01",
      changelog: emp.version.changelog,
      capabilities: null,
    });
  }

  console.log(`Seeded ${SEED_EMPLOYEES.length} employees.`);
}

seed().catch(console.error);
```

- [ ] **Step 2: Run the seeder**

```bash
npm run db:seed
```

Expected output:
```
Seeding database...
Seeded 24 employees.
```

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add mock data seeder for 24 AI employees"
```

---

### Task 5: API Routes — Employees

**Files:**
- Create: `src/app/api/employees/route.ts`
- Create: `src/app/api/employees/[id]/route.ts`

- [ ] **Step 1: Write GET /api/employees and POST /api/employees**

Create `src/app/api/employees/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, metrics } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  const status = searchParams.get("status");

  const rows = await db.query.employees.findMany({
    where: (e, { and, eq: eqFn }) => {
      const conditions = [];
      if (team) conditions.push(eqFn(e.team, team as "management" | "design" | "production"));
      if (status) conditions.push(eqFn(e.status, status as "active" | "developing" | "planned"));
      return conditions.length > 0 ? and(...conditions) : undefined;
    },
    orderBy: (e, { asc }) => [asc(e.team), asc(e.name)],
  });

  // Get latest monthly metric per employee
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const metricRows = await db
    .select()
    .from(metrics)
    .where(eq(metrics.period, currentMonth));

  const metricMap = new Map(metricRows.map((m) => [m.employeeId, m]));

  const result = rows.map((emp) => {
    const m = metricMap.get(emp.id);
    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      monthlyTaskCount: m?.taskCount ?? 0,
      adoptionRate: m?.adoptionRate ?? null,
      accuracyRate: m?.accuracyRate ?? null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date();
  const id = randomUUID();

  await db.insert(employees).values({
    id,
    name: body.name,
    avatar: body.avatar ?? null,
    title: body.title,
    team: body.team,
    status: body.status ?? "planned",
    soul: body.soul ?? null,
    identity: body.identity ?? null,
    description: body.description ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Write GET/PUT/DELETE /api/employees/:id**

Create `src/app/api/employees/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, skills, metrics, versionLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const emp = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, params.id),
  });

  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [empSkills, empMetrics, empVersionLogs] = await Promise.all([
    db.select().from(skills).where(eq(skills.employeeId, params.id)),
    db.select().from(metrics).where(eq(metrics.employeeId, params.id)),
    db.select().from(versionLogs).where(eq(versionLogs.employeeId, params.id)),
  ]);

  return NextResponse.json({
    ...emp,
    skills: empSkills,
    metrics: empMetrics,
    versionLogs: empVersionLogs,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const now = new Date();

  await db
    .update(employees)
    .set({
      name: body.name,
      avatar: body.avatar,
      title: body.title,
      team: body.team,
      status: body.status,
      soul: body.soul,
      identity: body.identity,
      description: body.description,
      updatedAt: now,
    })
    .where(eq(employees.id, params.id));

  const updated = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, params.id),
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await db.delete(employees).where(eq(employees.id, params.id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Test the API manually**

Start dev server:
```bash
npm run dev
```

Then test:
```bash
curl http://localhost:3000/api/employees | head -c 500
```

Expected: JSON array of 24 employee objects with `id`, `name`, `team`, `status`, `monthlyTaskCount`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add REST API routes for employees CRUD"
```

---

### Task 6: Root Layout & Sidebar Navigation

**Files:**
- Create: `src/components/nav/sidebar.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Install additional shadcn components**

```bash
npx shadcn@latest add separator tooltip
```

- [ ] **Step 2: Write the sidebar component**

Create `src/components/nav/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Cpu,
  GitBranch,
  Settings,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/dashboard", label: "驾驶舱", icon: LayoutDashboard },
  { href: "/roster", label: "AI花名册", icon: Users },
  { href: "/production", label: "生产看板", icon: Cpu },
  { href: "/org", label: "组织架构", icon: GitBranch },
  { href: "/settings", label: "系统设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-screen w-16 flex-col items-center border-r border-border bg-card py-4 gap-2">
        {/* Logo */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
          <Zap className="h-5 w-5 text-primary" />
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 3: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/nav/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Workforce Platform",
  description: "AI员工管理与价值展示平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Update root page redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/roster");
}
```

- [ ] **Step 5: Create placeholder pages so nav doesn't 404**

Create `src/app/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return <div className="p-8 text-muted-foreground">驾驶舱 — Phase 2 实现</div>;
}
```

Create `src/app/production/page.tsx`:
```tsx
export default function ProductionPage() {
  return <div className="p-8 text-muted-foreground">生产看板 — Phase 3 实现</div>;
}
```

Create `src/app/org/page.tsx`:
```tsx
export default function OrgPage() {
  return <div className="p-8 text-muted-foreground">组织架构 — Phase 3 实现</div>;
}
```

Create `src/app/settings/page.tsx`:
```tsx
export default function SettingsPage() {
  return <div className="p-8 text-muted-foreground">系统设置 — Phase 3 实现</div>;
}
```

- [ ] **Step 6: Verify navigation renders**

With dev server running, open `http://localhost:3000` — should redirect to `/roster` and show sidebar with 5 icons.

- [ ] **Step 7: Commit**

```bash
git add src/app/ src/components/nav/
git commit -m "feat: add sidebar navigation and root layout"
```

---

### Task 7: Roster List Page

**Files:**
- Create: `src/components/roster/employee-card.tsx`
- Create: `src/components/roster/employee-grid.tsx`
- Create: `src/app/roster/page.tsx`

- [ ] **Step 1: Write EmployeeCard component**

Create `src/components/roster/employee-card.tsx`:

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EmployeeListItem } from "@/lib/types";

const STATUS_CONFIG = {
  active: { label: "在岗", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  developing: { label: "开发中", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  planned: { label: "规划中", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const TEAM_LABEL = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
};

interface EmployeeCardProps {
  employee: EmployeeListItem;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const status = STATUS_CONFIG[employee.status];

  return (
    <Link href={`/roster/${employee.id}`}>
      <Card className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 flex-shrink-0">
              {employee.name.slice(2, 3)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{employee.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{employee.title}</p>
            </div>
          </div>

          {/* Status + Team */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{TEAM_LABEL[employee.team]}</span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-primary tabular-nums">{employee.monthlyTaskCount}</p>
              <p className="text-xs text-muted-foreground">本月任务</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {employee.adoptionRate != null ? `${Math.round(employee.adoptionRate * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">采纳率</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {employee.accuracyRate != null ? `${Math.round(employee.accuracyRate * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">准确率</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Write EmployeeGrid client component**

Create `src/components/roster/employee-grid.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeCard } from "./employee-card";
import type { EmployeeListItem, TeamType } from "@/lib/types";
import { Search } from "lucide-react";

interface EmployeeGridProps {
  employees: EmployeeListItem[];
}

const TABS = [
  { value: "all", label: "全部" },
  { value: "management", label: "管理团队" },
  { value: "design", label: "设计师团队" },
  { value: "production", label: "生产团队" },
];

export function EmployeeGrid({ employees }: EmployeeGridProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchTeam = activeTab === "all" || emp.team === activeTab;
      const matchSearch =
        !search ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.title.toLowerCase().includes(search.toLowerCase());
      return matchTeam && matchSearch;
    });
  }, [employees, activeTab, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索员工..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <p className="text-sm text-muted-foreground ml-auto">
          共 {filtered.length} 名员工
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write roster page (server component)**

Create `src/app/roster/page.tsx`:

```tsx
import { EmployeeGrid } from "@/components/roster/employee-grid";
import type { EmployeeListItem } from "@/lib/types";

async function getEmployees(): Promise<EmployeeListItem[]> {
  const res = await fetch("http://localhost:3000/api/employees", {
    cache: "no-store",
  });
  return res.json();
}

export default async function RosterPage() {
  const employees = await getEmployees();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">AI 员工花名册</h1>
        <p className="text-muted-foreground mt-1">
          共 {employees.length} 名 AI 员工，{employees.filter((e) => e.status === "active").length} 名在岗运行
        </p>
      </div>
      <EmployeeGrid employees={employees} />
    </div>
  );
}
```

- [ ] **Step 4: Verify the roster page**

With dev server running, open `http://localhost:3000/roster` — should show a grid of 24 employee cards with tabs and search.

- [ ] **Step 5: Commit**

```bash
git add src/components/roster/employee-card.tsx src/components/roster/employee-grid.tsx src/app/roster/page.tsx
git commit -m "feat: add AI roster list page with search and tab filters"
```

---

### Task 8: Employee Detail Page (4 Tabs)

**Files:**
- Create: `src/components/roster/tabs/profile-tab.tsx`
- Create: `src/components/roster/tabs/skills-tab.tsx`
- Create: `src/components/roster/tabs/metrics-tab.tsx`
- Create: `src/components/roster/tabs/version-tab.tsx`
- Create: `src/components/roster/employee-detail.tsx`
- Create: `src/app/roster/[id]/page.tsx`

- [ ] **Step 1: Write ProfileTab**

Create `src/components/roster/tabs/profile-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Employee } from "@/lib/types";
import { Pencil, Check, X } from "lucide-react";

const STATUS_CONFIG = {
  active: { label: "在岗", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  developing: { label: "开发中", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  planned: { label: "规划中", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

interface ProfileTabProps {
  employee: Employee;
  onSave: (updates: Partial<Employee>) => Promise<void>;
}

export function ProfileTab({ employee, onSave }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    soul: employee.soul ?? "",
    identity: employee.identity ?? "",
    description: employee.description ?? "",
    title: employee.title,
  });

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-3xl border border-primary/20">
          {employee.name.slice(2, 3)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">{employee.name}</h2>
            <Badge variant="outline" className={STATUS_CONFIG[employee.status].className}>
              {STATUS_CONFIG[employee.status].label}
            </Badge>
          </div>
          {editing ? (
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="max-w-xs"
            />
          ) : (
            <p className="text-muted-foreground">{employee.title}</p>
          )}
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Check className="h-4 w-4 mr-1" />保存</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />编辑
          </Button>
        )}
      </div>

      {/* Soul */}
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Soul · 使命</Label>
        {editing ? (
          <Textarea
            value={form.soul}
            onChange={(e) => setForm({ ...form, soul: e.target.value })}
            rows={2}
          />
        ) : (
          <p className="text-sm text-foreground bg-primary/5 rounded-lg p-3 border border-primary/10">
            {employee.soul ?? <span className="text-muted-foreground">未填写</span>}
          </p>
        )}
      </div>

      {/* Identity */}
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Identity · 角色定位</Label>
        {editing ? (
          <Textarea
            value={form.identity}
            onChange={(e) => setForm({ ...form, identity: e.target.value })}
            rows={2}
          />
        ) : (
          <p className="text-sm text-foreground">{employee.identity ?? <span className="text-muted-foreground">未填写</span>}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">个人简介</Label>
        {editing ? (
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {employee.description ?? "未填写"}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write SkillsTab**

Create `src/components/roster/tabs/skills-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Skill } from "@/lib/types";
import { Star } from "lucide-react";

interface SkillsTabProps {
  skills: Skill[];
}

function StarRating({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < level ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function SkillsTab({ skills }: SkillsTabProps) {
  const categories = [...new Set(skills.map((s) => s.category).filter(Boolean))];

  return (
    <div className="space-y-6 max-w-2xl">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{cat}</h3>
          <div className="space-y-2">
            {skills
              .filter((s) => s.category === cat)
              .map((skill) => (
                <Card key={skill.id} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{skill.name}</span>
                        </div>
                        {skill.description && (
                          <p className="text-xs text-muted-foreground">{skill.description}</p>
                        )}
                      </div>
                      <StarRating level={skill.level} />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}

      {skills.filter((s) => !s.category).length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">其他</h3>
          <div className="space-y-2">
            {skills
              .filter((s) => !s.category)
              .map((skill) => (
                <Card key={skill.id} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-medium text-sm">{skill.name}</span>
                      <StarRating level={skill.level} />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write MetricsTab (stub)**

Create `src/components/roster/tabs/metrics-tab.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { Metric } from "@/lib/types";

interface MetricsTabProps {
  metrics: Metric[];
}

export function MetricsTab({ metrics }: MetricsTabProps) {
  const latest = metrics
    .filter((m) => m.periodType === "monthly")
    .sort((a, b) => b.period.localeCompare(a.period))[0];

  return (
    <div className="space-y-6 max-w-2xl">
      {latest && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary tabular-nums">{latest.taskCount}</p>
              <p className="text-xs text-muted-foreground mt-1">任务完成量</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {latest.adoptionRate != null ? `${Math.round(latest.adoptionRate * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">采纳率</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {latest.accuracyRate != null ? `${Math.round(latest.accuracyRate * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">准确率</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {latest.humanTimeSaved != null ? `${latest.humanTimeSaved}h` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">节省人力</p>
            </CardContent>
          </Card>
        </div>
      )}
      <p className="text-sm text-muted-foreground">趋势图表将在 Phase 2 实现</p>
    </div>
  );
}
```

- [ ] **Step 4: Write VersionTab**

Create `src/components/roster/tabs/version-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { VersionLog } from "@/lib/types";
import { Plus, GitCommit } from "lucide-react";

interface VersionTabProps {
  versionLogs: VersionLog[];
  employeeId: string;
  onAdd: (log: Omit<VersionLog, "id" | "employeeId">) => Promise<void>;
}

export function VersionTab({ versionLogs, employeeId, onAdd }: VersionTabProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ version: "", date: "", changelog: "" });

  const sorted = [...versionLogs].sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = async () => {
    await onAdd({ version: form.version, date: form.date, changelog: form.changelog, capabilities: null });
    setForm({ version: "", date: "", changelog: "" });
    setAdding(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">成长日志</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4 mr-1" />新增版本
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-border p-4 space-y-3 bg-card/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">版本号</Label>
              <Input placeholder="如 V2.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">日期</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">更新内容</Label>
            <Textarea placeholder="描述这个版本的能力变化..." value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} rows={3} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>保存</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>取消</Button>
          </div>
        </div>
      )}

      <div className="relative pl-6">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-6">
          {sorted.map((log) => (
            <div key={log.id} className="relative">
              <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-bold text-primary">{log.version}</span>
                <span className="text-xs text-muted-foreground">{log.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{log.changelog}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write EmployeeDetail shell component**

Create `src/components/roster/employee-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "./tabs/profile-tab";
import { SkillsTab } from "./tabs/skills-tab";
import { MetricsTab } from "./tabs/metrics-tab";
import { VersionTab } from "./tabs/version-tab";
import type { Employee, VersionLog } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmployeeDetailProps {
  employee: Employee;
}

export function EmployeeDetail({ employee: initialEmployee }: EmployeeDetailProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState(initialEmployee);

  const handleSaveProfile = async (updates: Partial<Employee>) => {
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...employee, ...updates }),
    });
    const updated = await res.json();
    setEmployee((prev) => ({ ...prev, ...updated }));
  };

  const handleAddVersionLog = async (log: Omit<VersionLog, "id" | "employeeId">) => {
    const res = await fetch(`/api/employees/${employee.id}/version-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    const newLog = await res.json();
    setEmployee((prev) => ({
      ...prev,
      versionLogs: [...(prev.versionLogs ?? []), newLog],
    }));
  };

  return (
    <div className="p-8">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/roster">
          <ArrowLeft className="h-4 w-4 mr-1" />返回花名册
        </Link>
      </Button>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="skills">技能</TabsTrigger>
          <TabsTrigger value="metrics">数据</TabsTrigger>
          <TabsTrigger value="version">成长日志</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab employee={employee} onSave={handleSaveProfile} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTab skills={employee.skills ?? []} />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsTab metrics={employee.metrics ?? []} />
        </TabsContent>

        <TabsContent value="version">
          <VersionTab
            versionLogs={employee.versionLogs ?? []}
            employeeId={employee.id}
            onAdd={handleAddVersionLog}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 6: Write version-logs API route**

Create `src/app/api/employees/[id]/version-logs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { versionLogs } from "@/db/schema";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const id = randomUUID();

  await db.insert(versionLogs).values({
    id,
    employeeId: params.id,
    version: body.version,
    date: body.date,
    changelog: body.changelog,
    capabilities: body.capabilities ?? null,
  });

  const created = { id, employeeId: params.id, ...body };
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 7: Write employee detail page**

Create `src/app/roster/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { EmployeeDetail } from "@/components/roster/employee-detail";
import type { Employee } from "@/lib/types";

async function getEmployee(id: string): Promise<Employee | null> {
  const res = await fetch(`http://localhost:3000/api/employees/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.error) return null;
  return data;
}

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const employee = await getEmployee(params.id);
  if (!employee) notFound();
  return <EmployeeDetail employee={employee} />;
}
```

- [ ] **Step 8: Verify detail page**

With dev server running, click any employee card in `/roster` — should navigate to detail page with 4 tabs. Profile tab should show editable fields. Version log tab should allow adding new entries.

- [ ] **Step 9: Commit**

```bash
git add src/components/roster/ src/app/roster/ src/app/api/employees/
git commit -m "feat: add employee detail page with 4 tabs (profile, skills, metrics, version log)"
```

---

### Task 9: Phase 1 Final Check

- [ ] **Step 1: Run full app end-to-end**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Verify all routes work**

Start prod server:
```bash
npm run start
```

Check each route:
- `http://localhost:3000` → redirects to `/roster`
- `http://localhost:3000/roster` → shows 24 employee cards with search/filter
- `http://localhost:3000/roster/<any-id>` → shows detail with 4 tabs
- `/dashboard`, `/production`, `/org`, `/settings` → show placeholder text

- [ ] **Step 3: Final commit and tag**

```bash
git add .
git commit -m "chore: phase 1 complete — foundation, roster, and API"
git tag phase-1-complete
```
