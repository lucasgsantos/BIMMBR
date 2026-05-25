// src/types/masterData.ts
// Domain types for the four master-data entities.
// Mirror the Rust backend schema exactly — keep in sync with src/schema.rs.

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL
// ─────────────────────────────────────────────────────────────────────────────

export type MaterialType =
  | 'raw'
  | 'intermediate'
  | 'finished'
  | 'consumable'
  | 'packaging';

export interface Material {
  id: string;
  material_number: string;
  name: string;
  description: string;
  material_type: MaterialType;
  unit_of_measure: string;
  attributes: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialBody {
  material_number: string;
  name: string;
  description?: string;
  material_type?: MaterialType;
  unit_of_measure?: string;
  attributes?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateMaterialBody {
  material_number?: string;
  name?: string;
  description?: string;
  material_type?: MaterialType;
  unit_of_measure?: string;
  attributes?: Record<string, unknown>;
  is_active?: boolean;
}

export interface MaterialListParams {
  page?: number;
  limit?: number;
  material_type?: MaterialType;
  is_active?: boolean;
  search?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION
// ─────────────────────────────────────────────────────────────────────────────

export type LocationType =
  | 'warehouse'
  | 'production'
  | 'lab'
  | 'quarantine'
  | 'staging'
  | 'dispatch';

export interface Location {
  id: string;
  location_code: string;
  name: string;
  description: string;
  location_type: LocationType;
  parent_location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationBody {
  location_code: string;
  name: string;
  description?: string;
  location_type?: LocationType;
  parent_location_id?: string | null;
  is_active?: boolean;
}

export interface UpdateLocationBody {
  location_code?: string;
  name?: string;
  description?: string;
  location_type?: LocationType;
  /** Send empty string "" to clear the parent. */
  parent_location_id?: string | null;
  is_active?: boolean;
}

export interface LocationListParams {
  page?: number;
  limit?: number;
  location_type?: LocationType;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH
// ─────────────────────────────────────────────────────────────────────────────

export type BatchStatus =
  | 'active'
  | 'quarantine'
  | 'released'
  | 'expired'
  | 'consumed'
  | 'rejected';

export interface Batch {
  id: string;
  batch_number: string;
  material_id: string;
  material_number: string;
  material_name: string;
  quantity: number;
  unit_of_measure: string;
  status: BatchStatus;
  manufactured_date: string;
  expiry_date: string;
  notes: string;
  process_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBatchBody {
  batch_number: string;
  material_id: string;
  quantity: number;
  unit_of_measure?: string;
  status?: BatchStatus;
  manufactured_date?: string;
  expiry_date?: string;
  notes?: string;
  process_order_id?: string | null;
}

export interface UpdateBatchBody {
  batch_number?: string;
  material_id?: string;
  quantity?: number;
  unit_of_measure?: string;
  status?: BatchStatus;
  manufactured_date?: string;
  expiry_date?: string;
  notes?: string;
  /** Send empty string "" to clear the link. */
  process_order_id?: string | null;
}

export interface BatchListParams {
  page?: number;
  limit?: number;
  material_id?: string;
  status?: BatchStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLING UNIT
// ─────────────────────────────────────────────────────────────────────────────

export type HuType =
  | 'pallet'
  | 'container'
  | 'box'
  | 'drum'
  | 'ibc'
  | 'sack'
  | 'other';

export type HuStatus =
  | 'empty'
  | 'partial'
  | 'full'
  | 'sealed'
  | 'damaged'
  | 'disposed';

export interface HandlingUnit {
  id: string;
  hu_number: string;
  description: string;
  hu_type: HuType;
  status: HuStatus;
  batch_id: string | null;
  batch_number: string;
  quantity: number;
  unit_of_measure: string;
  location_id: string | null;
  location_code: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHandlingUnitBody {
  hu_number: string;
  description?: string;
  hu_type?: HuType;
  status?: HuStatus;
  batch_id?: string | null;
  quantity?: number;
  unit_of_measure?: string;
  location_id?: string | null;
}

export interface UpdateHandlingUnitBody {
  hu_number?: string;
  description?: string;
  hu_type?: HuType;
  status?: HuStatus;
  /** Send empty string "" to clear. */
  batch_id?: string | null;
  quantity?: number;
  unit_of_measure?: string;
  /** Send empty string "" to clear. */
  location_id?: string | null;
}

export interface HuListParams {
  page?: number;
  limit?: number;
  batch_id?: string;
  location_id?: string;
  status?: HuStatus;
  hu_type?: HuType;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI METADATA HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIAL_TYPE_META: Record<MaterialType, { label: string; color: string }> = {
  raw:           { label: 'Raw Material',   color: '#f59e0b' },
  intermediate:  { label: 'Intermediate',   color: '#8b5cf6' },
  finished:      { label: 'Finished Good',  color: '#10b981' },
  consumable:    { label: 'Consumable',     color: '#06b6d4' },
  packaging:     { label: 'Packaging',      color: '#3b82f6' },
};

export const LOCATION_TYPE_META: Record<LocationType, { label: string; color: string; icon: string }> = {
  warehouse:   { label: 'Warehouse',   color: '#3b82f6', icon: '⬡' },
  production:  { label: 'Production',  color: '#f59e0b', icon: '⚙' },
  lab:         { label: 'Laboratory',  color: '#8b5cf6', icon: '⬡' },
  quarantine:  { label: 'Quarantine',  color: '#ef4444', icon: '◈' },
  staging:     { label: 'Staging',     color: '#06b6d4', icon: '▶' },
  dispatch:    { label: 'Dispatch',    color: '#10b981', icon: '▶' },
};

export const BATCH_STATUS_META: Record<BatchStatus, { label: string; color: string; bg: string; border: string }> = {
  active:     { label: 'Active',     color: '#10b981', bg: '#10b98111', border: '#10b98144' },
  quarantine: { label: 'Quarantine', color: '#f59e0b', bg: '#f59e0b11', border: '#f59e0b44' },
  released:   { label: 'Released',   color: '#3b82f6', bg: '#3b82f611', border: '#3b82f644' },
  expired:    { label: 'Expired',    color: '#ef4444', bg: '#ef444411', border: '#ef444444' },
  consumed:   { label: 'Consumed',   color: '#64748b', bg: '#64748b11', border: '#64748b44' },
  rejected:   { label: 'Rejected',   color: '#dc2626', bg: '#dc262611', border: '#dc262644' },
};

export const HU_STATUS_META: Record<HuStatus, { label: string; color: string; bg: string; border: string }> = {
  empty:    { label: 'Empty',    color: '#64748b', bg: '#64748b11', border: '#64748b44' },
  partial:  { label: 'Partial',  color: '#f59e0b', bg: '#f59e0b11', border: '#f59e0b44' },
  full:     { label: 'Full',     color: '#10b981', bg: '#10b98111', border: '#10b98144' },
  sealed:   { label: 'Sealed',   color: '#3b82f6', bg: '#3b82f611', border: '#3b82f644' },
  damaged:  { label: 'Damaged',  color: '#ef4444', bg: '#ef444411', border: '#ef444444' },
  disposed: { label: 'Disposed', color: '#334155', bg: '#33415511', border: '#33415544' },
};

export const HU_TYPE_META: Record<HuType, { label: string; icon: string }> = {
  pallet:    { label: 'Pallet',    icon: '▦' },
  container: { label: 'Container', icon: '◫' },
  box:       { label: 'Box',       icon: '▪' },
  drum:      { label: 'Drum',      icon: '◎' },
  ibc:       { label: 'IBC',       icon: '⬡' },
  sack:      { label: 'Sack',      icon: '◈' },
  other:     { label: 'Other',     icon: '○' },
};

export const UNITS_OF_MEASURE = ['kg', 'g', 'mg', 'L', 'mL', 'units', 'm', 'm2', 'm3', 'each'];
