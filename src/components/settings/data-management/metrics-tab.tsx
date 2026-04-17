"use client";

import { useState, useEffect, useCallback } from "react";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { Badge } from "@/components/ui/badge";
import { DataToolbar } from "./data-toolbar";
import { DataTable, Column } from "./data-table";
import { DataBreadcrumb, BreadcrumbItem } from "./data-breadcrumb";
import { DataSummaryCards } from "./data-summary-cards";
import { RecordDialog, FieldDef } from "./record-dialog";

// ──────────────────── 类型 ────────────────────

interface MetricRow {
  id: string;
  employeeId: string;
  employeeName: string | null;
  employeeAvatar: string | null;
  team: string;
  period: string;
  taskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  humanTimeSaved: number | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  team: string;
}

// ──────────────────── 工具函数 ────────────────────

const TEAM_LABELS: Record<string, string> = {
  management: "管理",
  design: "设计",
  production: "生产",
};

const TEAM_COLORS: Record<string, string> = {
  management: "bg-purple-100 text-purple-700 border-purple-200",
  design: "bg-blue-100 text-blue-700 border-blue-200",
  production: "bg-green-100 text-green-700 border-green-200",
};

/** 生成最近 6 个月的期间选项（YYYY-MM） */
function getLast6Periods(): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ value, label: value });
  }
  return result;
}

// ──────────────────── 主组件 ────────────────────

