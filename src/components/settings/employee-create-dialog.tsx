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
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillEntry {
  name: string;
  category: string;
  level: string;
}

interface FormState {
  name: string;
  title: string;
  team: string;
  subTeam: string;
  status: string;
  description: string;
  soul: string;
  identity: string;
  skills: SkillEntry[];
}

const DEFAULT_FORM: FormState = {
  name: "",
  title: "",
  team: "management",
  subTeam: "生产管理层",
  status: "planned",
  description: "",
  soul: "",
  identity: "",
  skills: [],
};

interface EmployeeCreateDialogProps {
  onCreated: (employee: Record<string, unknown>) => void;
}

export function EmployeeCreateDialog({ onCreated }: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const addSkill = () =>
    updateForm({
      skills: [...form.skills, { name: "", category: "核心能力", level: "3" }],
    });

  const removeSkill = (i: number) =>
    updateForm({ skills: form.skills.filter((_, idx) => idx !== i) });

  const updateSkill = (i: number, patch: Partial<SkillEntry>) =>
    updateForm({
      skills: form.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
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
      const created = await res.json();

      const validSkills = form.skills.filter((s) => s.name.trim());
      if (validSkills.length > 0) {
        await fetch(`/api/employees/${created.id}/skills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: validSkills.map((s) => ({
              name: s.name.trim(),
              category: s.category,
              level: parseInt(s.level),
            })),
          }),
        });
      }

      onCreated(created);
      setOpen(false);
      setStep(1);
      setForm(DEFAULT_FORM);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = form.name.trim() !== "" && form.title.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            新增员工
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增 AI 员工</DialogTitle>
        </DialogHeader>

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

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>技能列表（可选）</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSkill}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加技能
              </Button>
            </div>
            {form.skills.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-md">
                暂无技能，点击"添加技能"按钮添加
              </p>
            )}
            {form.skills.map((skill, i) => (
              <div key={i} className="flex gap-2 items-start p-3 border rounded-md bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Input
                    value={skill.name}
                    onChange={(e) => updateSkill(i, { name: e.target.value })}
                    placeholder="技能名称"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Select
                      value={skill.category}
                      onValueChange={(v) => updateSkill(i, { category: v ?? skill.category })}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="核心能力">核心能力</SelectItem>
                        <SelectItem value="分析能力">分析能力</SelectItem>
                        <SelectItem value="输出能力">输出能力</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={skill.level}
                      onValueChange={(v) => updateSkill(i, { level: v ?? skill.level })}
                    >
                      <SelectTrigger className="h-8 text-xs w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((l) => (
                          <SelectItem key={l} value={String(l)}>
                            Lv.{l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeSkill(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
              {submitting ? "创建中..." : "创建员工"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
