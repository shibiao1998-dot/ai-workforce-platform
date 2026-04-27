import { db } from "@/db"
import { employees, tasks } from "@/db/schema"
import { OrgChartClient } from "@/components/org/org-chart-client"
import type { EmployeeNodeData } from "@/components/org/types"
import type { EmployeePersona } from "@/lib/types"
import { calculateTaskXp, calculateLevel, calculateStreak } from "@/lib/gamification"
import { requirePageReadAccess } from "@/lib/authz-server"

async function getEnrichedEmployees(): Promise<EmployeeNodeData[]> {
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

  const taskRows = await db
    .select({
      employeeId: tasks.employeeId,
      qualityScore: tasks.qualityScore,
      actualEndTime: tasks.actualEndTime,
      status: tasks.status,
    })
    .from(tasks)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return employeeRows.map((emp) => {
    const empTasks = taskRows.filter((t) => t.employeeId === emp.id && t.status === "completed")

    let mbti: string | null = null
    let personality: string[] = []
    if (emp.persona) {
      try {
        const parsed = JSON.parse(emp.persona) as EmployeePersona
        mbti = parsed.mbti ?? null
        personality = (parsed.personality ?? []).slice(0, 2)
      } catch {
        /* ignore */
      }
    }

    const xp = calculateTaskXp(empTasks)
    const levelInfo = calculateLevel(xp)

    const activeDates = empTasks
      .filter((t) => t.actualEndTime != null)
      .map((t) => (t.actualEndTime as Date).toISOString().slice(0, 10))
    const streak = calculateStreak([...new Set(activeDates)])

    const monthlyTaskCount = empTasks.filter((t) => {
      if (!t.actualEndTime) return false
      const d = t.actualEndTime as Date
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
    }).length

    return {
      id: emp.id,
      name: emp.name,
      title: emp.title,
      team: emp.team as EmployeeNodeData["team"],
      status: emp.status as EmployeeNodeData["status"],
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
  await requirePageReadAccess("org")
  const [enrichedEmployees, params] = await Promise.all([
    getEnrichedEmployees(),
    searchParams,
  ])

  return (
    <div className="flex flex-col h-screen">
      <OrgChartClient
        employees={enrichedEmployees}
        initialTeamFilter={params.team ?? "all"}
        highlightId={params.highlight ?? null}
      />
    </div>
  )
}
