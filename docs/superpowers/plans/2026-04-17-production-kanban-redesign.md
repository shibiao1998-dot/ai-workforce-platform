# 生产看板重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/production` page from a simple card grid + history table into a dashboard with stat cards, tabbed layout (realtime kanban / data dashboard / history), SOP step visualization, task detail modal with quality metrics, output preview, execution reflection, and ECharts data panels.

**Architecture:** Server component page fetches initial data, passes to client components. Three tabs controlled by client-side state. Task detail opens as a centered Dialog modal (shared by running cards and history table rows). New `task_steps` table for SOP steps. Extended `tasks` table with quality/reflection fields. New `/api/tasks/stats` endpoint for dashboard charts. ECharts via `echarts-for-react`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, @base-ui/react (Dialog, Tabs), ECharts, Drizzle ORM + better-sqlite3.

**Spec:** `docs/superpowers/specs/2026-04-17-production-kanban-redesign.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/production/time-range-selector.tsx` | Time range selector + page client wrapper (today/7d/30d) |
| `src/components/production/production-stats.tsx` | Stat card row (today tasks, completion rate, running, avg quality) |
| `src/components/production/production-tabs.tsx` | Tab container for realtime/dashboard/history |
| `src/components/production/running-task-card.tsx` | Single running task card with mini SOP stepper |
| `src/components/production/task-detail-dialog.tsx` | Task detail modal with metrics + tabs |
| `src/components/production/steps-stepper.tsx` | Vertical SOP step timeline |
| `src/components/production/outputs-list.tsx` | Task output list with preview/download |
| `src/components/production/output-preview-dialog.tsx` | Nested preview dialog for outputs |
| `src/components/production/reflection-panel.tsx` | Execution reflection cards (problems/lessons/improvements) |
| `src/components/production/production-dashboard.tsx` | ECharts dashboard container with linked state |
| `src/components/production/charts/trend-chart.tsx` | Stacked bar chart (daily trend by team) |
| `src/components/production/charts/type-distribution-chart.tsx` | Donut pie chart (task type distribution) |
| `src/components/production/charts/quality-gauge.tsx` | Gauge chart (avg quality score) |
| `src/components/production/charts/employee-ranking-chart.tsx` | Horizontal bar chart (employee top 10) |
| `src/app/api/tasks/stats/route.ts` | Stats API endpoint for dashboard |

### Modified Files
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `taskSteps` table, add 4 columns to `tasks` |
| `src/lib/types.ts` | Add `TaskStep` interface, `TaskStepStatus` type, extend `Task` |
| `src/db/seed.ts` | Add task_steps seed, tasks extended fields, more task_outputs |
| `src/app/production/page.tsx` | Restructure with stat row + tabs layout |
| `src/components/production/running-tasks-panel.tsx` | Refactor to use `RunningTaskCard`, add click-to-modal |
| `src/components/production/task-history-table.tsx` | Row click opens modal, add quality column |
| `src/app/api/tasks/route.ts` | Add new fields + dateStart/dateEnd/employeeId params |
| `src/app/api/tasks/[taskId]/route.ts` | Return steps + new fields |

---

## Phase 1: Database & Types (Tasks 1-3)

### Task 1: Add `taskSteps` table to schema

**Files:**
- Modify: `src/db/schema.ts:65` (after tasks table, before taskOutputs)

- [ ] **Step 1: Add taskSteps table definition**

Add after the `tasks` table (line 65) and before `taskOutputs` (line 67):

```typescript
export const taskSteps = sqliteTable("task_steps", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed", "skipped"] }).notNull().default("pending"),
  thought: text("thought"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
```

- [ ] **Step 2: Add 4 new columns to tasks table**

Extend the `tasks` table definition (line 52-65). Add before the closing `});`:

```typescript
  qualityScore: integer("quality_score"),
  retryCount: integer("retry_count").default(0),
  tokenUsage: integer("token_usage"),
  reflection: text("reflection"),
```

- [ ] **Step 3: Add taskSteps to seed.ts import**

In `src/db/seed.ts` line 2, add `taskSteps` to the import:

```typescript
import { employees, skills, skillMetrics, metrics, versionLogs, tasks, taskOutputs, taskSteps, metricConfigs } from "./schema";
```

- [ ] **Step 4: Push schema changes**

Run: `cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run db:push`
Expected: Schema changes applied successfully.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/seed.ts
git commit -m "feat(db): add task_steps table and extend tasks with quality/reflection fields"
```

---

### Task 2: Add TypeScript types

**Files:**
- Modify: `src/lib/types.ts:4-5` (after existing type aliases)
- Modify: `src/lib/types.ts:60-73` (extend Task interface)

- [ ] **Step 1: Add TaskStepStatus type and TaskStep interface**

After line 5 (`OutputType`), add:

```typescript
export type TaskStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface TaskStep {
  id: string;
  taskId: string;
  stepOrder: number;
  name: string;
  status: TaskStepStatus;
  thought: string | null;
  startedAt: string | null;
  completedAt: string | null;
}
```

- [ ] **Step 2: Extend Task interface with new fields**

Add to the `Task` interface (after `metadata` field, before closing `}`):

```typescript
  qualityScore: number | null;
  retryCount: number | null;
  tokenUsage: number | null;
  reflection: string | null;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add TaskStep interface and extend Task with quality fields"
