// src/types/processOrder.ts
// Domain types for Process Orders (EBRs) and their execution audit trail.
// These mirror the Rust backend schema exactly — keep in sync with src/schema.rs.

// ── Status lifecycle ──────────────────────────────────────────────────────────

export type ProcessOrderStatus =
  | 'pending'       // created, awaiting operator
  | 'in_progress'   // operator has started execution
  | 'completed'     // all steps confirmed
  | 'cancelled';    // supervisor cancelled

// ── API response shapes ───────────────────────────────────────────────────────

export interface ProcessOrder {
  id: string;
  order_number: string;
  description: string;
  workflow_id: string | null;   // null if MBR was deleted after order creation
  workflow_name: string;        // denormalised snapshot — always available
  status: ProcessOrderStatus;
  assigned_to: string;
  scheduled_date: string;
  current_step: number;
  total_steps: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessOrderExecution {
  id: string;
  process_order_id: string;
  node_canvas_id: string;
  node_type: string;
  node_label: string;
  step_number: number;
  confirmed_by: string;
  notes: string;
  confirmed_at: string;
}

export interface ProcessOrderDetail {
  order: ProcessOrder;
  executions: ProcessOrderExecution[];
}

// ── API request bodies ────────────────────────────────────────────────────────

export interface CreateProcessOrderBody {
  order_number: string;
  description: string;
  workflow_id: string;
  assigned_to: string;
  scheduled_date: string;
}

export interface UpdateProcessOrderBody {
  order_number?: string;
  description?: string;
  workflow_id?: string;
  assigned_to?: string;
  scheduled_date?: string;
  status?: ProcessOrderStatus;
}

export interface StartProcessOrderBody {
  total_steps: number;
}

export interface ConfirmStepBody {
  node_canvas_id: string;
  node_type: string;
  node_label: string;
  step_number: number;
  confirmed_by: string;
  notes: string;
}

// ── List filter ───────────────────────────────────────────────────────────────

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: ProcessOrderStatus;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export const STATUS_META: Record<
  ProcessOrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label:  'Pending',
    color:  '#f59e0b',
    bg:     '#f59e0b11',
    border: '#f59e0b44',
  },
  in_progress: {
    label:  'In Progress',
    color:  '#3b82f6',
    bg:     '#3b82f611',
    border: '#3b82f644',
  },
  completed: {
    label:  'Completed',
    color:  '#10b981',
    bg:     '#10b98111',
    border: '#10b98144',
  },
  cancelled: {
    label:  'Cancelled',
    color:  '#ef4444',
    bg:     '#ef444411',
    border: '#ef444444',
  },
};
