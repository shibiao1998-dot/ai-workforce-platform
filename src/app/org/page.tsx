import { db } from "@/db";
import { employees } from "@/db/schema";
import { OrgChart } from "@/components/org/org-chart";

async function getEmployees() {
  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      title: employees.title,
      team: employees.team,
      status: employees.status,
    })
    .from(employees);

  return rows;
}

export default async function OrgPage() {
  const employeeList = await getEmployees();

  return (
    <div className="flex flex-col h-screen">
      <div className="px-8 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">AI团队组织架构</h1>
        <p className="text-sm text-muted-foreground">
          点击员工节点跳转详情 · 支持拖拽和缩放
        </p>
      </div>
      <div className="flex-1">
        <OrgChart employees={employeeList} />
      </div>
    </div>
  );
}
