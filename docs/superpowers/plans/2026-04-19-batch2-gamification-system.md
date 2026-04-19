# Batch 2: 游戏化系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement XP/level system, streak tracking, achievement badges, and leaderboard — all computed dynamically from existing task/skill data with no new DB tables.

**Architecture:** Single utility module `src/lib/gamification.ts` contains all computation functions. Dashboard page.tsx calls these server-side and passes results to client components. The leaderboard and achievement feed components (created in Batch 1) will receive real data.

**Tech Stack:** TypeScript, Drizzle ORM

**Spec:** `docs/superpowers/specs/2026-04-18-dashboard-org-gamification-design.md` — Section 4

---

## Task 1: Gamification Core — XP, Level, Streak Functions

**Files:**
- Create: `src/lib/gamification.ts`

- [ ] **Step 1:** Create `src/lib/gamification.ts` with the following complete implementation:

```ts
// src/lib/gamification.ts

// ─── Level Tier Definitions ────────────────────────────────────────────────

const LEVEL_TIERS = [
  { maxLevel: 3,        title: "新手", emoji: "🌱", color: "#94a3b8" },
  { maxLevel: 6,        title: "熟练", emoji: "⚡", color: "#3b82f6" },
  { maxLevel: 9,        title: "精英", emoji: "🔥", color: "#f97316" },
  { maxLevel: 12,       title: "大师", emoji: "💎", color: "#8b5cf6" },
  { maxLevel: Infinity, title: "传奇", emoji: "👑", color: "#f59e0b" },
] as const

// ─── XP Calculation ────────────────────────────────────────────────────────

/**
 * XP from completed tasks.
 * Formula: each completed task = 50 base + 50 * (qualityScore / 100) bonus.
 * Tasks with null qualityScore contribute only the base 50 XP.
 */
export function calculateTaskXp(
  tasks: { qualityScore: number | null }[]
): number {
  return tasks.reduce((sum, task) => {
    const base = 50
    const qualityBonus = task.qualityScore != null
      ? base * (task.qualityScore / 100)
      : 0
    return sum + base + qualityBonus
  }, 0)
}

/**
 * Streak XP from consecutive active days.
 * 1–6 days: 10 XP/day. 7+ days: 20 XP/day.
 */
export function calculateStreakXp(streak: number, totalActiveDays: number): number {
  if (streak === 0) return 0
  // Days in the streak portion that qualify for 20 XP/day
  const highDays = Math.max(0, streak - 6)
  // Days in the streak portion that qualify for 10 XP/day
  const lowDays = streak - highDays
  // Non-streak active days (before the streak started) at 10 XP/day
  const nonStreakDays = Math.max(0, totalActiveDays - streak)
  return highDays * 20 + lowDays * 10 + nonStreakDays * 10
}

/**
 * Calculate current streak from an array of active date strings (YYYY-MM-DD).
 * Sorts descending, walks backward from today, breaks on first gap.
 */
export function calculateStreak(activeDays: string[]): number {
  if (activeDays.length === 0) return 0

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const sorted = [...new Set(activeDays)].sort().reverse()

  let streak = 0
  let expected = todayStr

  for (const day of sorted) {
    if (day === expected) {
      streak++
      const prev = new Date(expected)
      prev.setDate(prev.getDate() - 1)
      expected = prev.toISOString().slice(0, 10)
    } else if (day < expected) {
      // Gap found — stop
      break
    }
    // day > expected means future date, skip
  }

  return streak
}

/**
 * Total XP for an employee.
 */
export function calculateTotalXp(taskXp: number, streakXp: number): number {
  return taskXp + streakXp
}

// ─── Level System ──────────────────────────────────────────────────────────

/**
 * XP required to reach level N (i.e., to level up FROM level N to N+1).
 * Formula: 200 * 1.5^(level - 1)
 */
export function xpForLevel(level: number): number {
  return Math.round(200 * Math.pow(1.5, level - 1))
}

/**
 * Cumulative XP needed to BE at level N (sum of xpForLevel(1) through xpForLevel(N-1)).
 * Level 1 starts at 0 cumulative XP.
 */
export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i)
  }
  return total
}

export interface LevelInfo {
  level: number
  title: string          // 新手/熟练/精英/大师/传奇
  emoji: string          // 🌱/⚡/🔥/💎/👑
  color: string          // hex color for the tier
  progress: number       // 0–1, progress within current level
  xpToNext: number       // XP remaining to next level
  currentLevelXp: number // XP earned within current level
  nextLevelTotalXp: number // total XP needed for next level
}

/**
 * Calculate level info from total XP.
 */
export function calculateLevel(totalXp: number): LevelInfo {
  let level = 1
  let cumulative = 0

  // Walk up levels until we can't afford the next one
  while (true) {
    const needed = xpForLevel(level)
    if (cumulative + needed > totalXp) break
    cumulative += needed
    level++
  }

  const currentLevelXp = totalXp - cumulative
  const nextLevelTotalXp = xpForLevel(level)
  const xpToNext = nextLevelTotalXp - currentLevelXp
  const progress = nextLevelTotalXp > 0 ? currentLevelXp / nextLevelTotalXp : 0

  const tier = LEVEL_TIERS.find((t) => level <= t.maxLevel) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1]

  return {
    level,
    title: tier.title,
    emoji: tier.emoji,
    color: tier.color,
    progress: Math.min(1, Math.max(0, progress)),
    xpToNext: Math.max(0, xpToNext),
    currentLevelXp,
    nextLevelTotalXp,
  }
}
```

