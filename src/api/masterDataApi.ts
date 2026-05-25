// src/api/masterDataApi.ts
// All HTTP calls for the four master-data entities.
// One function per endpoint — no fetch logic in components.

import axios from 'axios';
import type {
  Batch,
  BatchListParams,
  CreateBatchBody,
  CreateHandlingUnitBody,
  CreateLocationBody,
  CreateMaterialBody,
  HandlingUnit,
  HuListParams,
  Location,
  LocationListParams,
  Material,
  MaterialListParams,
  UpdateBatchBody,
  UpdateHandlingUnitBody,
  UpdateLocationBody,
  UpdateMaterialBody,
} from '../types/masterData';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL
// ─────────────────────────────────────────────────────────────────────────────

export const fetchMaterials = async (p: MaterialListParams = {}): Promise<Material[]> => {
  const qs = new URLSearchParams();
  if (p.page)          qs.set('page',          String(p.page));
  if (p.limit)         qs.set('limit',         String(p.limit));
  if (p.material_type) qs.set('material_type', p.material_type);
  if (p.is_active !== undefined) qs.set('is_active', String(p.is_active));
  if (p.search)        qs.set('search',        p.search);
  const { data } = await api.get<{ materials: Material[] }>(`/materials?${qs}`);
  return data.materials;
};

export const fetchMaterial = async (id: string): Promise<Material> => {
  const { data } = await api.get<{ material: Material }>(`/materials/${id}`);
  return data.material;
};

export const createMaterial = async (body: CreateMaterialBody): Promise<Material> => {
  const { data } = await api.post<{ material: Material }>('/materials', body);
  return data.material;
};

export const updateMaterial = async (id: string, body: UpdateMaterialBody): Promise<Material> => {
  const { data } = await api.patch<{ material: Material }>(`/materials/${id}`, body);
  return data.material;
};

export const deleteMaterial = async (id: string): Promise<void> => {
  await api.delete(`/materials/${id}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION
// ─────────────────────────────────────────────────────────────────────────────

export const fetchLocations = async (p: LocationListParams = {}): Promise<Location[]> => {
  const qs = new URLSearchParams();
  if (p.page)          qs.set('page',          String(p.page));
  if (p.limit)         qs.set('limit',         String(p.limit));
  if (p.location_type) qs.set('location_type', p.location_type);
  if (p.is_active !== undefined) qs.set('is_active', String(p.is_active));
  const { data } = await api.get<{ locations: Location[] }>(`/locations?${qs}`);
  return data.locations;
};

export const fetchLocation = async (id: string): Promise<Location> => {
  const { data } = await api.get<{ location: Location }>(`/locations/${id}`);
  return data.location;
};

export const createLocation = async (body: CreateLocationBody): Promise<Location> => {
  const { data } = await api.post<{ location: Location }>('/locations', body);
  return data.location;
};

export const updateLocation = async (id: string, body: UpdateLocationBody): Promise<Location> => {
  const { data } = await api.patch<{ location: Location }>(`/locations/${id}`, body);
  return data.location;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await api.delete(`/locations/${id}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// BATCH
// ─────────────────────────────────────────────────────────────────────────────

export const fetchBatches = async (p: BatchListParams = {}): Promise<Batch[]> => {
  const qs = new URLSearchParams();
  if (p.page)        qs.set('page',        String(p.page));
  if (p.limit)       qs.set('limit',       String(p.limit));
  if (p.material_id) qs.set('material_id', p.material_id);
  if (p.status)      qs.set('status',      p.status);
  const { data } = await api.get<{ batches: Batch[] }>(`/batches?${qs}`);
  return data.batches;
};

export const fetchBatch = async (id: string): Promise<Batch> => {
  const { data } = await api.get<{ batch: Batch }>(`/batches/${id}`);
  return data.batch;
};

export const createBatch = async (body: CreateBatchBody): Promise<Batch> => {
  const { data } = await api.post<{ batch: Batch }>('/batches', body);
  return data.batch;
};

export const updateBatch = async (id: string, body: UpdateBatchBody): Promise<Batch> => {
  const { data } = await api.patch<{ batch: Batch }>(`/batches/${id}`, body);
  return data.batch;
};

export const deleteBatch = async (id: string): Promise<void> => {
  await api.delete(`/batches/${id}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLING UNIT
// ─────────────────────────────────────────────────────────────────────────────

export const fetchHandlingUnits = async (p: HuListParams = {}): Promise<HandlingUnit[]> => {
  const qs = new URLSearchParams();
  if (p.page)        qs.set('page',        String(p.page));
  if (p.limit)       qs.set('limit',       String(p.limit));
  if (p.batch_id)    qs.set('batch_id',    p.batch_id);
  if (p.location_id) qs.set('location_id', p.location_id);
  if (p.status)      qs.set('status',      p.status);
  if (p.hu_type)     qs.set('hu_type',     p.hu_type);
  const { data } = await api.get<{ handling_units: HandlingUnit[] }>(`/handling-units?${qs}`);
  return data.handling_units;
};

export const fetchHandlingUnit = async (id: string): Promise<HandlingUnit> => {
  const { data } = await api.get<{ handling_unit: HandlingUnit }>(`/handling-units/${id}`);
  return data.handling_unit;
};

export const createHandlingUnit = async (body: CreateHandlingUnitBody): Promise<HandlingUnit> => {
  const { data } = await api.post<{ handling_unit: HandlingUnit }>('/handling-units', body);
  return data.handling_unit;
};

export const updateHandlingUnit = async (id: string, body: UpdateHandlingUnitBody): Promise<HandlingUnit> => {
  const { data } = await api.patch<{ handling_unit: HandlingUnit }>(`/handling-units/${id}`, body);
  return data.handling_unit;
};

export const deleteHandlingUnit = async (id: string): Promise<void> => {
  await api.delete(`/handling-units/${id}`);
};
