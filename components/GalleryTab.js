'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { EmptyState } from '@/components/ui';

const BUCKET = 'gallery';
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 Mo par fichier (limite raisonnable, Storage gère bien mieux que le stockage clé-valeur)

export default function GalleryTab({ userId, ownerName, readOnly, showToast }) {
  const supabase = createClient();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement de la galerie.'); setLoading(false); return; }
    const withUrls = (data || []).map((it) => ({
      ...it,
      url: supabase.storage.from(BUCKET).getPublicUrl(it.file_path).data.publicUrl,
    }));
    setItems(withUrls);
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
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)' }}>
          {readOnly ? `Galerie de ${ownerName}` : 'Ma galerie'}
        </h1>
      </div>
      <p style={{ color: '#8C9A8E', marginBottom: 28, maxWidth: 520 }}>
        {readOnly ? 'Photos et vidéos publiées par ce joueur.' : 'Tes photos et vidéos, visibles par les clubs qui consultent ton profil.'}
      </p>

      {!readOnly && (
        <div style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Ajouter à ma galerie</h3>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} id="gallery-upload-input" />
          <label htmlFor="gallery-upload-input" style={{ display: 'inline-block', background: '#D4FF3F', color: '#0B1F1A', padding: '12px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {uploading ? 'Import en cours…' : '+ Ajouter photos / vidéos'}
          </label>
          <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 10 }}>Jusqu'à 20 Mo par fichier.</div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : items.length === 0 ? (
        <EmptyState icon="🎞️" title="Galerie vide" sub={readOnly ? `${ownerName} n'a pas encore ajouté de photo ou vidéo.` : 'Ajoute des photos ou vidéos de toi en action.'} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
          {items.map((it) => (
            <div key={it.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #274238', background: '#0B1F1A', aspectRatio: '1' }}>
              {it.media_type === 'video' ? (
                <video src={it.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <img src={it.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              {!readOnly && (
                <button onClick={() => deleteItem(it)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(11,31,26,0.85)', border: 'none', color: '#FF5C5C', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
