'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

const T = {
  card: '#16302a',
  border: '#2C4A3D',
  text: '#eef3ef',
  muted: '#A4B0A6',
  lime: '#D4FF3F',
  rail: 'rgba(255,255,255,0.14)',
};

// En cours d'abord, puis du plus récent au plus ancien
export function sortExperiences(list) {
  return [...list].sort((a, b) => {
    if (!a.end_year && b.end_year) return -1;
    if (a.end_year && !b.end_year) return 1;
    if ((b.end_year || 0) !== (a.end_year || 0)) return (b.end_year || 0) - (a.end_year || 0);
    return b.start_year - a.start_year;
  });
}

export function formatPeriode(e) {
  if (!e.end_year) return `Depuis ${e.start_year}`;
  if (e.start_year === e.end_year) return `${e.start_year}`;
  return `${e.start_year} – ${e.end_year}`;
}

function Pill({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: '3px 10px',
        borderRadius: 999,
        border: `1px solid ${T.border}`,
        color: T.text,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </span>
  );
}

export default function ExperienceTimeline({ userId }) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('player_experiences')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error) setItems(sortExperiences(data || []));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  if (!loaded || items.length === 0) return null;

  return (
    <section
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
        color: T.text,
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Parcours</h3>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((e, i) => {
          const isCurrent = !e.end_year;
          const isLast = i === items.length - 1;
          return (
            <li key={e.id} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    marginTop: 4,
                    borderRadius: '50%',
                    background: isCurrent ? T.lime : 'transparent',
                    border: `2px solid ${isCurrent ? T.lime : T.rail}`,
                    flexShrink: 0,
                  }}
                />
                {!isLast && <span style={{ flex: 1, width: 2, background: T.rail, margin: '4px 0' }} />}
              </div>

              <div style={{ paddingBottom: isLast ? 0 : 20, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{e.club_name}</div>
                <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>{formatPeriode(e)}</div>
                {(e.level || e.position) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {e.level && <Pill>{e.level}</Pill>}
                    {e.position && <Pill>{e.position}</Pill>}
                  </div>
                )}
                {e.description && (
                  <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: T.text, whiteSpace: 'pre-line' }}>
                    {e.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
