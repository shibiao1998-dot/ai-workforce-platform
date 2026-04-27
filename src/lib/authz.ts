import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, rolePermissions, roles } from "@/db/schema";
import { getCurrentUser, verifySessionFromRequest, type SessionUser } from "@/lib/auth";

export const MODULES = ["employees", "production", "org", "dashboard", "help", "settings"] as const;
export const ACTIONS = ["read", "write", "delete"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Module}.${Action}`;
export type UserPermissions = Record<Module, Action[]>;

export interface UserRoleInfo {
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  isSystem: boolean;
  permissions: UserPermissions;
}

function emptyPermissions(): UserPermissions {
  return {
    employees: [],
    production: [],
    org: [],
    dashboard: [],
    help: [],
    settings: [],
  };
}

/**
 * 加载某 UC 用户的角色和权限。
 * 用 React.cache 包装,单次请求内多次调用只查一次库。
 * 如果用户在 user_roles 中无记录(未登录过),返回 null。
 * AUTH_DISABLED=true 时返回 super-admin 等价的全权限。
 */
export const getUserRoleInfo = cache(async (ucUserId: string): Promise<UserRoleInfo | null> => {
  if (process.env.AUTH_DISABLED === "true") {
    const allPerms = emptyPermissions();
    for (const m of MODULES) allPerms[m] = [...ACTIONS];
    return {
      roleId: "dev-bypass",
      roleName: "super-admin",
      roleDisplayName: "超级管理员(开发模式)",
      isSystem: true,
      permissions: allPerms,
    };
  }

  const rows = await db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      isSystem: roles.isSystem,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.ucUserId, ucUserId));

  if (rows.length === 0) return null;
  const r = rows[0];

  const permRows = await db
    .select({ module: rolePermissions.module, action: rolePermissions.action })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, r.roleId));

  const permissions = emptyPermissions();
  for (const p of permRows) {
    permissions[p.module as Module].push(p.action as Action);
  }

  return {
    roleId: r.roleId,
    roleName: r.roleName,
    roleDisplayName: r.roleDisplayName,
    isSystem: r.isSystem,
    permissions,
  };
});

export function can(perms: UserPermissions, module: Module, action: Action): boolean {
  return perms[module]?.includes(action) ?? false;
}

/**
 * API route handler 中使用。
 * 未登录 → 抛 401;登录但无权限 → 抛 403。
 * 返回当前 SessionUser 便于后续埋点使用。
 * 因为 Next.js route handler 不能 throw Response,此函数返回元组 [user, errResponse]:
 *   const [, err] = await requirePermission("employees", "delete", request);
 *   if (err) return err;
 */
export async function requirePermission(
  module: Module,
  action: Action,
  request?: Request
): Promise<[SessionUser, null] | [null, NextResponse]> {
  let user: SessionUser | null;
  if (request && "cookies" in request && typeof (request as { cookies?: unknown }).cookies === "object") {
    // NextRequest 有 cookies 方法
    user = verifySessionFromRequest(request as unknown as import("next/server").NextRequest);
  } else {
    user = await getCurrentUser();
  }

  if (!user) {
    return [null, NextResponse.json({ error: "未认证" }, { status: 401 })];
  }

  const info = await getUserRoleInfo(user.userId);
  if (!info) {
    return [null, NextResponse.json({ error: "用户无角色,请联系管理员" }, { status: 403 })];
  }

  if (!can(info.permissions, module, action)) {
    return [
      null,
      NextResponse.json(
        { error: `无权限: ${module}.${action}`, required: `${module}.${action}` },
        { status: 403 }
      ),
    ];
  }

  return [user, null];
}
