'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, GhostButton } from '@/components/ui';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export default function PlayersTab({ user, profile, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '', distance: '15', dispo: 'Dès que possible', bio: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_listings')
      .select('*, profiles(nom)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setPlayers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poste || !form.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    const { error } = await supabase.from('player_listings').insert({
      owner_id: user.id,
      sport: form.sport, poste: form.poste, niveau: form.niveau, ville: form.ville,
      distance: parseInt(form.distance) || 15, dispo: form.dispo, bio: form.bio,
    });
    if (error) { showToast("Erreur lors de la publication."); return; }
    showToast('Profil publié ✓');
    load();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('player_listings').delete().eq('id', id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    load();
  };

  return (
    <div>
      <h1 className="turnover-anton" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: 10 }}>Profils joueurs</h1>
      <p style={{ color: '#8C9A8E', marginBottom: 28, maxWidth: 520 }}>Visibles par tous les clubs. Crée le tien si tu cherches une équipe.</p>

      {profile.role === 'joueur' && (
        <form onSubmit={handleSubmit} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 26, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 18, fontSize: 16 }}>Publier mon profil</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value, poste: '' })} options={SPORTS} /></Field>
            <Field label="Poste"><Select value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} options={['', ...(POSTES[form.sport] || [])]} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Niveau"><Select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} options={NIVEAUX} /></Field>
            <Field label="Ville"><TextInput value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Genève" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Rayon (km)"><TextInput type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} /></Field>
            <Field label="Disponibilité"><Select value={form.dispo} onChange={(e) => setForm({ ...form, dispo: e.target.value })} options={URGENCES} /></Field>
          </div>
          <Field label="Présentation"><TextArea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Ton parcours, ce que tu recherches…" /></Field>
          <PrimaryButton type="submit">Publier mon profil</PrimaryButton>
        </form>
      )}

      {loading ? (
        <div style={{ color: '#8C9A8E', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : players.length === 0 ? (
        <EmptyState icon="👤" title="Aucun profil pour le moment" sub="Les joueurs inscrits peuvent publier leur profil ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {players.map((p) => (
            <div key={p.id} style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', color: '#0B1F1A', fontSize: 15, flexShrink: 0 }}>
                  {initials(p.profiles?.nom)}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.profiles?.nom}</div>
                  <div style={{ fontSize: 13, color: '#8C9A8E', marginTop: 2 }}>{p.poste} · {p.niveau} · {p.ville} ({p.distance} km)</div>
                  {p.bio && <div style={{ fontSize: 13, color: '#A8B5A9', marginTop: 8, maxWidth: 460 }}>{p.bio}</div>}
                  <div style={{ marginTop: 10 }}><Badge tone="lime">{p.dispo}</Badge></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <GhostButton onClick={() => onViewGallery(p.owner_id, p.profiles?.nom)}>Galerie</GhostButton>
                {p.owner_id !== user.id && (
                  <button onClick={() => onContact(p.owner_id, p.profiles?.nom, `${p.poste} · ${p.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Contacter</button>
                )}
                {p.owner_id === user.id && <button onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', color: '#8C9A8E', cursor: 'pointer', fontSize: 13 }}>Supprimer</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
