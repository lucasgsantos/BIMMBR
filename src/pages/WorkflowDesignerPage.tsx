// src/pages/WorkflowDesignerPage.tsx
// Supervisor view — design MBRs (Master Batch Records) as node graphs.
// Renamed from WorkflowDesigner.tsx; all canvas logic is unchanged.

import {
  DragEvent,
  FC,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorkflow, fetchWorkflow, saveDiagram } from '../api/workflowApi';
import SaveModal from '../components/designer/SaveModal';
import WorkflowListModal from '../components/designer/WorkflowListModal';
import type { NodeType, WorkflowEdge, WorkflowNode } from '../types/workflow';

// ─── Node palette definition ──────────────────────────────────────────────────

interface NodeDef {
  type: NodeType;
  label: string;
  color: string;
  icon: string;
}

const NODE_TYPES: NodeDef[] = [
  { type: 'start',    label: 'Start',    color: '#10b981', icon: '▶' },
  { type: 'process',  label: 'Process',  color: '#3b82f6', icon: '⚙' },
  { type: 'decision', label: 'Decision', color: '#f59e0b', icon: '◆' },
  { type: 'api',      label: 'API Call', color: '#8b5cf6', icon: '⇆' },
  { type: 'data',     label: 'Data',     color: '#06b6d4', icon: '⬡' },
  { type: 'end',      label: 'End',      color: '#ef4444', icon: '■' },
];

const NODE_W = 140;
const NODE_H = 60;

let idCounter = 4;
const nextId = (): string => `node_${idCounter++}`;

// ─── Internal types ───────────────────────────────────────────────────────────

interface SelectionState { type: 'node' | 'edge'; id: string; }
interface DragState      { id: string; ox: number; oy: number; }
interface PanDrag        { ox: number; oy: number; }
interface Point          { x: number; y: number; }

// ─── Arrow component ──────────────────────────────────────────────────────────

interface ArrowProps {
  from: string; to: string; nodes: WorkflowNode[];
  selected: boolean;
  onClick: (e: MouseEvent<SVGGElement>) => void;
  onDelete: () => void;
}

const Arrow: FC<ArrowProps> = ({ from, to, nodes, selected, onClick, onDelete }) => {
  const a = nodes.find((n) => n.id === from);
  const b = nodes.find((n) => n.id === to);
  if (!a || !b) return null;

  const ax = a.x + NODE_W / 2, ay = a.y + NODE_H / 2;
  const bx = b.x + NODE_W / 2, by = b.y + NODE_H / 2;
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;

  const ux = dx / len, uy = dy / len;
  const sx = ax + ux * (NODE_W / 2 + 4), sy = ay + uy * (NODE_H / 2 + 4);
  const ex = bx - ux * (NODE_W / 2 + 14), ey = by - uy * (NODE_H / 2 + 14);
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  const curve = Math.min(80, len * 0.25);
  const cx1 = sx + ux * curve - uy * curve * 0.4, cy1 = sy + uy * curve + ux * curve * 0.4;
  const cx2 = ex - ux * curve + uy * curve * 0.4, cy2 = ey - uy * curve - ux * curve * 0.4;
  const d = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
  const color = selected ? '#3b82f6' : '#94a3b8';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 2.5 : 1.5}
        markerEnd={`url(#arrow-${selected ? 'sel' : 'def'})`}
        strokeDasharray={selected ? '6 3' : undefined}
      />
      {selected && (
        <g
          transform={`translate(${mx},${my})`}
          onClick={(e: MouseEvent<SVGGElement>) => { e.stopPropagation(); onDelete(); }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={10} fill="#ef4444" />
          <text x={0} y={4} textAnchor="middle" fill="white" fontSize={13} fontWeight={700} style={{ userSelect: 'none' }}>
            ×
          </text>
        </g>
      )}
    </g>
  );
};

// ─── WorkflowNodeShape ────────────────────────────────────────────────────────

interface WorkflowNodeShapeProps {
  node: WorkflowNode; selected: boolean; connecting: string | null;
  onMouseDown: (e: MouseEvent<SVGGElement>, id: string) => void;
  onStartConnect: (id: string) => void;
  onEndConnect: (id: string) => void;
  onSelect: (id: string) => void;
  onLabelChange: (label: string) => void;
}

