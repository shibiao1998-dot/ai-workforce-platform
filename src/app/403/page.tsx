import Link from "next/link";
import { getCurrentUserWithPermissions } from "@/lib/authz-server";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage() {
  const me = await getCurrentUserWithPermissions();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
      <p className="text-xl">您没有访问该页面的权限</p>
      {me && (
        <p className="text-sm text-muted-foreground">
          当前账号: {me.nickname} · 角色: {me.role.displayName}
        </p>
      )}
      <p className="text-sm text-muted-foreground">如需开通权限,请联系系统管理员</p>
      <Link
        href="/roster"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        返回首页
      </Link>
    </div>
  );
}
