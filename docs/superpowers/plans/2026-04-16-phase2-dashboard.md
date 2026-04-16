# AI Workforce Platform — Phase 2: Dashboard & Visualizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** Phase 1 must be complete (tag `phase-1-complete` must exist). All employees, skills, metrics, and tasks data must be seeded in `local.db`.

**Goal:** Build the full `/dashboard` page — 6 platform-level KPI cards, business-line comparison charts, 24-employee activity heatmap, and a live task feed — powered by aggregated metrics from the database.

**Architecture:** Dashboard page is a Next.js server component that fetches aggregated data from dedicated `/api/dashboard/*` routes. Charts use ECharts rendered in client components via `echarts-for-react`. The activity feed auto-refreshes every 30s using React's `setInterval`.

**Tech Stack:** ECharts (`echarts`, `echarts-for-react`), existing Next.js 15 + shadcn/ui + Drizzle stack from Phase 1.

---

## File Structure

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                    # Dashboard server component (replaces placeholder)
│   └── api/
│       └── dashboard/
│           ├── summary/route.ts        # GET: platform-level KPI aggregates
│           ├── team-comparison/route.ts # GET: per-team metric breakdown
│           ├── heatmap/route.ts        # GET: 30-day activity per employee
│           └── recent-tasks/route.ts   # GET: last 20 completed/running tasks
└── components/
    └── dashboard/
        ├── kpi-card.tsx               # Single KPI metric card with trend
        ├── kpi-section.tsx            # Row of 6 KPI cards
        ├── team-comparison-chart.tsx  # ECharts bar/radar for team comparison
        ├── activity-heatmap.tsx       # ECharts heatmap for 24 employees × 30 days
        ├── task-feed.tsx              # Live-refreshing task event stream
        └── dashboard-shell.tsx        # Assembles all sections; client component for refresh
```

---

### Task 1: Install ECharts

**Files:**
- `package.json` (modified by npm install)

- [ ] **Step 1: Install ECharts packages**

```bash
npm install echarts echarts-for-react
```

Expected: packages installed, no peer-dep errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add echarts and echarts-for-react"
```

---

### Task 2: Seed Tasks Mock Data

The dashboard task feed requires tasks in the database. Add them to the seeder.

**Files:**
- Modify: `src/db/seed.ts`

- [ ] **Step 1: Add task seeding to `src/db/seed.ts`**

After the closing brace of the `for (const emp of SEED_EMPLOYEES)` loop (before `console.log`), add:

```typescript
  // Seed running + recent completed tasks
  import { tasks, taskOutputs } from "./schema";

  const TASK_TYPES: Record<string, string[]> = {
    management: ["项目审计", "预警分析", "决策报告", "人员盘点", "知识整理"],
    design: ["PRD编写", "交互设计", "架构评审", "测试方案"],
    production: ["脚本创作", "角色设计", "视频分镜", "内容质检", "资源入库", "数据清洗"],
  };

  const activeEmployees = SEED_EMPLOYEES.filter((e) => e.status === "active");

  for (const emp of activeEmployees) {
    const types = TASK_TYPES[emp.team];
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
      });
    }
    // 10 completed tasks per active employee
    for (let i = 0; i < 10; i++) {
      const taskId = randomUUID();
      const daysAgo = Math.floor(Math.random() * 30);
      const started = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 3600000);
      const duration = 600000 + Math.random() * 3600000;
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
      });
    }
  }
```

Also add `tasks, taskOutputs` to the delete block at the top of `seed()`:

```typescript
  await db.delete(taskOutputs);
  await db.delete(tasks);
```

- [ ] **Step 2: Re-run seeder**

```bash
npm run db:seed
```

