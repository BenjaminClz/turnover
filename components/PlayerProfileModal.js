'use client';

import { useState, useEffect } from 'react';
import { Badge, TextArea } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import PlayerCard from '@/components/PlayerCard';
import ProfileMediaGrid from '@/components/ProfileMediaGrid';
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

export default function PlayerProfileModal({ player, supabase, currentUserId, onClose, onContact, onViewGallery }) {
  const [recommendations, setRecommendations] = useState([]);
  const [newRecoText, setNewRecoText] = useState('');
  const [submittingReco, setSubmittingReco] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);

  useEffect(() => {
    if (!player) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [player, onClose]);

  useEffect(() => {
    if (!player) return;
    (async () => {
      const [{ data: recos }, { data: gallery }] = await Promise.all([
        supabase.from('recommendations').select('*, profiles!recommendations_author_id_fkey(nom)').eq('target_id', player.owner_id).order('created_at', { ascending: false }),
        supabase.from('gallery_items').select('*').eq('owner_id', player.owner_id).order('created_at', { ascending: false }),
      ]);
      setRecommendations(recos || []);
      setGalleryItems((gallery || []).map((it) => ({ ...it, url: supabase.storage.from('gallery').getPublicUrl(it.file_path).data.publicUrl })));
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 20, maxWidth: 520, width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(11,31,26,0.6)', border: 'none', color: '#F5F0E6', fontSize: 20, cursor: 'pointer', lineHeight: 1, width: 32, height: 32, borderRadius: '50%', zIndex: 1 }}>✕</button>

        {/* En-tête façon Instagram : avatar, nom, statistiques */}
        <div style={{ padding: '32px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            {url ? (
              <img src={url} alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #2C4A3D' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 26, flexShrink: 0 }}>
                {initials(player.profiles?.nom)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, flex: 1 }}>
              <StatBlock value={galleryItems.length} label="Photos" />
              <StatBlock value={recommendations.length} label="Recos" />
              <StatBlock value={age != null ? age : '—'} label="Ans" />
            </div>
          </div>

          <div style={{ fontSize: 19, fontWeight: 800 }}>{player.profiles?.nom}</div>
          <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 2 }}>{player.poste} · {player.niveau}</div>
          {lastSeenLabel(player.profiles?.last_seen_at) && (
            <div style={{ fontSize: 12.5, color: '#D4FF3F', marginTop: 4, fontWeight: 600 }}>{lastSeenLabel(player.profiles?.last_seen_at)}</div>
          )}
          {player.bio && <div style={{ fontSize: 14, color: '#C7CFC8', marginTop: 10, lineHeight: 1.5 }}>{player.bio}</div>}

          {/* Informations saisies par le joueur */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <Pill>📍 {player.ville} ({player.distance} km)</Pill>
            <Pill><Badge tone="lime">{player.dispo}</Badge></Pill>
            {player.taille_cm && <Pill>{player.taille_cm} cm</Pill>}
            {player.poids_kg && <Pill>{player.poids_kg} kg</Pill>}
            {player.pied_fort && <Pill>Pied {player.pied_fort}</Pill>}
            {player.annees_pratique != null && <Pill>{player.annees_pratique} ans de pratique</Pill>}
            {player.nationalites?.length > 0 && <Pill>{player.nationalites.map(nomNationalite).join(', ')}</Pill>}
            {player.dernier_club && <Pill>Ex. {player.dernier_club} ({player.dernier_club_niveau})</Pill>}
          </div>
        </div>

        {/* Carte de stats FIFA */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 28px 24px' }}>
          <PlayerCard player={player} nom={player.profiles?.nom} avatarSrc={url} />
        </div>

        {/* Grille photos/vidéos façon Instagram */}
        <div style={{ borderTop: '1px solid #2C4A3D' }}>
          {galleryItems.length > 0 ? (
            <ProfileMediaGrid items={galleryItems} />
          ) : (
            <div style={{ padding: '24px 28px', textAlign: 'center', color: '#8C9A8E', fontSize: 13.5 }}>Aucune photo publiée pour le moment.</div>
          )}
        </div>

        {/* Recommandations */}
        <div style={{ padding: '24px 28px' }}>
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

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
            {player.owner_id !== currentUserId && (
              <button onClick={() => onContact(player.owner_id, player.profiles?.nom, `${player.poste} · ${player.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '11px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Contacter</button>
            )}
          </div>
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
