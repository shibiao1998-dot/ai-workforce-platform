import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Output {
  id: string;
  taskId: string;
  type: string;
  title: string;
  content: string | null;
  url: string | null;
  createdAt: string | null;
}

interface TaskDetailData {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  actualEndTime: string | null;
  team: string;
  employeeId: string;
  employeeName: string;
  outputs: Output[];
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

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("zh-CN");
}

export function TaskDetail({ task }: { task: TaskDetailData }) {
  const status = STATUS_CONFIG[task.status];
  return (
    <div className="p-8 max-w-3xl">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/production" />} className="mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />返回生产看板
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{task.name}</h1>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            执行者：
            <Link
              href={`/roster/${task.employeeId}`}
              className="text-primary hover:underline"
            >
              {task.employeeName}
            </Link>
            {" · "}类型：{task.type}
          </p>
        </div>

        {/* Progress */}
        {task.status === "running" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {task.currentStep ?? "处理中..."}
                </span>
                <span className="font-bold text-primary">{task.progress}%</span>
              </div>
              <Progress value={task.progress} />
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">执行时间线</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">开始时间</span>
              <span>{fmt(task.startTime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">预计完成</span>
              <span>{fmt(task.estimatedEndTime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">实际完成</span>
              <span>{fmt(task.actualEndTime)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        {task.outputs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">产出内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.outputs.map((output) => (
                <div
                  key={output.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{output.title}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {output.type}
                    </Badge>
                  </div>
                  {output.content && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {output.content}
                    </p>
                  )}
                  {output.url && (
                    <a
                      href={output.url}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon className="h-3 w-3" />查看资源
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {task.outputs.length === 0 && (
          <p className="text-sm text-muted-foreground">暂无产出记录</p>
        )}
      </div>
    </div>
  );
}
