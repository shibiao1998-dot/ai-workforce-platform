import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees, taskOutputs, taskSteps } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const [, err] = await requirePermission("production", "read", req);
  if (err) return err;
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
      qualityScore: tasks.qualityScore,
      retryCount: tasks.retryCount,
      tokenUsage: tasks.tokenUsage,
      reflection: tasks.reflection,
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

  const steps = await db
    .select()
    .from(taskSteps)
    .where(eq(taskSteps.taskId, taskId))
    .orderBy(asc(taskSteps.stepOrder));

  return NextResponse.json({ ...taskRow, outputs, steps });
}
