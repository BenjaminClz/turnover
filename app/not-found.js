export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1F1A', color: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Turnover" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, textTransform: 'uppercase' }}>TURNOVER</span>
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#D4FF3F', marginBottom: 8 }}>404</div>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Cette page n'existe pas</h1>
        <p style={{ fontSize: 14.5, color: '#A4B0A6', lineHeight: 1.6, marginBottom: 24 }}>
          Le lien est peut-être expiré, ou l'adresse a été mal saisie.
        </p>
        <a href="/app" style={{ display: 'inline-block', background: '#D4FF3F', color: '#0B1F1A', padding: '13px 26px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