- [ ] **Step 2:** Run `npx tsc --noEmit` and confirm no errors.

---

## Task 2: Achievement System

**Files:**
- Modify: `src/lib/gamification.ts` (add achievement interfaces and function)

- [ ] **Step 1:** Append the following to `src/lib/gamification.ts`:

```ts
// ─── Achievement System ────────────────────────────────────────────────────

export interface Achievement {
  key: string
  name: string
  emoji: string
  description: string
  earned: boolean
  earnedAt: string | null  // ISO date string derived from task data
}

export interface AchievementInput {
  tasks: {
    qualityScore: number | null
    status: string
    startTime: number | null  // Unix timestamp ms
    type: string
  }[]
  skillCount: number
  currentLevel: number
  monthStartLevel: number   // level at start of current month
  streak: number            // pre-computed streak value
  isMvp: boolean            // pre-computed externally by comparing all employees
}

/**
 * Compute all 8 achievements for a single employee.
 * Returns all achievements; earned ones have earnedAt set.
 */
export function calculateAchievements(input: AchievementInput): Achievement[] {
  const { tasks, skillCount, currentLevel, monthStartLevel, streak, isMvp } = input

  const completedTasks = tasks.filter((t) => t.status === "completed")

  // Helper: convert Unix ms timestamp to YYYY-MM-DD string
  function toDateStr(ts: number | null): string | null {
    if (ts == null) return null
    return new Date(ts).toISOString().slice(0, 10)
  }

  // Helper: get current month prefix YYYY-MM
  const now = new Date()
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  // ── 1. 首个满分 — any task with qualityScore === 100 ──────────────────────
  const firstPerfect = completedTasks
    .filter((t) => t.qualityScore === 100)
    .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))[0]

  // ── 3. 闪电手 — 5+ tasks completed on any single day ──────────────────────
  const tasksByDay = new Map<string, number>()
  for (const t of completedTasks) {
    const d = toDateStr(t.startTime)
    if (d) tasksByDay.set(d, (tasksByDay.get(d) ?? 0) + 1)
  }
  const flashDayEntry = [...tasksByDay.entries()]
    .filter(([, count]) => count >= 5)
    .sort((a, b) => a[0].localeCompare(b[0]))[0] // earliest qualifying day

  // ── 5. 完美主义 — last 10 consecutive completed tasks all have qualityScore > 90 ──
  const last10 = completedTasks
    .filter((t) => t.startTime != null)
    .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
    .slice(0, 10)
  const isPerfectionist =
    last10.length >= 10 && last10.every((t) => (t.qualityScore ?? 0) > 90)
  const perfectionistEarnedAt = isPerfectionist
    ? toDateStr(last10[last10.length - 1]?.startTime ?? null) // date of the 10th task (oldest in window)
    : null

  // ── 7. 团队之星 — 3+ distinct task types ──────────────────────────────────
  const distinctTypes = new Set(completedTasks.map((t) => t.type)).size
  const firstThirdTypeTask = distinctTypes >= 3
    ? completedTasks
        .filter((t) => t.startTime != null)
        .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))
        .find((_, i, arr) => {
          // Find the task that pushed distinct types to 3
          const seen = new Set<string>()
          for (let j = 0; j <= i; j++) seen.add(arr[j].type)
          return seen.size === 3
        }) ?? null
    : null

  const achievements: Achievement[] = [
    {
      key: "first_perfect",
      name: "首个满分",
      emoji: "🎯",
      description: "完成一个满分任务（qualityScore = 100）",
      earned: firstPerfect != null,
      earnedAt: firstPerfect ? toDateStr(firstPerfect.startTime) : null,
    },
    {
      key: "seven_flame",
      name: "七日之焰",
      emoji: "🔥",
      description: "连续 7 天保持活跃",
      earned: streak >= 7,
      earnedAt: streak >= 7 ? thisMonthPrefix + "-01" : null, // approximate; exact date not reconstructible
    },
    {
      key: "flash_hand",
      name: "闪电手",
      emoji: "⚡",
      description: "单日完成 5 个或以上任务",
      earned: flashDayEntry != null,
      earnedAt: flashDayEntry ? flashDayEntry[0] : null,
    },
    {
      key: "mvp",
      name: "月度MVP",
      emoji: "🏆",
      description: "当月 XP 排行第一",
      earned: isMvp,
      earnedAt: isMvp ? thisMonthPrefix + "-01" : null,
    },
    {
      key: "perfectionist",
      name: "完美主义",
      emoji: "💯",
      description: "连续 10 个已完成任务 qualityScore 均超过 90",
      earned: isPerfectionist,
      earnedAt: perfectionistEarnedAt,
    },
    {
      key: "all_rounder",
      name: "全能选手",
      emoji: "🎨",
      description: "拥有 5 个或以上技能",
      earned: skillCount >= 5,
      earnedAt: skillCount >= 5 ? thisMonthPrefix + "-01" : null,
    },
    {
      key: "team_star",
      name: "团队之星",
      emoji: "🤝",
      description: "参与 3 种或以上任务类型",
      earned: distinctTypes >= 3,
      earnedAt: firstThirdTypeTask ? toDateStr(firstThirdTypeTask.startTime) : null,
    },
    {
      key: "fast_growth",
      name: "成长飞速",
      emoji: "📈",
      description: "单月升级 3 级或以上",
      earned: currentLevel - monthStartLevel >= 3,
      earnedAt:
        currentLevel - monthStartLevel >= 3 ? thisMonthPrefix + "-01" : null,
    },
  ]

  return achievements
}
```

