'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, URGENCES } from '@/lib/constants';
import { EmptyState, GhostButton, TextInput, Select, Field } from '@/components/ui';
import { geocodeVille, distanceKm } from '@/lib/geo';

const RAYONS = [10, 25, 50, 100, 'Toute la France'];

export default function SearchTab({ user, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const [needs, setNeeds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchSport, setSearchSport] = useState('Tous');
  const [searchNiveau, setSearchNiveau] = useState('Tous');
  const [searchUrgence, setSearchUrgence] = useState('Tous');
  const [villeInput, setVilleInput] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [rayon, setRayon] = useState('Toute la France');
  const [geocodingOrigin, setGeocodingOrigin] = useState(false);

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

  const handleLocate = async () => {
    if (!villeInput.trim()) { setOriginCoords(null); return; }
    setGeocodingOrigin(true);
    const geo = await geocodeVille(villeInput);
    setGeocodingOrigin(false);
    if (!geo) { showToast(`Ville "${villeInput}" non reconnue.`); setOriginCoords(null); return; }
    setOriginCoords(geo);
  };

  const withDistance = (list) => list.map((item) => ({
    ...item,
    _distance: originCoords ? distanceKm(originCoords.latitude, originCoords.longitude, item.latitude, item.longitude) : null,
  }));

  const applyFilters = (list) => {
    let out = withDistance(list);
    if (searchSport !== 'Tous') out = out.filter((it) => it.sport === searchSport);
    if (searchNiveau !== 'Tous') out = out.filter((it) => it.niveau === searchNiveau);
    if (originCoords && rayon !== 'Toute la France') {
      out = out.filter((it) => it._distance != null && it._distance <= rayon);
    }
    if (originCoords) {
      out = out.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
    }
    return out;
  };

  const filteredNeeds = applyFilters(searchUrgence !== 'Tous' ? needs.filter((n) => n.urgence === searchUrgence) : needs);
  const filteredPlayers = applyFilters(players);

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 10 }}>Rechercher</h1>
      <p style={{ color: '#8C9A8E', marginBottom: 24, maxWidth: 520 }}>Trouve les profils et besoins les plus proches de toi, partout en France.</p>

      <div style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 22, marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
          <Field label="Chercher autour de">
            <TextInput
              value={villeInput}
              onChange={(e) => setVilleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLocate(); } }}
              placeholder="Ta ville (ex. Annemasse, Lyon, Paris…)"
            />
          </Field>
          <button onClick={handleLocate} disabled={geocodingOrigin} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 47 }}>
            {geocodingOrigin ? '…' : 'Localiser'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <Field label="Sport"><Select value={searchSport} onChange={(e) => setSearchSport(e.target.value)} options={['Tous', ...SPORTS]} /></Field>
          <Field label="Niveau"><Select value={searchNiveau} onChange={(e) => setSearchNiveau(e.target.value)} options={['Tous', ...NIVEAUX]} /></Field>
          <Field label="Urgence (besoins clubs)"><Select value={searchUrgence} onChange={(e) => setSearchUrgence(e.target.value)} options={['Tous', ...URGENCES]} /></Field>
        </div>

        {originCoords && (
          <div>
            <div style={{ fontSize: 12, color: '#8C9A8E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rayon de recherche</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RAYONS.map((r) => (
                <button key={r} onClick={() => setRayon(r)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (rayon === r ? '#D4FF3F' : '#274238'), background: rayon === r ? 'rgba(212,255,63,0.12)' : 'transparent', color: rayon === r ? '#D4FF3F' : '#8C9A8E' }}>
                  {r === 'Toute la France' ? r : `${r} km`}
                </button>
              ))}
            </div>
          </div>
        )}
        {originCoords && (
          <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 12 }}>📍 Localisé : {originCoords.label}</div>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h2 style={{ fontSize: 14, color: '#D4FF3F', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Besoins clubs ({filteredNeeds.length})</h2>
            {filteredNeeds.length === 0 ? <EmptyState icon="📋" title="Rien ici" sub="Aucun résultat pour ces critères." /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredNeeds.map((n) => (
                  <div key={n.id} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{n.club}</div>
                      <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 2 }}>
                        {n.poste} · {n.niveau} · {n.ville}
                        {n._distance != null && <span style={{ color: '#D4FF3F' }}> · {n._distance.toFixed(0)} km</span>}
                      </div>
                    </div>
                    {n.owner_id !== user.id && <button onClick={() => onContact(n.owner_id, n.club, `${n.poste} · ${n.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Contacter</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 14, color: '#D4FF3F', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profils joueurs ({filteredPlayers.length})</h2>
            {filteredPlayers.length === 0 ? <EmptyState icon="👤" title="Rien ici" sub="Aucun résultat pour ces critères." /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredPlayers.map((p) => (
                  <div key={p.id} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.profiles?.nom}</div>
                      <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 2 }}>
                        {p.poste} · {p.niveau} · {p.ville}
                        {p._distance != null && <span style={{ color: '#D4FF3F' }}> · {p._distance.toFixed(0)} km</span>}
                      </div>
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
