# Batch 4: 联动跳转系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all cross-page navigation: dashboard KPIs → target pages, heatmap/leaderboard → employee modal, org chart → employee modal, roster → production, production → dashboard. Make employee-detail-modal a shared component callable from any page.

**Architecture:** Move employee-detail-modal to src/components/shared/, make it self-contained (fetches own data). Each page reads searchParams for highlight/filter state. Cross-filtering within dashboard uses lifted React state. Router.push for page navigation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-18-dashboard-org-gamification-design.md` — Section 6

---

## Task 1: Move Employee Detail Modal to Shared

**Files:**
- Move: `src/components/roster/employee-detail-modal.tsx` → `src/components/shared/employee-detail-modal.tsx`
- Modify: `src/components/roster/employee-grid.tsx` (update import path)

**Current modal props interface** (already self-contained, no content changes needed):
```ts
interface EmployeeDetailModalProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```
The component already fetches its own data via `/api/employees/${employeeId}` internally.

- [ ] Step 1: Copy `src/components/roster/employee-detail-modal.tsx` to `src/components/shared/employee-detail-modal.tsx`. No content changes needed — internal tab imports (`@/components/roster/tabs/*`) remain valid since they use path aliases.

- [ ] Step 2: Update `src/components/roster/employee-grid.tsx` line 7:
  ```ts
  // Before:
  import { EmployeeDetailModal } from "./employee-detail-modal";
  // After:
  import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal";
  ```

- [ ] Step 3: Delete `src/components/roster/employee-detail-modal.tsx` (the old file).

- [ ] Step 4: Run `npx tsc --noEmit` — verify no import errors.

---

## Task 2: Dashboard Navigation — KPI Cards

**Files:**
- Modify: `src/components/dashboard/kpi-card.tsx` — add optional `onClick` prop
- Modify: `src/components/dashboard/kpi-section.tsx` — pass onClick handlers
- Modify: `src/components/dashboard/dashboard-shell.tsx` — add `"use client"`, router, pass handlers

**Current state:** `KpiCard` has no `onClick` prop. `DashboardShell` is a server component (no `"use client"`). `KpiSection` passes only `data`.

- [ ] Step 1: Add `onClick?: () => void` to `KpiCardProps` in `src/components/dashboard/kpi-card.tsx` and wire it to the Card element:

  ```tsx
  // In kpi-card.tsx — add to interface (after accent line):
  onClick?: () => void;

  // Change the Card opening tag to:
  <Card
    className={cn("relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow", props.onClick && "cursor-pointer")}
    onClick={props.onClick}
  >
  ```

  Full updated interface:
  ```ts
  interface KpiCardProps {
    title: string;
    numericValue: number;
    displaySuffix?: string;
    displayPrefix?: string;
    decimals?: number;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
    trendLabel?: string;
    accent?: "blue" | "green" | "yellow" | "purple" | "red";
    onClick?: () => void;
  }
  ```

- [ ] Step 2: Add `onNavigate` callbacks to `KpiSection` props and wire them:

  ```tsx
  // src/components/dashboard/kpi-section.tsx
  interface KpiSectionProps {
    data: KpiItem[];
    onNavigateRoster?: () => void;
    onNavigateProduction?: () => void;
    onNavigateProductionQuality?: () => void;
  }

  export function KpiSection({ data, onNavigateRoster, onNavigateProduction, onNavigateProductionQuality }: KpiSectionProps) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="AI员工"
          // ...existing props...
          onClick={onNavigateRoster}
        />
        <KpiCard
          title="本月任务量"
          // ...existing props...
          onClick={onNavigateProduction}
        />
        <KpiCard
          title="节省人力"
          // ...existing props (no onClick — page-scroll target not implemented)...
        />
        <KpiCard
          title="平均采纳率"
          // ...existing props...
          onClick={onNavigateProductionQuality}
        />
        <KpiCard
          title="平均准确率"
          // ...existing props (no onClick)...
        />
        <KpiCard
          title="覆盖业务数"
          // ...existing props (no onClick)...
        />
      </div>
    );
  }
  ```

  Keep all existing prop values exactly as they are — only add `onClick` to the three wired cards.

- [ ] Step 3: Add `"use client"` directive and `useRouter` to `src/components/dashboard/dashboard-shell.tsx`, then wire KPI navigation handlers. **Do not rewrite the component** — make only these additions:

  ```tsx
  // 1. Add at the very top of the file (before any existing imports):
  "use client";

  // 2. Add to the import block:
  import { useRouter } from "next/navigation";

  // 3. Inside DashboardShell, add after the opening brace:
  const router = useRouter();

  // 4. On the existing <KpiSection> element, add the three onClick props:
  <KpiSection
    data={kpiItems}
    onNavigateRoster={() => router.push("/roster")}
    onNavigateProduction={() => router.push("/production")}
    onNavigateProductionQuality={() => router.push("/production?sort=quality")}
  />
  ```

  **DashboardShellProps is NOT changing** — it already uses the Batch 1 interface:
  ```ts
  interface DashboardShellProps {
    summary: DashboardSummary;
    teamStatus: TeamStatus[];
    kpiItems: KpiItem[];
    efficiencyTrend: TeamEfficiencyPoint[];
    heatmapData: HeatmapEntry[];
    leaderboard: LeaderboardEntry[];
    recentTasks: RecentTaskEntry[];
  }
  ```
  Pass `kpiItems` (not `summary`) to `<KpiSection data={...}>` to match the Batch 1 prop name.

  **Note:** `dashboard/page.tsx` is a server component that renders `<DashboardShell>`. Since `DashboardShell` is now `"use client"`, `page.tsx` passes plain serializable props to it — this is valid Next.js 16 server→client boundary usage.

- [ ] Step 4: Run `npx tsc --noEmit`.

---

## Task 3: Dashboard Modal Integration — Heatmap + Leaderboard + Task Feed

**Files:**
- Modify: `src/components/dashboard/activity-heatmap.tsx` — add `onEmployeeClick` prop
- Modify: `src/components/dashboard/task-feed.tsx` — add click navigation
- Modify: `src/components/dashboard/dashboard-shell.tsx` — add modal state, wire heatmap click, render modal

**Current state:** `ActivityHeatmap` accepts `{ data: HeatmapData }` with no click handler. `TaskFeed` renders task rows as plain divs. No leaderboard component exists yet (leaderboard is spec-planned but not yet built; skip leaderboard wiring — it will be added when the component is built).

- [ ] Step 1: Add `onEmployeeClick?: (employeeId: string) => void` prop to `ActivityHeatmap`.

  In `src/components/dashboard/activity-heatmap.tsx`:
  ```tsx
  // Update function signature:
  export function ActivityHeatmap({ data, onEmployeeClick }: { data: HeatmapData; onEmployeeClick?: (employeeId: string) => void })
  ```

  Inspect the existing ECharts option to find where employee names/ids are rendered. Add an `onEvents` prop to `<ReactECharts>`:
  ```tsx
  const onEvents = onEmployeeClick ? {
    click: (params: { value: unknown[]; name: string }) => {
      // heatmap y-axis name is the employee name; look up id from data
      const emp = data.employees?.find((e) => e.name === params.name);
      if (emp?.id) onEmployeeClick(emp.id);
    },
  } : undefined;

  // On ReactECharts element, add:
  // onEvents={onEvents}
  ```

  **Important:** First read the full `ActivityHeatmap` implementation to understand the exact ECharts data shape (`data.employees` field may differ) and adjust the click handler accordingly. The key is mapping the clicked y-axis label back to an employee id.

- [ ] Step 2: Add click navigation to task rows in `src/components/dashboard/task-feed.tsx`:

  Add `useRouter` import and wire each task div:
  ```tsx
  "use client"; // already is client (uses useState/useEffect)

  import { useRouter } from "next/navigation";
  // ...existing imports...

  export function TaskFeed() {
    const router = useRouter();
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    // ...existing fetch logic unchanged...

    return (
      <Card>
        {/* ...header unchanged... */}
        <CardContent className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => router.push(`/production?task=${task.id}`)}
              className="flex items-center gap-3 rounded-lg p-2.5 bg-card/50 border border-border/50 hover:border-border transition-colors cursor-pointer"
            >
              {/* ...inner content unchanged... */}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] Step 3: Add modal state to `DashboardShell` and wire heatmap click:

  ```tsx
  // src/components/dashboard/dashboard-shell.tsx — add to imports:
  import { useState } from "react";
  import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal";

  // Inside DashboardShell, after const router:
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function openEmployeeModal(id: string) {
    setSelectedEmployeeId(id);
    setModalOpen(true);
  }

  // Pass to ActivityHeatmap (use heatmapData — the Batch 1 prop name):
  <ActivityHeatmap data={heatmapData} onEmployeeClick={openEmployeeModal} />

  // At the bottom of the return, before closing </div>:
  <EmployeeDetailModal
    employeeId={selectedEmployeeId}
    open={modalOpen}
    onOpenChange={setModalOpen}
  />
  ```

