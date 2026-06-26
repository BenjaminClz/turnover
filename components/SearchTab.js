'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, URGENCES, ROLE_LABELS } from '@/lib/constants';
import { EmptyState, GhostButton, TextInput, Select, Field, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille, distanceKm } from '@/lib/geo';

const RAYONS = [10, 25, 50, 100, 'Toute la France'];
const STAFF_ROLES = ['sante', 'preparateur', 'entraineur', 'arbitre', 'benevole'];

function staffDetails(l) {
  if (l.role === 'sante') return `${l.specialite || 'Professionnel de santé'}${l.sport ? ' · ' + l.sport : ''}`;
  if (l.role === 'preparateur') return `Préparateur physique${l.sport ? ' · ' + l.sport : ''}`;
  if (l.role === 'entraineur') return `Entraîneur${l.sport ? ' ' + l.sport : ''}${l.niveau ? ' · ' + l.niveau : ''}`;
  if (l.role === 'arbitre') return `Arbitre${l.sport ? ' ' + l.sport : ''}${l.niveau ? ' · ' + l.niveau : ''}`;
  if (l.role === 'benevole') return l.type_mission || 'Bénévole';
  return '';
}

function needDetails(n) {
  if (n.besoin_type === 'joueur' || !n.besoin_type) return `${n.poste || ''} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'sante') return `${n.specialite || 'Professionnel de santé'}${n.sport ? ' · ' + n.sport : ''}`;
  if (n.besoin_type === 'preparateur') return `Préparateur physique${n.sport ? ' · ' + n.sport : ''}`;
  if (n.besoin_type === 'entraineur') return `Entraîneur${n.sport ? ' ' + n.sport : ''}${n.niveau ? ' · ' + n.niveau : ''}`;
  if (n.besoin_type === 'arbitre') return `Arbitre${n.sport ? ' ' + n.sport : ''}${n.niveau ? ' · ' + n.niveau : ''}`;
  if (n.besoin_type === 'benevole') return n.type_mission || 'Bénévole';
  return '';
}

export default function SearchTab({ user, viewerRole, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const isClub = viewerRole === 'club';
  const [needs, setNeeds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchCategory, setSearchCategory] = useState(isClub ? 'Tous' : 'club'); // Tous | Joueurs | Clubs | un rôle staff
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
      if (isClub) {
        const [{ data: n }, { data: p }, { data: s }] = await Promise.all([
          supabase.from('club_needs').select('*').order('created_at', { ascending: false }),
          supabase.from('player_listings').select('*, profiles(nom)').order('created_at', { ascending: false }),
          supabase.from('staff_listings').select('*, profiles(nom)').order('created_at', { ascending: false }),
        ]);
        setNeeds(n || []);
        setPlayers(p || []);
        setStaff(s || []);
      } else {
        // Un non-club ne doit voir que les besoins clubs
        const { data: n } = await supabase.from('club_needs').select('*').order('created_at', { ascending: false });
        setNeeds(n || []);
      }
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

  const applyCommonFilters = (list) => {
    let out = withDistance(list);
    if (searchSport !== 'Tous') out = out.filter((it) => it.sport === searchSport);
    if (originCoords && rayon !== 'Toute la France') out = out.filter((it) => it._distance != null && it._distance <= rayon);
    if (originCoords) out = out.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
    return out;
  };

  const filteredNeeds = applyCommonFilters(
    (searchNiveau !== 'Tous' ? needs.filter((n) => n.niveau === searchNiveau) : needs)
      .filter((n) => searchUrgence === 'Tous' || n.urgence === searchUrgence)
  );
  const filteredPlayers = applyCommonFilters(searchNiveau !== 'Tous' ? players.filter((p) => p.niveau === searchNiveau) : players);
  const filteredStaff = applyCommonFilters(staff);

  const showNeeds = searchCategory === 'Tous' || searchCategory === 'club';
  const showPlayers = searchCategory === 'Tous' || searchCategory === 'joueur';
  const showStaffRoles = searchCategory === 'Tous' ? STAFF_ROLES : (STAFF_ROLES.includes(searchCategory) ? [searchCategory] : []);

  return (
    <div>
      <PageTitle>Rechercher</PageTitle>
      <PageSubtitle>{isClub ? 'Trouve les profils les plus proches de toi, partout en France.' : 'Trouve les clubs les plus proches de toi, partout en France.'}</PageSubtitle>

      <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
          <Field label="Chercher autour de">
            <TextInput value={villeInput} onChange={(e) => setVilleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLocate(); } }} placeholder="Ta ville (ex. Annemasse, Lyon, Paris…)" />
          </Field>
          <button onClick={handleLocate} disabled={geocodingOrigin} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '14px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', height: 52 }}>
            {geocodingOrigin ? '…' : 'Localiser'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isClub ? 'repeat(2, 1fr)' : '1fr', gap: 14, marginBottom: 18 }}>
          {isClub && (
            <Field label="Catégorie">
              <Select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} options={[
                { value: 'Tous', label: 'Toutes les catégories' },
                { value: 'joueur', label: 'Joueurs' },
                ...STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
              ]} />
            </Field>
          )}
          <Field label="Sport"><Select value={searchSport} onChange={(e) => setSearchSport(e.target.value)} options={['Tous', ...SPORTS]} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 18 }}>
          <Field label="Niveau"><Select value={searchNiveau} onChange={(e) => setSearchNiveau(e.target.value)} options={['Tous', ...NIVEAUX]} /></Field>
          <Field label="Urgence"><Select value={searchUrgence} onChange={(e) => setSearchUrgence(e.target.value)} options={['Tous', ...URGENCES]} /></Field>
        </div>

        {originCoords && (
          <div>
            <div style={{ fontSize: 12.5, color: '#A4B0A6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>Rayon de recherche</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RAYONS.map((r) => (
                <button key={r} onClick={() => setRayon(r)} style={{ padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (rayon === r ? '#D4FF3F' : '#2C4A3D'), background: rayon === r ? 'rgba(212,255,63,0.12)' : 'transparent', color: rayon === r ? '#D4FF3F' : '#A4B0A6' }}>
                  {r === 'Toute la France' ? r : `${r} km`}
                </button>
              ))}
            </div>
          </div>
        )}
        {originCoords && <div style={{ fontSize: 13, color: '#A4B0A6', marginTop: 14 }}>📍 Localisé : {originCoords.label}</div>}
      </div>

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gap: 32 }}>
          {showNeeds && (
            <div>
              <h2 style={{ fontSize: 15, color: '#D4FF3F', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Besoins clubs ({filteredNeeds.length})</h2>
              {filteredNeeds.length === 0 ? <EmptyState icon="📋" title="Rien ici" sub="Aucun résultat pour ces critères." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {filteredNeeds.map((n) => (
                    <ResultRow key={n.id} title={n.club} details={`${needDetails(n)} · ${n.ville}`} distance={n._distance} showContact={n.owner_id !== user.id} onContact={() => onContact(n.owner_id, n.club, needDetails(n))} />
                  ))}
                </div>
              )}
            </div>
          )}

          {showPlayers && (
            <div>
              <h2 style={{ fontSize: 15, color: '#D4FF3F', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Profils joueurs ({filteredPlayers.length})</h2>
              {filteredPlayers.length === 0 ? <EmptyState icon="👤" title="Rien ici" sub="Aucun résultat pour ces critères." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {filteredPlayers.map((p) => (
                    <ResultRow key={p.id} title={p.profiles?.nom} details={`${p.poste} · ${p.niveau} · ${p.ville}`} distance={p._distance} showContact={p.owner_id !== user.id} onContact={() => onContact(p.owner_id, p.profiles?.nom, `${p.poste} · ${p.ville}`)} extra={<GhostButton onClick={() => onViewGallery(p.owner_id, p.profiles?.nom)} style={{ fontSize: 12 }}>Galerie</GhostButton>} />
                  ))}
                </div>
              )}
            </div>
          )}

          {showStaffRoles.map((role) => {
            const list = filteredStaff.filter((s) => s.role === role);
            if (searchCategory === 'Tous' && list.length === 0) return null;
            return (
              <div key={role}>
                <h2 style={{ fontSize: 15, color: '#D4FF3F', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{ROLE_LABELS[role]} ({list.length})</h2>
                {list.length === 0 ? <EmptyState icon="🧑‍⚕️" title="Rien ici" sub="Aucun résultat pour ces critères." /> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {list.map((s) => (
                      <ResultRow key={s.id} title={s.profiles?.nom} details={`${staffDetails(s)} · ${s.ville}`} distance={s._distance} showContact={s.owner_id !== user.id} onContact={() => onContact(s.owner_id, s.profiles?.nom, staffDetails(s))} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultRow({ title, details, distance, showContact, onContact, extra }) {
  return (
    <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: '#A4B0A6', marginTop: 3 }}>
          {details}
          {distance != null && <span style={{ color: '#D4FF3F' }}> · {distance.toFixed(0)} km</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        {extra}
        {showContact && <button onClick={onContact} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Contacter</button>}
      </div>
    </div>
  );
}
