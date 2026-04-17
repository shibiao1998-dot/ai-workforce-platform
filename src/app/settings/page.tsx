import { db } from "@/db";
import { employees, metrics, metricConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeManager } from "@/components/settings/employee-manager";
import { MetricConfigManager } from "@/components/settings/metric-config-manager";
import { DataManagementCenter } from "@/components/settings/data-management/data-management-center";

async function getData() {
  const empRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      avatar: employees.avatar,
      title: employees.title,
      team: employees.team,
      status: employees.status,
      description: employees.description,
      subTeam: employees.subTeam,
    })
    .from(employees);

  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const metricRows = await db
    .select()
    .from(metrics)
    .where(eq(metrics.period, currentMonth));
  const metricMap = new Map(metricRows.map((m) => [m.employeeId, m]));

  const employeeList = empRows.map((emp) => {
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
      description: emp.description,
      subTeam: emp.subTeam,
    };
  });

  const configRows = await db
    .select({
      id: metricConfigs.id,
      employeeId: metricConfigs.employeeId,
      team: metricConfigs.team,
      taskType: metricConfigs.taskType,
      humanBaseline: metricConfigs.humanBaseline,
      costPerHour: metricConfigs.costPerHour,
      description: metricConfigs.description,
    })
    .from(metricConfigs);

  return { employeeList, configRows };
}


export default async function SettingsPage() {
  const { employeeList, configRows } = await getData();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground mt-1">管理 AI 员工、指标基准与业务数据</p>
      </div>
      <Tabs defaultValue="employees">
        <TabsList className="mb-6">
          <TabsTrigger value="employees">员工管理</TabsTrigger>
          <TabsTrigger value="metrics">指标基准配置</TabsTrigger>
          <TabsTrigger value="data">数据指标管理</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <EmployeeManager initialEmployees={employeeList} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricConfigManager
            initialConfigs={configRows}
            employees={employeeList}
          />
        </TabsContent>
        <TabsContent value="data">
          <DataManagementCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
