'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

export function useUser() {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  const refreshProfile = async (userId) => {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(profileData || null);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        setUser(null); setProfile(null); setLoading(false);
        return;
      }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (!active) return;

      if (profileData?.suspended) {
        setSuspended(true);
        await supabase.auth.signOut();
        setUser(null); setProfile(null); setLoading(false);
        return;
      }

      setUser(session.user);
      setProfile(profileData || null);
      setLoading(false);
    };

    load();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null); setProfile(null); setLoading(false);
      } else {
        load();
      }
    });

    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  return { user, profile, loading, refreshProfile, suspended };
}
