"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { EmployeeCreateDialog } from "@/components/settings/employee-create-dialog";
import { EmployeeEditDialog } from "@/components/settings/employee-edit-dialog";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/lib/types";

interface EmployeeManagerProps {
  initialEmployees: EmployeeListItem[];
}

const STATUS_CONFIG = {
  active: { label: "在岗", className: "bg-green-50 text-green-700 border-green-200" },
  developing: { label: "培养中", className: "bg-amber-50 text-amber-700 border-amber-200" },
  planned: { label: "规划中", className: "bg-blue-50 text-blue-700 border-blue-200" },
  inactive: { label: "下岗", className: "bg-gray-100 text-gray-500 border-gray-200" },
} as const;

const TEAM_CONFIG = {
  management: { label: "管理", borderClass: "border-l-purple-600" },
  design: { label: "设计", borderClass: "border-l-blue-600" },
  production: { label: "生产", borderClass: "border-l-green-600" },
} as const;

type TeamFilter = "all" | "management" | "design" | "production";

const TEAM_FILTER_OPTIONS: { value: TeamFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "management", label: "管理" },
  { value: "design", label: "设计" },
  { value: "production", label: "生产" },
];

export function EmployeeManager({ initialEmployees }: EmployeeManagerProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null);

  // Poll for avatar completion for employees without avatars
  useEffect(() => {
    const pending = employees.filter((e) => !e.avatar);
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        pending.map(async (e) => {
          const res = await fetch(`/api/employees/${e.id}/avatar-status`);
          const data = await res.json();
          return { id: e.id, status: data.status, avatar: data.avatar ?? null };
        })
      );
      const completed = updates.filter((u) => u.status === "completed" && u.avatar);
      if (completed.length > 0) {
        setEmployees((prev) =>
          prev.map((e) => {
            const u = completed.find((c) => c.id === e.id);
            return u ? { ...e, avatar: u.avatar } : e;
          })
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [employees]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: newStatus as EmployeeListItem["status"] } : e
      )
    );
  };

  const handleCreated = (created: Record<string, unknown>) => {
    setEmployees((prev) => [
      ...prev,
      {
        id: created.id as string,
        name: created.name as string,
        avatar: (created.avatar as string | null) ?? null,
        title: created.title as string,
        team: created.team as EmployeeListItem["team"],
        status: (created.status as EmployeeListItem["status"]) ?? "planned",
        monthlyTaskCount: 0,
        adoptionRate: null,
        accuracyRate: null,
        description: (created.description as string | null) ?? null,
        subTeam: (created.subTeam as string | null) ?? null,
      },
    ]);
  };

  const refreshEmployees = async () => {
    const res = await fetch("/api/employees");
    const data = await res.json();
    if (Array.isArray(data)) setEmployees(data);
  };

  const filtered = employees.filter((e) => {
    if (teamFilter !== "all" && e.team !== teamFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm shrink-0">
            AI员工列表 ({employees.length}人)
          </span>
          <div className="flex gap-1">
            {TEAM_FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={teamFilter === opt.value ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setTeamFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索员工..."
              className="h-8 pl-7 text-sm w-44"
            />
          </div>
          <EmployeeCreateDialog onCreated={handleCreated} />
        </div>
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            暂无符合条件的员工
          </p>
        )}
        {filtered.map((emp) => {
          const teamCfg = TEAM_CONFIG[emp.team] ?? TEAM_CONFIG.production;
          const statusCfg = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG.planned;
          const isInactive = emp.status === "inactive";

          return (
            <div
              key={emp.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border bg-card border-l-4",
                isInactive ? "border-l-gray-300 opacity-70" : teamCfg.borderClass
              )}
            >
              {/* Avatar */}
              <AiAvatar
                employeeId={emp.id}
                team={emp.team}
                avatar={emp.avatar}
                name={emp.name}
                size="md"
                className="rounded-lg shrink-0"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm">{emp.name}</span>
                  <Badge variant="outline" className={cn("text-xs py-0", statusCfg.className)}>
                    {statusCfg.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs py-0 bg-muted/50 text-muted-foreground border-muted">
                    {teamCfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {emp.title}
                  {emp.description && (
                    <span className="before:content-['·'] before:mx-1">{emp.description}</span>
                  )}
                </p>
              </div>

              {/* Metrics — active only */}
              {emp.status === "active" ? (
                <div className="hidden sm:grid grid-cols-3 gap-3 shrink-0 text-center">
                  <div>
                    <p className="text-xs font-medium">{emp.monthlyTaskCount}</p>
                    <p className="text-[10px] text-muted-foreground">本月任务</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">
                      {emp.adoptionRate != null
                        ? `${(emp.adoptionRate * 100).toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">采纳率</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">
                      {emp.accuracyRate != null
                        ? `${(emp.accuracyRate * 100).toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">准确率</p>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block w-[132px] shrink-0" aria-hidden />
              )}

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {/* 编辑 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setEditingEmployee(emp)}
                >
                  编辑
                </Button>
                {/* 上岗 */}
                {(emp.status === "inactive" ||
                  emp.status === "developing" ||
                  emp.status === "planned") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleStatusChange(emp.id, "active")}
                  >
                    上岗
                  </Button>
                )}
                {/* 下岗 — with confirmation for active */}
                {emp.status === "active" ? (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        />
                      }
                    >
                      下岗
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认下岗</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要将「{emp.name}」设为下岗状态吗？该员工将停止接收新任务。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleStatusChange(emp.id, "inactive")}
                        >
                          确认下岗
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : emp.status === "developing" || emp.status === "planned" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleStatusChange(emp.id, "inactive")}
                  >
                    下岗
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {editingEmployee && (
        <EmployeeEditDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(o) => { if (!o) setEditingEmployee(null); }}
          onSaved={() => { setEditingEmployee(null); refreshEmployees(); }}
        />
      )}
    </div>
  );
}
