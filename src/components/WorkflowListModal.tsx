// src/components/WorkflowListModal.tsx
//
// Slide-in panel that shows all saved workflows.
// Used by the WorkflowDesigner toolbar to load an existing diagram.

import { FC, useEffect, useState } from "react";
import { deleteWorkflow, fetchWorkflows } from "../api/workflowApi";
import { WorkflowListItem } from "../types/workflow";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (id: string) => void;
}

const WorkflowListModal: FC<Props> = ({ open, onClose, onLoad }) => {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const wfs = await fetchWorkflows();
      setWorkflows(wfs);
    } catch {
      setError("Could not load workflows from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this workflow permanently?")) return;
    setDeletingId(id);
    try {
      await deleteWorkflow(id);
      setWorkflows((wfs) => wfs.filter((w) => w.id !== id));
    } catch {
      alert("Failed to delete workflow.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          background: "#0f172a",
          borderLeft: "1px solid #1e293b",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          color: "#e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
            Saved Workflows
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {loading && (
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              Loading…
            </p>
          )}
          {error && (
            <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          )}
          {!loading && !error && workflows.length === 0 && (
            <p style={{ color: "#475569", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              No workflows saved yet.
            </p>
          )}

          {workflows.map((wf) => (
            <div
              key={wf.id}
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #1e293b",
                marginBottom: 8,
                background: "#0f172a",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {wf.name}
                  </p>
                  {wf.description && (
                    <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                      {wf.description}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: "#334155", margin: "6px 0 0", fontFamily: "monospace" }}>
                    {new Date(wf.updated_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => { onLoad(wf.id); onClose(); }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      background: "#3b82f622",
                      border: "1px solid #3b82f666",
                      color: "#93c5fd",
                    }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    disabled={deletingId === wf.id}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      background: "#7f1d1d22",
                      border: "1px solid #ef444444",
                      color: "#f87171",
                      opacity: deletingId === wf.id ? 0.5 : 1,
                    }}
                  >
                    {deletingId === wf.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
          <button
            onClick={load}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#64748b",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    </>
  );
};

export default WorkflowListModal;
