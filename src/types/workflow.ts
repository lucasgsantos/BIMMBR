// src/types/workflow.ts

export type NodeType = "start" | "process" | "decision" | "api" | "data" | "end";

// ── Canvas state (local React state) ─────────────────────────────────────────

export interface WorkflowNode {
  id: string;      // canvas-local id, e.g. "node_1"
  type: NodeType;
  label: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;      // canvas-local id, e.g. "e1703..."
  from: string;    // canvas_id of source node
  to: string;      // canvas_id of target node
}

// ── API response shapes ────────────────────────────────────────────────────

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NodeResponse {
  id: string;         // DB uuid
  canvas_id: string;
  node_type: string;
  label: string;
  pos_x: number;
  pos_y: number;
}

export interface EdgeResponse {
  id: string;         // DB uuid
  from_node_canvas_id: string;
  to_node_canvas_id: string;
  label: string;
}

export interface WorkflowFullResponse {
  id: string;
  name: string;
  description: string;
  nodes: NodeResponse[];
  edges: EdgeResponse[];
  created_at: string;
  updated_at: string;
}

// ── Request bodies ─────────────────────────────────────────────────────────

export interface SaveDiagramBody {
  name: string;
  description: string;
  nodes: Array<{
    canvas_id: string;
    node_type: string;
    label: string;
    pos_x: number;
    pos_y: number;
  }>;
  edges: Array<{
    from_node_canvas_id: string;
    to_node_canvas_id: string;
    label: string;
  }>;
}
