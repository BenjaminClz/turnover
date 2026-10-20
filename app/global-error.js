'use client';

import { Icon } from '@/components/icons';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', margin: '0 auto 20px' }}><Icon name="alert" size={22} /></div>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>Une erreur est survenue</h1>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
              Le site a rencontré un problème inattendu. Réessaie dans un instant.
            </p>
            <button className="tv-b tv-b-primary" onClick={() => reset()}>
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
