import { db } from "@/db";
import { EmployeeGrid } from "@/components/roster/employee-grid";
import { getEmployeeMetrics } from "@/lib/metric-engine";
import { requirePageReadAccess } from "@/lib/authz-server";

export default async function RosterPage() {
  await requirePageReadAccess("employees");
  const rows = await db.query.employees.findMany({
    orderBy: (e, { asc }) => [asc(e.team), asc(e.name)],
  });

  const empMetrics = await getEmployeeMetrics();
  const metricMap = new Map(empMetrics.map((m) => [m.employeeId, m]));

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
      adoptionRate: m ? m.adoptionRate / 100 : null,
      accuracyRate: m ? m.accuracyRate / 100 : null,
      description: emp.description,
      subTeam: emp.subTeam,
    };
  });

  return (
    <div className="p-8">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-foreground">AI 员工花名册</h1>
        <p className="text-muted-foreground mt-1">
          共 {employeeList.length} 名 AI 员工，
          {employeeList.filter((e) => e.status === "active").length} 名在岗运行
        </p>
      </div>
      <div className="animate-fade-in-up animate-delay-100">
        <EmployeeGrid employees={employeeList} />
      </div>
    </div>
  );
}
