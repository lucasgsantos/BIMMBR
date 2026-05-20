// src/pages/WorkflowExecutionPage.tsx
// Operator view — execute an EBR (Electronic Batch Record) step by step.
// Route: /execution  (select a workflow)
//         /execution/:workflowId  (execute a specific workflow)

import { FC, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWorkflow, fetchWorkflows, resolveExecutionOrder } from '../api/workflowApi';
import type {
  ExecutionStep,
  NodeResponse,
  WorkflowFullResponse,
  WorkflowListItem,
} from '../types/workflow';

// ─── Node type metadata ───────────────────────────────────────────────────────

interface NodeTypeMeta { color: string; icon: string; label: string; }

const NODE_META: Record<string, NodeTypeMeta> = {
  start:    { color: '#10b981', icon: '▶', label: 'Start' },
  process:  { color: '#3b82f6', icon: '⚙', label: 'Process Step' },
  decision: { color: '#f59e0b', icon: '◆', label: 'Decision Point' },
  api:      { color: '#8b5cf6', icon: '⇆', label: 'API Call' },
  data:     { color: '#06b6d4', icon: '⬡', label: 'Data Entry' },
  end:      { color: '#ef4444', icon: '■', label: 'End' },
};
const metaOf = (nodeType: string): NodeTypeMeta =>
  NODE_META[nodeType] ?? { color: '#94a3b8', icon: '○', label: nodeType };

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WorkflowSelectorProps {
  workflows: WorkflowListItem[];
  loading: boolean;
  onSelect: (id: string) => void;
}

const WorkflowSelector: FC<WorkflowSelectorProps> = ({ workflows, loading, onSelect }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>◈</div>
          <p style={{ fontSize: 13, margin: 0 }}>Loading MBRs…</p>
        </div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ textAlign: 'center', color: '#334155' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: '#64748b' }}>No MBRs found</p>
          <p style={{ fontSize: 13, margin: 0, color: '#334155' }}>
            Design a workflow in the MBR Designer first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px',
            letterSpacing: '0.04em' }}>
            Select an MBR to Execute
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Choose a Master Batch Record to open an Electronic Batch Record (EBR) and begin step-by-step execution.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => onSelect(wf.id)}
              style={{
                textAlign: 'left', padding: '18px 20px', borderRadius: 10, cursor: 'pointer',
                background: '#0f172a', border: '1px solid #1e293b',
                transition: 'border-color 0.15s, background 0.15s',
                color: '#e2e8f0', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.background = '#0f172a';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                  {wf.name}
                </span>
                <span style={{ fontSize: 11, color: '#3b82f6', background: '#3b82f611',
                  border: '1px solid #3b82f633', borderRadius: 4, padding: '2px 8px', flexShrink: 0, marginLeft: 8 }}>
                  MBR
                </span>
              </div>
              {wf.description && (
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
                  {wf.description}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10,
                color: '#334155', fontFamily: 'monospace' }}>
                <span>ID: {wf.id.slice(0, 8)}…</span>
                <span>Updated: {new Date(wf.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Step progress bar ─────────────────────────────────────────────────────────

interface StepProgressProps {
  steps: ExecutionStep[];
  currentIndex: number;
  completedIndices: Set<number>;
}

const StepProgress: FC<StepProgressProps> = ({ steps, currentIndex, completedIndices }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto',
    padding: '16px 24px', borderBottom: '1px solid #1e293b', background: '#0f172a', flexShrink: 0 }}>
    {steps.map((step, idx) => {
      const meta      = metaOf(step.node.node_type);
      const isDone    = completedIndices.has(idx);
      const isCurrent = idx === currentIndex;
      const isFuture  = idx > currentIndex && !isDone;

      let bg     = '#1e293b';
      let border = '#334155';
      let color  = '#475569';
      if (isDone)    { bg = meta.color + '22'; border = meta.color + '66'; color = meta.color; }
      if (isCurrent) { bg = meta.color + '33'; border = meta.color;        color = meta.color; }

      return (
        <div key={step.node.canvas_id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', border: `2px solid ${border}`,
              background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color, transition: 'all 0.2s',
              boxShadow: isCurrent ? `0 0 12px ${meta.color}55` : 'none',
            }}>
              {isDone ? '✓' : step.stepNumber}
            </div>
            <span style={{ fontSize: 9, color, textAlign: 'center', maxWidth: 60,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.04em' }}>
              {step.node.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ width: 32, height: 2, margin: '0 2px', marginBottom: 18,
              background: isDone ? meta.color + '66' : '#1e293b', transition: 'background 0.3s' }} />
          )}
        </div>
      );
    })}
  </div>
);

// ── Step card ─────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: ExecutionStep;
  workflow: WorkflowFullResponse;
  onConfirm: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

