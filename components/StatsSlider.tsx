'use client';

const STATS = [
  { key: 'stat_vitesse', label: 'Vitesse' },
  { key: 'stat_defense', label: 'Défense' },
  { key: 'stat_vision', label: 'Vision de jeu' },
  { key: 'stat_technique', label: 'Technique' },
  { key: 'stat_combat', label: 'Combat' },
  { key: 'stat_attaque', label: 'Attaque' },
  { key: 'stat_physique', label: 'Physique' },
];

export function StatsSlider({ stats, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {STATS.map(({ key, label }) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
            <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{stats[key] ?? 50}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={stats[key] ?? 50}
            onChange={(e) => onChange(key, Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--lime)' }}
          />
        </div>
      ))}
    </div>
  );
}

export default StatsSlider;
