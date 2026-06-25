'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { EmptyState, TextInput } from '@/components/ui';

export default function MessagesTab({ user, profile, setUnreadCount, pendingConvTarget, clearPendingConvTarget }) {
  const supabase = createClient();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, context, participant_1, participant_2,
        p1:profiles!conversations_participant_1_fkey(id, nom),
        p2:profiles!conversations_participant_2_fkey(id, nom)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (error) { setLoading(false); return; }
    setConversations(data || []);
    setLoading(false);
  };

  useEffect(() => { loadConversations(); }, []);

  // Si on arrive depuis un bouton "Contacter", on ouvre directement la conversation créée
  useEffect(() => {
    if (pendingConvTarget) {
      setActiveConvId(pendingConvTarget.conversationId);
      loadConversations().then(clearPendingConvTarget);
    }
  }, [pendingConvTarget]);

  // Charge les messages de la conversation active + s'abonne au temps réel
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }

    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });
      if (isMounted) setMessages(data || []);
    })();

    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [activeConvId]);

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
    if (error) setMsgInput(content); // on remet le texte si l'envoi échoue
  };

  const otherOf = (conv) => (conv.participant_1 === user.id ? conv.p2 : conv.p1);
  const activeConv = conversations.find((c) => c.id === activeConvId);

  if (loading) return <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 24 }}>Messages</h1>
      {conversations.length === 0 ? (
        <EmptyState icon="💬" title="Aucune conversation" sub="Clique sur « Contacter » depuis un profil ou un besoin pour démarrer une discussion." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', background: '#152E26', border: '1px solid #274238', borderRadius: 16, overflow: 'hidden', minHeight: 480 }}>
          <div style={{ borderRight: '1px solid #274238', overflowY: 'auto' }}>
            {conversations.map((c) => {
              const other = otherOf(c);
              return (
                <div key={c.id} onClick={() => setActiveConvId(c.id)} style={{ padding: 16, borderBottom: '1px solid #274238', cursor: 'pointer', background: activeConvId === c.id ? 'rgba(212,255,63,0.08)' : 'transparent' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{other?.nom}</div>
                  <div style={{ fontSize: 11, color: '#8C9A8E', marginTop: 2 }}>{c.context}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!activeConv ? (
              <EmptyState icon="💬" title="Sélectionne une conversation" sub="Choisis une discussion dans la liste à gauche." />
            ) : (
              <>
                <div style={{ padding: 16, borderBottom: '1px solid #274238' }}>
                  <div style={{ fontWeight: 700 }}>{otherOf(activeConv)?.nom}</div>
                  <div style={{ fontSize: 12, color: '#8C9A8E' }}>{activeConv.context}</div>
                </div>
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', maxHeight: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.length === 0 && <div style={{ color: '#8C9A8E', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Dis bonjour pour démarrer la conversation.</div>}
                  {messages.map((m) => (
                    <div key={m.id} style={{
                      maxWidth: '75%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.4,
                      alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start',
                      background: m.sender_id === user.id ? '#D4FF3F' : '#0B1F1A',
                      color: m.sender_id === user.id ? '#0B1F1A' : '#F5F0E6',
                      fontWeight: m.sender_id === user.id ? 600 : 400,
                      border: m.sender_id === user.id ? 'none' : '1px solid #274238',
                    }}>{m.content}</div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid #274238' }}>
                  <TextInput value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }} placeholder="Écris un message…" />
                  <button onClick={sendMessage} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '0 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Envoyer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
