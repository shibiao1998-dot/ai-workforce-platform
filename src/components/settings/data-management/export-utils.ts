"use client";

import * as XLSX from "xlsx";

/**
 * 生成并下载 CSV 文件（带 BOM，支持中文 Excel 打开）
 */
export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers: { key: string; label: string }[]
): void {
  const headerRow = headers.map((h) => h.label).join(",");
  const dataRows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // 转义含逗号、引号、换行的字段
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 生成并下载 Excel 文件，可选按团队分 Sheet
 */
export function downloadExcel(
  data: Record<string, unknown>[],
  filename: string,
  headers: { key: string; label: string }[],
  teamGroupKey?: string
): void {
  const wb = XLSX.utils.book_new();
  const headerLabels = headers.map((h) => h.label);

  if (teamGroupKey) {
    const TEAM_LABELS: Record<string, string> = {
      management: "管理团队",
      design: "设计团队",
      production: "生产团队",
    };

    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const row of data) {
      const team = String(row[teamGroupKey] ?? "其他");
      if (!groups[team]) groups[team] = [];
      groups[team].push(row);
    }

    const teamOrder = ["management", "design", "production"];
    const allTeams = [
      ...teamOrder.filter((t) => groups[t]),
      ...Object.keys(groups).filter((t) => !teamOrder.includes(t)),
    ];

    for (const team of allTeams) {
      const rows = groups[team] ?? [];
      const sheetData = [
        headerLabels,
        ...rows.map((row) => headers.map((h) => row[h.key] ?? "")),
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, TEAM_LABELS[team] ?? team);
    }
  } else {
    const sheetData = [
      headerLabels,
      ...data.map((row) => headers.map((h) => row[h.key] ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "数据");
  }

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
