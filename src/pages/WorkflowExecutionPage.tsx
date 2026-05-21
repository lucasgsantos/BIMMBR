// src/pages/WorkflowExecutionPage.tsx
// Operator view — execute an EBR by stepping through a Process Order.
//
// Routes:
//   /execution                   → select a process order to execute
//   /execution/:processOrderId   → execute that order step by step
//
// The operator never touches MBRs directly.  They pick a Process Order
// (created by a supervisor), which references an MBR.  The execution
// engine loads the MBR graph, resolves step order, and writes each
// confirmed step back to the audit log via POST /api/orders/:id/steps.

import { FC, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  completeOrder,
  confirmStep,
  fetchOrder,
  fetchOrders,
  startOrder,
} from '../api/processOrderApi';
import { fetchWorkflow, resolveExecutionOrder } from '../api/workflowApi';
import type {
  ProcessOrder,
  ProcessOrderDetail,
  ProcessOrderStatus,
} from '../types/processOrder';
import { STATUS_META } from '../types/processOrder';
import type { ExecutionStep, WorkflowFullResponse } from '../types/workflow';

// ─── Node type metadata ───────────────────────────────────────────────────────

interface NodeMeta { color: string; icon: string; label: string; }

const NODE_META: Record<string, NodeMeta> = {
  start:    { color: '#10b981', icon: '▶', label: 'Start'         },
  process:  { color: '#3b82f6', icon: '⚙', label: 'Process Step'  },
  decision: { color: '#f59e0b', icon: '◆', label: 'Decision Point' },
  api:      { color: '#8b5cf6', icon: '⇆', label: 'API Call'      },
  data:     { color: '#06b6d4', icon: '⬡', label: 'Data Entry'    },
  end:      { color: '#ef4444', icon: '■', label: 'End'            },
};
const metaOf = (t: string): NodeMeta =>
  NODE_META[t] ?? { color: '#94a3b8', icon: '○', label: t };

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: FC<{ status: ProcessOrderStatus }> = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
    }}>
      {m.label}
    </span>
  );
};

// ─── Order selector ───────────────────────────────────────────────────────────

interface OrderSelectorProps {
  orders: ProcessOrder[];
  loading: boolean;
  onSelect: (id: string) => void;
}

