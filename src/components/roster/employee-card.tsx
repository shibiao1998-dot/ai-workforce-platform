import { ArrowRight } from "lucide-react";

import { AiAvatar } from "@/components/shared/ai-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/lib/types";

const STATUS_MAP: Record<
  EmployeeListItem["status"],
  { label: string; className: string }
> = {
  active: {
    label: "在岗",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  developing: {
    label: "开发中",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  planned: {
    label: "规划中",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  inactive: {
    label: "已停用",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

const TEAM_BORDER: Record<EmployeeListItem["team"], string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
};

const TEAM_BG: Record<EmployeeListItem["team"], string> = {
  management: "bg-gradient-to-br from-purple-50 to-violet-100",
  design: "bg-gradient-to-br from-blue-50 to-sky-100",
  production: "bg-gradient-to-br from-green-50 to-emerald-100",
};

interface EmployeeCardProps {
  employee: EmployeeListItem;
  onClick?: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const status = STATUS_MAP[employee.status];
  const borderColor = TEAM_BORDER[employee.team];
  const teamBg = TEAM_BG[employee.team];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className="block cursor-pointer group/card outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      <div
        className="relative h-full overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 transition-all duration-300 group-hover/card:shadow-xl group-hover/card:-translate-y-1"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        {/* Portrait area */}
        <div className={cn("relative h-80 overflow-hidden", teamBg)}>
          <AiAvatar
            employeeId={employee.id}
            team={employee.team}
            avatar={employee.avatar}
            name={employee.name}
            fill
          />
          {/* Gradient overlay — blends portrait into white card body */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/70 to-transparent" />
          {/* Status badge */}
          <Badge
            className={cn("absolute top-3 right-3 shadow-sm", status.className)}
            variant="outline"
          >
            {status.label}
          </Badge>
        </div>

        {/* Info section */}
        <div className="relative -mt-6 px-4 pb-4 flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg font-bold text-foreground truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {employee.title}
            </p>
            {employee.description && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1 leading-relaxed">
                {employee.description}
              </p>
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-border/60">
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {employee.monthlyTaskCount}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">本月任务</span>
            </div>
            <div className="flex flex-col items-center border-x border-border/60">
              <span className="text-sm font-semibold text-foreground">
                {employee.adoptionRate != null
                  ? `${(employee.adoptionRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">采纳率</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {employee.accuracyRate != null
                  ? `${(employee.accuracyRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">准确率</span>
            </div>
          </div>

          {/* View detail button */}
          <div className="flex items-center justify-center gap-1.5 mt-1 py-2 rounded-lg bg-muted/60 text-xs font-medium text-muted-foreground group-hover/card:bg-primary/10 group-hover/card:text-primary transition-colors">
            <span>查看详情</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/card:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
