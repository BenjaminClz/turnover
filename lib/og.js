// Génération des images d'aperçu (WhatsApp, LinkedIn, iMessage, X…)
// Rendu par next/og (Satori) : seul un sous-ensemble du CSS est supporté,
// et chaque bloc qui a plusieurs enfants doit être en display: flex.

export const OG_SIZE = { width: 1200, height: 630 };

const P = {
  bg: '#0B1F1A', surface: '#0F241E', line: '#24423A', lineSoft: '#1C332A',
  text: '#E8EEE9', text2: '#C3CCC5', muted: '#94A399', faint: '#5C6B5E',
  lime: '#D4FF3F', limeDeep: '#7FB83A', onLime: '#0B1F1A',
};

// Charge une police Google Fonts restreinte aux caractères utilisés.
async function loadFont(family, weight, text) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src) return null;
    const res = await fetch(src[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function loadOgFonts(text) {
  const t = text + 'TURNOVER0123456789·—…%→';
  const [regular, bold, display] = await Promise.all([
    loadFont('Inter', 500, t), loadFont('Inter', 800, t), loadFont('Anton', 400, t),
  ]);
  const fonts = [];
  if (regular) fonts.push({ name: 'Inter', data: regular, weight: 500, style: 'normal' });
  if (bold) fonts.push({ name: 'Inter', data: bold, weight: 800, style: 'normal' });
  if (display) fonts.push({ name: 'Anton', data: display, weight: 400, style: 'normal' });
  return { fonts, hasDisplay: !!display };
}

const initials = (nom) => (nom || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Fond façon terminal : quadrillage discret + halo lime
function Backdrop() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex',
        backgroundImage: `linear-gradient(${P.lineSoft} 1px, transparent 1px), linear-gradient(90deg, ${P.lineSoft} 1px, transparent 1px)`,
        backgroundSize: '60px 60px', opacity: 0.55,
      }} />
      <div style={{
        position: 'absolute', top: -260, right: -200, width: 700, height: 700, display: 'flex',
        borderRadius: 9999, background: 'radial-gradient(circle, rgba(212,255,63,0.16) 0%, rgba(212,255,63,0) 65%)',
      }} />
    </div>
  );
}

function Brand({ hasDisplay }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: P.lime, display: 'flex' }} />
      <div style={{ display: 'flex', fontFamily: hasDisplay ? 'Anton' : 'Inter', fontWeight: hasDisplay ? 400 : 800, fontSize: 30, letterSpacing: 2, color: P.text }}>
        TURNOVER
      </div>
    </div>
  );
}

function Footer({ right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${P.line}`, paddingTop: 24, fontSize: 22, color: P.muted }}>
      <div style={{ display: 'flex' }}>turnover-sport.fr</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: P.lime, fontWeight: 800 }}>
        {right}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={P.lime} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
    </div>
  );
}

const STAT_LABELS = [
  ['stat_vitesse', 'Vitesse'], ['stat_attaque', 'Attaque'], ['stat_defense', 'Défense'], ['stat_technique', 'Technique'],
  ['stat_vision', 'Vision'], ['stat_combat', 'Combat'], ['stat_physique', 'Physique'],
];

export function PlayerOgCard({ player, hasDisplay }) {
  const stats = STAT_LABELS.filter(([k]) => player[k] != null).map(([k, l]) => [l, Math.max(0, Math.min(100, Number(player[k]) || 0))]);
  const overall = stats.length ? Math.round(stats.reduce((s, [, v]) => s + v, 0) / stats.length) : null;
  const subtitle = [player.poste, player.sport, player.niveau].filter(Boolean).join(' · ');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: P.bg, fontFamily: 'Inter', color: P.text }}>
      <Backdrop />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: '56px 64px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand hasDisplay={hasDisplay} />
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, letterSpacing: 3, color: P.muted }}>PROFIL JOUEUR</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
          {/* Identité */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28 }}>
              <div style={{
                width: 132, height: 132, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${P.lime}, ${P.limeDeep})`, color: P.onLime, fontSize: 52, fontWeight: 800,
              }}>
                {initials(player.nom)}
              </div>
              {overall != null && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, color: P.lime, lineHeight: 1 }}>{overall}</div>
                  <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, letterSpacing: 3, color: P.muted, marginTop: 6 }}>NOTE GLOBALE</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', fontSize: player.nom && player.nom.length > 22 ? 56 : 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>
              {player.nom || 'Joueur Turnover'}
            </div>
            {subtitle && <div style={{ display: 'flex', fontSize: 30, color: P.text2, marginTop: 14 }}>{subtitle}</div>}
            {player.ville && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, color: P.muted, marginTop: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 9999, background: P.lime, display: 'flex' }} />
                {player.ville}
              </div>
            )}
          </div>

          {/* Statistiques */}
          {stats.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 400, padding: 28, background: P.surface, border: `1px solid ${P.line}`, borderRadius: 16 }}>
              {stats.slice(0, 6).map(([label, v]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20 }}>
                    <div style={{ display: 'flex', color: P.muted }}>{label}</div>
                    <div style={{ display: 'flex', fontWeight: 800 }}>{v}</div>
                  </div>
                  <div style={{ display: 'flex', height: 6, borderRadius: 9999, background: P.lineSoft }}>
                    <div style={{ display: 'flex', width: `${v}%`, height: 6, borderRadius: 9999, background: P.lime }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Footer right="Voir le profil" />
      </div>
    </div>
  );
}

export function SiteOgCard({ hasDisplay }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: P.bg, fontFamily: 'Inter', color: P.text }}>
      <Backdrop />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: '56px 64px 48px' }}>
        <Brand hasDisplay={hasDisplay} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>Le marché des transferts</div>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: P.lime }}>du sport amateur.</div>
          <div style={{ display: 'flex', fontSize: 30, color: P.text2, marginTop: 28 }}>Joueurs, clubs et staff se trouvent, se suivent et se contactent.</div>
        </div>
        <Footer right="Rejoindre Turnover" />
      </div>
    </div>
  );
}
