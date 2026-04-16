"use client";

import { useState } from "react";
import Link from "next/link";
import { Employee, VersionLog } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProfileTab } from "@/components/roster/tabs/profile-tab";
import { SkillsTab } from "@/components/roster/tabs/skills-tab";
import { MetricsTab } from "@/components/roster/tabs/metrics-tab";
import { VersionTab } from "@/components/roster/tabs/version-tab";
import { ArrowLeft } from "lucide-react";

interface EmployeeDetailProps {
  employee: Employee;
}

export function EmployeeDetail({ employee: initialEmployee }: EmployeeDetailProps) {
  const [employee, setEmployee] = useState<Employee>(initialEmployee);

  async function handleProfileSave(updates: Partial<Employee>) {
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...employee, ...updates }),
    });
    if (!res.ok) throw new Error("保存失败");
    const updated: Employee = await res.json();
    setEmployee((prev) => ({ ...prev, ...updated }));
  }

  async function handleVersionLogAdd(log: {
    version: string;
    date: string;
    changelog: string;
  }) {
    const res = await fetch(`/api/employees/${employee.id}/version-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error("提交失败");
    const created: VersionLog = await res.json();
    setEmployee((prev) => ({
      ...prev,
      versionLogs: [created, ...(prev.versionLogs ?? [])],
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/roster" />}>
          <ArrowLeft />
          返回花名册
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">档案</TabsTrigger>
          <TabsTrigger value="skills">技能</TabsTrigger>
          <TabsTrigger value="metrics">指标</TabsTrigger>
          <TabsTrigger value="version">版本</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab employee={employee} onSave={handleProfileSave} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTab skills={employee.skills ?? []} />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsTab metrics={employee.metrics ?? []} />
        </TabsContent>

        <TabsContent value="version">
          <VersionTab
            versionLogs={employee.versionLogs ?? []}
            employeeId={employee.id}
            onAdd={handleVersionLogAdd}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
