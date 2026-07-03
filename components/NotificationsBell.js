'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function NotificationsBell({ user, onNavigate }) {
  const supabase = createClient();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifs(data || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = notifs.filter((n) => !n.read_at).length;

  const handleClick = async (n) => {
    if (!n.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
      load();
    }
    setOpen(false);
    if (n.link_tab) onNavigate(n.link_tab);
  };

  const markAllRead = async () => {
    const unreadIds = notifs.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    load();
  };

  const timeAgo = (dateStr) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `${days} j`;
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="tv-btn"
        style={{ position: 'relative', background: 'transparent', border: '1.5px solid #2C4A3D', color: '#F5F0E6', width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#D4FF3F', color: '#0B1F1A', fontSize: 10.5, fontWeight: 800, minWidth: 17, height: 17, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 48, right: 0, width: 320, maxHeight: 420, overflowY: 'auto', background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #2C4A3D' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: '#A4B0A6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                Tout marquer lu
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: '#8C9A8E', fontSize: 13.5 }}>Aucune notification pour le moment.</div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{ padding: '12px 16px', borderBottom: '1px solid #223a30', cursor: 'pointer', background: n.read_at ? 'transparent' : 'rgba(212,255,63,0.06)' }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {!n.read_at && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4FF3F', marginTop: 5, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#F5F0E6' }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12.5, color: '#A4B0A6', marginTop: 2 }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: '#5C6B5E', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
