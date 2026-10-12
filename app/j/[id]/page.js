import { nationalites } from '@/lib/nationalites';
import { PUBLIC_CSS, Icon, Section, PublicHeader, PhotoGrid, CtaBar, publicUrl, initials, supaGet, fetchGallery } from '@/lib/publicPage';

const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

async function fetchPlayer(id) {
  const rows = await supaGet(`public_player_profiles?id=eq.${encodeURIComponent(id)}&select=*`);
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

const STATS = [
  ['stat_vitesse', 'Vitesse'], ['stat_attaque', 'Attaque'], ['stat_defense', 'Défense'], ['stat_technique', 'Technique'],
  ['stat_vision', 'Vision de jeu'], ['stat_combat', 'Combat'], ['stat_physique', 'Physique'],
];

export default async function PublicPlayerPage({ params }) {
  const player = await fetchPlayer(params.id);

  if (!player) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Ce profil n'est plus disponible.</p>
        <a href="/" className="tv-b tv-b-primary">Découvrir Turnover</a>
      </div>
    );
  }

  const gallery = await fetchGallery(player.owner_id);
  const avatar = publicUrl('avatars', player.avatar_path);
  const prenom = player.nom?.split(' ')[0] || 'ce joueur';
  const stats = STATS.filter(([k]) => player[k] != null).map(([k, l]) => [l, Math.max(0, Math.min(100, Number(player[k]) || 0))]);
  const overall = stats.length ? Math.round(stats.reduce((s, [, v]) => s + v, 0) / stats.length) : null;

  const pills = [
    player.taille_cm && `${player.taille_cm} cm`,
    player.poids_kg && `${player.poids_kg} kg`,
    player.pied_fort && `Pied ${String(player.pied_fort).toLowerCase()}`,
    player.annees_pratique != null && `${player.annees_pratique} ans de pratique`,
    player.nationalites?.length > 0 && player.nationalites.map(nomNationalite).join(' · '),
  ].filter(Boolean);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PUBLIC_CSS }} />

      <PublicHeader />

      <main className="pj-wrap">
        {/* En-tête */}
        <div className="pj-head">
          {avatar ? (
            <img className="pj-avatar" src={avatar} alt={player.nom} />
          ) : (
            <div className="pj-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-lime)', fontSize: 40, fontWeight: 800 }}>
              {initials(player.nom)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Profil joueur</div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 700 }}>{player.nom}</h1>
            <p style={{ fontSize: 17, color: 'var(--text-2)', marginTop: 6 }}>
              {[player.poste, player.sport, player.niveau].filter(Boolean).join(' · ')}
            </p>
            <div className="pj-pills pj-pills-head">
              {player.dispo && <span className="pj-pill pj-pill-lime"><span style={{ width: 7, height: 7, borderRadius: 9, background: 'var(--lime)' }} />{player.dispo}</span>}
              {player.ville && <span className="pj-pill"><Icon size={13} />{player.ville}</span>}
            </div>
          </div>
        </div>

        {player.bio && (
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-2)', paddingBottom: 28, maxWidth: 680 }}>{player.bio}</p>
        )}

        {pills.length > 0 && (
          <Section title="Profil">
            <div className="pj-pills" style={{ marginTop: 0 }}>
              {pills.map((p) => <span key={p} className="pj-pill">{p}</span>)}
              {player.dernier_club && (
                <span className="pj-pill">Dernier club : {player.dernier_club}{player.dernier_club_niveau ? ` (${player.dernier_club_niveau})` : ''}</span>
              )}
            </div>
          </Section>
        )}

        {stats.length > 0 && (
          <Section title="Statistiques">
            <div className="tv-panel pj-grid-stats">
              {overall != null && (
                <div style={{ textAlign: 'center', paddingRight: 8 }}>
                  <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--lime)', lineHeight: 1, letterSpacing: '-0.03em' }}>{overall}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 8 }}>Note globale</div>
                </div>
              )}
              <div className="pj-bars">
                {stats.map(([label, v]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--muted)' }}>{label}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 9, background: 'var(--line-soft)' }}>
                      <div style={{ width: `${v}%`, height: 5, borderRadius: 9, background: 'var(--lime)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 10 }}>Auto-évaluation du joueur.</p>
          </Section>
        )}

        {gallery.length > 0 && (
          <Section title={`Photos & vidéos · ${gallery.length}`}>
            <PhotoGrid items={gallery} />
          </Section>
        )}
      </main>

      <CtaBar title={`Intéressé par ${prenom} ?`} subtitle="Crée ton compte club en 2 minutes pour le contacter." label={`Contacter ${prenom}`} />
    </>
  );
}