- [ ] **Step 2:** Run `npx tsc --noEmit` and confirm no errors.

---

## Task 3: Gamification Data Queries

**Files:**
- Modify: `src/lib/dashboard-data.ts` (add gamification query functions)

- [ ] **Step 1:** Add the following imports and type definitions to `src/lib/dashboard-data.ts` (near the top, after existing imports):

```ts
import {
  calculateTaskXp,
  calculateStreakXp,
  calculateStreak,
  calculateTotalXp,
  calculateLevel,
  calculateAchievements,
} from "@/lib/gamification"
import type { TeamType } from "@/lib/types"
```

> Note: `db`, `employees`, `tasks`, `skills`, and other schema symbols are already imported at the top of `dashboard-data.ts` as:
> ```ts
> import { db } from "@/db"
> import { employees, metrics, tasks, skillMetrics, taskOutputs, metricConfigs } from "@/db/schema"
> ```
> Add `skills` to that existing schema import if it is not already there.

- [ ] **Step 2:** Add the `GamificationRawData` interface and `getGamificationData` function:

```ts
interface GamificationRawData {
  employees: { id: string; name: string; team: TeamType; avatar: string | null }[]
  tasksByEmployee: Map<
    string,
    { qualityScore: number | null; status: string; startTime: number | null; type: string }[]
  >
  skillCountByEmployee: Map<string, number>
  activeDaysByEmployee: Map<string, string[]> // YYYY-MM-DD strings
}

export async function getGamificationData(): Promise<GamificationRawData> {
  // Fetch all employees
  const employeeRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      team: employees.team,
      avatar: employees.avatar,
    })
    .from(employees)

  // Fetch all tasks with relevant fields
  const allTasks = await db
    .select({
      employeeId: tasks.employeeId,
      qualityScore: tasks.qualityScore,
      status: tasks.status,
      startTime: tasks.startTime,
      type: tasks.type,
    })
    .from(tasks)

  // Fetch skill counts per employee
  const skillRows = await db
    .select({
      employeeId: skills.employeeId,
    })
    .from(skills)

  // Build Maps
  const tasksByEmployee = new Map<
    string,
    { qualityScore: number | null; status: string; startTime: number | null; type: string }[]
  >()
  const activeDaysByEmployee = new Map<string, Set<string>>()

  for (const t of allTasks) {
    if (!t.employeeId) continue
    if (!tasksByEmployee.has(t.employeeId)) tasksByEmployee.set(t.employeeId, [])
    tasksByEmployee.get(t.employeeId)!.push({
      qualityScore: t.qualityScore,
      status: t.status,
      startTime: t.startTime,
      type: t.type,
    })

    if (t.startTime) {
      const dayStr = new Date(t.startTime).toISOString().slice(0, 10)
      if (!activeDaysByEmployee.has(t.employeeId)) activeDaysByEmployee.set(t.employeeId, new Set())
      activeDaysByEmployee.get(t.employeeId)!.add(dayStr)
    }
  }

  const skillCountByEmployee = new Map<string, number>()
  for (const s of skillRows) {
    if (!s.employeeId) continue
    skillCountByEmployee.set(s.employeeId, (skillCountByEmployee.get(s.employeeId) ?? 0) + 1)
  }

  // Convert active day sets to arrays
  const activeDaysArrayByEmployee = new Map<string, string[]>()
  for (const [empId, days] of activeDaysByEmployee) {
    activeDaysArrayByEmployee.set(empId, [...days])
  }

  return {
    employees: employeeRows as { id: string; name: string; team: TeamType; avatar: string | null }[],
    tasksByEmployee,
    skillCountByEmployee,
    activeDaysByEmployee: activeDaysArrayByEmployee,
  }
}
```

