import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Non authentifié.' }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return Response.json({ error: 'Session invalide.' }, { status: 401 });
    const userId = authData.user.id;

    // Suppression explicite, "best effort", des données liées à l'utilisateur.
    // Sert de filet de sécurité en plus des éventuelles suppressions en cascade en base.
    const tablesByOwner = ['player_listings', 'club_needs', 'staff_listings', 'player_searches', 'notifications', 'recommendations', 'favorites', 'reports'];
    for (const table of tablesByOwner) {
      await supabaseAdmin.from(table).delete().eq('owner_id', userId).then(() => {}).catch(() => {});
    }
    await supabaseAdmin.from('recommendations').delete().eq('author_id', userId);
    await supabaseAdmin.from('reports').delete().eq('reporter_id', userId);
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId);
    await supabaseAdmin.from('conversations').delete().or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    // Tente de supprimer les fichiers de la galerie/avatar (best effort, ne bloque pas si ça échoue)
    try {
      const { data: files } = await supabaseAdmin.storage.from('avatars').list(userId);
      if (files?.length) {
        await supabaseAdmin.storage.from('avatars').remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // non bloquant
    }

    // Supprime la ligne profile explicitement (si pas déjà en cascade)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Supprime le compte d'authentification lui-même — déclenche les cascades restantes si configurées
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      return Response.json({ error: 'Erreur lors de la suppression du compte.' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Erreur suppression compte:', err);
    return Response.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
