import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      progress: tasks.progress,
      startTime: tasks.startTime,
      actualEndTime: tasks.actualEndTime,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      team: tasks.team,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(desc(tasks.startTime))
    .limit(20);

  return NextResponse.json(rows);
}
