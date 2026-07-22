'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Badge, TextArea } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { avatarUrl } from '@/components/AvatarUpload';
import PlayerCard from '@/components/PlayerCard';
import ProfileMediaGrid from '@/components/ProfileMediaGrid';
import SearchMap from '@/components/SearchMap';
import { nationalites } from '@/lib/nationalites';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

const STAFF_ROLES = ['sante', 'preparateur', 'entraineur', 'arbitre', 'benevole'];

const lastSeenLabel = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = diffMs / 60000;
  if (mins < 5) return 'En ligne maintenant';
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

const describeNeed = (n) => {
  if (n.besoin_type === 'joueur' || !n.besoin_type) return `${n.poste || ''} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'sante') return `${n.specialite || 'Pro santé'} · ${n.sport || ''}`.trim();
  if (n.besoin_type === 'preparateur') return `Prép. physique · ${n.sport || ''}`.trim();
  if (n.besoin_type === 'entraineur') return `${n.specialite || 'Entraîneur'} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'arbitre') return `Arbitre · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'benevole') return n.type_mission || 'Bénévole';
  return '';
};

const describeStaff = (s) => {
  if (s.role === 'sante') return `${s.specialite || 'Pro santé'} · ${s.sport || ''}`.trim();
  if (s.role === 'preparateur') return `Prép. physique · ${s.sport || ''}`.trim();
  if (s.role === 'entraineur') return `${s.specialite || 'Entraîneur'} · ${s.niveau || ''}`.trim();
  if (s.role === 'arbitre') return `Arbitre · ${s.niveau || ''}`.trim();
  if (s.role === 'benevole') return s.type_mission || 'Bénévole';
  return ROLE_LABELS[s.role] || '';
};

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

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
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

      // Charger les compteurs abonnés/abonnements et le statut de suivi.
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
      if (error) { setIsFollowing(false); setFollowersCount((c) => c - 1); }
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

  if (loading) return <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 60 }}>Chargement du profil…</div>;
  if (!profile) return <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 60 }}>Profil introuvable.</div>;

  const url = profile.avatar_path ? avatarUrl(supabase, profile.avatar_path) : null;
  const isMe = targetUserId === currentUserId;
  const age = profile.role === 'joueur' && playerListing ? calculAge(playerListing.date_naissance) : null;
  const hasLocation = profile.latitude != null && profile.longitude != null;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Bouton retour */}
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#A4B0A6', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>←</span> Retour
      </button>

      {/* En-tête façon Instagram */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        {url ? (
          <img src={url} alt="" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid #2C4A3D' }} />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 30, flexShrink: 0 }}>
            {initials(profile.nom)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 24, flex: 1 }}>
          <StatBlock value={galleryItems.length} label="Photos" />
          <StatBlock value={followersCount} label="Abonnés" />
          <StatBlock value={followingCount} label="Abonnements" />
          {profile.role === 'joueur' && <StatBlock value={recommendations.length} label="Recos" />}
        </div>
      </div>

      {/* Nom, rôle, infos */}
      <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {profile.nom}
        {profile.verified && <span style={{ color: '#D4FF3F', fontSize: 16 }}>✓</span>}
      </div>

      {profile.role === 'joueur' && playerListing && (
        <div style={{ fontSize: 15, color: '#A4B0A6', marginTop: 4 }}>{playerListing.poste} · {playerListing.niveau}</div>
      )}
      {profile.role === 'club' && profile.adresse && (
        <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>📍 {profile.adresse}</div>
      )}
      {STAFF_ROLES.includes(profile.role) && staffListing && (
        <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>{ROLE_LABELS[profile.role]} · {describeStaff(staffListing)}</div>
      )}
      {lastSeenLabel(profile.last_seen_at) && (
        <div style={{ fontSize: 12.5, color: '#D4FF3F', marginTop: 6, fontWeight: 600 }}>{lastSeenLabel(profile.last_seen_at)}</div>
      )}

      {/* Pills d'infos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {profile.role === 'joueur' && playerListing && (
          <>
            <Pill>📍 {playerListing.ville} ({playerListing.distance} km)</Pill>
            <Pill><Badge tone="lime">{playerListing.dispo}</Badge></Pill>
            {playerListing.taille_cm && <Pill>{playerListing.taille_cm} cm</Pill>}
            {playerListing.poids_kg && <Pill>{playerListing.poids_kg} kg</Pill>}
            {playerListing.pied_fort && <Pill>Pied {playerListing.pied_fort}</Pill>}
            {playerListing.annees_pratique != null && <Pill>{playerListing.annees_pratique} ans de pratique</Pill>}
            {playerListing.nationalites?.length > 0 && <Pill>{playerListing.nationalites.map(nomNationalite).join(', ')}</Pill>}
            {playerListing.dernier_club && <Pill>Ex. {playerListing.dernier_club} ({playerListing.dernier_club_niveau})</Pill>}
          </>
        )}
        {STAFF_ROLES.includes(profile.role) && staffListing && (
          <>
            <Pill>📍 {staffListing.ville} ({staffListing.distance} km)</Pill>
            <Pill><Badge tone="lime">{staffListing.dispo}</Badge></Pill>
            {staffListing.diplome && <Pill>🎓 {staffListing.diplome}</Pill>}
            {staffListing.sport && <Pill>🏅 {staffListing.sport}</Pill>}
          </>
        )}
      </div>

      {/* Bio */}
      {((profile.role === 'joueur' && playerListing?.bio) || (STAFF_ROLES.includes(profile.role) && staffListing?.bio)) && (
        <div style={{ fontSize: 14.5, color: '#C7CFC8', marginTop: 16, lineHeight: 1.6 }}>
          {profile.role === 'joueur' ? playerListing.bio : staffListing?.bio}
        </div>
      )}

      {/* Boutons Suivre + Contacter */}
      {!isMe && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={toggleFollow}
            style={{ flex: 1, background: isFollowing ? 'transparent' : '#D4FF3F', color: isFollowing ? '#A4B0A6' : '#0B1F1A', border: isFollowing ? '1.5px solid #2C4A3D' : 'none', padding: '13px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            {isFollowing ? 'Abonné ✓' : 'Suivre'}
          </button>
          <button
            onClick={() => {
            const context = profile.role === 'joueur' && playerListing ? `${playerListing.poste} · ${playerListing.ville}` :
              profile.role === 'club' && needs[0] ? describeNeed(needs[0]) :
              STAFF_ROLES.includes(profile.role) && staffListing ? describeStaff(staffListing) : 'Contact';
            onContact(targetUserId, profile.nom, context);
          }}
          style={{ flex: 1, background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '13px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
        >
          Contacter
        </button>
        </div>
      )}

      {/* Carte FIFA (joueur uniquement) */}
      {profile.role === 'joueur' && playerListing && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28, marginBottom: 8 }}>
          <PlayerCard player={playerListing} nom={profile.nom} avatarSrc={url} />
        </div>
      )}

      {/* Carte de localisation (club uniquement) */}
      {profile.role === 'club' && hasLocation && (
        <div style={{ marginTop: 28, marginBottom: 8 }}>
          <SectionTitle>Localisation</SectionTitle>
          <SearchMap markers={[{ lat: profile.latitude, lng: profile.longitude, title: profile.nom, color: '#D4FF3F' }]} />
        </div>
      )}

      {/* Besoins actifs (club uniquement) */}
      {profile.role === 'club' && needs.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionTitle>Besoins actifs ({needs.length})</SectionTitle>
          <div style={{ display: 'grid', gap: 8 }}>
            {needs.map((n) => (
              <div key={n.id} style={{ background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{ROLE_LABELS[n.besoin_type] || 'Joueur'}</div>
                  <div style={{ fontSize: 12.5, color: '#A4B0A6', marginTop: 2 }}>{describeNeed(n)} · {n.ville}</div>
                </div>
                <Badge tone={n.urgence === 'Dès que possible' ? 'urgent' : 'default'}>{n.urgence}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières actualités */}
      {recentPosts.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionTitle>Dernières actualités</SectionTitle>
          <div style={{ display: 'grid', gap: 8 }}>
            {recentPosts.map((post) => (
              <div key={post.id} style={{ background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 10, padding: '12px 14px' }}>
                {post.content && <div style={{ fontSize: 13.5, color: '#C7CFC8', lineHeight: 1.5 }}>{post.content}</div>}
                <div style={{ fontSize: 11.5, color: '#8C9A8E', marginTop: 6 }}>Il y a {postTimeAgo(post.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grille photos/vidéos façon Instagram */}
      <div style={{ marginTop: 28 }}>
        <SectionTitle>Photos & vidéos</SectionTitle>
        {galleryItems.length > 0 ? (
          <ProfileMediaGrid items={galleryItems} />
        ) : (
          <div style={{ textAlign: 'center', color: '#8C9A8E', fontSize: 13.5, padding: 20 }}>Aucune photo publiée pour le moment.</div>
        )}
      </div>

      {/* Recommandations (joueur uniquement) */}
      {profile.role === 'joueur' && (
        <div style={{ marginTop: 28, paddingBottom: 20 }}>
          <SectionTitle>Recommandations {recommendations.length > 0 && `(${recommendations.length})`}</SectionTitle>
          {recommendations.length === 0 ? (
            <div style={{ fontSize: 13.5, color: '#8C9A8E', marginBottom: 12 }}>Aucune recommandation pour le moment.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              {recommendations.map((r) => (
                <div key={r.id} style={{ background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13.5, color: '#C7CFC8', lineHeight: 1.5 }}>{r.content}</div>
                  <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 6 }}>— {r.profiles?.nom || 'Utilisateur'}</div>
                </div>
              ))}
            </div>
          )}
          {!isMe && (
            <div>
              <TextArea value={newRecoText} onChange={(e) => setNewRecoText(e.target.value)} placeholder="Laisser une recommandation…" style={{ minHeight: 70, marginBottom: 8 }} />
              <button
                onClick={submitRecommendation}
                disabled={submittingReco || !newRecoText.trim()}
                style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: newRecoText.trim() ? 'pointer' : 'default', opacity: newRecoText.trim() ? 1 : 0.5 }}
              >
                {submittingReco ? 'Envoi…' : 'Publier la recommandation'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span style={{ fontSize: 13, color: '#C7CFC8', background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 20, padding: '6px 14px' }}>
      {children}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 13, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>
      {children}
    </div>
  );
}
