import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { RunningTasksPanel } from "@/components/production/running-tasks-panel";
import { TaskHistoryTable } from "@/components/production/task-history-table";

async function getHistory() {
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
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(desc(tasks.startTime))
    .limit(200);

  // Serialize dates to strings for client components
  return rows.map((r) => ({
    ...r,
    startTime: r.startTime ? r.startTime.toISOString() : null,
    estimatedEndTime: r.estimatedEndTime ? r.estimatedEndTime.toISOString() : null,
    actualEndTime: r.actualEndTime ? r.actualEndTime.toISOString() : null,
  }));
}

export default async function ProductionPage() {
  const tasks = await getHistory();

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">生产看板</h1>
        <p className="text-muted-foreground mt-1">AI团队实时工作状态与历史记录</p>
      </div>
      <RunningTasksPanel />
      <div>
        <h2 className="text-lg font-semibold mb-4">历史任务</h2>
        <TaskHistoryTable initialTasks={tasks} />
      </div>
    </div>
  );
}
