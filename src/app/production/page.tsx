import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ProductionClient } from "@/components/production/time-range-selector";

async function getHistory() {
  const rows = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      type: tasks.type,
      status: tasks.status,
      startTime: tasks.startTime,
      actualEndTime: tasks.actualEndTime,
      team: tasks.team,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      qualityScore: tasks.qualityScore,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(desc(tasks.startTime))
    .limit(200);

  return rows.map((r) => ({
    ...r,
    startTime: r.startTime ? r.startTime.toISOString() : null,
    actualEndTime: r.actualEndTime ? r.actualEndTime.toISOString() : null,
  }));
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { employee: employeeParam, task: taskParam, sort: sortParam } = await searchParams;
  const employeeId = typeof employeeParam === "string" ? employeeParam : undefined;
  const highlightTaskId = typeof taskParam === "string" ? taskParam : undefined;
  const sort = typeof sortParam === "string" ? sortParam : undefined;

  const historyTasks = await getHistory();

  return (
    <div className="p-8">
      <ProductionClient
        initialTasks={historyTasks}
        initialEmployeeId={employeeId}
        initialHighlightTaskId={highlightTaskId}
        initialSort={sort}
      />
    </div>
  );
}

