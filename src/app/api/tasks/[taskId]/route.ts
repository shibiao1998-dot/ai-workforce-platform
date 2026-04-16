import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees, taskOutputs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  const taskRow = await db
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
      metadata: tasks.metadata,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(eq(tasks.id, taskId))
    .get();

  if (!taskRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outputs = await db
    .select()
    .from(taskOutputs)
    .where(eq(taskOutputs.taskId, taskId));

  return NextResponse.json({ ...taskRow, outputs });
}
