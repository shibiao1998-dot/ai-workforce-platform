import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AiAvatar } from "@/components/shared/ai-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/lib/types";

const STATUS_MAP: Record<
  EmployeeListItem["status"],
  { label: string; className: string }
> = {
  active: {
    label: "在岗",
    className: "bg-green-50 text-green-700",
  },
  developing: {
    label: "开发中",
    className: "bg-amber-50 text-amber-700",
  },
  planned: {
    label: "规划中",
    className: "bg-gray-100 text-gray-600",
  },
};

const TEAM_BORDER: Record<EmployeeListItem["team"], string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
};

const TEAM_AVATAR_BG: Record<EmployeeListItem["team"], string> = {
  management: "bg-purple-50",
  design: "bg-blue-50",
  production: "bg-green-50",
};

interface EmployeeCardProps {
  employee: EmployeeListItem;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const status = STATUS_MAP[employee.status];
  const borderColor = TEAM_BORDER[employee.team];
  const avatarBg = TEAM_AVATAR_BG[employee.team];

  return (
    <Link href={`/roster/${employee.id}`} className="block group/link">
      <Card
        className="h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        {/* Avatar area */}
        <div className={cn("relative flex items-center justify-center", avatarBg)} style={{ height: 160 }}>
          <AiAvatar
            employeeId={employee.id}
            team={employee.team}
            avatar={employee.avatar}
            name={employee.name}
            size="xl"
          />
          {/* Status badge — top right */}
          <Badge
            className={cn("absolute top-2 right-2", status.className)}
            variant="outline"
          >
            {status.label}
          </Badge>
        </div>

        <CardContent className="flex flex-col gap-2 p-4">
          {/* Name + title + description */}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground truncate">
              {employee.name}
            </span>
            <p className="text-xs text-muted-foreground truncate">
              {employee.title}
            </p>
            {employee.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {employee.description}
              </p>
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border">
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {employee.monthlyTaskCount}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">本月任务</span>
            </div>
            <div className="flex flex-col items-center border-x border-border">
              <span className="text-sm font-semibold text-foreground">
                {employee.adoptionRate != null
                  ? `${(employee.adoptionRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">采纳率</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {employee.accuracyRate != null
                  ? `${(employee.accuracyRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">准确率</span>
            </div>
          </div>

          {/* View detail button (visual only — whole card is a link) */}
          <div className="flex items-center justify-center gap-1 mt-1 py-1.5 rounded-md bg-muted text-xs text-muted-foreground group-hover/link:bg-primary/10 group-hover/link:text-primary transition-colors">
            <span>查看详情</span>
            <ArrowRight className="size-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
