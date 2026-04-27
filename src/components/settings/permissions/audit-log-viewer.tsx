"use client";

import React, { useEffect, useState, useCallback } from "react";
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

interface AuditLog {
  id: string;
  operatorUcId: string;
  operatorNickname: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

interface ListResponse {
  items: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
}

export function AuditLogViewer() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (filterAction) params.set("action", filterAction);
    if (filterOperator) params.set("operator", filterOperator);
    const res = await fetch(`/api/permissions/audit-logs?${params}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [page, filterAction, filterOperator]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (filterAction) params.set("action", filterAction);
    if (filterOperator) params.set("operator", filterOperator);
    window.location.href = `/api/permissions/audit-logs?${params}`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="筛选动作 (如 role.create)"
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="筛选操作者 UC ID"
          value={filterOperator}
          onChange={(e) => {
            setFilterOperator(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={exportCsv}>
          导出 CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>操作者</TableHead>
            <TableHead>动作</TableHead>
            <TableHead>目标</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>详情</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                暂无操作日志
              </TableCell>
            </TableRow>
          ) : (
            data?.items.map((log) => (
              <React.Fragment key={log.id}>
                <TableRow>
                  <TableCell className="text-xs">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell>{log.operatorNickname}</TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-xs">
                    {log.targetType}:{log.targetId}
                  </TableCell>
                  <TableCell className="text-xs">{log.ip ?? "—"}</TableCell>
                  <TableCell>
                    {log.details && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpanded(expanded === log.id ? null : log.id)
                        }
                      >
                        {expanded === log.id ? "收起" : "展开"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expanded === log.id && log.details && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <pre className="rounded bg-muted p-2 text-xs">
                        {JSON.stringify(JSON.parse(log.details), null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {data.total} 条,第 {data.page} / {Math.ceil(data.total / data.pageSize)} 页
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
