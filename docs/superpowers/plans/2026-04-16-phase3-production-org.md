# AI Workforce Platform — Phase 3: Production Board & Org Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** Phase 1 must be complete (tag `phase-1-complete` must exist). Phase 2 can run in parallel.

**Goal:** Build the `/production` board (real-time running tasks + completed task history + task detail), the `/org` org-chart tree (24 AI employees in a React Flow interactive tree), and the `/settings` page (employee CRUD + metric config).

**Architecture:** Production board uses server-fetched data for history table + client component for running tasks panel (auto-refreshes every 15s). Org chart is a fully client-side React Flow canvas. Settings page uses client-side forms backed by existing REST API.

**Tech Stack:** React Flow (`@xyflow/react`), shadcn/ui Table, existing stack from Phase 1.

---

## File Structure

```
src/
├── app/
│   ├── production/
│   │   ├── page.tsx                    # Production board page (replaces placeholder)
│   │   └── [taskId]/
│   │       └── page.tsx                # Task detail page
│   ├── org/
│   │   └── page.tsx                    # Org chart page (replaces placeholder)
│   ├── settings/
│   │   └── page.tsx                    # Settings page (replaces placeholder)
│   └── api/
│       ├── tasks/
│       │   ├── route.ts                # GET /api/tasks?status=running|completed&team=&limit=
│       │   └── [taskId]/
│       │       └── route.ts            # GET /api/tasks/:taskId (full detail + outputs)
│       └── metric-configs/
│           ├── route.ts                # GET + POST /api/metric-configs
│           └── [id]/
│               └── route.ts           # PUT + DELETE /api/metric-configs/:id
└── components/
    ├── production/
    │   ├── running-tasks-panel.tsx     # Auto-refresh grid of running task cards
    │   ├── task-history-table.tsx      # Filterable table of completed tasks
    │   └── task-detail.tsx            # Task detail view (steps + outputs)
    ├── org/
    │   └── org-chart.tsx              # React Flow org chart canvas
    └── settings/
        ├── employee-manager.tsx       # Employee CRUD table + add modal
        └── metric-config-manager.tsx  # Metric baseline config table
```

---

### Task 1: Install React Flow

**Files:**
- `package.json` (modified by npm install)

- [ ] **Step 1: Install React Flow**

```bash
npm install @xyflow/react
```

Expected: packages installed, no peer-dep errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react for org chart"
```

---

### Task 2: Task API Routes

**Files:**
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/tasks/[taskId]/route.ts`

- [ ] **Step 1: Write GET /api/tasks**

Create `src/app/api/tasks/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees, taskOutputs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "running" | "completed" | "failed" | null;
  const team = searchParams.get("team") as "management" | "design" | "production" | null;
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const conditions = [];
  if (status) conditions.push(eq(tasks.status, status));
  if (team) conditions.push(eq(tasks.team, team));

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
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.startTime))
    .limit(limit);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Write GET /api/tasks/:taskId**

Create `src/app/api/tasks/[taskId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees, taskOutputs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
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
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(eq(tasks.id, params.taskId))
    .get();

  if (!taskRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outputs = await db
    .select()
    .from(taskOutputs)
    .where(eq(taskOutputs.taskId, params.taskId));

  return NextResponse.json({ ...taskRow, outputs });
}
```

- [ ] **Step 3: Test routes**

```bash
curl "http://localhost:3000/api/tasks?status=running&limit=5" | python3 -m json.tool
curl "http://localhost:3000/api/tasks?status=completed&limit=5" | python3 -m json.tool
```

Expected: JSON arrays with task records and `employeeName` field.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/
git commit -m "feat: add task list and detail API routes"
```

---

### Task 3: Running Tasks Panel

**Files:**
- Create: `src/components/production/running-tasks-panel.tsx`

- [ ] **Step 1: Write RunningTasksPanel**

Create `src/components/production/running-tasks-panel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RunningTask {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  team: string;
  employeeName: string;
}

const TEAM_GRADIENT: Record<string, string> = {
  management: "from-purple-500/10 to-purple-500/5",
  design: "from-blue-500/10 to-blue-500/5",
  production: "from-green-500/10 to-green-500/5",
};

const TEAM_LABEL: Record<string, string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
};

function formatDuration(startTime: string | null): string {
  if (!startTime) return "—";
  const diff = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟`;
  return `${Math.floor(mins / 60)}小时${mins % 60}分`;
}

