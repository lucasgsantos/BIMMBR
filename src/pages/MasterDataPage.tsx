// src/pages/MasterDataPage.tsx
// Supervisor view — CRUD for the four master-data entities.
// Rendered as a single page with four tabs: Material | Location | Batch | Handling Unit.
// Route: /master-data

import {
  CSSProperties,
  FC,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createBatch,
  createHandlingUnit,
  createLocation,
  createMaterial,
  deleteBatch,
  deleteHandlingUnit,
  deleteLocation,
  deleteMaterial,
  fetchBatches,
  fetchHandlingUnits,
  fetchLocations,
  fetchMaterials,
  updateBatch,
  updateHandlingUnit,
  updateLocation,
  updateMaterial,
} from '../api/masterDataApi';
import type {
  Batch,
  BatchStatus,
  HandlingUnit,
  HuStatus,
  HuType,
  Location,
  LocationType,
  Material,
  MaterialType,
} from '../types/masterData';
import {
  BATCH_STATUS_META,
  HU_STATUS_META,
  HU_TYPE_META,
  LOCATION_TYPE_META,
  MATERIAL_TYPE_META,
  UNITS_OF_MEASURE,
} from '../types/masterData';

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────

const field: CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  background: '#1e293b', border: '1px solid #334155',
  color: '#e2e8f0', fontSize: 12, outline: 'none',
  boxSizing: 'border-box', fontFamily: "'IBM Plex Mono', monospace",
};

const Field: FC<{ label: string; required?: boolean; children: ReactNode }> = ({
  label, required, children,
}) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, color: '#64748b', display: 'block',
      marginBottom: 5, letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const Badge: FC<{ label: string; color: string; bg: string; border: string }> = ({
  label, color, bg, border,
}) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '2px 9px', borderRadius: 20,
    background: bg, border: `1px solid ${border}`, color,
    whiteSpace: 'nowrap', flexShrink: 0,
  }}>
    {label}
  </span>
);

const Toast: FC<{ msg: string; ok: boolean }> = ({ msg, ok }) => (
  <div style={{
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    zIndex: 300, padding: '10px 22px', borderRadius: 8, fontSize: 12,
    background: ok ? '#064e3b' : '#450a0a',
    border: `1px solid ${ok ? '#10b981' : '#ef4444'}`,
    color: ok ? '#6ee7b7' : '#fca5a5',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    fontFamily: "'IBM Plex Mono', monospace",
  }}>{msg}</div>
);

// Generic modal shell
const Modal: FC<{ title: string; subtitle: string; onClose: () => void; children: ReactNode }> = ({
  title, subtitle, onClose, children,
}) => (
  <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 460, maxHeight: '88vh', overflowY: 'auto',
      background: '#0f172a', border: '1px solid #1e293b',
      borderRadius: 14, zIndex: 50, padding: '26px 28px',
      fontFamily: "'IBM Plex Mono', monospace", color: '#e2e8f0',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#475569', marginBottom: 4 }}>{subtitle}</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
      </div>
      {children}
    </div>
  </>
);

const ModalActions: FC<{ onCancel: () => void; onConfirm: () => void;
  confirmLabel?: string; saving?: boolean }> = ({
  onCancel, onConfirm, confirmLabel = 'Save', saving,
}) => (
  <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
    <button onClick={onCancel} disabled={saving}
      style={{ padding: '9px 18px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
        background: '#1e293b', border: '1px solid #334155', color: '#64748b',
        fontFamily: 'inherit' }}>Cancel</button>
    <button onClick={onConfirm} disabled={saving}
      style={{ flex: 1, padding: '9px 18px', borderRadius: 8, fontSize: 12,
        cursor: saving ? 'not-allowed' : 'pointer',
        background: saving ? '#1e3a5f' : '#3b82f622',
        border: '1px solid #3b82f666', color: '#93c5fd',
        opacity: saving ? 0.7 : 1, fontFamily: 'inherit', fontWeight: 700 }}>
      {saving ? 'Saving…' : confirmLabel}
    </button>
  </div>
);