- [ ] **Step 3:** Add `computeLeaderboard` and `computeRecentAchievements` functions:

```ts
export interface AchievementFeedEntry {
  employeeId: string
  employeeName: string
  team: TeamType
  achievementKey: string
  achievementName: string
  achievementEmoji: string
  earnedAt: string
}

export function computeLeaderboard(
  raw: GamificationRawData,
  _period: "week" | "month"
): LeaderboardEntry[] {
  // Compute XP for every employee first (needed for MVP detection)
  const xpMap = new Map<string, number>()
  for (const emp of raw.employees) {
    const tasks = raw.tasksByEmployee.get(emp.id) ?? []
    const completedTasks = tasks.filter((t) => t.status === "completed")
    const activeDays = raw.activeDaysByEmployee.get(emp.id) ?? []
    const streak = calculateStreak(activeDays)
    const taskXp = calculateTaskXp(completedTasks)
    const streakXp = calculateStreakXp(streak, activeDays.length)
    xpMap.set(emp.id, calculateTotalXp(taskXp, streakXp))
  }

  // Determine MVP (highest XP employee this month)
  let mvpId: string | null = null
  let maxXp = -1
  for (const [id, xp] of xpMap) {
    if (xp > maxXp) {
      maxXp = xp
      mvpId = id
    }
  }

  const entries: LeaderboardEntry[] = raw.employees.map((emp) => {
    const totalXp = xpMap.get(emp.id) ?? 0
    const levelInfo = calculateLevel(totalXp)

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      team: emp.team,
      avatar: emp.avatar,
      xp: Math.round(totalXp),
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      levelEmoji: levelInfo.emoji,
      levelColor: levelInfo.color,
      rankChange: 0, // No historical XP snapshots available
    }
  })

  // Sort descending by XP, assign ranks
  entries.sort((a, b) => b.xp - a.xp)
  return entries.slice(0, 5)
}

export function computeRecentAchievements(
  raw: GamificationRawData,
  limit: number
): AchievementFeedEntry[] {
  // Compute XP for MVP detection
  const xpMap = new Map<string, number>()
  for (const emp of raw.employees) {
    const tasks = raw.tasksByEmployee.get(emp.id) ?? []
    const completedTasks = tasks.filter((t) => t.status === "completed")
    const activeDays = raw.activeDaysByEmployee.get(emp.id) ?? []
    const streak = calculateStreak(activeDays)
    const taskXp = calculateTaskXp(completedTasks)
    const streakXp = calculateStreakXp(streak, activeDays.length)
    xpMap.set(emp.id, calculateTotalXp(taskXp, streakXp))
  }
  const maxXp = Math.max(...xpMap.values(), 0)

  const now = new Date()
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const allEarned: AchievementFeedEntry[] = []

  for (const emp of raw.employees) {
    const tasks = raw.tasksByEmployee.get(emp.id) ?? []
    const completedTasks = tasks.filter((t) => t.status === "completed")
    const activeDays = raw.activeDaysByEmployee.get(emp.id) ?? []
    const streak = calculateStreak(activeDays)
    const taskXp = calculateTaskXp(completedTasks)
    const streakXp = calculateStreakXp(streak, activeDays.length)
    const totalXp = calculateTotalXp(taskXp, streakXp)
    const levelInfo = calculateLevel(totalXp)
    const skillCount = raw.skillCountByEmployee.get(emp.id) ?? 0
    const isMvp = xpMap.get(emp.id) === maxXp && maxXp > 0

    const achievements = calculateAchievements({
      tasks,
      skillCount,
      currentLevel: levelInfo.level,
      monthStartLevel: Math.max(1, levelInfo.level - 1), // approximation
      streak,
      isMvp,
    })

    for (const ach of achievements) {
      if (ach.earned && ach.earnedAt) {
        allEarned.push({
          employeeId: emp.id,
          employeeName: emp.name,
          team: emp.team,
          achievementKey: ach.key,
          achievementName: ach.name,
          achievementEmoji: ach.emoji,
          earnedAt: ach.earnedAt,
        })
      }
    }
  }

  // Sort by earnedAt descending, return top N
  allEarned.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
  return allEarned.slice(0, limit)
}
```

