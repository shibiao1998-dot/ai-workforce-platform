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
