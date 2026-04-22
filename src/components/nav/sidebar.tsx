"use client";

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
} from "lucide-react";
import { useHelpPanel } from "@/components/help/help-panel-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/dashboard", label: "驾驶舱", icon: LayoutDashboard },
  { href: "/roster", label: "AI花名册", icon: Users },
  { href: "/production", label: "生产看板", icon: Cpu },
  { href: "/org", label: "组织架构", icon: GitBranch },
  { href: "/settings", label: "系统设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { toggle } = useHelpPanel();

  return (
    <TooltipProvider delay={0}>
      <aside className="flex h-screen w-16 flex-col items-center border-r border-border bg-card py-4 gap-2">
        {/* Logo */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
          <Zap className="h-5 w-5 text-primary" />
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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

        {/* Help button */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={toggle}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mb-2"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            }
          />
          <TooltipContent side="right">
            <p>帮助中心</p>
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
}
