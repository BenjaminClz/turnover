import { ImageResponse } from 'next/og';
import { OG_SIZE, PlayerOgCard, SiteOgCard, loadOgFonts } from '@/lib/og';

export const runtime = 'edge';
export const alt = 'Profil joueur sur Turnover';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

async function fetchPlayer(id) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/public_player_profiles?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export default async function Image({ params }) {
  const player = await fetchPlayer(params.id);
  const text = player ? Object.values(player).filter((v) => typeof v === 'string').join(' ') : '';
  const { fonts, hasDisplay } = await loadOgFonts(text + ' Le marché des transferts du sport amateur. Joueurs, clubs et staff se trouvent, se suivent et se contactent. Rejoindre Turnover PROFIL JOUEUR NOTE GLOBALE Voir le profil Vitesse Attaque Défense Technique Vision Combat Physique turnover-sport.fr');
  return new ImageResponse(
    player ? <PlayerOgCard player={player} hasDisplay={hasDisplay} /> : <SiteOgCard hasDisplay={hasDisplay} />,
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}
