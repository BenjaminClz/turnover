'use client';

import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('tv-cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('tv-cookie-consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
      background: 'var(--surface)', borderTop: '1px solid var(--line)',
      padding: '18px 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16, boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, maxWidth: 640 }}>
        Turnover utilise uniquement des cookies strictement nécessaires au fonctionnement du site (connexion,
        préférences). Aucun cookie publicitaire ou de traçage n'est utilisé.{' '}
        <a href="/confidentialite" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>En savoir plus</a>
      </p>
      <button
        onClick={accept}
        style={{ background: 'var(--lime)', color: 'var(--on-lime)', border: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
      >
        J'ai compris
      </button>
    </div>
  );
}