// Empty state
const Empty: FC<{ icon: string; label: string; sub: string; onNew: () => void; btnLabel: string }> = ({
  icon, label, sub, onNew, btnLabel,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: 260, gap: 10 }}>
    <div style={{ fontSize: 38 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{label}</div>
    <div style={{ fontSize: 12, color: '#334155' }}>{sub}</div>
    <button onClick={onNew} style={{ marginTop: 8, padding: '9px 22px', borderRadius: 10,
      fontSize: 12, cursor: 'pointer', background: '#10b98122',
      border: '1px solid #10b98144', color: '#6ee7b7',
      fontFamily: 'inherit', fontWeight: 600 }}>{btnLabel}</button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL tab
// ─────────────────────────────────────────────────────────────────────────────

const MaterialTab: FC<{ showToast: (m: string, ok?: boolean) => void }> = ({ showToast }) => {
  const [items,      setItems]      = useState<Material[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalMode,  setModalMode]  = useState<'create' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<Material | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  // Form state
  const [fNum,   setFNum]   = useState('');
  const [fName,  setFName]  = useState('');
  const [fDesc,  setFDesc]  = useState('');
  const [fType,  setFType]  = useState<MaterialType>('raw');
  const [fUom,   setFUom]   = useState('kg');
  const [fActive,setFActive]= useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await fetchMaterials({ search: search || undefined,
      material_type: typeFilter as MaterialType || undefined }));
    } catch { showToast('Failed to load materials.', false); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFNum(''); setFName(''); setFDesc('');
    setFType('raw'); setFUom('kg'); setFActive(true);
    setModalMode('create');
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setFNum(m.material_number); setFName(m.name); setFDesc(m.description);
    setFType(m.material_type as MaterialType);
    setFUom(m.unit_of_measure); setFActive(m.is_active);
    setModalMode('edit');
  };

  const handleSave = async () => {
    if (!fNum.trim() || !fName.trim()) {
      showToast('Material number and name are required.', false); return;
    }
    setSaving(true);
    try {
      const body = { material_number: fNum.trim(), name: fName.trim(),
        description: fDesc.trim(), material_type: fType,
        unit_of_measure: fUom, is_active: fActive };
      if (modalMode === 'create') {
        const m = await createMaterial(body);
        setItems(prev => [m, ...prev]);
        showToast(`Material "${m.material_number}" created ✓`);
      } else if (editing) {
        const m = await updateMaterial(editing.id, body);
        setItems(prev => prev.map(x => x.id === m.id ? m : x));
        showToast(`Material updated ✓`);
      }
      setModalMode(null);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Save failed.', false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Delete material "${num}"?`)) return;
    setDeleting(id);
    try {
      await deleteMaterial(id);
      setItems(prev => prev.filter(x => x.id !== id));
      showToast('Material deleted.');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Delete failed.', false);
    } finally { setDeleting(null); }
  };

  const TYPES: MaterialType[] = ['raw','intermediate','finished','consumable','packaging'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Search by number or name…"
          style={{ ...field, width: 240, flex: 'none' }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ ...field, width: 160, flex: 'none' }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{MATERIAL_TYPE_META[t].label}</option>)}
        </select>
        <button onClick={load}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            background: '#1e293b', border: '1px solid #334155', color: '#64748b',
            fontFamily: 'inherit' }}>↻</button>
        <button onClick={openCreate}
          style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, fontSize: 12,
            cursor: 'pointer', background: '#10b98122', border: '1px solid #10b98144',
            color: '#6ee7b7', fontFamily: 'inherit', fontWeight: 700 }}>+ New Material</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading
          ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Loading…</div>
          : items.length === 0
            ? <Empty icon="⬡" label="No materials" sub="Add your first material to get started."
                onNew={openCreate} btnLabel="+ New Material" />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Number','Name','Type','UoM','Status',''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px',
                        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(m => {
                    const meta = MATERIAL_TYPE_META[m.material_type as MaterialType];
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #0f172a',
                        transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', color: meta?.color ?? '#e2e8f0',
                          fontFamily: 'monospace', fontWeight: 600 }}>{m.material_number}</td>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{m.name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge label={meta?.label ?? m.material_type}
                            color={meta?.color ?? '#94a3b8'}
                            bg={(meta?.color ?? '#94a3b8') + '11'}
                            border={(meta?.color ?? '#94a3b8') + '44'} />
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b',
                          fontFamily: 'monospace' }}>{m.unit_of_measure}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge label={m.is_active ? 'Active' : 'Inactive'}
                            color={m.is_active ? '#10b981' : '#ef4444'}
                            bg={m.is_active ? '#10b98111' : '#ef444411'}
                            border={m.is_active ? '#10b98144' : '#ef444444'} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(m)}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#3b82f622',
                                border: '1px solid #3b82f644', color: '#93c5fd',
                                fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => handleDelete(m.id, m.material_number)}
                              disabled={deleting === m.id}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#7f1d1d22',
                                border: '1px solid #ef444444', color: '#f87171',
                                fontFamily: 'inherit', opacity: deleting === m.id ? 0.5 : 1 }}>
                              {deleting === m.id ? '…' : '✕'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>

      {/* Modal */}
      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Material' : 'Edit Material'}
          subtitle="Material Master" onClose={() => setModalMode(null)}>
          <Field label="Material Number" required>
            <input value={fNum} onChange={e => setFNum(e.target.value)}
              placeholder="MAT-10001" style={field} />
          </Field>
          <Field label="Name" required>
            <input value={fName} onChange={e => setFName(e.target.value)}
              placeholder="Acetonitrile HPLC Grade" style={field} />
          </Field>
          <Field label="Description">
            <textarea value={fDesc} onChange={e => setFDesc(e.target.value)}
              rows={2} style={{ ...field, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Material Type">
              <select value={fType} onChange={e => setFType(e.target.value as MaterialType)} style={field}>
                {TYPES.map(t => <option key={t} value={t}>{MATERIAL_TYPE_META[t].label}</option>)}
              </select>
            </Field>
            <Field label="Unit of Measure">
              <select value={fUom} onChange={e => setFUom(e.target.value)} style={field}>
                {UNITS_OF_MEASURE.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status">
            <select value={fActive ? 'true' : 'false'}
              onChange={e => setFActive(e.target.value === 'true')} style={field}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          <ModalActions onCancel={() => setModalMode(null)} onConfirm={handleSave}
            confirmLabel={modalMode === 'create' ? 'Create Material' : 'Save Changes'}
            saving={saving} />
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION tab
// ─────────────────────────────────────────────────────────────────────────────

const LocationTab: FC<{ showToast: (m: string, ok?: boolean) => void }> = ({ showToast }) => {
  const [items,      setItems]      = useState<Location[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalMode,  setModalMode]  = useState<'create' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<Location | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const [fCode,   setFCode]   = useState('');
  const [fName,   setFName]   = useState('');
  const [fDesc,   setFDesc]   = useState('');
  const [fType,   setFType]   = useState<LocationType>('warehouse');
  const [fParent, setFParent] = useState('');
  const [fActive, setFActive] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await fetchLocations({ location_type: typeFilter as LocationType || undefined })); }
    catch { showToast('Failed to load locations.', false); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFCode(''); setFName(''); setFDesc('');
    setFType('warehouse'); setFParent(''); setFActive(true);
    setModalMode('create');
  };

  const openEdit = (l: Location) => {
    setEditing(l);
    setFCode(l.location_code); setFName(l.name); setFDesc(l.description);
    setFType(l.location_type as LocationType);
    setFParent(l.parent_location_id ?? ''); setFActive(l.is_active);
    setModalMode('edit');
  };

  const handleSave = async () => {
    if (!fCode.trim() || !fName.trim()) {
      showToast('Location code and name are required.', false); return;
    }
    setSaving(true);
    try {
      const body = { location_code: fCode.trim(), name: fName.trim(),
        description: fDesc.trim(), location_type: fType,
        parent_location_id: fParent || null, is_active: fActive };
      if (modalMode === 'create') {
        const l = await createLocation(body);
        setItems(prev => [l, ...prev]);
        showToast(`Location "${l.location_code}" created ✓`);
      } else if (editing) {
        const l = await updateLocation(editing.id, body);
        setItems(prev => prev.map(x => x.id === l.id ? l : x));
        showToast('Location updated ✓');
      }
      setModalMode(null);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Save failed.', false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Delete location "${code}"?`)) return;
    setDeleting(id);
    try {
      await deleteLocation(id);
      setItems(prev => prev.filter(x => x.id !== id));
      showToast('Location deleted.');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Delete failed.', false);
    } finally { setDeleting(null); }
  };

  const LOC_TYPES: LocationType[] = ['warehouse','production','lab','quarantine','staging','dispatch'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ ...field, width: 180, flex: 'none' }}>
          <option value="">All Types</option>
          {LOC_TYPES.map(t => <option key={t} value={t}>{LOCATION_TYPE_META[t].label}</option>)}
        </select>
        <button onClick={load}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            background: '#1e293b', border: '1px solid #334155', color: '#64748b',
            fontFamily: 'inherit' }}>↻</button>
        <button onClick={openCreate}
          style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, fontSize: 12,
            cursor: 'pointer', background: '#10b98122', border: '1px solid #10b98144',
            color: '#6ee7b7', fontFamily: 'inherit', fontWeight: 700 }}>+ New Location</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading
          ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Loading…</div>
          : items.length === 0
            ? <Empty icon="⬡" label="No locations" sub="Add your first location to get started."
                onNew={openCreate} btnLabel="+ New Location" />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Code','Name','Type','Parent','Status',''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px',
                        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#475569', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(l => {
                    const meta = LOCATION_TYPE_META[l.location_type as LocationType];
                    const parent = items.find(x => x.id === l.parent_location_id);
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid #0f172a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', color: meta?.color ?? '#e2e8f0',
                          fontFamily: 'monospace', fontWeight: 600 }}>{l.location_code}</td>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{l.name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge label={meta?.label ?? l.location_type}
                            color={meta?.color ?? '#94a3b8'}
                            bg={(meta?.color ?? '#94a3b8') + '11'}
                            border={(meta?.color ?? '#94a3b8') + '44'} />
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b',
                          fontFamily: 'monospace', fontSize: 11 }}>
                          {parent ? parent.location_code : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge label={l.is_active ? 'Active' : 'Inactive'}
                            color={l.is_active ? '#10b981' : '#ef4444'}
                            bg={l.is_active ? '#10b98111' : '#ef444411'}
                            border={l.is_active ? '#10b98144' : '#ef444444'} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(l)}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#3b82f622',
                                border: '1px solid #3b82f644', color: '#93c5fd',
                                fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => handleDelete(l.id, l.location_code)}
                              disabled={deleting === l.id}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#7f1d1d22',
                                border: '1px solid #ef444444', color: '#f87171',
                                fontFamily: 'inherit', opacity: deleting === l.id ? 0.5 : 1 }}>
                              {deleting === l.id ? '…' : '✕'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>

      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Location' : 'Edit Location'}
          subtitle="Location Master" onClose={() => setModalMode(null)}>
          <Field label="Location Code" required>
            <input value={fCode} onChange={e => setFCode(e.target.value)}
              placeholder="WH-A1-R3" style={field} />
          </Field>
          <Field label="Name" required>
            <input value={fName} onChange={e => setFName(e.target.value)}
              placeholder="Warehouse A, Row 3" style={field} />
          </Field>
          <Field label="Description">
            <textarea value={fDesc} onChange={e => setFDesc(e.target.value)}
              rows={2} style={{ ...field, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Location Type">
              <select value={fType} onChange={e => setFType(e.target.value as LocationType)} style={field}>
                {LOC_TYPES.map(t => <option key={t} value={t}>{LOCATION_TYPE_META[t].label}</option>)}
              </select>
            </Field>
            <Field label="Parent Location">
              <select value={fParent} onChange={e => setFParent(e.target.value)} style={field}>
                <option value="">— none —</option>
                {items.filter(x => !editing || x.id !== editing.id)
                  .map(x => <option key={x.id} value={x.id}>{x.location_code}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status">
            <select value={fActive ? 'true' : 'false'}
              onChange={e => setFActive(e.target.value === 'true')} style={field}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          <ModalActions onCancel={() => setModalMode(null)} onConfirm={handleSave}
            confirmLabel={modalMode === 'create' ? 'Create Location' : 'Save Changes'}
            saving={saving} />
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BATCH tab
// ─────────────────────────────────────────────────────────────────────────────

const BatchTab: FC<{ showToast: (m: string, ok?: boolean) => void }> = ({ showToast }) => {
  const [items,      setItems]      = useState<Batch[]>([]);
  const [materials,  setMaterials]  = useState<{ id: string; material_number: string; name: string; unit_of_measure: string }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalMode,  setModalMode]  = useState<'create' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<Batch | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const [fNum,     setFNum]     = useState('');
  const [fMat,     setFMat]     = useState('');
  const [fQty,     setFQty]     = useState('0');
  const [fUom,     setFUom]     = useState('kg');
  const [fStatus,  setFStatus]  = useState<BatchStatus>('active');
  const [fMfgDate, setFMfgDate] = useState('');
  const [fExpDate, setFExpDate] = useState('');
  const [fNotes,   setFNotes]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [bs, ms] = await Promise.all([
        fetchBatches({ status: statusFilter as BatchStatus || undefined }),
        fetchMaterials({ limit: 200 }),
      ]);
      setItems(bs);
      setMaterials(ms.map(m => ({ id: m.id, material_number: m.material_number,
        name: m.name, unit_of_measure: m.unit_of_measure })));
    } catch { showToast('Failed to load batches.', false); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFNum(''); setFMat(materials[0]?.id ?? '');
    setFQty('0'); setFUom('kg'); setFStatus('active');
    setFMfgDate(''); setFExpDate(''); setFNotes('');
    setModalMode('create');
  };

  const openEdit = (b: Batch) => {
    setEditing(b);
    setFNum(b.batch_number); setFMat(b.material_id);
    setFQty(String(b.quantity)); setFUom(b.unit_of_measure);
    setFStatus(b.status as BatchStatus);
    setFMfgDate(b.manufactured_date); setFExpDate(b.expiry_date); setFNotes(b.notes);
    setModalMode('edit');
  };

  const handleSave = async () => {
    if (!fNum.trim() || !fMat) {
      showToast('Batch number and material are required.', false); return;
    }
    setSaving(true);
    try {
      const body = { batch_number: fNum.trim(), material_id: fMat,
        quantity: parseFloat(fQty) || 0, unit_of_measure: fUom,
        status: fStatus, manufactured_date: fMfgDate,
        expiry_date: fExpDate, notes: fNotes };
      if (modalMode === 'create') {
        const b = await createBatch(body);
        setItems(prev => [b, ...prev]);
        showToast(`Batch "${b.batch_number}" created ✓`);
      } else if (editing) {
        const b = await updateBatch(editing.id, body);
        setItems(prev => prev.map(x => x.id === b.id ? b : x));
        showToast('Batch updated ✓');
      }
      setModalMode(null);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Save failed.', false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Delete batch "${num}"?`)) return;
    setDeleting(id);
    try {
      await deleteBatch(id);
      setItems(prev => prev.filter(x => x.id !== id));
      showToast('Batch deleted.');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Delete failed.', false);
    } finally { setDeleting(null); }
  };

  const STATUSES: BatchStatus[] = ['active','quarantine','released','expired','consumed','rejected'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ ...field, width: 160, flex: 'none' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{BATCH_STATUS_META[s].label}</option>)}
        </select>
        <button onClick={load}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            background: '#1e293b', border: '1px solid #334155', color: '#64748b',
            fontFamily: 'inherit' }}>↻</button>
        <button onClick={openCreate}
          style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, fontSize: 12,
            cursor: 'pointer', background: '#10b98122', border: '1px solid #10b98144',
            color: '#6ee7b7', fontFamily: 'inherit', fontWeight: 700 }}>+ New Batch</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading
          ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Loading…</div>
          : items.length === 0
            ? <Empty icon="◈" label="No batches" sub="Create a batch linked to a material."
                onNew={openCreate} btnLabel="+ New Batch" />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Batch No.','Material','Qty','Status','Mfg Date','Expiry',''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px',
                        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(b => {
                    const sm = BATCH_STATUS_META[b.status as BatchStatus];
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #0f172a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0',
                          fontFamily: 'monospace', fontWeight: 600 }}>{b.batch_number}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ color: '#e2e8f0', fontSize: 11 }}>{b.material_name}</div>
                          <div style={{ color: '#475569', fontSize: 10,
                            fontFamily: 'monospace' }}>{b.material_number}</div>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8',
                          fontFamily: 'monospace' }}>
                          {b.quantity} {b.unit_of_measure}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge label={sm.label} color={sm.color} bg={sm.bg} border={sm.border} />
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b',
                          fontSize: 11 }}>{b.manufactured_date || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b',
                          fontSize: 11 }}>{b.expiry_date || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(b)}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#3b82f622',
                                border: '1px solid #3b82f644', color: '#93c5fd',
                                fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => handleDelete(b.id, b.batch_number)}
                              disabled={deleting === b.id}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#7f1d1d22',
                                border: '1px solid #ef444444', color: '#f87171',
                                fontFamily: 'inherit', opacity: deleting === b.id ? 0.5 : 1 }}>
                              {deleting === b.id ? '…' : '✕'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>

      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Batch' : 'Edit Batch'}
          subtitle="Batch Master" onClose={() => setModalMode(null)}>
          <Field label="Batch Number" required>
            <input value={fNum} onChange={e => setFNum(e.target.value)}
              placeholder="BAT-2024-00042" style={field} />
          </Field>
          <Field label="Material" required>
            <select value={fMat} onChange={e => {
              setFMat(e.target.value);
              const m = materials.find(x => x.id === e.target.value);
              if (m) setFUom(m.unit_of_measure);
            }} style={field}>
              <option value="">— select material —</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.material_number} — {m.name}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="Quantity">
              <input type="number" value={fQty} onChange={e => setFQty(e.target.value)}
                min="0" step="0.001" style={field} />
            </Field>
            <Field label="UoM">
              <select value={fUom} onChange={e => setFUom(e.target.value)} style={field}>
                {UNITS_OF_MEASURE.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status">
            <select value={fStatus} onChange={e => setFStatus(e.target.value as BatchStatus)} style={field}>
              {STATUSES.map(s => <option key={s} value={s}>{BATCH_STATUS_META[s].label}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Manufactured Date">
              <input type="date" value={fMfgDate} onChange={e => setFMfgDate(e.target.value)}
                style={{ ...field, colorScheme: 'dark' }} />
            </Field>
            <Field label="Expiry Date">
              <input type="date" value={fExpDate} onChange={e => setFExpDate(e.target.value)}
                style={{ ...field, colorScheme: 'dark' }} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={fNotes} onChange={e => setFNotes(e.target.value)}
              rows={2} style={{ ...field, resize: 'vertical' }} />
          </Field>
          <ModalActions onCancel={() => setModalMode(null)} onConfirm={handleSave}
            confirmLabel={modalMode === 'create' ? 'Create Batch' : 'Save Changes'}
            saving={saving} />
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLING UNIT tab
// ─────────────────────────────────────────────────────────────────────────────

const HandlingUnitTab: FC<{ showToast: (m: string, ok?: boolean) => void }> = ({ showToast }) => {
  const [items,      setItems]      = useState<HandlingUnit[]>([]);
  const [batches,    setBatches]    = useState<{ id: string; batch_number: string; unit_of_measure: string }[]>([]);
  const [locations,  setLocations]  = useState<{ id: string; location_code: string; name: string }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalMode,  setModalMode]  = useState<'create' | 'edit' | null>(null);
  const [editing,    setEditing]    = useState<HandlingUnit | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const [fNum,   setFNum]   = useState('');
  const [fDesc,  setFDesc]  = useState('');
  const [fType,  setFType]  = useState<HuType>('pallet');
  const [fStat,  setFStat]  = useState<HuStatus>('empty');
  const [fBatch, setFBatch] = useState('');
  const [fQty,   setFQty]   = useState('0');
  const [fUom,   setFUom]   = useState('kg');
  const [fLoc,   setFLoc]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [hs, bs, ls] = await Promise.all([
        fetchHandlingUnits({ status: statusFilter as HuStatus || undefined }),
        fetchBatches({ limit: 200 }),
        fetchLocations({ limit: 200 }),
      ]);
      setItems(hs);
      setBatches(bs.map(b => ({ id: b.id, batch_number: b.batch_number,
        unit_of_measure: b.unit_of_measure })));
      setLocations(ls.map(l => ({ id: l.id, location_code: l.location_code, name: l.name })));
    } catch { showToast('Failed to load handling units.', false); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFNum(''); setFDesc(''); setFType('pallet'); setFStat('empty');
    setFBatch(''); setFQty('0'); setFUom('kg'); setFLoc('');
    setModalMode('create');
  };

  const openEdit = (h: HandlingUnit) => {
    setEditing(h);
    setFNum(h.hu_number); setFDesc(h.description);
    setFType(h.hu_type as HuType); setFStat(h.status as HuStatus);
    setFBatch(h.batch_id ?? ''); setFQty(String(h.quantity));
    setFUom(h.unit_of_measure); setFLoc(h.location_id ?? '');
    setModalMode('edit');
  };

  const handleSave = async () => {
    if (!fNum.trim()) { showToast('HU number is required.', false); return; }
    setSaving(true);
    try {
      const body = { hu_number: fNum.trim(), description: fDesc.trim(),
        hu_type: fType, status: fStat,
        batch_id: fBatch || null, quantity: parseFloat(fQty) || 0,
        unit_of_measure: fUom, location_id: fLoc || null };
      if (modalMode === 'create') {
        const h = await createHandlingUnit(body);
        setItems(prev => [h, ...prev]);
        showToast(`HU "${h.hu_number}" created ✓`);
      } else if (editing) {
        const h = await updateHandlingUnit(editing.id, body);
        setItems(prev => prev.map(x => x.id === h.id ? h : x));
        showToast('Handling unit updated ✓');
      }
      setModalMode(null);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Save failed.', false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!window.confirm(`Delete handling unit "${num}"?`)) return;
    setDeleting(id);
    try {
      await deleteHandlingUnit(id);
      setItems(prev => prev.filter(x => x.id !== id));
      showToast('Handling unit deleted.');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Delete failed.', false);
    } finally { setDeleting(null); }
  };

  const HU_TYPES: HuType[] = ['pallet','container','box','drum','ibc','sack','other'];
  const HU_STATUSES: HuStatus[] = ['empty','partial','full','sealed','damaged','disposed'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ ...field, width: 160, flex: 'none' }}>
          <option value="">All Statuses</option>
          {HU_STATUSES.map(s => <option key={s} value={s}>{HU_STATUS_META[s].label}</option>)}
        </select>
        <button onClick={load}
          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            background: '#1e293b', border: '1px solid #334155', color: '#64748b',
            fontFamily: 'inherit' }}>↻</button>
        <button onClick={openCreate}
          style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, fontSize: 12,
            cursor: 'pointer', background: '#10b98122', border: '1px solid #10b98144',
            color: '#6ee7b7', fontFamily: 'inherit', fontWeight: 700 }}>+ New HU</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading
          ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Loading…</div>
          : items.length === 0
            ? <Empty icon="▦" label="No handling units" sub="Register a pallet, drum or container."
                onNew={openCreate} btnLabel="+ New HU" />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['HU Number','Type','Status','Batch','Qty','Location',''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px',
                        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(h => {
                    const ss = HU_STATUS_META[h.status as HuStatus];
                    const tm = HU_TYPE_META[h.hu_type as HuType];
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid #0f172a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0',
                          fontFamily: 'monospace', fontWeight: 600 }}>{h.hu_number}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 11 }}>
                          {tm?.icon} {tm?.label ?? h.hu_type}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Badge label={ss.label} color={ss.color} bg={ss.bg} border={ss.border} />
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b',
                          fontFamily: 'monospace', fontSize: 11 }}>
                          {h.batch_number || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8',
                          fontFamily: 'monospace', fontSize: 11 }}>
                          {h.quantity > 0 ? `${h.quantity} ${h.unit_of_measure}` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b',
                          fontFamily: 'monospace', fontSize: 11 }}>
                          {h.location_code || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(h)}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#3b82f622',
                                border: '1px solid #3b82f644', color: '#93c5fd',
                                fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => handleDelete(h.id, h.hu_number)}
                              disabled={deleting === h.id}
                              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                cursor: 'pointer', background: '#7f1d1d22',
                                border: '1px solid #ef444444', color: '#f87171',
                                fontFamily: 'inherit', opacity: deleting === h.id ? 0.5 : 1 }}>
                              {deleting === h.id ? '…' : '✕'}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>

      {modalMode && (
        <Modal title={modalMode === 'create' ? 'New Handling Unit' : 'Edit Handling Unit'}
          subtitle="Handling Unit Master" onClose={() => setModalMode(null)}>
          <Field label="HU Number" required>
            <input value={fNum} onChange={e => setFNum(e.target.value)}
              placeholder="HU-00000123" style={field} />
          </Field>
          <Field label="Description">
            <input value={fDesc} onChange={e => setFDesc(e.target.value)}
              placeholder="Optional description" style={field} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="HU Type">
              <select value={fType} onChange={e => setFType(e.target.value as HuType)} style={field}>
                {HU_TYPES.map(t => (
                  <option key={t} value={t}>{HU_TYPE_META[t].icon} {HU_TYPE_META[t].label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={fStat} onChange={e => setFStat(e.target.value as HuStatus)} style={field}>
                {HU_STATUSES.map(s => <option key={s} value={s}>{HU_STATUS_META[s].label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Batch (optional)">
            <select value={fBatch} onChange={e => {
              setFBatch(e.target.value);
              const b = batches.find(x => x.id === e.target.value);
              if (b) setFUom(b.unit_of_measure);
            }} style={field}>
              <option value="">— no batch —</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="Quantity">
              <input type="number" value={fQty} onChange={e => setFQty(e.target.value)}
                min="0" step="0.001" style={field} />
            </Field>
            <Field label="UoM">
              <select value={fUom} onChange={e => setFUom(e.target.value)} style={field}>
                {UNITS_OF_MEASURE.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Location (optional)">
            <select value={fLoc} onChange={e => setFLoc(e.target.value)} style={field}>
              <option value="">— no location —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.location_code} — {l.name}</option>
              ))}
            </select>
          </Field>
          <ModalActions onCancel={() => setModalMode(null)} onConfirm={handleSave}
            confirmLabel={modalMode === 'create' ? 'Create HU' : 'Save Changes'}
            saving={saving} />
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'material' | 'location' | 'batch' | 'hu';

const TABS: { id: TabId; label: string; icon: string; description: string }[] = [
  { id: 'material', label: 'Materials',       icon: '⬡', description: 'Material master catalogue' },
  { id: 'location', label: 'Locations',       icon: '◈', description: 'Warehouse & plant locations' },
  { id: 'batch',    label: 'Batches',         icon: '◎', description: 'Production lots & batches' },
  { id: 'hu',       label: 'Handling Units',  icon: '▦', description: 'Pallets, drums, containers' },
];

const MasterDataPage: FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('material');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0f1c', color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono', 'Fira Code', monospace", overflow: 'hidden' }}>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Sub-header */}
      <div style={{ padding: '14px 28px 0', background: '#0f172a',
        borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#475569', marginBottom: 2 }}>Master Data Management</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>
            {TABS.find(t => t.id === activeTab)?.description}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 18px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  color: isActive ? '#e2e8f0' : '#475569',
                  letterSpacing: '0.04em',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: -1,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#94a3b8'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#475569'; }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex',
        flexDirection: 'column', padding: '20px 28px' }}>
        {activeTab === 'material' && <MaterialTab  showToast={showToast} />}
        {activeTab === 'location' && <LocationTab  showToast={showToast} />}
        {activeTab === 'batch'    && <BatchTab     showToast={showToast} />}
        {activeTab === 'hu'       && <HandlingUnitTab showToast={showToast} />}
      </div>
    </div>
  );
};

export default MasterDataPage;