const OrderSelector: FC<OrderSelectorProps> = ({ orders, loading, onSelect }) => {
  const navigate = useNavigate();

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#475569' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>◈</div>
        <p style={{ fontSize: 13 }}>Loading orders…</p>
      </div>
    </div>
  );

  const executable = orders.filter(
    (o) => o.status === 'pending' || o.status === 'in_progress'
  );

  if (executable.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
          No orders ready for execution
        </p>
        <p style={{ fontSize: 12, color: '#334155', marginBottom: 24, lineHeight: 1.6 }}>
          A supervisor must create a Process Order and assign an MBR before you
          can start execution.
        </p>
        <button
          onClick={() => navigate('/orders')}
          style={{ padding: '10px 24px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
            background: '#3b82f622', border: '1px solid #3b82f666', color: '#93c5fd',
            fontFamily: 'inherit', fontWeight: 600 }}>
          → Go to Process Orders
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0',
            margin: '0 0 6px', letterSpacing: '0.04em' }}>
            Select a Process Order to Execute
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            Only orders in <strong style={{ color: '#f59e0b' }}>Pending</strong> or{' '}
            <strong style={{ color: '#3b82f6' }}>In Progress</strong> state are shown.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {executable.map((order) => {
            const sm = STATUS_META[order.status];
            const pct = order.total_steps > 0
              ? Math.round((order.current_step / order.total_steps) * 100)
              : 0;
            return (
              <button
                key={order.id}
                onClick={() => onSelect(order.id)}
                style={{
                  textAlign: 'left', padding: '18px 22px', borderRadius: 12,
                  cursor: 'pointer', background: '#0f172a',
                  border: '1px solid #1e293b', fontFamily: 'inherit',
                  color: '#e2e8f0', transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = sm.color + '66';
                  e.currentTarget.style.background  = '#111827';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1e293b';
                  e.currentTarget.style.background  = '#0f172a';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0',
                      marginBottom: 4, letterSpacing: '0.02em' }}>
                      {order.order_number}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      MBR: <span style={{ color: '#94a3b8' }}>{order.workflow_name}</span>
                      {order.assigned_to && (
                        <span style={{ marginLeft: 16 }}>
                          Operator: <span style={{ color: '#94a3b8' }}>{order.assigned_to}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {order.description && (
                  <p style={{ fontSize: 11, color: '#475569', margin: '0 0 10px',
                    lineHeight: 1.5 }}>
                    {order.description}
                  </p>
                )}

                {/* Progress */}
                {order.status === 'in_progress' && order.total_steps > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 4, background: '#1e293b',
                      borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`,
                        background: sm.color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace',
                      minWidth: 60, textAlign: 'right' }}>
                      {order.current_step}/{order.total_steps} steps
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Step progress bar ────────────────────────────────────────────────────────

interface StepProgressProps {
  steps: ExecutionStep[];
  currentIndex: number;
  completedIndices: Set<number>;
}

const StepProgress: FC<StepProgressProps> = ({ steps, currentIndex, completedIndices }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto',
    padding: '14px 24px', borderBottom: '1px solid #1e293b',
    background: '#0f172a', flexShrink: 0 }}>
    {steps.map((step, idx) => {
      const meta      = metaOf(step.node.node_type);
      const isDone    = completedIndices.has(idx);
      const isCurrent = idx === currentIndex;

      let bg     = '#1e293b';
      let border = '#334155';
      let color  = '#475569';
      if (isDone)    { bg = meta.color + '22'; border = meta.color + '66'; color = meta.color; }
      if (isCurrent) { bg = meta.color + '33'; border = meta.color;        color = meta.color; }

      return (
        <div key={step.node.canvas_id}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              border: `2px solid ${border}`, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color, transition: 'all 0.2s',
              boxShadow: isCurrent ? `0 0 10px ${meta.color}55` : 'none',
            }}>
              {isDone ? '✓' : step.stepNumber}
            </div>
            <span style={{ fontSize: 9, color, textAlign: 'center', maxWidth: 56,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '0.03em' }}>
              {step.node.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ width: 28, height: 2, margin: '0 2px', marginBottom: 18,
              background: isDone ? meta.color + '55' : '#1e293b',
              transition: 'background 0.3s' }} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Step confirmation card ───────────────────────────────────────────────────

interface StepCardProps {
  step: ExecutionStep;
  totalSteps: number;
  order: ProcessOrder;
  workflow: WorkflowFullResponse;
  onConfirm: (confirmedBy: string, notes: string) => Promise<void>;
  onBack: () => void;
  canGoBack: boolean;
  confirming: boolean;
}

const StepCard: FC<StepCardProps> = ({
  step, totalSteps, order, workflow, onConfirm, onBack, canGoBack, confirming,
}) => {
  const meta = metaOf(step.node.node_type);
  const [confirmedBy, setConfirmedBy] = useState('');
  const [notes,       setNotes]       = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Reset fields when step changes
  useEffect(() => {
    setConfirmedBy('');
    setNotes('');
  }, [step.stepNumber]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && !confirming) confirmRef.current?.click();
      if (e.key === 'Escape' && canGoBack)  onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirming, canGoBack, onBack]);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '28px 20px', overflow: 'auto' }}>
      <div style={{ maxWidth: 640, width: '100%' }}>

        {/* Step header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14,
            background: meta.color + '22', border: `2px solid ${meta.color}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: meta.color,
            boxShadow: `0 0 20px ${meta.color}33`, flexShrink: 0,
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ fontSize: 10, color: meta.color, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>
              Step {step.stepNumber} of {totalSteps} — {meta.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0',
              letterSpacing: '0.02em' }}>
              {step.node.label}
            </div>
          </div>
        </div>

        {/* Order + MBR reference card */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b',
          borderRadius: 12, padding: '20px', marginBottom: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <InfoCell label="Process Order" value={order.order_number} />
            <InfoCell label="MBR Reference"  value={workflow.name} />
            <InfoCell label="Node ID"         value={step.node.canvas_id} mono />
            <InfoCell label="Node Type"       value={step.node.node_type} mono />
          </div>

          {/* Step instruction */}
          <div style={{ background: meta.color + '0a', border: `1px solid ${meta.color}22`,
            borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: meta.color, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
              Operator Instructions
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
              {step.node.node_type === 'start'
                ? 'This is the beginning of the batch record. Verify all materials, equipment, and safety checks are complete before proceeding.'
                : step.node.node_type === 'end'
                ? 'This is the final step. Review all completed steps and confirm the batch record is fully executed.'
                : step.node.node_type === 'decision'
                ? 'Evaluate the conditions at this decision point. Ensure all criteria are met and document your assessment in the notes field.'
                : step.node.node_type === 'data'
                ? 'Record all required data values. Verify measurements are within specification limits before confirming.'
                : step.node.node_type === 'api'
                ? 'Verify that the external system interaction has completed successfully before confirming this step.'
                : `Execute process step "${step.node.label}". Follow all applicable SOPs and safety protocols.`}
            </p>
          </div>
        </div>

        {/* Operator input */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b',
          borderRadius: 12, padding: '20px', marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#475569', fontWeight: 600, marginBottom: 14 }}>
            Confirmation
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block',
              marginBottom: 5, letterSpacing: '0.04em' }}>
              Confirmed By
            </label>
            <input
              value={confirmedBy}
              onChange={(e) => setConfirmedBy(e.target.value)}
              placeholder="Operator name or ID"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                background: '#1e293b', border: '1px solid #334155',
                color: '#e2e8f0', fontSize: 12, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block',
              marginBottom: 5, letterSpacing: '0.04em' }}>
              Notes / Observations
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional: deviations, observations, measurements…"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                background: '#1e293b', border: '1px solid #334155',
                color: '#e2e8f0', fontSize: 12, outline: 'none',
                boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {canGoBack && (
            <button onClick={onBack} disabled={confirming}
              style={{ padding: '12px 22px', borderRadius: 10, fontSize: 12,
                cursor: 'pointer', background: '#1e293b',
                border: '1px solid #334155', color: '#64748b',
                fontFamily: 'inherit', fontWeight: 600 }}>
              ← Back
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={() => onConfirm(confirmedBy, notes)}
            disabled={confirming}
            style={{
              flex: 1, padding: '13px 28px', borderRadius: 10, fontSize: 13,
              cursor: confirming ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: step.isLast
                ? `linear-gradient(135deg, ${meta.color}33, ${meta.color}55)`
                : 'linear-gradient(135deg, #10b98133, #10b98155)',
              border: `1px solid ${step.isLast ? meta.color + '66' : '#10b98166'}`,
              color: step.isLast ? meta.color : '#6ee7b7',
              opacity: confirming ? 0.65 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {confirming
              ? 'Saving…'
              : step.isLast
              ? `✓ Complete EBR`
              : '✓ Confirm & Next Step →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: '#334155' }}>
          Press Enter to confirm · Escape to go back
        </div>
      </div>
    </div>
  );
};

// ─── Completion screen ────────────────────────────────────────────────────────

interface CompletionScreenProps {
  order: ProcessOrder;
  workflow: WorkflowFullResponse;
  totalSteps: number;
  onSelectAnother: () => void;
  onGoToOrders: () => void;
}

const CompletionScreen: FC<CompletionScreenProps> = ({
  order, workflow, totalSteps, onSelectAnother, onGoToOrders,
}) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 32, overflow: 'auto' }}>
    <div style={{ textAlign: 'center', maxWidth: 500 }}>
      <div style={{ fontSize: 60, marginBottom: 16, color: '#10b981' }}>✓</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10b981',
        margin: '0 0 8px', letterSpacing: '0.04em' }}>
        EBR Complete
      </h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 28px', lineHeight: 1.7 }}>
        All {totalSteps} steps of process order{' '}
        <strong style={{ color: '#e2e8f0' }}>{order.order_number}</strong> have been
        executed and recorded in the audit trail.
      </p>

      {/* Summary card */}
      <div style={{ background: '#0f172a', border: '1px solid #10b98133',
        borderRadius: 14, padding: '22px 26px', marginBottom: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: '#10b981', letterSpacing: '0.1em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
          EBR Completion Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <InfoCell label="Process Order"  value={order.order_number} />
          <InfoCell label="MBR Reference"  value={workflow.name} />
          <InfoCell label="Steps Executed" value={`${totalSteps} / ${totalSteps}`} />
          <InfoCell label="Status"         value="✓ COMPLETED" />
          <InfoCell label="Completed At"
            value={new Date().toLocaleTimeString(undefined, { timeStyle: 'medium' })} />
          <InfoCell label="Order ID" value={order.id.slice(0, 8) + '…'} mono />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onSelectAnother}
          style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 12,
            cursor: 'pointer', background: '#10b98122',
            border: '1px solid #10b98144', color: '#6ee7b7',
            fontFamily: 'inherit', fontWeight: 600 }}>
          Execute Another Order
        </button>
        <button onClick={onGoToOrders}
          style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: 12,
            cursor: 'pointer', background: '#1e293b',
            border: '1px solid #334155', color: '#64748b',
            fontFamily: 'inherit', fontWeight: 600 }}>
          View All Orders
        </button>
      </div>
    </div>
  </div>
);

// ─── Shared helper ────────────────────────────────────────────────────────────

const InfoCell: FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em',
      textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: mono ? 11 : 12, color: '#e2e8f0',
      fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const WorkflowExecutionPage: FC = () => {
  const { processOrderId } = useParams<{ processOrderId?: string }>();
  const navigate = useNavigate();

  // Selector state
  const [allOrders,    setAllOrders]    = useState<ProcessOrder[]>([]);
  const [listLoading,  setListLoading]  = useState(false);

  // Execution state
  const [detail,       setDetail]       = useState<ProcessOrderDetail | null>(null);
  const [workflow,     setWorkflow]     = useState<WorkflowFullResponse | null>(null);
  const [steps,        setSteps]        = useState<ExecutionStep[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [completed,    setCompleted]    = useState<Set<number>>(new Set());
  const [done,         setDone]         = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Load order list when no ID in URL
  useEffect(() => {
    if (!processOrderId) {
      setListLoading(true);
      fetchOrders().then(setAllOrders).catch(() => setAllOrders([]))
        .finally(() => setListLoading(false));
    }
  }, [processOrderId]);

  // Load a specific order + its MBR
  useEffect(() => {
    if (!processOrderId) {
      setDetail(null); setWorkflow(null); setSteps([]);
      setCurrentIdx(0); setCompleted(new Set()); setDone(false);
      return;
    }

    setLoading(true); setError(null);

    fetchOrder(processOrderId)
      .then(async (d) => {
        setDetail(d);

        // Completed / cancelled orders — show done screen or error
        if (d.order.status === 'completed') {
          setDone(true); setLoading(false); return;
        }
        if (d.order.status === 'cancelled') {
          setError('This process order has been cancelled.'); setLoading(false); return;
        }

        // Must have a workflow attached
        if (!d.order.workflow_id) {
          setError('This order has no MBR assigned. A supervisor must re-assign one.');
          setLoading(false); return;
        }

        const wf = await fetchWorkflow(d.order.workflow_id);
        setWorkflow(wf);

        const ordered = resolveExecutionOrder(wf.nodes, wf.edges);
        setSteps(ordered);

        // If the order is already in_progress, resume from where we left off
        // current_step is the last *confirmed* step number (1-based), so the
        // next index to show is current_step (0-based).
        const resumeIdx = d.order.status === 'in_progress'
          ? Math.min(d.order.current_step, ordered.length - 1)
          : 0;
        setCurrentIdx(resumeIdx);

        // Mark already-confirmed steps as completed in the local UI state
        const doneSet = new Set<number>();
        for (let i = 0; i < resumeIdx; i++) doneSet.add(i);
        setCompleted(doneSet);

        setDone(false);
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to load process order. Please check the server.');
      })
      .finally(() => setLoading(false));
  }, [processOrderId]);

  const handleSelect = (id: string) => navigate(`/execution/${id}`);

  // ── Confirm one step ────────────────────────────────────────────────────────
  const handleConfirm = async (confirmedBy: string, notes: string) => {
    if (!detail || !processOrderId) return;
    setConfirming(true);

    try {
      const step = steps[currentIdx];

      // First step of a pending order → start it first
      if (detail.order.status === 'pending') {
        await startOrder(processOrderId, { total_steps: steps.length });
        setDetail((d) => d
          ? { ...d, order: { ...d.order, status: 'in_progress', total_steps: steps.length } }
          : d);
      }

      // Record this step in the audit log
      await confirmStep(processOrderId, {
        node_canvas_id: step.node.canvas_id,
        node_type:      step.node.node_type,
        node_label:     step.node.label,
        step_number:    step.stepNumber,
        confirmed_by:   confirmedBy.trim(),
        notes:          notes.trim(),
      });

      setCompleted((prev) => new Set(prev).add(currentIdx));

      if (currentIdx >= steps.length - 1) {
        // Last step → mark order complete
        const updated = await completeOrder(processOrderId);
        setDetail((d) => d ? { ...d, order: updated } : d);
        setDone(true);
      } else {
        setCurrentIdx((i) => i + 1);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save step. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0f1c', color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono', 'Fira Code', monospace", overflow: 'hidden' }}>

      {/* Sub-header */}
      <div style={{ padding: '12px 26px', borderBottom: '1px solid #1e293b',
        background: '#0f172a', display: 'flex', alignItems: 'center',
        gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#475569', marginBottom: 2 }}>EBR Execution Console</div>
          {detail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                {detail.order.order_number}
              </span>
              <StatusBadge status={detail.order.status as ProcessOrderStatus} />
              {workflow && (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  MBR: {workflow.name}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Select a Process Order to begin
            </div>
          )}
        </div>

        {processOrderId && (
          <button
            onClick={() => navigate('/execution')}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11,
              cursor: 'pointer', background: '#1e293b',
              border: '1px solid #334155', color: '#64748b', fontFamily: 'inherit' }}>
            ← Change Order
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#475569' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>◈</div>
            <p style={{ fontSize: 13 }}>Loading EBR…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: '#ef4444' }}>✗</div>
            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => navigate('/execution')}
                style={{ padding: '10px 22px', borderRadius: 8, fontSize: 12,
                  cursor: 'pointer', background: '#1e293b',
                  border: '1px solid #334155', color: '#94a3b8', fontFamily: 'inherit' }}>
                ← Back to Orders
              </button>
              <button onClick={() => navigate('/orders')}
                style={{ padding: '10px 22px', borderRadius: 8, fontSize: 12,
                  cursor: 'pointer', background: '#3b82f622',
                  border: '1px solid #3b82f666', color: '#93c5fd', fontFamily: 'inherit' }}>
                Manage Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No order selected — show selector */}
      {!processOrderId && !loading && !error && (
        <OrderSelector
          orders={allOrders}
          loading={listLoading}
          onSelect={handleSelect}
        />
      )}

      {/* Execution in progress */}
      {detail && workflow && steps.length > 0 && !loading && !error && !done && (
        <>
          <StepProgress
            steps={steps}
            currentIndex={currentIdx}
            completedIndices={completed}
          />
          <StepCard
            step={steps[currentIdx]}
            totalSteps={steps.length}
            order={detail.order}
            workflow={workflow}
            onConfirm={handleConfirm}
            onBack={handleBack}
            canGoBack={currentIdx > 0}
            confirming={confirming}
          />
        </>
      )}

      {/* Order has no nodes */}
      {detail && workflow && steps.length === 0 && !loading && !error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
              MBR has no steps
            </p>
            <p style={{ fontSize: 12, color: '#334155', marginBottom: 24, lineHeight: 1.6 }}>
              The MBR &quot;{workflow.name}&quot; has no nodes.
              A supervisor must add steps in the MBR Designer first.
            </p>
            <button onClick={() => navigate('/designer')}
              style={{ padding: '10px 24px', borderRadius: 8, fontSize: 12,
                cursor: 'pointer', background: '#3b82f622',
                border: '1px solid #3b82f666', color: '#93c5fd', fontFamily: 'inherit' }}>
              → MBR Designer
            </button>
          </div>
        </div>
      )}

      {/* Completion */}
      {done && detail && workflow && (
        <>
          <StepProgress
            steps={steps}
            currentIndex={steps.length}
            completedIndices={new Set(steps.map((_, i) => i))}
          />
          <CompletionScreen
            order={detail.order}
            workflow={workflow}
            totalSteps={steps.length}
            onSelectAnother={() => navigate('/execution')}
            onGoToOrders={() => navigate('/orders')}
          />
        </>
      )}

      {/* Already-completed order visited directly */}
      {done && detail && !workflow && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#10b981', marginBottom: 12 }}>✓</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
              Order Already Completed
            </p>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
              {detail.order.order_number} was completed successfully.
            </p>
            <button onClick={() => navigate('/orders')}
              style={{ padding: '10px 24px', borderRadius: 8, fontSize: 12,
                cursor: 'pointer', background: '#10b98122',
                border: '1px solid #10b98144', color: '#6ee7b7', fontFamily: 'inherit' }}>
              View All Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowExecutionPage;
