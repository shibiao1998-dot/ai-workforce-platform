import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, rolePermissions, userRoles } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { MODULES, ACTIONS, type Module, type Action } from "@/lib/authz-constants";
import { logAudit } from "@/lib/audit";

interface CreateRoleBody {
  name: string;
  displayName: string;
  description?: string;
  permissions: Array<{ module: Module; action: Action }>;
}

export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      displayName: roles.displayName,
      description: roles.description,
      isSystem: roles.isSystem,
      userCount: sql<number>`(SELECT COUNT(*) FROM ${userRoles} WHERE ${userRoles.roleId} = ${roles.id})`,
    })
    .from(roles)
    .orderBy(roles.createdAt);

  const permsByRole = new Map<string, Array<{ module: Module; action: Action }>>();
  const allPerms = await db.select().from(rolePermissions);
  for (const p of allPerms) {
    if (!permsByRole.has(p.roleId)) permsByRole.set(p.roleId, []);
    permsByRole.get(p.roleId)!.push({ module: p.module as Module, action: p.action as Action });
  }

  return NextResponse.json(
    rows.map((r) => ({ ...r, permissions: permsByRole.get(r.id) ?? [] }))
  );
}

export async function POST(request: NextRequest) {
  const [user, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const body = (await request.json()) as CreateRoleBody;
  if (!body.name || !body.displayName) {
    return NextResponse.json({ error: "name 和 displayName 必填" }, { status: 400 });
  }

  for (const p of body.permissions ?? []) {
    if (!MODULES.includes(p.module) || !ACTIONS.includes(p.action)) {
      return NextResponse.json({ error: `非法权限: ${p.module}.${p.action}` }, { status: 400 });
    }
  }

  const existing = await db.select().from(roles).where(eq(roles.name, body.name));
  if (existing.length > 0) {
    return NextResponse.json({ error: "角色名已存在" }, { status: 409 });
  }

  const id = randomUUID();
  const now = new Date();

  await db.insert(roles).values({
    id,
    name: body.name,
    displayName: body.displayName,
    description: body.description ?? null,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });

  for (const p of body.permissions ?? []) {
    await db.insert(rolePermissions).values({
      id: randomUUID(),
      roleId: id,
      module: p.module,
      action: p.action,
    });
  }

  await logAudit(request, user, {
    action: "role.create",
    target: { type: "role", id },
    details: { name: body.name, permissions: body.permissions },
  });

  return NextResponse.json({ id });
}
