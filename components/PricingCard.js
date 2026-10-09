'use client';

import { useState } from 'react';
import { PrimaryButton, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase-client';

export default function PricingCard({ userId, isActive, showToast }) {
  const [loading, setLoading] = useState(null); // 'monthly' | 'yearly' | null
  const supabase = createClient();

  const startCheckout = async (plan) => {
    setLoading(plan);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Session expirée, reconnecte-toi.');
        setLoading(null);
        return;
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
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
      <div style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid var(--lime)', borderRadius: 16, padding: 24, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Abonnement Turnover Pro actif ✓</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Annonces illimitées, mise en avant, statistiques et coordonnées directes débloquées.</div>
        </div>
        <Badge tone="lime">Pro</Badge>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 28, marginBottom: 32 }}>
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>Passer à Turnover Pro</h3>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Annonces illimitées, mise en avant dans la recherche, coordonnées directes et statistiques de consultation.</p>

      <div className="tv-grid-2" style={{ gap: 16 }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>Tarif de lancement</div>
          <div style={{ fontFamily: 'Anton', fontSize: 32, marginBottom: 4 }}>29€<span style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>/mois</span></div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>pendant 3 mois, puis 79€/mois</div>
          <PrimaryButton onClick={() => startCheckout('monthly')} disabled={loading !== null}>
            {loading === 'monthly' ? 'Redirection…' : 'Choisir le mensuel'}
          </PrimaryButton>
        </div>
        <div style={{ background: 'var(--bg)', border: '1.5px solid var(--lime)', borderRadius: 12, padding: 22, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, right: 18, background: 'var(--lime)', color: 'var(--on-lime)', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: '0 0 6px 6px', letterSpacing: '0.04em' }}>2 MOIS OFFERTS</div>
          <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>Annuel</div>
          <div style={{ fontFamily: 'Anton', fontSize: 32, marginBottom: 4 }}>790€<span style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>/an</span></div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>soit 65,80€/mois</div>
          <PrimaryButton onClick={() => startCheckout('yearly')} disabled={loading !== null}>
            {loading === 'yearly' ? 'Redirection…' : "Choisir l'annuel"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
