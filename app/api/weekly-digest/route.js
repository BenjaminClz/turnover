export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

async function supabaseRest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function getUserEmail(userId) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.email || null;
}

async function sendEmail(to, subject, html) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Turnover <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
}

export async function GET(request) {
  // Sécurité : seul un appel avec le bon secret (Vercel Cron) peut déclencher l'envoi.
  const auth = request.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const recentNeeds = await supabaseRest(
    `club_needs?select=*&besoin_type=eq.joueur&created_at=gte.${sevenDaysAgo}`
  );
  if (recentNeeds.length === 0) {
    return Response.json({ sent: 0, reason: 'no recent needs' });
  }

  const players = await supabaseRest(`player_listings?select=owner_id,sport,poste,niveau,ville`);

  let sentCount = 0;
  for (const player of players) {
    const matches = recentNeeds.filter((n) => n.sport === player.sport && n.poste === player.poste);
    if (matches.length === 0) continue;

    const email = await getUserEmail(player.owner_id);
    if (!email) continue;

    const listHtml = matches
      .map((n) => `<li>${n.club} — ${n.poste} · ${n.niveau || ''} · ${n.ville}</li>`)
      .join('');

    await sendEmail(
      email,
      `${matches.length} offre(s) correspondant à ton profil sur Turnover`,
      `<p>Bonjour,</p><p>Voici les offres publiées cette semaine qui correspondent à ton profil (${player.poste}, ${player.sport}) :</p><ul>${listHtml}</ul><p><a href="https://turnover-gules.vercel.app/app">Voir sur Turnover</a></p>`
    );
    sentCount++;
  }

  return Response.json({ sent: sentCount });
}
