// Styles et éléments communs aux pages publiques (/j joueur, /c club)
export const PUBLIC_CSS = `
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

const PIN = 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z';

export const Icon = ({ d = PIN, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function Section({ title, children }) {
  return (
    <section style={{ padding: '28px 0', borderTop: '1px solid var(--line-soft)' }}>
      <div className="tv-section-label">{title}</div>
      {children}
    </section>
  );
}

export function PublicHeader() {
  return (
    <header className="pj-top">
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
        <span className="turnover-anton" style={{ fontSize: 22, letterSpacing: '0.02em' }}>TURNOVER</span>
      </a>
      <a href="/" className="tv-b tv-b-secondary tv-b-sm">Se connecter</a>
    </header>
  );
}

export function PhotoGrid({ items }) {
  return (
    <div className="pj-photos">
      {items.map((it) => (
        <a key={it.id} className="pj-photo" href={it.url} target="_blank" rel="noopener noreferrer">
          {it.media_type === 'video'
            ? <video src={`${it.url}#t=0.1`} muted playsInline preload="metadata" />
            : <img src={it.url} alt="" loading="lazy" />}
        </a>
      ))}
    </div>
  );
}

export function CtaBar({ title, subtitle, label, href = '/' }) {
  return (
    <div className="pj-cta-bar">
      <div className="pj-cta-inner">
        <div className="pj-cta-text" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{subtitle}</div>
        </div>
        <a href={href} className="tv-b tv-b-primary tv-b-lg">{label}</a>
      </div>
    </div>
  );
}

// Lecture Supabase côté serveur avec la clé publique (anon)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const publicUrl = (bucket, path) => (path ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` : null);
export const initials = (nom) => (nom || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export async function supaGet(pathAndQuery, revalidate = 600) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchGallery(ownerId) {
  const rows = await supaGet(`gallery_items?owner_id=eq.${ownerId}&select=id,file_path,media_type&order=pinned.desc.nullslast,created_at.desc&limit=12`);
  return (rows || []).map((it) => ({ ...it, url: publicUrl('gallery', it.file_path) }));
}
