'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton } from '@/components/ui';

export default function ClubsTab({ user, profile, showToast, onContact }) {
  const supabase = createClient();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '', urgence: 'Dès que possible', details: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('club_needs')
      .select('*, profiles(nom)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setNeeds(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poste || !form.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    const { error } = await supabase.from('club_needs').insert({
      owner_id: user.id,
      club: profile.nom,
      sport: form.sport, poste: form.poste, niveau: form.niveau, ville: form.ville,
      urgence: form.urgence, details: form.details,
    });
    if (error) { showToast('Erreur lors de la publication.'); return; }
    showToast('Besoin publié ✓');
    load();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('club_needs').delete().eq('id', id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    load();
  };

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 10 }}>Besoins clubs</h1>
      <p style={{ color: '#8C9A8E', marginBottom: 28, maxWidth: 520 }}>Visibles par tous les joueurs. Publie un poste si tu recrutes.</p>

      {profile.role === 'club' && (
        <form onSubmit={handleSubmit} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 26, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 18, fontSize: 16 }}>Publier un besoin</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value, poste: '' })} options={SPORTS} /></Field>
            <Field label="Poste recherché"><Select value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} options={['', ...(POSTES[form.sport] || [])]} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Niveau du club"><Select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} options={NIVEAUX} /></Field>
            <Field label="Ville"><TextInput value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Annemasse" /></Field>
          </div>
          <Field label="Urgence"><Select value={form.urgence} onChange={(e) => setForm({ ...form, urgence: e.target.value })} options={URGENCES} /></Field>
          <Field label="Détails"><TextArea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Jours d'entraînement, ambiance du club…" /></Field>
          <PrimaryButton type="submit">Publier ce besoin</PrimaryButton>
        </form>
      )}

      {loading ? (
        <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : needs.length === 0 ? (
        <EmptyState icon="📋" title="Aucun besoin publié" sub="Les clubs inscrits peuvent publier leurs besoins ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {needs.map((n) => (
            <div key={n.id} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{n.club} <span style={{ color: '#8C9A8E', fontWeight: 500 }}>recherche</span> {n.poste}</div>
                <div style={{ fontSize: 13, color: '#8C9A8E', marginTop: 2 }}>{n.sport} · {n.niveau} · {n.ville}</div>
                {n.details && <div style={{ fontSize: 13, color: '#A8B5A9', marginTop: 8, maxWidth: 460 }}>{n.details}</div>}
                <div style={{ marginTop: 10 }}><Badge tone={n.urgence === 'Dès que possible' ? 'urgent' : 'default'}>{n.urgence}</Badge></div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {n.owner_id !== user.id && (
                  <button onClick={() => onContact(n.owner_id, n.club, `${n.poste} · ${n.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Contacter</button>
                )}
                {n.owner_id === user.id && <button onClick={() => handleDelete(n.id)} style={{ background: 'transparent', border: 'none', color: '#8C9A8E', cursor: 'pointer', fontSize: 13 }}>Supprimer</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
