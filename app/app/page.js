'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/use-user';
import { createClient } from '@/lib/supabase-client';
import { Badge, GhostButton, Toast, ToggleSwitch } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import PlayersTab from '@/components/PlayersTab';
import ClubsTab from '@/components/ClubsTab';
import StaffTab from '@/components/StaffTab';
import SearchTab from '@/components/SearchTab';
import MessagesTab from '@/components/MessagesTab';
import GalleryTab from '@/components/GalleryTab';
import SubscriptionTab from '@/components/SubscriptionTab';
import AdminTab from '@/components/AdminTab';
import FavoritesTab from '@/components/FavoritesTab';
import { isProfileComplete } from '@/lib/profile-completion';

// Mappe chaque rôle vers son onglet "espace personnel" par défaut à la connexion
const ROLE_HOME_TAB = {
  joueur: 'joueur', club: 'club', sante: 'sante', preparateur: 'preparateur',
  entraineur: 'entraineur', arbitre: 'arbitre', benevole: 'benevole',
};

export default function AppPage() {
  const { user, profile, loading } = useUser();
  const supabase = createClient();
  const [tab, setTab] = useState(null); // null tant qu'on n'a pas déterminé l'onglet de départ
  const [toast, setToast] = useState(null);
  const [viewingGallery, setViewingGallery] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConvTarget, setPendingConvTarget] = useState(null);
  const [myPlayerListing, setMyPlayerListing] = useState(null);

  useEffect(() => {
    if (!loading && !user) { window.location.href = '/'; }
  }, [loading, user]);

  // Pour un joueur, charge son propre profil afin de vérifier le taux de complétion
  // (nécessaire pour autoriser ou bloquer l'accès à la messagerie).
  useEffect(() => {
    if (profile?.role !== 'joueur') return;
    (async () => {
      const { data } = await supabase.from('player_listings').select('*').eq('owner_id', user.id).maybeSingle();
      setMyPlayerListing(data || null);
    })();
  }, [profile, tab]); // re-vérifie à chaque changement d'onglet (ex. après complétion du profil)

  // Redirection automatique vers l'espace du rôle, une seule fois à l'arrivée
  useEffect(() => {
    if (profile && tab === null) {
      setTab(ROLE_HOME_TAB[profile.role] || 'recherche');
    }
  }, [profile, tab]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const startConversation = async (otherId, otherName, contextLabel) => {
    if (otherId === user.id) { showToast("C'est ton propre profil."); return; }
    if (profile.role === 'joueur' && !isProfileComplete(myPlayerListing)) {
      showToast('Complète ton profil (date de naissance, taille, poids) pour débloquer la messagerie.');
      setTab('joueur');
      return;
    }
    const [p1, p2] = [user.id, otherId].sort();
    let { data: existing } = await supabase
      .from('conversations').select('id').eq('participant_1', p1).eq('participant_2', p2).maybeSingle();
    if (!existing) {
      const { data: created, error } = await supabase
        .from('conversations').insert({ participant_1: p1, participant_2: p2, context: contextLabel }).select('id').single();
      if (error) { showToast("Impossible d'ouvrir la conversation."); return; }
      existing = created;
    }
    setPendingConvTarget({ conversationId: existing.id, otherName });
    setTab('messages');
  };

  const openGallery = (userId, ownerName) => {
    setViewingGallery({ userId, ownerName });
    setTab('galerie');
  };

  if (loading || !user || !profile || tab === null) {
    return <div style={{ minHeight: '100vh', background: '#0B1F1A' }} />;
  }

  const STAFF_ROLES = ['sante', 'preparateur', 'entraineur', 'arbitre', 'benevole'];

  // Nav minimaliste : chacun voit uniquement ce qui le concerne.
  // Tout le monde a la même structure : Mon espace + Rechercher + Messages (+ Galerie pour les joueurs).
  // Le choix du TYPE de profil recherché (joueur / santé / coach / etc.) se fait
  // via le sélecteur de catégorie à l'intérieur de l'écran Rechercher, pas via des onglets séparés.
  const tabs = profile.role === 'club'
    ? [
        { key: 'club', label: '👤 Mon espace' },
        { key: 'recherche', label: '🔍 Rechercher' },
        { key: 'favoris', label: '❤️ Favoris' },
        { key: 'abonnement', label: '⭐ Abonnement' },
        { key: 'messages', label: `💬 Messages${unreadCount ? ` (${unreadCount})` : ''}` },
        ...(profile.is_admin ? [{ key: 'admin', label: '🛡️ Admin' }] : []),
      ]
    : [
        { key: ROLE_HOME_TAB[profile.role], label: '👤 Mon profil' },
        { key: 'recherche', label: '🔍 Rechercher' },
        { key: 'favoris', label: '❤️ Favoris' },
        { key: 'messages', label: `💬 Messages${unreadCount ? ` (${unreadCount})` : ''}` },
        ...(profile.role === 'joueur' ? [{ key: 'galerie', label: '📸 Ma galerie' }] : []),
        ...(profile.is_admin ? [{ key: 'admin', label: '🛡️ Admin' }] : []),
      ];

  return (
    <div style={{ minHeight: '100vh', color: '#F5F0E6' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5vw', background: 'rgba(11,31,26,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1.5px solid #2C4A3D', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 13, height: 13, background: '#D4FF3F', borderRadius: '50%' }} />
          <span className="turnover-anton" style={{ fontSize: 30 }}>TURNOVER</span>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#152E26', padding: 5, borderRadius: 12, border: '1.5px solid #2C4A3D', flexWrap: 'wrap', maxWidth: '100%', overflowX: 'auto' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === 'messages' && profile.role === 'joueur' && !isProfileComplete(myPlayerListing)) {
                  showToast('Complète ton profil pour débloquer la messagerie.');
                  setTab('joueur');
                  return;
                }
                setTab(t.key);
                if (t.key === 'galerie') setViewingGallery({ userId: user.id, ownerName: profile.nom });
              }}
              style={{ padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 600, background: tab === t.key ? '#D4FF3F' : 'transparent', color: tab === t.key ? '#0B1F1A' : '#A4B0A6', whiteSpace: 'nowrap' }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 15.5, color: '#F5F0E6', fontWeight: 800 }}>{profile.nom} <Badge tone="lime">{ROLE_LABELS[profile.role]}</Badge></span>
          <ToggleSwitch checked={true} onChange={logout} title="Se déconnecter" />
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '44px 5vw 110px' }}>
        {tab === 'joueur' && <PlayersTab user={user} profile={profile} showToast={showToast} onContact={startConversation} onViewGallery={openGallery} />}
        {tab === 'club' && <ClubsTab user={user} profile={profile} showToast={showToast} onContact={startConversation} />}
        {STAFF_ROLES.includes(tab) && <StaffTab role={tab} user={user} profile={profile} showToast={showToast} onContact={startConversation} />}
        {tab === 'recherche' && <SearchTab user={user} viewerRole={profile.role} showToast={showToast} onContact={startConversation} onViewGallery={openGallery} />}
        {tab === 'messages' && <MessagesTab user={user} profile={profile} setUnreadCount={setUnreadCount} pendingConvTarget={pendingConvTarget} clearPendingConvTarget={() => setPendingConvTarget(null)} showToast={showToast} />}
        {tab === 'abonnement' && <SubscriptionTab user={user} showToast={showToast} />}
        {tab === 'favoris' && <FavoritesTab user={user} onContact={startConversation} onViewGallery={openGallery} />}
        {tab === 'admin' && profile.is_admin && <AdminTab showToast={showToast} />}
        {tab === 'galerie' && viewingGallery && (
          <GalleryTab userId={viewingGallery.userId} ownerName={viewingGallery.ownerName} readOnly={viewingGallery.userId !== user.id} showToast={showToast} />
        )}
      </main>

      <Toast message={toast} />
    </div>
  );
}
