// Script à lancer UNE SEULE FOIS pour créer les produits et prix dans Stripe.
// Usage : node scripts/setup-stripe-products.js
// Affiche à la fin les Price IDs à copier dans .env.local

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
  console.log('→ Création du produit "Turnover Club Pro"…');
  const product = await stripe.products.create({
    name: 'Turnover Club Pro',
    description: 'Annonces illimitées, mise en avant, statistiques et coordonnées directes pour les clubs.',
  });

  console.log('→ Création du prix mensuel de lancement (29€/mois, 3 cycles)…');
  // Stripe ne permet pas nativement un "prix qui change après N cycles" sur un Price unique.
  // On gère ça avec deux Price distincts + une bascule programmée au niveau de l'abonnement
  // (voir lib/stripe-helpers.js : schedule de changement de prix après 3 mois).
  const priceMonthlyLaunch = await stripe.prices.create({
    product: product.id,
    unit_amount: 2900, // 29,00 €
    currency: 'eur',
    recurring: { interval: 'month' },
    nickname: 'Mensuel - tarif de lancement (29€)',
  });

  console.log('→ Création du prix mensuel cible (79€/mois)…');
  const priceMonthlyTarget = await stripe.prices.create({
    product: product.id,
    unit_amount: 7900, // 79,00 €
    currency: 'eur',
    recurring: { interval: 'month' },
    nickname: 'Mensuel - tarif cible (79€)',
  });

  console.log('→ Création du prix annuel (790€/an, 2 mois offerts)…');
  const priceYearly = await stripe.prices.create({
    product: product.id,
    unit_amount: 79000, // 790,00 €
    currency: 'eur',
    recurring: { interval: 'year' },
    nickname: 'Annuel (790€)',
  });

  console.log('\n✅ Produits et prix créés avec succès !\n');
  console.log('Copie ces lignes dans ton fichier .env.local :\n');
  console.log(`STRIPE_PRICE_MONTHLY_LAUNCH=${priceMonthlyLaunch.id}`);
  console.log(`STRIPE_PRICE_MONTHLY_TARGET=${priceMonthlyTarget.id}`);
  console.log(`STRIPE_PRICE_YEARLY=${priceYearly.id}`);
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
