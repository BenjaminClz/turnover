import { supaGet } from '@/lib/publicPage';

// Régénéré au plus toutes les heures : assez frais pour Google, sans solliciter Supabase à chaque visite
export const revalidate = 3600;

const BASE_URL = 'https://turnover-sport.fr';

export default async function sitemap() {
  const now = new Date();
  const staticPages = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/mentions-legales`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/cgu`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const [players, clubs, needs] = await Promise.all([
    supaGet('public_player_profiles?select=id&limit=5000', 3600),
    supaGet('public_club_profiles?select=id&limit=5000', 3600),
    supaGet('public_club_needs?select=owner_id,created_at&order=created_at.desc&limit=5000', 3600),
  ]);

  // Date de la dernière annonce de chaque club : signale à Google que la page a changé
  const lastNeed = {};
  for (const n of needs || []) if (!lastNeed[n.owner_id]) lastNeed[n.owner_id] = n.created_at;

  const clubPages = (clubs || []).map((c) => ({
    url: `${BASE_URL}/c/${c.id}`,
    ...(lastNeed[c.id] && { lastModified: new Date(lastNeed[c.id]) }),
    changeFrequency: 'weekly',
    // Les clubs qui recrutent passent devant
    priority: lastNeed[c.id] ? 0.8 : 0.5,
  }));

  const playerPages = (players || []).map((p) => ({
    url: `${BASE_URL}/j/${p.id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...clubPages, ...playerPages];
}
