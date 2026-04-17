"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/lib/types";

interface FormState {
  name: string;
  title: string;
  team: string;
  subTeam: string;
  status: string;
  description: string;
  soul: string;
  identity: string;
}

interface SkillDisplay {
  id: string;
  name: string;
  category: string;
  level: number;
}

export interface EmployeeEditDialogProps {
  employee: EmployeeListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EmployeeEditDialog({
  employee,
  open,
  onOpenChange,
  onSaved,
}: EmployeeEditDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>({
    name: employee.name,
    title: employee.title,
    team: employee.team,
    subTeam: employee.subTeam ?? "生产管理层",
    status: employee.status,
    description: employee.description ?? "",
    soul: "",
    identity: "",
  });
  const [skills, setSkills] = useState<SkillDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch full employee data when dialog opens
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setLoading(true);
    fetch(`/api/employees/${employee.id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          title: data.title ?? "",
          team: data.team ?? "production",
          subTeam: data.subTeam ?? "生产管理层",
          status: data.status ?? "planned",
          description: data.description ?? "",
          soul: data.soul ?? "",
          identity: data.identity ?? "",
        });
        setSkills(
          (data.skills ?? []).map((s: SkillDisplay) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            level: s.level,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [open, employee.id]);

  const updateForm = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          title: form.title,
          team: form.team,
          subTeam: form.team === "production" ? form.subTeam : null,
          status: form.status,
          description: form.description || null,
          soul: form.soul || null,
          identity: form.identity || null,
        }),
      });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = form.name.trim() !== "" && form.title.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑 AI 员工</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex gap-1 mt-1 mb-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    s <= step ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Step labels */}
            <div className="flex justify-between text-xs text-muted-foreground mb-4 -mt-2">
              <span className={cn(step >= 1 && "text-primary font-medium")}>基本信息</span>
              <span className={cn(step >= 2 && "text-primary font-medium")}>性格设定</span>
              <span className={cn(step >= 3 && "text-primary font-medium")}>技能配置</span>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>
                    姓名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    placeholder="如：AI数据分析师"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>
                    职位 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateForm({ title: e.target.value })}
                    placeholder="如：数据分析专家"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>所属团队</Label>
                  <Select
                    value={form.team}
                    onValueChange={(v) => updateForm({ team: v ?? form.team })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="management">管理团队</SelectItem>
                      <SelectItem value="design">设计团队</SelectItem>
                      <SelectItem value="production">生产团队</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.team === "production" && (
                  <div>
                    <Label>子团队</Label>
                    <Select
                      value={form.subTeam}
                      onValueChange={(v) => updateForm({ subTeam: v ?? form.subTeam })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="生产管理层">生产管理层</SelectItem>
                        <SelectItem value="内容生产层">内容生产层</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>状态</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => updateForm({ status: v ?? form.status })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">规划中</SelectItem>
                      <SelectItem value="developing">培养中</SelectItem>
                      <SelectItem value="active">在岗</SelectItem>
                      <SelectItem value="inactive">下岗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>简介</Label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    placeholder="员工简介（可选）"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>灵魂设定</Label>
                  <p className="text-xs text-muted-foreground mb-1">AI 员工的核心性格与工作哲学</p>
                  <textarea
                    value={form.soul}
                    onChange={(e) => updateForm({ soul: e.target.value })}
                    placeholder="描述该 AI 员工的核心性格特质和工作哲学..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <Label>身份设定</Label>
                  <p className="text-xs text-muted-foreground mb-1">角色定位与背景设定</p>
                  <textarea
                    value={form.identity}
                    onChange={(e) => updateForm({ identity: e.target.value })}
                    placeholder="描述该 AI 员工的角色定位、背景经历与专业领域..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Step 3 — read-only skills */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>技能列表</Label>
                  <span className="text-xs text-muted-foreground">如需修改请前往员工详情页</span>
                </div>
                {skills.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-md">
                    暂无技能配置
                  </p>
                )}
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-3 p-3 border rounded-md bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.category}</p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      Lv.{skill.level}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={step === 1}
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
              >
                上一步
              </Button>
              {step < 3 ? (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={step === 1 && !canProceedStep1}
                  onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "保存中..." : "保存修改"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
