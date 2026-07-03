'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { EmptyState, TextInput, PrimaryButton } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import { useSubscription } from '@/lib/use-subscription';
import ReportButton from '@/components/ReportButton';

export default function MessagesTab({ user, profile, setUnreadCount, pendingConvTarget, clearPendingConvTarget, showToast }) {
  const supabase = createClient();
  const isClub = profile?.role === 'club';
  const { isActive } = useSubscription(isClub ? user.id : null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, context, participant_1, participant_2, unlocked_by_club, club_need_id,
        p1:profiles!conversations_participant_1_fkey(id, nom, avatar_path),
        p2:profiles!conversations_participant_2_fkey(id, nom, avatar_path)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (error) { setLoading(false); return; }
    setConversations(data || []);
    setLoading(false);
    return data || [];
  };

  useEffect(() => { loadConversations(); }, []);

  // Si on arrive depuis un bouton "Contacter", on ouvre directement la conversation créée
  useEffect(() => {
    if (pendingConvTarget) {
      setActiveConvId(pendingConvTarget.conversationId);
      loadConversations().then(clearPendingConvTarget);
    }
  }, [pendingConvTarget]);

  // Un club gratuit a-t-il déjà utilisé son déblocage gratuit pour CETTE offre précise
  // (ou, pour les contacts hors offre, son déblocage gratuit "général") ?
  const alreadyUnlockedForScope = (convId, clubNeedId) =>
    conversations.some((c) =>
      c.unlocked_by_club &&
      c.id !== convId &&
      (clubNeedId ? c.club_need_id === clubNeedId : !c.club_need_id)
    );

  const isLockedForMe = (conv) => {
    if (!conv) return false;
    if (!isClub) return false; // un joueur n'est jamais bloqué pour voir SES propres messages
    if (isActive) return false; // club abonné : jamais bloqué
    return !conv.unlocked_by_club; // club gratuit : bloqué sauf si cette conversation précise est débloquée
  };

  const handleUnlock = async (conv) => {
    if (alreadyUnlockedForScope(conv.id, conv.club_need_id)) {
      return; // sécurité : ne devrait pas arriver, le bouton est déjà caché dans ce cas
    }
    setUnlocking(true);
    const { error } = await supabase.from('conversations').update({ unlocked_by_club: true }).eq('id', conv.id);
    setUnlocking(false);
    if (error) return;
    await loadConversations();
  };

  // Charge les messages de la conversation active + s'abonne au temps réel
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const conv = conversations.find((c) => c.id === activeConvId);
    if (isLockedForMe(conv)) { setMessages([]); return; } // ne charge pas le contenu si verrouillé

    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });
      if (isMounted) setMessages(data || []);
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', activeConvId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    })();

    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` }, async (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        if (payload.new.sender_id !== user.id) {
          await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', payload.new.id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
      })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [activeConvId, conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeConvId) return;
    const content = msgInput.trim();
    setMsgInput('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvId, sender_id: user.id, content,
    });
    if (error) setMsgInput(content);
  };

  const otherOf = (conv) => (conv.participant_1 === user.id ? conv.p2 : conv.p1);
  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeLocked = isLockedForMe(activeConv);

  if (loading) return <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 24 }}>Messages</h1>
      {conversations.length === 0 ? (
        <EmptyState icon="💬" title="Aucune conversation" sub="Clique sur « Contacter » depuis un profil ou un besoin pour démarrer une discussion." />
      ) : (
        <div className="tv-messages-grid" style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, overflow: 'hidden', minHeight: 480 }}>
          <div className={activeConvId ? 'tv-messages-list-mobile-hidden' : ''} style={{ borderRight: '1px solid #274238', overflowY: 'auto' }}>
            {conversations.map((c) => {
              const other = otherOf(c);
              const url = avatarUrl(supabase, other?.avatar_path);
              const locked = isLockedForMe(c);
              return (
                <div key={c.id} className="tv-card" onClick={() => setActiveConvId(c.id)} style={{ padding: 16, borderBottom: '1px solid #274238', cursor: 'pointer', background: activeConvId === c.id ? 'rgba(212,255,63,0.08)' : 'transparent', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {url && <img src={url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0, opacity: locked ? 0.5 : 1 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {other?.nom}
                      {locked && <span style={{ fontSize: 11 }}>🔒</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#8C9A8E', marginTop: 2 }}>{c.context}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={activeConvId ? '' : 'tv-messages-detail-mobile-hidden'} style={{ display: 'flex', flexDirection: 'column' }}>
            {activeConv && (
              <button
                className="tv-messages-back"
                onClick={() => setActiveConvId(null)}
                style={{ display: 'none', background: 'transparent', border: 'none', color: '#D4FF3F', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '12px 16px', textAlign: 'left' }}
              >
                ← Retour aux conversations
              </button>
            )}
            {!activeConv ? (
              <EmptyState icon="💬" title="Sélectionne une conversation" sub="Choisis une discussion dans la liste à gauche." />
            ) : activeLocked ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🔒</div>
                <h3 style={{ fontSize: 17, marginBottom: 8 }}>Candidature de {otherOf(activeConv)?.nom}</h3>
                <p style={{ fontSize: 14, color: '#A4B0A6', marginBottom: 24, maxWidth: 340 }}>
                  {alreadyUnlockedForScope(activeConv.id, activeConv.club_need_id)
                    ? (activeConv.club_need_id
                        ? "Tu as déjà choisi un joueur pour cette offre. Passe à l'abonnement Pro pour voir tous les autres candidats."
                        : "Tu as déjà débloqué une autre candidature gratuitement. Passe à l'abonnement Pro pour accéder à toutes tes candidatures.")
                    : (activeConv.club_need_id
                        ? "Débloque ce joueur gratuitement pour cette offre (un seul choix gratuit par offre), ou passe à l'abonnement Pro pour voir tous les candidats sans limite."
                        : "Débloque cette candidature gratuitement (une seule fois), ou passe à l'abonnement Pro pour accéder à toutes tes candidatures sans limite.")}
                </p>
                {!alreadyUnlockedForScope(activeConv.id, activeConv.club_need_id) && (
                  <PrimaryButton onClick={() => handleUnlock(activeConv)} disabled={unlocking} style={{ width: 'auto', marginBottom: 12 }}>
                    {unlocking ? 'Déblocage…' : (activeConv.club_need_id ? 'Choisir ce joueur (gratuit)' : 'Débloquer cette candidature (gratuit)')}
                  </PrimaryButton>
                )}
              </div>
            ) : (
              <>
                <div style={{ padding: 16, borderBottom: '1px solid #274238', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {avatarUrl(supabase, otherOf(activeConv)?.avatar_path) && (
                    <img src={avatarUrl(supabase, otherOf(activeConv)?.avatar_path)} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{otherOf(activeConv)?.nom}</div>
                    <div style={{ fontSize: 12, color: '#8C9A8E' }}>{activeConv.context}</div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', maxHeight: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.length === 0 && <div style={{ color: '#8C9A8E', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Dis bonjour pour démarrer la conversation.</div>}
                  {messages.map((m) => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === user.id ? 'flex-end' : 'flex-start', maxWidth: '75%', alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.4,
                        background: m.sender_id === user.id ? '#D4FF3F' : '#0B1F1A',
                        color: m.sender_id === user.id ? '#0B1F1A' : '#F5F0E6',
                        fontWeight: m.sender_id === user.id ? 600 : 400,
                        border: m.sender_id === user.id ? 'none' : '1px solid #274238',
                      }}>{m.content}</div>
                      {m.sender_id === user.id ? (
                        <span style={{ fontSize: 11, color: m.read_at ? '#D4FF3F' : '#8C9A8E', marginTop: 3, marginRight: 2 }}>
                          {m.read_at ? '✓✓ Lu' : '✓ Envoyé'}
                        </span>
                      ) : (
                        <ReportButton targetType="message" targetId={m.id} targetOwnerId={m.sender_id} reporterId={user.id} showToast={showToast} style={{ marginTop: 3, marginLeft: 2 }} />
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid #274238' }}>
                  <TextInput value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }} placeholder="Écris un message…" />
                  <button className="tv-btn" onClick={sendMessage} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '0 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Envoyer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