```

---

### Task 3: Extend seed data with task_steps, quality fields, and more outputs

**Files:**
- Modify: `src/db/seed.ts`

- [ ] **Step 1: Add SOP step templates by task type**

Add after the `TASK_TYPES` constant (around line 516):

```typescript
const STEP_TEMPLATES: Record<string, string[]> = {
  "项目审计": ["数据采集", "指标分析", "风险评估", "审计报告生成", "审核校验"],
  "绩效评估": ["数据收集", "指标计算", "综合评分", "报告生成", "审核校验"],
  "版本管理": ["版本规划", "进度追踪", "验收检查", "版本发布"],
  "生产管理": ["需求分析", "资源调度", "进度监控", "质量验收"],
  "业务分析": ["数据提取", "多维分析", "趋势研判", "报告输出"],
  "人员盘点": ["数据采集", "人员筛选", "风险预判", "报告生成"],
  "激励申报": ["行为识别", "方案设计", "审批流程", "公示输出"],
  "战略规划": ["调研分析", "战略研判", "路径设计", "文档输出"],
  "需求文档": ["需求收集", "结构化分析", "文档编写", "评审校验"],
  "软件设计": ["需求理解", "架构设计", "文档编写", "方案评审"],
  "产品方案": ["需求分析", "方案设计", "文档输出", "评审反馈"],
  "需求确认": ["需求接收", "结构化分析", "方案匹配", "确认输出"],
  "生产评审": ["预算检查", "可行性评估", "建议输出"],
  "质量检查": ["标准匹配", "自动打标", "质检报告"],
  "资源入库": ["格式解析", "分类入库", "质量校验", "入库报告"],
  "剧本创作": ["主题分析", "大纲生成", "场景描写", "对白编写", "文档输出"],
  "角色设计": ["角色解析", "风格匹配", "定妆照生成", "设定文档"],
  "图像生成": ["需求解析", "素材匹配", "图像生成", "质量检查"],
  "音频制作": ["文本解析", "音色匹配", "语音合成", "BGM匹配", "音频输出"],
  "字幕制作": ["文本提取", "时间线同步", "排版设计", "效果渲染", "文件输出"],
};

const COT_THOUGHTS = [
  "需要综合考虑多个维度的数据指标，采用加权平均来提升评估准确性。",
  "发现部分历史数据存在缺失，需要先进行数据补全再进行分析。",
  "当前方案的执行效率可以通过并行处理来进一步优化。",
  "对比了三种算法方案，最终选择了准确率最高的方案 B。",
  "注意到上游数据格式有变更，需要适配新的解析逻辑。",
  "检测到异常数据点，已自动标记并排除在统计范围外。",
  "参考了历史任务的执行经验，调整了参数阈值。",
  "需要额外校验数据的一致性，确保输出结果的可靠性。",
];

const REFLECTION_TEMPLATES = [
  { problems: "部分数据源存在延迟，导致实时性不够理想。", lessons: "应提前检查数据源的可用性和响应时间。", improvements: "建议增加数据源健康检查机制，对延迟数据进行标注。" },
  { problems: "初始方案中未考虑到极端情况的处理。", lessons: "边界条件需要在设计阶段就充分考虑。", improvements: "1. 增加异常值检测\n2. 建立降级处理策略\n3. 添加详细的错误日志。" },
  { problems: "执行过程中发现历史数据格式不统一。", lessons: "数据标准化应前置到流程的第一步。", improvements: "建议建立统一的数据格式规范，并在入口处进行格式校验。" },
  { problems: "多步骤串行执行耗时较长。", lessons: "部分步骤存在并行化的可能性。", improvements: "1. 识别可并行的步骤\n2. 引入异步处理机制\n3. 优化资源调度策略。" },
];

const OUTPUT_TITLES: Record<string, string[]> = {
  document: ["需求分析报告", "评估报告 v1.0", "设计文档", "分析摘要", "调研报告"],
  report: ["数据汇总表", "统计分析表", "绩效评分表", "趋势分析图表"],
  resource: ["素材包", "模板文件", "配置文件"],
  media: ["演示视频", "效果预览", "音频成品"],
  other: ["备注文档", "参考资料"],
};
```

- [ ] **Step 2: Add helper to generate steps for a task**

Add before the `seed()` function:

```typescript
function generateSteps(taskId: string, taskType: string, taskStatus: "running" | "completed" | "failed") {
  const templateKey = Object.keys(STEP_TEMPLATES).find(k => taskType.includes(k)) ?? Object.keys(STEP_TEMPLATES)[0];
  const stepNames = STEP_TEMPLATES[templateKey];
  const steps = [];

  for (let i = 0; i < stepNames.length; i++) {
    const stepId = randomUUID();
    let status: "pending" | "running" | "completed" | "failed" | "skipped" = "pending";
    let thought: string | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;

    if (taskStatus === "completed") {
      status = "completed";
      startedAt = new Date(Date.now() - (stepNames.length - i) * 180000);
      completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
      if (Math.random() > 0.4) thought = COT_THOUGHTS[Math.floor(Math.random() * COT_THOUGHTS.length)];
    } else if (taskStatus === "running") {
      const runningIdx = Math.floor(Math.random() * (stepNames.length - 1)) + 1;
      if (i < runningIdx) {
        status = "completed";
        startedAt = new Date(Date.now() - (runningIdx - i) * 180000);
        completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
        if (Math.random() > 0.5) thought = COT_THOUGHTS[Math.floor(Math.random() * COT_THOUGHTS.length)];
      } else if (i === runningIdx) {
        status = "running";
        startedAt = new Date(Date.now() - Math.random() * 120000);
      }
    } else if (taskStatus === "failed") {
      const failIdx = Math.floor(Math.random() * (stepNames.length - 1)) + 1;
      if (i < failIdx) {
        status = "completed";
        startedAt = new Date(Date.now() - (failIdx - i) * 180000);
        completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
      } else if (i === failIdx) {
        status = "failed";
        startedAt = new Date(Date.now() - 60000);
      } else {
        status = "skipped";
      }
    }

    steps.push({ id: stepId, taskId, stepOrder: i + 1, name: stepNames[i], status, thought, startedAt, completedAt });
  }
  return steps;
}

function generateOutputs(taskId: string, count: number) {
  const types: Array<"document" | "resource" | "report" | "media" | "other"> = ["document", "document", "report", "report", "resource", "media", "other"];
  const outputs = [];
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const titles = OUTPUT_TITLES[type];
    outputs.push({
      id: randomUUID(),
      taskId,
      type,
      title: titles[Math.floor(Math.random() * titles.length)],
      content: type === "document" || type === "report" ? "这是一份自动生成的模拟内容。该文档包含了任务执行过程中产生的分析数据、关键发现和建议措施。内容经过AI审核，确保数据准确性和逻辑完整性。" : null,
      url: type === "media" || type === "resource" ? `/outputs/${randomUUID().slice(0, 8)}.${type === "media" ? "mp4" : "zip"}` : null,
      createdAt: new Date(Date.now() - Math.random() * 86400000),
    });
  }
  return outputs;
}
```

- [ ] **Step 3: Modify the running tasks seed loop to use new fields + steps**

Replace the running tasks loop (lines 523-539 approximately) with:

```typescript
    // 2 running tasks per active employee
    for (let i = 0; i < 2; i++) {
      const taskId = randomUUID();
      const started = new Date(Date.now() - Math.random() * 3600000);
      await db.insert(tasks).values({
        id: taskId,
        employeeId: emp.id,
        team: emp.team,
        name: `${types[i % types.length]} #${Math.floor(Math.random() * 900) + 100}`,
        type: types[i % types.length],
        status: "running",
        progress: Math.floor(Math.random() * 80) + 10,
        currentStep: "AI正在处理中...",
        startTime: started,
        estimatedEndTime: new Date(started.getTime() + 1800000),
        actualEndTime: null,
        metadata: null,
        qualityScore: null,
        retryCount: 0,
        tokenUsage: Math.floor(1000 + Math.random() * 5000),
        reflection: null,
      });

      const steps = generateSteps(taskId, types[i % types.length], "running");
      for (const step of steps) {
        await db.insert(taskSteps).values(step);
      }
    }
