'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Une erreur est survenue</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Quelque chose s'est mal passé de notre côté. Réessaie, ou reviens un peu plus tard si le problème persiste.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => reset()} style={{ background: 'var(--lime)', color: 'var(--on-lime)', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Réessayer
          </button>
          <a href="/app" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '12px 24px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
