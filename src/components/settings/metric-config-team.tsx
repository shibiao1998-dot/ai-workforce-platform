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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onRefresh: () => void;
}

const TEAMS = [
  { value: "management", label: "管理团队" },
  { value: "design", label: "设计团队" },
  { value: "production", label: "生产团队" },
] as const;

export function MetricConfigTeam({ configs, onRefresh }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<"management" | "design" | "production">("management");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfigItem>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    taskType: "",
    humanBaseline: "",
    costPerHour: "",
    description: "",
  });

  const globalConfigs = configs.filter((c) => !c.employeeId && !c.team);
  const teamConfigs = configs.filter(
    (c) => !c.employeeId && c.team === selectedTeam
  );
  const overriddenTaskTypes = new Set(teamConfigs.map((c) => c.taskType));
  const availableGlobalTypes = globalConfigs
    .map((c) => c.taskType)
    .filter((t) => !overriddenTaskTypes.has(t));

  const getGlobalBaseline = (taskType: string) =>
    globalConfigs.find((c) => c.taskType === taskType);

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

  const handleAdd = async () => {
    await fetch("/api/metric-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team: selectedTeam,
        taskType: addForm.taskType,
        humanBaseline: Number(addForm.humanBaseline),
        costPerHour: Number(addForm.costPerHour) || undefined,
        description: addForm.description || null,
      }),
    });
    setAddOpen(false);
    setAddForm({ taskType: "", humanBaseline: "", costPerHour: "", description: "" });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/metric-configs/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Team selector */}
      <div className="flex items-center gap-2">
        {TEAMS.map((t) => (
          <Button
            key={t.value}
            variant={selectedTeam === t.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedTeam(t.value);
              setEditingId(null);
            }}
          >
            {t.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />添加覆盖</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                为「{TEAMS.find((t) => t.value === selectedTeam)?.label}」添加覆盖
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>任务类型</Label>
                {availableGlobalTypes.length > 0 ? (
                  <Select
                    value={addForm.taskType}
                    onValueChange={(v) => {
                      if (!v) return;
                      const global = getGlobalBaseline(v);
                      setAddForm({
                        ...addForm,
                        taskType: v,
                        humanBaseline: global ? String(global.humanBaseline) : "",
                        costPerHour: global ? String(global.costPerHour) : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择任务类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGlobalTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    所有全局任务类型已有覆盖配置
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>团队基准耗时 (h)</Label>
                <Input
                  type="number"
                  value={addForm.humanBaseline}
                  onChange={(e) =>
                    setAddForm({ ...addForm, humanBaseline: e.target.value })
                  }
                  placeholder="覆盖全局基准值"
                />
              </div>
              <div className="space-y-1">
                <Label>时薪覆盖 (¥/h)</Label>
                <Input
                  type="number"
                  value={addForm.costPerHour}
                  onChange={(e) =>
                    setAddForm({ ...addForm, costPerHour: e.target.value })
                  }
                  placeholder="留空则沿用全局值"
                />
              </div>
              <div className="space-y-1">
                <Label>说明（可选）</Label>
                <Input
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm({ ...addForm, description: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!addForm.taskType || !addForm.humanBaseline}
              >
                添加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>任务类型</TableHead>
              <TableHead>全局基准 (h)</TableHead>
              <TableHead>团队覆盖值 (h)</TableHead>
              <TableHead>时薪覆盖 (¥/h)</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamConfigs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  该团队暂无覆盖配置
                </TableCell>
              </TableRow>
            ) : (
              teamConfigs.map((cfg) => {
                const global = getGlobalBaseline(cfg.taskType);
                return (
                  <TableRow key={cfg.id}>
                    <TableCell>{cfg.taskType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {global ? (
                        <span className="line-through">{global.humanBaseline}h</span>
                      ) : (
                        "—"
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
                        <span className="font-medium text-blue-600">
                          {cfg.humanBaseline}h
                        </span>
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
                                  className={cn(
                                    "h-7 w-7 text-destructive hover:text-destructive"
                                  )}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认移除覆盖</AlertDialogTitle>
                                <AlertDialogDescription>
                                  移除后该团队将回退至全局基准值。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(cfg.id)}
                                >
                                  移除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
