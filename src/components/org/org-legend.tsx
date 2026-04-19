"use client"

export function OrgLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        padding: "6px 20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
        border: "1px solid rgba(0,0,0,0.07)",
        fontSize: 11,
        color: "#6b7280",
        whiteSpace: "nowrap",
      }}
    >
      {/* Team colors */}
      <span style={{ fontWeight: 600, color: "#374151" }}>团队：</span>
      {[
        { color: "#7c3aed", label: "管理" },
        { color: "#2563eb", label: "设计" },
        { color: "#16a34a", label: "生产" },
      ].map((t) => (
        <span key={t.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: t.color, display: "inline-block" }} />
          {t.label}
        </span>
      ))}

      <span style={{ width: 1, height: 16, background: "#e5e7eb", display: "inline-block" }} />

      {/* Status colors */}
      <span style={{ fontWeight: 600, color: "#374151" }}>状态：</span>
      {[
        { color: "#22c55e", label: "活跃" },
        { color: "#f59e0b", label: "待命" },
        { color: "#6b7280", label: "离线" },
        { color: "#a855f7", label: "规划中" },
      ].map((s) => (
        <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
          {s.label}
        </span>
      ))}

      <span style={{ width: 1, height: 16, background: "#e5e7eb", display: "inline-block" }} />

      {/* Node sizes */}
      <span style={{ fontWeight: 600, color: "#374151" }}>节点：</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 14, height: 18, border: "2px solid #7c3aed", borderRadius: 3, display: "inline-block" }} />
        总监/负责人
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 12, height: 15, border: "2px solid #2563eb", borderRadius: 3, display: "inline-block" }} />
        普通员工
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 10, height: 13, border: "2px solid #9ca3af", borderRadius: 3, display: "inline-block" }} />
        规划中
      </span>
    </div>
  )
}
