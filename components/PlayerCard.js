'use client';

const STAT_LABELS = [
  { key: 'stat_vitesse', label: 'VIT' },
  { key: 'stat_defense', label: 'DEF' },
  { key: 'stat_vision', label: 'VIS' },
  { key: 'stat_technique', label: 'TEC' },
  { key: 'stat_combat', label: 'COM' },
  { key: 'stat_attaque', label: 'ATT' },
  { key: 'stat_physique', label: 'PHY' },
];

const POSTE_ABBR = (poste) => {
  if (!poste) return '—';
  const mots = poste.split(' ');
  if (mots.length === 1) return poste.slice(0, 3).toUpperCase();
  return mots.map((m) => m[0]).join('').toUpperCase().slice(0, 3);
};

// Convertit un code pays ISO (ex. "FR") en emoji drapeau, sans dépendance externe.
const flagEmoji = (code) => {
  if (!code || code.length !== 2) return null;
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

export default function PlayerCard({ player, nom, avatarSrc }) {
  const hasStats = STAT_LABELS.some(({ key }) => player?.[key] != null);
  const initials = (nom || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const flag = flagEmoji(player?.nationalites?.[0]);

  return (
    <div style={{
      width: 260, background: 'linear-gradient(160deg,var(--surface),var(--bg))', border: '1px solid var(--line)',
      borderRadius: 16, padding: 20, position: 'relative', boxShadow: 'var(--shadow-pop)',
    }}>
      <div style={{ position: 'absolute', top: 20, left: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)', letterSpacing: '0.05em' }}>{POSTE_ABBR(player?.poste)}</div>
        {flag && <div style={{ fontSize: 20, marginTop: 6 }}>{flag}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 4px' }}>
        {avatarSrc ? (
          <img src={avatarSrc} alt="" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg)' }} />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,var(--lime),var(--lime-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: 'var(--on-lime)', fontSize: 32, border: '3px solid var(--bg)' }}>
            {initials}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', fontFamily: 'Anton, sans-serif', fontSize: 20, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>
        {nom}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        {player?.niveau} · {player?.sport}
      </div>

      {hasStats && (
        <>
          <div style={{ height: 1, background: 'var(--line)', marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px', fontSize: 13 }}>
            {STAT_LABELS.map(({ key, label }) => player?.[key] != null && (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{player[key]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {player?.pied_fort && (
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: 'var(--faint)', textTransform: 'capitalize' }}>
          Pied fort : {player.pied_fort}
        </div>
      )}
    </div>
  );
}
