import { db } from "@/db";
import { employees, metrics, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

async function getSummary() {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const [employeeCounts, monthlyAgg, taskAgg] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
      })
      .from(employees)
      .get(),
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
    db
      .select({ count: sql<number>`count(distinct ${tasks.type})` })
      .from(tasks)
      .get(),
  ]);

  const hoursSaved = monthlyAgg?.totalHoursSaved ?? 0;
  const costPerHour = 46.875;

  return {
    totalEmployees: employeeCounts?.total ?? 0,
    activeEmployees: employeeCounts?.active ?? 0,
    activeRate: employeeCounts?.total ? (employeeCounts.active / employeeCounts.total) : 0,
    monthlyTaskCount: monthlyAgg?.totalTasks ?? 0,
    humanTimeSavedHours: Math.round(hoursSaved * 10) / 10,
    humanTimeSavedCost: Math.round(hoursSaved * costPerHour),
    avgAdoptionRate: monthlyAgg?.avgAdoption ?? 0,
    avgAccuracyRate: monthlyAgg?.avgAccuracy ?? 0,
    projectsCovered: taskAgg?.count ?? 0,
  };
}

async function getTeamComparison() {
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

  return rows.map((r) => ({
    team: r.team,
    label: TEAM_LABEL[r.team] ?? r.team,
    totalTasks: r.totalTasks ?? 0,
    avgAdoptionRate: Math.round((r.avgAdoption ?? 0) * 100),
    avgAccuracyRate: Math.round((r.avgAccuracy ?? 0) * 100),
    totalHoursSaved: Math.round((r.totalHoursSaved ?? 0) * 10) / 10,
    employeeCount: r.employeeCount ?? 0,
  }));
}

async function getHeatmap() {
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

  return { employees: empRows, activity: completedTasks };
}

export default async function DashboardPage() {
  const [summary, teamComparison, heatmap] = await Promise.all([
    getSummary(),
    getTeamComparison(),
    getHeatmap(),
  ]);

  return (
    <DashboardShell
      summary={summary}
      teamComparison={teamComparison}
      heatmap={heatmap}
    />
  );
}
