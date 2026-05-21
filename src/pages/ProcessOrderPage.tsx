// src/pages/ProcessOrderPage.tsx
// Supervisor view — create, view, manage and cancel Process Orders (EBRs).
// Each order is linked to an MBR (workflow) and can be sent to the operator
// for step-by-step execution via the EBR Execution page.
//
// Routes:  /orders              list + create
//          /orders/:id          detail panel (inline right-side panel)

import { CSSProperties, FC, ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cancelOrder,
  createOrder,
  deleteOrder,
  fetchOrder,
  fetchOrders,
} from '../api/processOrderApi';
import { fetchWorkflows } from '../api/workflowApi';
import type { ProcessOrder, ProcessOrderDetail, ProcessOrderStatus } from '../types/processOrder';
import { STATUS_META } from '../types/processOrder';
import type { WorkflowListItem } from '../types/workflow';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const StatusBadge: FC<{ status: ProcessOrderStatus }> = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
        background: m.bg, border: `1px solid ${m.border}`, color: m.color,
        whiteSpace: 'nowrap',
      }}
    >
      {m.label}
    </span>
  );
};

const ProgressBar: FC<{ current: number; total: number; color: string }> = ({
  current, total, color,
}) => {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%', width: `${pct}%`, background: color,
            borderRadius: 2, transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: '#64748b', minWidth: 32, textAlign: 'right',
        fontFamily: 'monospace' }}>
        {pct}%
      </span>
    </div>
  );
};

// ─── Create Order Modal ───────────────────────────────────────────────────────

interface CreateOrderModalProps {
  open: boolean;
  workflows: WorkflowListItem[];
  onClose: () => void;
  onCreated: (order: ProcessOrder) => void;
}

