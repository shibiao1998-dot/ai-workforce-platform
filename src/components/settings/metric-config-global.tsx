"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricConfigItem {
  id: string;
  employeeId: string | null;
  team: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

interface Props {
  configs: MetricConfigItem[];
  allConfigs: MetricConfigItem[];
  onRefresh: () => void;
}

export function MetricConfigGlobal({ configs, allConfigs, onRefresh }: Props) {
  const globalConfigs = configs.filter((c) => !c.employeeId && !c.team);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfigItem>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    taskType: "",
    humanBaseline: "",
    costPerHour: "",
    description: "",
  });

  const overrideCount = (taskType: string) =>
    allConfigs.filter(
      (c) => c.taskType === taskType && (c.employeeId || c.team)
    ).length;

  const startEdit = (cfg: MetricConfigItem) => {
    setEditingId(cfg.id);
    setEditForm({
      taskType: cfg.taskType,
      humanBaseline: cfg.humanBaseline,
      costPerHour: cfg.costPerHour,
      description: cfg.description ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    await fetch(`/api/metric-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: editForm.taskType,
        humanBaseline: Number(editForm.humanBaseline),
        costPerHour: Number(editForm.costPerHour),
        description: editForm.description || null,
      }),
    });
    setEditingId(null);
    onRefresh();
  };

  const handleCreate = async () => {
    await fetch("/api/metric-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: createForm.taskType,
        humanBaseline: Number(createForm.humanBaseline),
        costPerHour: Number(createForm.costPerHour),
        description: createForm.description || null,
      }),
    });
    setCreateOpen(false);
    setCreateForm({ taskType: "", humanBaseline: "", costPerHour: "", description: "" });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/metric-configs/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          全局基准适用于所有团队和员工，除非被团队或员工层级覆盖。
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />新增基准</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增全局基准配置</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>任务类型</Label>
                <Input
                  value={createForm.taskType}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, taskType: e.target.value })
                  }
                  placeholder="例：文案撰写"
                />
              </div>
              <div className="space-y-1">
                <Label>人工基准耗时 (h)</Label>
                <Input
                  type="number"
                  value={createForm.humanBaseline}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, humanBaseline: e.target.value })
                  }
                  placeholder="例：2.5"
                />
              </div>
              <div className="space-y-1">
                <Label>时薪 (¥/h)</Label>
                <Input
                  type="number"
                  value={createForm.costPerHour}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, costPerHour: e.target.value })
                  }
                  placeholder="例：46.875"
                />
              </div>
              <div className="space-y-1">
                <Label>说明（可选）</Label>
                <Input
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  placeholder="简短描述"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!createForm.taskType || !createForm.humanBaseline}
              >
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>任务类型</TableHead>
              <TableHead>人工基准耗时 (h)</TableHead>
              <TableHead>时薪 (¥/h)</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="text-center">覆盖数</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {globalConfigs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无全局基准配置
                </TableCell>
              </TableRow>
            )}
            {globalConfigs.map((cfg) => (
              <TableRow key={cfg.id}>
                <TableCell>
                  {editingId === cfg.id ? (
                    <Input
                      value={editForm.taskType}
                      onChange={(e) =>
                        setEditForm({ ...editForm, taskType: e.target.value })
                      }
                      className="h-7 text-sm"
                    />
                  ) : (
                    cfg.taskType
                  )}
                </TableCell>
                <TableCell>
                  {editingId === cfg.id ? (
                    <Input
                      type="number"
                      value={editForm.humanBaseline}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          humanBaseline: parseFloat(e.target.value),
                        })
                      }
                      className="h-7 text-sm w-24"
                    />
                  ) : (
                    cfg.humanBaseline
                  )}
                </TableCell>
                <TableCell>
                  {editingId === cfg.id ? (
                    <Input
                      type="number"
                      value={editForm.costPerHour}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          costPerHour: parseFloat(e.target.value),
                        })
                      }
                      className="h-7 text-sm w-28"
                    />
                  ) : (
                    `¥${cfg.costPerHour}`
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {editingId === cfg.id ? (
                    <Input
                      value={editForm.description ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      className="h-7 text-sm"
                    />
                  ) : (
                    cfg.description ?? "—"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {overrideCount(cfg.taskType) > 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5">
                      {overrideCount(cfg.taskType)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === cfg.id ? (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => saveEdit(cfg.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(cfg)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn("h-7 w-7 text-destructive hover:text-destructive")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              删除全局基准「{cfg.taskType}」后，依赖此基准的团队/员工覆盖仍保留，但将失去全局参考值。此操作不可撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(cfg.id)}>
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
