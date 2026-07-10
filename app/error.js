'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1F1A', color: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Une erreur est survenue</h1>
        <p style={{ fontSize: 14.5, color: '#A4B0A6', lineHeight: 1.6, marginBottom: 24 }}>
          Quelque chose s'est mal passé de notre côté. Réessaie, ou reviens un peu plus tard si le problème persiste.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => reset()} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            Réessayer
          </button>
          <a href="/app" style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '12px 24px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
