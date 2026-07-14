import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

const BASE_URL = 'https://turnover-sport.fr';

export default async function sitemap() {
  const staticPages = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/mentions-legales`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/cgu`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/confidentialite`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let playerPages = [];
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('SITEMAP DEBUG: variables Supabase manquantes', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase
      .from('public_player_profiles')
      .select('id, created_at')
      .limit(1000);

    if (error) {
      console.error('SITEMAP DEBUG: erreur Supabase', error.message, error);
    } else {
      console.error('SITEMAP DEBUG: lignes reçues =', data?.length);
    }

    playerPages = (data || []).map((p) => ({
      url: `${BASE_URL}/j/${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (e) {
    console.error('SITEMAP DEBUG: exception attrapée', e?.message, e);
  }

  return [...staticPages, ...playerPages];
}
