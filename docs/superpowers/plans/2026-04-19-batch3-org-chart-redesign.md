# Batch 3: 组织架构重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal org chart (default React Flow nodes with hardcoded coordinates) with a rich card-based force-directed graph featuring custom nodes with avatar, level, MBTI, streak, and interactive behaviors.

**Architecture:** Custom React Flow node component `EmployeeNode` replaces default nodes. Layout uses logical team-based positioning (not d3-force, to avoid adding a dependency) with proper spacing. Server component page.tsx fetches enriched employee data including persona + gamification stats, passes to client component.

**Tech Stack:** React Flow (@xyflow/react), React 19, TypeScript, Tailwind CSS v4, SVG

**Spec:** `docs/superpowers/specs/2026-04-18-dashboard-org-gamification-design.md` — Section 5

**Batch 1+2 prerequisites:** `src/lib/gamification.ts` (calculateLevel, calculateStreak, calculateTaskXp, etc.) and `src/lib/dashboard-data.ts` (getGamificationData()) must already be implemented.

---

## Task 1: Employee Node Data Types + Enriched Query

**Files:**
- Create: `src/components/org/types.ts`
- Modify: `src/app/org/page.tsx`

- [ ] **Step 1:** Create `src/components/org/types.ts` with the following complete content:

```ts
// src/components/org/types.ts
import type { TeamType, EmployeeStatus } from "@/lib/types"

export interface EmployeeNodeData {
  id: string
  name: string
  title: string
  team: TeamType
  status: EmployeeStatus
  avatar: string | null
  mbti: string | null
  personality: string[]   // first 2 items from persona.personality[]
  xp: number
  level: number
  levelEmoji: string
  levelColor: string
  levelProgress: number   // 0–1, progress within current level band
  streak: number
  monthlyTaskCount: number
}

export type NodeSize = "large" | "medium" | "small"

// Derive size from title / status
export function getNodeSize(title: string, status: EmployeeStatus): NodeSize {
  if (status === "planned") return "small"
  if (title.includes("总监") || title.includes("负责人")) return "large"
  return "medium"
}

export const NODE_WIDTH: Record<NodeSize, number> = {
  large: 140,
  medium: 120,
  small: 100,
}

export const NODE_HEIGHT: Record<NodeSize, number> = {
  large: 180,
  medium: 155,
  small: 128,
}
```

- [ ] **Step 2:** Rewrite `src/app/org/page.tsx` with the following complete content:

```tsx
// src/app/org/page.tsx
import { db } from "@/db"
import { employees, tasks } from "@/db/schema"
import { eq } from "drizzle-orm"
import { OrgChartClient } from "@/components/org/org-chart-client"
import type { EmployeeNodeData } from "@/components/org/types"
import type { EmployeePersona } from "@/lib/types"
import {
  calculateTaskXp,
  calculateLevel,
  calculateStreak,
} from "@/lib/gamification"

async function getEnrichedEmployees(): Promise<EmployeeNodeData[]> {
  // Fetch all employees with enriched columns
  const employeeRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      title: employees.title,
      team: employees.team,
      status: employees.status,
      avatar: employees.avatar,
      persona: employees.persona,
    })
    .from(employees)

  // Fetch completed tasks for XP/streak calculation
  const taskRows = await db
    .select({
      employeeId: tasks.employeeId,
      qualityScore: tasks.qualityScore,
      actualEndTime: tasks.actualEndTime,
      status: tasks.status,
    })
    .from(tasks)

  return employeeRows.map((emp) => {
    const empTasks = taskRows.filter(
      (t) => t.employeeId === emp.id && t.status === "completed"
    )

    // Parse persona for MBTI and personality tags
    let mbti: string | null = null
    let personality: string[] = []
    if (emp.persona) {
      try {
        const parsed = JSON.parse(emp.persona) as EmployeePersona
        mbti = parsed.mbti ?? null
        personality = (parsed.personality ?? []).slice(0, 2)
      } catch {
        // malformed JSON — ignore
      }
    }

    // Gamification computations
    const xp = calculateTaskXp(empTasks)
    const levelInfo = calculateLevel(xp)

    // Streak: collect unique active days from actualEndTime timestamps
    const activeDates = empTasks
      .filter((t) => t.actualEndTime != null)
      .map((t) => new Date(t.actualEndTime! * 1000).toISOString().slice(0, 10))
    const uniqueDates = [...new Set(activeDates)].sort()
    const streak = calculateStreak(uniqueDates)

    // Monthly task count (current calendar month)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const monthlyTaskCount = empTasks.filter((t) => {
      if (t.actualEndTime == null) return false
      const d = new Date(t.actualEndTime * 1000)
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
    }).length

    return {
      id: emp.id,
      name: emp.name,
      title: emp.title,
      team: emp.team as "management" | "design" | "production",
      status: emp.status as "active" | "developing" | "planned" | "inactive",
      avatar: emp.avatar,
      mbti,
      personality,
      xp,
      level: levelInfo.level,
      levelEmoji: levelInfo.emoji,
      levelColor: levelInfo.color,
      levelProgress: levelInfo.progress,
      streak,
      monthlyTaskCount,
    }
  })
}

interface OrgPageProps {
  searchParams: Promise<{ team?: string; highlight?: string }>
}

export default async function OrgPage({ searchParams }: OrgPageProps) {
  const [enrichedEmployees, params] = await Promise.all([
    getEnrichedEmployees(),
    searchParams,
  ])

  return (
    <div className="flex flex-col h-screen bg-background">
      <OrgChartClient
        employees={enrichedEmployees}
        initialTeamFilter={params.team ?? "all"}
        highlightId={params.highlight ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit` and fix any type errors before proceeding.

