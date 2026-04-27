"use client";

import { useEffect, useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getAvatarURL } from "@/lib/uc-client";

interface UserRoleRow {
  id: string;
  ucUserId: string;
  nickname: string;
  avatar: string | null;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  lastLoginAt: string | null;
}

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

export function UserRoleManager() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const [rowsRes, rolesRes] = await Promise.all([
      fetch("/api/permissions/user-roles", { cache: "no-store" }),
      fetch("/api/permissions/roles", { cache: "no-store" }),
    ]);
    if (rowsRes.ok) setRows(await rowsRes.json());
    if (rolesRes.ok) {
      const data = (await rolesRes.json()) as Array<RoleOption>;
      setRoles(data);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.nickname.toLowerCase().includes(q) || r.ucUserId.includes(q)
    );
  }, [rows, search]);

  async function changeRole(id: string, roleId: string) {
    const res = await fetch(`/api/permissions/user-roles/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    if (res.ok) {
      await load();
      alert("角色已更新,该用户需重新登录才能生效");
    } else {
      const err = await res.json();
      alert(err.error ?? "修改失败");
    }
  }

  async function unassign(id: string) {
    if (!confirm("确认解除角色?(将重置为默认用户)")) return;
    const res = await fetch(`/api/permissions/user-roles/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else {
      const err = await res.json();
      alert(err.error ?? "解除失败");
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="搜索昵称或 UC ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setShowAdd(true)}>+ 添加用户</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>头像</TableHead>
            <TableHead>昵称</TableHead>
            <TableHead>UC ID</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>最后登录</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                让新用户先登录一次系统,再回此处分配角色
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted" />
                  )}
                </TableCell>
                <TableCell>{r.nickname}</TableCell>
                <TableCell className="font-mono text-xs">{r.ucUserId}</TableCell>
                <TableCell>
                  <Select value={r.roleId} onValueChange={(v) => v && changeRole(r.id, v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("zh-CN") : "—"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => unassign(r.id)}>
                    解除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showAdd && (
        <AddUserDialog
          roles={roles}
          onCloseAction={() => setShowAdd(false)}
          onAddedAction={async () => {
            setShowAdd(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AddUserDialog({
  roles,
  onCloseAction,
  onAddedAction,
}: {
  roles: RoleOption[];
  onCloseAction: () => void;
  onAddedAction: () => void;
}) {
  const [ucUserId, setUcUserId] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => r.name === "default")?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  function tryAutofill() {
    if (!/^\d+$/.test(ucUserId)) {
      alert("UC ID 必须是数字");
      return;
    }
    try {
      const url = getAvatarURL(Number(ucUserId));
      setAvatar(url);
    } catch (err) {
      console.warn(err);
    }
  }

  async function submit() {
    if (!ucUserId || !nickname) {
      alert("UC ID 和昵称必填");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/permissions/user-roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ucUserId, nickname, avatar, roleId: roleId || undefined }),
    });
    setSubmitting(false);
    if (res.ok) onAddedAction();
    else {
      const err = await res.json();
      alert(err.error ?? "添加失败");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCloseAction()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加用户</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>UC userId(数字)</Label>
            <div className="flex gap-2">
              <Input value={ucUserId} onChange={(e) => setUcUserId(e.target.value)} />
              <Button variant="outline" onClick={tryAutofill}>
                查头像
              </Button>
            </div>
          </div>
          <div>
            <Label>昵称</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div>
            <Label>角色</Label>
            <Select value={roleId} onValueChange={(v) => v && setRoleId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCloseAction}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
