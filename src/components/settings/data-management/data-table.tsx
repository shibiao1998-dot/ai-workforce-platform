"use client";

import React from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  loading = false,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(row.id));
  const someSelected = data.some((row) => selectedIds.has(row.id));

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selectedIds);
      data.forEach((row) => next.delete(row.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      data.forEach((row) => next.add(row.id));
      onSelectionChange(next);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={toggleAll}
                  className="cursor-pointer"
                  aria-label="全选"
                />
              </TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(ALIGN_CLASS[col.align ?? "left"])}
                >
                  {col.label}
                </TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="text-right w-20">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center py-10 text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center py-10 text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} data-state={selectedIds.has(row.id) ? "selected" : undefined}>
                  <TableCell className="px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="cursor-pointer"
                      aria-label="选择行"
                    />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(ALIGN_CLASS[col.align ?? "left"])}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEdit(row)}
                            title="编辑"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(row.id)}
                            title="删除"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          共 {total} 条{total > 0 && `，显示 ${start}–${end}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="px-2">
            {page} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
