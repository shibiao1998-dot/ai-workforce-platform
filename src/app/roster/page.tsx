import { eq } from "drizzle-orm";

import { db } from "@/db";
import { metrics } from "@/db/schema";
import { EmployeeGrid } from "@/components/roster/employee-grid";

export default async function RosterPage() {
  const rows = await db.query.employees.findMany({
    orderBy: (e, { asc }) => [asc(e.team), asc(e.name)],
  });

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const metricRows = await db
    .select()
    .from(metrics)
    .where(eq(metrics.period, currentMonth));
  const metricMap = new Map(metricRows.map((m) => [m.employeeId, m]));

  const employeeList = rows.map((emp) => {
    const m = metricMap.get(emp.id);
    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      monthlyTaskCount: m?.taskCount ?? 0,
      adoptionRate: m?.adoptionRate ?? null,
      accuracyRate: m?.accuracyRate ?? null,
    };
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">AI 员工花名册</h1>
        <p className="text-muted-foreground mt-1">
          共 {employeeList.length} 名 AI 员工，
          {employeeList.filter((e) => e.status === "active").length} 名在岗运行
        </p>
      </div>
      <EmployeeGrid employees={employeeList} />
    </div>
  );
}
