import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { getUserRoleInfo, type UserRoleInfo } from "@/lib/authz";
import type { Module, UserPermissions } from "@/lib/authz-constants";

export interface CurrentUserWithPermissions extends SessionUser {
  role: { name: string; displayName: string; isSystem: boolean };
  permissions: UserPermissions;
}

/**
 * Server Component 用:读取当前用户 + 权限。
 * 单次请求内被多次调用只会真查一次库(React.cache)。
 * 未登录返回 null;登录但无角色(异常状态)也返回 null。
 */
export const getCurrentUserWithPermissions = cache(async (): Promise<CurrentUserWithPermissions | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const info: UserRoleInfo | null = await getUserRoleInfo(user.userId);
  if (!info) return null;

  return {
    ...user,
    role: {
      name: info.roleName,
      displayName: info.roleDisplayName,
      isSystem: info.isSystem,
    },
    permissions: info.permissions,
  };
});

/**
 * Server Component / Page 用:无 read 权限直接 redirect。
 * 使用场景:页面顶部 `await requirePageReadAccess("production")`。
 */
export async function requirePageReadAccess(module: Module): Promise<CurrentUserWithPermissions> {
  const me = await getCurrentUserWithPermissions();
  if (!me) redirect("/login");
  if (!me.permissions[module].includes("read")) redirect("/403");
  return me;
}

/**
 * Server Component 用:无 write 权限则 redirect /403。
 */
export async function requirePageWriteAccess(module: Module): Promise<CurrentUserWithPermissions> {
  const me = await getCurrentUserWithPermissions();
  if (!me) redirect("/login");
  if (!me.permissions[module].includes("write")) redirect("/403");
  return me;
}
