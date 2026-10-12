import { ImageResponse } from 'next/og';
import { OG_SIZE, ClubOgCard, SiteOgCard, loadOgFonts, fetchImageDataUrl } from '@/lib/og';
import { describeNeed, needTitle, needSub } from '@/lib/needs';

export const runtime = 'edge';
export const alt = 'Club sur Turnover';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function get(q) {
  try {
    const res = await fetch(`${BASE}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, next: { revalidate: 3600 } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function villeOf(club, needs) {
  const fromNeeds = needs.find((n) => n.ville)?.ville;
  if (fromNeeds) return fromNeeds;
  const parts = (club.adresse || '').split(',').map((x) => x.trim()).filter(Boolean);
  const withZip = parts.find((x) => /^\d{4,5}\s+\S/.test(x));
  if (withZip) return withZip.replace(/^\d{4,5}\s+/, '');
  return parts.length > 1 ? parts[parts.length - 2] : parts[0] || null;
}

export default async function Image({ params }) {
  const id = encodeURIComponent(params.id);
  const [clubs, rawNeeds] = await Promise.all([
    get(`public_club_profiles?id=eq.${id}&select=*`),
    get(`public_club_needs?owner_id=eq.${id}&select=*&order=created_at.desc`),
  ]);
  const club = clubs?.[0];
  const SITE_TEXT = ' Le marché des transferts du sport amateur. Joueurs, clubs et staff se trouvent, se suivent et se contactent. Rejoindre Turnover turnover-sport.fr';

  if (!club) {
    const { fonts, hasDisplay } = await loadOgFonts(SITE_TEXT);
    return new ImageResponse(<SiteOgCard hasDisplay={hasDisplay} />, { ...OG_SIZE, fonts: fonts.length ? fonts : undefined });
  }

  const needsData = rawNeeds || [];
  const needs = needsData.map((n) => ({ title: needTitle(n), sub: needSub(n), urgent: n.urgence === 'Dès que possible' }));
  const ville = villeOf(club, needsData);
  const avatar = await fetchImageDataUrl(club.avatar_path ? `${BASE}/storage/v1/object/public/avatars/${club.avatar_path}` : null);
  const text = [club.nom, ville, ...needs.flatMap((n) => [n.title, n.sub])].filter(Boolean).join(' ')
    + ' RECRUTE CLUB URGENT autres annonce Voir les annonces Voir le club' + SITE_TEXT;
  const { fonts, hasDisplay } = await loadOgFonts(text);

  return new ImageResponse(
    <ClubOgCard club={club} needs={needs} ville={ville} hasDisplay={hasDisplay} avatar={avatar} />,
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}