```

- [ ] **Step 4: Modify the completed tasks seed loop to use new fields + steps + outputs**

Replace the completed tasks loop (lines 542-562 approximately) with:

```typescript
    // 10 completed tasks per active employee
    for (let i = 0; i < 10; i++) {
      const taskId = randomUUID();
      const daysAgo = Math.floor(Math.random() * 30);
      const started = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 3600000);
      const duration = 600000 + Math.random() * 3600000;
      const hasReflection = Math.random() < 0.3;
      const reflectionData = hasReflection ? REFLECTION_TEMPLATES[Math.floor(Math.random() * REFLECTION_TEMPLATES.length)] : null;

      await db.insert(tasks).values({
        id: taskId,
        employeeId: emp.id,
        team: emp.team,
        name: `${types[i % types.length]} #${Math.floor(Math.random() * 900) + 100}`,
        type: types[i % types.length],
        status: "completed",
        progress: 100,
        currentStep: "已完成",
        startTime: started,
        estimatedEndTime: new Date(started.getTime() + duration),
        actualEndTime: new Date(started.getTime() + duration),
        metadata: null,
        qualityScore: 70 + Math.floor(Math.random() * 28),
        retryCount: Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 3),
        tokenUsage: Math.floor(1000 + Math.random() * 7000),
        reflection: reflectionData ? JSON.stringify(reflectionData) : null,
      });

      const steps = generateSteps(taskId, types[i % types.length], "completed");
      for (const step of steps) {
        await db.insert(taskSteps).values(step);
      }

      const outputCount = 1 + Math.floor(Math.random() * 3);
      const outputs = generateOutputs(taskId, outputCount);
      for (const output of outputs) {
        await db.insert(taskOutputs).values(output);
      }
    }
```

- [ ] **Step 5: Add taskSteps deletion to the clear block**

In the seed function, add `await db.delete(taskSteps);` before `await db.delete(tasks);` (around line 439):

```typescript
  await db.delete(taskSteps);
  await db.delete(taskOutputs);
  await db.delete(tasks);
```

- [ ] **Step 6: Run seed and verify**

Run: `cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run db:seed`
Expected: Seed completes without errors, prints employee and task counts.

- [ ] **Step 7: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add task_steps, quality metrics, reflection, and output seed data"
```

---

## Phase 2: API Extensions (Tasks 4-6)

### Task 4: Extend tasks list API

**Files:**
- Modify: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Add new query params and response fields**

Replace the entire file content with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "running" | "completed" | "failed" | null;
  const team = searchParams.get("team") as "management" | "design" | "production" | null;
  const employeeId = searchParams.get("employeeId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const conditions = [];
  if (status) conditions.push(eq(tasks.status, status));
  if (team) conditions.push(eq(tasks.team, team));
  if (employeeId) conditions.push(eq(tasks.employeeId, employeeId));
  if (dateStart) conditions.push(gte(tasks.startTime, new Date(dateStart)));
  if (dateEnd) conditions.push(lte(tasks.startTime, new Date(dateEnd)));

  const rows = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      progress: tasks.progress,
      currentStep: tasks.currentStep,
      startTime: tasks.startTime,
      estimatedEndTime: tasks.estimatedEndTime,
      actualEndTime: tasks.actualEndTime,
      team: tasks.team,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      qualityScore: tasks.qualityScore,
      retryCount: tasks.retryCount,
      tokenUsage: tasks.tokenUsage,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.startTime))
    .limit(limit);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat(api): extend tasks list with quality fields and date/employee filters"
```

---

### Task 5: Extend task detail API to return steps

**Files:**
- Modify: `src/app/api/tasks/[taskId]/route.ts`

- [ ] **Step 1: Add steps query and new fields to response**

Replace the entire file content with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees, taskOutputs, taskSteps } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  const taskRow = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      progress: tasks.progress,
      currentStep: tasks.currentStep,
      startTime: tasks.startTime,
      estimatedEndTime: tasks.estimatedEndTime,
      actualEndTime: tasks.actualEndTime,
      team: tasks.team,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      metadata: tasks.metadata,
      qualityScore: tasks.qualityScore,
      retryCount: tasks.retryCount,
      tokenUsage: tasks.tokenUsage,
      reflection: tasks.reflection,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(eq(tasks.id, taskId))
    .get();

  if (!taskRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outputs = await db
    .select()
    .from(taskOutputs)
    .where(eq(taskOutputs.taskId, taskId));

  const steps = await db
    .select()
    .from(taskSteps)
    .where(eq(taskSteps.taskId, taskId))
    .orderBy(asc(taskSteps.stepOrder));

  return NextResponse.json({ ...taskRow, outputs, steps });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tasks/[taskId]/route.ts
git commit -m "feat(api): return task steps and quality fields in task detail"
```

---

### Task 6: Create stats API endpoint

**Files:**
- Create: `src/app/api/tasks/stats/route.ts`

- [ ] **Step 1: Create the stats route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

