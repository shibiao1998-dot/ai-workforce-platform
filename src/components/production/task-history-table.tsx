"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, ExternalLink } from "lucide-react";

interface HistoryTask {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  startTime: string | null;
  actualEndTime: string | null;
  team: string;
  employeeName: string;
}

const STATUS_CONFIG = {
  running: {
    label: "执行中",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "已完成",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  failed: {
    label: "失败",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function formatDate(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}

interface TaskHistoryTableProps {
  initialTasks: HistoryTask[];
}

export function TaskHistoryTable({ initialTasks }: TaskHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return initialTasks.filter((t) => {
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        t.type.toLowerCase().includes(search.toLowerCase());
      const matchTeam = teamFilter === "all" || t.team === teamFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchTeam && matchStatus;
    });
  }, [initialTasks, search, teamFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部团队" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部团队</SelectItem>
            <SelectItem value="management">管理团队</SelectItem>
            <SelectItem value="design">设计师团队</SelectItem>
            <SelectItem value="production">生产团队</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="running">执行中</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} 条记录
        </span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>任务名称</TableHead>
              <TableHead>执行者</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>完成时间</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((task) => (
              <TableRow key={task.id} className="group">
                <TableCell className="font-medium max-w-[200px] truncate">
                  {task.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {task.employeeName}
                </TableCell>
                <TableCell className="text-muted-foreground">{task.type}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_CONFIG[task.status].className)}
                  >
                    {STATUS_CONFIG[task.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(task.startTime)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(task.actualEndTime)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {calcDuration(task.startTime, task.actualEndTime)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/production/${task.id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
