'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { TextArea, EmptyState, PageTitle, PageSubtitle } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import ConfirmDialog from '@/components/ConfirmDialog';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function FeedTab({ user, profile, showToast }) {
  const supabase = createClient();
  const [posts, setPosts] = useState([]);
  const [likesByPost, setLikesByPost] = useState({}); // { postId: { count, likedByMe } }
  const [loading, setLoading] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*, profiles(nom, avatar_path, role)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { showToast('Erreur de chargement du fil.'); setLoading(false); return; }
    setPosts(postsData || []);

    const ids = (postsData || []).map((p) => p.id);
    if (ids.length > 0) {
      const { data: likesData } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', ids);
      const grouped = {};
      (likesData || []).forEach((l) => {
        if (!grouped[l.post_id]) grouped[l.post_id] = { count: 0, likedByMe: false };
        grouped[l.post_id].count += 1;
        if (l.user_id === user.id) grouped[l.post_id].likedByMe = true;
      });
      setLikesByPost(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const publish = async () => {
    if (!composerText.trim()) return;
    setPublishing(true);
    const { error } = await supabase.from('posts').insert({ author_id: user.id, content: composerText.trim() });
    setPublishing(false);
    if (error) {
      showToast(`Erreur : ${error.message}`);
      console.error('DEBUG publication :', error);
      return;
    }
    setComposerText('');
    load();
  };

  const toggleLike = async (postId) => {
    const current = likesByPost[postId] || { count: 0, likedByMe: false };
    // Mise à jour optimiste, cohérente avec le reste du site (favoris).
    setLikesByPost((prev) => ({
      ...prev,
      [postId]: { count: current.count + (current.likedByMe ? -1 : 1), likedByMe: !current.likedByMe },
    }));
    if (current.likedByMe) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) setLikesByPost((prev) => ({ ...prev, [postId]: current }));
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (error) setLikesByPost((prev) => ({ ...prev, [postId]: current }));
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <PageTitle>Actualités</PageTitle>
      <PageSubtitle>Ce que publient les joueurs et les clubs de la communauté Turnover.</PageSubtitle>

      <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 18, marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {profile?.avatar_path ? (
            <img src={avatarUrl(supabase, profile.avatar_path)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 14, flexShrink: 0 }}>
              {initials(profile?.nom)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <TextArea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Partage une actualité, un résultat, une info à ta communauté…"
              style={{ minHeight: 70 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={publish}
                disabled={!composerText.trim() || publishing}
                style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: !composerText.trim() || publishing ? 0.5 : 1 }}
              >
                {publishing ? 'Publication…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : posts.length === 0 ? (
        <EmptyState icon="📰" title="Aucune publication pour le moment" sub="Sois le premier à partager une actualité avec la communauté." />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {posts.map((post) => {
            const likes = likesByPost[post.id] || { count: 0, likedByMe: false };
            const url = post.profiles?.avatar_path ? avatarUrl(supabase, post.profiles.avatar_path) : null;
            return (
              <div key={post.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {url ? (
                    <img src={url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 13, flexShrink: 0 }}>
                      {initials(post.profiles?.nom)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{post.profiles?.nom}</div>
                    <div style={{ fontSize: 12, color: '#8C9A8E' }}>{timeAgo(post.created_at)}</div>
                  </div>
                  {post.author_id === user.id && (
                    <button onClick={() => setConfirmDeleteId(post.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', color: '#8C9A8E', cursor: 'pointer', fontSize: 13, padding: 4 }}>
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 14.5, color: '#F5F0E6', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.content}</div>
                <button
                  onClick={() => toggleLike(post.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: likes.likedByMe ? '#D4FF3F' : '#8C9A8E', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
                >
                  <span style={{ fontSize: 16 }}>{likes.likedByMe ? '👍' : '👍🏻'}</span>
                  {likes.count > 0 ? likes.count : "J'aime"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer cette publication ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); handleDelete(id); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
