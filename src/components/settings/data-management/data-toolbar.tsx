"use client";

import React from "react";
import {
  Search,
  FileDown,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface DataToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filters: FilterOption[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onAdd: () => void;
  addLabel?: string;
  showAdd?: boolean;
}

export function DataToolbar({
  search,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  selectedCount,
  onBulkDelete,
  onExportCSV,
  onExportExcel,
  onAdd,
  addLabel = "新增",
  showAdd = true,
}: DataToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索..."
          className="pl-8 h-8 w-48"
        />
      </div>

      {/* 动态筛选下拉 */}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filterValues[filter.key] ?? ""}
          onValueChange={(v) => onFilterChange(filter.key, v ?? "")}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部{filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      <div className="flex-1" />

      {/* 已选数量 + 批量删除 */}
      {selectedCount > 0 && (
        <span className="text-xs text-muted-foreground">
          已选 {selectedCount} 条
        </span>
      )}
      {selectedCount > 0 && onBulkDelete && (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                <Trash2 className="size-3.5 mr-1" />
                批量删除
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认批量删除</AlertDialogTitle>
              <AlertDialogDescription>
                将删除选中的 {selectedCount} 条记录，此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={onBulkDelete}
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 导出 CSV */}
      <Button variant="outline" size="sm" onClick={onExportCSV}>
        <FileDown className="size-3.5 mr-1" />
        CSV
      </Button>

      {/* 导出 Excel */}
      <Button variant="outline" size="sm" onClick={onExportExcel}>
        <FileSpreadsheet className="size-3.5 mr-1" />
        Excel
      </Button>

      {/* 新增 */}
      {showAdd && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-3.5 mr-1" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
