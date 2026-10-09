'use client';
import { posteDemandeAuPied } from '@/lib/postes';

export function PiedFortSelect({ sport, poste, value, onChange }) {
  if (!posteDemandeAuPied(sport, poste)) return null;

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--muted)' }}>
        Pied fort
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        {['gauche', 'droit', 'ambidextre'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: value === option ? '1.5px solid var(--lime)' : '1px solid var(--line)',
              background: value === option ? 'var(--lime)' : 'transparent',
              color: value === option ? 'var(--bg)' : 'var(--muted)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PiedFortSelect;