export function MetricsTab() {
  const [data, setData] = useState<MetricRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    team: "",
    period: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 员工列表（用于新增对话框）
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // 新增/编辑对话框
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MetricRow | null>(null);

  // 面包屑（drill-down）
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { label: "全部数据" },
  ]);
  const [drillEmployeeId, setDrillEmployeeId] = useState("");

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
          period: filterValues.period,
          ...(drillEmployeeId ? { employeeId: drillEmployeeId } : {}),
        });
        const res = await fetch(`/api/data/metrics?${params}`);
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, filterValues, drillEmployeeId]
  );

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  // 搜索/筛选变化时重置到第1页
  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }
  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  // ── 加载员工列表 ──
  async function fetchEmployees() {
    if (employees.length > 0) return;
    const res = await fetch("/api/employees");
    const json = await res.json();
    setEmployees(json ?? []);
  }

  // ── 删除 ──
  async function deleteIds(ids: string[]) {
    await fetch("/api/data/metrics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setSelectedIds(new Set());
    loadData(1);
    setPage(1);
  }

  // ── 新增 ──
  async function handleAdd(values: Record<string, unknown>) {
    const res = await fetch("/api/data/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: values.employeeId,
        period: values.period,
        taskCount: Number(values.taskCount) || 0,
        adoptionRate: values.adoptionRate !== "" ? Number(values.adoptionRate) / 100 : null,
        accuracyRate: values.accuracyRate !== "" ? Number(values.accuracyRate) / 100 : null,
        humanTimeSaved: values.humanTimeSaved !== "" ? Number(values.humanTimeSaved) : null,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "新增失败");
    }
    loadData(1);
    setPage(1);
  }

  // ── 编辑 ──
  async function handleEdit(values: Record<string, unknown>) {
    if (!editingRow) return;
    const res = await fetch(`/api/data/metrics/${editingRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period: values.period,
        taskCount: Number(values.taskCount) || 0,
        adoptionRate: values.adoptionRate !== "" ? Number(values.adoptionRate) / 100 : null,
        accuracyRate: values.accuracyRate !== "" ? Number(values.accuracyRate) / 100 : null,
        humanTimeSaved: values.humanTimeSaved !== "" ? Number(values.humanTimeSaved) : null,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "编辑失败");
    }
    loadData(page);
  }

  // ── Drill-down：点击团队 ──
  function drillTeam(team: string) {
    setFilterValues((prev) => ({ ...prev, team }));
    setBreadcrumb([
      {
        label: "全部数据",
        onClick: () => {
          setFilterValues((prev) => ({ ...prev, team: "" }));
          setDrillEmployeeId("");
          setBreadcrumb([{ label: "全部数据" }]);
          setPage(1);
        },
      },
      { label: TEAM_LABELS[team] ?? team },
    ]);
    setPage(1);
  }

  // ── Drill-down：点击员工 ──
  function drillEmployee(row: MetricRow) {
    setDrillEmployeeId(row.employeeId);
    const teamLabel = TEAM_LABELS[row.team] ?? row.team;
    setBreadcrumb([
      {
        label: "全部数据",
        onClick: () => {
          setFilterValues((prev) => ({ ...prev, team: "" }));
          setDrillEmployeeId("");
          setBreadcrumb([{ label: "全部数据" }]);
          setPage(1);
        },
      },
      {
        label: teamLabel,
        onClick: () => {
          setFilterValues((prev) => ({ ...prev, team: row.team }));
          setDrillEmployeeId("");
          setBreadcrumb([
            {
              label: "全部数据",
              onClick: () => {
                setFilterValues((prev) => ({ ...prev, team: "" }));
                setDrillEmployeeId("");
                setBreadcrumb([{ label: "全部数据" }]);
                setPage(1);
              },
            },
            { label: teamLabel },
          ]);
          setPage(1);
        },
      },
      { label: row.employeeName ?? row.employeeId },
    ]);
    setPage(1);
  }

  // ── 摘要卡片（仅 drill-down 时显示） ──
  const summaryCards =
    breadcrumb.length > 1
      ? [
          {
            label: "记录数",
            value: total,
          },
          {
            label: "总任务数",
            value: data.reduce((s, r) => s + (r.taskCount ?? 0), 0),
          },
          {
            label: "平均采纳率",
            value:
              data.length > 0
                ? `${(
                    (data.reduce((s, r) => s + (r.adoptionRate ?? 0), 0) /
                      data.length) *
                    100
                  ).toFixed(1)}%`
                : "—",
          },
          {
            label: "平均准确率",
            value:
              data.length > 0
                ? `${(
                    (data.reduce((s, r) => s + (r.accuracyRate ?? 0), 0) /
                      data.length) *
                    100
                  ).toFixed(1)}%`
                : "—",
          },
        ]
      : [];

  // ── 列定义 ──
  const columns: Column<MetricRow>[] = [
    {
      key: "employeeName",
      label: "员工",
      render: (row) => (
        <button
          type="button"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          onClick={() => drillEmployee(row)}
        >
          <AiAvatar
            employeeId={row.employeeId}
            team={row.team}
            avatar={row.employeeAvatar}
            name={row.employeeName ?? ""}
            size="sm"
          />
          <span className="text-sm font-medium">{row.employeeName}</span>
        </button>
      ),
    },
    {
      key: "team",
      label: "团队",
      render: (row) => (
        <button
          type="button"
          onClick={() => drillTeam(row.team)}
          className="cursor-pointer"
        >
          <Badge
            className={TEAM_COLORS[row.team]}
            variant="outline"
          >
            {TEAM_LABELS[row.team] ?? row.team}
          </Badge>
        </button>
      ),
    },
    { key: "period", label: "期间" },
    { key: "taskCount", label: "任务数", align: "right" },
    {
      key: "adoptionRate",
      label: "采纳率",
      align: "right",
      render: (row) =>
        row.adoptionRate != null
          ? `${(row.adoptionRate * 100).toFixed(1)}%`
          : "—",
    },
    {
      key: "accuracyRate",
      label: "准确率",
      align: "right",
      render: (row) =>
        row.accuracyRate != null
          ? `${(row.accuracyRate * 100).toFixed(1)}%`
          : "—",
    },
    {
      key: "humanTimeSaved",
      label: "节省人时",
      align: "right",
      render: (row) =>
        row.humanTimeSaved != null ? `${row.humanTimeSaved}h` : "—",
    },
  ];

  // ── 新增字段定义 ──
  const addFields: FieldDef[] = [
    {
      key: "employeeId",
      label: "员工",
      type: "select",
      required: true,
      options: employees.map((e) => ({
        value: e.id,
        label: `${e.name}（${TEAM_LABELS[e.team] ?? e.team}）`,
      })),
      placeholder: "请选择员工",
    },
    {
      key: "period",
      label: "期间",
      type: "select",
      required: true,
      options: getLast6Periods(),
      placeholder: "YYYY-MM",
    },
    { key: "taskCount", label: "任务数", type: "number", placeholder: "0" },
    {
      key: "adoptionRate",
      label: "采纳率（%）",
      type: "number",
      placeholder: "例：85.5",
    },
    {
      key: "accuracyRate",
      label: "准确率（%）",
      type: "number",
      placeholder: "例：92.0",
    },
    {
      key: "humanTimeSaved",
      label: "节省人时（h）",
      type: "number",
      placeholder: "例：12.5",
    },
  ];

  const editFields: FieldDef[] = addFields.filter((f) => f.key !== "employeeId");

  // ── 导出 ──
  function exportCSV() {
    const params = new URLSearchParams({
      type: "metrics",
      format: "csv",
      team: filterValues.team,
      period: filterValues.period,
      search,
    });
    window.open(`/api/data/export?${params}`);
  }
  function exportExcel() {
    const params = new URLSearchParams({
      type: "metrics",
      format: "xlsx",
      team: filterValues.team,
      period: filterValues.period,
      search,
    });
    window.open(`/api/data/export?${params}`);
  }

  return (
    <div className="space-y-4">
      {/* 面包屑 */}
      <DataBreadcrumb items={breadcrumb} />

      {/* 摘要卡片（仅 drill-down 时） */}
      {summaryCards.length > 0 && <DataSummaryCards cards={summaryCards} />}

      {/* 工具栏 */}
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
            key: "period",
            label: "期间",
            options: getLast6Periods(),
          },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        selectedCount={selectedIds.size}
        onBulkDelete={() => deleteIds([...selectedIds])}
        onExportCSV={exportCSV}
        onExportExcel={exportExcel}
        onAdd={() => {
          fetchEmployees();
          setAddOpen(true);
        }}
        addLabel="新增绩效"
      />

      {/* 表格 */}
      <DataTable
        columns={columns}
        data={data}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={(row) => {
          setEditingRow(row);
        }}
        onDelete={(id) => deleteIds([id])}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
      />

      {/* 新增对话框 */}
      <RecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="新增绩效记录"
        fields={addFields}
        onSubmit={handleAdd}
      />

      {/* 编辑对话框 */}
      {editingRow && (
        <RecordDialog
          open={!!editingRow}
          onOpenChange={(open) => {
            if (!open) setEditingRow(null);
          }}
          title="编辑绩效记录"
          fields={editFields}
          initialValues={{
            period: editingRow.period,
            taskCount: editingRow.taskCount,
            adoptionRate:
              editingRow.adoptionRate != null
                ? (editingRow.adoptionRate * 100).toFixed(1)
                : "",
            accuracyRate:
              editingRow.accuracyRate != null
                ? (editingRow.accuracyRate * 100).toFixed(1)
                : "",
            humanTimeSaved: editingRow.humanTimeSaved ?? "",
          }}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