- [ ] Step 4: Run `npx tsc --noEmit`.

---

## Task 4: Org Chart Modal Integration

**Files:**
- Modify: `src/components/org/org-chart-client.tsx`

**Current state:** `OrgChartClient` uses `router.push('/roster/${node.data.employeeId}')` on node click — a full page navigation. Replace with in-place modal.

- [ ] Step 1: Add modal state and render `EmployeeDetailModal` in `OrgChartClient`:

  ```tsx
  // src/components/org/org-chart-client.tsx — update imports:
  import { useCallback, useMemo, useState } from "react";
  // ...existing react-flow imports...
  import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal";
  // Remove: import { useRouter } from "next/navigation";  (no longer needed)

  export function OrgChartClient({ employees }: OrgChartClientProps) {
    // Remove: const router = useRouter();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
      () => buildLayout(employees),
      [employees]
    );

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    const onNodeClick = useCallback(
      (_: React.MouseEvent, node: Node) => {
        if (node.data.employeeId) {
          setSelectedEmployeeId(node.data.employeeId as string);
          setModalOpen(true);
        }
      },
      []
    );

    return (
      <>
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
            style={{ background: "#f8fafc" }}
          >
            {/* ...Background, Controls, MiniMap unchanged... */}
          </ReactFlow>
        </div>
        <EmployeeDetailModal
          employeeId={selectedEmployeeId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </>
    );
  }
  ```

