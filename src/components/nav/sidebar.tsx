"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Cpu,
  GitBranch,
  Settings,
  Zap,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useHelpPanel } from "@/components/help/help-panel-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Module, UserPermissions } from "@/lib/authz-constants";

const NAV_ITEMS: Array<{ href: string; label: string; icon: typeof LayoutDashboard; module: Module }> = [
  { href: "/dashboard", label: "驾驶舱", icon: LayoutDashboard, module: "dashboard" },
  { href: "/roster", label: "AI花名册", icon: Users, module: "employees" },
  { href: "/production", label: "生产看板", icon: Cpu, module: "production" },
  { href: "/org", label: "组织架构", icon: GitBranch, module: "org" },
  { href: "/settings", label: "系统设置", icon: Settings, module: "settings" },
];

function UserPopover({ user, onLogout }: { user: { nickname: string; avatar: string }; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xs font-bold transition-shadow hover:ring-2 hover:ring-primary/40"
        title={user.nickname}
      >
        {user.nickname.slice(0, 1)}
      </button>
      {open && (
        <div className="absolute left-full bottom-0 ml-2 w-36 rounded-lg border border-border bg-card shadow-lg py-1 z-[100]">
          <div className="px-3 py-2 text-sm font-medium border-b border-border truncate">
            {user.nickname}
          </div>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  user: initialUser,
  permissions,
}: {
  user?: { nickname: string; avatar: string } | null;
  permissions?: UserPermissions | null;
}) {
  const pathname = usePathname();
  const { toggle } = useHelpPanel();
  const [user, setUser] = useState<{ nickname: string; avatar: string } | null>(initialUser ?? null);

  // 客户端获取用户信息，解决 layout 缓存导致 user 为 null 的问题
  useEffect(() => {
    if (user) return;
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.nickname) {
          setUser({ nickname: data.nickname, avatar: data.avatar || "" });
        }
      })
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const visibleItems = permissions
    ? NAV_ITEMS.filter((item) => permissions[item.module]?.includes("read"))
    : NAV_ITEMS;

  return (
    <TooltipProvider delay={0}>
      <aside className="fixed inset-y-0 left-0 z-50 flex w-16 flex-col items-center border-r border-border bg-card">
        {/* ── 顶部区域（不可压缩） ── */}
        <div className="shrink-0 flex flex-col items-center pt-3 pb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* ── 中间导航（可滚动，自动伸缩） ── */}
        <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-1 py-2">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Tooltip key={href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={href}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  }
                />
                <TooltipContent side="right">
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* ── 底部区域（不可压缩，永远可见） ── */}
        <div className="shrink-0 flex flex-col items-center gap-2 border-t border-border py-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={toggle}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              }
            />
            <TooltipContent side="right">
              <p>帮助中心</p>
            </TooltipContent>
          </Tooltip>

          {user ? (
            <UserPopover user={user} onLogout={handleLogout} />
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleLogout}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                }
              />
              <TooltipContent side="right">
                <p>退出登录</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
