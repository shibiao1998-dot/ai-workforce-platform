// ─── Level Tier Definitions ────────────────────────────────────────────────

const LEVEL_TIERS = [
  { maxLevel: 3, title: "新手", emoji: "🌱", color: "#94a3b8" },
  { maxLevel: 6, title: "熟练", emoji: "⚡", color: "#3b82f6" },
  { maxLevel: 9, title: "精英", emoji: "🔥", color: "#f97316" },
  { maxLevel: 12, title: "大师", emoji: "💎", color: "#8b5cf6" },
  { maxLevel: Infinity, title: "传奇", emoji: "👑", color: "#f59e0b" },
] as const

// ─── XP Calculation ────────────────────────────────────────────────────────

export function calculateTaskXp(tasks: { qualityScore: number | null }[]): number {
  return tasks.reduce((sum, task) => {
    const base = 50
    const qualityBonus = task.qualityScore != null ? base * (task.qualityScore / 100) : 0
    return sum + base + qualityBonus
  }, 0)
}

export function calculateStreakXp(streak: number, totalActiveDays: number): number {
  if (streak === 0) return 0
  const highDays = Math.max(0, streak - 6)
  const lowDays = streak - highDays
  const nonStreakDays = Math.max(0, totalActiveDays - streak)
  return highDays * 20 + lowDays * 10 + nonStreakDays * 10
}

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
      break
    }
  }
  return streak
}

export function calculateTotalXp(taskXp: number, streakXp: number): number {
  return taskXp + streakXp
}

// ─── Level System ──────────────────────────────────────────────────────────

export function xpForLevel(level: number): number {
  return Math.round(200 * Math.pow(1.5, level - 1))
}

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
  title: string
  emoji: string
  color: string
  progress: number
  xpToNext: number
  currentLevelXp: number
  nextLevelTotalXp: number
}

export function calculateLevel(totalXp: number): LevelInfo {
  let level = 1
  let cumulative = 0
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

// ─── Achievement System ────────────────────────────────────────────────────

export interface Achievement {
  key: string
  name: string
  emoji: string
  description: string
  earned: boolean
  earnedAt: string | null
}

export interface AchievementInput {
  tasks: { qualityScore: number | null; status: string; startTime: number | null; type: string }[]
  skillCount: number
  currentLevel: number
  monthStartLevel: number
  streak: number
  isMvp: boolean
}

export function calculateAchievements(input: AchievementInput): Achievement[] {
  const { tasks, skillCount, currentLevel, monthStartLevel, streak, isMvp } = input
  const completedTasks = tasks.filter((t) => t.status === "completed")

  function toDateStr(ts: number | null): string | null {
    if (ts == null) return null
    return new Date(ts).toISOString().slice(0, 10)
  }

  const now = new Date()
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  // 1. 首个满分
  const firstPerfect = completedTasks
    .filter((t) => t.qualityScore === 100)
    .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))[0]

  // 3. 闪电手
  const tasksByDay = new Map<string, number>()
  for (const t of completedTasks) {
    const d = toDateStr(t.startTime)
    if (d) tasksByDay.set(d, (tasksByDay.get(d) ?? 0) + 1)
  }
  const flashDayEntry = [...tasksByDay.entries()]
    .filter(([, count]) => count >= 5)
    .sort((a, b) => a[0].localeCompare(b[0]))[0]

  // 5. 完美主义
  const last10 = completedTasks
    .filter((t) => t.startTime != null)
    .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
    .slice(0, 10)
  const isPerfectionist = last10.length >= 10 && last10.every((t) => (t.qualityScore ?? 0) > 90)
  const perfectionistEarnedAt = isPerfectionist ? toDateStr(last10[last10.length - 1]?.startTime ?? null) : null

  // 7. 团队之星
  const distinctTypes = new Set(completedTasks.map((t) => t.type)).size

  const achievements: Achievement[] = [
    {
      key: "first_perfect", name: "首个满分", emoji: "🎯",
      description: "完成一个满分任务", earned: firstPerfect != null,
      earnedAt: firstPerfect ? toDateStr(firstPerfect.startTime) : null,
    },
    {
      key: "seven_flame", name: "七日之焰", emoji: "🔥",
      description: "连续 7 天保持活跃", earned: streak >= 7,
      earnedAt: streak >= 7 ? thisMonthPrefix + "-01" : null,
    },
    {
      key: "flash_hand", name: "闪电手", emoji: "⚡",
      description: "单日完成 5 个或以上任务", earned: flashDayEntry != null,
      earnedAt: flashDayEntry ? flashDayEntry[0] : null,
    },
    {
      key: "mvp", name: "月度MVP", emoji: "🏆",
      description: "当月 XP 排行第一", earned: isMvp,
      earnedAt: isMvp ? thisMonthPrefix + "-01" : null,
    },
    {
      key: "perfectionist", name: "完美主义", emoji: "💯",
      description: "连续 10 个任务 qualityScore 均超过 90", earned: isPerfectionist,
      earnedAt: perfectionistEarnedAt,
    },
    {
      key: "all_rounder", name: "全能选手", emoji: "🎨",
      description: "拥有 5 个或以上技能", earned: skillCount >= 5,
      earnedAt: skillCount >= 5 ? thisMonthPrefix + "-01" : null,
    },
    {
      key: "team_star", name: "团队之星", emoji: "🤝",
      description: "参与 3 种或以上任务类型", earned: distinctTypes >= 3,
      earnedAt: distinctTypes >= 3 ? thisMonthPrefix + "-01" : null,
    },
    {
      key: "fast_growth", name: "成长飞速", emoji: "📈",
      description: "单月升级 3 级或以上", earned: currentLevel - monthStartLevel >= 3,
      earnedAt: currentLevel - monthStartLevel >= 3 ? thisMonthPrefix + "-01" : null,
    },
  ]
  return achievements
}
