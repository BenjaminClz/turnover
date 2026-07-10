'use client';

import { useState, useEffect } from 'react';
import { Badge, GhostButton, TextArea, PrimaryButton } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import StatsRadar from '@/components/StatsRadar';
import PlayerCard from '@/components/PlayerCard';
import { nationalites } from '@/lib/nationalites';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

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

const calculAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const moisDiff = aujourdhui.getMonth() - naissance.getMonth();
  if (moisDiff < 0 || (moisDiff === 0 && aujourdhui.getDate() < naissance.getDate())) age--;
  return age;
};

const hasStats = (player) =>
  [player.stat_vitesse, player.stat_defense, player.stat_vision, player.stat_technique, player.stat_combat, player.stat_attaque, player.stat_physique]
    .some((v) => v != null);

export default function PlayerProfileModal({ player, supabase, currentUserId, onClose, onContact, onViewGallery }) {
  const [recommendations, setRecommendations] = useState([]);
  const [newRecoText, setNewRecoText] = useState('');
  const [submittingReco, setSubmittingReco] = useState(false);

  useEffect(() => {
    if (!player) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [player, onClose]);

  useEffect(() => {
    if (!player) return;
    (async () => {
      const { data } = await supabase
        .from('recommendations')
        .select('*, profiles!recommendations_author_id_fkey(nom)')
        .eq('target_id', player.owner_id)
        .order('created_at', { ascending: false });
      setRecommendations(data || []);
    })();
  }, [player?.owner_id]);

  const submitRecommendation = async () => {
    if (!newRecoText.trim() || !player) return;
    setSubmittingReco(true);
    const { error } = await supabase.from('recommendations').insert({
      author_id: currentUserId, target_id: player.owner_id, content: newRecoText.trim(),
    });
    setSubmittingReco(false);
    if (error) return;
    setNewRecoText('');
    const { data } = await supabase
      .from('recommendations')
      .select('*, profiles!recommendations_author_id_fkey(nom)')
      .eq('target_id', player.owner_id)
      .order('created_at', { ascending: false });
    setRecommendations(data || []);
  };

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
            {lastSeenLabel(player.profiles?.last_seen_at) && (
              <div style={{ fontSize: 12.5, color: '#D4FF3F', marginTop: 4, fontWeight: 600 }}>{lastSeenLabel(player.profiles?.last_seen_at)}</div>
            )}
            {player.nationalites?.length > 0 && (
              <div style={{ fontSize: 13, color: '#8C9A8E', marginTop: 4 }}>
                {player.nationalites.map(nomNationalite).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 20 }}>
          {age != null && <InfoBlock label="Âge" value={`${age} ans`} />}
          {player.taille_cm && <InfoBlock label="Taille" value={`${player.taille_cm} cm`} />}
          {player.poids_kg && <InfoBlock label="Poids" value={`${player.poids_kg} kg`} />}
          {player.annees_pratique != null && <InfoBlock label="Pratique" value={`${player.annees_pratique} ans`} />}
          {player.pied_fort && <InfoBlock label="Pied fort" value={player.pied_fort} />}
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          <DetailRow label="Ville" value={`${player.ville} (rayon ${player.distance} km)`} />
          <DetailRow label="Disponibilité" value={<Badge tone="lime">{player.dispo}</Badge>} />
          {player.dernier_club && (
            <DetailRow label="Dernier club" value={`${player.dernier_club} (${player.dernier_club_niveau})`} />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <PlayerCard player={player} nom={player.profiles?.nom} avatarSrc={url} />
        </div>

        {player.bio && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Présentation</div>
            <div style={{ fontSize: 14.5, color: '#C7CFC8', lineHeight: 1.6 }}>{player.bio}</div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>
            Recommandations {recommendations.length > 0 && `(${recommendations.length})`}
          </div>
          {recommendations.length === 0 ? (
            <div style={{ fontSize: 13.5, color: '#8C9A8E', marginBottom: 12 }}>Aucune recommandation pour le moment.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              {recommendations.map((r) => (
                <div key={r.id} style={{ background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13.5, color: '#C7CFC8', lineHeight: 1.5 }}>{r.content}</div>
                  <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 6 }}>— {r.profiles?.nom || 'Utilisateur'}</div>
                </div>
              ))}
            </div>
          )}
          {player.owner_id !== currentUserId && (
            <div>
              <TextArea value={newRecoText} onChange={(e) => setNewRecoText(e.target.value)} placeholder="Laisser une recommandation (ex. entraîneur, coéquipier)…" style={{ minHeight: 70, marginBottom: 8 }} />
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
      <div style={{ fontSize: 17, fontWeight: 800, textTransform: 'capitalize' }}>{value}</div>
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
