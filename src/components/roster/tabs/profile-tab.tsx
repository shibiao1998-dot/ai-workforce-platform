"use client";

import { useState } from "react";
import { Employee, EmployeePersona } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ProfileTabProps {
  employee: Employee;
  onSave: (updates: Partial<Employee>) => Promise<void>;
}

export function ProfileTab({ employee, onSave }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(employee.title);
  const [soul, setSoul] = useState(employee.soul ?? "");
  const [identity, setIdentity] = useState(employee.identity ?? "");
  const [description, setDescription] = useState(employee.description ?? "");
  const persona = employee.persona ? JSON.parse(employee.persona) as EmployeePersona : null;

  function handleCancel() {
    setTitle(employee.title);
    setSoul(employee.soul ?? "");
    setIdentity(employee.identity ?? "");
    setDescription(employee.description ?? "");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ title, soul, identity, description });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">基本信息</h3>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "保存中..." : "保存"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  编辑
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">职位</Label>
            {editing ? (
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            ) : (
              <p className="text-sm text-foreground">{title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="soul">灵魂</Label>
            {editing ? (
              <Textarea id="soul" value={soul} onChange={(e) => setSoul(e.target.value)} placeholder="描述 AI 员工的核心使命与价值观..." />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {soul || <span className="italic">未设置</span>}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identity">身份</Label>
            {editing ? (
              <Textarea id="identity" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="描述 AI 员工的角色定位..." />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {identity || <span className="italic">未设置</span>}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">简介</Label>
            {editing ? (
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述 AI 员工的能力与职责..." />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {description || <span className="italic">未设置</span>}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {persona && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">IP 人设卡</h3>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground text-xs">年龄</Label>
                <p>{persona.age}岁</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">MBTI</Label>
                <p>{persona.mbti}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">性格标签</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {persona.personality.map((p: string) => (
                  <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-xs">{p}</span>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">口头禅</Label>
              <p className="italic">&quot;{persona.catchphrase}&quot;</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">背景故事</Label>
              <p className="text-muted-foreground">{persona.backstory}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">工作风格</Label>
              <p className="text-muted-foreground">{persona.workStyle}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">兴趣爱好</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {persona.interests.map((i: string) => (
                  <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{i}</span>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">穿搭风格</Label>
              <p className="text-muted-foreground">{persona.fashionStyle}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">标志性特征</Label>
              <p>{persona.visualTraits}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
