'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

export function useSubscription(userId) {
  const supabase = createClient();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase.from('subscriptions').select('*').eq('owner_id', userId).maybeSingle();
    setSubscription(data || { status: 'free' });
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [userId]);

  const isActive = subscription?.status === 'active';

  return { subscription, isActive, loading, refresh };
}
