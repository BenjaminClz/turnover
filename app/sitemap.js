import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://turnover-sport.fr';

export default async function sitemap() {
  const staticPages = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/mentions-legales`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/cgu`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/confidentialite`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const debugPages = [];
  let playerPages = [];

  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  debugPages.push({
    url: `${BASE_URL}/DEBUG-env-url-${hasUrl}-key-${hasKey}`,
    priority: 0.01,
  });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase
      .from('public_player_profiles')
      .select('id, created_at')
      .limit(1000);

    if (error) {
      debugPages.push({
        url: `${BASE_URL}/DEBUG-supabase-error-${encodeURIComponent(error.message).slice(0, 100)}`,
        priority: 0.01,
      });
    } else {
      debugPages.push({
        url: `${BASE_URL}/DEBUG-rows-count-${data?.length ?? 'null'}`,
        priority: 0.01,
      });
    }

    playerPages = (data || []).map((p) => ({
      url: `${BASE_URL}/j/${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (e) {
    debugPages.push({
      url: `${BASE_URL}/DEBUG-exception-${encodeURIComponent(e?.message || 'unknown').slice(0, 100)}`,
      priority: 0.01,
    });
  }

  return [...staticPages, ...debugPages, ...playerPages];
}
