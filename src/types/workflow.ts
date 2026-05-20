// src/types/workflow.ts
// Shared type definitions for workflow / MBR data.
// These mirror the Rust backend schemas exactly — keep in sync with src/schema.rs.

export type NodeType =
  | 'start'
  | 'process'
  | 'decision'
  | 'api'
  | 'data'
  | 'end';

// ── Canvas state (local React designer state) ─────────────────────────────────

export interface WorkflowNode {
  /** Canvas-local ID used as the primary key in the designer, e.g. "node_1". */
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  /** Client-generated edge ID, e.g. "e1703…". Not persisted to DB. */
  id: string;
  from: string; // canvas_id of source node
  to: string;   // canvas_id of target node
}

// ── API request bodies ─────────────────────────────────────────────────────────

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

// ── API response shapes ────────────────────────────────────────────────────────

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NodeResponse {
  id: string;         // DB UUID
  canvas_id: string;
  node_type: string;
  label: string;
  pos_x: number;
  pos_y: number;
}

export interface EdgeResponse {
  id: string;         // DB UUID
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

// ── Execution domain types ─────────────────────────────────────────────────────

/**
 * A single step the operator will see during EBR execution.
 * The execution engine resolves the DAG order from the edges and exposes
 * this flat, ordered list to the UI.
 */
export interface ExecutionStep {
  stepNumber: number;
  node: NodeResponse;
  isFirst: boolean;
  isLast: boolean;
}

/** Query params supported by GET /api/workflows */
export interface WorkflowListParams {
  page?: number;
  limit?: number;
}
