"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Check, X } from "lucide-react";

interface MetricConfig {
  id: string;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
}

export function MetricConfigManager({
  initialConfigs,
}: {
  initialConfigs: MetricConfig[];
}) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricConfig>>({});

  const startEdit = (cfg: MetricConfig) => {
    setEditingId(cfg.id);
    setEditForm({
      taskType: cfg.taskType,
      humanBaseline: cfg.humanBaseline,
      costPerHour: cfg.costPerHour,
      description: cfg.description ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/metric-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">指标基准配置</h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>任务类型</TableHead>
              <TableHead>人工基准耗时 (h)</TableHead>
              <TableHead>时薪 (¥/h)</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((cfg) => (
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
                      className="h-7 text-sm w-20"
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
                      className="h-7 text-sm w-24"
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => startEdit(cfg)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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
