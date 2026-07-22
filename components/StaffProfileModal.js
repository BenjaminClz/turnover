'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { avatarUrl } from '@/components/AvatarUpload';
import ProfileMediaGrid from '@/components/ProfileMediaGrid';

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

const describeStaff = (s) => {
  if (s.role === 'sante') return `${s.specialite || 'Pro santé'} · ${s.sport || ''}`.trim();
  if (s.role === 'preparateur') return `Prép. physique · ${s.sport || ''}`.trim();
  if (s.role === 'entraineur') return `${s.specialite || 'Entraîneur'} · ${s.niveau || ''}`.trim();
  if (s.role === 'arbitre') return `Arbitre · ${s.niveau || ''}`.trim();
  if (s.role === 'benevole') return s.type_mission || 'Bénévole';
  return ROLE_LABELS[s.role] || '';
};

export default function StaffProfileModal({ staff, supabase, currentUserId, onClose, onContact }) {
  const [galleryItems, setGalleryItems] = useState([]);

  useEffect(() => {
    if (!staff) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [staff, onClose]);

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const { data } = await supabase.from('gallery_items').select('*').eq('owner_id', staff.owner_id).order('created_at', { ascending: false });
      setGalleryItems((data || []).map((it) => ({ ...it, url: supabase.storage.from('gallery').getPublicUrl(it.file_path).data.publicUrl })));
    })();
  }, [staff?.owner_id]);

  if (!staff) return null;

  const url = staff.profiles?.avatar_path ? avatarUrl(supabase, staff.profiles.avatar_path) : null;
  const nom = staff.profiles?.nom || 'Profil';

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
            </div>
          </div>

          <div style={{ fontSize: 19, fontWeight: 800 }}>{nom}</div>
          <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 2 }}>{ROLE_LABELS[staff.role]}</div>
          <div style={{ fontSize: 13.5, color: '#8C9A8E', marginTop: 2 }}>{describeStaff(staff)}</div>
          {lastSeenLabel(staff.profiles?.last_seen_at) && (
            <div style={{ fontSize: 12.5, color: '#D4FF3F', marginTop: 4, fontWeight: 600 }}>{lastSeenLabel(staff.profiles?.last_seen_at)}</div>
          )}

          {/* Infos saisies */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <Pill>📍 {staff.ville} ({staff.distance} km)</Pill>
            <Pill><Badge tone="lime">{staff.dispo}</Badge></Pill>
            {staff.diplome && <Pill>🎓 {staff.diplome}</Pill>}
            {staff.sport && <Pill>🏅 {staff.sport}</Pill>}
          </div>

          {staff.bio && <div style={{ fontSize: 14, color: '#C7CFC8', marginTop: 16, lineHeight: 1.6 }}>{staff.bio}</div>}

          {/* Bouton contacter */}
          {staff.owner_id !== currentUserId && (
            <button
              onClick={() => onContact(staff.owner_id, nom, describeStaff(staff))}
              style={{ width: '100%', background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '11px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 16 }}
            >
              Contacter
            </button>
          )}
        </div>

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

function Pill({ children }) {
  return (
    <span style={{ fontSize: 12.5, color: '#C7CFC8', background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 20, padding: '5px 12px' }}>
      {children}
    </span>
  );
}
