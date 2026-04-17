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
import { EmployeeListItem } from "@/lib/types";

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
  employees: EmployeeListItem[];
  onRefresh: () => void;
}

const TEAM_LABELS: Record<string, string> = {
  management: "管理",
  design: "设计",
  production: "生产",
};

export function MetricConfigEmployee({ configs, employees, onRefresh }: Props) {
  const activeEmployees = employees.filter((e) => e.status !== "inactive");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    activeEmployees[0]?.id ?? ""
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfigItem>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    taskType: "",
    humanBaseline: "",
    costPerHour: "",
    description: "",
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const globalConfigs = configs.filter((c) => !c.employeeId && !c.team);
  const teamConfigs = configs.filter(
    (c) => !c.employeeId && c.team === selectedEmployee?.team
  );
  const employeeConfigs = configs.filter(
    (c) => c.employeeId === selectedEmployeeId
  );
  const employeeOverrideTypes = new Set(employeeConfigs.map((c) => c.taskType));
  const allTaskTypes = Array.from(new Set(globalConfigs.map((c) => c.taskType)));
  const addableTaskTypes = allTaskTypes.filter((t) => !employeeOverrideTypes.has(t));

  const getGlobalConfig = (taskType: string) =>
    globalConfigs.find((c) => c.taskType === taskType);
  const getTeamConfig = (taskType: string) =>
    teamConfigs.find((c) => c.taskType === taskType);
  const getEmployeeConfig = (taskType: string) =>
    employeeConfigs.find((c) => c.taskType === taskType);

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
        employeeId: selectedEmployeeId,
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

  const teamLabel = selectedEmployee ? TEAM_LABELS[selectedEmployee.team] ?? selectedEmployee.team : "";

  return (
    <div className="space-y-4">
      {/* Employee selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedEmployeeId} onValueChange={(v) => { if (v) { setSelectedEmployeeId(v); setEditingId(null); } }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="选择员工" />
          </SelectTrigger>
          <SelectContent>
            {activeEmployees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}（{TEAM_LABELS[emp.team] ?? emp.team}·{emp.title}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" disabled={!selectedEmployeeId}><Plus className="h-4 w-4 mr-1" />添加覆盖</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                为「{selectedEmployee?.name}」添加员工覆盖
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>任务类型</Label>
                {addableTaskTypes.length > 0 ? (
                  <Select
                    value={addForm.taskType}
                    onValueChange={(v) => {
                      if (!v) return;
                      const teamCfg = getTeamConfig(v);
                      const globalCfg = getGlobalConfig(v);
                      const ref = teamCfg ?? globalCfg;
                      setAddForm({
                        ...addForm,
                        taskType: v,
                        humanBaseline: ref ? String(ref.humanBaseline) : "",
                        costPerHour: ref ? String(ref.costPerHour) : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择任务类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {addableTaskTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">所有任务类型已有员工覆盖</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>员工基准耗时 (h)</Label>
                <Input
                  type="number"
                  value={addForm.humanBaseline}
                  onChange={(e) => setAddForm({ ...addForm, humanBaseline: e.target.value })}
                  placeholder="覆盖上层基准值"
                />
              </div>
              <div className="space-y-1">
                <Label>时薪覆盖 (¥/h)</Label>
                <Input
                  type="number"
                  value={addForm.costPerHour}
                  onChange={(e) => setAddForm({ ...addForm, costPerHour: e.target.value })}
                  placeholder="留空则沿用上层值"
                />
              </div>
              <div className="space-y-1">
                <Label>说明（可选）</Label>
                <Input
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
              <Button onClick={handleAdd} disabled={!addForm.taskType || !addForm.humanBaseline}>
                添加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info banner */}
      {selectedEmployee && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          {selectedEmployee.name} 的最终生效值 = 员工覆盖 &gt; {teamLabel}团队覆盖 &gt; 全局基准
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>任务类型</TableHead>
              <TableHead>全局 (h)</TableHead>
              <TableHead>团队 (h)</TableHead>
              <TableHead>员工覆盖 (h)</TableHead>
              <TableHead>✓ 生效值</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!selectedEmployeeId ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  请先选择员工
                </TableCell>
              </TableRow>
            ) : allTaskTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无全局基准配置
                </TableCell>
              </TableRow>
            ) : (
              allTaskTypes.map((taskType) => {
                const global = getGlobalConfig(taskType);
                const team = getTeamConfig(taskType);
                const emp = getEmployeeConfig(taskType);
                const isEditingEmp = emp && editingId === emp.id;

                // determine effective value
                let effectiveLabel: string;
                let effectiveBg: string;
                if (emp) {
                  effectiveLabel = `${emp.humanBaseline}h（员工）`;
                  effectiveBg = "bg-blue-50 text-blue-700";
                } else if (team) {
                  effectiveLabel = `${team.humanBaseline}h（团队）`;
                  effectiveBg = "bg-purple-50 text-purple-700";
                } else if (global) {
                  effectiveLabel = `${global.humanBaseline}h（全局）`;
                  effectiveBg = "bg-muted text-muted-foreground";
                } else {
                  effectiveLabel = "—";
                  effectiveBg = "bg-muted text-muted-foreground";
                }

                return (
                  <TableRow key={taskType}>
                    <TableCell>{taskType}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {global ? `${global.humanBaseline}h` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {team ? `${team.humanBaseline}h` : "—"}
                    </TableCell>
                    <TableCell>
                      {isEditingEmp ? (
                        <Input
                          type="number"
                          value={editForm.humanBaseline}
                          onChange={(e) =>
                            setEditForm({ ...editForm, humanBaseline: parseFloat(e.target.value) })
                          }
                          className="h-7 text-sm w-24"
                        />
                      ) : emp ? (
                        <span className="font-medium">{emp.humanBaseline}h</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-medium", effectiveBg)}>
                        {effectiveLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      {emp ? (
                        isEditingEmp ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => saveEdit(emp.id)}
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
                              onClick={() => startEdit(emp)}
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
                                  <AlertDialogTitle>确认移除覆盖</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    移除后将回退至团队或全局基准值。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(emp.id)}>
                                    移除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            const ref = getTeamConfig(taskType) ?? getGlobalConfig(taskType);
                            setAddForm({
                              taskType,
                              humanBaseline: ref ? String(ref.humanBaseline) : "",
                              costPerHour: ref ? String(ref.costPerHour) : "",
                              description: "",
                            });
                            setAddOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-0.5" />添加
                        </Button>
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
