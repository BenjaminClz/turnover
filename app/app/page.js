'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/use-user';
import { createClient } from '@/lib/supabase-client';
import { Badge, GhostButton, Toast } from '@/components/ui';
import PlayersTab from '@/components/PlayersTab';
import ClubsTab from '@/components/ClubsTab';
import SearchTab from '@/components/SearchTab';
import MessagesTab from '@/components/MessagesTab';
import GalleryTab from '@/components/GalleryTab';

export default function AppPage() {
  const { user, profile, loading } = useUser();
  const supabase = createClient();
  const [tab, setTab] = useState('joueur');
  const [toast, setToast] = useState(null);
  const [viewingGallery, setViewingGallery] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/';
    }
  }, [loading, user]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const [pendingConvTarget, setPendingConvTarget] = useState(null);

  const startConversation = async (otherId, otherName, contextLabel) => {
    if (otherId === user.id) { showToast("C'est ton propre profil."); return; }
    // participant_1 / participant_2 triés pour respecter la contrainte unique de la table
    const [p1, p2] = [user.id, otherId].sort();
    let { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ participant_1: p1, participant_2: p2, context: contextLabel })
        .select('id')
        .single();
      if (error) { showToast("Impossible d'ouvrir la conversation."); return; }
      existing = created;
    }
    setPendingConvTarget({ conversationId: existing.id, otherName });
    setTab('messages');
  };

  if (loading || !user || !profile) {
    return <div style={{ minHeight: '100vh', background: '#0B1F1A' }} />;
  }

  const tabs = [
    { key: 'joueur', label: 'Profils joueurs' },
    { key: 'club', label: 'Besoins clubs' },
    { key: 'recherche', label: 'Rechercher' },
    { key: 'messages', label: `Messages${unreadCount ? ` (${unreadCount})` : ''}` },
    ...(profile.role === 'joueur' ? [{ key: 'galerie', label: 'Ma galerie' }] : []),
  ];

  const openGallery = (userId, ownerName) => {
    setViewingGallery({ userId, ownerName });
    setTab('galerie');
  };

  return (
    <div style={{ minHeight: '100vh', color: '#F5F0E6' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 5vw', background: 'rgba(11,31,26,0.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #274238', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 9, height: 9, background: '#D4FF3F', borderRadius: '50%' }} />
          <span className="turnover-anton" style={{ fontSize: 20 }}>TURNOVER</span>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#152E26', padding: 4, borderRadius: 10, border: '1px solid #274238', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'galerie') setViewingGallery({ userId: user.id, ownerName: profile.nom }); }}
              style={{ padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.key ? '#D4FF3F' : 'transparent', color: tab === t.key ? '#0B1F1A' : '#8C9A8E' }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#8C9A8E' }}>{profile.nom} <Badge tone="lime">{profile.role}</Badge></span>
          <GhostButton onClick={logout}>Déconnexion</GhostButton>
        </div>
      </nav>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '40px 5vw 100px' }}>
        {tab === 'joueur' && <PlayersTab user={user} profile={profile} showToast={showToast} onContact={startConversation} onViewGallery={openGallery} />}
        {tab === 'club' && <ClubsTab user={user} profile={profile} showToast={showToast} onContact={startConversation} />}
        {tab === 'recherche' && <SearchTab user={user} showToast={showToast} onContact={startConversation} onViewGallery={openGallery} />}
        {tab === 'messages' && <MessagesTab user={user} profile={profile} setUnreadCount={setUnreadCount} pendingConvTarget={pendingConvTarget} clearPendingConvTarget={() => setPendingConvTarget(null)} />}
        {tab === 'galerie' && viewingGallery && (
          <GalleryTab
            userId={viewingGallery.userId}
            ownerName={viewingGallery.ownerName}
            readOnly={viewingGallery.userId !== user.id}
            showToast={showToast}
          />
        )}
      </main>

      <Toast message={toast} />
    </div>
  );
}
