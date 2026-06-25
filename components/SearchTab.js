'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS } from '@/lib/constants';
import { EmptyState, GhostButton } from '@/components/ui';

export default function SearchTab({ user, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const [needs, setNeeds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchSport, setSearchSport] = useState('Tous');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: n }, { data: p }] = await Promise.all([
        supabase.from('club_needs').select('*').order('created_at', { ascending: false }),
        supabase.from('player_listings').select('*, profiles(nom)').order('created_at', { ascending: false }),
      ]);
      setNeeds(n || []);
      setPlayers(p || []);
      setLoading(false);
    })();
  }, []);

  const filteredNeeds = searchSport === 'Tous' ? needs : needs.filter((n) => n.sport === searchSport);
  const filteredPlayers = searchSport === 'Tous' ? players : players.filter((p) => p.sport === searchSport);

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 10 }}>Rechercher</h1>
      <p style={{ color: '#8C9A8E', marginBottom: 24, maxWidth: 480 }}>Tous les profils et besoins publiés, filtrables par sport.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {['Tous', ...SPORTS].map((s) => (
          <button key={s} onClick={() => setSearchSport(s)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (searchSport === s ? '#D4FF3F' : '#274238'), background: searchSport === s ? 'rgba(212,255,63,0.12)' : 'transparent', color: searchSport === s ? '#D4FF3F' : '#8C9A8E' }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h2 style={{ fontSize: 14, color: '#D4FF3F', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Besoins clubs ({filteredNeeds.length})</h2>
            {filteredNeeds.length === 0 ? <EmptyState icon="📋" title="Rien ici" sub="Aucun résultat pour ce sport." /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredNeeds.map((n) => (
                  <div key={n.id} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{n.club}</div>
                      <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 2 }}>{n.poste} · {n.niveau} · {n.ville}</div>
                    </div>
                    {n.owner_id !== user.id && <button onClick={() => onContact(n.owner_id, n.club, `${n.poste} · ${n.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Contacter</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 14, color: '#D4FF3F', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profils joueurs ({filteredPlayers.length})</h2>
            {filteredPlayers.length === 0 ? <EmptyState icon="👤" title="Rien ici" sub="Aucun résultat pour ce sport." /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredPlayers.map((p) => (
                  <div key={p.id} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.profiles?.nom}</div>
                      <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 2 }}>{p.poste} · {p.niveau} · {p.ville}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <GhostButton onClick={() => onViewGallery(p.owner_id, p.profiles?.nom)} style={{ fontSize: 11 }}>Galerie</GhostButton>
                      {p.owner_id !== user.id && <button onClick={() => onContact(p.owner_id, p.profiles?.nom, `${p.poste} · ${p.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Contacter</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
