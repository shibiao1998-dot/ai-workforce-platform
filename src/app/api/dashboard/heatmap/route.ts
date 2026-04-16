import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
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

  return NextResponse.json({ employees: empRows, activity: completedTasks });
}