function getDateRange(timeRange: string) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;
  if (timeRange === "7d") {
    start = new Date(end.getTime() - 7 * 86400000);
  } else if (timeRange === "30d") {
    start = new Date(end.getTime() - 30 * 86400000);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  return { start, end };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get("timeRange") ?? "today";
  const selectedDate = searchParams.get("date");

  const { start, end } = getDateRange(timeRange);

  const allTasks = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      team: tasks.team,
      type: tasks.type,
      startTime: tasks.startTime,
      qualityScore: tasks.qualityScore,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(and(gte(tasks.startTime, start), lte(tasks.startTime, end)));

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === "completed").length;
  const runningTasks = allTasks.filter(t => t.status === "running").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const qualityScores = allTasks.filter(t => t.qualityScore != null).map(t => t.qualityScore!);
  const avgQualityScore = qualityScores.length > 0 ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) : 0;

  // Daily trend grouped by team
  const dailyMap = new Map<string, { management: number; design: number; production: number }>();
  for (const t of allTasks) {
    if (t.status !== "completed" || !t.startTime) continue;
    const day = t.startTime.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, { management: 0, design: 0, production: 0 });
    const entry = dailyMap.get(day)!;
    if (t.team in entry) entry[t.team as keyof typeof entry]++;
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  // Type distribution
  const typeMap = new Map<string, number>();
  const filteredByDate = selectedDate
    ? allTasks.filter(t => t.startTime && t.startTime.toISOString().startsWith(selectedDate))
    : allTasks;
  for (const t of filteredByDate) {
    typeMap.set(t.type, (typeMap.get(t.type) ?? 0) + 1);
  }
  const typeDistribution = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  // Employee ranking
  const empMap = new Map<string, { employeeId: string; name: string; team: string; count: number }>();
  for (const t of filteredByDate) {
    if (t.status !== "completed") continue;
    const existing = empMap.get(t.employeeId);
    if (existing) {
      existing.count++;
    } else {
      empMap.set(t.employeeId, { employeeId: t.employeeId, name: t.employeeName, team: t.team, count: 1 });
    }
  }
  const employeeRanking = Array.from(empMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  // Quality for selected date
  const dateQualityScores = filteredByDate.filter(t => t.qualityScore != null).map(t => t.qualityScore!);
  const dateAvgQuality = dateQualityScores.length > 0
    ? Math.round(dateQualityScores.reduce((a, b) => a + b, 0) / dateQualityScores.length)
    : avgQualityScore;

  return NextResponse.json({
    summary: {
      totalTasks,
      completedTasks,
      completionRate,
      runningTasks,
      avgQualityScore,
    },
    dailyTrend,
    typeDistribution,
    employeeRanking,
    dateAvgQuality,
  });
}
```

- [ ] **Step 2: Verify API responds**

Run: `curl http://localhost:3000/api/tasks/stats?timeRange=30d 2>/dev/null | head -c 200`
Expected: JSON with summary, dailyTrend, typeDistribution, employeeRanking fields.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/stats/route.ts
git commit -m "feat(api): add /api/tasks/stats endpoint for dashboard data"
```

---

## Phase 3: Core UI Components (Tasks 7-11)

### Task 7: Create ProductionStats component (stat card row)

**Files:**
- Create: `src/components/production/production-stats.tsx`

- [ ] **Step 1: Create the stats component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, CheckCircle, Loader, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  runningTasks: number;
  avgQualityScore: number;
}

const STAT_CARDS = [
  { key: "totalTasks" as const, label: "今日任务", icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "completionRate" as const, label: "完成率", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", suffix: "%" },
  { key: "runningTasks" as const, label: "执行中", icon: Loader, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "avgQualityScore" as const, label: "平均质量分", icon: Star, color: "text-purple-600", bg: "bg-purple-50", suffix: "/100" },
];

export function ProductionStats({ timeRange }: { timeRange: string }) {
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useEffect(() => {
    fetch(`/api/tasks/stats?timeRange=${timeRange}`)
      .then(r => r.json())
      .then(d => setStats(d.summary))
      .catch(() => {});
  }, [timeRange]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map(c => (
          <Card key={c.key}>
            <CardContent className="p-4">
              <div className="h-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, suffix }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[key]}{suffix}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/production-stats.tsx
git commit -m "feat(production): add ProductionStats stat card row component"
```

---

### Task 8: Create RunningTaskCard with mini SOP stepper

**Files:**
- Create: `src/components/production/running-task-card.tsx`

- [ ] **Step 1: Create the card component**

```typescript
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

interface RunningTaskCardProps {
  task: {
    id: string;
    name: string;
    type: string;
    progress: number;
    currentStep: string | null;
    startTime: string | null;
    team: string;
    employeeName: string;
  };
  steps?: TaskStep[];
  onClick: () => void;
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-l-purple-500",
  design: "border-l-blue-500",
  production: "border-l-green-500",
};

function formatDuration(startTime: string | null): string {
  if (!startTime) return "—";
  const diff = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟`;
  return `${Math.floor(mins / 60)}小时${mins % 60}分`;
}

