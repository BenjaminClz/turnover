'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export default function UserMenu({ nom, roleLabel, onExport, onDeleteRequest, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 10 }}
      >
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', color: '#0B1F1A', fontSize: 12, flexShrink: 0 }}>
          {initials(nom)}
        </div>
        <span style={{ fontSize: 14.5, color: '#F5F0E6', fontWeight: 700 }}>{nom}</span>
        <Badge tone="lime">{roleLabel}</Badge>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A4B0A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 42, right: 0, width: 'min(220px, calc(100vw - 32px))', background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 300, overflow: 'hidden' }}>
          <button
            onClick={() => { setOpen(false); onExport(); }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,255,63,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            style={menuItemStyle}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Exporter mes données
          </button>
          <button
            onClick={() => { setOpen(false); onDeleteRequest(); }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            style={{ ...menuItemStyle, color: '#FF6B6B' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Supprimer mon compte
          </button>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,255,63,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            style={{ ...menuItemStyle, borderTop: '1px solid #2C4A3D' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none',
  color: '#C7CFC8', fontSize: 13.5, fontWeight: 500, padding: '11px 14px', cursor: 'pointer', textAlign: 'left',
};
