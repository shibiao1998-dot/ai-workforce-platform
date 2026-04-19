"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { EmployeeListItem, TeamType } from "@/lib/types";
import { EmployeeCard } from "./employee-card";
import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal";

type TabValue = "all" | TeamType;

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "management", label: "管理团队" },
  { value: "design", label: "设计师团队" },
  { value: "production", label: "生产团队" },
];

interface EmployeeGridProps {
  employees: EmployeeListItem[];
}

export function EmployeeGrid({ employees }: EmployeeGridProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = employees.filter((emp) => {
    const matchTeam = activeTab === "all" || emp.team === activeTab;
    const q = search.trim().toLowerCase();
    const matchSearch =
      q === "" ||
      emp.name.toLowerCase().includes(q) ||
      emp.title.toLowerCase().includes(q);
    return matchTeam && matchSearch;
  });

  function handleCardClick(id: string) {
    setSelectedId(id);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="搜索姓名或职位…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        共 {filtered.length} 名员工
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          没有匹配的员工
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onClick={() => handleCardClick(emp.id)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <EmployeeDetailModal
        employeeId={selectedId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
