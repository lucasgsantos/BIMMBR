// src/api/workflowApi.ts
// All HTTP calls to the Rust / PostgreSQL backend.
// Keep one function per endpoint; never put fetch logic inside components.

import axios from 'axios';
import type {
  EdgeResponse,
  ExecutionStep,
  NodeResponse,
  SaveDiagramBody,
  WorkflowFullResponse,
  WorkflowListItem,
  WorkflowListParams,
} from '../types/workflow';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// ── Workflow CRUD ──────────────────────────────────────────────────────────────

export const fetchWorkflows = async (
  params: WorkflowListParams = {}
): Promise<WorkflowListItem[]> => {
  const { page = 1, limit = 50 } = params;
  const { data } = await api.get<{ workflows: WorkflowListItem[] }>(
    `/workflows?page=${page}&limit=${limit}`
  );
  return data.workflows;
};

export const fetchWorkflow = async (id: string): Promise<WorkflowFullResponse> => {
  const { data } = await api.get<{ workflow: WorkflowFullResponse }>(`/workflows/${id}`);
  return data.workflow;
};

export const createWorkflow = async (
  name: string,
  description = ''
): Promise<WorkflowListItem> => {
  const { data } = await api.post<{ workflow: WorkflowListItem }>('/workflows', {
    name,
    description,
  });
  return data.workflow;
};

export const saveDiagram = async (id: string, body: SaveDiagramBody): Promise<void> => {
  await api.put(`/workflows/${id}/diagram`, body);
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  await api.delete(`/workflows/${id}`);
};

// ── Execution helpers (client-side DAG resolution) ─────────────────────────────
//
// The backend stores nodes + edges as a graph.  We resolve execution order on
// the client so the server stays generic.  The algorithm is a simple topological
// sort (BFS / Kahn's algorithm) that follows the directed edges.

/**
 * Given the raw nodes and edges from the API, return an ordered list of
 * ExecutionStep objects the operator must complete sequentially.
 *
 * Decision nodes are currently treated as passthrough (both branches merged) —
 * extend this logic if you need conditional branching.
 */
export const resolveExecutionOrder = (
  nodes: NodeResponse[],
  edges: EdgeResponse[]
): ExecutionStep[] => {
  // Build adjacency list: canvas_id → [canvas_id]
  const outgoing = new Map<string, string[]>();
  const inDegree  = new Map<string, number>();

  nodes.forEach((n) => {
    outgoing.set(n.canvas_id, []);
    inDegree.set(n.canvas_id, 0);
  });

  edges.forEach((e) => {
    outgoing.get(e.from_node_canvas_id)?.push(e.to_node_canvas_id);
    inDegree.set(e.to_node_canvas_id, (inDegree.get(e.to_node_canvas_id) ?? 0) + 1);
  });

  // Kahn's topological sort
  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const sorted: string[] = [];
  while (queue.length > 0) {
    // Prefer 'start' typed node first, then stable order
    const current = queue.shift()!;
    sorted.push(current);
    (outgoing.get(current) ?? []).forEach((neighbour) => {
      const newDeg = (inDegree.get(neighbour) ?? 1) - 1;
      inDegree.set(neighbour, newDeg);
      if (newDeg === 0) queue.push(neighbour);
    });
  }

  // Map back to NodeResponse objects
  const nodeMap = new Map(nodes.map((n) => [n.canvas_id, n]));

  return sorted
    .map((cid, idx) => {
      const node = nodeMap.get(cid);
      if (!node) return null;
      return {
        stepNumber: idx + 1,
        node,
        isFirst: idx === 0,
        isLast: idx === sorted.length - 1,
      } satisfies ExecutionStep;
    })
    .filter(Boolean) as ExecutionStep[];
};