const CreateOrderModal: FC<CreateOrderModalProps> = ({ open, workflows, onClose, onCreated }) => {
  const [orderNumber,    setOrderNumber]    = useState('');
  const [description,    setDescription]    = useState('');
  const [workflowId,     setWorkflowId]     = useState('');
  const [assignedTo,     setAssignedTo]     = useState('');
  const [scheduledDate,  setScheduledDate]  = useState('');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setOrderNumber(''); setDescription(''); setWorkflowId('');
      setAssignedTo(''); setScheduledDate(''); setError(null);
      setTimeout(() => firstRef.current?.focus(), 60);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!orderNumber.trim()) { setError('Order number is required.'); return; }
    if (!workflowId)          { setError('Please select an MBR.'); return; }
    setSaving(true); setError(null);
    try {
      const order = await createOrder({
        order_number: orderNumber.trim(),
        description: description.trim(),
        workflow_id: workflowId,
        assigned_to: assignedTo.trim(),
        scheduled_date: scheduledDate.trim(),
      });
      onCreated(order);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create order.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 440, maxHeight: '90vh', overflowY: 'auto',
        background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: 14, zIndex: 50, padding: '28px',
        fontFamily: "'IBM Plex Mono', monospace", color: '#e2e8f0',
      }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#475569', marginBottom: 4 }}>New Process Order</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Create EBR</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: '#450a0a', border: '1px solid #ef444455', color: '#fca5a5', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Order Number */}
        <Field label="Order Number *">
          <input
            ref={firstRef} value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="PO-2024-001"
            style={inputStyle}
          />
        </Field>

        {/* MBR Selection */}
        <Field label="Assign MBR *">
          <select
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
            style={{ ...inputStyle, color: workflowId ? '#e2e8f0' : '#475569' }}
          >
            <option value="">— select an MBR —</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>{wf.name}</option>
            ))}
          </select>
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2} placeholder="Batch details, product, lot number…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        {/* Assigned To */}
        <Field label="Assigned To">
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Operator name"
            style={inputStyle}
          />
        </Field>

        {/* Scheduled Date */}
        <Field label="Scheduled Date">
          <input
            type="date" value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} disabled={saving}
            style={{ ...btnBase, background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ ...btnBase, flex: 1,
              background: saving ? '#1e3a5f' : '#3b82f622',
              border: '1px solid #3b82f666', color: '#93c5fd',
              opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Order Detail Panel ───────────────────────────────────────────────────────

interface OrderDetailPanelProps {
  orderId: string;
  onClose: () => void;
  onStatusChange: (order: ProcessOrder) => void;
  onNavigateExecute: (orderId: string) => void;
}

const OrderDetailPanel: FC<OrderDetailPanelProps> = ({
  orderId, onClose, onStatusChange, onNavigateExecute,
}) => {
  const [detail,   setDetail]   = useState<ProcessOrderDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchOrder(orderId)
      .then(setDetail)
      .catch(() => setError('Failed to load order details.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(orderId);
      onStatusChange(updated);
      setDetail((d) => d ? { ...d, order: updated } : d);
    } catch {
      alert('Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 30 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
        background: '#0f172a', borderLeft: '1px solid #1e293b',
        zIndex: 35, display: 'flex', flexDirection: 'column',
        fontFamily: "'IBM Plex Mono', monospace", color: '#e2e8f0',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#475569', marginBottom: 4 }}>Process Order Detail</div>
            {detail && (
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                {detail.order.order_number}
              </div>
            )}
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b',
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4, marginLeft: 8 }}>
            ×
          </button>
        </div>

        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', fontSize: 13 }}>Loading…</div>
        )}
        {error && (
          <div style={{ margin: 20, padding: '12px', borderRadius: 8,
            background: '#450a0a', border: '1px solid #ef444455', color: '#fca5a5', fontSize: 12 }}>
            {error}
          </div>
        )}

        {detail && !loading && (
          <div style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status + progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusBadge status={detail.order.status as ProcessOrderStatus} />
              {detail.order.total_steps > 0 && (
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                  {detail.order.current_step} / {detail.order.total_steps} steps
                </span>
              )}
            </div>

            {detail.order.total_steps > 0 && (
              <ProgressBar
                current={detail.order.current_step}
                total={detail.order.total_steps}
                color={STATUS_META[detail.order.status as ProcessOrderStatus].color}
              />
            )}

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InfoCell label="MBR Reference"    value={detail.order.workflow_name || '—'} />
              <InfoCell label="Assigned To"      value={detail.order.assigned_to   || '—'} />
              <InfoCell label="Scheduled Date"   value={detail.order.scheduled_date || '—'} />
              <InfoCell label="Created"          value={fmt(detail.order.created_at)} />
              <InfoCell label="Last Updated"     value={fmt(detail.order.updated_at)} />
              <InfoCell label="Order ID"         value={detail.order.id.slice(0, 8) + '…'} mono />
            </div>

            {detail.order.description && (
              <div>
                <div style={labelStyle}>Description</div>
                <div style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b',
                  padding: '10px 12px', borderRadius: 8, border: '1px solid #334155',
                  lineHeight: 1.6 }}>
                  {detail.order.description}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(detail.order.status === 'pending' || detail.order.status === 'in_progress') && (
                <button
                  onClick={() => onNavigateExecute(orderId)}
                  style={{ padding: '12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                    background: '#10b98122', border: '1px solid #10b98144', color: '#6ee7b7',
                    fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.04em' }}>
                  ▶ Execute EBR
                </button>
              )}
              {(detail.order.status === 'pending' || detail.order.status === 'in_progress') && (
                <button
                  onClick={handleCancel} disabled={cancelling}
                  style={{ padding: '10px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                    background: '#7f1d1d22', border: '1px solid #ef444444', color: '#f87171',
                    fontFamily: 'inherit', opacity: cancelling ? 0.6 : 1 }}>
                  {cancelling ? 'Cancelling…' : '✕ Cancel Order'}
                </button>
              )}
            </div>

            {/* Execution log */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#475569', marginBottom: 12, fontWeight: 600 }}>
                Execution Log ({detail.executions.length} entries)
              </div>
              {detail.executions.length === 0 ? (
                <div style={{ fontSize: 12, color: '#334155', padding: '16px 0', textAlign: 'center' }}>
                  No steps confirmed yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detail.executions.map((ex) => (
                    <div key={ex.id} style={{ padding: '10px 12px', borderRadius: 8,
                      background: '#0a0f1c', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>
                          Step {ex.step_number} — {ex.node_label}
                        </span>
                        <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace',
                          flexShrink: 0, marginLeft: 8 }}>
                          {ex.node_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#475569', display: 'flex', gap: 12 }}>
                        <span>by {ex.confirmed_by || 'unknown'}</span>
                        <span>{new Date(ex.confirmed_at).toLocaleTimeString()}</span>
                      </div>
                      {ex.notes && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#64748b',
                          background: '#1e293b', padding: '6px 8px', borderRadius: 6 }}>
                          {ex.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Shared tiny components ───────────────────────────────────────────────────

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4,
      letterSpacing: '0.04em' }}>{label}</label>
    {children}
  </div>
);

const InfoCell: FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    <div style={{ fontSize: mono ? 11 : 12, color: '#e2e8f0',
      fontFamily: mono ? 'monospace' : 'inherit', marginTop: 2 }}>{value}</div>
  </div>
);

const labelStyle: CSSProperties = {
  fontSize: 10, color: '#475569', letterSpacing: '0.08em',
  textTransform: 'uppercase', marginBottom: 2,
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  background: '#1e293b', border: '1px solid #334155',
  color: '#e2e8f0', fontSize: 12, outline: 'none',
  boxSizing: 'border-box', fontFamily: "'IBM Plex Mono', monospace",
};

const btnBase: CSSProperties = {
  padding: '9px 18px', borderRadius: 8, fontSize: 12,
  cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
  fontWeight: 600, letterSpacing: '0.04em',
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ProcessOrderPage: FC = () => {
  const navigate = useNavigate();

  const [orders,        setOrders]        = useState<ProcessOrder[]>([]);
  const [workflows,     setWorkflows]     = useState<WorkflowListItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [statusFilter,  setStatusFilter]  = useState<string>('');
  const [createOpen,    setCreateOpen]    = useState(false);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const loadOrders = async (status?: string) => {
    setLoading(true);
    try {
      const params = status ? { status: status as ProcessOrderStatus } : {};
      setOrders(await fetchOrders(params));
    } catch {
      showToast('Failed to load orders.', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows().then(setWorkflows).catch(() => {});
    loadOrders();
  }, []);

  const handleFilterChange = (s: string) => {
    setStatusFilter(s);
    loadOrders(s || undefined);
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!window.confirm(`Delete order "${orderNumber}"? This is permanent.`)) return;
    setDeletingId(id);
    try {
      await deleteOrder(id);
      setOrders((os) => os.filter((o) => o.id !== id));
      if (selectedId === id) setSelectedId(null);
      showToast('Order deleted.');
    } catch {
      showToast('Failed to delete order.', false);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (order: ProcessOrder) => {
    setOrders((os) => [order, ...os]);
    showToast(`Order "${order.order_number}" created ✓`);
  };

  const handleStatusChange = (updated: ProcessOrder) => {
    setOrders((os) => os.map((o) => o.id === updated.id ? updated : o));
  };

  // Status filter options
  const STATUS_FILTERS = [
    { value: '',             label: 'All Orders' },
    { value: 'pending',      label: 'Pending' },
    { value: 'in_progress',  label: 'In Progress' },
    { value: 'completed',    label: 'Completed' },
    { value: 'cancelled',    label: 'Cancelled' },
  ];

  // Stats summary
  const stats = {
    total:       orders.length,
    pending:     orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed:   orders.filter((o) => o.status === 'completed').length,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0f1c', color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono', 'Fira Code', monospace", overflow: 'hidden' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, padding: '10px 20px', borderRadius: 8, fontSize: 12,
          background: toast.ok ? '#064e3b' : '#450a0a',
          border: `1px solid ${toast.ok ? '#10b981' : '#ef4444'}`,
          color: toast.ok ? '#6ee7b7' : '#fca5a5',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>{toast.msg}</div>
      )}

      {/* Modals */}
      <CreateOrderModal
        open={createOpen} workflows={workflows}
        onClose={() => setCreateOpen(false)} onCreated={handleCreated}
      />
      {selectedId && (
        <OrderDetailPanel
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
          onNavigateExecute={(id) => navigate(`/execution/${id}`)}
        />
      )}

      {/* Sub-header */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid #1e293b',
        background: '#0f172a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#475569', marginBottom: 2 }}>Production Management</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Process Orders</div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: '9px 20px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
              background: '#10b98122', border: '1px solid #10b98166', color: '#6ee7b7',
              fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.06em' }}>
            + New Order
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: stats.total,       color: '#e2e8f0' },
            { label: 'Pending',     value: stats.pending,     color: '#f59e0b' },
            { label: 'In Progress', value: stats.in_progress, color: '#3b82f6' },
            { label: 'Completed',   value: stats.completed,   color: '#10b981' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </span>
              <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase',
                letterSpacing: '0.08em' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '12px 28px', borderBottom: '1px solid #1e293b',
        background: '#0a0f1c', display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.04em', transition: 'all 0.15s',
              background: statusFilter === f.value ? '#3b82f633' : '#1e293b',
              border: `1px solid ${statusFilter === f.value ? '#3b82f666' : '#334155'}`,
              color: statusFilter === f.value ? '#93c5fd' : '#64748b',
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => loadOrders(statusFilter || undefined)}
          style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 20, fontSize: 11,
            cursor: 'pointer', background: '#1e293b', border: '1px solid #334155',
            color: '#64748b', fontFamily: 'inherit' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 200, color: '#475569', fontSize: 13 }}>Loading orders…</div>
        )}

        {!loading && orders.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 260, gap: 12, color: '#334155' }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>No process orders</div>
            <div style={{ fontSize: 12, color: '#334155' }}>
              {statusFilter ? 'No orders match this filter.' : 'Create your first order to get started.'}
            </div>
            {!statusFilter && (
              <button
                onClick={() => setCreateOpen(true)}
                style={{ marginTop: 8, padding: '9px 22px', borderRadius: 10, fontSize: 12,
                  cursor: 'pointer', background: '#10b98122', border: '1px solid #10b98144',
                  color: '#6ee7b7', fontFamily: 'inherit', fontWeight: 600 }}>
                + New Order
              </button>
            )}
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map((order) => {
              const sm = STATUS_META[order.status as ProcessOrderStatus];
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  style={{
                    padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                    background: '#0f172a',
                    border: selectedId === order.id
                      ? `1px solid ${sm.color}66`
                      : '1px solid #1e293b',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== order.id) {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.background  = '#111827';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== order.id) {
                      e.currentTarget.style.borderColor = '#1e293b';
                      e.currentTarget.style.background  = '#0f172a';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>

                    {/* Left info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0',
                          letterSpacing: '0.02em' }}>
                          {order.order_number}
                        </span>
                        <StatusBadge status={order.status as ProcessOrderStatus} />
                      </div>

                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          MBR: <span style={{ color: '#94a3b8' }}>{order.workflow_name || '—'}</span>
                        </span>
                        {order.assigned_to && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            Operator: <span style={{ color: '#94a3b8' }}>{order.assigned_to}</span>
                          </span>
                        )}
                        {order.scheduled_date && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            Scheduled: <span style={{ color: '#94a3b8' }}>{order.scheduled_date}</span>
                          </span>
                        )}
                      </div>

                      {order.description && (
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                          {order.description}
                        </div>
                      )}

                      {order.total_steps > 0 && (
                        <ProgressBar
                          current={order.current_step}
                          total={order.total_steps}
                          color={sm.color}
                        />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div
                      style={{ display: 'flex', gap: 6, flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(order.status === 'pending' || order.status === 'in_progress') && (
                        <button
                          onClick={() => navigate(`/execution/${order.id}`)}
                          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11,
                            cursor: 'pointer', background: '#10b98122',
                            border: '1px solid #10b98166', color: '#6ee7b7',
                            fontFamily: 'inherit', fontWeight: 600 }}>
                          ▶ Execute
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(order.id, order.order_number)}
                        disabled={deletingId === order.id}
                        style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11,
                          cursor: 'pointer', background: '#7f1d1d22',
                          border: '1px solid #ef444444', color: '#f87171',
                          opacity: deletingId === order.id ? 0.5 : 1,
                          fontFamily: 'inherit' }}>
                        {deletingId === order.id ? '…' : '✕'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessOrderPage;
