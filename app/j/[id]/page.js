import { nationalites } from '@/lib/nationalites';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

const publicUrl = (bucket, path) => (path ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` : null);
const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;
const initials = (nom) => (nom || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

async function fetchPlayer(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_player_profiles?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: HEADERS, next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchGallery(ownerId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gallery_items?owner_id=eq.${ownerId}&select=id,file_path,media_type&order=pinned.desc.nullslast,created_at.desc&limit=12`,
      { headers: HEADERS, next: { revalidate: 600 } }
    );
    if (!res.ok) return [];
    return (await res.json()).map((it) => ({ ...it, url: publicUrl('gallery', it.file_path) }));
  } catch {
    return [];
  }
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

const PIN = 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z';
const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const css = `
.pj-wrap { max-width: 820px; margin: 0 auto; padding: 0 5vw 40px; }
body { padding-bottom: 92px; }
.pj-top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 12px 5vw; background: rgba(11,31,26,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.pj-head { display: flex; gap: 28px; align-items: center; padding: 40px 0 28px; }
.pj-avatar { width: 128px; height: 128px; border-radius: 999px; flex-shrink: 0; object-fit: cover; padding: 3px; background: linear-gradient(135deg, var(--lime), var(--lime-deep)); }
.pj-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.pj-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line); color: var(--text-2); white-space: nowrap; }
.pj-pill-lime { border-color: transparent; background: var(--lime-soft); color: var(--lime); font-weight: 600; }
.pj-grid-stats { display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center; }
.pj-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; }
.pj-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; border-radius: 12px; overflow: hidden; }
.pj-photo { position: relative; aspect-ratio: 1; background: var(--surface); overflow: hidden; display: block; }
.pj-photo img, .pj-photo video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s var(--ease); }
.pj-photo:hover img { transform: scale(1.04); }
.pj-cta-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; padding: 12px 5vw calc(12px + env(safe-area-inset-bottom)); background: rgba(11,31,26,0.94); backdrop-filter: blur(10px); border-top: 1px solid var(--line); }
.pj-cta-inner { max-width: 820px; margin: 0 auto; display: flex; gap: 16px; align-items: center; justify-content: space-between; }
@media (max-width: 640px) {
  .pj-head { flex-direction: column; text-align: center; gap: 18px; padding-top: 28px; }
  .pj-pills-head { justify-content: center; }
  .pj-avatar { width: 112px; height: 112px; }
  .pj-grid-stats { grid-template-columns: 1fr; gap: 20px; }
  .pj-bars { grid-template-columns: 1fr; }
  .pj-cta-text { display: none; }
  .pj-cta-inner .tv-b { width: 100%; }
}
`;

function Section({ title, children }) {
  return (
    <section style={{ padding: '28px 0', borderTop: '1px solid var(--line-soft)' }}>
      <div className="tv-section-label">{title}</div>
      {children}
    </section>
  );
}

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
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="pj-top">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <span className="turnover-anton" style={{ fontSize: 22, letterSpacing: '0.02em' }}>TURNOVER</span>
        </a>
        <a href="/" className="tv-b tv-b-secondary tv-b-sm">Se connecter</a>
      </header>

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
              {player.ville && <span className="pj-pill"><Icon d={PIN} size={13} />{player.ville}</span>}
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
            <div className="pj-photos">
              {gallery.map((it) => (
                <a key={it.id} className="pj-photo" href={it.url} target="_blank" rel="noopener noreferrer">
                  {it.media_type === 'video'
                    ? <video src={`${it.url}#t=0.1`} muted playsInline preload="metadata" />
                    : <img src={it.url} alt="" loading="lazy" />}
                </a>
              ))}
            </div>
          </Section>
        )}
      </main>

      {/* Barre d'action toujours visible */}
      <div className="pj-cta-bar">
        <div className="pj-cta-inner">
          <div className="pj-cta-text" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>Intéressé par {prenom} ?</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Crée ton compte club en 2 minutes pour le contacter.</div>
          </div>
          <a href="/" className="tv-b tv-b-primary tv-b-lg">Contacter {prenom}</a>
        </div>
      </div>
    </>
  );
}
