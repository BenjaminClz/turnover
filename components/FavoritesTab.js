'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { PageTitle, PageSubtitle, EmptyState } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import FavoriteButton from '@/components/FavoriteButton';

function staffDetails(l) {
  if (l.role === 'sante') return `${l.specialite || 'Professionnel de santé'}${l.sport ? ' · ' + l.sport : ''}`;
  if (l.role === 'preparateur') return `Préparateur physique${l.sport ? ' · ' + l.sport : ''}`;
  if (l.role === 'entraineur') return `Entraîneur${l.sport ? ' ' + l.sport : ''}${l.niveau ? ' · ' + l.niveau : ''}`;
  if (l.role === 'arbitre') return `Arbitre${l.sport ? ' ' + l.sport : ''}${l.niveau ? ' · ' + l.niveau : ''}`;
  if (l.role === 'benevole') return l.type_mission || 'Bénévole';
  return '';
}

const TABLE_BY_TYPE = {
  player_listing: 'player_listings', staff_listing: 'staff_listings',
  club_need: 'club_needs', player_search: 'player_searches',
};

export default function FavoritesTab({ user, onContact, onViewGallery }) {
  const supabase = createClient();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: favs } = await supabase.from('favorites').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (!favs || favs.length === 0) { setFavorites([]); setLoading(false); return; }

    const byType = {};
    for (const f of favs) (byType[f.target_type] ||= []).push(f.target_id);

    const enriched = [];
    for (const [type, ids] of Object.entries(byType)) {
      const table = TABLE_BY_TYPE[type];
      const selectExtra = type === 'club_need' ? '*' : '*, profiles(nom, avatar_path)';
      const { data } = await supabase.from(table).select(selectExtra).in('id', ids);
      for (const item of data || []) enriched.push({ ...item, _favType: type });
    }
    setFavorites(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const describe = (item) => {
    if (item._favType === 'player_listing' || item._favType === 'player_search') return `${item.poste} · ${item.niveau} · ${item.ville}`;
    if (item._favType === 'club_need') return `${item.club} · ${item.poste || item.specialite || item.type_mission || ''} · ${item.ville}`;
    if (item._favType === 'staff_listing') return `${staffDetails(item)} · ${item.ville}`;
    return '';
  };

  const titleOf = (item) => {
    if (item._favType === 'club_need') return item.club;
    return item.profiles?.nom;
  };

  return (
    <div>
      <PageTitle>Favoris</PageTitle>
      <PageSubtitle>Les profils et annonces que tu as mis de côté.</PageSubtitle>

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : favorites.length === 0 ? (
        <EmptyState icon="🤍" title="Aucun favori pour le moment" sub="Clique sur le cœur depuis une annonce ou un profil pour le retrouver ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {favorites.map((item) => {
            const url = item.profiles?.avatar_path ? avatarUrl(supabase, item.profiles.avatar_path) : null;
            return (
              <div key={`${item._favType}:${item.id}`} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {url && <img src={url} alt="" style={{ width: 42, height: 42, borderRadius: 9, objectFit: 'cover' }} />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{titleOf(item)}</div>
                    <div style={{ fontSize: 13.5, color: '#A4B0A6', marginTop: 2 }}>{describe(item)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FavoriteButton targetType={item._favType} targetId={item.id} ownerId={user.id} />
                  {item.owner_id !== user.id && (
                    <button onClick={() => onContact(item.owner_id, titleOf(item), describe(item))} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Contacter</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
