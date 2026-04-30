import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, rolePermissions, userRoles } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { type Module, type Action } from "@/lib/authz-constants";
import { logAudit } from "@/lib/audit";
import { sql } from "drizzle-orm";
import { validatePermissionInputs } from "@/lib/role-permission-validation";

interface UpdateRoleBody {
  displayName?: string;
  description?: string;
  permissions?: Array<{ module: Module; action: Action }>;
}

async function loadRolePerms(roleId: string): Promise<Array<{ module: Module; action: Action }>> {
  const rows = await db
    .select({ module: rolePermissions.module, action: rolePermissions.action })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((r) => ({ module: r.module as Module, action: r.action as Action }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const { id } = await params;
  const rows = await db.select().from(roles).where(eq(roles.id, id));
  if (rows.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

  return NextResponse.json({ ...rows[0], permissions: await loadRolePerms(id) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const { id } = await params;
  const existing = await db.select().from(roles).where(eq(roles.id, id));
  if (existing.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  if (existing[0].isSystem) return NextResponse.json({ error: "内置角色不可修改" }, { status: 403 });

  const body = (await request.json()) as UpdateRoleBody;
  let permissions: Array<{ module: Module; action: Action }> | null = null;
  if (body.permissions !== undefined) {
    try {
      permissions = validatePermissionInputs(body.permissions);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "权限格式非法" }, { status: 400 });
    }
  }
  const beforePerms = await loadRolePerms(id);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.displayName) updates.displayName = body.displayName;
  if (body.description !== undefined) updates.description = body.description;

  await db.update(roles).set(updates).where(eq(roles.id, id));

  if (permissions) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    for (const p of permissions) {
      await db.insert(rolePermissions).values({
        id: randomUUID(),
        roleId: id,
        module: p.module,
        action: p.action,
      });
    }
  }

  await logAudit(request, user, {
    action: "role.update",
    target: { type: "role", id },
    details: {
      before: { permissions: beforePerms },
      after: { displayName: body.displayName, permissions },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, err] = await requirePermission("settings", "delete", request);
  if (err) return err;

  const { id } = await params;
  const existing = await db.select().from(roles).where(eq(roles.id, id));
  if (existing.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  if (existing[0].isSystem) return NextResponse.json({ error: "内置角色不可删除" }, { status: 403 });

  const userCountResult = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(userRoles)
    .where(eq(userRoles.roleId, id));
  if (userCountResult[0].c > 0) {
    return NextResponse.json(
      { error: `该角色下有 ${userCountResult[0].c} 个用户,请先解除关联` },
      { status: 409 }
    );
  }

  await db.delete(roles).where(eq(roles.id, id));
  await logAudit(request, user, {
    action: "role.delete",
    target: { type: "role", id },
    details: { name: existing[0].name },
  });

  return NextResponse.json({ ok: true });
}
