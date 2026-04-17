import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "running" | "completed" | "failed" | null;
  const team = searchParams.get("team") as "management" | "design" | "production" | null;
  const employeeId = searchParams.get("employeeId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const conditions = [];
  if (status) conditions.push(eq(tasks.status, status));
  if (team) conditions.push(eq(tasks.team, team));
  if (employeeId) conditions.push(eq(tasks.employeeId, employeeId));
  if (dateStart) conditions.push(gte(tasks.startTime, new Date(dateStart)));
  if (dateEnd) conditions.push(lte(tasks.startTime, new Date(dateEnd)));

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
      qualityScore: tasks.qualityScore,
      retryCount: tasks.retryCount,
      tokenUsage: tasks.tokenUsage,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.startTime))
    .limit(limit);

  return NextResponse.json(rows);
}
