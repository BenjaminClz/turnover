'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { TextArea, PrimaryButton, SecondaryButton } from '@/components/ui';

export default function ReportButton({ targetType, targetId, targetOwnerId, reporterId, showToast, style }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (targetOwnerId === reporterId) return null; // on ne peut pas se signaler soi-même

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterId, target_type: targetType, target_id: targetId,
      target_owner_id: targetOwnerId, reason: reason || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '23505') showToast('Tu as déjà signalé ce contenu.');
      else showToast('Erreur lors du signalement.');
      setOpen(false);
      return;
    }
    showToast('Signalement envoyé. Merci de contribuer à un site plus sûr.');
    setOpen(false);
    setReason('');
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{ background: 'transparent', border: 'none', color: '#8C9A8E', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', ...style }}
      >
        Signaler
      </button>

      {open && (
        <div onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 26, maxWidth: 420, width: '100%' }}>
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Signaler ce contenu</h3>
            <p style={{ fontSize: 13.5, color: '#A4B0A6', marginBottom: 16 }}>Explique brièvement le problème (optionnel). Les signalements répétés peuvent entraîner la suspension du compte concerné.</p>
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. propos inappropriés, fausse annonce…" style={{ minHeight: 80, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <PrimaryButton onClick={handleSubmit} disabled={submitting} style={{ width: 'auto', flex: 1 }}>{submitting ? 'Envoi…' : 'Envoyer le signalement'}</PrimaryButton>
              <SecondaryButton onClick={() => setOpen(false)}>Annuler</SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
