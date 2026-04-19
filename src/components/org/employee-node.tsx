"use client"

import { memo, useState } from "react"
import { Handle, Position } from "@xyflow/react"
import { AiAvatar } from "@/components/shared/ai-avatar"
import type { EmployeeNodeData, NodeSize } from "./types"
import { getNodeSize, NODE_WIDTH, NODE_HEIGHT } from "./types"

const TEAM_BORDER: Record<string, string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
}

const STATUS_DOT: Record<string, string> = {
  active: "#22c55e",
  idle: "#f59e0b",
  inactive: "#6b7280",
  planned: "#a855f7",
}

const STATUS_LABEL: Record<string, string> = {
  active: "活跃",
  idle: "待命",
  inactive: "离线",
  planned: "规划中",
}

interface EmployeeNodeProps {
  data: EmployeeNodeData
  selected?: boolean
}

export const EmployeeNode = memo(function EmployeeNode({ data, selected }: EmployeeNodeProps) {
  const [hovered, setHovered] = useState(false)
  const size: NodeSize = getNodeSize(data.title, data.status)
  const w = NODE_WIDTH[size]
  const h = NODE_HEIGHT[size]
  const avatarSize = size === "large" ? 56 : size === "medium" ? 48 : 40
  const borderColor = TEAM_BORDER[data.team] ?? "#888"
  const dotColor = STATUS_DOT[data.status] ?? "#888"
  const ringRadius = avatarSize / 2 + 4
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringDash = (data.levelProgress / 100) * ringCircumference

  return (
    <div
      style={{ width: w, height: h, position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Card */}
      <div
        style={{
          width: w,
          height: h,
          borderLeft: `3px solid ${borderColor}`,
          boxShadow: selected
            ? `0 0 0 2px #f59e0b, 0 4px 16px rgba(0,0,0,0.15)`
            : `0 2px 8px rgba(0,0,0,0.10)`,
          borderRadius: 10,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 8px 8px",
          gap: 4,
          cursor: "pointer",
          transition: "box-shadow 0.15s",
          overflow: "visible",
          position: "relative",
        }}
      >
        {/* Avatar + ring */}
        <div style={{ position: "relative", width: avatarSize + 8, height: avatarSize + 8, flexShrink: 0 }}>
          <svg
            width={avatarSize + 8}
            height={avatarSize + 8}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* Background track */}
            <circle
              cx={(avatarSize + 8) / 2}
              cy={(avatarSize + 8) / 2}
              r={ringRadius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={3}
            />
            {/* Progress arc */}
            <circle
              cx={(avatarSize + 8) / 2}
              cy={(avatarSize + 8) / 2}
              r={ringRadius}
              fill="none"
              stroke={data.levelColor}
              strokeWidth={3}
              strokeDasharray={`${ringDash} ${ringCircumference - ringDash}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${(avatarSize + 8) / 2} ${(avatarSize + 8) / 2})`}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            <AiAvatar
              employeeId={data.id}
              team={data.team}
              avatar={data.avatar}
              name={data.name}
              size={size === "large" ? "lg" : size === "medium" ? "md" : "sm"}
            />
          </div>
          {/* Status dot */}
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: dotColor,
              border: "2px solid white",
            }}
          />
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: size === "small" ? 11 : 12,
            fontWeight: 700,
            color: "#111827",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: w - 20,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.name}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 10,
            color: "#6b7280",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: w - 20,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.title}
        </div>

        {/* Badge row */}
        {size !== "small" && (
          <div style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            {/* Level badge */}
            <span
              style={{
                fontSize: 9,
                padding: "1px 4px",
                borderRadius: 4,
                background: data.levelColor + "22",
                color: data.levelColor,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              {data.levelEmoji} Lv{data.level}
            </span>

            {/* MBTI badge */}
            {data.mbti && (
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 4px",
                  borderRadius: 4,
                  background: "#f3f4f6",
                  color: "#374151",
                  fontWeight: 500,
                }}
              >
                {data.mbti}
              </span>
            )}

            {/* Streak badge */}
            {data.streak > 0 && (
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 4px",
                  borderRadius: 4,
                  background: "#fef3c7",
                  color: "#b45309",
                  fontWeight: 600,
                }}
              >
                🔥{data.streak}
              </span>
            )}
          </div>
        )}

        {/* Personality tags */}
        {size === "large" && data.personality.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
            {data.personality.map((p) => (
              <span
                key={p}
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 10,
                  background: borderColor + "18",
                  color: borderColor,
                  fontWeight: 500,
                  border: `1px solid ${borderColor}33`,
                }}
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: h + 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(17,24,39,0.92)",
            color: "white",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            whiteSpace: "nowrap",
            zIndex: 9999,
            pointerEvents: "none",
            backdropFilter: "blur(4px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{data.name}</div>
          <div style={{ color: "#9ca3af" }}>{STATUS_LABEL[data.status] ?? data.status}</div>
          <div>XP: <span style={{ color: data.levelColor, fontWeight: 600 }}>{data.xp.toLocaleString()}</span></div>
          <div>本月任务: <span style={{ fontWeight: 600 }}>{data.monthlyTaskCount}</span> 件</div>
          {data.streak > 0 && <div>连续活跃: <span style={{ color: "#f59e0b", fontWeight: 600 }}>{data.streak}</span> 天</div>}
        </div>
      )}
    </div>
  )
})
