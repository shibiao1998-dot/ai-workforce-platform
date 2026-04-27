"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/nav/sidebar";
import type { UserPermissions } from "@/lib/authz-constants";

/**
 * 根据路径条件渲染 Sidebar
 * login 相关页面不显示 Sidebar
 */
export function AppShell({
  children,
  user,
  permissions,
  roleDisplayName,
}: {
  children: React.ReactNode;
  user: { nickname: string; avatar: string } | null;
  permissions: UserPermissions | null;
  roleDisplayName: string | null;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith("/login");

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar user={user} permissions={permissions} roleDisplayName={roleDisplayName} />
      <main className="ml-16 h-dvh overflow-y-auto">{children}</main>
    </>
  );
}
