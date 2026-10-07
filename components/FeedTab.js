'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { TextArea } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ROLE_LABELS } from '@/lib/constants';

const C = { bg: '#0B1F1A', panel: '#0F241E', line: '#24423A', soft: '#1A332B', text: '#E8EEE9', muted: '#8FA096', sub: '#C7CFC8', lime: '#D4FF3F', ink: '#0B1F1A' };
const MAX_FILES = 10;
const LONG_TEXT = 180;

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const firstName = (name) => (name || '').split(' ')[0];

const timeAgo = (dateStr) => {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const Icon = ({ d, size = 24, fill = 'none', stroke = 'currentColor', width = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const HEART = 'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.5 1.1 4.6 2.7C13.1 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z';
const SEND = 'M22 3 9.5 15.5M22 3l-7 19-5.5-6.5L3 10l19-7z';
const MORE = 'M5 12h.01M12 12h.01M19 12h.01';
const IMAGE = 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15.5 8.5h.01';
const CLOSE = 'M18 6 6 18M6 6l12 12';
const CHEV_L = 'M15 18l-6-6 6-6';
const CHEV_R = 'M9 18l6-6-6-6';

const css = `
.fd-layout { display: grid; grid-template-columns: minmax(0, 580px) 320px; gap: 88px; justify-content: center; padding-top: 8px; }
.fd-side { position: sticky; top: 84px; align-self: start; }
@media (max-width: 1100px) { .fd-layout { grid-template-columns: minmax(0, 600px); } .fd-side { display: none; } }
.fd-tab { background: transparent; border: none; border-bottom: 2px solid transparent; padding: 12px 0; margin-right: 24px; color: ${C.muted}; font-size: 15px; font-weight: 600; cursor: pointer; }
.fd-tab[aria-selected="true"] { color: ${C.text}; border-bottom-color: ${C.lime}; }
.fd-icon { background: transparent; border: none; padding: 6px; margin-left: -6px; color: ${C.text}; cursor: pointer; display: inline-flex; border-radius: 50%; transition: color .12s ease, transform .1s ease; }
.fd-icon:hover { color: ${C.muted}; }
.fd-icon:active { transform: scale(0.88); }
.fd-link { background: transparent; border: none; padding: 0; color: inherit; cursor: pointer; font: inherit; text-align: left; }
.fd-link:hover { opacity: .8; }
.fd-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; background: rgba(232,238,233,0.85); color: ${C.ink}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: .9; }
.fd-arrow:hover { opacity: 1; }
@keyframes fd-pop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0; } 15% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; } 30% { transform: translate(-50%,-50%) scale(.95); } 45%, 80% { transform: translate(-50%,-50%) scale(1); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 0; } }
@keyframes fd-like { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
.fd-liked { animation: fd-like .3s ease; }
`;

function Avatar({ supabase, path, name, size = 32 }) {
  const src = path ? avatarUrl(supabase, path) : null;
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.line}` }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: C.soft, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontSize: Math.round(size * 0.36), fontWeight: 600, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

function MediaCarousel({ media, onDoubleTap, pop }) {
  const [idx, setIdx] = useState(0);
  if (!media || media.length === 0) return null;
  const current = media[idx];

  return (
    <div style={{ marginTop: 10 }}>
      <div onDoubleClick={onDoubleTap} style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', background: '#000', border: `1px solid ${C.line}`, userSelect: 'none' }}>
        {current.type === 'video' ? (
          <video src={current.url} controls style={{ width: '100%', maxHeight: 600, objectFit: 'contain', display: 'block' }} />
        ) : (
          <img src={current.url} alt="" draggable={false} style={{ width: '100%', maxHeight: 600, objectFit: 'contain', display: 'block' }} />
        )}
        {pop && (
          <span style={{ position: 'absolute', top: '50%', left: '50%', color: C.lime, animation: 'fd-pop .9s ease forwards', pointerEvents: 'none', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.45))' }}>
            <Icon d={HEART} size={96} fill="currentColor" stroke="none" />
          </span>
        )}
        {media.length > 1 && (
          <>
            {idx > 0 && <button className="fd-arrow" style={{ left: 10 }} onClick={() => setIdx(idx - 1)} aria-label="Précédent"><Icon d={CHEV_L} size={16} width={2.4} /></button>}
            {idx < media.length - 1 && <button className="fd-arrow" style={{ right: 10 }} onClick={() => setIdx(idx + 1)} aria-label="Suivant"><Icon d={CHEV_R} size={16} width={2.4} /></button>}
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10 }}>
              {idx + 1}/{media.length}
            </div>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
          {media.map((_, i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? C.lime : C.line, transition: 'background .15s ease' }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedTab({ user, profile, showToast, onContact, onViewGallery, onOpenProfile }) {
  const supabase = createClient();
  const [posts, setPosts] = useState([]);
  const [likesByPost, setLikesByPost] = useState({});
  const [likersModal, setLikersModal] = useState(null); // { loading, users }
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [menuPostId, setMenuPostId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [popPostId, setPopPostId] = useState(null);
  const [feedTab, setFeedTab] = useState('tous');
  const [followingIds, setFollowingIds] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);

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

  const loadNetwork = async () => {
    const { data: fol } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
    const ids = new Set((fol || []).map((f) => f.following_id));
    setFollowingIds(ids);
    const { data: people } = await supabase.from('profiles').select('id, nom, avatar_path, role').neq('id', user.id).limit(40);
    setSuggestions((people || []).filter((p) => !ids.has(p.id) && p.nom).slice(0, 5));
  };

  useEffect(() => { load(); loadNetwork(); }, []);

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
    setComposerOpen(true);
  };

  const removeMediaAt = (i) => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));

  const closeComposer = () => {
    setComposerOpen(false);
    setComposerText('');
    setMediaFiles([]);
  };

  const publish = async () => {
    if (!composerText.trim() && mediaFiles.length === 0) return;
    setPublishing(true);

    const uploadedMedia = [];
    if (mediaFiles.length > 0) {
      setUploadingMedia(true);
      for (const { file, type } of mediaFiles) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // Même bucket que la galerie de profil : les médias publiés apparaissent aussi dans « Ma galerie »
        const { error: uploadError } = await supabase.storage.from('gallery').upload(path, file);
        if (uploadError) {
          showToast(`Erreur média (${file.name}) : ${uploadError.message}`);
          continue;
        }
        const { error: galleryError } = await supabase.from('gallery_items').insert({ owner_id: user.id, file_path: path, media_type: type });
        if (galleryError) console.error('Ajout galerie :', galleryError);

        const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(path);
        uploadedMedia.push({ url: publicUrlData.publicUrl, type });
      }
      setUploadingMedia(false);
    }

    const { error } = await supabase.from('posts').insert({ author_id: user.id, content: composerText.trim(), media: uploadedMedia });
    setPublishing(false);
    if (error) {
      showToast(`Erreur : ${error.message}`);
      return;
    }
    closeComposer();
    showToast('Publication partagée.');
    load();
  };

  const toggleLike = async (postId) => {
    const current = likesByPost[postId] || { count: 0, likedByMe: false };
    setLikesByPost((prev) => ({ ...prev, [postId]: { count: current.count + (current.likedByMe ? -1 : 1), likedByMe: !current.likedByMe } }));
    if (current.likedByMe) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) setLikesByPost((prev) => ({ ...prev, [postId]: current }));
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (error) setLikesByPost((prev) => ({ ...prev, [postId]: current }));
    }
  };

  // Double-clic sur une photo : aime la publication (comme Instagram), sans jamais retirer le j'aime
  const doubleTapLike = (postId) => {
    setPopPostId(postId);
    setTimeout(() => setPopPostId((id) => (id === postId ? null : id)), 900);
    if (!likesByPost[postId]?.likedByMe) toggleLike(postId);
  };

  const openPostLikers = async (postId) => {
    setLikersModal({ loading: true, users: [] });
    const { data: likes } = await supabase.from('post_likes').select('user_id').eq('post_id', postId);
    const ids = (likes || []).map((l) => l.user_id);
    let users = [];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, nom, avatar_path, role').in('id', ids);
      users = profiles || [];
    }
    setLikersModal({ loading: false, users });
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const follow = async (person) => {
    setFollowingIds((prev) => new Set(prev).add(person.id));
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: person.id });
    if (error) {
      setFollowingIds((prev) => { const s = new Set(prev); s.delete(person.id); return s; });
      showToast("L'abonnement n'a pas fonctionné. Réessaie.");
      return;
    }
    await supabase.from('notifications').insert({
      user_id: person.id,
      type: 'nouvel_abonne',
      title: 'Nouvel abonné',
      body: `${profile?.nom || 'Quelqu’un'} s’est abonné à ton profil.`,
      link_tab: person.role,
    });
  };

  const visiblePosts = feedTab === 'abonnements'
    ? posts.filter((p) => followingIds.has(p.author_id) || p.author_id === user.id)
    : posts;
  const canPublish = (composerText.trim() || mediaFiles.length > 0) && !publishing;

  return (
    <div className="fd-layout" onClick={() => menuPostId && setMenuPostId(null)}>
      <style>{css}</style>

      {/* Colonne principale */}
      <div style={{ minWidth: 0 }}>
        <div role="tablist" style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, marginBottom: 24 }}>
          <button role="tab" aria-selected={feedTab === 'tous'} className="fd-tab" onClick={() => setFeedTab('tous')}>Pour toi</button>
          <button role="tab" aria-selected={feedTab === 'abonnements'} className="fd-tab" onClick={() => setFeedTab('abonnements')}>Abonnements</button>
        </div>

        {/* Composeur */}
        <div style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 24, marginBottom: 28 }}>
          {!composerOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar supabase={supabase} path={profile?.avatar_path} name={profile?.nom} size={36} />
              <button
                onClick={() => setComposerOpen(true)}
                style={{ flex: 1, textAlign: 'left', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 999, padding: '9px 16px', color: C.muted, fontSize: 14.5, cursor: 'text' }}
              >
                Quoi de neuf{firstName(profile?.nom) ? `, ${firstName(profile?.nom)}` : ''} ?
              </button>
              <label className="fd-icon" style={{ marginLeft: 0, color: C.muted }} title="Ajouter des photos ou vidéos">
                <Icon d={IMAGE} size={22} />
                <input type="file" accept="image/*,video/*" multiple onChange={onSelectMedia} style={{ display: 'none' }} />
              </label>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar supabase={supabase} path={profile?.avatar_path} name={profile?.nom} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextArea
                  autoFocus
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Un résultat, une info, une recherche de joueurs…"
                  style={{ minHeight: 80 }}
                />
                {mediaFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {mediaFiles.map((m, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        {m.type === 'video' ? (
                          <video src={m.url} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                        ) : (
                          <img src={m.url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                        )}
                        <button
                          onClick={() => removeMediaAt(i)}
                          aria-label="Retirer"
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          <Icon d={CLOSE} size={12} width={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: C.muted, cursor: 'pointer' }}>
                    <Icon d={IMAGE} size={18} />
                    Photos / vidéos
                    <input type="file" accept="image/*,video/*" multiple onChange={onSelectMedia} style={{ display: 'none' }} />
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={closeComposer} disabled={publishing} style={{ background: 'transparent', color: C.muted, border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button
                      onClick={publish}
                      disabled={!canPublish}
                      style={{ background: C.lime, color: C.ink, border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: canPublish ? 'pointer' : 'default', opacity: canPublish ? 1 : 0.5 }}
                    >
                      {uploadingMedia ? 'Envoi des médias…' : publishing ? 'Publication…' : 'Publier'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Publications */}
        {loading ? (
          <div style={{ color: C.muted, textAlign: 'center', padding: 40, fontSize: 14 }}>Chargement…</div>
        ) : visiblePosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              {feedTab === 'abonnements' ? 'Rien de neuf de tes abonnements' : 'Aucune publication pour le moment'}
            </div>
            <div style={{ color: C.muted, fontSize: 14 }}>
              {feedTab === 'abonnements' ? 'Abonne-toi à des clubs et des joueurs pour voir leurs publications ici.' : 'Sois le premier à partager une actualité avec la communauté.'}
            </div>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const likes = likesByPost[post.id] || { count: 0, likedByMe: false };
            const author = post.profiles || {};
            const mediaList = post.media?.length > 0 ? post.media : (post.media_url ? [{ url: post.media_url, type: post.media_type }] : []);
            const isMine = post.author_id === user.id;
            const text = post.content || '';
            const isLong = text.length > LONG_TEXT;
            const shownText = isLong && !expanded[post.id] ? `${text.slice(0, LONG_TEXT).trimEnd()}…` : text;

            return (
              <article key={post.id} style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 28, marginBottom: 28 }}>
                {/* En-tête */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="fd-link" onClick={() => onOpenProfile(post.author_id)} style={{ display: 'flex' }}>
                    <Avatar supabase={supabase} path={author.avatar_path} name={author.nom} size={34} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 8px', fontSize: 14 }}>
                    <button className="fd-link" onClick={() => onOpenProfile(post.author_id)} style={{ fontWeight: 600, color: C.text }}>{author.nom}</button>
                    {author.role && <span style={{ color: C.muted, fontSize: 13 }}>{ROLE_LABELS[author.role] || author.role}</span>}
                    <span style={{ color: C.muted, fontSize: 13 }}>{timeAgo(post.created_at)}</span>
                  </div>
                  {isMine && (
                    <div style={{ position: 'relative' }}>
                      <button className="fd-icon" style={{ marginLeft: 0 }} aria-label="Options" onClick={(e) => { e.stopPropagation(); setMenuPostId(menuPostId === post.id ? null : post.id); }}>
                        <Icon d={MORE} size={22} width={2.6} />
                      </button>
                      {menuPostId === post.id && (
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, minWidth: 180, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                          <button
                            onClick={() => { setMenuPostId(null); setConfirmDeleteId(post.id); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '11px 14px', color: '#FF6B6B', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                          >
                            Supprimer la publication
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Média */}
                <MediaCarousel media={mediaList} onDoubleTap={() => doubleTapLike(post.id)} pop={popPostId === post.id} />

                {/* Texte seul : affiché en grand, avant les actions */}
                {mediaList.length === 0 && text && (
                  <div style={{ fontSize: 15.5, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 10 }}>
                    {shownText}
                    {isLong && !expanded[post.id] && (
                      <button className="fd-link" onClick={() => setExpanded((e) => ({ ...e, [post.id]: true }))} style={{ color: C.muted, marginLeft: 4 }}>plus</button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <button
                    className="fd-icon"
                    onClick={() => toggleLike(post.id)}
                    aria-label={likes.likedByMe ? "Je n'aime plus" : "J'aime"}
                    aria-pressed={likes.likedByMe}
                    style={{ color: likes.likedByMe ? C.lime : C.text }}
                  >
                    <span key={likes.likedByMe ? 'on' : 'off'} className={likes.likedByMe ? 'fd-liked' : ''} style={{ display: 'inline-flex' }}>
                      <Icon d={HEART} fill={likes.likedByMe ? 'currentColor' : 'none'} />
                    </span>
                  </button>
                  {!isMine && (
                    <button
                      className="fd-icon"
                      onClick={() => onContact(post.author_id, author.nom, 'Réponse à une publication')}
                      aria-label={`Envoyer un message à ${author.nom}`}
                      title="Envoyer un message"
                    >
                      <Icon d={SEND} />
                    </button>
                  )}
                </div>

                {likes.count > 0 && (
                  <button className="fd-link" onClick={() => openPostLikers(post.id)} style={{ fontWeight: 600, fontSize: 14, color: C.text, marginTop: 2 }}>
                    {likes.count} J'aime
                  </button>
                )}

                {/* Légende sous la photo, précédée du nom */}
                {mediaList.length > 0 && text && (
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginTop: 4 }}>
                    <button className="fd-link" onClick={() => onOpenProfile(post.author_id)} style={{ fontWeight: 600, marginRight: 6 }}>{author.nom}</button>
                    {shownText}
                    {isLong && !expanded[post.id] && (
                      <button className="fd-link" onClick={() => setExpanded((e) => ({ ...e, [post.id]: true }))} style={{ color: C.muted, marginLeft: 4 }}>plus</button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Colonne de droite (ordinateur) */}
      <aside className="fd-side">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="fd-link" onClick={() => onOpenProfile(user.id)} style={{ display: 'flex' }}>
            <Avatar supabase={supabase} path={profile?.avatar_path} name={profile?.nom} size={44} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button className="fd-link" onClick={() => onOpenProfile(user.id)} style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{profile?.nom}</button>
            <div style={{ fontSize: 13, color: C.muted }}>{ROLE_LABELS[profile?.role] || profile?.role}</div>
          </div>
        </div>

        {suggestions.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 12 }}>Suggestions pour toi</div>
            {suggestions.map((p) => {
              const followed = followingIds.has(p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                  <button className="fd-link" onClick={() => onOpenProfile(p.id)} style={{ display: 'flex' }}>
                    <Avatar supabase={supabase} path={p.avatar_path} name={p.nom} size={36} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button className="fd-link" onClick={() => onOpenProfile(p.id)} style={{ fontWeight: 600, fontSize: 14, color: C.text, display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</button>
                    <div style={{ fontSize: 12.5, color: C.muted }}>{ROLE_LABELS[p.role] || p.role}</div>
                  </div>
                  <button
                    onClick={() => !followed && follow(p)}
                    disabled={followed}
                    style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13, fontWeight: 600, color: followed ? C.muted : C.lime, cursor: followed ? 'default' : 'pointer' }}
                  >
                    {followed ? 'Abonné' : 'Suivre'}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </aside>
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer cette publication ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); handleDelete(id); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
      {likersModal && (
        <div onClick={() => setLikersModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,15,12,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>J'aime</span>
              <button onClick={() => setLikersModal(null)} aria-label="Fermer" style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex', padding: 4 }}><Icon d={CLOSE} size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto' }}>
              {likersModal.loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 14 }}>Chargement…</div>
              ) : likersModal.users.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 14 }}>Personne pour le moment.</div>
              ) : likersModal.users.map((u) => (
                <button key={u.id} onClick={() => { setLikersModal(null); onOpenProfile(u.id); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.line}`, cursor: 'pointer', textAlign: 'left', color: C.text }}>
                  <Avatar supabase={supabase} path={u.avatar_path} name={u.nom} size={36} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{u.nom}</div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>{ROLE_LABELS[u.role] || u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
