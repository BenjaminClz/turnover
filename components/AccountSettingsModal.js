'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Field, TextInput, PrimaryButton } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';

export default function AccountSettingsModal({ open, profile, onClose, showToast }) {
  const supabase = createClient();
  const isClub = profile?.role === 'club';
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setNom(profile.nom || '');
    setPrenom(profile.prenom || '');
    setTelephone(profile.telephone || '');
    setAdresse(profile.adresse || '');
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim() || (isClub && !adresse.trim())) {
      showToast('Tous les champs sont requis.');
      return;
    }
    setSaving(true);

    const payload = {
      nom: isClub ? nom.trim() : `${prenom.trim()} ${nom.trim()}`.trim(),
      prenom: isClub ? null : prenom.trim(),
      telephone: telephone.trim(),
    };

    // Si l'adresse du club a changé, on la re-géolocalise avant d'enregistrer.
    if (isClub && adresse.trim() !== (profile.adresse || '')) {
      const geo = await geocodeVille(adresse.trim());
      if (!geo) {
        setSaving(false);
        showToast("Adresse non reconnue. Vérifie l'orthographe.");
        return;
      }
      payload.adresse = adresse.trim();
      payload.latitude = geo.latitude;
      payload.longitude = geo.longitude;
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
    setSaving(false);
    if (error) {
      showToast(`Erreur : ${error.message}`);
      return;
    }
    showToast('Informations mises à jour ✓');
    window.location.reload();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,26,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}>
        <h3 style={{ fontSize: 18, marginBottom: 20 }}>Modifier mes informations</h3>
        <form onSubmit={handleSave}>
          {isClub ? (
            <Field label="Nom du club">
              <TextInput value={nom} onChange={(e) => setNom(e.target.value)} required />
            </Field>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Prénom">
                <TextInput value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
              </Field>
              <Field label="Nom">
                <TextInput value={nom} onChange={(e) => setNom(e.target.value)} required />
              </Field>
            </div>
          )}
          <Field label="Téléphone">
            <TextInput type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
          </Field>
          {isClub && (
            <Field label="Adresse des locaux" hint="Adresse complète, ex. « 12 rue du Stade, Annemasse ».">
              <TextInput value={adresse} onChange={(e) => setAdresse(e.target.value)} required />
            </Field>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <PrimaryButton type="submit" disabled={saving} style={{ width: 'auto', flex: 1 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </PrimaryButton>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '15px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
