export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Non authentifié.' }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return Response.json({ error: 'Session invalide.' }, { status: 401 });
    const userId = authData.user.id;
    const userEmail = authData.user.email;

    const [profile, playerListings, clubNeeds, staffListings, playerSearches, messages, conversations, recommendationsReceived, recommendationsWritten, favorites] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('player_listings').select('*').eq('owner_id', userId),
      supabaseAdmin.from('club_needs').select('*').eq('owner_id', userId),
      supabaseAdmin.from('staff_listings').select('*').eq('owner_id', userId),
      supabaseAdmin.from('player_searches').select('*').eq('owner_id', userId),
      supabaseAdmin.from('messages').select('*').eq('sender_id', userId),
      supabaseAdmin.from('conversations').select('*').or(`participant_1.eq.${userId},participant_2.eq.${userId}`),
      supabaseAdmin.from('recommendations').select('*').eq('target_id', userId),
      supabaseAdmin.from('recommendations').select('*').eq('author_id', userId),
      supabaseAdmin.from('favorites').select('*').eq('owner_id', userId),
    ]);

    const exportData = {
      export_genere_le: new Date().toISOString(),
      compte: { id: userId, email: userEmail },
      profil: profile.data,
      profils_joueur: playerListings.data,
      annonces_club: clubNeeds.data,
      profils_staff: staffListings.data,
      recherches_joueur: playerSearches.data,
      messages_envoyes: messages.data,
      conversations: conversations.data,
      recommandations_recues: recommendationsReceived.data,
      recommandations_ecrites: recommendationsWritten.data,
      favoris: favorites.data,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="turnover-mes-donnees.json"',
      },
    });
  } catch (err) {
    console.error('Erreur export données:', err);
    return Response.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
