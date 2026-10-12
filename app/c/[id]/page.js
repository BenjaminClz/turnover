import { PUBLIC_CSS, Icon, Section, PublicHeader, PhotoGrid, CtaBar, publicUrl, initials, supaGet, fetchGallery } from '@/lib/publicPage';
import { describeNeed, needTitle, needSub } from '@/lib/needs';

async function fetchClub(id) {
  const rows = await supaGet(`public_club_profiles?id=eq.${encodeURIComponent(id)}&select=*`);
  return rows?.[0] || null;
}

async function fetchNeeds(id) {
  return (await supaGet(`public_club_needs?owner_id=eq.${encodeURIComponent(id)}&select=*&order=created_at.desc`)) || [];
}

// Ville du club : celle de ses annonces, sinon extraite de l'adresse (« 74000 Annecy » → « Annecy »)
function villeOf(club, needs) {
  const fromNeeds = needs.find((n) => n.ville)?.ville;
  if (fromNeeds) return fromNeeds;
  const parts = (club.adresse || '').split(',').map((x) => x.trim()).filter(Boolean);
  const withZip = parts.find((x) => /^\d{4,5}\s+\S/.test(x));
  if (withZip) return withZip.replace(/^\d{4,5}\s+/, '');
  return parts.length > 1 ? parts[parts.length - 2] : parts[0] || null;
}

export async function generateMetadata({ params }) {
  const club = await fetchClub(params.id);
  if (!club) return { title: 'Club introuvable — Turnover' };
  const needs = await fetchNeeds(params.id);
  const ville = villeOf(club, needs);
  const title = needs.length
    ? `${club.nom} recrute : ${needs.slice(0, 3).map(needTitle).join(', ')}${needs.length > 3 ? '…' : ''} | Turnover`
    : `${club.nom}${ville ? ` — ${ville}` : ''} | Turnover`;
  const description = needs.length
    ? `${club.nom} a ${needs.length} annonce${needs.length > 1 ? 's' : ''} en cours sur Turnover${ville ? ` (${ville})` : ''}. Joueurs, staff, bénévoles : postulez en quelques clics.`
    : `Découvrez ${club.nom} sur Turnover, le marché des transferts du sport amateur.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', url: `/c/${params.id}` },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/c/${params.id}` },
  };
}

const URGENT = 'Dès que possible';

export default async function PublicClubPage({ params }) {
  const club = await fetchClub(params.id);

  if (!club) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Ce club n'est plus disponible.</p>
        <a href="/" className="tv-b tv-b-primary">Découvrir Turnover</a>
      </div>
    );
  }

  const [needs, gallery] = await Promise.all([fetchNeeds(club.id), fetchGallery(club.id)]);
  const avatar = publicUrl('avatars', club.avatar_path);
  const ville = villeOf(club, needs);
  const sports = [...new Set(needs.map((n) => n.sport).filter(Boolean))];
  const infra = Array.isArray(club.infrastructures) ? club.infrastructures : [];
  const mapsHref = club.adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.adresse)}` : null;

  // Données structurées : chaque annonce devient une offre lisible par Google
  const jsonLd = needs.map((n) => ({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `${needTitle(n)} — ${club.nom}`,
    description: n.details || `${club.nom} recherche : ${describeNeed(n) || needTitle(n)}.`,
    datePosted: n.created_at,
    employmentType: 'VOLUNTEER',
    hiringOrganization: { '@type': 'SportsOrganization', name: club.nom },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: n.ville || ville || '', addressCountry: 'FR' } },
  }));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PUBLIC_CSS }} />
      {jsonLd.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <PublicHeader />

      <main className="pj-wrap">
        <div className="pj-head">
          {avatar ? (
            <img className="pj-avatar" src={avatar} alt={club.nom} style={{ background: 'var(--surface)', objectFit: 'contain' }} />
          ) : (
            <div className="pj-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-lime)', fontSize: 40, fontWeight: 800 }}>
              {initials(club.nom)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Club</div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 700 }}>{club.nom}</h1>
            {sports.length > 0 && <p style={{ fontSize: 17, color: 'var(--text-2)', marginTop: 6 }}>{sports.join(' · ')}</p>}
            <div className="pj-pills pj-pills-head">
              {needs.length > 0 && (
                <span className="pj-pill pj-pill-lime">
                  <span style={{ width: 7, height: 7, borderRadius: 9, background: 'var(--lime)' }} />
                  Recrute · {needs.length} annonce{needs.length > 1 ? 's' : ''}
                </span>
              )}
              {ville && (mapsHref
                ? <a className="pj-pill" href={mapsHref} target="_blank" rel="noopener noreferrer"><Icon size={13} />{ville}</a>
                : <span className="pj-pill"><Icon size={13} />{ville}</span>)}
            </div>
          </div>
        </div>

        <Section title={needs.length ? `Annonces en cours · ${needs.length}` : 'Annonces'}>
          {needs.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 15 }}>Ce club n'a pas d'annonce en ligne pour le moment. Suis-le sur Turnover pour être prévenu de ses prochains recrutements.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {needs.map((n) => (
                <article key={n.id} className="tv-panel" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700 }}>{needTitle(n)}</h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
                        {needSub(n) && <span>{needSub(n)}</span>}
                        {n.ville && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon size={13} />{n.ville}</span>}
                        {n.remuneration && <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{n.remuneration}</span>}
                      </div>
                    </div>
                    {n.urgence && (
                      <span className={`pj-pill${n.urgence === URGENT ? ' pj-pill-lime' : ''}`}>{n.urgence}</span>
                    )}
                  </div>
                  {n.details && <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', marginTop: 12, whiteSpace: 'pre-line' }}>{n.details}</p>}
                </article>
              ))}
            </div>
          )}
        </Section>

        {infra.length > 0 && (
          <Section title="Installations">
            <div className="pj-pills" style={{ marginTop: 0 }}>
              {infra.map((i) => <span key={i} className="pj-pill">{i}</span>)}
            </div>
          </Section>
        )}

        {gallery.length > 0 && (
          <Section title={`Photos & vidéos · ${gallery.length}`}>
            <PhotoGrid items={gallery} />
          </Section>
        )}

        {club.adresse && (
          <Section title="Adresse">
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="tv-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}><Icon size={16} />{club.adresse}</span>
              <span style={{ color: 'var(--lime)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Itinéraire ↗</span>
            </a>
          </Section>
        )}
      </main>

      <CtaBar
        title={needs.length ? `Une annonce t'intéresse ?` : `Envie de rejoindre ${club.nom} ?`}
        subtitle="Crée ton profil gratuitement et contacte le club en direct."
        label={needs.length ? 'Postuler' : 'Contacter le club'}
      />
    </>
  );
}
