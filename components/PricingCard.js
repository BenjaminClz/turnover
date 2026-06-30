'use client';

import { useState } from 'react';
import { PrimaryButton, SecondaryButton, Badge } from '@/components/ui';

export default function PricingCard({ userId, isActive, showToast }) {
  const [loading, setLoading] = useState(null); // 'monthly' | 'yearly' | null

  const startCheckout = async (plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Erreur lors de la création du paiement.');
        setLoading(null);
      }
    } catch {
      showToast('Erreur réseau, réessaie.');
      setLoading(null);
    }
  };

  if (isActive) {
    return (
      <div style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid #D4FF3F', borderRadius: 18, padding: 24, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Abonnement Turnover Pro actif ✓</div>
          <div style={{ fontSize: 14, color: '#A4B0A6' }}>Annonces illimitées, mise en avant, statistiques et coordonnées directes débloquées.</div>
        </div>
        <Badge tone="lime">Pro</Badge>
      </div>
    );
  }

  return (
    <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 32 }}>
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>Passer à Turnover Pro</h3>
      <p style={{ fontSize: 14, color: '#A4B0A6', marginBottom: 24 }}>Annonces illimitées, mise en avant dans la recherche, coordonnées directes et statistiques de consultation.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#0B1F1A', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>Tarif de lancement</div>
          <div style={{ fontFamily: 'Anton', fontSize: 30, marginBottom: 4 }}>29€<span style={{ fontFamily: 'Inter', fontSize: 14, color: '#A4B0A6', fontWeight: 500 }}>/mois</span></div>
          <div style={{ fontSize: 12.5, color: '#A4B0A6', marginBottom: 18 }}>pendant 3 mois, puis 79€/mois</div>
          <PrimaryButton onClick={() => startCheckout('monthly')} disabled={loading !== null}>
            {loading === 'monthly' ? 'Redirection…' : 'Choisir le mensuel'}
          </PrimaryButton>
        </div>
        <div style={{ background: '#0B1F1A', border: '1.5px solid #D4FF3F', borderRadius: 14, padding: 22, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, right: 18, background: '#D4FF3F', color: '#0B1F1A', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: '0 0 6px 6px', letterSpacing: '0.04em' }}>2 MOIS OFFERTS</div>
          <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>Annuel</div>
          <div style={{ fontFamily: 'Anton', fontSize: 30, marginBottom: 4 }}>790€<span style={{ fontFamily: 'Inter', fontSize: 14, color: '#A4B0A6', fontWeight: 500 }}>/an</span></div>
          <div style={{ fontSize: 12.5, color: '#A4B0A6', marginBottom: 18 }}>soit 65,80€/mois</div>
          <PrimaryButton onClick={() => startCheckout('yearly')} disabled={loading !== null}>
            {loading === 'yearly' ? 'Redirection…' : "Choisir l'annuel"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
