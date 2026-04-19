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
import { getNodeSize, NODE_WIDTH } from "./types"
import type { NodeTypes } from "@xyflow/react"
import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal"

// ── Layout constants ──────────────────────────────────────────────────────────
const TEAM_X: Record<string, number> = {
  management: 0,
  design: 700,
  production: 1400,
}
const COL_WIDTH = 200
const ROW_HEIGHT = 220
const ROOT_X = (0 + 700 + 1400) / 2 // 700 — center of the three teams

const TEAM_COLOR: Record<string, string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
}

const TEAM_MINIMAP_COLOR: Record<string, string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
}

const nodeTypes: NodeTypes = { employee: EmployeeNode }

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

  // ── Root node ──────────────────────────────────────────────────────────────
  nodes.push({
    id: "root",
    type: "default",
    position: { x: ROOT_X - 90, y: 0 },
    data: { label: "AI Workforce Platform" },
    style: {
      background: "#1e1b4b",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      padding: "6px 16px",
      width: 180,
      textAlign: "center",
    },
    selectable: false,
    draggable: false,
  })

  for (const [team, members] of Object.entries(byTeam)) {
    const teamX = TEAM_X[team] ?? 0
    const teamColor = TEAM_COLOR[team] ?? "#888"
    const teamLabel =
      team === "management" ? "管理团队" : team === "design" ? "设计团队" : "生产团队"

    // ── Team header node ────────────────────────────────────────────────────
    nodes.push({
      id: `team-${team}`,
      type: "default",
      position: { x: teamX - 50, y: 200 },
      data: { label: teamLabel },
      style: {
        background: "transparent",
        border: `2px solid ${teamColor}`,
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
        color: teamColor,
        padding: "4px 14px",
        width: 100,
        textAlign: "center",
      },
      selectable: false,
      draggable: false,
    })

    // Root → team header (dashed gray)
    edges.push({
      id: `root-${team}`,
      source: "root",
      target: `team-${team}`,
      style: { stroke: "#9ca3af", strokeDasharray: "5,4", strokeWidth: 1.5 },
      animated: false,
    })

    // ── Split into managers and regular employees ──────────────────────────
    const managers = members.filter(
      (e) =>
        e.title.includes("总监") ||
        e.title.includes("负责人") ||
        e.title.includes("经理") ||
        e.title.includes("主管"),
    )
    const regular = members.filter((e) => !managers.includes(e))

    if (managers.length > 0) {
      // ── Lay out managers horizontally centered under team header ──────────
      const managerSpacing = COL_WIDTH
      const managersWidth = (managers.length - 1) * managerSpacing
      const managersStartX = teamX - managersWidth / 2

      managers.forEach((mgr, mIdx) => {
        const size: NodeSize = getNodeSize(mgr.title, mgr.status)
        const w = NODE_WIDTH[size]
        const mx = managersStartX + mIdx * managerSpacing - w / 2
        const isHighlighted = highlightId === mgr.id

        nodes.push({
          id: mgr.id,
          type: "employee",
          position: { x: mx, y: 450 },
          data: mgr as unknown as Record<string, unknown>,
          style: {
            opacity: 1,
            outline: isHighlighted ? "2px solid #f59e0b" : "none",
            borderRadius: 10,
          },
        })

        // Team header → manager (solid, thick)
        edges.push({
          id: `team-${team}-${mgr.id}`,
          source: `team-${team}`,
          target: mgr.id,
          style: { stroke: teamColor, strokeWidth: 2 },
          animated: false,
        })
      })

      // ── Distribute regular employees among managers ────────────────────
      // Assign round-robin so each manager gets roughly equal employees
      const groups: EmployeeNodeData[][] = managers.map(() => [])
      regular.forEach((emp, i) => {
        groups[i % managers.length].push(emp)
      })

      groups.forEach((group, mIdx) => {
        if (group.length === 0) return
        const mgr = managers[mIdx]
        const mgrSize: NodeSize = getNodeSize(mgr.title, mgr.status)
        const mgrW = NODE_WIDTH[mgrSize]
        // Manager center X (account for the -w/2 offset applied above)
        const managersWidth2 = (managers.length - 1) * COL_WIDTH
        const managersStartX2 = teamX - managersWidth2 / 2
        const mgrCenterX = managersStartX2 + mIdx * COL_WIDTH - mgrW / 2 + mgrW / 2

        const MAX_COLS_REG = 3
        const groupWidth = (Math.min(group.length, MAX_COLS_REG) - 1) * COL_WIDTH
        const groupStartX = mgrCenterX - groupWidth / 2

        group.forEach((emp, eIdx) => {
          const col = eIdx % MAX_COLS_REG
          const row = Math.floor(eIdx / MAX_COLS_REG)
          const size: NodeSize = getNodeSize(emp.title, emp.status)
          const w = NODE_WIDTH[size]
          const ex = groupStartX + col * COL_WIDTH - w / 2
          const ey = 700 + row * ROW_HEIGHT
          const isHighlighted = highlightId === emp.id

          nodes.push({
            id: emp.id,
            type: "employee",
            position: { x: ex, y: ey },
            data: emp as unknown as Record<string, unknown>,
            style: {
              opacity: 1,
              outline: isHighlighted ? "2px solid #f59e0b" : "none",
              borderRadius: 10,
            },
          })

          // Manager → employee (solid, thin)
          edges.push({
            id: `${mgr.id}-${emp.id}`,
            source: mgr.id,
            target: emp.id,
            style: { stroke: teamColor, strokeWidth: 1.5 },
            animated: false,
          })
        })
      })
    } else {
      // ── No managers: layout all employees in a grid under team header ────
      const MAX_COLS_DIRECT = 4
      const allWidth = (Math.min(members.length, MAX_COLS_DIRECT) - 1) * COL_WIDTH
      const allStartX = teamX - allWidth / 2

      members.forEach((emp, idx) => {
        const col = idx % MAX_COLS_DIRECT
        const row = Math.floor(idx / MAX_COLS_DIRECT)
        const size: NodeSize = getNodeSize(emp.title, emp.status)
        const w = NODE_WIDTH[size]
        const ex = allStartX + col * COL_WIDTH - w / 2
        const ey = 450 + row * ROW_HEIGHT
        const isHighlighted = highlightId === emp.id

        nodes.push({
          id: emp.id,
          type: "employee",
          position: { x: ex, y: ey },
          data: emp as unknown as Record<string, unknown>,
          style: {
            opacity: 1,
            outline: isHighlighted ? "2px solid #f59e0b" : "none",
            borderRadius: 10,
          },
        })

        // Team header → employee
        edges.push({
          id: `team-${team}-${emp.id}`,
          source: `team-${team}`,
          target: emp.id,
          style: { stroke: teamColor, strokeWidth: 1.5 },
          animated: false,
        })
      })
    }
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
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
      setSelectedEmployeeId(node.id)
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

      <EmployeeDetailModal
        employeeId={selectedEmployeeId}
        open={selectedEmployeeId !== null}
        onOpenChange={(open) => { if (!open) setSelectedEmployeeId(null) }}
      />
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
