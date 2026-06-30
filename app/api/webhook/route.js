import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature webhook invalide:', err.message);
    return Response.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await supabaseAdmin.from('subscriptions').upsert({
          owner_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          status: 'active',
          plan,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id' });
        break;
      }

      // Se déclenche à chaque renouvellement de facture (chaque mois ou chaque année).
      // C'est ici qu'on compte les cycles pour basculer 29€ → 79€ après le 3e mois.
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata?.supabase_user_id;
        const plan = subscription.metadata?.plan;
        if (!userId) break;

        // Met à jour la date de fin de période à chaque paiement réussi
        await supabaseAdmin.from('subscriptions').update({
          status: 'active',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('owner_id', userId);

        // Logique de bascule de prix : uniquement pour le plan mensuel
        if (plan === 'monthly') {
          const cyclesDone = parseInt(subscription.metadata?.launch_cycles_done || '0', 10) + 1;

          if (cyclesDone >= 3) {
            // 3e cycle payé au tarif de lancement : on bascule le prix pour le PROCHAIN cycle.
            const currentItem = subscription.items.data[0];
            if (currentItem.price.id === process.env.STRIPE_PRICE_MONTHLY_LAUNCH) {
              await stripe.subscriptions.update(subscription.id, {
                items: [{ id: currentItem.id, price: process.env.STRIPE_PRICE_MONTHLY_TARGET }],
                proration_behavior: 'none', // pas de facturation immédiate, le nouveau prix s'applique au prochain renouvellement
                metadata: { ...subscription.metadata, launch_cycles_done: String(cyclesDone) },
              });
            }
          } else {
            await stripe.subscriptions.update(subscription.id, {
              metadata: { ...subscription.metadata, launch_cycles_done: String(cyclesDone) },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;

        await supabaseAdmin.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('owner_id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;

        await supabaseAdmin.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('owner_id', userId);
        break;
      }

      default:
        break; // événement non géré, ignoré sans erreur
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Erreur traitement webhook:', err);
    return Response.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
