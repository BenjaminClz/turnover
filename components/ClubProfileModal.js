'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { avatarUrl } from '@/components/AvatarUpload';
import ProfileMediaGrid from '@/components/ProfileMediaGrid';
import SearchMap from '@/components/SearchMap';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

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

const describeNeed = (n) => {
  if (n.besoin_type === 'joueur' || !n.besoin_type) return `${n.poste || ''} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'sante') return `${n.specialite || 'Pro santé'} · ${n.sport || ''}`.trim();
  if (n.besoin_type === 'preparateur') return `Prép. physique · ${n.sport || ''}`.trim();
  if (n.besoin_type === 'entraineur') return `${n.specialite || 'Entraîneur'} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'arbitre') return `Arbitre · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'benevole') return n.type_mission || 'Bénévole';
  return '';
};

const postTimeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} j`;
};

export default function ClubProfileModal({ ownerId, clubName, supabase, currentUserId, onClose, onContact, onViewGallery }) {
  const [profileData, setProfileData] = useState(null);
  const [needs, setNeeds] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    (async () => {
      const [{ data: p }, { data: n }, { data: g }, { data: posts }] = await Promise.all([
        supabase.from('profiles').select('nom, avatar_path, verified, last_seen_at, adresse, latitude, longitude').eq('id', ownerId).maybeSingle(),
        supabase.from('club_needs').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
        supabase.from('gallery_items').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
        supabase.from('posts').select('*').eq('author_id', ownerId).order('created_at', { ascending: false }).limit(5),
      ]);
      setProfileData(p || null);
      setNeeds(n || []);
      setGalleryItems((g || []).map((it) => ({ ...it, url: supabase.storage.from('gallery').getPublicUrl(it.file_path).data.publicUrl })));
      setRecentPosts(posts || []);
      setLoading(false);
    })();
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ownerId, onClose]);

  if (!ownerId) return null;

  const nom = profileData?.nom || clubName;
  const url = profileData?.avatar_path ? avatarUrl(supabase, profileData.avatar_path) : null;
  const hasLocation = profileData?.latitude != null && profileData?.longitude != null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 20, maxWidth: 520, width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(11,31,26,0.6)', border: 'none', color: '#F5F0E6', fontSize: 20, cursor: 'pointer', lineHeight: 1, width: 32, height: 32, borderRadius: '50%', zIndex: 1 }}>✕</button>

        {/* En-tête façon Instagram */}
        <div style={{ padding: '32px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            {url ? (
              <img src={url} alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #2C4A3D' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 26, flexShrink: 0 }}>
                {initials(nom)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, flex: 1 }}>
              <StatBlock value={galleryItems.length} label="Photos" />
              <StatBlock value={needs.length} label="Besoins" />
              <StatBlock value={recentPosts.length} label="Posts" />
            </div>
          </div>

          <div style={{ fontSize: 19, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            {nom}
            {profileData?.verified && <span style={{ color: '#D4FF3F', fontSize: 16 }}>✓</span>}
          </div>
          {profileData?.adresse && <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>📍 {profileData.adresse}</div>}
          {lastSeenLabel(profileData?.last_seen_at) && (
            <div style={{ fontSize: 12.5, color: '#D4FF3F', marginTop: 4, fontWeight: 600 }}>{lastSeenLabel(profileData?.last_seen_at)}</div>
          )}

          {/* Bouton contacter */}
          {ownerId !== currentUserId && (
            <button
              onClick={() => onContact(ownerId, nom, needs[0] ? describeNeed(needs[0]) : 'Contact club')}
              style={{ width: '100%', background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '11px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 16 }}
            >
              Contacter le club
            </button>
          )}
        </div>

        {/* Carte de localisation */}
        {hasLocation && (
          <div style={{ padding: '0 28px 20px' }}>
            <SearchMap markers={[{ lat: profileData.latitude, lng: profileData.longitude, title: nom, color: '#D4FF3F' }]} />
          </div>
        )}

        {/* Besoins actifs */}
        {needs.length > 0 && (
          <div style={{ padding: '0 28px 20px' }}>
            <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>Besoins actifs</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {needs.map((n) => (
                <div key={n.id} style={{ background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
          <div style={{ padding: '0 28px 20px' }}>
            <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>Dernières actualités</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {recentPosts.map((post) => (
                <div key={post.id} style={{ background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 10, padding: '12px 14px' }}>
                  {post.content && <div style={{ fontSize: 13.5, color: '#C7CFC8', lineHeight: 1.5 }}>{post.content}</div>}
                  <div style={{ fontSize: 11.5, color: '#8C9A8E', marginTop: 6 }}>Il y a {postTimeAgo(post.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grille photos/vidéos façon Instagram */}
        <div style={{ borderTop: '1px solid #2C4A3D' }}>
          {galleryItems.length > 0 ? (
            <ProfileMediaGrid items={galleryItems} />
          ) : (
            <div style={{ padding: '24px 28px', textAlign: 'center', color: '#8C9A8E', fontSize: 13.5 }}>Aucune photo publiée pour le moment.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}