- [ ] Step 2: Run `npx tsc --noEmit`.

---

## Task 5: Org Chart URL Params (team filter + highlight)

**Files:**
- Modify: `src/app/org/page.tsx` — read searchParams, pass to OrgChartClient
- Modify: `src/components/org/org-chart-client.tsx` — accept and apply initialTeam + highlight

**Current state:** `OrgPage` is a server component with no searchParams. `OrgChartClient` accepts only `{ employees }`.

- [ ] Step 1: Update `src/app/org/page.tsx` to read searchParams (Next.js 16: searchParams is a Promise):

  ```tsx
  // src/app/org/page.tsx
  import { db } from "@/db";
  import { employees } from "@/db/schema";
  import { OrgChartClient } from "@/components/org/org-chart-client";

  async function getEmployees() { /* unchanged */ }

  export default async function OrgPage({
    searchParams,
  }: {
    searchParams: Promise<{ team?: string; highlight?: string }>;
  }) {
    const { team, highlight } = await searchParams;
    const employeeList = await getEmployees();

    return (
      <div className="flex flex-col h-screen">
        <div className="px-8 py-4 border-b border-border">
          <h1 className="text-2xl font-bold">AI团队组织架构</h1>
          <p className="text-sm text-muted-foreground">
            点击员工节点查看详情 · 支持拖拽和缩放
          </p>
        </div>
        <div className="flex-1">
          <OrgChartClient
            employees={employeeList}
            initialTeam={team}
            highlight={highlight}
          />
        </div>
      </div>
    );
  }
  ```

- [ ] Step 2: Update `OrgChartClientProps` and `OrgChartClient` in `src/components/org/org-chart-client.tsx` to accept and apply the new props:

  ```tsx
  interface OrgChartClientProps {
    employees: OrgEmployee[];
    initialTeam?: string;
    highlight?: string;
  }

  export function OrgChartClient({ employees, initialTeam, highlight }: OrgChartClientProps) {
    // ...existing state...

    // Filter nodes by team when initialTeam is set
    // Team nodes have id like "team-management", employee nodes belong to a team.
    // Apply by filtering the displayed nodes (not the data):
    const visibleNodes = useMemo(() => {
      if (!initialTeam) return nodes;
      return nodes.map((node) => {
        // Hide nodes not belonging to the selected team
        // Root node always visible; team header nodes: show only matching team
        // Employee nodes: show only if their team matches
        if (node.id === "root") return node;
        if (node.id.startsWith("team-")) {
          return { ...node, hidden: node.id !== `team-${initialTeam}` };
        }
        const emp = employees.find((e) => e.id === node.id);
        return { ...node, hidden: emp ? emp.team !== initialTeam : true };
      });
    }, [nodes, initialTeam, employees]);

    // Apply highlight style to the matching node
    const displayNodes = useMemo(() => {
      if (!highlight) return visibleNodes;
      return visibleNodes.map((node) =>
        node.id === highlight
          ? {
              ...node,
              style: {
                ...node.style,
                border: "2px solid #f59e0b",
                transform: "scale(1.05)",
                boxShadow: "0 0 0 4px rgba(245,158,11,0.2)",
              },
            }
          : node
      );
    }, [visibleNodes, highlight]);

    // ...onNodeClick unchanged...

    return (
      <>
        <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
          <ReactFlow
            nodes={displayNodes}   // use displayNodes instead of nodes
            edges={edges}
            // ...rest unchanged...
          >
            {/* ...unchanged... */}
          </ReactFlow>
        </div>
        <EmployeeDetailModal
          employeeId={selectedEmployeeId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </>
    );
  }
  ```

