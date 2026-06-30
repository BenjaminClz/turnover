import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Client Supabase côté serveur avec la clé service_role (contourne RLS),
// nécessaire car on doit lire/écrire des infos d'abonnement de manière fiable.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, plan } = await request.json(); // plan: 'monthly' | 'yearly'
    if (!userId || !['monthly', 'yearly'].includes(plan)) {
      return Response.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('nom').eq('id', userId).single();
    if (!profile) return Response.json({ error: 'Profil introuvable.' }, { status: 404 });

    // Récupère ou crée le customer Stripe associé à ce club
    const { data: existingSub } = await supabaseAdmin.from('subscriptions').select('*').eq('owner_id', userId).maybeSingle();

    let customerId = existingSub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ name: profile.nom, metadata: { supabase_user_id: userId } });
      customerId = customer.id;
    }

    const origin = request.headers.get('origin');

    if (plan === 'yearly') {
      // Abonnement annuel simple, un seul prix fixe.
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: process.env.STRIPE_PRICE_YEARLY, quantity: 1 }],
        success_url: `${origin}/app?upgrade=success`,
        cancel_url: `${origin}/app?upgrade=cancelled`,
        metadata: { supabase_user_id: userId, plan: 'yearly' },
      });
      return Response.json({ url: session.url });
    }

    // Abonnement mensuel : démarre au tarif de lancement (29€).
    // La bascule vers le tarif cible (79€) après 3 mois est gérée par le
    // webhook (voir app/api/webhook/route.js), qui modifie l'abonnement
    // Stripe au moment du renouvellement du 3e cycle.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY_LAUNCH, quantity: 1 }],
      success_url: `${origin}/app?upgrade=success`,
      cancel_url: `${origin}/app?upgrade=cancelled`,
      metadata: { supabase_user_id: userId, plan: 'monthly', launch_cycles_done: '0' },
      subscription_data: { metadata: { supabase_user_id: userId, plan: 'monthly', launch_cycles_done: '0' } },
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Erreur Checkout:', err);
    return Response.json({ error: 'Erreur lors de la création du paiement.' }, { status: 500 });
  }
}