export function RunningTasksPanel() {
  const [tasks, setTasks] = useState<RunningTask[]>([]);
  const [teamFilter, setTeamFilter] = useState("all");

  const fetchTasks = async () => {
    const url = teamFilter !== "all"
      ? `/api/tasks?status=running&team=${teamFilter}`
      : `/api/tasks?status=running`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [teamFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">实时任务面板</h2>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {tasks.length} 个任务执行中
          </span>
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
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
          <Card key={task.id} className={cn("relative overflow-hidden", `bg-gradient-to-br ${TEAM_GRADIENT[task.team]}`)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{task.employeeName}</p>
                  <p className="font-medium text-sm truncate">{task.name}</p>
                </div>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs flex-shrink-0">
                  执行中
                </Badge>
              </div>
              <Progress value={task.progress} className="h-1.5 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{task.currentStep ?? "处理中..."}</span>
                <span className="font-bold text-primary">{task.progress}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">已运行 {formatDuration(task.startTime)}</p>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-3">当前没有执行中的任务</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Install Progress component**

```bash
npx shadcn@latest add progress
```

- [ ] **Step 3: Commit**

```bash
git add src/components/production/running-tasks-panel.tsx
git commit -m "feat: add real-time running tasks panel"
```

---

### Task 4: Task History Table

**Files:**
- Create: `src/components/production/task-history-table.tsx`

- [ ] **Step 1: Install shadcn Table**

```bash
npx shadcn@latest add table
```

- [ ] **Step 2: Write TaskHistoryTable**

Create `src/components/production/task-history-table.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, ExternalLink } from "lucide-react";

interface HistoryTask {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  startTime: string | null;
  actualEndTime: string | null;
  team: string;
  employeeName: string;
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completed: { label: "已完成", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "失败", className: "bg-red-500/20 text-red-400 border-red-500/30" },
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

  const filtered = useMemo(() => {
    return initialTasks.filter((t) => {
      const matchSearch = !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        t.type.toLowerCase().includes(search.toLowerCase());
      const matchTeam = teamFilter === "all" || t.team === teamFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchTeam && matchStatus;
    });
  }, [initialTasks, search, teamFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索任务..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
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
              <TableHead>开始时间</TableHead>
              <TableHead>完成时间</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((task) => (
              <TableRow key={task.id} className="group">
                <TableCell className="font-medium max-w-[200px] truncate">{task.name}</TableCell>
                <TableCell className="text-muted-foreground">{task.employeeName}</TableCell>
                <TableCell className="text-muted-foreground">{task.type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[task.status].className)}>
                    {STATUS_CONFIG[task.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(task.startTime)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(task.actualEndTime)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{calcDuration(task.startTime, task.actualEndTime)}</TableCell>
                <TableCell>
                  <Link href={`/production/${task.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/production/task-history-table.tsx
git commit -m "feat: add task history table with search and filters"
```

---

### Task 5: Production Board Page

**Files:**
- Modify: `src/app/production/page.tsx`
- Create: `src/app/production/[taskId]/page.tsx`
- Create: `src/components/production/task-detail.tsx`

- [ ] **Step 1: Update production page**

Replace `src/app/production/page.tsx`:

```tsx
import { RunningTasksPanel } from "@/components/production/running-tasks-panel";
import { TaskHistoryTable } from "@/components/production/task-history-table";

async function getHistory() {
  const res = await fetch("http://localhost:3000/api/tasks?limit=100", {
    cache: "no-store",
  });
  return res.json();
}

export default async function ProductionPage() {
  const tasks = await getHistory();

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">生产看板</h1>
        <p className="text-muted-foreground mt-1">AI团队实时工作状态与历史记录</p>
      </div>
      <RunningTasksPanel />
      <div>
        <h2 className="text-lg font-semibold mb-4">历史任务</h2>
        <TaskHistoryTable initialTasks={tasks} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write TaskDetail component**

Create `src/components/production/task-detail.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Output {
  id: string;
  taskId: string;
  type: string;
  title: string;
  content: string | null;
  url: string | null;
  createdAt: string | null;
}

interface TaskDetailData {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  actualEndTime: string | null;
  team: string;
  employeeId: string;
  employeeName: string;
  outputs: Output[];
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completed: { label: "已完成", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "失败", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("zh-CN");
}

export function TaskDetail({ task }: { task: TaskDetailData }) {
  const status = STATUS_CONFIG[task.status];
  return (
    <div className="p-8 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/production">
          <ArrowLeft className="h-4 w-4 mr-1" />返回生产看板
        </Link>
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{task.name}</h1>
            <Badge variant="outline" className={status.className}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            执行者：
            <Link href={`/roster/${task.employeeId}`} className="text-primary hover:underline">
              {task.employeeName}
            </Link>
            {" · "}类型：{task.type}
          </p>
        </div>

        {/* Progress */}
        {task.status === "running" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{task.currentStep ?? "处理中..."}</span>
                <span className="font-bold text-primary">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">执行时间线</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">开始时间</span>
              <span>{fmt(task.startTime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">预计完成</span>
              <span>{fmt(task.estimatedEndTime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">实际完成</span>
              <span>{fmt(task.actualEndTime)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        {task.outputs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">产出内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.outputs.map((output) => (
                <div key={output.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{output.title}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{output.type}</Badge>
                  </div>
                  {output.content && (
                    <p className="text-sm text-muted-foreground mt-1">{output.content}</p>
                  )}
                  {output.url && (
                    <a href={output.url} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1" target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="h-3 w-3" />查看资源
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {task.outputs.length === 0 && (
          <p className="text-sm text-muted-foreground">暂无产出记录</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write task detail page**

Create `src/app/production/[taskId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/production/task-detail";

async function getTask(id: string) {
  const res = await fetch(`http://localhost:3000/api/tasks/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.error) return null;
  return data;
}

export default async function TaskDetailPage({ params }: { params: { taskId: string } }) {
  const task = await getTask(params.taskId);
  if (!task) notFound();
  return <TaskDetail task={task} />;
}
```

- [ ] **Step 4: Verify production board**

With dev server running, open `http://localhost:3000/production`:
- Top section shows running task cards with progress bars
- Bottom section shows history table with search/filter
- Clicking the external link icon on a row navigates to task detail

- [ ] **Step 5: Commit**

```bash
git add src/app/production/ src/components/production/task-detail.tsx
git commit -m "feat: complete production board with running tasks, history table, and task detail"
```

---

### Task 6: Org Chart

**Files:**
- Create: `src/components/org/org-chart.tsx`
- Modify: `src/app/org/page.tsx`

- [ ] **Step 1: Write OrgChart component**

Create `src/components/org/org-chart.tsx`:

```tsx
"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";

interface OrgEmployee {
  id: string;
  name: string;
  title: string;
  team: string;
  status: "active" | "developing" | "planned";
}

interface OrgChartProps {
  employees: OrgEmployee[];
}

const STATUS_COLOR: Record<string, string> = {
  active: "#00ff88",
  developing: "#ffd93d",
  planned: "#64748b",
};

const TEAM_COLOR: Record<string, string> = {
  management: "#c084fc",
  design: "#00d4ff",
  production: "#00ff88",
};

const TEAM_LABEL: Record<string, string> = {
  management: "AI管理团队",
  design: "AI设计师团队",
  production: "AI生产团队",
};

// Layout constants
const COL_WIDTH = 180;
const ROW_HEIGHT = 90;
const TEAM_X: Record<string, number> = {
  management: 0,
  design: 10,
  production: 5,
};

function buildLayout(employees: OrgEmployee[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Root node
  nodes.push({
    id: "root",
    position: { x: 600, y: 0 },
    data: { label: "AI Workforce" },
    style: {
      background: "linear-gradient(135deg, #1a1a2e, #0a0a1a)",
      border: "1.5px solid #00d4ff",
      borderRadius: 12,
      color: "#00d4ff",
      fontWeight: 700,
      fontSize: 14,
      padding: "8px 16px",
      minWidth: 140,
      textAlign: "center",
      boxShadow: "0 0 20px rgba(0,212,255,0.3)",
    },
  });

  const teams: Array<"management" | "design" | "production"> = ["management", "design", "production"];
  const teamXPositions: Record<string, number> = { management: 100, design: 600, production: 1050 };

  teams.forEach((team) => {
    const color = TEAM_COLOR[team];
    const teamId = `team-${team}`;
    const teamEmps = employees.filter((e) => e.team === team);

    // Team node
    nodes.push({
      id: teamId,
      position: { x: teamXPositions[team], y: 120 },
      data: { label: `${TEAM_LABEL[team]}\n(${teamEmps.length}人)` },
      style: {
        background: "linear-gradient(135deg, #1a1a2e, #0a0a1a)",
        border: `1.5px solid ${color}`,
        borderRadius: 10,
        color,
        fontWeight: 600,
        fontSize: 12,
        padding: "6px 14px",
        minWidth: 130,
        textAlign: "center",
        whiteSpace: "pre-line",
      },
    });

    // Root → Team edge
    edges.push({
      id: `e-root-${team}`,
      source: "root",
      target: teamId,
      style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
    });

    // Employee nodes
    const cols = Math.min(4, teamEmps.length);
    teamEmps.forEach((emp, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const empX = teamXPositions[team] + (col - (cols - 1) / 2) * COL_WIDTH;
      const empY = 250 + row * ROW_HEIGHT;

      nodes.push({
        id: emp.id,
        position: { x: empX, y: empY },
        data: {
          label: emp.name,
          title: emp.title,
          status: emp.status,
          employeeId: emp.id,
        },
        type: "employeeNode",
        style: {
          background: "linear-gradient(135deg, #1a1a2e, #0a0a1a)",
          border: `1.5px solid ${STATUS_COLOR[emp.status]}40`,
          borderRadius: 8,
          color: "#e2e8f0",
          fontSize: 11,
          padding: "6px 10px",
          minWidth: 120,
          textAlign: "center",
          cursor: "pointer",
        },
      });

      edges.push({
        id: `e-${teamId}-${emp.id}`,
        source: teamId,
        target: emp.id,
        style: { stroke: color, strokeWidth: 1, opacity: 0.4 },
      });
    });
  });

  return { nodes, edges };
}

export function OrgChart({ employees }: OrgChartProps) {
  const router = useRouter();
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(employees),
    [employees]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.data.employeeId) {
        router.push(`/roster/${node.data.employeeId}`);
      }
    },
    [router]
  );

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.3}
        maxZoom={2}
        style={{ background: "#0a0a1a" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls
          style={{
            background: "#1a1a2e",
            border: "1px solid #334155",
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{ background: "#1a1a2e", border: "1px solid #334155" }}
          nodeColor={(node) => {
            if (node.id === "root") return "#00d4ff";
            if (node.id.startsWith("team-")) {
              const team = node.id.replace("team-", "");
              return TEAM_COLOR[team] ?? "#334155";
            }
            const emp = employees.find((e) => e.id === node.id);
            return emp ? STATUS_COLOR[emp.status] : "#334155";
          }}
        />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Update org page**

Replace `src/app/org/page.tsx`:

```tsx
import { OrgChart } from "@/components/org/org-chart";

async function getEmployees() {
  const res = await fetch("http://localhost:3000/api/employees", { cache: "no-store" });
  const data = await res.json();
  return data.map((e: any) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    team: e.team,
    status: e.status,
  }));
}

export default async function OrgPage() {
  const employees = await getEmployees();

  return (
    <div className="flex flex-col h-screen">
      <div className="px-8 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">AI团队组织架构</h1>
        <p className="text-sm text-muted-foreground">点击员工节点跳转详情 · 支持拖拽和缩放</p>
      </div>
      <div className="flex-1">
        <OrgChart employees={employees} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify org chart**

With dev server running, open `http://localhost:3000/org`:
- Tree should show root → 3 team nodes → employee nodes
- Zoom/pan should work
- Clicking an employee node should navigate to their roster detail page

- [ ] **Step 4: Commit**

```bash
git add src/components/org/ src/app/org/
git commit -m "feat: add interactive org chart with React Flow"
```

---

### Task 7: Metric Config API

**Files:**
- Create: `src/app/api/metric-configs/route.ts`
- Create: `src/app/api/metric-configs/[id]/route.ts`

- [ ] **Step 1: Seed default metric configs**

Add to the bottom of `seed()` in `src/db/seed.ts`, before the final `console.log`:

```typescript
  await db.delete(metricConfigs);
  const DEFAULT_TASK_TYPES = [
    { taskType: "项目审计", humanBaseline: 4, description: "人工审计一个项目约4小时" },
    { taskType: "PRD编写", humanBaseline: 8, description: "人工写一份PRD约1天" },
    { taskType: "人员盘点", humanBaseline: 6, description: "人工盘点一次约6小时" },
    { taskType: "脚本创作", humanBaseline: 3, description: "人工写一篇脚本约3小时" },
    { taskType: "资源入库", humanBaseline: 0.5, description: "人工处理一条资源约30分钟" },
    { taskType: "内容质检", humanBaseline: 0.25, description: "人工质检一条内容约15分钟" },
  ];
  for (const cfg of DEFAULT_TASK_TYPES) {
    await db.insert(metricConfigs).values({
      id: randomUUID(),
      employeeId: null,
      taskType: cfg.taskType,
      humanBaseline: cfg.humanBaseline,
      costPerHour: 46.875,
      description: cfg.description,
      updatedAt: now,
    });
  }
```

Also add `import { metricConfigs } from "./schema";` at the top of seed.ts if not already imported.

Re-run seeder:
```bash
npm run db:seed
```

Expected: `Seeded 24 employees.`

- [ ] **Step 2: Write metric-configs route**

Create `src/app/api/metric-configs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = await db.select().from(metricConfigs);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();
  await db.insert(metricConfigs).values({
    id,
    employeeId: body.employeeId ?? null,
    taskType: body.taskType,
    humanBaseline: body.humanBaseline,
    costPerHour: body.costPerHour ?? 46.875,
    description: body.description ?? null,
    updatedAt: new Date(),
  });
  const created = await db.select().from(metricConfigs).where(eq(metricConfigs.id, id)).get();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 3: Write metric-configs/:id route**

Create `src/app/api/metric-configs/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  await db
    .update(metricConfigs)
    .set({
      taskType: body.taskType,
      humanBaseline: body.humanBaseline,
      costPerHour: body.costPerHour,
      description: body.description,
      updatedAt: new Date(),
    })
    .where(eq(metricConfigs.id, params.id));
  const updated = await db.select().from(metricConfigs).where(eq(metricConfigs.id, params.id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await db.delete(metricConfigs).where(eq(metricConfigs.id, params.id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/metric-configs/ src/db/seed.ts
git commit -m "feat: add metric config API routes and seed default configs"
```

---

### Task 8: Settings Page

**Files:**
- Create: `src/components/settings/employee-manager.tsx`
- Create: `src/components/settings/metric-config-manager.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Install additional shadcn components**

```bash
npx shadcn@latest add alert-dialog
```

- [ ] **Step 2: Write EmployeeManager**

Create `src/components/settings/employee-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { EmployeeListItem } from "@/lib/types";

interface EmployeeManagerProps {
  initialEmployees: EmployeeListItem[];
}

const STATUS_CONFIG = {
  active: { label: "在岗", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  developing: { label: "开发中", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  planned: { label: "规划中", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export function EmployeeManager({ initialEmployees }: EmployeeManagerProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", team: "management", status: "planned" });

  const handleCreate = async () => {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const created = await res.json();
    setEmployees((prev) => [...prev, { ...created, monthlyTaskCount: 0, adoptionRate: null, accuracyRate: null }]);
    setForm({ name: "", title: "", team: "management", status: "planned" });
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">AI员工列表 ({employees.length}人)</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />新增员工</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增 AI 员工</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>名称</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：AI数据分析师" />
              </div>
              <div>
                <Label>职位</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：数据分析专家" />
              </div>
              <div>
                <Label>所属团队</Label>
                <Select value={form.team} onValueChange={(v) => setForm({ ...form, team: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="management">管理团队</SelectItem>
                    <SelectItem value="design">设计师团队</SelectItem>
                    <SelectItem value="production">生产团队</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>状态</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">在岗</SelectItem>
                    <SelectItem value="developing">开发中</SelectItem>
                    <SelectItem value="planned">规划中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.name || !form.title}>
                创建员工
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {employees.map((emp) => (
          <div key={emp.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{emp.name}</span>
                <Badge variant="outline" className={STATUS_CONFIG[emp.status].className}>
                  {STATUS_CONFIG[emp.status].label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{emp.title}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除「{emp.name}」吗？此操作不可撤销，相关技能、指标和任务数据也将一并删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(emp.id)} className="bg-destructive text-destructive-foreground">
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write MetricConfigManager**

Create `src/components/settings/metric-config-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Check, X } from "lucide-react";

interface MetricConfig {
  id: string;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

export function MetricConfigManager({ initialConfigs }: { initialConfigs: MetricConfig[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfig>>({});

  const startEdit = (cfg: MetricConfig) => {
    setEditingId(cfg.id);
    setEditForm({ taskType: cfg.taskType, humanBaseline: cfg.humanBaseline, costPerHour: cfg.costPerHour, description: cfg.description ?? "" });
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/metric-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">指标基准配置</h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>任务类型</TableHead>
              <TableHead>人工基准耗时 (h)</TableHead>
              <TableHead>时薪 (¥/h)</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((cfg) => (
              <TableRow key={cfg.id}>
                <TableCell>
                  {editingId === cfg.id ? (
                    <Input value={editForm.taskType} onChange={(e) => setEditForm({ ...editForm, taskType: e.target.value })} className="h-7 text-sm" />
                  ) : (
                    cfg.taskType
                  )}
                </TableCell>
                <TableCell>
                  {editingId === cfg.id ? (
                    <Input type="number" value={editForm.humanBaseline} onChange={(e) => setEditForm({ ...editForm, humanBaseline: parseFloat(e.target.value) })} className="h-7 text-sm w-20" />
                  ) : (
                    cfg.humanBaseline
                  )}
                </TableCell>
                <TableCell>
                  {editingId === cfg.id ? (
                    <Input type="number" value={editForm.costPerHour} onChange={(e) => setEditForm({ ...editForm, costPerHour: parseFloat(e.target.value) })} className="h-7 text-sm w-24" />
                  ) : (
                    `¥${cfg.costPerHour}`
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {editingId === cfg.id ? (
                    <Input value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="h-7 text-sm" />
                  ) : (
                    cfg.description ?? "—"
                  )}
                </TableCell>
                <TableCell>
                  {editingId === cfg.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(cfg.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cfg)}><Pencil className="h-3.5 w-3.5" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update settings page**

Replace `src/app/settings/page.tsx`:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeManager } from "@/components/settings/employee-manager";
import { MetricConfigManager } from "@/components/settings/metric-config-manager";

async function getData() {
  const [employees, metricConfigs] = await Promise.all([
    fetch("http://localhost:3000/api/employees", { cache: "no-store" }).then((r) => r.json()),
    fetch("http://localhost:3000/api/metric-configs", { cache: "no-store" }).then((r) => r.json()),
  ]);
  return { employees, metricConfigs };
}

export default async function SettingsPage() {
  const { employees, metricConfigs } = await getData();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground mt-1">管理 AI 员工与指标基准配置</p>
      </div>
      <Tabs defaultValue="employees">
        <TabsList className="mb-6">
          <TabsTrigger value="employees">员工管理</TabsTrigger>
          <TabsTrigger value="metrics">指标配置</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <EmployeeManager initialEmployees={employees} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricConfigManager initialConfigs={metricConfigs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Verify settings page**

With dev server running, open `http://localhost:3000/settings`:
- "员工管理" tab shows all 24 employees with delete confirmation dialog
- "指标配置" tab shows editable table of metric baselines
- Creating a new employee adds it to the list immediately

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ src/app/settings/ src/app/api/metric-configs/
git commit -m "feat: complete settings page with employee CRUD and metric config"
```

---

### Task 9: Phase 3 Final Check

- [ ] **Step 1: Build check**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Final commit and tag**

```bash
git add .
git commit -m "chore: phase 3 complete — production board, org chart, settings"
git tag phase-3-complete
```
