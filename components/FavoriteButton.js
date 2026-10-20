'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Icon } from '@/components/icons';

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

    // Mise à jour optimiste : l'interface réagit immédiatement, avant même
    // la réponse du serveur. En cas d'échec, on revient à l'état précédent.
    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);

    if (wasFavorite) {
      const { error } = await supabase.from('favorites').delete().eq('owner_id', ownerId).eq('target_type', targetType).eq('target_id', targetId);
      if (error) setIsFavorite(true);
    } else {
      const { error } = await supabase.from('favorites').insert({ owner_id: ownerId, target_type: targetType, target_id: targetId });
      if (error) setIsFavorite(false);
    }
  };

  return (
    <button onClick={toggle} title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={isFavorite} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', fontSize: 16, padding: 4, lineHeight: 1, opacity: loading ? 0.4 : 1, transition: 'transform .12s ease', ...style }}>
      <Icon name="heart" size={18} filled={isFavorite} style={{ color: isFavorite ? 'var(--lime)' : 'var(--muted)', display: 'block' }} />
    </button>
  );
}
