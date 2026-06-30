'use client';

import { Badge, GhostButton } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const calculAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const moisDiff = aujourdhui.getMonth() - naissance.getMonth();
  if (moisDiff < 0 || (moisDiff === 0 && aujourdhui.getDate() < naissance.getDate())) age--;
  return age;
};

export default function PlayerProfileModal({ player, supabase, currentUserId, onClose, onContact, onViewGallery }) {
  if (!player) return null;

  const age = calculAge(player.date_naissance);
  const url = player.profiles?.avatar_path ? avatarUrl(supabase, player.profiles.avatar_path) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 20, padding: 32,
          maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative',
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'transparent', border: 'none', color: '#A4B0A6', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 24 }}>
          {url ? (
            <img src={url} alt="" style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', color: '#0B1F1A', fontSize: 24, flexShrink: 0 }}>
              {initials(player.profiles?.nom)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{player.profiles?.nom}</div>
            <div style={{ fontSize: 14.5, color: '#A4B0A6', marginTop: 4 }}>{player.poste} · {player.niveau}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 20 }}>
          {age != null && <InfoBlock label="Âge" value={`${age} ans`} />}
          {player.taille_cm && <InfoBlock label="Taille" value={`${player.taille_cm} cm`} />}
          {player.poids_kg && <InfoBlock label="Poids" value={`${player.poids_kg} kg`} />}
          {player.annees_pratique != null && <InfoBlock label="Pratique" value={`${player.annees_pratique} ans`} />}
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          <DetailRow label="Ville" value={`${player.ville} (rayon ${player.distance} km)`} />
          <DetailRow label="Disponibilité" value={<Badge tone="lime">{player.dispo}</Badge>} />
          {player.clubs_precedents && <DetailRow label="Clubs précédents" value={player.clubs_precedents} />}
        </div>

        {player.bio && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Présentation</div>
            <div style={{ fontSize: 14.5, color: '#C7CFC8', lineHeight: 1.6 }}>{player.bio}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <GhostButton onClick={() => onViewGallery(player.owner_id, player.profiles?.nom)}>Voir la galerie</GhostButton>
          {player.owner_id !== currentUserId && (
            <button onClick={() => onContact(player.owner_id, player.profiles?.nom, `${player.poste} · ${player.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Contacter</button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div style={{ background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
      <span style={{ color: '#8C9A8E' }}>{label}</span>
      <span style={{ color: '#F5F0E6', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