const StepCard: FC<StepCardProps> = ({ step, workflow, onConfirm, onBack, canGoBack }) => {
  const meta = metaOf(step.node.node_type);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px', overflow: 'auto' }}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        {/* Step header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: meta.color + '22',
            border: `2px solid ${meta.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: meta.color, boxShadow: `0 0 24px ${meta.color}33`,
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: meta.color, letterSpacing: '0.1em', textTransform: 'uppercase',
              fontWeight: 600, marginBottom: 2 }}>
              Step {step.stepNumber} of {step.stepNumber} — {meta.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
              {step.node.label}
            </div>
          </div>
        </div>

        {/* Info card */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
          padding: '24px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 6 }}>Node ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: meta.color,
                background: meta.color + '11', padding: '6px 10px', borderRadius: 6,
                border: `1px solid ${meta.color}33` }}>
                {step.node.canvas_id}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0',
                background: '#1e293b', padding: '6px 10px', borderRadius: 6,
                border: '1px solid #334155' }}>
                {step.node.node_type}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 6 }}>MBR Reference</div>
            <div style={{ fontSize: 13, color: '#94a3b8', background: '#1e293b',
              padding: '10px 12px', borderRadius: 6, border: '1px solid #334155',
              fontFamily: 'monospace', letterSpacing: '0.02em' }}>
              {workflow.name}
            </div>
          </div>

          {workflow.description && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 6 }}>MBR Description</div>
              <div style={{ fontSize: 13, color: '#64748b', background: '#1e293b',
                padding: '10px 12px', borderRadius: 6, border: '1px solid #334155',
                lineHeight: 1.6 }}>
                {workflow.description}
              </div>
            </div>
          )}

          {/* Step-specific instruction area */}
          <div style={{ background: meta.color + '0a', border: `1px solid ${meta.color}22`,
            borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: meta.color, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
              Operator Instructions
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
              {step.node.node_type === 'start'
                ? 'This is the beginning of the batch record. Verify all materials and equipment are ready before proceeding.'
                : step.node.node_type === 'end'
                ? 'This is the final step. Review all completed steps and confirm the batch record is complete.'
                : step.node.node_type === 'decision'
                ? 'Evaluate the conditions for this decision point. Ensure all criteria are met before confirming.'
                : step.node.node_type === 'data'
                ? 'Record all required data values for this step. Verify measurements are within specification.'
                : step.node.node_type === 'api'
                ? 'This step interfaces with an external system. Verify the system response before confirming.'
                : `Execute the process step "${step.node.label}". Follow all SOPs and safety protocols.`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {canGoBack && (
            <button
              onClick={onBack}
              style={{ padding: '12px 24px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                background: '#1e293b', border: '1px solid #334155', color: '#64748b',
                fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              ← Back
            </button>
          )}

          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '14px 32px', borderRadius: 10, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: step.isLast
                ? `linear-gradient(135deg, ${meta.color}33, ${meta.color}55)`
                : `linear-gradient(135deg, #10b98133, #10b98155)`,
              border: `1px solid ${step.isLast ? meta.color + '66' : '#10b98166'}`,
              color: step.isLast ? meta.color : '#6ee7b7',
              boxShadow: `0 4px 20px ${step.isLast ? meta.color : '#10b981'}22`,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const c = step.isLast ? meta.color : '#10b981';
              e.currentTarget.style.boxShadow = `0 4px 32px ${c}44`;
            }}
            onMouseLeave={(e) => {
              const c = step.isLast ? meta.color : '#10b981';
              e.currentTarget.style.boxShadow = `0 4px 20px ${c}22`;
            }}
          >
            {step.isLast ? `✓ Complete EBR` : '✓ Confirm & Next Step →'}
          </button>
        </div>

        {/* Keyboard hint */}
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: '#334155' }}>
          Press Enter to confirm · Escape to go back
        </div>
      </div>
    </div>
  );
};

// ── Completion screen ─────────────────────────────────────────────────────────

interface CompletionScreenProps {
  workflow: WorkflowFullResponse;
  totalSteps: number;
  onRestart: () => void;
  onSelectAnother: () => void;
}