const WorkflowNodeShape: FC<WorkflowNodeShapeProps> = ({
  node, selected, connecting,
  onMouseDown, onStartConnect, onEndConnect, onSelect, onLabelChange,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(node.label);
  const inputRef              = useRef<HTMLInputElement>(null);
  const def = NODE_TYPES.find((t) => t.type === node.type) ?? NODE_TYPES[1];

  useEffect(() => { setDraft(node.label); }, [node.label]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    if (draft.trim()) onLabelChange(draft.trim());
    else setDraft(node.label);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') { setEditing(false); setDraft(node.label); }
  };

  const isDecision = node.type === 'decision';

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      style={{ cursor: connecting ? 'crosshair' : 'grab' }}
      onMouseDown={(e: MouseEvent<SVGGElement>) => { if (!editing) onMouseDown(e, node.id); }}
      onClick={(e: MouseEvent<SVGGElement>) => { e.stopPropagation(); onSelect(node.id); }}
    >
      {isDecision ? (
        <polygon
          points={`${NODE_W / 2},0 ${NODE_W},${NODE_H / 2} ${NODE_W / 2},${NODE_H} 0,${NODE_H / 2}`}
          fill={def.color + '22'}
          stroke={selected ? def.color : def.color + '88'}
          strokeWidth={selected ? 2.5 : 1.5}
        />
      ) : (
        <rect
          width={NODE_W} height={NODE_H}
          rx={node.type === 'start' || node.type === 'end' ? 30 : 10}
          fill={def.color + '18'}
          stroke={selected ? def.color : def.color + '66'}
          strokeWidth={selected ? 2.5 : 1.5}
        />
      )}
      <text x={NODE_W - 6} y={12} textAnchor="end" fill={def.color} fontSize={9} fontWeight={600} opacity={0.7}
        style={{ userSelect: 'none', fontFamily: 'monospace' }}>
        {node.id}
      </text>
      <text x={20} y={NODE_H / 2 + 5} textAnchor="middle" fill={def.color} fontSize={16} style={{ userSelect: 'none' }}>
        {def.icon}
      </text>
      {editing ? (
        <foreignObject x={32} y={NODE_H / 2 - 12} width={NODE_W - 40} height={24}>
          <input
            ref={inputRef} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit} onKeyDown={handleKeyDown}
            style={{ width: '100%', background: 'transparent', border: 'none',
              borderBottom: `1px solid ${def.color}`, color: 'inherit',
              fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
          />
        </foreignObject>
      ) : (
        <text
          x={NODE_W / 2 + 6} y={NODE_H / 2 + 4} textAnchor="middle"
          fill="currentColor" fontSize={12} fontWeight={500}
          style={{ userSelect: 'none' }}
          onDoubleClick={(e: MouseEvent<SVGTextElement>) => { e.stopPropagation(); setEditing(true); }}
        >
          {node.label}
        </text>
      )}
      <circle
        cx={NODE_W / 2} cy={NODE_H} r={7}
        fill={connecting ? def.color + '88' : '#1e293b'}
        stroke={def.color} strokeWidth={1.5}
        style={{ cursor: 'crosshair' }}
        onMouseDown={(e: MouseEvent<SVGCircleElement>) => { e.stopPropagation(); onStartConnect(node.id); }}
        onMouseUp={(e: MouseEvent<SVGCircleElement>) => { e.stopPropagation(); onEndConnect(node.id); }}
      />
      <text x={NODE_W / 2} y={NODE_H + 4} textAnchor="middle" fill={def.color} fontSize={8}
        style={{ userSelect: 'none', pointerEvents: 'none' }}>+</text>
    </g>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface ToastState { msg: string; type: ToastType; }

// ─── Page component ───────────────────────────────────────────────────────────

const WorkflowDesignerPage: FC = () => {
  const navigate = useNavigate();

  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: 'node_1', type: 'start',   label: 'Start',        x: 200, y: 80  },
    { id: 'node_2', type: 'process', label: 'Process data', x: 200, y: 220 },
    { id: 'node_3', type: 'end',     label: 'End',          x: 200, y: 360 },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([
    { id: 'e1', from: 'node_1', to: 'node_2' },
    { id: 'e2', from: 'node_2', to: 'node_3' },
  ]);

  const [selected, setSelected]     = useState<SelectionState | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dragState, setDragState]   = useState<DragState | null>(null);
  const [pan, setPan]               = useState<Point>({ x: 0, y: 0 });
  const [panDrag, setPanDrag]       = useState<PanDrag | null>(null);
  const [mousePos, setMousePos]     = useState<Point>({ x: 0, y: 0 });

  const [workflowId,   setWorkflowId]   = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled MBR');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadPanelOpen, setLoadPanelOpen] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<ToastState | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const showToast = (msg: string, type: ToastType = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveConfirm = async (name: string, description: string) => {
    setSaving(true);
    setSaveModalOpen(false);
    try {
      let id = workflowId;
      if (!id) {
        const created = await createWorkflow(name, description);
        id = created.id;
        setWorkflowId(id);
      }
      setWorkflowName(name);
      setWorkflowDesc(description);
      await saveDiagram(id!, {
        name, description,
        nodes: nodes.map((n) => ({
          canvas_id: n.id, node_type: n.type,
          label: n.label, pos_x: n.x, pos_y: n.y,
        })),
        edges: edges.map((e) => ({
          from_node_canvas_id: e.from,
          to_node_canvas_id: e.to,
          label: '',
        })),
      });
      showToast('MBR saved ✓', 'success');
    } catch {
      showToast('Save failed — check server.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  const handleLoad = async (id: string) => {
    setLoading(true);
    try {
      const wf = await fetchWorkflow(id);
      const loadedNodes: WorkflowNode[] = wf.nodes.map((n) => ({
        id: n.canvas_id, type: n.node_type as NodeType,
        label: n.label, x: n.pos_x, y: n.pos_y,
      }));
      const loadedEdges: WorkflowEdge[] = wf.edges.map((e) => ({
        id: `e${e.id}`, from: e.from_node_canvas_id, to: e.to_node_canvas_id,
      }));
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setWorkflowId(wf.id);
      setWorkflowName(wf.name);
      setWorkflowDesc(wf.description);
      setSelected(null);
      setPan({ x: 0, y: 0 });
      const maxId = loadedNodes.reduce((acc, n) => {
        const num = parseInt(n.id.replace('node_', ''), 10);
        return isNaN(num) ? acc : Math.max(acc, num);
      }, 0);
      idCounter = maxId + 1;
      showToast(`Loaded "${wf.name}" ✓`, 'success');
    } catch {
      showToast('Failed to load workflow.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Canvas ────────────────────────────────────────────────────────────────
  const getSVGPoint = useCallback((e: MouseEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  }, [pan]);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    if (selected.type === 'node') {
      setNodes((ns) => ns.filter((n) => n.id !== selected.id));
      setEdges((es) => es.filter((e) => e.from !== selected.id && e.to !== selected.id));
    } else {
      setEdges((es) => es.filter((e) => e.id !== selected.id));
    }
    setSelected(null);
  }, [selected]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if ((e.key === 'Delete' || e.key === 'Backspace') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected]);

  const handleSVGMouseMove = useCallback((e: MouseEvent<SVGSVGElement>) => {
    const pt = getSVGPoint(e);
    setMousePos(pt);
    if (dragState) {
      setNodes((ns) => ns.map((n) =>
        n.id === dragState.id ? { ...n, x: pt.x - dragState.ox, y: pt.y - dragState.oy } : n));
    }
    if (panDrag) setPan({ x: e.clientX - panDrag.ox, y: e.clientY - panDrag.oy });
  }, [dragState, panDrag, getSVGPoint]);

  const handleSVGMouseUp   = useCallback(() => {
    setDragState(null); setPanDrag(null);
    if (connecting) setConnecting(null);
  }, [connecting]);

  const handleSVGMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    if (target === svgRef.current || target.tagName === 'svg') {
      setSelected(null);
      setPanDrag({ ox: e.clientX - pan.x, oy: e.clientY - pan.y });
    }
  };

  const handleNodeMouseDown = (e: MouseEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    const pt   = getSVGPoint(e as unknown as MouseEvent);
    const node = nodes.find((n) => n.id === id)!;
    setDragState({ id, ox: pt.x - node.x, oy: pt.y - node.y });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as NodeType;
    if (!type) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - pan.x - NODE_W / 2;
    const y = e.clientY - rect.top  - pan.y - NODE_H / 2;
    const def = NODE_TYPES.find((t) => t.type === type)!;
    const id  = nextId();
    setNodes((ns) => [...ns, { id, type, label: def.label, x, y }]);
    setSelected({ type: 'node', id });
  };

  const startConnect = (id: string) => setConnecting(id);
  const endConnect   = (id: string) => {
    if (connecting && connecting !== id) {
      const exists = edges.some((e) => e.from === connecting && e.to === id);
      if (!exists) setEdges((es) => [...es, { id: `e${Date.now()}`, from: connecting, to: id }]);
    }
    setConnecting(null);
  };

  const selectedNode    = selected?.type === 'node' ? nodes.find((n) => n.id === selected.id) ?? null : null;
  const selectedNodeDef = selectedNode ? NODE_TYPES.find((t) => t.type === selectedNode.type)! : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', background: '#0a0f1c',
      fontFamily: "'IBM Plex Mono', monospace", color: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, padding: '10px 20px', borderRadius: 8, fontSize: 13,
          background: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#450a0a' : '#1e293b',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#334155'}`,
          color: toast.type === 'success' ? '#6ee7b7' : toast.type === 'error' ? '#fca5a5' : '#e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      <SaveModal
        open={saveModalOpen} initialName={workflowName} initialDescription={workflowDesc}
        saving={saving} onClose={() => setSaveModalOpen(false)} onConfirm={handleSaveConfirm}
      />
      <WorkflowListModal
        open={loadPanelOpen}
        onClose={() => setLoadPanelOpen(false)}
        onLoad={handleLoad}
      />

      {/* Sidebar */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>

        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#64748b', margin: '0 0 4px' }}>MBR Designer</p>
          {workflowId && (
            <p style={{ fontSize: 11, color: '#10b981', margin: 0, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>
              💾 {workflowName}
            </p>
          )}
        </div>

        {/* Node palette */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.08em', color: '#475569',
            margin: '0 0 8px', textTransform: 'uppercase' }}>Node Types</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NODE_TYPES.map((def) => (
              <div
                key={def.type} draggable
                onDragStart={(e: DragEvent<HTMLDivElement>) => e.dataTransfer.setData('nodeType', def.type)}
                style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, cursor: 'grab',
                  border: `1px solid ${def.color}33`, background: def.color + '0e',
                  transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = def.color + '22')}
                onMouseLeave={(e) => (e.currentTarget.style.background = def.color + '0e')}
              >
                <span style={{ fontSize: 14, color: def.color }}>{def.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>{def.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Properties */}
        {selectedNode && selectedNodeDef && (
          <div style={{ padding: '12px 16px', flex: 1, overflow: 'auto' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.08em', color: '#475569',
              margin: '0 0 10px', textTransform: 'uppercase' }}>Properties</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>ID</label>
                <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '6px 8px',
                  background: '#1e293b', borderRadius: 6, color: selectedNodeDef.color }}>
                  {selectedNode.id}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Label</label>
                <input
                  value={selectedNode.label}
                  onChange={(e) => setNodes((ns) => ns.map((n) =>
                    n.id === selectedNode.id ? { ...n, label: e.target.value } : n))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6,
                    background: '#1e293b', border: `1px solid ${selectedNodeDef.color}44`,
                    color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Type</label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => setNodes((ns) => ns.map((n) =>
                    n.id === selectedNode.id ? { ...n, type: e.target.value as NodeType } : n))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6,
                    background: '#1e293b', border: '1px solid #334155',
                    color: '#e2e8f0', fontSize: 12, outline: 'none' }}
                >
                  {NODE_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Position</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['x', 'y'] as const).map((axis) => (
                    <div key={axis} style={{ flex: 1 }}>
                      <p style={{ fontSize: 10, color: '#475569', margin: '0 0 2px' }}>{axis.toUpperCase()}</p>
                      <input
                        type="number" value={Math.round(selectedNode[axis])}
                        onChange={(e) => setNodes((ns) => ns.map((n) =>
                          n.id === selectedNode.id ? { ...n, [axis]: Number(e.target.value) } : n))}
                        style={{ width: '100%', padding: '5px 6px', borderRadius: 6,
                          background: '#1e293b', border: '1px solid #334155',
                          color: '#e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={deleteSelected}
                style={{ marginTop: 4, padding: '7px 0', borderRadius: 8,
                  background: '#7f1d1d22', border: '1px solid #ef444444',
                  color: '#f87171', fontSize: 12, cursor: 'pointer', width: '100%' }}
              >
                Delete node
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 8 }}>
            <span>{nodes.length} nodes</span>
            <span>{edges.length} connections</span>
          </div>
          <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.7 }}>
            <div>• Drag port (•) to connect</div>
            <div>• Double-click label to rename</div>
            <div>• Delete / Backspace removes</div>
          </div>
        </div>
      </aside>

      {/* Canvas area */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onDrop={handleDrop}
        onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
      >
        {/* Toolbar */}
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10,
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const id = nextId();
              setNodes((ns) => [...ns, { id, type: 'process', label: 'New step', x: 300 - pan.x, y: 200 - pan.y }]);
              setSelected({ type: 'node', id });
            }}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: '#3b82f622', border: '1px solid #3b82f666', color: '#93c5fd' }}
          >+ Node</button>

          <button
            onClick={() => setSaveModalOpen(true)} disabled={saving}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12,
              cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#1e3a5f' : '#10b98122',
              border: '1px solid #10b98166', color: '#6ee7b7', opacity: saving ? 0.7 : 1 }}
          >{saving ? 'Saving…' : '💾 Save MBR'}</button>

          <button
            onClick={() => setLoadPanelOpen(true)} disabled={loading}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: '#8b5cf622', border: '1px solid #8b5cf666', color: '#c4b5fd' }}
          >{loading ? 'Loading…' : '📂 Load MBR'}</button>

          {workflowId && (
            <button
              onClick={() => navigate('/orders')}
              title="Go to Process Orders to create an EBR for this MBR"
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: '#f59e0b22', border: '1px solid #f59e0b66', color: '#fcd34d' }}
            >◈ Create Order</button>
          )}

          <button
            onClick={() => {
              setNodes([]); setEdges([]); setSelected(null);
              setWorkflowId(null); setWorkflowName('Untitled MBR'); setWorkflowDesc('');
            }}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}
          >Clear</button>

          <button
            onClick={() => setPan({ x: 0, y: 0 })}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}
          >Reset pan</button>

          {connecting && (
            <div style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12,
              background: '#f59e0b22', border: '1px solid #f59e0b66', color: '#fbbf24' }}>
              Connecting from <strong>{connecting}</strong> — click target port
            </div>
          )}
        </div>

        {/* SVG canvas */}
        <svg
          ref={svgRef} width="100%" height="100%"
          style={{ background: '#0a0f1c', cursor: panDrag ? 'grabbing' : 'default' }}
          onMouseMove={handleSVGMouseMove} onMouseUp={handleSVGMouseUp}
          onMouseDown={handleSVGMouseDown} onClick={() => setSelected(null)}
        >
          <defs>
            <marker id="arrow-def" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
            <marker id="arrow-sel" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
            <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse" x={pan.x % 40} y={pan.y % 40}>
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth={1}/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          <g transform={`translate(${pan.x},${pan.y})`}>
            {edges.map((edge) => (
              <Arrow
                key={edge.id} from={edge.from} to={edge.to} nodes={nodes}
                selected={selected?.id === edge.id && selected?.type === 'edge'}
                onClick={(e: MouseEvent<SVGGElement>) => { e.stopPropagation(); setSelected({ type: 'edge', id: edge.id }); }}
                onDelete={() => { setEdges((es) => es.filter((ed) => ed.id !== edge.id)); setSelected(null); }}
              />
            ))}
            {connecting && (() => {
              const src = nodes.find((n) => n.id === connecting);
              if (!src) return null;
              return (
                <line
                  x1={src.x + NODE_W / 2} y1={src.y + NODE_H}
                  x2={mousePos.x} y2={mousePos.y}
                  stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3"
                  markerEnd="url(#arrow-sel)"
                />
              );
            })()}
            {nodes.map((node) => (
              <WorkflowNodeShape
                key={node.id} node={node}
                selected={selected?.id === node.id && selected?.type === 'node'}
                connecting={connecting}
                onMouseDown={handleNodeMouseDown}
                onStartConnect={startConnect}
                onEndConnect={endConnect}
                onSelect={(id: string) => setSelected({ type: 'node', id })}
                onLabelChange={(label: string) =>
                  setNodes((ns) => ns.map((n) => n.id === node.id ? { ...n, label } : n))}
              />
            ))}
          </g>
        </svg>

        {nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', color: '#334155' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
              <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>Canvas is empty</p>
              <p style={{ fontSize: 13, margin: 0 }}>Drag nodes from the sidebar or click "+ Node"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowDesignerPage;
