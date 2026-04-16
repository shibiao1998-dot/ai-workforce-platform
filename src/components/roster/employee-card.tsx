import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const TEAM_MAP: Record<EmployeeListItem["team"], string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
};

interface EmployeeCardProps {
  employee: EmployeeListItem;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const status = STATUS_MAP[employee.status];
  const teamLabel = TEAM_MAP[employee.team];
  const avatarChar = employee.name.slice(2, 3);

  return (
    <Link href={`/roster/${employee.id}`} className="block group/link">
      <Card className="h-full transition-shadow hover:ring-foreground/20 hover:shadow-md">
        <CardContent className="flex flex-col gap-3 pt-4">
          {/* Header: avatar + name + status */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-base font-semibold select-none">
              {avatarChar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {employee.name}
                </span>
                <Badge
                  className={status.className}
                  variant="outline"
                >
                  {status.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {employee.title}
              </p>
            </div>
          </div>

          {/* Team label */}
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
              {teamLabel}
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-foreground">
                {employee.monthlyTaskCount}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">本月任务</span>
            </div>
            <div className="flex flex-col items-center border-x border-border">
              <span className="text-base font-semibold text-foreground">
                {employee.adoptionRate != null
                  ? `${(employee.adoptionRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">采纳率</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-foreground">
                {employee.accuracyRate != null
                  ? `${(employee.accuracyRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">准确率</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