Expected:
```
Seeding database...
Seeded 24 employees.
```

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add task mock data to seeder"
```

---

### Task 3: Dashboard API Routes

**Files:**
- Create: `src/app/api/dashboard/summary/route.ts`
- Create: `src/app/api/dashboard/team-comparison/route.ts`
- Create: `src/app/api/dashboard/heatmap/route.ts`
- Create: `src/app/api/dashboard/recent-tasks/route.ts`

- [ ] **Step 1: Write summary route**

Create `src/app/api/dashboard/summary/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, metrics, tasks } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET() {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const [employeeCounts, monthlyAgg, taskAgg, projectCount] = await Promise.all([
    // Total and active employee counts
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
      })
      .from(employees)
      .get(),

    // Monthly metrics aggregates
    db
      .select({
        totalTasks: sql<number>`sum(${metrics.taskCount})`,
        avgAdoption: sql<number>`avg(${metrics.adoptionRate})`,
        avgAccuracy: sql<number>`avg(${metrics.accuracyRate})`,
        totalHoursSaved: sql<number>`sum(${metrics.humanTimeSaved})`,
      })
      .from(metrics)
      .where(eq(metrics.period, currentMonth))
      .get(),

    // Project (task type) count
    db
      .select({ count: sql<number>`count(distinct ${tasks.type})` })
      .from(tasks)
      .get(),

    // Distinct project count via task names as proxy
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .get(),
  ]);

  const hoursSaved = monthlyAgg?.totalHoursSaved ?? 0;
  const costPerHour = 46.875; // 375/day ÷ 8h

  return NextResponse.json({
    totalEmployees: employeeCounts?.total ?? 0,
    activeEmployees: employeeCounts?.active ?? 0,
    activeRate: employeeCounts?.total ? (employeeCounts.active / employeeCounts.total) : 0,
    monthlyTaskCount: monthlyAgg?.totalTasks ?? 0,
    humanTimeSavedHours: Math.round(hoursSaved * 10) / 10,
    humanTimeSavedCost: Math.round(hoursSaved * costPerHour),
    avgAdoptionRate: monthlyAgg?.avgAdoption ?? 0,
    avgAccuracyRate: monthlyAgg?.avgAccuracy ?? 0,
    projectsCovered: taskAgg?.count ?? 0,
  });
}
```

- [ ] **Step 2: Write team-comparison route**

Create `src/app/api/dashboard/team-comparison/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, metrics } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const rows = await db
    .select({
      team: employees.team,
      totalTasks: sql<number>`sum(${metrics.taskCount})`,
      avgAdoption: sql<number>`avg(${metrics.adoptionRate})`,
      avgAccuracy: sql<number>`avg(${metrics.accuracyRate})`,
      totalHoursSaved: sql<number>`sum(${metrics.humanTimeSaved})`,
      employeeCount: sql<number>`count(distinct ${employees.id})`,
    })
    .from(metrics)
    .innerJoin(employees, eq(metrics.employeeId, employees.id))
    .where(eq(metrics.period, currentMonth))
    .groupBy(employees.team);

  const TEAM_LABEL: Record<string, string> = {
    management: "管理团队",
    design: "设计师团队",
    production: "生产团队",
  };

  return NextResponse.json(
    rows.map((r) => ({
      team: r.team,
      label: TEAM_LABEL[r.team] ?? r.team,
      totalTasks: r.totalTasks ?? 0,
      avgAdoptionRate: Math.round((r.avgAdoption ?? 0) * 100),
      avgAccuracyRate: Math.round((r.avgAccuracy ?? 0) * 100),
      totalHoursSaved: Math.round((r.totalHoursSaved ?? 0) * 10) / 10,
      employeeCount: r.employeeCount ?? 0,
    }))
  );
}
```

- [ ] **Step 3: Write heatmap route**

Create `src/app/api/dashboard/heatmap/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, tasks } from "@/db/schema";
import { eq, gte, sql } from "drizzle-orm";