- [ ] Step 3: Run `npx tsc --noEmit`.

---

## Task 6: Roster → Production Link

**Files:**
- Modify: `src/components/roster/employee-card.tsx` — add "查看任务" button

**Current state:** `EmployeeCard` has an `onClick` prop that triggers the detail modal. The card already has a "查看详情" button at the bottom. Add a secondary "查看任务" link alongside it.

- [ ] Step 1: Read `src/components/roster/employee-card.tsx` fully to understand the bottom button area before editing.

- [ ] Step 2: Add a "查看任务" link that navigates to `/production?employee=${employee.id}`. Import `useRouter` from `next/navigation` and add the second button:

  ```tsx
  "use client";

  import { useRouter } from "next/navigation";
  // ...existing imports (ArrowRight, AiAvatar, Badge, cn, EmployeeListItem)...

  export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
    const router = useRouter();

    // ...existing card JSX unchanged until the bottom button area...

    // Find the existing "查看详情" button and add a sibling "查看任务" button.
    // Change the button row from a single button to a flex row with two buttons:
    // <div className="flex gap-2">
    //   <button onClick={onClick} className="flex-1 ...existing classes...">查看详情 <ArrowRight /></button>
    //   <button onClick={() => router.push(`/production?employee=${employee.id}`)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">任务</button>
    // </div>
  }
  ```

  **Important:** Read the actual button HTML structure in the file before editing — adjust class names to match the existing design system. The "任务" button should be visually secondary (outline style) next to the primary "查看详情" button.

- [ ] Step 3: Run `npx tsc --noEmit`.

---

## Task 7: Production Page searchParams + Back Link

**Files:**
- Modify: `src/app/production/page.tsx` — read searchParams, pass to ProductionClient
- Modify: `src/components/production/time-range-selector.tsx` — accept and apply initial filters

**Current state:** `ProductionPage` takes no props. `ProductionClient` accepts only `{ initialTasks }`.

- [ ] Step 1: Update `src/app/production/page.tsx` to read searchParams:

  ```tsx
  // src/app/production/page.tsx
  import { db } from "@/db";
  import { tasks, employees } from "@/db/schema";
  import { desc, eq } from "drizzle-orm";
  import { ProductionClient } from "@/components/production/time-range-selector";

  async function getHistory() { /* unchanged */ }

  export default async function ProductionPage({
    searchParams,
  }: {
    searchParams: Promise<{ employee?: string; task?: string; sort?: string }>;
  }) {
    const { employee, task, sort } = await searchParams;
    const historyTasks = await getHistory();

    return (
      <div className="p-8">
        <ProductionClient
          initialTasks={historyTasks}
          initialEmployeeFilter={employee}
          initialTaskHighlight={task}
          initialSort={sort}
        />
      </div>
    );
  }
  ```

- [ ] Step 2: Update `ProductionClientProps` and `ProductionClient` in `src/components/production/time-range-selector.tsx`:

  ```tsx
  interface ProductionClientProps {
    initialTasks: Task[];  // existing type — keep whatever type is currently used
    initialEmployeeFilter?: string;
    initialTaskHighlight?: string;
    initialSort?: string;
  }

  export function ProductionClient({ initialTasks, initialEmployeeFilter, initialTaskHighlight, initialSort }: ProductionClientProps) {
    const [timeRange, setTimeRange] = useState("today");

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">生产看板</h1>
            <p className="text-muted-foreground mt-1">AI团队实时工作状态与数据分析</p>
          </div>
          {/* Time range selector — unchanged */}
          <div className="flex items-center gap-4">
            {/* Back to dashboard link */}
            <a
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 返回驾驶舱
            </a>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {/* ...TIME_RANGES buttons unchanged... */}
            </div>
          </div>
        </div>
        <ProductionStats timeRange={timeRange} />
        <ProductionTabs
          initialTasks={initialTasks}
          timeRange={timeRange}
          initialEmployeeFilter={initialEmployeeFilter}
          initialTaskHighlight={initialTaskHighlight}
          initialSort={initialSort}
        />
      </div>
    );
  }
  ```

