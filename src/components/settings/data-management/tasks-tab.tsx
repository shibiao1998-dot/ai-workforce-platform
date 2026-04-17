"use client";

import { useState, useEffect, useCallback } from "react";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { Badge } from "@/components/ui/badge";
import { DataToolbar } from "./data-toolbar";
import { DataTable, Column } from "./data-table";
import { RecordDialog, FieldDef } from "./record-dialog";
import { cn } from "@/lib/utils";

// ──────────────────── 类型 ────────────────────

interface TaskRow {
  id: string;
  employeeId: string;
  employeeName: string | null;
  employeeAvatar: string | null;
  team: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  qualityScore: number | null;
  tokenUsage: number | null;
  retryCount: number | null;
  startTime: string | null;
  estimatedCost: string | null;
}

// ──────────────────── 常量 ────────────────────

const STATUS_LABELS: Record<string, string> = {
  running: "执行中",
  completed: "已完成",
  failed: "已失败",
};

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

// ──────────────────── 主组件 ────────────────────

export function TasksTab() {
  const [data, setData] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    team: "",
    status: "",
    type: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<TaskRow | null>(null);

  // ── 加载数据 ──
  const loadData = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(pageSize),
          search,
          team: filterValues.team,
          status: filterValues.status,
          type: filterValues.type,
        });
        const res = await fetch(`/api/data/tasks?${params}`);
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, filterValues]
  );

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }
  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  // ── 删除 ──
  async function deleteIds(ids: string[]) {
    await fetch("/api/data/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setSelectedIds(new Set());
    loadData(1);
    setPage(1);
  }

  // ── 编辑 ──
  async function handleEdit(values: Record<string, unknown>) {
    if (!editingRow) return;
    const res = await fetch(`/api/data/tasks/${editingRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qualityScore: values.qualityScore !== "" ? Number(values.qualityScore) : null,
        retryCount: values.retryCount !== "" ? Number(values.retryCount) : null,
        tokenUsage: values.tokenUsage !== "" ? Number(values.tokenUsage) : null,
        status: values.status,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "编辑失败");
    }
    loadData(page);
  }

  // ── 列定义 ──
  const columns: Column<TaskRow>[] = [
    {
      key: "name",
      label: "任务名称",
      render: (row) => (
        <a
          href={`/production?taskId=${row.id}`}
          className="text-primary hover:underline font-medium max-w-[180px] truncate block"
          title={row.name}
        >
          {row.name}
        </a>
      ),
    },
    {
      key: "employeeName",
      label: "员工",
      render: (row) => (
        <div className="flex items-center gap-2">
          <AiAvatar
            employeeId={row.employeeId}
            team={row.team}
            avatar={row.employeeAvatar}
            name={row.employeeName ?? ""}
            size="sm"
          />
          <span className="text-sm">{row.employeeName}</span>
        </div>
      ),
    },
    { key: "type", label: "类型" },
    {
      key: "status",
      label: "状态",
      render: (row) => (
        <Badge
          className={cn(STATUS_COLORS[row.status])}
          variant="outline"
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "qualityScore",
      label: "质量分",
      align: "right",
      render: (row) =>
        row.qualityScore != null ? String(row.qualityScore) : "—",
    },
    {
      key: "tokenUsage",
      label: "Token用量",
      align: "right",
      render: (row) =>
        row.tokenUsage != null ? row.tokenUsage.toLocaleString() : "—",
    },
    {
      key: "estimatedCost",
      label: "预估费用",
      align: "right",
      render: (row) =>
        row.estimatedCost ? `¥${row.estimatedCost}` : "—",
    },
    {
      key: "retryCount",
      label: "重试次数",
      align: "right",
      render: (row) =>
        row.retryCount != null ? String(row.retryCount) : "—",
    },
    {
      key: "startTime",
      label: "开始时间",
      render: (row) =>
        row.startTime
          ? new Date(row.startTime).toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
    },
  ];

  // ── 编辑字段 ──
  const editFields: FieldDef[] = [
    {
      key: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "running", label: "执行中" },
        { value: "completed", label: "已完成" },
        { value: "failed", label: "已失败" },
      ],
    },
    { key: "qualityScore", label: "质量分（0–100）", type: "number", placeholder: "0~100" },
    { key: "tokenUsage", label: "Token 用量", type: "number", placeholder: "0" },
    { key: "retryCount", label: "重试次数", type: "number", placeholder: "0" },
  ];

  function exportCSV() {
    const params = new URLSearchParams({
      type: "tasks",
      format: "csv",
      team: filterValues.team,
      status: filterValues.status,
      search,
    });
    window.open(`/api/data/export?${params}`);
  }
  function exportExcel() {
    const params = new URLSearchParams({
      type: "tasks",
      format: "xlsx",
      team: filterValues.team,
      status: filterValues.status,
      search,
    });
    window.open(`/api/data/export?${params}`);
  }

  return (
    <div className="space-y-4">
      <DataToolbar
        search={search}
        onSearchChange={handleSearchChange}
        filters={[
          {
            key: "team",
            label: "团队",
            options: [
              { value: "management", label: "管理" },
              { value: "design", label: "设计" },
              { value: "production", label: "生产" },
            ],
          },
          {
            key: "status",
            label: "状态",
            options: [
              { value: "running", label: "执行中" },
              { value: "completed", label: "已完成" },
              { value: "failed", label: "已失败" },
            ],
          },
          {
            key: "type",
            label: "类型",
            options: [
              { value: "内容创作", label: "内容创作" },
              { value: "数据分析", label: "数据分析" },
              { value: "代码开发", label: "代码开发" },
              { value: "设计创作", label: "设计创作" },
              { value: "流程审核", label: "流程审核" },
              { value: "项目管理", label: "项目管理" },
            ],
          },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        selectedCount={selectedIds.size}
        onBulkDelete={() => deleteIds([...selectedIds])}
        onExportCSV={exportCSV}
        onExportExcel={exportExcel}
        onAdd={() => {}}
        showAdd={false}
      />

      <DataTable
        columns={columns}
        data={data}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={(row) => setEditingRow(row)}
        onDelete={(id) => deleteIds([id])}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
      />

      {editingRow && (
        <RecordDialog
          open={!!editingRow}
          onOpenChange={(open) => {
            if (!open) setEditingRow(null);
          }}
          title="编辑任务数据"
          fields={editFields}
          initialValues={{
            status: editingRow.status,
            qualityScore: editingRow.qualityScore ?? "",
            tokenUsage: editingRow.tokenUsage ?? "",
            retryCount: editingRow.retryCount ?? "",
          }}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
