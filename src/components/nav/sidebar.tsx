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

function UserPopover({
  user,
  onLogout,
  isDashboard,
}: {
  user: { nickname: string; avatar: string };
  onLogout: () => void;
  isDashboard: boolean;
}) {
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
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-shadow hover:ring-2",
          isDashboard
            ? "bg-[hsl(218_95%_52%)] text-white shadow-[0_0_18px_hsl(218_95%_52%/0.45)] hover:ring-[hsl(172_85%_50%/0.36)]"
            : "bg-primary text-white hover:ring-primary/40",
        )}
        title={user.nickname}
      >
        {user.nickname.slice(0, 1)}
      </button>
      {open && (
        <div
          className={cn(
            "absolute bottom-0 left-full z-[100] ml-2 w-36 rounded-lg border py-1 shadow-lg",
            isDashboard
              ? "border-[hsl(184_82%_56%/0.24)] bg-[hsl(225_44%_13%)] text-[hsl(210_42%_94%)]"
              : "border-border bg-card",
          )}
        >
          <div
            className={cn(
              "truncate border-b px-3 py-2 text-sm font-medium",
              isDashboard ? "border-[hsl(215_34%_26%/0.68)]" : "border-border",
            )}
          >
            {user.nickname}
          </div>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
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
  const isDashboard = pathname.startsWith("/dashboard");

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
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-16 flex-col items-center border-r",
          isDashboard
            ? "border-[hsl(184_82%_56%/0.22)] bg-[linear-gradient(180deg,hsl(225_52%_7%/0.98),hsl(225_44%_12%/0.96))] shadow-[12px_0_34px_hsl(218_95%_18%/0.28)] backdrop-blur-xl"
            : "border-border bg-card",
        )}
      >
        {/* ── 顶部区域（不可压缩） ── */}
        <div className="shrink-0 flex flex-col items-center pt-3 pb-1">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isDashboard
                ? "border border-[hsl(184_82%_56%/0.24)] bg-[hsl(225_44%_15%/0.86)] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08),0_0_22px_hsl(218_95%_52%/0.22)]"
                : "bg-primary/10",
            )}
          >
            <Zap className={cn("h-5 w-5", isDashboard ? "text-[hsl(172_85%_50%)]" : "text-primary")} />
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
                        isDashboard
                          ? isActive
                            ? "bg-[hsl(218_95%_52%/0.22)] text-[hsl(172_85%_50%)] ring-1 ring-[hsl(172_85%_50%/0.24)] shadow-[0_0_20px_hsl(218_95%_52%/0.28)]"
                            : "text-[hsl(214_18%_68%)] hover:bg-[hsl(225_44%_18%/0.78)] hover:text-[hsl(210_42%_94%)]"
                          : isActive
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  }
                />
                <TooltipContent
                  side="right"
                  className={cn(
                    isDashboard &&
                      "border-[hsl(184_82%_56%/0.24)] bg-[hsl(225_44%_13%)] text-[hsl(210_42%_94%)]",
                  )}
                >
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* ── 底部区域（不可压缩，永远可见） ── */}
        <div
          className={cn(
            "shrink-0 flex flex-col items-center gap-2 border-t py-3",
            isDashboard ? "border-[hsl(184_82%_56%/0.16)]" : "border-border",
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={toggle}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isDashboard
                      ? "text-[hsl(214_18%_68%)] hover:bg-[hsl(225_44%_18%/0.78)] hover:text-[hsl(210_42%_94%)]"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              }
            />
            <TooltipContent
              side="right"
              className={cn(
                isDashboard &&
                  "border-[hsl(184_82%_56%/0.24)] bg-[hsl(225_44%_13%)] text-[hsl(210_42%_94%)]",
              )}
            >
              <p>帮助中心</p>
            </TooltipContent>
          </Tooltip>

          {user ? (
            <UserPopover user={user} onLogout={handleLogout} isDashboard={isDashboard} />
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-destructive/10 hover:text-destructive",
                      isDashboard ? "text-[hsl(214_18%_68%)]" : "text-muted-foreground",
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                }
              />
              <TooltipContent
                side="right"
                className={cn(
                  isDashboard &&
                    "border-[hsl(184_82%_56%/0.24)] bg-[hsl(225_44%_13%)] text-[hsl(210_42%_94%)]",
                )}
              >
                <p>退出登录</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
