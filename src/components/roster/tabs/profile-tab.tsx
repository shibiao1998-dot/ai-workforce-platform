"use client";

import { useState } from "react";
import { Employee } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileTabProps {
  employee: Employee;
  onSave: (updates: Partial<Employee>) => Promise<void>;
}

function StatusBadge({ status }: { status: Employee["status"] }) {
  const variantMap: Record<Employee["status"], "default" | "secondary" | "outline"> = {
    active: "default",
    developing: "secondary",
    planned: "outline",
  };
  const labelMap: Record<Employee["status"], string> = {
    active: "活跃",
    developing: "开发中",
    planned: "计划中",
  };
  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}

export function ProfileTab({ employee, onSave }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(employee.title);
  const [soul, setSoul] = useState(employee.soul ?? "");
  const [identity, setIdentity] = useState(employee.identity ?? "");
  const [description, setDescription] = useState(employee.description ?? "");

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar placeholder */}
            <div className="size-20 rounded-xl bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground flex-shrink-0">
              {employee.name.charAt(0)}
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">{employee.name}</CardTitle>
              <StatusBadge status={employee.status} />
            </div>
          </div>
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
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          ) : (
            <p className="text-sm text-foreground">{title}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="soul">灵魂</Label>
          {editing ? (
            <Textarea
              id="soul"
              value={soul}
              onChange={(e) => setSoul(e.target.value)}
              placeholder="描述 AI 员工的核心使命与价值观..."
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {soul || <span className="italic">未设置</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identity">身份</Label>
          {editing ? (
            <Textarea
              id="identity"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="描述 AI 员工的角色定位..."
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {identity || <span className="italic">未设置</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">简介</Label>
          {editing ? (
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述 AI 员工的能力与职责..."
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description || <span className="italic">未设置</span>}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
