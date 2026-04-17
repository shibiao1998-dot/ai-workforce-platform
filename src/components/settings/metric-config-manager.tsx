"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricConfigGlobal } from "./metric-config-global";
import { MetricConfigTeam } from "./metric-config-team";
import { MetricConfigEmployee } from "./metric-config-employee";
import { EmployeeListItem } from "@/lib/types";

interface MetricConfigItem {
  id: string;
  employeeId: string | null;
  team: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

interface Props {
  initialConfigs: MetricConfigItem[];
  employees: EmployeeListItem[];
}

export function MetricConfigManager({ initialConfigs, employees }: Props) {
  const [configs, setConfigs] = useState<MetricConfigItem[]>(initialConfigs);

  const refresh = async () => {
    const res = await fetch("/api/metric-configs");
    const data = await res.json();
    setConfigs(data);
  };

  return (
    <div className="space-y-4">
      {/* Priority info banner */}
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-800">
        覆盖优先级：<strong>员工覆盖</strong> &gt; <strong>团队覆盖</strong> &gt; <strong>全局基准</strong>。生效值取最细粒度的配置。
      </div>

      <Tabs defaultValue="global">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="global">全局基准</TabsTrigger>
          <TabsTrigger value="team">团队覆盖</TabsTrigger>
          <TabsTrigger value="employee">员工覆盖</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <MetricConfigGlobal
            configs={configs}
            allConfigs={configs}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="team">
          <MetricConfigTeam
            configs={configs}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="employee">
          <MetricConfigEmployee
            configs={configs}
            employees={employees}
            onRefresh={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
