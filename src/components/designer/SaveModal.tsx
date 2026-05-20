// src/components/designer/SaveModal.tsx
// Modal shown when the supervisor saves an MBR.
// Allows naming and describing the workflow before persisting.

import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';

interface SaveModalProps {
  open: boolean;
  initialName?: string;
  initialDescription?: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (name: string, description: string) => void;
}

const SaveModal: FC<SaveModalProps> = ({
  open, initialName = '', initialDescription = '',
  saving, onClose, onConfirm,
}) => {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDescription);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDesc(initialDescription);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, initialName, initialDescription]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    onConfirm(name.trim(), desc.trim());
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 360, background: '#0f172a',
          border: '1px solid #1e293b', borderRadius: 12,
          zIndex: 50, fontFamily: "'IBM Plex Mono', monospace",
          color: '#e2e8f0', padding: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em' }}>
          Save MBR
        </h3>

        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
          Name <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          ref={nameRef} value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="My MBR"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8,
            background: '#1e293b', border: '1px solid #334155',
            color: '#e2e8f0', fontSize: 13, outline: 'none',
            boxSizing: 'border-box', marginBottom: 14, fontFamily: 'inherit' }}
        />

        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
          Description
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3} placeholder="Optional description…"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8,
            background: '#1e293b', border: '1px solid #334155',
            color: '#e2e8f0', fontSize: 13, outline: 'none',
            boxSizing: 'border-box', resize: 'vertical', marginBottom: 20,
            fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose} disabled={saving}
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: '#1e293b', border: '1px solid #334155', color: '#64748b',
              fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 12,
              cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#1e3a5f' : '#3b82f622',
              border: '1px solid #3b82f666', color: '#93c5fd',
              opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

export default SaveModal;
