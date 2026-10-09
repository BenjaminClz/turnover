const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchPlayer(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/public_player_profiles?id=eq.${id}&select=*`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

export async function generateMetadata({ params }) {
  const player = await fetchPlayer(params.id);
  if (!player) return { title: 'Profil introuvable — Turnover' };
  const title = `${player.nom} — ${player.poste} ${player.sport} à ${player.ville} | Turnover`;
  const description = `${player.nom}, ${player.poste} (${player.niveau || 'niveau non précisé'}) basé à ${player.ville}. Profil joueur amateur sur Turnover, le marché des transferts amateurs.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'profile', url: `/j/${params.id}` },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/j/${params.id}` },
  };
}

export default async function PublicPlayerPage({ params }) {
  const player = await fetchPlayer(params.id);

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p>Profil introuvable.</p>
      </div>
    );
  }

  const stats = [
    ['Vitesse', player.stat_vitesse], ['Défense', player.stat_defense], ['Vision de jeu', player.stat_vision],
    ['Technique', player.stat_technique], ['Combat', player.stat_combat], ['Attaque', player.stat_attaque], ['Physique', player.stat_physique],
  ].filter(([, v]) => v != null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'sans-serif', padding: '48px 5vw' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <a href="/" style={{ color: 'var(--lime)', fontSize: 14, textDecoration: 'none', fontWeight: 700 }}>← Turnover</a>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 24, marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, background: 'linear-gradient(135deg,var(--lime),var(--lime-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-lime)', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
            {(player.nom || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 28, margin: 0 }}>{player.nom}</h1>
            <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{player.poste} · {player.sport} · {player.niveau}</p>
            <p style={{ color: 'var(--muted)', margin: '2px 0 0' }}>{player.ville}</p>
          </div>
        </div>

        {stats.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 28 }}>
            {stats.map(([label, val]) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {player.bio && <p style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>{player.bio}</p>}

        <a
          href="/"
          style={{ display: 'inline-block', background: 'var(--lime)', color: 'var(--on-lime)', padding: '14px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}
        >
          Rejoindre Turnover pour contacter {player.nom?.split(' ')[0] || 'ce joueur'}
        </a>
      </div>
    </div>
  );
}
