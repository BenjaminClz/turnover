'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export const INFRASTRUCTURES = [
  'Terrain synthétique', 'Terrain en herbe', "Terrain d'entraînement", 'Éclairage nocturne',
  'Tribunes', 'Salle de musculation', 'Vestiaires', 'Douches', 'Salle vidéo',
  'Kinésithérapeute', 'Bain froid', 'Club-house', 'Restauration', 'Hébergement possible',
  'Parking', 'Accès en transports en commun',
];

const T = { card: 'var(--surface-2)', border: 'var(--line)', text: 'var(--text)', muted: 'var(--muted)', lime: 'var(--lime)', dark: 'var(--bg)', danger: 'var(--danger)' };

const chip = (on) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  border: `1.5px solid ${on ? T.lime : T.border}`,
  background: on ? T.lime : 'transparent',
  color: on ? T.dark : T.text,
});

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Édition (espace club) : enregistrement immédiat à chaque clic
export default function ClubFacilitiesEditor({ userId }) {
  const [supabase] = useState(() => createClient());
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('infrastructures').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        setSelected(data?.infrastructures || []);
        setLoading(false);
      });
  }, [supabase, userId]);

  const toggle = async (item) => {
    const prev = selected;
    const next = prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item];
    setSelected(next);
    setError('');
    const { error: dbError } = await supabase.from('profiles').update({ infrastructures: next }).eq('id', userId);
    if (dbError) {
      setSelected(prev);
      setError("La modification n'a pas été enregistrée. Réessaie.");
    }
  };

  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, color: T.text }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Infrastructures</h3>
      <p style={{ margin: '4px 0 16px', fontSize: 14, color: T.muted }}>
        Sélectionne ce dont dispose ton club. Les joueurs le verront sur ta fiche.
      </p>
      {loading ? (
        <p style={{ margin: 0, fontSize: 14, color: T.muted }}>Chargement…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {INFRASTRUCTURES.map((item) => {
            const on = selected.includes(item);
            return (
              <button key={item} type="button" aria-pressed={on} onClick={() => toggle(item)} style={chip(on)}>
                {on && <Check />}
                {item}
              </button>
            );
          })}
        </div>
      )}
      {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: T.danger }}>{error}</p>}
    </section>
  );
}

// Affichage (fiche club) : uniquement ce qui est sélectionné
export function ClubFacilitiesList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, color: T.text }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Infrastructures</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => (
          <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 13, border: `1px solid ${T.border}`, color: T.text }}>
            <span style={{ color: T.lime, display: 'inline-flex' }}><Check /></span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
