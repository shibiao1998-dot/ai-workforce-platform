"use client"

interface OrgControlsProps {
  teamFilter: string
  onTeamFilterChange: (team: string) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
}

const TEAM_OPTIONS = [
  { value: "all", label: "全部团队" },
  { value: "management", label: "管理团队", color: "#7c3aed" },
  { value: "design", label: "设计团队", color: "#2563eb" },
  { value: "production", label: "生产团队", color: "#16a34a" },
]

export function OrgControls({
  teamFilter,
  onTeamFilterChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
}: OrgControlsProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        borderRadius: 12,
        padding: "8px 16px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* Team filter buttons */}
      <div style={{ display: "flex", gap: 4 }}>
        {TEAM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTeamFilterChange(opt.value)}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: teamFilter === opt.value
                ? (opt.color ?? "#374151")
                : "transparent",
              color: teamFilter === opt.value
                ? "white"
                : "#6b7280",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

      {/* Zoom controls */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={onZoomOut}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#374151",
          }}
        >
          −
        </button>
        <span style={{ fontSize: 11, color: "#6b7280", minWidth: 38, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#374151",
          }}
        >
          +
        </button>
        <button
          onClick={onFitView}
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
            fontSize: 11,
            color: "#374151",
            whiteSpace: "nowrap",
          }}
        >
          适应视图
        </button>
      </div>
    </div>
  )
}
