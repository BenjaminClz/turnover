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
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
        <h3 style={{ fontSize: 17, marginBottom: 10, color: '#F5F0E6' }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#A4B0A6', marginBottom: 22, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="tv-btn" onClick={onConfirm} style={{ background: '#FF6B6B', color: '#0B1F1A', border: 'none', padding: '11px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', flex: 1 }}>
            {confirmLabel}
          </button>
          <button className="tv-btn" onClick={onCancel} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
