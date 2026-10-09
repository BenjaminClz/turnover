'use client';

import { useEffect } from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
        <h3 style={{ fontSize: 18, marginBottom: 10, color: 'var(--text)' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="tv-btn" onClick={onConfirm} style={{ background: 'var(--danger)', color: 'var(--on-lime)', border: 'none', padding: '11px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', flex: 1 }}>
            {confirmLabel}
          </button>
          <button className="tv-btn" onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
