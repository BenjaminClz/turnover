import { createClient } from '@supabase/supabase-js';

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('public_player_profiles')
      .select('id, created_at')
      .limit(1000);

    playerPages = (data || []).map((p) => ({
      url: `${BASE_URL}/j/${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (e) {
    // En cas d'erreur (ex. build sans variables d'environnement), on renvoie au moins les pages statiques.
  }

  return [...staticPages, ...playerPages];
}
