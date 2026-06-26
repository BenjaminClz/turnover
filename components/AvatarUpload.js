'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';

const BUCKET = 'avatars';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 Mo, largement suffisant pour une photo de profil

export function avatarUrl(supabase, path) {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function AvatarUpload({ userId, currentPath, onUploaded, showToast, size = 84 }) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const url = avatarUrl(supabase, currentPath);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Choisis une image (jpg, png…).'); return; }
    if (file.size > MAX_FILE_BYTES) { showToast('Image trop lourde (max 5 Mo).'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (uploadError) { showToast("Échec de l'envoi de la photo."); setUploading(false); return; }

    const { error: dbError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
    setUploading(false);
    if (dbError) { showToast("Photo envoyée mais erreur d'enregistrement."); return; }

    showToast('Photo de profil mise à jour ✓');
    onUploaded?.(path);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        background: url ? 'transparent' : 'linear-gradient(135deg,#D4FF3F,#7fb83a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid #2C4A3D',
      }}>
        {url ? (
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: 'Anton', color: '#0B1F1A', fontSize: size * 0.4 }}>?</span>
        )}
      </div>
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: 'none' }} id={`avatar-upload-${userId}`} />
        <label htmlFor={`avatar-upload-${userId}`} style={{ display: 'inline-block', background: 'transparent', border: '1.5px solid #2C4A3D', color: '#F5F0E6', padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
          {uploading ? 'Envoi…' : (url ? 'Changer la photo' : 'Ajouter une photo')}
        </label>
      </div>
    </div>
  );
}
