'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { TextArea, EmptyState, PageTitle, PageSubtitle } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import ConfirmDialog from '@/components/ConfirmDialog';
import PlayerProfileModal from '@/components/PlayerProfileModal';
import ClubProfileModal from '@/components/ClubProfileModal';
import StaffProfileModal from '@/components/StaffProfileModal';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const MAX_FILES = 10;

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

function MediaCarousel({ media }) {
  const [idx, setIdx] = useState(0);
  if (!media || media.length === 0) return null;
  const current = media[idx];

  return (
    <div style={{ position: 'relative', marginBottom: 12, borderRadius: 10, overflow: 'hidden', background: '#0B1F1A' }}>
      {current.type === 'video' ? (
        <video src={current.url} controls style={{ width: '100%', maxHeight: 420, display: 'block' }} />
      ) : (
        <img src={current.url} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
      )}
      {media.length > 1 && (
        <>
          <button
            onClick={() => setIdx((idx - 1 + media.length) % media.length)}
            className="tv-carousel-arrow"
            style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(11,31,26,0.75)', border: '1px solid rgba(255,255,255,0.2)', color: '#F5F0E6', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ‹
          </button>
          <button
            onClick={() => setIdx((idx + 1) % media.length)}
            className="tv-carousel-arrow"
            style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(11,31,26,0.75)', border: '1px solid rgba(255,255,255,0.2)', color: '#F5F0E6', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ›
          </button>
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
            {media.map((_, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#D4FF3F' : 'rgba(255,255,255,0.4)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(11,31,26,0.75)', color: '#F5F0E6', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10 }}>
            {idx + 1}/{media.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function FeedTab({ user, profile, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const [posts, setPosts] = useState([]);
  const [likesByPost, setLikesByPost] = useState({});
  const [loading, setLoading] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]); // [{ file, url, type }]
  const [publishing, setPublishing] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [viewingClub, setViewingClub] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const STAFF_ROLES = ['sante', 'preparateur', 'entraineur', 'arbitre', 'benevole'];

  const openAuthorProfile = async (post) => {
    const role = post.profiles?.role;
    if (role === 'club') {
      setViewingClub({ ownerId: post.author_id, clubName: post.profiles?.nom });
      return;
    }
    if (role === 'joueur') {
      setLoadingProfile(true);
      const { data } = await supabase
        .from('player_listings')
        .select('*, profiles(nom, avatar_path, last_seen_at)')
        .eq('owner_id', post.author_id)
        .maybeSingle();
      setLoadingProfile(false);
      if (!data) { showToast('Profil introuvable.'); return; }
      setViewingPlayer(data);
      return;
    }
    if (STAFF_ROLES.includes(role)) {
      setLoadingProfile(true);
      const { data } = await supabase
        .from('staff_listings')
        .select('*, profiles(nom, avatar_path, last_seen_at)')
        .eq('owner_id', post.author_id)
        .maybeSingle();
      setLoadingProfile(false);
      if (!data) { showToast('Profil introuvable.'); return; }
      setViewingStaff(data);
      return;
    }
    showToast('Profil introuvable.');
  };

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

  const onSelectMedia = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (mediaFiles.length + files.length > MAX_FILES) {
      showToast(`Maximum ${MAX_FILES} fichiers par publication.`);
      return;
    }
    const valid = [];
    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showToast(`${file.name} : type non supporté.`);
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        showToast(`${file.name} dépasse 25 Mo.`);
        continue;
      }
      valid.push({ file, url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image' });
    }
    setMediaFiles((prev) => [...prev, ...valid]);
  };

  const removeMediaAt = (i) => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));

  const publish = async () => {
    if (!composerText.trim() && mediaFiles.length === 0) return;
    setPublishing(true);

    const uploadedMedia = [];
    if (mediaFiles.length > 0) {
      setUploadingMedia(true);
      for (const { file, type } of mediaFiles) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // Envoi dans le même bucket que la galerie de profil, pour que les photos
        // publiées dans le fil apparaissent aussi automatiquement dans « Ma galerie ».
        const { error: uploadError } = await supabase.storage.from('gallery').upload(path, file);
        if (uploadError) {
          showToast(`Erreur média (${file.name}) : ${uploadError.message}`);
          continue;
        }
        const { error: galleryError } = await supabase.from('gallery_items').insert({
          owner_id: user.id, file_path: path, media_type: type,
        });
        if (galleryError) console.error('DEBUG ajout galerie :', galleryError);

        const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(path);
        uploadedMedia.push({ url: publicUrlData.publicUrl, type });
      }
      setUploadingMedia(false);
    }

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      content: composerText.trim(),
      media: uploadedMedia,
    });
    setPublishing(false);
    if (error) {
      showToast(`Erreur : ${error.message}`);
      console.error('DEBUG publication :', error);
      return;
    }
    setComposerText('');
    setMediaFiles([]);
    load();
  };

  const toggleLike = async (postId) => {
    const current = likesByPost[postId] || { count: 0, likedByMe: false };
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

      <div className="tv-feed-composer" style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 18, marginBottom: 28 }}>
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
            {mediaFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {mediaFiles.map((m, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {m.type === 'video' ? (
                      <video src={m.url} style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <img src={m.url} alt="" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 8 }} />
                    )}
                    <button
                      onClick={() => removeMediaAt(i)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#0B1F1A', border: '1.5px solid #2C4A3D', color: '#F5F0E6', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#A4B0A6', cursor: 'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                Photos / vidéos
                <input type="file" accept="image/*,video/*" multiple onChange={onSelectMedia} style={{ display: 'none' }} />
              </label>
              <button
                onClick={publish}
                disabled={(!composerText.trim() && mediaFiles.length === 0) || publishing}
                style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: (!composerText.trim() && mediaFiles.length === 0) || publishing ? 0.5 : 1 }}
              >
                {uploadingMedia ? 'Envoi des médias…' : publishing ? 'Publication…' : 'Publier'}
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
            const mediaList = post.media?.length > 0 ? post.media : (post.media_url ? [{ url: post.media_url, type: post.media_type }] : []);
            return (
              <div key={post.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <button onClick={() => openAuthorProfile(post)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    {url ? (
                      <img src={url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 13, flexShrink: 0 }}>
                        {initials(post.profiles?.nom)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#F5F0E6' }}>{post.profiles?.nom}</div>
                      <div style={{ fontSize: 12, color: '#8C9A8E' }}>{timeAgo(post.created_at)}</div>
                    </div>
                  </button>
                  {post.author_id === user.id && (
                    <button onClick={() => setConfirmDeleteId(post.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', color: '#8C9A8E', cursor: 'pointer', fontSize: 13, padding: 4 }}>
                      ✕
                    </button>
                  )}
                </div>
                {post.content && <div style={{ fontSize: 14.5, color: '#F5F0E6', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.content}</div>}
                <MediaCarousel media={mediaList} />
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

      <PlayerProfileModal
        player={viewingPlayer}
        supabase={supabase}
        currentUserId={user.id}
        onClose={() => setViewingPlayer(null)}
        onContact={onContact}
        onViewGallery={onViewGallery}
      />
      <ClubProfileModal
        ownerId={viewingClub?.ownerId}
        clubName={viewingClub?.clubName}
        supabase={supabase}
        currentUserId={user.id}
        onClose={() => setViewingClub(null)}
        onContact={onContact}
        onViewGallery={onViewGallery}
      />
      <StaffProfileModal
        staff={viewingStaff}
        supabase={supabase}
        currentUserId={user.id}
        onClose={() => setViewingStaff(null)}
        onContact={onContact}
      />
    </div>
  );
}