const CompletionScreen: FC<CompletionScreenProps> = ({
  workflow, totalSteps, onRestart, onSelectAnother,
}) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
    <div style={{ textAlign: 'center', maxWidth: 480 }}>
      <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>✓</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10b981', margin: '0 0 8px', letterSpacing: '0.04em' }}>
        EBR Complete
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
        All {totalSteps} steps of <strong style={{ color: '#e2e8f0' }}>{workflow.name}</strong> have been completed and confirmed.
      </p>

      <div style={{ background: '#0f172a', border: '1px solid #10b98133', borderRadius: 12,
        padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: '#10b981', letterSpacing: '0.1em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
          EBR Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
          <div>
            <div style={{ color: '#475569', marginBottom: 2 }}>MBR Reference</div>
            <div style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{workflow.name}</div>
          </div>
          <div>
            <div style={{ color: '#475569', marginBottom: 2 }}>Steps Completed</div>
            <div style={{ color: '#10b981', fontFamily: 'monospace' }}>{totalSteps} / {totalSteps}</div>
          </div>
          <div>
            <div style={{ color: '#475569', marginBottom: 2 }}>Completion Time</div>
            <div style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{new Date().toLocaleTimeString()}</div>
          </div>
          <div>
            <div style={{ color: '#475569', marginBottom: 2 }}>Status</div>
            <div style={{ color: '#10b981', fontFamily: 'monospace' }}>✓ COMPLETED</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onRestart}
          style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
            background: '#10b98122', border: '1px solid #10b98144', color: '#6ee7b7',
            fontFamily: 'inherit', fontWeight: 600 }}
        >
          ↺ Run Again
        </button>
        <button
          onClick={onSelectAnother}
          style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
            background: '#1e293b', border: '1px solid #334155', color: '#64748b',
            fontFamily: 'inherit', fontWeight: 600 }}
        >
          Select Another MBR
        </button>
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const WorkflowExecutionPage: FC = () => {
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate       = useNavigate();

  // Selector state (when no workflowId in URL)
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Execution state
  const [workflow,   setWorkflow]   = useState<WorkflowFullResponse | null>(null);
  const [steps,      setSteps]      = useState<ExecutionStep[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed,  setCompleted]  = useState<Set<number>>(new Set());
  const [done,       setDone]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Load workflow list when no ID is selected
  useEffect(() => {
    if (!workflowId) {
      setListLoading(true);
      fetchWorkflows()
        .then(setWorkflows)
        .catch(() => setWorkflows([]))
        .finally(() => setListLoading(false));
    }
  }, [workflowId]);

  // Load & resolve a specific workflow
  useEffect(() => {
    if (!workflowId) {
      setWorkflow(null); setSteps([]); setCurrentIdx(0);
      setCompleted(new Set()); setDone(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchWorkflow(workflowId)
      .then((wf) => {
        setWorkflow(wf);
        const ordered = resolveExecutionOrder(wf.nodes, wf.edges);
        setSteps(ordered);
        setCurrentIdx(0);
        setCompleted(new Set());
        setDone(false);
      })
      .catch(() => setError('Failed to load workflow. Please check the server and try again.'))
      .finally(() => setLoading(false));
  }, [workflowId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && !done && steps.length > 0) handleConfirm();
      if (e.key === 'Escape' && currentIdx > 0)           handleBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleSelect = (id: string) => navigate(`/execution/${id}`);

  const handleConfirm = () => {
    setCompleted((prev) => new Set(prev).add(currentIdx));
    if (currentIdx >= steps.length - 1) {
      setDone(true);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setCompleted(new Set());
    setDone(false);
  };

  const handleSelectAnother = () => navigate('/execution');

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0f1c', color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>

      {/* Sub-header */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #1e293b',
        background: '#0f172a', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#475569', marginBottom: 2 }}>EBR Execution Console</div>
          {workflow ? (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
              {workflow.name}
              {workflow.description && (
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 10 }}>
                  {workflow.description}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748b' }}>Select an MBR to begin</div>
          )}
        </div>

        {workflowId && (
          <button
            onClick={handleSelectAnother}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, fontSize: 11,
              cursor: 'pointer', background: '#1e293b', border: '1px solid #334155',
              color: '#64748b', fontFamily: 'inherit' }}
          >
            ← Change MBR
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <p style={{ fontSize: 13 }}>Loading EBR…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: '#ef4444' }}>✗</div>
            <p style={{ color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</p>
            <button
              onClick={handleSelectAnother}
              style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontFamily: 'inherit' }}
            >
              ← Back to MBR Selection
            </button>
          </div>
        </div>
      )}

      {/* No workflow selected → show selector */}
      {!workflowId && !loading && !error && (
        <WorkflowSelector
          workflows={workflows}
          loading={listLoading}
          onSelect={handleSelect}
        />
      )}

      {/* Workflow loaded, execution in progress */}
      {workflow && steps.length > 0 && !loading && !error && !done && (
        <>
          <StepProgress
            steps={steps}
            currentIndex={currentIdx}
            completedIndices={completed}
          />
          <StepCard
            step={steps[currentIdx]}
            workflow={workflow}
            onConfirm={handleConfirm}
            onBack={handleBack}
            canGoBack={currentIdx > 0}
          />
        </>
      )}

      {/* Empty workflow (no nodes) */}
      {workflow && steps.length === 0 && !loading && !error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>
              This MBR has no steps
            </p>
            <p style={{ fontSize: 13, marginBottom: 20, color: '#334155' }}>
              Add nodes in the MBR Designer and save before executing.
            </p>
            <button
              onClick={() => navigate(`/designer`)}
              style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: '#3b82f622', border: '1px solid #3b82f666', color: '#93c5fd', fontFamily: 'inherit' }}
            >
              → Open MBR Designer
            </button>
          </div>
        </div>
      )}

      {/* Completion */}
      {done && workflow && (
        <>
          <StepProgress steps={steps} currentIndex={steps.length} completedIndices={completed} />
          <CompletionScreen
            workflow={workflow}
            totalSteps={steps.length}
            onRestart={handleRestart}
            onSelectAnother={handleSelectAnother}
          />
        </>
      )}
    </div>
  );
};

export default WorkflowExecutionPage;
