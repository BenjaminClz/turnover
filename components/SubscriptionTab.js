'use client';

import { PageTitle, PageSubtitle } from '@/components/ui';
import { useSubscription } from '@/lib/use-subscription';
import PricingCard from '@/components/PricingCard';

export default function SubscriptionTab({ user, showToast }) {
  const { isActive, loading } = useSubscription(user.id);

  return (
    <div>
      <PageTitle>Abonnement</PageTitle>
      <PageSubtitle>Gère ton abonnement Turnover Pro — annonces illimitées, mise en avant, coordonnées directes et statistiques.</PageSubtitle>

      {!loading && <PricingCard userId={user.id} isActive={isActive} showToast={showToast} />}

      <div style={{ fontSize: 13, color: '#A4B0A6', lineHeight: 1.6, maxWidth: 520 }}>
        <p style={{ marginBottom: 10 }}>Le tarif de lancement à 29€/mois s'applique pendant les 3 premiers mois, puis bascule automatiquement à 79€/mois. L'abonnement annuel est fixe à 790€/an (2 mois offerts).</p>
        <p>Tu peux annuler à tout moment ; l'accès Pro reste actif jusqu'à la fin de la période déjà payée.</p>
      </div>
    </div>
  );
}
