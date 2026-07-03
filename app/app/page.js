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
import NotificationsBell from '@/components/NotificationsBell';
import UserMenu from '@/components/UserMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import { isProfileComplete } from '@/lib/profile-completion';

// Mappe chaque rôle vers son onglet "espace personnel" par défaut à la connexion
const ROLE_HOME_TAB = {
  joueur: 'joueur', club: 'club', sante: 'sante', preparateur: 'preparateur',
  entraineur: 'entraineur', arbitre: 'arbitre', benevole: 'benevole',
};

export default function AppPage() {
  const { user, profile, loading, suspended } = useUser();
  const supabase = createClient();
  const [tab, setTab] = useState(null); // null tant qu'on n'a pas déterminé l'onglet de départ
  const [toast, setToast] = useState(null);
  const [viewingGallery, setViewingGallery] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConvTarget, setPendingConvTarget] = useState(null);
  const [myPlayerListing, setMyPlayerListing] = useState(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!loading && !user && !suspended) { window.location.href = '/'; }
  }, [loading, user, suspended]);

  // Marque l'utilisateur comme actif récemment (affiché sur son profil aux autres)
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
  }, [user]);

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

  // Message de bienvenue une seule fois, à la toute première connexion sur cet appareil
  useEffect(() => {
    if (!user || !profile) return;
    const key = `tv-welcomed-${user.id}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      const msg = profile.role === 'club'
        ? 'Bienvenue sur Turnover ! Publie ton premier besoin pour commencer à recevoir des candidatures.'
        : 'Bienvenue sur Turnover ! Complète ton profil pour apparaître auprès des clubs qui recrutent.';
      setTimeout(() => showToast(msg), 600);
    }
  }, [user, profile]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const exportMyData = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { showToast('Session expirée.'); return; }
    const res = await fetch('/api/export-data', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { showToast("Erreur lors de l'export."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'turnover-mes-donnees.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteMyAccount = async () => {
    setDeletingAccount(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { showToast('Session expirée.'); setDeletingAccount(false); return; }
    const res = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { showToast('Erreur lors de la suppression du compte.'); setDeletingAccount(false); return; }
    window.location.href = '/';
  };

  // clubNeedId (optionnel) : quand un joueur contacte un club au sujet d'une offre précise,
  // ça permet de scoper le déblocage gratuit "un joueur choisi par offre" plutôt que par compte.
  const startConversation = async (otherId, otherName, contextLabel, clubNeedId = null) => {
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
        .from('conversations').insert({ participant_1: p1, participant_2: p2, context: contextLabel, club_need_id: clubNeedId }).select('id').single();
      if (error) { showToast(error.message?.includes('Trop de nouvelles conversations') ? error.message : "Impossible d'ouvrir la conversation."); return; }
      existing = created;
    }
    setPendingConvTarget({ conversationId: existing.id, otherName });
    setTab('messages');
  };

  const openGallery = (userId, ownerName) => {
    setViewingGallery({ userId, ownerName });
    setTab('galerie');
  };

  if (suspended) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B1F1A', color: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Ton compte a été suspendu</h1>
          <p style={{ fontSize: 14.5, color: '#A4B0A6', lineHeight: 1.6, marginBottom: 20 }}>
            L'accès à ton compte a été temporairement suspendu suite à un ou plusieurs signalements.
            Si tu penses qu'il s'agit d'une erreur, contacte-nous.
          </p>
          <a href="mailto:turn-over@outlook.fr" style={{ color: '#D4FF3F', fontWeight: 700, textDecoration: 'underline' }}>turn-over@outlook.fr</a>
        </div>
      </div>
    );
  }

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
        { key: 'club', label: 'Mon espace' },
        { key: 'recherche', label: 'Rechercher' },
        { key: 'favoris', label: 'Favoris' },
        { key: 'abonnement', label: 'Abonnement' },
        { key: 'messages', label: `Messages${unreadCount ? ` (${unreadCount})` : ''}` },
        ...(profile.is_admin ? [{ key: 'admin', label: 'Admin' }] : []),
      ]
    : [
        { key: ROLE_HOME_TAB[profile.role], label: 'Mon profil' },
        { key: 'recherche', label: 'Rechercher' },
        { key: 'favoris', label: 'Favoris' },
        { key: 'messages', label: `Messages${unreadCount ? ` (${unreadCount})` : ''}` },
        ...(profile.role === 'joueur' ? [{ key: 'galerie', label: 'Ma galerie' }] : []),
        ...(profile.is_admin ? [{ key: 'admin', label: 'Admin' }] : []),
      ];

  return (
    <div style={{ minHeight: '100vh', color: '#F5F0E6' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5vw', background: 'rgba(11,31,26,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1.5px solid #2C4A3D', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Turnover" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6 }} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationsBell user={user} onNavigate={(t) => setTab(t)} />
          <UserMenu
            nom={profile.nom}
            roleLabel={ROLE_LABELS[profile.role]}
            onExport={exportMyData}
            onDeleteRequest={() => setConfirmDeleteAccount(true)}
            onLogout={logout}
          />
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

      <ConfirmDialog
        open={confirmDeleteAccount}
        title="Supprimer définitivement ton compte ?"
        message="Cette action est irréversible : ton profil, tes annonces, tes messages et toutes tes données seront définitivement supprimés. Pense à exporter tes données avant si tu veux les conserver."
        confirmLabel={deletingAccount ? 'Suppression…' : 'Supprimer mon compte'}
        onConfirm={deleteMyAccount}
        onCancel={() => setConfirmDeleteAccount(false)}
      />

      <Toast message={toast} />
    </div>
  );
}
