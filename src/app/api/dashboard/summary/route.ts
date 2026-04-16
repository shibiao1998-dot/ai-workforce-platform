import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, metrics, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const [employeeCounts, monthlyAgg, taskAgg] = await Promise.all([
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
