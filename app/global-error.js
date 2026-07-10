'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: '#0B1F1A', color: '#F5F0E6', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>Une erreur est survenue</h1>
            <p style={{ fontSize: 14.5, color: '#A4B0A6', lineHeight: 1.6, marginBottom: 24 }}>
              Le site a rencontré un problème inattendu. Réessaie dans un instant.
            </p>
            <button onClick={() => reset()} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
