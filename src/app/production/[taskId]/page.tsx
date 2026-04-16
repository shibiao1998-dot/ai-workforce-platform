import { notFound } from "next/navigation";
import { db } from "@/db";
import { tasks, employees, taskOutputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TaskDetail } from "@/components/production/task-detail";

async function getTask(id: string) {
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
    .where(eq(tasks.id, id))
    .get();

  if (!taskRow) return null;

  const outputs = await db
    .select()
    .from(taskOutputs)
    .where(eq(taskOutputs.taskId, id));

  return {
    ...taskRow,
    startTime: taskRow.startTime ? taskRow.startTime.toISOString() : null,
    estimatedEndTime: taskRow.estimatedEndTime
      ? taskRow.estimatedEndTime.toISOString()
      : null,
    actualEndTime: taskRow.actualEndTime
      ? taskRow.actualEndTime.toISOString()
      : null,
    outputs: outputs.map((o) => ({
      ...o,
      createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    })),
  };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const task = await getTask(taskId);
  if (!task) notFound();
  return <TaskDetail task={task} />;
}
