// src/api/workflowApi.ts
//
// All HTTP calls to the Rust backend.
// Mirrors the pattern used by the React Query hooks in the note-app template.

import axios from "axios";
import {
  SaveDiagramBody,
  WorkflowFullResponse,
  WorkflowListItem,
} from "../types/workflow";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const api = axios.create({ baseURL: BASE_URL, withCredentials: false });

// ── List all workflows (metadata only) ────────────────────────────────────────

export const fetchWorkflows = async (
  page = 1,
  limit = 20
): Promise<WorkflowListItem[]> => {
  const { data } = await api.get<{ workflows: WorkflowListItem[] }>(
    `/workflows?page=${page}&limit=${limit}`
  );
  return data.workflows;
};

// ── Create an empty workflow ───────────────────────────────────────────────────

export const createWorkflow = async (
  name: string,
  description = ""
): Promise<WorkflowListItem> => {
  const { data } = await api.post<{ workflow: WorkflowListItem }>("/workflows", {
    name,
    description,
  });
  return data.workflow;
};

// ── Load a full diagram (nodes + edges) ───────────────────────────────────────

export const fetchWorkflow = async (
  id: string
): Promise<WorkflowFullResponse> => {
  const { data } = await api.get<{ workflow: WorkflowFullResponse }>(
    `/workflows/${id}`
  );
  return data.workflow;
};

// ── Save (overwrite) the full diagram ─────────────────────────────────────────

export const saveDiagram = async (
  id: string,
  body: SaveDiagramBody
): Promise<void> => {
  await api.put(`/workflows/${id}/diagram`, body);
};

// ── Delete a workflow ─────────────────────────────────────────────────────────

export const deleteWorkflow = async (id: string): Promise<void> => {
  await api.delete(`/workflows/${id}`);
};
