'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import FeedTab from '@/components/FeedTab';
import NotificationsBell from '@/components/NotificationsBell';
import UserMenu from '@/components/UserMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import { isProfileComplete } from '@/lib/profile-completion';

const ROLE_HOME_TAB = {
  joueur: 'joueur', club: 'club', sante: 'sante', preparateur: 'preparateur',
  entraineur: 'entraineur', arbitre: 'arbitre', benevole: 'benevole',
};

// Titres d'onglet affichés dans la barre du navigateur (utile quand plusieurs
// onglets Turnover sont ouverts en même temps).
const TAB_TITLES = {
  joueur: 'Mon profil', club: 'Mon espace', sante: 'Mon profil', preparateur: 'Mon profil',
  entraineur: 'Mon profil', arbitre: 'Mon profil', benevole: 'Mon profil',
  recherche: 'Rechercher', messages: 'Messages', favoris: 'Favoris', abonnement: 'Abonnement',
  actualites: 'Actualités', admin: 'Admin', galerie: 'Galerie',
};

export default function AppPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0B1F1A' }} />}>
      <AppPageInner />
    </Suspense>
  );
}

function AppPageInner() {
  const { user, profile, loading, suspended } = useUser();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get('tab');
  const setTab = (newTab, { replace = false } = {}) => {
    const method = replace ? 'replace' : 'push';
    router[method](`/app?tab=${newTab}`, { scroll: false });
    // Ramène en haut de page lors d'un changement d'onglet volontaire (clic),
    // sans perturber le comportement du bouton retour du navigateur.
    if (!replace && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

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

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
  }, [user]);

  useEffect(() => {
    if (profile?.role !== 'joueur') return;
    (async () => {
      const { data } = await supabase.from('player_listings').select('*').eq('owner_id', user.id).maybeSingle();
      setMyPlayerListing(data || null);
    })();
  }, [profile, tab]);

  useEffect(() => {
    if (profile && !tab) {
      setTab(ROLE_HOME_TAB[profile.role] || 'recherche', { replace: true });
    }
  }, [profile, tab]);

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

  // Titre de l'onglet du navigateur, mis à jour selon l'écran affiché.
  useEffect(() => {
    if (!tab) return;
    document.title = `${TAB_TITLES[tab] || 'Turnover'} — Turnover`;
  }, [tab]);

  // Raccourci clavier "/" pour aller directement à la recherche, sauf si
  // l'utilisateur est en train de taper dans un champ.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== '/') return;
      const target = e.target;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      setTab('recherche');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

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

  if (loading || !user || !profile || !tab) {
    return <div style={{ minHeight: '100vh', background: '#0B1F1A' }} />;
  }

  const STAFF_ROLES = ['sante', 'preparateur', 'entraineur', 'arbitre', 'benevole'];

  // "Abonnement" est un réglage de compte, pas un contenu à parcourir : il vit
  // désormais dans le menu déroulant du profil, pas dans la barre d'onglets.
  // L'ordre des onglets restants reflète la fréquence d'usage réelle :
  // Messages (consulté au quotidien) passe avant Favoris (consulté occasionnellement).
  const tabs = profile.role === 'club'
    ? [
        { key: 'club', label: 'Mon espace' },
        { key: 'actualites', label: 'Actualités' },
        { key: 'recherche', label: 'Rechercher' },
        { key: 'messages', label: `Messages${unreadCount ? ` (${unreadCount})` : ''}` },
        { key: 'favoris', label: 'Favoris' },
        ...(profile.is_admin ? [{ key: 'admin', label: 'Admin' }] : []),
      ]
    : [
        { key: ROLE_HOME_TAB[profile.role], label: 'Mon profil' },
        { key: 'actualites', label: 'Actualités' },
        { key: 'recherche', label: 'Rechercher' },
        { key: 'messages', label: `Messages${unreadCount ? ` (${unreadCount})` : ''}` },
        { key: 'favoris', label: 'Favoris' },
        ...(profile.role === 'joueur' ? [{ key: 'galerie', label: 'Ma galerie' }] : []),
        ...(profile.is_admin ? [{ key: 'admin', label: 'Admin' }] : []),
      ];

  return (
    <div style={{ minHeight: '100vh', color: '#F5F0E6' }}>
      <nav className="tv-navbar" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '18px 5vw', background: 'rgba(11,31,26,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1.5px solid #2C4A3D' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Turnover" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6 }} />
          <span className="turnover-anton" style={{ fontSize: 30 }}>TURNOVER</span>
        </div>
        <div className="tv-tabs-scroll" style={{ display: 'flex', gap: 4, background: '#152E26', padding: 5, borderRadius: 12, border: '1.5px solid #2C4A3D' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className="tv-tab-btn"
              onClick={() => {
                if (t.key === 'messages' && profile.role === 'joueur' && !isProfileComplete(myPlayerListing)) {
                  showToast('Complète ton profil pour débloquer la messagerie.');
                  setTab('joueur');
                  return;
                }
                if (t.key === 'galerie') setViewingGallery({ userId: user.id, ownerName: profile.nom });
                setTab(t.key);
              }}
              style={{ padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 600, background: tab === t.key ? '#D4FF3F' : 'transparent', color: tab === t.key ? '#0B1F1A' : '#A4B0A6', whiteSpace: 'nowrap', flexShrink: 0 }}
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
            showSubscription={profile.role === 'club'}
            onSubscription={() => setTab('abonnement')}
            onExport={exportMyData}
            onDeleteRequest={() => setConfirmDeleteAccount(true)}
            onLogout={logout}
          />
        </div>
      </nav>

      <main key={tab} className="tv-fade-in" style={{ maxWidth: 960, margin: '0 auto', padding: '44px 5vw 110px' }}>
        {tab === 'joueur' && <PlayersTab user={user} profile={profile} showToast={showToast} onContact={startConversation} onViewGallery={openGallery} />}
        {tab === 'club' && <ClubsTab user={user} profile={profile} showToast={showToast} onContact={startConversation} />}
        {STAFF_ROLES.includes(tab) && <StaffTab role={tab} user={user} profile={profile} showToast={showToast} onContact={startConversation} />}
        {tab === 'actualites' && <FeedTab user={user} profile={profile} showToast={showToast} />}
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