export function RunningTaskCard({ task, steps, onClick }: RunningTaskCardProps) {
  const currentStepName = steps?.find(s => s.status === "running")?.name ?? task.currentStep;

  return (
    <Card
      className={cn(
        "cursor-pointer border-l-4 transition-shadow hover:shadow-md",
        TEAM_BORDER[task.team] ?? "border-l-gray-300"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{task.name}</p>
            <p className="text-xs text-muted-foreground">
              {task.employeeName} · {task.type}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-bold text-primary">{task.progress}%</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              执行中
            </Badge>
          </div>
        </div>

        {steps && steps.length > 0 && (
          <div className="flex items-center gap-1">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border",
                    step.status === "completed" && "bg-green-500 border-green-500",
                    step.status === "running" && "bg-blue-500 border-blue-500 animate-pulse",
                    step.status === "pending" && "bg-transparent border-gray-300",
                    step.status === "failed" && "bg-red-500 border-red-500",
                    step.status === "skipped" && "bg-gray-300 border-gray-300"
                  )}
                />
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-3",
                      step.status === "completed" ? "bg-green-500" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-blue-600 truncate">
            {currentStepName ?? "处理中..."}
          </p>
          <p className="text-xs text-muted-foreground flex-shrink-0">
            已运行 {formatDuration(task.startTime)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/running-task-card.tsx
git commit -m "feat(production): add RunningTaskCard with mini SOP stepper"
```

---

### Task 9: Create StepsStepper vertical timeline

**Files:**
- Create: `src/components/production/steps-stepper.tsx`

- [ ] **Step 1: Create the stepper component**

```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Minus, ChevronDown, ChevronRight } from "lucide-react";

interface Step {
  id: string;
  stepOrder: number;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  thought: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function formatStepDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

export function StepsStepper({ steps }: { steps: Step[] }) {
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

  const toggleThought = (id: string) => {
    setExpandedThoughts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const hasThought = step.thought != null;
        const isExpanded = expandedThoughts.has(step.id);

        return (
          <div key={step.id} className="flex gap-3">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  step.status === "completed" && "bg-green-500 text-white",
                  step.status === "running" && "bg-blue-500 text-white animate-pulse",
                  step.status === "pending" && "border-2 border-gray-300 text-gray-300",
                  step.status === "failed" && "bg-red-500 text-white",
                  step.status === "skipped" && "bg-gray-300 text-white"
                )}
              >
                {step.status === "completed" && <Check className="h-3.5 w-3.5" />}
                {step.status === "failed" && <X className="h-3.5 w-3.5" />}
                {step.status === "skipped" && <Minus className="h-3.5 w-3.5" />}
                {step.status === "running" && <span className="h-2 w-2 rounded-full bg-white" />}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px]",
                    step.status === "completed" ? "bg-green-500" :
                    step.status === "running" ? "bg-blue-500" : "bg-gray-200 border-dashed"
                  )}
                />
              )}
            </div>

            {/* Content column */}
            <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm font-medium",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "skipped" && "text-muted-foreground line-through"
                )}>
                  {step.stepOrder}. {step.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {step.status === "running" ? "执行中..." : formatStepDuration(step.startedAt, step.completedAt) ?? ""}
                </span>
              </div>

              {hasThought && (
                <button
                  onClick={() => toggleThought(step.id)}
                  className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  思考过程
                </button>
              )}
              {hasThought && isExpanded && (
                <div className="mt-1 rounded-md border-l-2 border-gray-300 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {step.thought}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/steps-stepper.tsx
git commit -m "feat(production): add StepsStepper vertical timeline with COT toggle"
```

---

### Task 10: Create OutputsList and OutputPreviewDialog

**Files:**
- Create: `src/components/production/outputs-list.tsx`
- Create: `src/components/production/output-preview-dialog.tsx`

- [ ] **Step 1: Create the output preview dialog**

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OutputPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  output: {
    title: string;
    type: string;
    content: string | null;
    url: string | null;
  } | null;
}

export function OutputPreviewDialog({ open, onOpenChange, output }: OutputPreviewDialogProps) {
  if (!output) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{output.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {output.content && (
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {output.content}
            </div>
          )}
          {output.url && output.type === "media" && (
            <video src={output.url} controls className="w-full rounded-md" />
          )}
          {output.url && output.type !== "media" && (
            <div className="text-sm text-muted-foreground">
              <a href={output.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {output.url}
              </a>
            </div>
          )}
          {!output.content && !output.url && (
            <p className="text-sm text-muted-foreground">暂无预览内容</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the outputs list component**

```typescript
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Film, FolderOpen, Paperclip, Eye, Download } from "lucide-react";
import { OutputPreviewDialog } from "./output-preview-dialog";

interface Output {
  id: string;
  type: "document" | "resource" | "report" | "media" | "other";
  title: string;
  content: string | null;
  url: string | null;
  createdAt: string | null;
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string }> = {
  document: { icon: FileText, color: "text-blue-600" },
  report: { icon: BarChart3, color: "text-green-600" },
  media: { icon: Film, color: "text-purple-600" },
  resource: { icon: FolderOpen, color: "text-amber-600" },
  other: { icon: Paperclip, color: "text-gray-600" },
};

function formatTime(ts: string | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function OutputsList({ outputs }: { outputs: Output[] }) {
  const [previewOutput, setPreviewOutput] = useState<Output | null>(null);

  if (outputs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">暂无产出记录</p>;
  }

  return (
    <>
      <div className="divide-y">
        {outputs.map(output => {
          const config = TYPE_CONFIG[output.type] ?? TYPE_CONFIG.other;
          const Icon = config.icon;
          return (
            <div key={output.id} className="flex items-center gap-3 py-3">
              <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{output.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{output.type}</Badge>
                  <span className="text-xs text-muted-foreground">{formatTime(output.createdAt)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreviewOutput(output)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  预览
                </Button>
                {output.url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={output.url} download>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      下载
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <OutputPreviewDialog
        open={previewOutput !== null}
        onOpenChange={(open) => { if (!open) setPreviewOutput(null); }}
        output={previewOutput}
      />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/production/outputs-list.tsx src/components/production/output-preview-dialog.tsx
git commit -m "feat(production): add OutputsList and OutputPreviewDialog components"
```

---

### Task 11: Create ReflectionPanel

**Files:**
- Create: `src/components/production/reflection-panel.tsx`

- [ ] **Step 1: Create the reflection panel**

```typescript
"use client";

import { AlertTriangle, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reflection {
  problems: string;
  lessons: string;
  improvements: string;
}

const SECTIONS = [
  { key: "problems" as const, label: "发现的问题", icon: AlertTriangle, borderColor: "border-l-amber-500", iconColor: "text-amber-500" },
  { key: "lessons" as const, label: "踩过的坑", icon: Target, borderColor: "border-l-red-500", iconColor: "text-red-500" },
  { key: "improvements" as const, label: "改进建议", icon: Lightbulb, borderColor: "border-l-green-500", iconColor: "text-green-500" },
];

export function ReflectionPanel({ reflection }: { reflection: string | null }) {
  if (!reflection) {
    return <p className="text-sm text-muted-foreground py-4 text-center">暂无执行反思</p>;
  }

  let parsed: Reflection;
  try {
    parsed = JSON.parse(reflection);
  } catch {
    return <p className="text-sm text-muted-foreground py-4">{reflection}</p>;
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, label, icon: Icon, borderColor, iconColor }) => {
        const content = parsed[key];
        if (!content) return null;
        return (
          <div key={key} className={cn("rounded-lg border-l-4 bg-muted/30 p-3", borderColor)}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", iconColor)} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/reflection-panel.tsx
git commit -m "feat(production): add ReflectionPanel for task self-review display"
```

---

## Phase 4: Task Detail Modal (Task 12)

### Task 12: Create TaskDetailDialog

**Files:**
- Create: `src/components/production/task-detail-dialog.tsx`

- [ ] **Step 1: Create the task detail dialog**

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StepsStepper } from "./steps-stepper";
import { OutputsList } from "./outputs-list";
import { ReflectionPanel } from "./reflection-panel";

interface TaskDetail {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  team: string;
  employeeName: string;
  startTime: string | null;
  estimatedEndTime: string | null;
  actualEndTime: string | null;
  qualityScore: number | null;
  retryCount: number | null;
  tokenUsage: number | null;
  reflection: string | null;
  steps: Array<{
    id: string;
    stepOrder: number;
    name: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    thought: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  outputs: Array<{
    id: string;
    type: "document" | "resource" | "report" | "media" | "other";
    title: string;
    content: string | null;
    url: string | null;
    createdAt: string | null;
  }>;
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "已完成", className: "bg-green-50 text-green-700 border-green-200" },
  failed: { label: "失败", className: "bg-red-50 text-red-700 border-red-200" },
};

function calcDuration(start: string | null, end: string | null) {
  if (!start) return "—";
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diff = endTime - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}

function formatTokenUsage(tokens: number | null) {
  if (tokens == null) return "—";
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${tokens}`;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId || !open) { setTask(null); return; }
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(d => setTask(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId, open]);

  const qualityColor = task?.qualityScore != null
    ? task.qualityScore >= 80 ? "text-green-600" : task.qualityScore >= 60 ? "text-amber-600" : "text-red-600"
    : "";
  const retryColor = task?.retryCount != null
    ? task.retryCount === 0 ? "text-green-600" : task.retryCount >= 3 ? "text-red-600" : "text-amber-600"
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {loading || !task ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{task.name}</DialogTitle>
                <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[task.status].className)}>
                  {STATUS_CONFIG[task.status].label}
                </Badge>
              </div>
              <DialogDescription>
                {task.employeeName} · {task.type}
              </DialogDescription>
            </DialogHeader>

            {/* Metrics row */}
            <div className="grid grid-cols-4 gap-px rounded-lg bg-border overflow-hidden">
              <div className="bg-background p-3 text-center">
                <p className={cn("text-xl font-bold", qualityColor)}>{task.qualityScore ?? "—"}</p>
                <p className="text-xs text-muted-foreground">质量评分</p>
              </div>
              <div className="bg-background p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{calcDuration(task.startTime, task.actualEndTime)}</p>
                <p className="text-xs text-muted-foreground">执行耗时</p>
              </div>
              <div className="bg-background p-3 text-center">
                <p className={cn("text-xl font-bold", retryColor)}>{task.retryCount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">重试次数</p>
              </div>
              <div className="bg-background p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{formatTokenUsage(task.tokenUsage)}</p>
                <p className="text-xs text-muted-foreground">Token 用量</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="steps" className="flex-1 min-h-0">
              <TabsList variant="line">
                <TabsTrigger value="steps">执行步骤</TabsTrigger>
                <TabsTrigger value="outputs">产出内容</TabsTrigger>
                <TabsTrigger
                  value="reflection"
                  disabled={task.status !== "completed"}
                >
                  执行反思
                </TabsTrigger>
              </TabsList>
              <div className="overflow-y-auto flex-1 mt-3 max-h-[40vh]">
                <TabsContent value="steps">
                  <StepsStepper steps={task.steps} />
                </TabsContent>
                <TabsContent value="outputs">
                  <OutputsList outputs={task.outputs} />
                </TabsContent>
                <TabsContent value="reflection">
                  <ReflectionPanel reflection={task.reflection} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/task-detail-dialog.tsx
git commit -m "feat(production): add TaskDetailDialog with metrics, steps, outputs, reflection tabs"
```

---

## Phase 5: Refactor Page Layout & Existing Components (Tasks 13-16)

### Task 13: Create ProductionTabs container

**Files:**
- Create: `src/components/production/production-tabs.tsx`

- [ ] **Step 1: Create the tabs wrapper**

```typescript
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RunningTasksPanel } from "./running-tasks-panel";
import { TaskHistoryTable } from "./task-history-table";
import { ProductionDashboard } from "./production-dashboard";

interface ProductionTabsProps {
  initialTasks: Array<{
    id: string;
    name: string;
    type: string;
    status: "running" | "completed" | "failed";
    startTime: string | null;
    actualEndTime: string | null;
    team: string;
    employeeName: string;
    qualityScore: number | null;
  }>;
  timeRange: string;
}

export function ProductionTabs({ initialTasks, timeRange }: ProductionTabsProps) {
  return (
    <Tabs defaultValue="realtime">
      <TabsList variant="line">
        <TabsTrigger value="realtime">实时看板</TabsTrigger>
        <TabsTrigger value="dashboard">数据面板</TabsTrigger>
        <TabsTrigger value="history">历史记录</TabsTrigger>
      </TabsList>
      <TabsContent value="realtime" className="mt-4">
        <RunningTasksPanel />
      </TabsContent>
      <TabsContent value="dashboard" className="mt-4">
        <ProductionDashboard timeRange={timeRange} />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <TaskHistoryTable initialTasks={initialTasks} />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/production-tabs.tsx
git commit -m "feat(production): add ProductionTabs container with three tabs"
```

---

### Task 14: Refactor RunningTasksPanel to use RunningTaskCard + modal

**Files:**
- Modify: `src/components/production/running-tasks-panel.tsx`

- [ ] **Step 1: Rewrite running-tasks-panel.tsx**

Replace the entire file:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RunningTaskCard } from "./running-task-card";
import { TaskDetailDialog } from "./task-detail-dialog";

interface RunningTask {
  id: string;
  name: string;
  type: string;
  status: "running";
  progress: number;
  currentStep: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  team: string;
  employeeName: string;
}

interface RunningTaskStep {
  id: string;
  taskId: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

export function RunningTasksPanel() {
  const [tasks, setTasks] = useState<RunningTask[]>([]);
  const [stepsMap, setStepsMap] = useState<Record<string, RunningTaskStep[]>>({});
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const url = teamFilter !== "all"
      ? `/api/tasks?status=running&team=${teamFilter}`
      : `/api/tasks?status=running`;
    const res = await fetch(url, { cache: "no-store" });
    const data: RunningTask[] = await res.json();
    setTasks(data);

    const newStepsMap: Record<string, RunningTaskStep[]> = {};
    await Promise.all(
      data.map(async (t) => {
        try {
          const r = await fetch(`/api/tasks/${t.id}`, { cache: "no-store" });
          const detail = await r.json();
          if (detail.steps) newStepsMap[t.id] = detail.steps;
        } catch {}
      })
    );
    setStepsMap(newStepsMap);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">实时任务面板</h2>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {tasks.length} 个任务执行中
            </span>
          </div>
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部团队" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部团队</SelectItem>
              <SelectItem value="management">管理团队</SelectItem>
              <SelectItem value="design">设计师团队</SelectItem>
              <SelectItem value="production">生产团队</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <RunningTaskCard
              key={task.id}
              task={task}
              steps={stepsMap[task.id]}
              onClick={() => setSelectedTaskId(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">当前没有执行中的任务</p>
            </div>
          )}
        </div>
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={selectedTaskId !== null}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/running-tasks-panel.tsx
git commit -m "refactor(production): RunningTasksPanel uses RunningTaskCard + opens modal on click"
```

---

### Task 15: Refactor TaskHistoryTable to open modal on row click

**Files:**
- Modify: `src/components/production/task-history-table.tsx`

- [ ] **Step 1: Add modal state, quality column, row click handler**

Replace the entire file:

```typescript
"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { TaskDetailDialog } from "./task-detail-dialog";

interface HistoryTask {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  startTime: string | null;
  actualEndTime: string | null;
  team: string;
  employeeName: string;
  qualityScore: number | null;
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "已完成", className: "bg-green-50 text-green-700 border-green-200" },
  failed: { label: "失败", className: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function calcDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}

interface TaskHistoryTableProps {
  initialTasks: HistoryTask[];
}

export function TaskHistoryTable({ initialTasks }: TaskHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialTasks.filter((t) => {
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        t.type.toLowerCase().includes(search.toLowerCase());
      const matchTeam = teamFilter === "all" || t.team === teamFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchTeam && matchStatus;
    });
  }, [initialTasks, search, teamFilter, statusFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索任务..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")}>
            <SelectTrigger className="w-36"><SelectValue placeholder="全部团队" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部团队</SelectItem>
              <SelectItem value="management">管理团队</SelectItem>
              <SelectItem value="design">设计师团队</SelectItem>
              <SelectItem value="production">生产团队</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-32"><SelectValue placeholder="全部状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="running">执行中</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} 条记录</span>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>任务名称</TableHead>
                <TableHead>执行者</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>质量分</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>耗时</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">{task.name}</TableCell>
                  <TableCell className="text-muted-foreground">{task.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{task.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[task.status].className)}>
                      {STATUS_CONFIG[task.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.qualityScore != null ? (
                      <span className={cn(
                        "text-sm font-medium",
                        task.qualityScore >= 80 ? "text-green-600" : task.qualityScore >= 60 ? "text-amber-600" : "text-red-600"
                      )}>
                        {task.qualityScore}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(task.startTime)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{calcDuration(task.startTime, task.actualEndTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={selectedTaskId !== null}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/task-history-table.tsx
git commit -m "refactor(production): TaskHistoryTable opens modal on row click, adds quality column"
```

---

### Task 16: Create time range selector + refactor production page layout

**Files:**
- Create: `src/components/production/time-range-selector.tsx`
- Modify: `src/app/production/page.tsx`

- [ ] **Step 1: Create the time range selector client component**

```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductionStats } from "./production-stats";
import { ProductionTabs } from "./production-tabs";

interface ProductionClientProps {
  initialTasks: Array<{
    id: string;
    name: string;
    type: string;
    status: "running" | "completed" | "failed";
    startTime: string | null;
    actualEndTime: string | null;
    team: string;
    employeeName: string;
    qualityScore: number | null;
  }>;
}

const TIME_RANGES = [
  { value: "today", label: "今日" },
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
];

export function ProductionClient({ initialTasks }: ProductionClientProps) {
  const [timeRange, setTimeRange] = useState("today");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">生产看板</h1>
          <p className="text-muted-foreground mt-1">AI团队实时工作状态与数据分析</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                timeRange === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ProductionStats timeRange={timeRange} />
      <ProductionTabs initialTasks={initialTasks} timeRange={timeRange} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the production page server component**

Replace the entire file `src/app/production/page.tsx`:

```typescript
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ProductionClient } from "@/components/production/time-range-selector";

async function getHistory() {
  const rows = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      startTime: tasks.startTime,
      actualEndTime: tasks.actualEndTime,
      team: tasks.team,
      employeeName: employees.name,
      qualityScore: tasks.qualityScore,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(desc(tasks.startTime))
    .limit(200);

  return rows.map((r) => ({
    ...r,
    startTime: r.startTime ? r.startTime.toISOString() : null,
    actualEndTime: r.actualEndTime ? r.actualEndTime.toISOString() : null,
  }));
}

export default async function ProductionPage() {
  const historyTasks = await getHistory();

  return (
    <div className="p-8">
      <ProductionClient initialTasks={historyTasks} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/production/time-range-selector.tsx src/app/production/page.tsx
git commit -m "feat(production): add time range selector, redesign page with stats + tabs layout"
```

---

## Phase 6: ECharts Data Dashboard (Tasks 17-21)

### Task 17: Create TrendChart (stacked bar)

**Files:**
- Create: `src/components/production/charts/trend-chart.tsx`

- [ ] **Step 1: Create the trend chart component**

```typescript
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyData {
  date: string;
  management: number;
  design: number;
  production: number;
}

export function TrendChart({
  data,
  onDateClick,
  selectedDate,
}: {
  data: DailyData[];
  onDateClick: (date: string | null) => void;
  selectedDate: string | null;
}) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      data: ["管理团队", "设计团队", "生产团队"],
      textStyle: { color: "#475569" },
      top: 0,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.map(d => d.date.slice(5)),
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b" },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    series: [
      {
        name: "管理团队",
        type: "bar",
        stack: "total",
        data: data.map(d => d.management),
        itemStyle: { color: "#8b5cf6", borderRadius: [0, 0, 0, 0] },
        emphasis: { focus: "series" },
      },
      {
        name: "设计团队",
        type: "bar",
        stack: "total",
        data: data.map(d => d.design),
        itemStyle: { color: "#3b82f6" },
        emphasis: { focus: "series" },
      },
      {
        name: "生产团队",
        type: "bar",
        stack: "total",
        data: data.map(d => d.production),
        itemStyle: { color: "#22c55e", borderRadius: [4, 4, 0, 0] },
        emphasis: { focus: "series" },
      },
    ],
  };

  const onEvents = {
    click: (params: { dataIndex: number }) => {
      const clickedDate = data[params.dataIndex]?.date ?? null;
      onDateClick(clickedDate === selectedDate ? null : clickedDate);
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">任务产出趋势（按团队）</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 280 }} onEvents={onEvents} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/components/production/charts
git add src/components/production/charts/trend-chart.tsx
git commit -m "feat(production): add TrendChart stacked bar component"
```

---

### Task 18: Create TypeDistributionChart (donut) and QualityGauge

**Files:**
- Create: `src/components/production/charts/type-distribution-chart.tsx`
- Create: `src/components/production/charts/quality-gauge.tsx`

- [ ] **Step 1: Create the donut chart**

```typescript
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TypeData {
  type: string;
  count: number;
}

export function TypeDistributionChart({ data }: { data: TypeData[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "55%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: data.map(d => ({ name: d.type, value: d.count })),
      },
    ],
    graphic: {
      type: "text",
      left: "center",
      top: "center",
      style: { text: `${total}`, fontSize: 24, fontWeight: "bold", fill: "#0f172a", textAlign: "center" },
    },
    color: ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#94a3b8"],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">任务类型分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 180 }} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the quality gauge**

```typescript
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QualityGauge({ score }: { score: number }) {
  const option = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        pointer: { show: false },
        progress: {
          show: true,
          width: 14,
          itemStyle: {
            color: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
          },
        },
        axisLine: { lineStyle: { width: 14, color: [[1, "#e2e8f0"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: "bold",
          offsetCenter: [0, "0%"],
          color: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
          formatter: "{value}",
        },
        data: [{ value: score }],
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">平均质量评分</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 180 }} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/production/charts/type-distribution-chart.tsx src/components/production/charts/quality-gauge.tsx
git commit -m "feat(production): add TypeDistributionChart donut and QualityGauge components"
```

---

### Task 19: Create EmployeeRankingChart (horizontal bar)

**Files:**
- Create: `src/components/production/charts/employee-ranking-chart.tsx`

- [ ] **Step 1: Create the employee ranking chart**

```typescript
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RankingData {
  employeeId: string;
  name: string;
  team: string;
  count: number;
}

const TEAM_COLOR: Record<string, string> = {
  management: "#8b5cf6",
  design: "#3b82f6",
  production: "#22c55e",
};

export function EmployeeRankingChart({
  data,
  onEmployeeClick,
}: {
  data: RankingData[];
  onEmployeeClick?: (employeeId: string) => void;
}) {
  const sorted = [...data].sort((a, b) => a.count - b.count);

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: "3%", right: "10%", top: "3%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#64748b" },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    yAxis: {
      type: "category",
      data: sorted.map(d => d.name),
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
    },
    series: [
      {
        type: "bar",
        data: sorted.map(d => ({
          value: d.count,
          itemStyle: { color: TEAM_COLOR[d.team] ?? "#94a3b8", borderRadius: [0, 4, 4, 0] },
        })),
        label: { show: true, position: "right", color: "#64748b", fontSize: 11 },
        barMaxWidth: 24,
      },
    ],
  };

  const onEvents = onEmployeeClick
    ? {
        click: (params: { dataIndex: number }) => {
          const emp = sorted[params.dataIndex];
          if (emp) onEmployeeClick(emp.employeeId);
        },
      }
    : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">员工产出排行 Top 10</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 280 }} onEvents={onEvents} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/charts/employee-ranking-chart.tsx
git commit -m "feat(production): add EmployeeRankingChart horizontal bar component"
```

---

### Task 20: Create ProductionDashboard (chart container with linked state)

**Files:**
- Create: `src/components/production/production-dashboard.tsx`

- [ ] **Step 1: Create the dashboard container**

```typescript
"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "./charts/trend-chart";
import { TypeDistributionChart } from "./charts/type-distribution-chart";
import { QualityGauge } from "./charts/quality-gauge";
import { EmployeeRankingChart } from "./charts/employee-ranking-chart";

interface StatsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    runningTasks: number;
    avgQualityScore: number;
  };
  dailyTrend: Array<{ date: string; management: number; design: number; production: number }>;
  typeDistribution: Array<{ type: string; count: number }>;
  employeeRanking: Array<{ employeeId: string; name: string; team: string; count: number }>;
  dateAvgQuality: number;
}

export function ProductionDashboard({ timeRange }: { timeRange: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = async (date: string | null) => {
    const params = new URLSearchParams({ timeRange });
    if (date) params.set("date", date);
    const res = await fetch(`/api/tasks/stats?${params}`);
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, selectedDate]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendChart
            data={data.dailyTrend}
            onDateClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>
        <div className="lg:col-span-2 grid gap-4">
          <TypeDistributionChart data={data.typeDistribution} />
          <QualityGauge score={data.dateAvgQuality} />
        </div>
      </div>
      <EmployeeRankingChart data={data.employeeRanking} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/production/production-dashboard.tsx
git commit -m "feat(production): add ProductionDashboard with linked chart state"
```

---

### Task 21: Verify end-to-end in browser

- [ ] **Step 1: Re-seed the database**

Run: `cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run db:push && npm run db:seed`

- [ ] **Step 2: Start dev server**

Run: `cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run dev`

- [ ] **Step 3: Browser verification checklist**

Open `http://localhost:3000/production` and verify:
1. Stat cards row shows (今日任务, 完成率, 执行中, 平均质量分)
2. Three tabs visible (实时看板, 数据面板, 历史记录)
3. Running task cards have mini SOP stepper dots
4. Clicking a running task card opens the detail modal
5. Detail modal shows metrics row + 3 tabs (执行步骤, 产出内容, 执行反思)
6. Steps tab shows vertical stepper with COT expand/collapse
7. Outputs tab shows list with preview/download buttons
8. Reflection tab shows problems/lessons/improvements cards
9. History tab shows table with quality score column
10. Clicking a history row opens the same detail modal
11. Data dashboard tab shows 4 charts (trend, pie, gauge, ranking)
12. Clicking a day on the trend chart updates pie/gauge/ranking

- [ ] **Step 4: Fix any issues found during verification**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(production): complete production kanban redesign with dashboard, SOP stepper, and data panels"
```
