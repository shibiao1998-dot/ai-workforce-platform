"use client";

import { useState, useEffect } from "react";
import { Employee, VersionLog, EmployeePersona } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AiAvatar } from "@/components/shared/ai-avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileTab } from "@/components/roster/tabs/profile-tab";
import { SkillsTab } from "@/components/roster/tabs/skills-tab";
import { MetricsTab } from "@/components/roster/tabs/metrics-tab";
import { VersionTab } from "@/components/roster/tabs/version-tab";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "在岗", variant: "default" },
  developing: { label: "开发中", variant: "secondary" },
  planned: { label: "计划中", variant: "outline" },
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

interface EmployeeDetailModalProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailModal({ employeeId, open, onOpenChange }: EmployeeDetailModalProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId || !open) {
      setEmployee(null);
      return;
    }
    setLoading(true);
    fetch(`/api/employees/${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("加载失败");
        return res.json();
      })
      .then((data: Employee) => setEmployee(data))
      .catch(() => setEmployee(null))
      .finally(() => setLoading(false));
  }, [employeeId, open]);

  async function handleProfileSave(updates: Partial<Employee>) {
    if (!employee) return;
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...employee, ...updates }),
    });
    if (!res.ok) throw new Error("保存失败");
    const updated: Employee = await res.json();
    setEmployee((prev) => prev ? { ...prev, ...updated } : prev);
  }

  async function handleVersionLogAdd(log: { version: string; date: string; changelog: string }) {
    if (!employee) return;
    const res = await fetch(`/api/employees/${employee.id}/version-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error("提交失败");
    const created: VersionLog = await res.json();
    setEmployee((prev) =>
      prev ? { ...prev, versionLogs: [created, ...(prev.versionLogs ?? [])] } : prev
    );
  }

  const status = employee ? STATUS_MAP[employee.status] : null;
  const teamBg = employee ? (TEAM_BG[employee.team] ?? "bg-muted") : "bg-muted";
  const teamLabel = employee ? (TEAM_LABEL[employee.team] ?? employee.team) : "";
  const persona = employee?.persona ? JSON.parse(employee.persona) as EmployeePersona : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0"
        showCloseButton
      >
        {/* Accessible title — visually hidden, screen reader only */}
        <DialogTitle className="sr-only">
          {employee?.name ?? "员工详情"}
        </DialogTitle>

        {loading || !employee ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Hero */}
            <div className="flex flex-col sm:flex-row">
              {/* Portrait */}
              <div className={cn("relative w-full sm:w-60 h-64 sm:h-72 shrink-0 overflow-hidden rounded-tl-xl", teamBg)}>
                <AiAvatar
                  employeeId={employee.id}
                  team={employee.team}
                  avatar={employee.avatar}
                  name={employee.name}
                  fill
                />
                <div className="hidden sm:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
                <div className="sm:hidden absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
              </div>
              {/* Info */}
              <div className="flex-1 p-5 flex flex-col justify-center gap-2.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{employee.name}</h2>
                  {status && <Badge variant={status.variant}>{status.label}</Badge>}
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
                  <p className="text-sm text-muted-foreground italic">"{employee.soul}"</p>
                )}
                {employee.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{employee.description}</p>
                )}
                {persona && (
                  <div className="flex flex-col gap-2 mt-1">
                    <p className="text-sm italic text-muted-foreground">&quot;{persona.catchphrase}&quot;</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">{persona.mbti}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{persona.age}岁</span>
                      {persona.personality.map((p: string) => (
                        <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-xs">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-5">
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
                  <MetricsTab
                    current={employee.currentMetrics ?? null}
                    trend={employee.monthlyTrend ?? []}
                  />
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
