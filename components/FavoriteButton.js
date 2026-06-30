'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function FavoriteButton({ targetType, targetId, ownerId, style }) {
  const supabase = createClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('favorites').select('id').eq('owner_id', ownerId).eq('target_type', targetType).eq('target_id', targetId).maybeSingle();
      setIsFavorite(!!data);
      setLoading(false);
    })();
  }, [targetType, targetId, ownerId]);

  const toggle = async (e) => {
    e.stopPropagation();
    if (loading) return;
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('owner_id', ownerId).eq('target_type', targetType).eq('target_id', targetId);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ owner_id: ownerId, target_type: targetType, target_id: targetId });
      setIsFavorite(true);
    }
  };

  return (
    <button onClick={toggle} title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1, opacity: loading ? 0.4 : 1, ...style }}>
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}
