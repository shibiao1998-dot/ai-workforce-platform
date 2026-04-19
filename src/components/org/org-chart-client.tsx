"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { EmployeeNode } from "./employee-node"
import { OrgControls } from "./org-controls"
import { OrgLegend } from "./org-legend"
import type { EmployeeNodeData, NodeSize } from "./types"
import { getNodeSize, NODE_WIDTH, NODE_HEIGHT } from "./types"

// ── Layout constants ──────────────────────────────────────────────────────────
const TEAM_X: Record<string, number> = {
  management: 300,
  design: 850,
  production: 1400,
}
const COL_WIDTH = 170
const ROW_HEIGHT = 200
const MAX_COLS = 4

const TEAM_MINIMAP_COLOR: Record<string, string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
}

const nodeTypes = { employee: EmployeeNode }

// ── Layout builder ────────────────────────────────────────────────────────────
function buildOrgLayout(
  employees: EmployeeNodeData[],
  highlightId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const byTeam: Record<string, EmployeeNodeData[]> = {
    management: [],
    design: [],
    production: [],
  }

  for (const emp of employees) {
    if (byTeam[emp.team]) {
      byTeam[emp.team].push(emp)
    } else {
      byTeam.management.push(emp)
    }
  }

  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const [team, members] of Object.entries(byTeam)) {
    const baseX = TEAM_X[team] ?? 300

    // Team label node
    nodes.push({
      id: `team-${team}`,
      type: "default",
      position: { x: baseX - 60, y: 0 },
      data: { label: team === "management" ? "管理团队" : team === "design" ? "设计团队" : "生产团队" },
      style: {
        background: "transparent",
        border: "none",
        fontSize: 13,
        fontWeight: 700,
        color: team === "management" ? "#7c3aed" : team === "design" ? "#2563eb" : "#16a34a",
        padding: 0,
      },
      selectable: false,
      draggable: false,
    })

    // Employee nodes in grid
    members.forEach((emp, idx) => {
      const col = idx % MAX_COLS
      const row = Math.floor(idx / MAX_COLS)
      const size: NodeSize = getNodeSize(emp.title, emp.status)
      const w = NODE_WIDTH[size]

      const x = baseX + col * COL_WIDTH - w / 2
      const y = 50 + row * ROW_HEIGHT

      const isHighlighted = highlightId === emp.id

      nodes.push({
        id: emp.id,
        type: "employee",
        position: { x, y },
        data: emp as unknown as Record<string, unknown>,
        style: {
          opacity: 1,
          outline: isHighlighted ? "2px solid #f59e0b" : "none",
          borderRadius: 10,
        },
      })
    })
  }

  return { nodes, edges }
}

// ── Inner component (needs ReactFlow context) ─────────────────────────────────
interface OrgChartInnerProps {
  employees: EmployeeNodeData[]
  initialTeamFilter: string
  highlightId: string | null
}

function OrgChartInner({ employees, initialTeamFilter, highlightId }: OrgChartInnerProps) {
  const { fitView, zoomIn, zoomOut, getViewport } = useReactFlow()
  const [teamFilter, setTeamFilter] = useState(initialTeamFilter)
  const [zoom, setZoom] = useState(1)
  const fitViewCalled = useRef(false)

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => buildOrgLayout(employees, highlightId),
    [employees, highlightId],
  )

  // Apply team filter as opacity
  const filteredNodes = useMemo(() => {
    if (teamFilter === "all") return baseNodes
    return baseNodes.map((n) => {
      if (n.id.startsWith("team-")) {
        const t = n.id.replace("team-", "")
        return { ...n, style: { ...n.style, opacity: t === teamFilter ? 1 : 0.15 } }
      }
      const emp = employees.find((e) => e.id === n.id)
      if (!emp) return n
      return {
        ...n,
        style: {
          ...n.style,
          opacity: emp.team === teamFilter ? 1 : 0.15,
        },
      }
    })
  }, [baseNodes, teamFilter, employees])

  const [nodes, , onNodesChange] = useNodesState(filteredNodes)
  const [edges, , onEdgesChange] = useEdgesState(baseEdges)

  // Sync when filter or base nodes change
  useEffect(() => {
    // We need to update nodes imperatively — useNodesState doesn't re-init from prop changes
    // Instead we rely on re-render via key prop on parent
  }, [filteredNodes])

  // Fit view on mount
  useEffect(() => {
    if (!fitViewCalled.current) {
      fitViewCalled.current = true
      setTimeout(() => fitView({ duration: 400, padding: 0.1 }), 100)
    }
  }, [fitView])

  // Track zoom
  const handleMoveEnd = useCallback(() => {
    setZoom(getViewport().zoom)
  }, [getViewport])

  const handleTeamFilterChange = useCallback(
    (team: string) => {
      setTeamFilter(team)
      setTimeout(() => fitView({ duration: 300, padding: 0.1 }), 50)
    },
    [fitView],
  )

  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.1 })
  }, [fitView])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!node.id.startsWith("team-")) {
      console.log("Employee node clicked:", node.id, node.data)
    }
  }, [])

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <OrgControls
        teamFilter={teamFilter}
        onTeamFilterChange={handleTeamFilterChange}
        zoom={zoom}
        onZoomIn={() => { zoomIn(); setZoom(getViewport().zoom) }}
        onZoomOut={() => { zoomOut(); setZoom(getViewport().zoom) }}
        onFitView={handleFitView}
      />

      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onMoveEnd={handleMoveEnd}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={24} size={1} />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.startsWith("team-")) return "#e5e7eb"
            const emp = employees.find((e) => e.id === node.id)
            return emp ? (TEAM_MINIMAP_COLOR[emp.team] ?? "#888") : "#888"
          }}
          maskColor="rgba(255,255,255,0.7)"
          style={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
      </ReactFlow>

      <OrgLegend />
    </div>
  )
}

// ── Exported client component ─────────────────────────────────────────────────
interface OrgChartClientProps {
  employees: EmployeeNodeData[]
  initialTeamFilter: string
  highlightId: string | null
}

export function OrgChartClient({ employees, initialTeamFilter, highlightId }: OrgChartClientProps) {
  // Re-key inner when filter changes so nodes re-init
  const [filterKey, setFilterKey] = useState(initialTeamFilter)

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "100%" }}>
        <OrgChartInner
          key={filterKey}
          employees={employees}
          initialTeamFilter={filterKey}
          highlightId={highlightId}
        />
      </div>
    </ReactFlowProvider>
  )
}
