'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { ClubFacilitiesList } from './ClubFacilities';
import ExperienceTimeline from './ExperienceTimeline';
import { Badge, TextArea } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { avatarUrl } from '@/components/AvatarUpload';
import PlayerCard from '@/components/PlayerCard';
import ProfileMediaGrid from '@/components/ProfileMediaGrid';
import SearchMap from '@/components/SearchMap';
import { geocodeAdresse } from '@/lib/geo';
import { nationalites } from '@/lib/nationalites';

// Palette partagée avec components/ui.js
const C = { bg: '#0B1F1A', panel: '#0F241E', line: '#24423A', soft: '#1A332B', text: '#E8EEE9', muted: '#8FA096', sub: '#C7CFC8', lime: '#D4FF3F', ink: '#0B1F1A' };

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

const STAFF_ROLES = ['sante', 'preparateur', 'entraineur', 'arbitre', 'benevole'];

const lastSeenLabel = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = diffMs / 60000;
  if (mins < 5) return 'En ligne';
  if (mins < 60) return `Actif il y a ${Math.floor(mins)} min`;
  const hrs = mins / 60;
  if (hrs < 24) return `Actif il y a ${Math.floor(hrs)} h`;
  const days = hrs / 24;
  if (days < 14) return `Actif il y a ${Math.floor(days)} j`;
  return null;
};

const calculAge = (dn) => {
  if (!dn) return null;
  const n = new Date(dn), a = new Date();
  let age = a.getFullYear() - n.getFullYear();
  if (a.getMonth() < n.getMonth() || (a.getMonth() === n.getMonth() && a.getDate() < n.getDate())) age--;
  return age;
};

const postTimeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} j`;
};

const join = (...parts) => parts.filter(Boolean).join(', ');

const describeNeed = (n) => {
  if (n.besoin_type === 'joueur' || !n.besoin_type) return join(n.poste, n.niveau);
  if (n.besoin_type === 'sante') return join(n.specialite || 'Pro santé', n.sport);
  if (n.besoin_type === 'preparateur') return join('Prép. physique', n.sport);
  if (n.besoin_type === 'entraineur') return join(n.specialite || 'Entraîneur', n.niveau);
  if (n.besoin_type === 'arbitre') return join('Arbitre', n.niveau);
  if (n.besoin_type === 'benevole') return n.type_mission || 'Bénévole';
  return '';
};

const describeStaff = (s) => {
  if (s.role === 'sante') return join(s.specialite || 'Pro santé', s.sport);
  if (s.role === 'preparateur') return join('Prép. physique', s.sport);
  if (s.role === 'entraineur') return join(s.specialite || 'Entraîneur', s.niveau);
  if (s.role === 'arbitre') return join('Arbitre', s.niveau);
  if (s.role === 'benevole') return s.type_mission || 'Bénévole';
  return ROLE_LABELS[s.role] || '';
};

// Icônes fines (remplacent les emojis)
const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const PIN = 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z';
const BACK = 'M15 18l-6-6 6-6';
const CHECK = 'M20 6 9 17l-5-5';
const CLOSE = 'M18 6 6 18M6 6l12 12';

const css = `
.pp-row { transition: background .12s ease; }
.pp-row:hover { background: ${C.soft}; }
.pp-tab { background: transparent; border: none; border-bottom: 2px solid transparent; color: ${C.muted}; padding: 12px 0; margin-right: 24px; font-size: 14px; font-weight: 500; cursor: pointer; }
.pp-tab:hover { color: ${C.text}; }
.pp-tab[aria-selected="true"] { color: ${C.text}; border-bottom-color: ${C.lime}; }
.pp-stat { background: transparent; border: none; color: inherit; text-align: left; padding: 12px 16px; }
.pp-stat:first-child { border-left: none; padding-left: 0; }
.pp-stat[data-click="1"] { cursor: pointer; }
.pp-stat[data-click="1"]:hover .pp-stat-v { color: ${C.lime}; }
.pp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
@media (max-width: 640px) {
  .pp-head { flex-wrap: wrap; }
  .pp-actions { width: 100%; }
  .pp-actions button { flex: 1; }
  .pp-stat { padding: 10px 12px; }
  .pp-cols { grid-template-columns: 1fr !important; }
}
`;

export default function ProfilePage({ targetUserId, currentUserId, onBack, onContact, showToast }) {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [playerListing, setPlayerListing] = useState(null);
  const [staffListing, setStaffListing] = useState(null);
  const [needs, setNeeds] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [newRecoText, setNewRecoText] = useState('');
  const [submittingReco, setSubmittingReco] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followList, setFollowList] = useState(null); // { type: 'followers'|'following', users: [] }
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [mapCoords, setMapCoords] = useState(null); // coordonnées géocodées depuis l'adresse du club
  const [tab, setTab] = useState('apercu');

  const openFollowList = async (type) => {
    setLoadingFollowList(true);
    setFollowList({ type, users: [] });
    let ids = [];
    if (type === 'followers') {
      const { data } = await supabase.from('follows').select('follower_id').eq('following_id', targetUserId);
      ids = (data || []).map((f) => f.follower_id);
    } else {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', targetUserId);
      ids = (data || []).map((f) => f.following_id);
    }
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, nom, avatar_path, role').in('id', ids);
      setFollowList({ type, users: profiles || [] });
    } else {
      setFollowList({ type, users: [] });
    }
    setLoadingFollowList(false);
  };

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    setTab('apercu');
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
      setProfile(p);
      if (!p) { setLoading(false); return; }

      const [{ data: gallery }, { data: posts }] = await Promise.all([
        supabase.from('gallery_items').select('*').eq('owner_id', targetUserId).order('created_at', { ascending: false }),
        supabase.from('posts').select('*').eq('author_id', targetUserId).order('created_at', { ascending: false }).limit(5),
      ]);
      setGalleryItems((gallery || []).map((it) => ({ ...it, url: supabase.storage.from('gallery').getPublicUrl(it.file_path).data.publicUrl })));
      setRecentPosts(posts || []);

      if (p.role === 'joueur') {
        const [{ data: pl }, { data: recos }] = await Promise.all([
          supabase.from('player_listings').select('*').eq('owner_id', targetUserId).maybeSingle(),
          supabase.from('recommendations').select('*, profiles!recommendations_author_id_fkey(nom)').eq('target_id', targetUserId).order('created_at', { ascending: false }),
        ]);
        setPlayerListing(pl);
        setRecommendations(recos || []);
      } else if (p.role === 'club') {
        const { data: n } = await supabase.from('club_needs').select('*').eq('owner_id', targetUserId).order('created_at', { ascending: false });
        setNeeds(n || []);
      } else if (STAFF_ROLES.includes(p.role)) {
        const { data: sl } = await supabase.from('staff_listings').select('*').eq('owner_id', targetUserId).maybeSingle();
        setStaffListing(sl);
      }

      // Compteurs abonnés/abonnements et statut de suivi
      const [{ count: fwersCount }, { count: fwingCount }, { data: meFollowing }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
        supabase.from('follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', targetUserId).maybeSingle(),
      ]);
      setFollowersCount(fwersCount || 0);
      setFollowingCount(fwingCount || 0);
      setIsFollowing(!!meFollowing);

      setLoading(false);
    })();
  }, [targetUserId]);

  // Géocode l'adresse du club à l'affichage pour que le marqueur corresponde toujours à l'adresse affichée
  useEffect(() => {
    setMapCoords(null);
    if (!profile || profile.role !== 'club' || !profile.adresse) return;
    let annule = false;
    geocodeAdresse(profile.adresse).then((geo) => {
      if (!annule && geo) setMapCoords({ lat: geo.latitude, lng: geo.longitude });
    });
    return () => { annule = true; };
  }, [profile]);

  const toggleFollow = async () => {
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetUserId);
      if (error) { setIsFollowing(true); setFollowersCount((c) => c + 1); }
    } else {
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
      if (error) { setIsFollowing(false); setFollowersCount((c) => c - 1); return; }
      const { data: me } = await supabase.from('profiles').select('nom').eq('id', currentUserId).maybeSingle();
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'nouvel_abonne',
        title: 'Nouvel abonné',
        body: `${me?.nom || 'Quelqu’un'} s’est abonné à ton profil.`,
        link_tab: profile.role,
      });
    }
  };

  const submitRecommendation = async () => {
    if (!newRecoText.trim()) return;
    setSubmittingReco(true);
    await supabase.from('recommendations').insert({ author_id: currentUserId, target_id: targetUserId, content: newRecoText.trim() });
    setSubmittingReco(false);
    setNewRecoText('');
    const { data } = await supabase.from('recommendations').select('*, profiles!recommendations_author_id_fkey(nom)').eq('target_id', targetUserId).order('created_at', { ascending: false });
    setRecommendations(data || []);
  };

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 60 }}>Chargement du profil…</div>;
  if (!profile) return <div style={{ color: C.muted, textAlign: 'center', padding: 60 }}>Profil introuvable.</div>;

  const url = profile.avatar_path ? avatarUrl(supabase, profile.avatar_path) : null;
  const isMe = targetUserId === currentUserId;
  const isPlayer = profile.role === 'joueur';
  const isClub = profile.role === 'club';
  const isStaff = STAFF_ROLES.includes(profile.role);
  const age = isPlayer && playerListing ? calculAge(playerListing.date_naissance) : null;
  const clubLat = mapCoords?.lat ?? profile.latitude;
  const clubLng = mapCoords?.lng ?? profile.longitude;
  const hasLocation = clubLat != null && clubLng != null;
  const seen = lastSeenLabel(profile.last_seen_at);
  const listing = isPlayer ? playerListing : isStaff ? staffListing : null;
  const bio = listing?.bio;

  const subtitle = isPlayer && playerListing ? join(playerListing.poste, playerListing.niveau, age ? `${age} ans` : null)
    : isStaff && staffListing ? describeStaff(staffListing)
    : null;
  const ville = isPlayer || isStaff ? listing?.ville : profile.adresse;

  const contact = () => {
    const context = isPlayer && playerListing ? join(playerListing.poste, playerListing.ville)
      : isClub && needs[0] ? describeNeed(needs[0])
      : isStaff && staffListing ? describeStaff(staffListing) : 'Contact';
    onContact(targetUserId, profile.nom, context);
  };

  // Lignes « clé : valeur » de la colonne Profil
  const facts = [];
  if (isPlayer && playerListing) {
    if (playerListing.ville) facts.push(['Ville', `${playerListing.ville}${playerListing.distance != null ? ` (${playerListing.distance} km)` : ''}`]);
    if (playerListing.taille_cm) facts.push(['Taille', `${playerListing.taille_cm} cm`]);
    if (playerListing.poids_kg) facts.push(['Poids', `${playerListing.poids_kg} kg`]);
    if (playerListing.pied_fort) facts.push(['Pied fort', playerListing.pied_fort]);
    if (playerListing.annees_pratique != null) facts.push(['Pratique', `${playerListing.annees_pratique} ans`]);
    if (playerListing.nationalites?.length > 0) facts.push(['Nationalité', playerListing.nationalites.map(nomNationalite).join(', ')]);
    if (playerListing.dernier_club) facts.push(['Dernier club', join(playerListing.dernier_club, playerListing.dernier_club_niveau)]);
  }
  if (isStaff && staffListing) {
    if (staffListing.ville) facts.push(['Ville', `${staffListing.ville}${staffListing.distance != null ? ` (${staffListing.distance} km)` : ''}`]);
    if (staffListing.diplome) facts.push(['Diplôme', staffListing.diplome]);
    if (staffListing.sport) facts.push(['Sport', staffListing.sport]);
  }

  const tabs = [
    ['apercu', 'Aperçu'],
    ['photos', `Photos${galleryItems.length ? ` ${galleryItems.length}` : ''}`],
    ['actus', 'Actualités'],
    ...(isPlayer ? [['recos', `Recommandations${recommendations.length ? ` ${recommendations.length}` : ''}`]] : []),
  ];

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', color: C.text }}>
      <style>{css}</style>

      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
        <Icon d={BACK} size={16} /> Retour
      </button>

      {/* En-tête */}
      <div className="pp-head" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {url ? (
          <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.line}` }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.soft, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontSize: 20, fontWeight: 600, flexShrink: 0 }}>
            {initials(profile.nom)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{profile.nom}</h1>
            {profile.verified && <span title="Profil vérifié" style={{ color: C.lime, display: 'inline-flex' }}><Icon d={CHECK} size={16} /></span>}
            <Badge>{ROLE_LABELS[profile.role] || profile.role}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 12px', marginTop: 4, fontSize: 13.5, color: C.muted }}>
            {subtitle && <span>{subtitle}</span>}
            {ville && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon d={PIN} size={13} />{ville}</span>}
            {seen && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: seen === 'En ligne' ? C.lime : C.muted }} />{seen}
              </span>
            )}
          </div>
        </div>

        {!isMe && (
          <div className="pp-actions" style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleFollow}
              style={{ background: 'transparent', color: C.text, border: `1px solid ${C.line}`, padding: '9px 16px', borderRadius: 8, fontWeight: 500, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isFollowing ? <><Icon d={CHECK} size={14} />Abonné</> : 'Suivre'}
            </button>
            <button
              onClick={contact}
              style={{ background: C.lime, color: C.ink, border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Contacter
            </button>
          </div>
        )}
      </div>

      {/* Bandeau de chiffres clés */}
      <div className="pp-stats" style={{ marginTop: 20 }}>
        <Stat label="Abonnés" value={followersCount} onClick={() => openFollowList('followers')} />
        <Stat label="Abonnements" value={followingCount} onClick={() => openFollowList('following')} />
        <Stat label="Photos" value={galleryItems.length} onClick={() => setTab('photos')} />
        {isPlayer && <Stat label="Recommandations" value={recommendations.length} onClick={() => setTab('recos')} />}
        {isClub && <Stat label="Annonces" value={needs.length} />}
        {listing?.dispo && (
          <div className="pp-stat">
            <div style={{ fontSize: 11.5, color: C.muted }}>Disponibilité</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 14.5, fontWeight: 500, color: C.lime }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.lime }} />{listing.dispo}
            </div>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div role="tablist" style={{ display: 'flex', overflowX: 'auto', marginBottom: 8 }}>
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="pp-tab" onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{ paddingTop: 20, paddingBottom: 32 }}>
        {tab === 'apercu' && (
          <>
            {bio && <p style={{ fontSize: 14.5, color: C.sub, lineHeight: 1.65, margin: '0 0 20px', maxWidth: 680 }}>{bio}</p>}

            {(isPlayer || isStaff) && (facts.length > 0 || (isPlayer && playerListing)) && (
              <div className="pp-cols" style={{ display: 'grid', gridTemplateColumns: isPlayer && playerListing ? 'minmax(0,1fr) auto' : '1fr', gap: 28, alignItems: 'start', marginBottom: 28 }}>
                {facts.length > 0 && (
                  <div>
                    <SectionTitle>Profil</SectionTitle>
                    {facts.map(([k, v], i) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', fontSize: 14 }}>
                        <span style={{ color: C.muted }}>{k}</span>
                        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isPlayer && playerListing && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <PlayerCard player={playerListing} nom={profile.nom} avatarSrc={url} />
                  </div>
                )}
              </div>
            )}

            {isPlayer && <div style={{ marginBottom: 28 }}><ExperienceTimeline userId={targetUserId} /></div>}

            {isClub && (
              <div style={{ marginBottom: 32, background: 'rgba(212,255,63,0.05)', borderLeft: `3px solid ${C.lime}`, borderRadius: 10, padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Annonces du club</span>
                  {needs.length > 0 && (
                    <span style={{ background: C.lime, color: '#0B1F1A', fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '2px 9px' }}>{needs.length}</span>
                  )}
                </div>
                {needs.length === 0 ? (
                  <Empty>Ce club n'a pas d'annonce en ligne pour le moment.</Empty>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {needs.map((n) => (
                      <div key={n.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 17, color: C.text }}>{ROLE_LABELS[n.besoin_type] || 'Joueur'}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px', fontSize: 14, color: C.muted, marginTop: 5 }}>
                              {describeNeed(n) && <span>{describeNeed(n)}</span>}
                              {n.ville && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon d={PIN} size={13} />{n.ville}</span>}
                              {n.remuneration && <span style={{ color: C.lime, fontWeight: 600 }}>{n.remuneration}</span>}
                            </div>
                          </div>
                          {n.urgence && <Badge tone={n.urgence === 'Dès que possible' ? 'urgent' : 'default'}>{n.urgence}</Badge>}
                        </div>
                        {n.details && <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, marginTop: 10 }}>{n.details}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isClub && <div style={{ marginBottom: 28 }}><ClubFacilitiesList items={profile.infrastructures} /></div>}

            {isClub && hasLocation && (
              <div>
                <SectionTitle>Localisation</SectionTitle>
                {profile.adresse && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: C.muted, marginBottom: 10 }}><Icon d={PIN} size={13} />{profile.adresse}</div>
                )}
                <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.line}` }}>
                  <SearchMap markers={[{ lat: clubLat, lng: clubLng, title: profile.nom, color: C.lime }]} />
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'photos' && (
          galleryItems.length > 0 ? <ProfileMediaGrid items={galleryItems} /> : <Empty>Aucune photo publiée pour le moment.</Empty>
        )}

        {tab === 'actus' && (
          recentPosts.length === 0 ? <Empty>Aucune publication pour le moment.</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recentPosts.map((post) => (
                <div key={post.id} className="pp-row" style={{ padding: '4px 8px' }}>
                  {post.content && <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55 }}>{post.content}</div>}
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Il y a {postTimeAgo(post.created_at)}</div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'recos' && isPlayer && (
          <>
            {recommendations.length === 0 ? (
              <Empty>Aucune recommandation pour le moment.</Empty>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {recommendations.map((r) => (
                  <div key={r.id} style={{ padding: '4px 8px' }}>
                    <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55 }}>{r.content}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>{r.profiles?.nom || 'Utilisateur'}</div>
                  </div>
                ))}
              </div>
            )}
            {!isMe && (
              <div style={{ maxWidth: 560 }}>
                <TextArea value={newRecoText} onChange={(e) => setNewRecoText(e.target.value)} placeholder="Laisser une recommandation…" style={{ minHeight: 80, marginBottom: 10 }} />
                <button
                  onClick={submitRecommendation}
                  disabled={submittingReco || !newRecoText.trim()}
                  style={{ background: C.lime, color: C.ink, border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: newRecoText.trim() ? 'pointer' : 'default', opacity: newRecoText.trim() ? 1 : 0.5 }}
                >
                  {submittingReco ? 'Envoi…' : 'Publier'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Liste abonnés / abonnements */}
      {followList && (
        <div
          onClick={() => setFollowList(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,15,12,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, maxWidth: 400, width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{followList.type === 'followers' ? 'Abonnés' : 'Abonnements'}</div>
              <button onClick={() => setFollowList(null)} aria-label="Fermer" style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex', padding: 4 }}><Icon d={CLOSE} size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingFollowList ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 14 }}>Chargement…</div>
              ) : followList.users.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 14 }}>
                  {followList.type === 'followers' ? 'Aucun abonné pour le moment.' : 'Ne suit personne pour le moment.'}
                </div>
              ) : (
                followList.users.map((u) => {
                  const avatarSrc = u.avatar_path ? avatarUrl(supabase, u.avatar_path) : null;
                  return (
                    <button
                      key={u.id}
                      className="pp-row"
                      onClick={() => { setFollowList(null); onBack(); setTimeout(() => { window.location.href = `/app?tab=profil&uid=${u.id}`; }, 50); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.line}`, cursor: 'pointer', textAlign: 'left', color: C.text }}
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.soft, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                          {initials(u.nom)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{u.nom}</div>
                        <div style={{ fontSize: 12.5, color: C.muted }}>{ROLE_LABELS[u.role] || u.role}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, onClick }) {
  return (
    <button className="pp-stat" data-click={onClick ? '1' : '0'} onClick={onClick} disabled={!onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 11.5, color: C.muted }}>{label}</div>
      <div className="pp-stat-v" style={{ fontSize: 18, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums', color: C.text, transition: 'color .12s ease' }}>{value}</div>
    </button>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>{children}</h2>;
}

function Empty({ children }) {
  return <div style={{ padding: '28px 0', color: C.muted, fontSize: 14 }}>{children}</div>;
}
