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

export default async function ProductionPage() {
  const historyTasks = await getHistory();

  return (
    <div className="p-8">
      <ProductionClient initialTasks={historyTasks} />
    </div>
  );
}
