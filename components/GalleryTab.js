'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { EmptyState } from '@/components/ui';
import { avatarUrl } from '@/components/AvatarUpload';
import { ROLE_LABELS } from '@/lib/constants';

const BUCKET = 'gallery';
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 Mo par fichier

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

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

export default function GalleryTab({
  userId, ownerName, readOnly, showToast, embedded = false,
  title = 'Mes photos & vidéos',
  description = 'Montre-toi en action — visible par les clubs qui consultent ton profil. Jusqu\'à 20 Mo par fichier.',
  onShareToMessage,
}) {
  const supabase = createClient();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [meId, setMeId] = useState(null);
  const [owner, setOwner] = useState(null); // { avatar_path, role }
  const [likersModal, setLikersModal] = useState(null); // { itemId, loading, users }
  const [openIndex, setOpenIndex] = useState(null); // index de la publication ouverte en grand
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const myId = user?.id || null;
    setMeId(myId);

    const { data: ownerData } = await supabase.from('profiles').select('avatar_path, role').eq('id', userId).maybeSingle();
    setOwner(ownerData || null);

    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement de la galerie.'); setLoading(false); return; }

    const base = (data || []).map((it) => ({
      ...it,
      url: supabase.storage.from(BUCKET).getPublicUrl(it.file_path).data.publicUrl,
      likeCount: 0, likedByMe: false, comments: [],
    }));

    const ids = base.map((it) => it.id);
    if (ids.length > 0) {
      // Likes et commentaires (silencieux si les tables n'existent pas encore).
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('gallery_likes').select('item_id, user_id').in('item_id', ids),
        supabase.from('gallery_comments').select('*, profiles!gallery_comments_author_id_fkey(nom, avatar_path, role)').in('item_id', ids).order('created_at', { ascending: true }),
      ]);
      const likesByItem = {};
      (likes || []).forEach((l) => {
        if (!likesByItem[l.item_id]) likesByItem[l.item_id] = { count: 0, mine: false };
        likesByItem[l.item_id].count += 1;
        if (l.user_id === myId) likesByItem[l.item_id].mine = true;
      });
      const commentsByItem = {};
      (comments || []).forEach((c) => {
        if (!commentsByItem[c.item_id]) commentsByItem[c.item_id] = [];
        commentsByItem[c.item_id].push(c);
      });
      base.forEach((it) => {
        it.likeCount = likesByItem[it.id]?.count || 0;
        it.likedByMe = likesByItem[it.id]?.mine || false;
        it.comments = commentsByItem[it.id] || [];
      });
    }

    setItems(base);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) { showToast(`${file.name} : type non supporté.`); continue; }
      if (file.size > MAX_FILE_BYTES) { showToast(`${file.name} dépasse 20 Mo.`); continue; }

      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadError) { showToast(`Échec de l'envoi de ${file.name}.`); continue; }

      const { error: dbError } = await supabase.from('gallery_items').insert({
        owner_id: userId, file_path: path, media_type: isVideo ? 'video' : 'image',
      });
      if (dbError) { showToast(`Fichier envoyé mais erreur d'enregistrement.`); continue; }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    load();
  };

  const deleteItem = async (item) => {
    await supabase.storage.from(BUCKET).remove([item.file_path]);
    await supabase.from('gallery_items').delete().eq('id', item.id);
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  };

  const toggleLike = async (item) => {
    if (!meId) { showToast('Connecte-toi pour aimer.'); return; }
    const liked = item.likedByMe;
    setItems((prev) => prev.map((it) => it.id === item.id
      ? { ...it, likedByMe: !liked, likeCount: it.likeCount + (liked ? -1 : 1) }
      : it));
    if (liked) {
      const { error } = await supabase.from('gallery_likes').delete().eq('item_id', item.id).eq('user_id', meId);
      if (error) load();
    } else {
      const { error } = await supabase.from('gallery_likes').insert({ item_id: item.id, user_id: meId });
      if (error) load();
    }
  };

  const openLikers = async (item) => {
    if (item.likeCount === 0) return;
    setLikersModal({ itemId: item.id, loading: true, users: [] });
    const { data: likes } = await supabase.from('gallery_likes').select('user_id').eq('item_id', item.id);
    const ids = (likes || []).map((l) => l.user_id);
    let users = [];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, nom, avatar_path, role').in('id', ids);
      users = profiles || [];
    }
    setLikersModal({ itemId: item.id, loading: false, users });
  };

  const addComment = async (item, text) => {
    if (!meId) { showToast('Connecte-toi pour commenter.'); return; }
    const content = text.trim();
    if (!content) return;
    const { error } = await supabase.from('gallery_comments').insert({ item_id: item.id, author_id: meId, content });
    if (error) { showToast('Erreur lors de l\'envoi du commentaire.'); return; }
    const { data } = await supabase.from('gallery_comments').select('*, profiles!gallery_comments_author_id_fkey(nom, avatar_path, role)').eq('item_id', item.id).order('created_at', { ascending: true });
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, comments: data || [] } : it));
  };

  const deleteComment = async (item, commentId) => {
    await supabase.from('gallery_comments').delete().eq('id', commentId);
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, comments: it.comments.filter((c) => c.id !== commentId) } : it));
  };

  const updateDescription = async (item, text) => {
    const value = text.trim() || null;
    const { error } = await supabase.from('gallery_items').update({ description: value }).eq('id', item.id);
    if (error) { showToast('Erreur lors de l\'enregistrement.'); return; }
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, description: value } : it));
    showToast('Description enregistrée ✓');
  };

  const shareItem = async (item) => {
    const link = `${window.location.origin}/app?tab=profil&uid=${userId}`;
    return link;
  };

  const ownerAvatar = owner?.avatar_path ? avatarUrl(supabase, owner.avatar_path) : null;

  const renderPostCard = (item, i) => (
    <PostCard
      key={item.id}
      item={item}
      isOwner={!readOnly && meId === userId}
      canInteract={!!meId}
      ownerName={ownerName}
      ownerAvatar={ownerAvatar}
      ownerRole={owner?.role}
      onToggleLike={() => toggleLike(item)}
      onOpenLikers={() => openLikers(item)}
      onAddComment={(text) => addComment(item, text)}
      onDeleteComment={(cid) => deleteComment(item, cid)}
      onUpdateDescription={(text) => updateDescription(item, text)}
      onDelete={() => { deleteItem(item); setOpenIndex(null); }}
      getShareLink={() => shareItem(item)}
      onShareToMessage={onShareToMessage ? () => onShareToMessage(userId, ownerName) : null}
      showToast={showToast}
      modal
      onClose={() => setOpenIndex(null)}
      onPrev={i > 0 ? () => setOpenIndex(i - 1) : null}
      onNext={i < items.length - 1 ? () => setOpenIndex(i + 1) : null}
      position={`${i + 1} / ${items.length}`}
    />
  );

  const grid = loading ? (
    <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
  ) : items.length === 0 ? (
    <EmptyState icon="🎞️" title="Aucune publication" sub={readOnly ? `${ownerName} n'a rien publié pour le moment.` : 'Ajoute une photo ou une vidéo pour ta première publication.'} />
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {items.map((item, i) => (
        <button key={item.id} onClick={() => setOpenIndex(i)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid #274238', background: '#0B1F1A', cursor: 'pointer', padding: 0 }}>
          {item.media_type === 'video' ? (
            <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
          {item.media_type === 'video' && (
            <span style={{ position: 'absolute', top: 6, right: 8, color: '#fff', fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>▶</span>
          )}
          {item.likeCount > 0 && (
            <span style={{ position: 'absolute', bottom: 6, left: 8, color: '#fff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>♥ {item.likeCount}</span>
          )}
        </button>
      ))}
    </div>
  );

  const lightbox = openIndex != null && items[openIndex] && (
    <div onClick={() => setOpenIndex(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 350, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto' }}>
        {renderPostCard(items[openIndex], openIndex)}
      </div>
    </div>
  );

  const uploadInput = (
    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} id="gallery-upload-input" />
  );

  const likersModalEl = likersModal && (
    <div onClick={() => setLikersModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #2C4A3D' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>J'aime</span>
          <button onClick={() => setLikersModal(null)} style={{ background: 'transparent', border: 'none', color: '#A4B0A6', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto' }}>
          {likersModal.loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#8C9A8E' }}>Chargement…</div>
          ) : likersModal.users.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#8C9A8E', fontSize: 14 }}>Personne pour le moment.</div>
          ) : likersModal.users.map((u) => {
            const av = u.avatar_path ? avatarUrl(supabase, u.avatar_path) : null;
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid #1c332a' }}>
                {av ? (
                  <img src={av} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 13 }}>{initials(u.nom)}</div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#F5F0E6' }}>{u.nom}</div>
                  <div style={{ fontSize: 12, color: '#8C9A8E' }}>{ROLE_LABELS[u.role] || u.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <h3 style={{ fontSize: 18 }}>{title}</h3>
          {!readOnly && (
            <>
              {uploadInput}
              <label htmlFor="gallery-upload-input" style={{ display: 'inline-block', background: '#D4FF3F', color: '#0B1F1A', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {uploading ? 'Import en cours…' : '+ Ajouter'}
              </label>
            </>
          )}
        </div>
        {!readOnly && <p style={{ fontSize: 13, color: '#8C9A8E', marginBottom: 18 }}>{description}</p>}
        {grid}
        {lightbox}
        {likersModalEl}
      </div>
    );
  }

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 10 }}>
        {readOnly ? `Galerie de ${ownerName}` : 'Ma galerie'}
      </h1>
      <p style={{ color: '#8C9A8E', marginBottom: 24, maxWidth: 520 }}>
        {readOnly ? 'Photos et vidéos publiées par ce profil.' : 'Tes photos et vidéos, visibles par les clubs qui consultent ton profil.'}
      </p>

      {!readOnly && (
        <div style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Nouvelle publication</h3>
          {uploadInput}
          <label htmlFor="gallery-upload-input" style={{ display: 'inline-block', background: '#D4FF3F', color: '#0B1F1A', padding: '12px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {uploading ? 'Import en cours…' : '+ Ajouter photos / vidéos'}
          </label>
          <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 10 }}>Jusqu'à 20 Mo par fichier. Tu pourras ajouter une description ensuite.</div>
        </div>
      )}

      {grid}
      {lightbox}
      {likersModalEl}
    </div>
  );
}

function PostCard({ item, isOwner, canInteract, ownerName, ownerAvatar, ownerRole, onToggleLike, onOpenLikers, onAddComment, onDeleteComment, onUpdateDescription, onDelete, getShareLink, onShareToMessage, showToast, modal = false, onClose, onPrev, onNext, position }) {
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState(item.description || '');
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const comments = item.comments || [];
  const visibleComments = showAllComments ? comments : comments.slice(-2);

  const submitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(commentText);
    setCommentText('');
  };

  const doNativeShare = async () => {
    const link = await getShareLink();
    setShareOpen(false);
    if (navigator.share) {
      try { await navigator.share({ title: ownerName, text: `Regarde la publication de ${ownerName} sur TurnOver`, url: link }); } catch { /* annulé */ }
    } else {
      navigator.clipboard?.writeText(link);
      showToast('Lien copié ✓');
    }
  };

  const doCopyLink = async () => {
    const link = await getShareLink();
    setShareOpen(false);
    navigator.clipboard?.writeText(link);
    showToast('Lien copié ✓');
  };

  return (
    <div style={{ background: '#0B1F1A', border: '1px solid #2C4A3D', borderRadius: 14, overflow: 'hidden' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', position: 'relative' }}>
        {ownerAvatar ? (
          <img src={ownerAvatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', color: '#0B1F1A', fontSize: 13 }}>{initials(ownerName)}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#F5F0E6', fontSize: 13.5, fontWeight: 700 }}>{ownerName}</div>
          <div style={{ color: '#8C9A8E', fontSize: 11.5 }}>{ROLE_LABELS[ownerRole] || ''}{ownerRole ? ' · ' : ''}il y a {timeAgo(item.created_at)}</div>
        </div>
        {isOwner && (
          <>
            <button onClick={() => setMenuOpen((v) => !v)} style={{ background: 'transparent', border: 'none', color: '#8C9A8E', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>⋯</button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 44, right: 12, background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 10, zIndex: 20, overflow: 'hidden', minWidth: 180 }}>
                <button onClick={() => { setMenuOpen(false); setEditingDesc(true); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer' }}>Modifier la description</button>
                <button onClick={() => { setMenuOpen(false); onDelete(); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#FF5C5C', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer', borderTop: '1px solid #223a30' }}>Supprimer la publication</button>
              </div>
            )}
          </>
        )}
        {modal && onClose && (
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'transparent', border: 'none', color: '#A4B0A6', fontSize: 20, cursor: 'pointer', lineHeight: 1, marginLeft: 4 }}>✕</button>
        )}
      </div>

      {/* Média */}
      <div style={{ position: 'relative', width: '100%', background: '#152E26', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: 560, overflow: 'hidden' }}>
        {item.media_type === 'video' ? (
          <video src={item.url} controls style={{ width: '100%', maxHeight: 560, display: 'block' }} />
        ) : (
          <img src={item.url} alt="" style={{ width: '100%', maxHeight: 560, objectFit: 'contain', display: 'block' }} />
        )}
        {modal && position && (
          <span style={{ position: 'absolute', top: 8, left: 10, background: 'rgba(11,31,26,0.6)', color: '#F5F0E6', fontSize: 12, padding: '2px 9px', borderRadius: 10 }}>{position}</span>
        )}
        {modal && onPrev && (
          <button onClick={onPrev} aria-label="Précédent" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(11,31,26,0.65)', border: 'none', color: '#F5F0E6', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        )}
        {modal && onNext && (
          <button onClick={onNext} aria-label="Suivant" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(11,31,26,0.65)', border: 'none', color: '#F5F0E6', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 14px 4px', position: 'relative' }}>
        <button onClick={onToggleLike} aria-label="J'aime" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: item.likedByMe ? '#FF5C7A' : '#A4B0A6', fontSize: 14, padding: 0 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{item.likedByMe ? '♥' : '♡'}</span>
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A4B0A6', fontSize: 14 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>💬</span>{comments.length > 0 ? comments.length : ''}
        </span>
        <button onClick={() => setShareOpen((v) => !v)} aria-label="Partager" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A4B0A6', fontSize: 18, padding: 0 }}>
          <span style={{ fontSize: 19, lineHeight: 1 }}>↗</span>
        </button>
        {shareOpen && (
          <div style={{ position: 'absolute', top: 40, left: 60, background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 10, zIndex: 20, overflow: 'hidden', minWidth: 200 }}>
            <button onClick={doNativeShare} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer' }}>Partager…</button>
            <button onClick={doCopyLink} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer', borderTop: '1px solid #223a30' }}>Copier le lien</button>
            {onShareToMessage && (
              <button onClick={() => { setShareOpen(false); onShareToMessage(); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 13.5, padding: '11px 14px', cursor: 'pointer', borderTop: '1px solid #223a30' }}>Envoyer en message</button>
            )}
          </div>
        )}
      </div>

      {/* Nombre de likes */}
      {item.likeCount > 0 && (
        <div style={{ padding: '2px 14px 0' }}>
          <button onClick={onOpenLikers} style={{ background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            {item.likeCount} {item.likeCount > 1 ? "j'aime" : "j'aime"}
          </button>
        </div>
      )}

      {/* Description */}
      {editingDesc ? (
        <div style={{ padding: '8px 14px' }}>
          <textarea value={descText} onChange={(e) => setDescText(e.target.value)} placeholder="Écris une description…" style={{ width: '100%', minHeight: 60, background: '#152E26', border: '1px solid #2C4A3D', borderRadius: 8, color: '#F5F0E6', fontSize: 13.5, padding: 10, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { onUpdateDescription(descText); setEditingDesc(false); }} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Enregistrer</button>
            <button onClick={() => { setDescText(item.description || ''); setEditingDesc(false); }} style={{ background: 'transparent', color: '#A4B0A6', border: '1px solid #2C4A3D', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      ) : item.description ? (
        <div style={{ padding: '4px 14px 2px', fontSize: 13.5, color: '#C7CFC8', lineHeight: 1.5 }}>
          <span style={{ color: '#F5F0E6', fontWeight: 700 }}>{ownerName}</span> {item.description}
        </div>
      ) : isOwner ? (
        <div style={{ padding: '4px 14px 2px' }}>
          <button onClick={() => setEditingDesc(true)} style={{ background: 'transparent', border: 'none', color: '#8C9A8E', fontSize: 13, cursor: 'pointer', padding: 0 }}>+ Ajouter une description</button>
        </div>
      ) : null}

      {/* Commentaires */}
      {comments.length > 2 && !showAllComments && (
        <div style={{ padding: '4px 14px 0' }}>
          <button onClick={() => setShowAllComments(true)} style={{ background: 'transparent', border: 'none', color: '#8C9A8E', fontSize: 13, cursor: 'pointer', padding: 0 }}>Voir les {comments.length} commentaires</button>
        </div>
      )}
      {visibleComments.length > 0 && (
        <div style={{ padding: '4px 14px 8px', display: 'grid', gap: 4 }}>
          {visibleComments.map((c) => (
            <div key={c.id} style={{ fontSize: 13, color: '#C7CFC8', lineHeight: 1.45, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span><span style={{ color: '#F5F0E6', fontWeight: 700 }}>{c.profiles?.nom || 'Utilisateur'}</span> {c.content}</span>
              {isOwner && (
                <button onClick={() => onDeleteComment(c.id)} style={{ background: 'transparent', border: 'none', color: '#5C6B5E', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ajouter un commentaire */}
      {canInteract && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #1c332a', padding: '10px 14px' }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
            placeholder="Ajouter un commentaire…"
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 13, outline: 'none' }}
          />
          <button onClick={submitComment} disabled={!commentText.trim()} style={{ background: 'transparent', border: 'none', color: commentText.trim() ? '#D4FF3F' : '#5C6B5E', fontSize: 13, fontWeight: 700, cursor: commentText.trim() ? 'pointer' : 'default' }}>Publier</button>
        </div>
      )}
    </div>
  );
}