export async function GET() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const completedTasks = await db
    .select({
      employeeId: tasks.employeeId,
      date: sql<string>`date(${tasks.actualEndTime} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(eq(tasks.status, "completed"))
    .groupBy(tasks.employeeId, sql`date(${tasks.actualEndTime} / 1000, 'unixepoch')`);

  const empRows = await db
    .select({ id: employees.id, name: employees.name, team: employees.team })
    .from(employees)
    .orderBy(employees.team, employees.name);

  return NextResponse.json({ employees: empRows, activity: completedTasks });
}
```

- [ ] **Step 4: Write recent-tasks route**

Create `src/app/api/dashboard/recent-tasks/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      progress: tasks.progress,
      startTime: tasks.startTime,
      actualEndTime: tasks.actualEndTime,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      team: tasks.team,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(desc(tasks.startTime))
    .limit(20);

  return NextResponse.json(rows);
}
```

- [ ] **Step 5: Test all 4 routes**

```bash
curl http://localhost:3000/api/dashboard/summary | python3 -m json.tool
curl http://localhost:3000/api/dashboard/team-comparison | python3 -m json.tool
curl http://localhost:3000/api/dashboard/heatmap | python3 -m json.tool | head -50
curl http://localhost:3000/api/dashboard/recent-tasks | python3 -m json.tool | head -80
```

Expected: Each returns valid JSON with non-zero values.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dashboard/
git commit -m "feat: add dashboard aggregate API routes"
```

---

### Task 4: KPI Cards

**Files:**
- Create: `src/components/dashboard/kpi-card.tsx`
- Create: `src/components/dashboard/kpi-section.tsx`

- [ ] **Step 1: Write KpiCard**

Create `src/components/dashboard/kpi-card.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "blue" | "green" | "yellow" | "purple" | "red";
}

const ACCENT_CLASSES = {
  blue: "text-[#00d4ff]",
  green: "text-[#00ff88]",
  yellow: "text-[#ffd93d]",
  purple: "text-[#c084fc]",
  red: "text-[#ff6b6b]",
};

export function KpiCard({ title, value, subtitle, trend, trendLabel, accent = "blue" }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
        <p className={cn("text-3xl font-bold tabular-nums", ACCENT_CLASSES[accent])}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && trendLabel && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write KpiSection**

Create `src/components/dashboard/kpi-section.tsx`:

```tsx
import { KpiCard } from "./kpi-card";

interface SummaryData {
  totalEmployees: number;
  activeEmployees: number;
  activeRate: number;
  monthlyTaskCount: number;
  humanTimeSavedHours: number;
  humanTimeSavedCost: number;
  avgAdoptionRate: number;
  avgAccuracyRate: number;
  projectsCovered: number;
}

export function KpiSection({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        title="AI员工"
        value={`${data.activeEmployees}/${data.totalEmployees}`}
        subtitle={`在岗率 ${Math.round(data.activeRate * 100)}%`}
        accent="blue"
        trend="up"
        trendLabel="较上月 +2"
      />
      <KpiCard
        title="本月任务量"
        value={data.monthlyTaskCount.toLocaleString()}
        subtitle="已完成任务数"
        accent="green"
        trend="up"
        trendLabel="较上月 +18%"
      />
      <KpiCard
        title="节省人力"
        value={`${data.humanTimeSavedHours}h`}
        subtitle={`约 ¥${data.humanTimeSavedCost.toLocaleString()}`}
        accent="yellow"
        trend="up"
        trendLabel="等效人天"
      />
      <KpiCard
        title="平均采纳率"
        value={`${Math.round(data.avgAdoptionRate * 100)}%`}
        subtitle="AI产出被采用比例"
        accent="purple"
        trend="up"
        trendLabel="较上月 +3%"
      />
      <KpiCard
        title="平均准确率"
        value={`${Math.round(data.avgAccuracyRate * 100)}%`}
        subtitle="一次性通过质检"
        accent="green"
        trend="neutral"
        trendLabel="持平"
      />
      <KpiCard
        title="覆盖业务数"
        value={data.projectsCovered.toLocaleString()}
        subtitle="涉及任务类型数"
        accent="blue"
        trend="up"
        trendLabel="本月新增 15"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/kpi-card.tsx src/components/dashboard/kpi-section.tsx
git commit -m "feat: add KPI card components for dashboard"
```

---

### Task 5: Team Comparison Chart

**Files:**
- Create: `src/components/dashboard/team-comparison-chart.tsx`

- [ ] **Step 1: Write TeamComparisonChart**

Create `src/components/dashboard/team-comparison-chart.tsx`:

```tsx
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamData {
  team: string;
  label: string;
  totalTasks: number;
  avgAdoptionRate: number;
  avgAccuracyRate: number;
  totalHoursSaved: number;
  employeeCount: number;
}

export function TeamComparisonChart({ data }: { data: TeamData[] }) {
  const labels = data.map((d) => d.label);

  const barOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      data: ["任务总量", "节省人力(h)"],
      textStyle: { color: "#94a3b8" },
      top: 0,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: "#94a3b8" },
      axisLine: { lineStyle: { color: "#334155" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series: [
      {
        name: "任务总量",
        type: "bar",
        data: data.map((d) => d.totalTasks),
        itemStyle: { color: "#00d4ff", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
      },
      {
        name: "节省人力(h)",
        type: "bar",
        data: data.map((d) => d.totalHoursSaved),
        itemStyle: { color: "#00ff88", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
      },
    ],
  };

  const radarOption = {
    backgroundColor: "transparent",
    tooltip: {},
    radar: {
      indicator: [
        { name: "任务量", max: Math.max(...data.map((d) => d.totalTasks)) * 1.2 },
        { name: "采纳率", max: 100 },
        { name: "准确率", max: 100 },
        { name: "节省人力", max: Math.max(...data.map((d) => d.totalHoursSaved)) * 1.2 },
      ],
      axisLine: { lineStyle: { color: "#334155" } },
      splitLine: { lineStyle: { color: "#1e293b" } },
      name: { textStyle: { color: "#94a3b8" } },
    },
    series: [
      {
        type: "radar",
        data: data.map((d) => ({
          name: d.label,
          value: [d.totalTasks, d.avgAdoptionRate, d.avgAccuracyRate, d.totalHoursSaved],
        })),
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.15 },
      },
    ],
    color: ["#00d4ff", "#00ff88", "#ffd93d"],
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">三团队任务对比</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={barOption} style={{ height: 280 }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">能力雷达图</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={radarOption} style={{ height: 280 }} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/team-comparison-chart.tsx
git commit -m "feat: add team comparison bar and radar charts"
```

---

### Task 6: Activity Heatmap

**Files:**
- Create: `src/components/dashboard/activity-heatmap.tsx`

- [ ] **Step 1: Write ActivityHeatmap**

Create `src/components/dashboard/activity-heatmap.tsx`:

```tsx
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapData {
  employees: { id: string; name: string; team: string }[];
  activity: { employeeId: string; date: string; count: number }[];
}

export function ActivityHeatmap({ data }: { data: HeatmapData }) {
  // Build 30 days of dates
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  const employeeNames = data.employees.map((e) => e.name);

  // Build [xIndex, yIndex, value] triples
  const heatData: [number, number, number][] = [];
  data.activity.forEach((a) => {
    const xIdx = dates.indexOf(a.date);
    const yIdx = data.employees.findIndex((e) => e.id === a.employeeId);
    if (xIdx >= 0 && yIdx >= 0) {
      heatData.push([xIdx, yIdx, a.count]);
    }
  });

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      formatter: (params: { data: [number, number, number] }) => {
        const [xIdx, yIdx, val] = params.data;
        return `${employeeNames[yIdx]}<br/>${dates[xIdx]}<br/>完成任务: ${val}`;
      },
    },
    grid: { left: 100, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: dates.map((d) => d.slice(5)),
      axisLabel: {
        color: "#64748b",
        fontSize: 10,
        rotate: 45,
        interval: 4,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: employeeNames,
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: -10,
      show: false,
      inRange: {
        color: ["#0f172a", "#0c4a6e", "#0369a1", "#0284c7", "#00d4ff"],
      },
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        itemStyle: { borderRadius: 2, borderColor: "#0a0a1a", borderWidth: 1 },
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          AI员工近30天活跃热力图
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 420 }} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/activity-heatmap.tsx
git commit -m "feat: add 30-day employee activity heatmap"
```

---

### Task 7: Task Feed

**Files:**
- Create: `src/components/dashboard/task-feed.tsx`

- [ ] **Step 1: Write TaskFeed**

Create `src/components/dashboard/task-feed.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  startTime: string | null;
  actualEndTime: string | null;
  employeeName: string;
  team: string;
}

const TEAM_COLOR: Record<string, string> = {
  management: "text-[#c084fc]",
  design: "text-[#00d4ff]",
  production: "text-[#00ff88]",
};

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completed: { label: "已完成", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "失败", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function TaskFeed() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const fetchTasks = async () => {
    const res = await fetch("/api/dashboard/recent-tasks", { cache: "no-store" });
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">最近任务动态</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            实时更新
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg p-2.5 bg-card/50 border border-border/50 hover:border-border transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("text-xs font-medium truncate", TEAM_COLOR[task.team])}>
                  {task.employeeName}
                </span>
                <Badge variant="outline" className={cn("text-xs py-0 px-1.5", STATUS_CONFIG[task.status].className)}>
                  {STATUS_CONFIG[task.status].label}
                </Badge>
              </div>
              <p className="text-sm text-foreground truncate">{task.name}</p>
            </div>
            {task.status === "running" && (
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-primary">{task.progress}%</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/task-feed.tsx
git commit -m "feat: add auto-refreshing task feed component"
```

---

### Task 8: Assemble Dashboard Page

**Files:**
- Create: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Write DashboardShell**

Create `src/components/dashboard/dashboard-shell.tsx`:

```tsx
"use client";

import { KpiSection } from "./kpi-section";
import { TeamComparisonChart } from "./team-comparison-chart";
import { ActivityHeatmap } from "./activity-heatmap";
import { TaskFeed } from "./task-feed";

interface DashboardShellProps {
  summary: any;
  teamComparison: any[];
  heatmap: any;
}

export function DashboardShell({ summary, teamComparison, heatmap }: DashboardShellProps) {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI 驾驶舱</h1>
        <p className="text-muted-foreground mt-1">AI团队全局视图 · 实时数据</p>
      </div>

      {/* KPI Cards */}
      <KpiSection data={summary} />

      {/* Team comparison */}
      <TeamComparisonChart data={teamComparison} />

      {/* Heatmap + Feed */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityHeatmap data={heatmap} />
        </div>
        <div>
          <TaskFeed />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard page**

Replace `src/app/dashboard/page.tsx`:

```tsx
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const BASE = "http://localhost:3000";

async function fetchAll() {
  const [summary, teamComparison, heatmap] = await Promise.all([
    fetch(`${BASE}/api/dashboard/summary`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`${BASE}/api/dashboard/team-comparison`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`${BASE}/api/dashboard/heatmap`, { cache: "no-store" }).then((r) => r.json()),
  ]);
  return { summary, teamComparison, heatmap };
}

export default async function DashboardPage() {
  const { summary, teamComparison, heatmap } = await fetchAll();
  return <DashboardShell summary={summary} teamComparison={teamComparison} heatmap={heatmap} />;
}
```

- [ ] **Step 3: Verify dashboard**

With dev server running, open `http://localhost:3000/dashboard` — should show:
- 6 KPI cards with real numbers from DB
- Two charts (bar + radar) comparing teams
- Heatmap with colored cells where tasks exist
- Task feed showing recent tasks, pulsing "实时更新" indicator

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ src/app/dashboard/page.tsx
git commit -m "feat: complete dashboard page with KPIs, charts, heatmap, and task feed"
```

---

### Task 9: Phase 2 Final Check

- [ ] **Step 1: Build check**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Final commit and tag**

```bash
git add .
git commit -m "chore: phase 2 complete — dashboard and visualizations"
git tag phase-2-complete
```