---

## Task 2: Custom Employee Node Component

**Files:**
- Create: `src/components/org/employee-node.tsx`

- [ ] **Step 1:** Create `src/components/org/employee-node.tsx` with the following complete content:

```tsx
// src/components/org/employee-node.tsx
"use client"

import { memo, useState } from "react"
import { Handle, Position } from "@xyflow/react"
import { AiAvatar } from "@/components/shared/ai-avatar"
import type { EmployeeNodeData, NodeSize } from "./types"
import { getNodeSize, NODE_WIDTH } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  developing: "#f59e0b",
  planned: "#94a3b8",
  inactive: "#ef4444",
}

const STATUS_LABEL: Record<string, string> = {
  active: "在职",
  developing: "培训中",
  planned: "规划中",
  inactive: "离职",
}

const TEAM_BORDER_COLOR: Record<string, string> = {
  management: "#8b5cf6",
  design: "#3b82f6",
  production: "#22c55e",
}

const AVATAR_SIZE: Record<NodeSize, "sm" | "md" | "lg"> = {
  large: "lg",
  medium: "md",
  small: "sm",
}

// SVG progress ring circumference for r=48: 2π×48 ≈ 301.6
const RING_CIRCUMFERENCE = 301.6

// ─── Component ────────────────────────────────────────────────────────────────

interface EmployeeNodeProps {
  data: EmployeeNodeData
  selected: boolean
}

export const EmployeeNode = memo(function EmployeeNode({
  data,
  selected,
}: EmployeeNodeProps) {
  const [hovered, setHovered] = useState(false)

  const size = getNodeSize(data.title, data.status)
  const width = NODE_WIDTH[size]
  const borderColor = TEAM_BORDER_COLOR[data.team] ?? "#94a3b8"
  const statusColor = STATUS_COLOR[data.status] ?? "#94a3b8"
  const dashOffset = RING_CIRCUMFERENCE * (1 - data.levelProgress)

  // Avatar container size by node size
  const avatarContainerSize =
    size === "large" ? 64 : size === "medium" ? 52 : 44

  return (
    <div
      style={{ width }}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* React Flow handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-400 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-slate-400 !border-0"
      />

      {/* Card */}
      <div
        style={{
          borderColor,
          transform: hovered ? "scale(1.05)" : "scale(1)",
          boxShadow: selected
            ? `0 0 0 2px ${borderColor}, 0 4px 20px rgba(0,0,0,0.15)`
            : hovered
            ? "0 4px 20px rgba(0,0,0,0.12)"
            : "0 2px 8px rgba(0,0,0,0.08)",
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        className="
          flex flex-col items-center gap-1 pb-2 pt-3 px-2
          bg-white/90 backdrop-blur-sm
          border-2 rounded-xl
          cursor-pointer select-none
        "
      >
        {/* Avatar with SVG progress ring */}
        <div
          className="relative flex-shrink-0"
          style={{ width: avatarContainerSize + 8, height: avatarContainerSize + 8 }}
        >
          {/* Ring SVG */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
            />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke={data.levelColor}
              strokeWidth="4"
              strokeDasharray={`${data.levelProgress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dasharray 400ms ease" }}
            />
          </svg>

          {/* Avatar centered inside ring */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ padding: 6 }}
          >
            <div
              className="rounded-full overflow-hidden"
              style={{ width: avatarContainerSize, height: avatarContainerSize }}
            >
              <AiAvatar
                employeeId={data.id}
                team={data.team}
                avatar={data.avatar}
                name={data.name}
                size={AVATAR_SIZE[size]}
              />
            </div>
          </div>

          {/* Status dot */}
          <span
            className="absolute bottom-0.5 right-0.5 block w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* Name */}
        <p
          className="font-bold text-center leading-tight text-slate-900 truncate w-full text-center"
          style={{ fontSize: size === "small" ? 11 : 13 }}
        >
          {data.name}
        </p>

        {/* Title */}
        <p
          className="text-slate-500 text-center truncate w-full text-center"
          style={{ fontSize: 10 }}
        >
          {data.title}
        </p>

        {/* Badge row */}
        <div className="flex flex-wrap justify-center gap-1 mt-0.5">
          {/* Level badge */}
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-white font-medium"
            style={{ fontSize: 9, backgroundColor: data.levelColor }}
          >
            Lv.{data.level} {data.levelEmoji}
          </span>

          {/* MBTI badge */}
          {data.mbti && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
              style={{ fontSize: 9 }}
            >
              {data.mbti}
            </span>
          )}

          {/* Streak badge (only show if streak > 0) */}
          {data.streak > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium"
              style={{ fontSize: 9 }}
            >
              🔥{data.streak}
            </span>
          )}
        </div>

        {/* Personality tags */}
        {data.personality.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {data.personality.map((tag) => (
              <span
                key={tag}
                className="inline-block px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 truncate max-w-[60px]"
                style={{ fontSize: 9 }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="
            absolute left-full top-0 ml-2 z-50
            bg-slate-900 text-white rounded-lg px-3 py-2
            shadow-xl pointer-events-none
            whitespace-nowrap
          "
          style={{ fontSize: 11 }}
        >
          <p className="font-semibold mb-1 text-slate-200">{data.name}</p>
          <p>本月任务：<span className="text-white font-bold">{data.monthlyTaskCount}</span> 个</p>
          <p>XP：<span className="text-yellow-400 font-bold">{data.xp.toLocaleString()}</span> 分</p>
          <p>等级：<span className="font-bold" style={{ color: data.levelColor }}>Lv.{data.level} {data.levelEmoji}</span></p>
          <p>状态：<span style={{ color: statusColor }}>{STATUS_LABEL[data.status]}</span></p>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 2:** Run `npx tsc --noEmit` and fix any type errors.

---

## Task 3: Org Controls + Legend Components

**Files:**
- Create: `src/components/org/org-controls.tsx`
- Create: `src/components/org/org-legend.tsx`

- [ ] **Step 1:** Create `src/components/org/org-controls.tsx` with the following complete content:

```tsx
// src/components/org/org-controls.tsx
"use client"

interface OrgControlsProps {
  teamFilter: string
  statusFilter: string
  onTeamFilter: (team: string) => void
  onStatusFilter: (status: string) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
}

export function OrgControls({
  teamFilter,
  statusFilter,
  onTeamFilter,
  onStatusFilter,
  onZoomIn,
  onZoomOut,
  onFitView,
}: OrgControlsProps) {
  return (
    <div
      className="
        absolute top-4 left-1/2 -translate-x-1/2 z-10
        flex items-center gap-3 px-4 py-2.5
        bg-white/80 backdrop-blur-md
        border border-slate-200/80 rounded-2xl shadow-lg
      "
    >
      {/* Title */}
      <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
        AI 团队组织架构
      </span>

      <div className="w-px h-5 bg-slate-200" />

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
        <button
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-white shadow-sm text-slate-800"
          style={{ fontSize: 11 }}
        >
          关系视图
        </button>
        <button
          disabled
          title="即将推出"
          className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 cursor-not-allowed"
          style={{ fontSize: 11 }}
        >
          网格视图
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomIn}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 text-base font-bold transition-colors"
          title="放大"
        >
          +
        </button>
        <button
          onClick={onZoomOut}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 text-base font-bold transition-colors"
          title="缩小"
        >
          −
        </button>
        <button
          onClick={onFitView}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="适应屏幕"
          style={{ fontSize: 14 }}
        >
          ⊡
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200" />

      {/* Team filter */}
      <select
        value={teamFilter}
        onChange={(e) => onTeamFilter(e.target.value)}
        className="
          text-xs px-2 py-1 rounded-lg border border-slate-200
          bg-white text-slate-700
          focus:outline-none focus:ring-1 focus:ring-slate-300
          cursor-pointer
        "
        style={{ fontSize: 11 }}
      >
        <option value="all">全部团队</option>
        <option value="management">管理团队</option>
        <option value="design">设计团队</option>
        <option value="production">生产团队</option>
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilter(e.target.value)}
        className="
          text-xs px-2 py-1 rounded-lg border border-slate-200
          bg-white text-slate-700
          focus:outline-none focus:ring-1 focus:ring-slate-300
          cursor-pointer
        "
        style={{ fontSize: 11 }}
      >
        <option value="all">全部状态</option>
        <option value="active">在职</option>
        <option value="developing">培训中</option>
        <option value="planned">规划中</option>
        <option value="inactive">离职</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2:** Create `src/components/org/org-legend.tsx` with the following complete content:

```tsx
// src/components/org/org-legend.tsx

export function OrgLegend() {
  return (
    <div
      className="
        absolute bottom-4 left-1/2 -translate-x-1/2 z-10
        flex items-center gap-5 px-4 py-2
        bg-white/80 backdrop-blur-md
        border border-slate-200/80 rounded-xl shadow-md
        text-slate-500
        whitespace-nowrap
      "
      style={{ fontSize: 10 }}
    >
      {/* Node sizes */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600">节点：</span>
        <span className="flex items-center gap-1">
          <span className="block w-4 h-4 rounded border-2 border-purple-400 bg-white" />
          核心管理层
        </span>
        <span className="flex items-center gap-1">
          <span className="block w-3.5 h-3.5 rounded border-2 border-blue-400 bg-white" />
          普通员工
        </span>
        <span className="flex items-center gap-1">
          <span className="block w-3 h-3 rounded border-2 border-slate-300 bg-white" />
          规划中
        </span>
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Line types */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600">连线：</span>
        <span className="flex items-center gap-1">
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#94a3b8" strokeWidth="1.5" /></svg>
          团队内
        </span>
        <span className="flex items-center gap-1">
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          跨团队协作
        </span>
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Status colors */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600">状态：</span>
        {[
          { color: "#22c55e", label: "在职" },
          { color: "#f59e0b", label: "培训中" },
          { color: "#94a3b8", label: "规划中" },
          { color: "#ef4444", label: "离职" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Team colors */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-600">团队：</span>
        {[
          { color: "#8b5cf6", label: "管理" },
          { color: "#3b82f6", label: "设计" },
          { color: "#22c55e", label: "生产" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="block w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit` and fix any type errors.

---

## Task 4: Main Org Chart Client Component

**Files:**
- Create: `src/components/org/org-chart-client.tsx`

- [ ] **Step 1:** Create `src/components/org/org-chart-client.tsx` with the following complete content:

```tsx
// src/components/org/org-chart-client.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { EmployeeNode } from "./employee-node"
import { OrgControls } from "./org-controls"
import { OrgLegend } from "./org-legend"
import type { EmployeeNodeData } from "./types"
import { getNodeSize, NODE_WIDTH, NODE_HEIGHT } from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_X = { management: 300, design: 850, production: 1400 } as const
const ROOT_X = 850   // horizontally centered across all three team columns
const ROOT_Y = 0
const TEAM_HEADER_Y = 140
const EMPLOYEE_START_Y = 320
const COL_WIDTH = 170
const ROW_HEIGHT = 200
const MAX_COLS = 4

const TEAM_COLOR = {
  management: "#8b5cf6",
  design: "#3b82f6",
  production: "#22c55e",
} as const

const TEAM_LABEL = {
  management: "AI 管理团队",
  design: "AI 设计师团队",
  production: "AI 生产团队",
} as const

const nodeTypes: NodeTypes = { employee: EmployeeNode as any }

// ─── Layout Builder ──────────────────────────────────────────────────────────

function buildOrgLayout(
  employees: EmployeeNodeData[],
  teamFilter: string,
  statusFilter: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Root node
  nodes.push({
    id: "root",
    type: "default",
    position: { x: ROOT_X - 80, y: ROOT_Y },
    data: { label: "AI Workforce Platform" },
    draggable: false,
    selectable: false,
    style: {
      background: "#1e293b",
      color: "#f8fafc",
      border: "none",
      borderRadius: 12,
      padding: "8px 20px",
      fontSize: 13,
      fontWeight: 700,
      width: 200,
    },
  })

  const teams: Array<"management" | "design" | "production"> = [
    "management",
    "design",
    "production",
  ]

  for (const team of teams) {
    const teamEmps = employees.filter((e) => e.team === team)
    const teamX = TEAM_X[team]
    const teamHeaderId = `team-${team}`
    const teamColor = TEAM_COLOR[team]

    // Team header node
    nodes.push({
      id: teamHeaderId,
      type: "default",
      position: { x: teamX - 60, y: TEAM_HEADER_Y },
      data: { label: `${TEAM_LABEL[team]}（${teamEmps.length}人）` },
      draggable: false,
      selectable: false,
      style: {
        background: `${teamColor}18`,
        color: teamColor,
        border: `2px solid ${teamColor}`,
        borderRadius: 10,
        padding: "6px 16px",
        fontSize: 12,
        fontWeight: 600,
        width: 160,
      },
    })

    // Root → team edge (dashed gray)
    edges.push({
      id: `root-${team}`,
      source: "root",
      target: teamHeaderId,
      style: { stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 4" },
      type: "smoothstep",
      animated: false,
    })

    // Employee nodes
    teamEmps.forEach((emp, i) => {
      const col = i % MAX_COLS
      const row = Math.floor(i / MAX_COLS)
      const nodeSize = getNodeSize(emp.title, emp.status)
      const nodeWidth = NODE_WIDTH[nodeSize]
      const empX = teamX - ((Math.min(teamEmps.length, MAX_COLS) - 1) * COL_WIDTH) / 2 + col * COL_WIDTH - nodeWidth / 2
      const empY = EMPLOYEE_START_Y + row * ROW_HEIGHT

      // Determine opacity based on filters
      const teamMatch = teamFilter === "all" || emp.team === teamFilter
      const statusMatch = statusFilter === "all" || emp.status === statusFilter
      const opacity = teamMatch && statusMatch ? 1 : 0.15
      const pointerEvents = teamMatch && statusMatch ? "auto" : "none"

      nodes.push({
        id: emp.id,
        type: "employee",
        position: { x: empX, y: empY },
        data: emp,
        draggable: true,
        style: {
          opacity,
          pointerEvents,
          transition: "opacity 250ms ease",
        },
      })

      // Team header → employee edge (solid, team color)
      edges.push({
        id: `${teamHeaderId}-${emp.id}`,
        source: teamHeaderId,
        target: emp.id,
        style: { stroke: teamColor, strokeWidth: 1.5 },
        type: "smoothstep",
        animated: false,
      })
    })
  }

  return { nodes, edges }
}

// ─── Inner Component (needs ReactFlowProvider for hooks) ─────────────────────

interface OrgChartInnerProps {
  employees: EmployeeNodeData[]
  initialTeamFilter: string
  highlightId: string | null
}

function OrgChartInner({ employees, initialTeamFilter, highlightId }: OrgChartInnerProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const [teamFilter, setTeamFilter] = useState(initialTeamFilter)
  const [statusFilter, setStatusFilter] = useState("all")
  const initialized = useRef(false)

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildOrgLayout(employees, teamFilter, statusFilter),
    [employees, teamFilter, statusFilter]
  )

  // Apply highlight on mount (URL param ?highlight=<id>)
  const [nodes, setNodes] = useState(layoutNodes)
  const [edges] = useState(layoutEdges)

  useEffect(() => {
    let updatedNodes = layoutNodes
    if (highlightId) {
      updatedNodes = layoutNodes.map((n) =>
        n.id === highlightId
          ? {
              ...n,
              style: {
                ...n.style,
                outline: "3px solid #f59e0b",
                borderRadius: 14,
              },
            }
          : n
      )
    }
    setNodes(updatedNodes)
  }, [layoutNodes, highlightId])

  // fitView after initial render
  useEffect(() => {
    if (!initialized.current) {
      const t = setTimeout(() => {
        fitView({ padding: 0.12, duration: 400 })
        initialized.current = true
      }, 100)
      return () => clearTimeout(t)
    }
  }, [fitView])

  // fitView when team filter changes
  useEffect(() => {
    if (initialized.current) {
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50)
    }
  }, [teamFilter, fitView])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "employee") {
        // Batch 4 will wire this to the shared employee-detail-modal
        console.log("[OrgChart] employee clicked:", node.id)
      }
    },
    []
  )

  const miniMapNodeColor = useCallback((node: Node) => {
    if (node.id === "root") return "#1e293b"
    if (node.id.startsWith("team-")) {
      const team = node.id.replace("team-", "") as keyof typeof TEAM_COLOR
      return TEAM_COLOR[team] ?? "#94a3b8"
    }
    const emp = employees.find((e) => e.id === node.id)
    if (!emp) return "#94a3b8"
    const STATUS_MINI: Record<string, string> = {
      active: "#22c55e",
      developing: "#f59e0b",
      planned: "#94a3b8",
      inactive: "#ef4444",
    }
    return STATUS_MINI[emp.status] ?? "#94a3b8"
  }, [employees])

  return (
    <div className="relative w-full h-full">
      <OrgControls
        teamFilter={teamFilter}
        statusFilter={statusFilter}
        onTeamFilter={setTeamFilter}
        onStatusFilter={setStatusFilter}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFitView={() => fitView({ padding: 0.12, duration: 400 })}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#cbd5e1"
          style={{ backgroundColor: "#f8fafc" }}
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(248,250,252,0.75)"
          style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
      </ReactFlow>

      <OrgLegend />
    </div>
  )
}

// ─── Public Component (wraps with ReactFlowProvider) ─────────────────────────

export interface OrgChartClientProps {
  employees: EmployeeNodeData[]
  initialTeamFilter: string
  highlightId: string | null
}

export function OrgChartClient(props: OrgChartClientProps) {
  return (
    <ReactFlowProvider>
      <OrgChartInner {...props} />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 2:** Run `npx tsc --noEmit` and fix any type errors.

---

## Task 5: Loading Skeleton

**Files:**
- Create: `src/app/org/loading.tsx`

- [ ] **Step 1:** Create `src/app/org/loading.tsx` with the following complete content:

```tsx
// src/app/org/loading.tsx

export default function OrgLoading() {
  // Roughly distributed skeleton nodes simulating a 3-team layout
  const skeletonNodes = [
    // Root
    { x: "45%", y: "5%", w: 180, h: 36 },
    // Team headers
    { x: "10%", y: "18%", w: 130, h: 30 },
    { x: "43%", y: "18%", w: 130, h: 30 },
    { x: "74%", y: "18%", w: 130, h: 30 },
    // Employee nodes — scattered distribution
    { x: "4%",  y: "35%", w: 110, h: 140 },
    { x: "16%", y: "35%", w: 110, h: 140 },
    { x: "28%", y: "35%", w: 110, h: 140 },
    { x: "38%", y: "35%", w: 110, h: 140 },
    { x: "50%", y: "35%", w: 110, h: 140 },
    { x: "62%", y: "35%", w: 110, h: 140 },
    { x: "70%", y: "35%", w: 110, h: 140 },
    { x: "82%", y: "35%", w: 110, h: 140 },
    { x: "10%", y: "68%", w: 110, h: 140 },
    { x: "22%", y: "68%", w: 110, h: 140 },
    { x: "46%", y: "68%", w: 110, h: 140 },
    { x: "58%", y: "68%", w: 110, h: 140 },
    { x: "76%", y: "68%", w: 110, h: 140 },
    { x: "88%", y: "68%", w: 110, h: 140 },
  ]

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Controls bar skeleton */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2.5 bg-white/80 border border-slate-200 rounded-2xl shadow">
        <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="w-px h-5 bg-slate-200" />
        <div className="h-7 w-32 bg-slate-100 rounded-lg animate-pulse" />
        <div className="w-px h-5 bg-slate-200" />
        <div className="h-7 w-20 bg-slate-100 rounded-lg animate-pulse" />
        <div className="w-px h-5 bg-slate-200" />
        <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 overflow-hidden">
        {skeletonNodes.map((node, i) => (
          <div
            key={i}
            className="absolute rounded-xl bg-slate-200 animate-pulse"
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              animationDelay: `${(i * 80) % 600}ms`,
            }}
          />
        ))}
      </div>

      {/* Legend skeleton */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl shadow">
        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2:** Run `npx tsc --noEmit` — should still pass.

---

## Task 6: Delete Old Org Chart + Final Wiring + Commit

**Files:**
- Delete: `src/components/org/org-chart.tsx`
- Verify: `src/app/org/page.tsx` imports are correct

- [ ] **Step 1:** Delete the old file:
  ```bash
  rm src/components/org/org-chart.tsx
  ```

- [ ] **Step 2:** Verify `src/app/org/page.tsx` no longer imports `OrgChart` from the deleted file — it should import `OrgChartClient` from `@/components/org/org-chart-client`. The rewrite in Task 1 Step 2 already does this; confirm the file is correct.

- [ ] **Step 3:** Run `npx tsc --noEmit` — must pass with zero errors.

- [ ] **Step 4:** Run `npm run build` — must succeed.

- [ ] **Step 5:** Commit:
  ```bash
  git add src/app/org/ src/components/org/
  git commit -m "feat: redesign org chart with custom card nodes, level rings, and interactive filtering

  - Custom EmployeeNode with avatar, level progress ring, MBTI, streak, personality tags
  - Team-based layout with proper spacing (no more overlapping)
  - Status color mapping for all 4 states including inactive
  - Team and status filtering with opacity transitions
  - Hover tooltip showing task count, XP, level
  - URL params support (?team=xxx, ?highlight=xxx) for cross-page navigation
  - Loading skeleton for org page
  - Replaced hardcoded pixel coordinates with logical team-grid layout

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Org chart shows all 24 employees with rich cards
- [ ] Each card shows: avatar, name, title, level ring, MBTI, streak, personality tags
- [ ] Status colors work for all 4 states (active/developing/planned/inactive)
- [ ] Team filter works (non-selected nodes fade to ~15% opacity)
- [ ] Status filter works (same opacity approach)
- [ ] Hover shows tooltip with task count, XP, level, status
- [ ] No overlapping nodes (170px column spacing, 200px row height)
- [ ] Loading skeleton displays during data fetch (loading.tsx)
- [ ] URL params `?team=management` filters on page load
- [ ] URL param `?highlight=<id>` highlights that employee node with amber outline

---

## Deferred to Batch 4

- Node click → open shared `employee-detail-modal` (currently console.log only)
- Cross-page navigation wiring (dashboard leaderboard → org highlight)
- Promoting `employee-detail-modal` to shared component path
