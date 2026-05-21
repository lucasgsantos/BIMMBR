// src/api/processOrderApi.ts
// All HTTP calls to the process order endpoints of the Rust backend.
// Keep one function per endpoint; never put fetch logic inside components.

import axios from 'axios';
import type {
  ConfirmStepBody,
  CreateProcessOrderBody,
  OrderListParams,
  ProcessOrder,
  ProcessOrderDetail,
  StartProcessOrderBody,
  UpdateProcessOrderBody,
} from '../types/processOrder';

const BASE_URL = import.meta.env.WEB_URL ?? 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// ── List ───────────────────────────────────────────────────────────────────────

export const fetchOrders = async (params: OrderListParams = {}): Promise<ProcessOrder[]> => {
  const { page = 1, limit = 50, status } = params;
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) qs.set('status', status);
  const { data } = await api.get<{ orders: ProcessOrder[] }>(`/orders?${qs}`);
  return data.orders;
};

// ── Single order with execution log ───────────────────────────────────────────

export const fetchOrder = async (id: string): Promise<ProcessOrderDetail> => {
  const { data } = await api.get<{ data: ProcessOrderDetail }>(`/orders/${id}`);
  return data.data;
};

// ── Create ─────────────────────────────────────────────────────────────────────

export const createOrder = async (body: CreateProcessOrderBody): Promise<ProcessOrder> => {
  const { data } = await api.post<{ order: ProcessOrder }>('/orders', body);
  return data.order;
};

// ── Update (metadata / status) ─────────────────────────────────────────────────

export const updateOrder = async (
  id: string,
  body: UpdateProcessOrderBody
): Promise<ProcessOrder> => {
  const { data } = await api.patch<{ order: ProcessOrder }>(`/orders/${id}`, body);
  return data.order;
};

// ── Delete ─────────────────────────────────────────────────────────────────────

export const deleteOrder = async (id: string): Promise<void> => {
  await api.delete(`/orders/${id}`);
};

// ── Lifecycle transitions ──────────────────────────────────────────────────────

/** Operator opens the order: pending → in_progress */
export const startOrder = async (id: string, body: StartProcessOrderBody): Promise<ProcessOrder> => {
  const { data } = await api.post<{ order: ProcessOrder }>(`/orders/${id}/start`, body);
  return data.order;
};

/** Operator confirms one step — appends to the immutable audit log */
export const confirmStep = async (id: string, body: ConfirmStepBody): Promise<void> => {
  await api.post(`/orders/${id}/steps`, body);
};

/** Operator marks execution complete: in_progress → completed */
export const completeOrder = async (id: string): Promise<ProcessOrder> => {
  const { data } = await api.post<{ order: ProcessOrder }>(`/orders/${id}/complete`);
  return data.order;
};

/** Supervisor cancels the order */
export const cancelOrder = async (id: string): Promise<ProcessOrder> => {
  const { data } = await api.post<{ order: ProcessOrder }>(`/orders/${id}/cancel`);
  return data.order;
};
