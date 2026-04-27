"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RolePermissionMatrix, type PermissionSet } from "./role-permission-matrix";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: PermissionSet;
}

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPerms, setDraftPerms] = useState<PermissionSet>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  async function loadRoles() {
    const res = await fetch("/api/permissions/roles", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as Role[];
      setRoles(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    }
  }

  useEffect(() => {
    loadRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDraftDisplayName(selected.displayName);
    setDraftDescription(selected.description ?? "");
    setDraftPerms(selected.permissions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function save() {
    if (!selected || selected.isSystem) return;
    setSaving(true);
    const res = await fetch(`/api/permissions/roles/${selected.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: draftDisplayName,
        description: draftDescription,
        permissions: draftPerms,
      }),
    });
    setSaving(false);
    if (res.ok) {
      await loadRoles();
      alert("已保存");
    } else {
      const err = await res.json();
      alert(err.error ?? "保存失败");
    }
  }

  async function remove() {
    if (!selected || selected.isSystem) return;
    if (selected.userCount > 0) {
      alert(`该角色下有 ${selected.userCount} 个用户,请先解除关联`);
      return;
    }
    if (!confirm(`确认删除角色「${selected.displayName}」?`)) return;
    const res = await fetch(`/api/permissions/roles/${selected.id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedId(null);
      await loadRoles();
    } else {
      const err = await res.json();
      alert(err.error ?? "删除失败");
    }
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6">
      <div className="border-r border-border pr-4">
        <Button size="sm" className="mb-3 w-full" onClick={() => setShowCreate(true)}>
          + 新建角色
        </Button>
        <div className="flex flex-col gap-1">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedId === r.id ? "bg-primary/10 font-medium" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{r.displayName}</span>
                {r.isSystem ? (
                  <span className="text-xs text-muted-foreground">内置</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{r.userCount} 人</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        {selected ? (
          <div className="flex flex-col gap-4">
            <div>
              <Label>角色名</Label>
              <div className="mt-1 text-sm text-muted-foreground">{selected.name}</div>
            </div>
            <div>
              <Label>显示名</Label>
              <Input
                value={draftDisplayName}
                onChange={(e) => setDraftDisplayName(e.target.value)}
                disabled={selected.isSystem}
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                disabled={selected.isSystem}
              />
            </div>
            <div>
              <Label>权限</Label>
              <RolePermissionMatrix
                value={draftPerms}
                onChangeAction={setDraftPerms}
                disabled={selected.isSystem}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={selected.isSystem || saving}>
                保存
              </Button>
              <Button variant="destructive" onClick={remove} disabled={selected.isSystem}>
                删除
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">请从左侧选择角色</div>
        )}
      </div>

      {showCreate && (
        <CreateRoleDialog
          onCloseAction={() => setShowCreate(false)}
          onCreatedAction={async (id) => {
            setShowCreate(false);
            await loadRoles();
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}

function CreateRoleDialog({
  onCloseAction,
  onCreatedAction,
}: {
  onCloseAction: () => void;
  onCreatedAction: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name || !displayName) {
      alert("请填写 name 和 displayName");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/permissions/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, displayName, description, permissions: [] }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      onCreatedAction(data.id);
    } else {
      const err = await res.json();
      alert(err.error ?? "创建失败");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCloseAction()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建角色</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>角色 name(英文小写,创建后不可改)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. production-lead" />
          </div>
          <div>
            <Label>显示名</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="生产主管" />
          </div>
          <div>
            <Label>描述</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCloseAction}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
