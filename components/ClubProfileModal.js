'use client';

import { useState, useEffect } from 'react';
import { Badge, GhostButton } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { avatarUrl } from '@/components/AvatarUpload';

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

const BESOIN_ICONS = {
  joueur: '🏉', sante: '🩺', preparateur: '💪', entraineur: '📋', arbitre: '🟨', benevole: '🤝',
};

const publieDepuis = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const jours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (jours < 1) return "Publié aujourd'hui";
  if (jours === 1) return 'Publié hier';
  return `Publié il y a ${jours} j`;
};

const describeNeed = (n) => {
  if (n.besoin_type === 'joueur' || !n.besoin_type) return `${n.poste || ''} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'sante') return `${n.specialite || 'Professionnel de santé'} · ${n.sport || ''}`.trim();
  if (n.besoin_type === 'preparateur') return `Préparateur physique · ${n.sport || ''}`.trim();
  if (n.besoin_type === 'entraineur') return `Entraîneur ${n.sport || ''} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'arbitre') return `Arbitre ${n.sport || ''} · ${n.niveau || ''}`.trim();
  if (n.besoin_type === 'benevole') return n.type_mission === 'Autre' && n.type_mission_autre ? n.type_mission_autre : (n.type_mission || 'Bénévole');
  return '';
};

export default function ClubProfileModal({ ownerId, clubName, supabase, currentUserId, onClose, onContact, onViewGallery }) {
  const [profileData, setProfileData] = useState(null);
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    (async () => {
      const [{ data: p }, { data: n }] = await Promise.all([
        supabase.from('profiles').select('nom, avatar_path, verified, last_seen_at').eq('id', ownerId).maybeSingle(),
        supabase.from('club_needs').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
      ]);
      setProfileData(p || null);
      setNeeds(n || []);
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
  const villes = [...new Set(needs.map((n) => n.ville).filter(Boolean))];

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 20, padding: 32, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'transparent', border: 'none', color: '#A4B0A6', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 24 }}>
          {url ? (
            <img src={url} alt="" style={{ width: 72, height: 72, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', color: '#0B1F1A', fontSize: 24, flexShrink: 0 }}>
              {initials(nom)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              {nom}
              {profileData?.verified && <span title="Club vérifié" style={{ color: '#D4FF3F', fontSize: 16 }}>✓</span>}
            </div>
            {villes.length > 0 && <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>{villes.join(', ')}</div>}
            {needs.length > 0 && (
              <div style={{ fontSize: 12.5, color: '#8C9A8E', marginTop: 4 }}>
                Membre depuis {new Date(needs[needs.length - 1].created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            )}
            {lastSeenLabel(profileData?.last_seen_at) && (
              <div style={{ fontSize: 12.5, color: '#D4FF3F', marginTop: 4, fontWeight: 600 }}>{lastSeenLabel(profileData?.last_seen_at)}</div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>
          Besoins publiés {needs.length > 0 && `(${needs.length})`}
        </div>

        {loading ? (
          <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 24 }}>Chargement…</div>
        ) : needs.length === 0 ? (
          <div style={{ fontSize: 13.5, color: '#8C9A8E', marginBottom: 20 }}>Aucun besoin publié pour le moment.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
            {needs.map((n) => (
              <div key={n.id} style={{ background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{BESOIN_ICONS[n.besoin_type] || '🏉'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{ROLE_LABELS[n.besoin_type] || 'Joueur'}{n.sport ? ` · ${n.sport}` : ''}</div>
                      <div style={{ fontSize: 13.5, color: '#A4B0A6', marginTop: 2 }}>{describeNeed(n)}</div>
                    </div>
                  </div>
                  <Badge tone={n.urgence === 'Dès que possible' ? 'urgent' : 'default'}>{n.urgence}</Badge>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12.5, color: '#8C9A8E', marginTop: 10 }}>
                  <span>📍 {n.ville}</span>
                  {n.remuneration && <span style={{ color: '#D4FF3F' }}>💰 {n.remuneration}</span>}
                  {publieDepuis(n.created_at) && <span>{publieDepuis(n.created_at)}</span>}
                </div>
                {n.details && (
                  <div style={{ fontSize: 13.5, color: '#C7CFC8', marginTop: 12, paddingTop: 12, borderTop: '1px solid #1c332a', lineHeight: 1.5 }}>
                    {n.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <GhostButton onClick={() => onViewGallery(ownerId, nom)}>Voir la galerie</GhostButton>
          {ownerId !== currentUserId && (
            <button
              onClick={() => onContact(ownerId, nom, needs[0] ? describeNeed(needs[0]) : 'Contact club')}
              style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '11px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Contacter le club
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