- [ ] **Step 4:** Run `npx tsc --noEmit` and confirm no errors.

---

## Task 4: Wire Gamification into Dashboard

**Files:**
- Modify: `src/lib/dashboard-types.ts` (add `levelTitle` to `LeaderboardEntry`)
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx`

- [ ] **Step 0:** In `src/lib/dashboard-types.ts`, add `levelTitle: string` to the `LeaderboardEntry` interface. The `computeLeaderboard` function sets this field from `levelInfo.title`; without it the TypeScript build will fail.

- [ ] **Step 1:** In `src/app/dashboard/page.tsx`, add calls to `getGamificationData`, `computeLeaderboard`, and `computeRecentAchievements`, then pass results to `DashboardShell`:

```ts
// In the page component's data-fetching block, add alongside existing queries:
const gamificationRaw = await getGamificationData()
const leaderboard = computeLeaderboard(gamificationRaw, "month")
const recentAchievements = computeRecentAchievements(gamificationRaw, 5)

// Pass as props to DashboardShell:
<DashboardShell
  // ... existing props ...
  leaderboard={leaderboard}
  recentAchievements={recentAchievements}
/>
```

- [ ] **Step 2:** In `src/components/dashboard/dashboard-shell.tsx`, accept and forward the new props to `LeaderboardPanel` and `AchievementFeed`:

```ts
// Add to DashboardShellProps:
leaderboard: LeaderboardEntry[]
recentAchievements: AchievementFeedEntry[]

// Pass to components:
<LeaderboardPanel entries={leaderboard} />
<AchievementFeed achievements={recentAchievements} />
```

- [ ] **Step 3:** Run `npx tsc --noEmit` — fix any type errors before proceeding.

- [ ] **Step 4:** Run `npm run build` — confirm successful build with no errors.

- [ ] **Step 5:** Commit:

```bash
git add src/lib/gamification.ts src/lib/dashboard-data.ts src/app/dashboard/page.tsx src/components/dashboard/dashboard-shell.tsx
git commit -m "feat: add gamification system — XP, levels, streaks, achievements, leaderboard

- XP from completed tasks (base 50 + quality bonus) and streak days
- 5-tier level system: 新手→熟练→精英→大师→传奇
- Streak calculation from consecutive active days
- 8 achievement badges computed from existing task/skill data
- Leaderboard with Top 5 employees by XP
- Achievement feed showing recent unlocks
- All data dynamically computed — no new DB tables

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Leaderboard shows top 5 employees with real XP and levels
- [ ] Achievement feed shows earned achievements
- [ ] Level badges display correct tier (emoji + color)
- [ ] Streak values calculated correctly
