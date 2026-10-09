import { ImageResponse } from 'next/og';
import { OG_SIZE, SiteOgCard, loadOgFonts } from '@/lib/og';

export const runtime = 'edge';
export const alt = 'Turnover — Le marché des transferts du sport amateur';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const { fonts, hasDisplay } = await loadOgFonts('Le marché des transferts du sport amateur. Joueurs, clubs et staff se trouvent, se suivent et se contactent. Rejoindre Turnover turnover-sport.fr');
  return new ImageResponse(<SiteOgCard hasDisplay={hasDisplay} />, { ...OG_SIZE, fonts: fonts.length ? fonts : undefined });
}
