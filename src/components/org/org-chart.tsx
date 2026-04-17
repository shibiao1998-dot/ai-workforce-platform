"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";

interface OrgEmployee {
  id: string;
  name: string;
  title: string;
  team: string;
  status: "active" | "developing" | "planned" | "inactive";
}

interface OrgChartProps {
  employees: OrgEmployee[];
}

const STATUS_COLOR: Record<string, string> = {
  active: "#16a34a",
  developing: "#d97706",
  planned: "#9ca3af",
};

const TEAM_COLOR: Record<string, string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
};

const TEAM_LABEL: Record<string, string> = {
  management: "AI管理团队",
  design: "AI设计师团队",
  production: "AI生产团队",
};

const COL_WIDTH = 180;
const ROW_HEIGHT = 90;

function buildLayout(employees: OrgEmployee[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Root node
  nodes.push({
    id: "root",
    position: { x: 600, y: 0 },
    data: { label: "AI Workforce" },
    style: {
      background: "#ffffff",
      border: "2px solid #2563eb",
      borderRadius: 12,
      color: "#2563eb",
      fontWeight: 700,
      fontSize: 14,
      padding: "8px 16px",
      minWidth: 140,
      textAlign: "center" as const,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
  });

  const teams: Array<"management" | "design" | "production"> = [
    "management",
    "design",
    "production",
  ];
  const teamXPositions: Record<string, number> = {
    management: 100,
    design: 600,
    production: 1050,
  };

  teams.forEach((team) => {
    const color = TEAM_COLOR[team];
    const teamId = `team-${team}`;
    const teamEmps = employees.filter((e) => e.team === team);

    // Team node
    nodes.push({
      id: teamId,
      position: { x: teamXPositions[team], y: 120 },
      data: { label: `${TEAM_LABEL[team]}\n(${teamEmps.length}人)` },
      style: {
        background: "#ffffff",
        border: `2px solid ${color}`,
        borderRadius: 10,
        color,
        fontWeight: 600,
        fontSize: 12,
        padding: "6px 14px",
        minWidth: 130,
        textAlign: "center" as const,
        whiteSpace: "pre-line",
      },
    });

    // Root → Team edge
    edges.push({
      id: `e-root-${team}`,
      source: "root",
      target: teamId,
      style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
    });

    // Employee nodes
    const cols = Math.min(4, teamEmps.length);
    teamEmps.forEach((emp, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const empX = teamXPositions[team] + (col - (cols - 1) / 2) * COL_WIDTH;
      const empY = 250 + row * ROW_HEIGHT;

      nodes.push({
        id: emp.id,
        position: { x: empX, y: empY },
        data: {
          label: emp.name,
          title: emp.title,
          status: emp.status,
          employeeId: emp.id,
        },
        style: {
          background: "#ffffff",
          border: `1.5px solid ${STATUS_COLOR[emp.status]}`,
          borderRadius: 8,
          color: "#1e293b",
          fontSize: 11,
          padding: "6px 10px",
          minWidth: 120,
          textAlign: "center" as const,
          cursor: "pointer",
        },
      });

      edges.push({
        id: `e-${teamId}-${emp.id}`,
        source: teamId,
        target: emp.id,
        style: { stroke: color, strokeWidth: 1, opacity: 0.4 },
      });
    });
  });

  return { nodes, edges };
}

export function OrgChart({ employees }: OrgChartProps) {
  const router = useRouter();
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(employees),
    [employees]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.data.employeeId) {
        router.push(`/roster/${node.data.employeeId}`);
      }
    },
    [router]
  );

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.3}
        maxZoom={2}
        style={{ background: "#f8fafc" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#cbd5e1"
        />
        <Controls
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
          nodeColor={(node) => {
            if (node.id === "root") return "#2563eb";
            if (node.id.startsWith("team-")) {
              const team = node.id.replace("team-", "");
              return TEAM_COLOR[team] ?? "#e2e8f0";
            }
            const emp = employees.find((e) => e.id === node.id);
            return emp ? STATUS_COLOR[emp.status] : "#e2e8f0";
          }}
        />
      </ReactFlow>
    </div>
  );
}
