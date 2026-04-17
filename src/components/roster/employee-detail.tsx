"use client";

import { useState } from "react";
import Link from "next/link";
import { Employee, VersionLog } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { ProfileTab } from "@/components/roster/tabs/profile-tab";
import { SkillsTab } from "@/components/roster/tabs/skills-tab";
import { MetricsTab } from "@/components/roster/tabs/metrics-tab";
import { VersionTab } from "@/components/roster/tabs/version-tab";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<Employee["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "在岗", variant: "default" },
  developing: { label: "开发中", variant: "secondary" },
  planned: { label: "计划中", variant: "outline" },
  inactive: { label: "已停用", variant: "outline" },
};

const TEAM_LABEL: Record<string, string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
};

const TEAM_BG: Record<string, string> = {
  management: "bg-gradient-to-br from-purple-50 to-violet-100",
  design: "bg-gradient-to-br from-blue-50 to-sky-100",
  production: "bg-gradient-to-br from-green-50 to-emerald-100",
};

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

  const status = STATUS_MAP[employee.status];
  const teamLabel = TEAM_LABEL[employee.team] ?? employee.team;
  const teamBg = TEAM_BG[employee.team] ?? "bg-muted";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/roster" />}>
          <ArrowLeft />
          返回花名册
        </Button>
      </div>

      {/* Hero section */}
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card">
        <div className="flex flex-col sm:flex-row">
          <div className={cn("relative w-full sm:w-64 h-72 sm:h-80 shrink-0 overflow-hidden", teamBg)}>
            <AiAvatar
              employeeId={employee.id}
              team={employee.team}
              avatar={employee.avatar}
              name={employee.name}
              fill
            />
            <div className="hidden sm:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
            <div className="sm:hidden absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-base text-muted-foreground">{employee.title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
              <span>{teamLabel}</span>
              {employee.subTeam && (
                <>
                  <span>·</span>
                  <span>{employee.subTeam}</span>
                </>
              )}
            </div>
            {employee.soul && (
              <p className="text-sm text-muted-foreground italic mt-1">"{employee.soul}"</p>
            )}
            {employee.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{employee.description}</p>
            )}
          </div>
        </div>
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
