'use client';
import { posteDemandeAuPied } from '@/lib/postes';

export function PiedFortSelect({ sport, poste, value, onChange }) {
  if (!posteDemandeAuPied(sport, poste)) return null;

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#A4B0A6' }}>
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
              border: value === option ? '1.5px solid #D4FF3F' : '1.5px solid #2C4A3D',
              background: value === option ? '#D4FF3F' : 'transparent',
              color: value === option ? '#0B1F1A' : '#A4B0A6',
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
