"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { EmployeeListItem } from "@/lib/types";

interface EmployeeManagerProps {
  initialEmployees: EmployeeListItem[];
}

const STATUS_CONFIG = {
  active: {
    label: "在岗",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  developing: {
    label: "开发中",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  planned: {
    label: "规划中",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export function EmployeeManager({ initialEmployees }: EmployeeManagerProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    team: "management",
    status: "planned",
  });

  const handleCreate = async () => {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const created = await res.json();
    setEmployees((prev) => [
      ...prev,
      { ...created, monthlyTaskCount: 0, adoptionRate: null, accuracyRate: null },
    ]);
    setForm({ name: "", title: "", team: "management", status: "planned" });
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">AI员工列表 ({employees.length}人)</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />新增员工
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增 AI 员工</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>名称</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：AI数据分析师"
                />
              </div>
              <div>
                <Label>职位</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：数据分析专家"
                />
              </div>
              <div>
                <Label>所属团队</Label>
                <Select
                  value={form.team}
                  onValueChange={(v) => setForm({ ...form, team: v ?? form.team })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="management">管理团队</SelectItem>
                    <SelectItem value="design">设计师团队</SelectItem>
                    <SelectItem value="production">生产团队</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>状态</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v ?? form.status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">在岗</SelectItem>
                    <SelectItem value="developing">开发中</SelectItem>
                    <SelectItem value="planned">规划中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                className="w-full"
                disabled={!form.name || !form.title}
              >
                创建员工
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {employees.map((emp) => (
          <div key={emp.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{emp.name}</span>
                <Badge
                  variant="outline"
                  className={STATUS_CONFIG[emp.status].className}
                >
                  {STATUS_CONFIG[emp.status].label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{emp.title}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除「{emp.name}」吗？此操作不可撤销，相关技能、指标和任务数据也将一并删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(emp.id)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