- [ ] Step 3: Update `ProductionTabs` props interface in `src/components/production/production-tabs.tsx` to accept the new optional filter props. Implement employee filter as a `useMemo` filter on the task list; implement task highlight by auto-scrolling/highlighting the matching task card on mount.

  ```tsx
  // In ProductionTabs — add to props interface:
  initialEmployeeFilter?: string;
  initialTaskHighlight?: string;
  initialSort?: string;
  ```

  For the employee filter: filter `initialTasks` where `task.employeeId === initialEmployeeFilter` when set.
  For the task highlight: use a `useEffect` to scroll the element with `data-task-id={initialTaskHighlight}` into view after mount.
  For sort: if `initialSort === "quality"`, sort tasks by `qualityScore` descending.

  **Read the full `production-tabs.tsx` file first** to understand the current task rendering structure before adding these props.

- [ ] Step 4: Run `npx tsc --noEmit`.

---

## Task 8: Final Build Verification + Commit

- [ ] Step 1: Run `npx tsc --noEmit` — fix any remaining type errors.

- [ ] Step 2: Run `npm run build` — fix any build errors.

- [ ] Step 3: Commit:

  ```bash
  git add \
    src/components/shared/employee-detail-modal.tsx \
    src/components/roster/employee-grid.tsx \
    src/components/roster/employee-card.tsx \
    src/components/dashboard/kpi-card.tsx \
    src/components/dashboard/kpi-section.tsx \
    src/components/dashboard/dashboard-shell.tsx \
    src/components/dashboard/activity-heatmap.tsx \
    src/components/dashboard/task-feed.tsx \
    src/components/org/org-chart-client.tsx \
    src/app/org/page.tsx \
    src/app/production/page.tsx \
    src/components/production/time-range-selector.tsx \
    src/components/production/production-tabs.tsx
  git commit -m "feat: implement cross-page navigation and shared employee detail modal

  - Employee detail modal moved to src/components/shared/, usable from any page
  - Dashboard KPI cards navigate to /roster, /production, /production?sort=quality
  - Dashboard activity heatmap employee click opens employee detail modal
  - Dashboard task feed items navigate to /production?task=<id>
  - Org chart nodes open employee detail modal in-place (replaces router.push to /roster)
  - Org chart supports ?team=<name> filter and ?highlight=<id> node highlight
  - Roster employee cards have secondary '查看任务' button → /production?employee=<id>
  - Production page reads employee/task/sort searchParams for deep-linking
  - Production page header has '← 返回驾驶舱' back link

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Dashboard KPI "AI员工" → navigates to /roster
- [ ] Dashboard KPI "本月任务量" → navigates to /production
- [ ] Dashboard KPI "平均采纳率" → navigates to /production?sort=quality
- [ ] Dashboard heatmap employee row click → opens employee detail modal
- [ ] Dashboard task feed item click → navigates to /production?task=xxx
- [ ] Org chart node click → opens employee detail modal (no page navigation)
- [ ] /org?team=management → shows only management team nodes
- [ ] /org?highlight=<id> → highlighted node with gold border
- [ ] Roster employee card "查看任务" button → navigates to /production?employee=xxx
- [ ] /production?employee=xxx → filters task list to that employee
- [ ] /production?task=xxx → highlights/scrolls to that task
- [ ] Production page shows "← 返回驾驶舱" back link
- [ ] Employee detail modal works identically from dashboard, org chart, and roster
- [ ] Old path `src/components/roster/employee-detail-modal.tsx` is deleted (no stale file)

---

## Key Caveats for Implementer

1. **ActivityHeatmap ECharts data shape**: Before wiring the click handler, read the full component to find the exact data structure — the `data.employees` array with `{ id, name }` may be named differently. The ECharts `onEvents.click` params shape depends on the series type used.

2. **ProductionTabs task data shape**: Read `src/components/production/production-tabs.tsx` in full before adding filter props — the `initialTasks` type, field names (`employeeId` vs `employee_id`, `qualityScore` vs `quality_score`), and rendering structure must be confirmed before editing.

3. **EmployeeCard "查看任务" button placement**: Read the full `employee-card.tsx` (136 lines) before editing. The existing bottom button area may use `<button>` or `<div>` — match the existing pattern exactly.

4. **`"use client"` on dashboard-shell.tsx**: The parent `src/app/dashboard/page.tsx` is a server component. It fetches data and passes it as props to `DashboardShell`. This server→client boundary is valid because all props (summary, teamStatus, kpiItems, efficiencyTrend, heatmapData, leaderboard, recentTasks) are plain serializable data objects.

5. **Org chart `hidden` node filtering**: React Flow's `hidden` property on nodes hides them from the canvas. Verify the actual React Flow version in use supports this field — check `node_modules/@xyflow/react/package.json` for the version and read its docs if unsure.
