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

interface SkillMetricRow {
  id: string;
  employeeId: string;
  employeeName: string | null;
  employeeAvatar: string | null;
  team: string;
  skillId: string;
  skillName: string | null;
  category: string | null;
  period: string;
  invocationCount: number;
  successRate: number | null;
  avgResponseTime: number | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  team: string;
}

// ──────────────────── 常量 ────────────────────

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

const CATEGORY_LABELS: Record<string, string> = {
  核心能力: "核心能力",
  分析能力: "分析能力",
  输出能力: "输出能力",
};

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

export function SkillMetricsTab() {
  const [data, setData] = useState<SkillMetricRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    team: "",
    period: "",
    category: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SkillMetricRow | null>(null);

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
          category: filterValues.category,
          ...(drillEmployeeId ? { employeeId: drillEmployeeId } : {}),
        });
        const res = await fetch(`/api/data/skill-metrics?${params}`);
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

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }
  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function fetchEmployees() {
    if (employees.length > 0) return;
    const res = await fetch("/api/employees");
    const json = await res.json();
    setEmployees(json ?? []);
  }

  // ── 删除 ──
  async function deleteIds(ids: string[]) {
    await fetch("/api/data/skill-metrics", {
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
    const res = await fetch("/api/data/skill-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: values.employeeId,
        skillId: values.skillId,
        period: values.period,
        invocationCount: Number(values.invocationCount) || 0,
        successRate: values.successRate !== "" ? Number(values.successRate) / 100 : null,
        avgResponseTime: values.avgResponseTime !== "" ? Number(values.avgResponseTime) : null,
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
    const res = await fetch(`/api/data/skill-metrics/${editingRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period: values.period,
        invocationCount: Number(values.invocationCount) || 0,
        successRate: values.successRate !== "" ? Number(values.successRate) / 100 : null,
        avgResponseTime: values.avgResponseTime !== "" ? Number(values.avgResponseTime) : null,
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
  function drillEmployee(row: SkillMetricRow) {
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

  const summaryCards =
    breadcrumb.length > 1
      ? [
          { label: "记录数", value: total },
          {
            label: "总调用次数",
            value: data.reduce((s, r) => s + (r.invocationCount ?? 0), 0),
          },
          {
            label: "平均成功率",
            value:
              data.length > 0
                ? `${(
                    (data.reduce((s, r) => s + (r.successRate ?? 0), 0) /
                      data.length) *
                    100
                  ).toFixed(1)}%`
                : "—",
          },
          {
            label: "平均响应时间",
            value:
              data.length > 0
                ? `${(
                    data.reduce((s, r) => s + (r.avgResponseTime ?? 0), 0) /
                    data.length
                  ).toFixed(0)}ms`
                : "—",
          },
        ]
      : [];

  // ── 列定义 ──
  const columns: Column<SkillMetricRow>[] = [
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
    { key: "skillName", label: "技能名称" },
    {
      key: "category",
      label: "分类",
      render: (row) =>
        row.category ? (
          <Badge variant="secondary">{CATEGORY_LABELS[row.category] ?? row.category}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "team",
      label: "团队",
      render: (row) => (
        <button type="button" onClick={() => drillTeam(row.team)} className="cursor-pointer">
          <Badge className={TEAM_COLORS[row.team]} variant="outline">
            {TEAM_LABELS[row.team] ?? row.team}
          </Badge>
        </button>
      ),
    },
    { key: "period", label: "期间" },
    { key: "invocationCount", label: "调用次数", align: "right" },
    {
      key: "successRate",
      label: "成功率",
      align: "right",
      render: (row) =>
        row.successRate != null ? `${(row.successRate * 100).toFixed(1)}%` : "—",
    },
    {
      key: "avgResponseTime",
      label: "响应时间",
      align: "right",
      render: (row) =>
        row.avgResponseTime != null ? `${row.avgResponseTime}ms` : "—",
    },
  ];

  // ── 新增字段 ──
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
      key: "skillId",
      label: "技能 ID",
      type: "text",
      required: true,
      placeholder: "输入技能 ID",
    },
    {
      key: "period",
      label: "期间",
      type: "select",
      required: true,
      options: getLast6Periods(),
    },
    { key: "invocationCount", label: "调用次数", type: "number", placeholder: "0" },
    { key: "successRate", label: "成功率（%）", type: "number", placeholder: "例：95.0" },
    { key: "avgResponseTime", label: "响应时间（ms）", type: "number", placeholder: "例：120" },
  ];

  const editFields: FieldDef[] = [
    {
      key: "period",
      label: "期间",
      type: "select",
      required: true,
      options: getLast6Periods(),
    },
    { key: "invocationCount", label: "调用次数", type: "number" },
    { key: "successRate", label: "成功率（%）", type: "number" },
    { key: "avgResponseTime", label: "响应时间（ms）", type: "number" },
  ];

  function exportCSV() {
    const params = new URLSearchParams({
      type: "skill-metrics",
      format: "csv",
      team: filterValues.team,
      period: filterValues.period,
      search,
    });
    window.open(`/api/data/export?${params}`);
  }
  function exportExcel() {
    const params = new URLSearchParams({
      type: "skill-metrics",
      format: "xlsx",
      team: filterValues.team,
      period: filterValues.period,
      search,
    });
    window.open(`/api/data/export?${params}`);
  }

  return (
    <div className="space-y-4">
      <DataBreadcrumb items={breadcrumb} />
      {summaryCards.length > 0 && <DataSummaryCards cards={summaryCards} />}

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
          {
            key: "category",
            label: "分类",
            options: [
              { value: "核心能力", label: "核心能力" },
              { value: "分析能力", label: "分析能力" },
              { value: "输出能力", label: "输出能力" },
            ],
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
        addLabel="新增技能指标"
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

      <RecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="新增技能指标"
        fields={addFields}
        onSubmit={handleAdd}
      />

      {editingRow && (
        <RecordDialog
          open={!!editingRow}
          onOpenChange={(open) => {
            if (!open) setEditingRow(null);
          }}
          title="编辑技能指标"
          fields={editFields}
          initialValues={{
            period: editingRow.period,
            invocationCount: editingRow.invocationCount,
            successRate:
              editingRow.successRate != null
                ? (editingRow.successRate * 100).toFixed(1)
                : "",
            avgResponseTime: editingRow.avgResponseTime ?? "",
          }}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
