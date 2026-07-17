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
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
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
    if (!composerText.trim() && !mediaFile) return;
    setPublishing(true);

    let media_url = null;
    let media_type = null;
    if (mediaFile) {
      setUploadingMedia(true);
      const isVideo = mediaFile.type.startsWith('video/');
      media_type = isVideo ? 'video' : 'image';
      const ext = mediaFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // On envoie dans le même bucket que la galerie de profil, pour que la photo
      // publiée dans le fil apparaisse aussi automatiquement dans « Ma galerie ».
      const { error: uploadError } = await supabase.storage.from('gallery').upload(path, mediaFile);
      if (uploadError) {
        setUploadingMedia(false);
        showToast(`Erreur média : ${uploadError.message}`);
        setPublishing(false);
        return;
      }
      const { error: galleryError } = await supabase.from('gallery_items').insert({
        owner_id: user.id, file_path: path, media_type,
      });
      if (galleryError) {
        console.error('DEBUG ajout galerie :', galleryError);
        // On continue quand même la publication même si l'ajout à la galerie échoue.
      }

      const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(path);
      media_url = publicUrlData.publicUrl;
      setUploadingMedia(false);
    }

    const { error } = await supabase.from('posts').insert({ author_id: user.id, content: composerText.trim(), media_url, media_type });
    setPublishing(false);
    if (error) {
      showToast(`Erreur : ${error.message}`);
      console.error('DEBUG publication :', error);
      return;
    }
    setComposerText('');
    setMediaFile(null);
    setMediaPreview(null);
    load();
  };

  const onSelectMedia = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Seules les images et vidéos sont acceptées.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Fichier trop volumineux (25 Mo max).');
      return;
    }
    setMediaFile(file);
    setMediaPreview({ url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image' });
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
            {mediaPreview && (
              <div style={{ position: 'relative', marginTop: 10, display: 'inline-block' }}>
                {mediaPreview.type === 'video' ? (
                  <video src={mediaPreview.url} style={{ maxHeight: 160, borderRadius: 10 }} controls />
                ) : (
                  <img src={mediaPreview.url} alt="" style={{ maxHeight: 160, borderRadius: 10 }} />
                )}
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#0B1F1A', border: '1.5px solid #2C4A3D', color: '#F5F0E6', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#A4B0A6', cursor: 'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                Photo / vidéo
                <input type="file" accept="image/*,video/*" onChange={onSelectMedia} style={{ display: 'none' }} />
              </label>
              <button
                onClick={publish}
                disabled={(!composerText.trim() && !mediaFile) || publishing}
                style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: (!composerText.trim() && !mediaFile) || publishing ? 0.5 : 1 }}
              >
                {uploadingMedia ? 'Envoi du média…' : publishing ? 'Publication…' : 'Publier'}
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
                {post.content && <div style={{ fontSize: 14.5, color: '#F5F0E6', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.content}</div>}
                {post.media_url && (
                  post.media_type === 'video' ? (
                    <video src={post.media_url} controls style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 420 }} />
                  ) : (
                    <img src={post.media_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 420, objectFit: 'cover' }} />
                  )
                )}
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
