'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, GhostButton, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const emptyForm = { sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '', distance: '15', dispo: 'Dès que possible', bio: '' };

export default function PlayersTab({ user, profile, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const [players, setPlayers] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_listings')
      .select('*, profiles(nom)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setPlayers(data || []);
    const mine = (data || []).find((p) => p.owner_id === user.id);
    setMyListing(mine || null);
    if (mine) setForm({ ...emptyForm, ...mine, distance: String(mine.distance) });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poste || !form.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    setGeocoding(true);
    const geo = await geocodeVille(form.ville);
    setGeocoding(false);
    if (!geo) { showToast(`Ville "${form.ville}" non reconnue. Vérifie l'orthographe.`); return; }

    const payload = {
      owner_id: user.id,
      sport: form.sport, poste: form.poste, niveau: form.niveau, ville: form.ville,
      distance: parseInt(form.distance) || 15, dispo: form.dispo, bio: form.bio,
      latitude: geo.latitude, longitude: geo.longitude,
    };

    if (myListing) {
      const { error } = await supabase.from('player_listings').update(payload).eq('id', myListing.id);
      if (error) { showToast('Erreur lors de la mise à jour.'); return; }
      showToast('Profil mis à jour ✓');
    } else {
      const { error } = await supabase.from('player_listings').insert(payload);
      if (error) { showToast('Erreur lors de la publication.'); return; }
      showToast('Profil publié ✓');
    }
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!myListing) return;
    const { error } = await supabase.from('player_listings').delete().eq('id', myListing.id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    setMyListing(null);
    setForm(emptyForm);
    showToast('Profil supprimé.');
    load();
  };

  const renderFormFields = () => (
    <>
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
    </>
  );

  return (
    <div>
      <PageTitle>Profils joueurs</PageTitle>
      <PageSubtitle>Visibles par tous les clubs. Crée le tien si tu cherches une équipe.</PageSubtitle>

      {profile.role === 'joueur' && !myListing && !editing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Publier mon profil</h3>
          <form onSubmit={handleSubmit}>
            {renderFormFields()}
            <PrimaryButton type="submit" disabled={geocoding}>{geocoding ? 'Localisation de la ville…' : 'Publier mon profil'}</PrimaryButton>
          </form>
        </div>
      )}

      {profile.role === 'joueur' && myListing && !editing && (
        <div style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid #D4FF3F', borderRadius: 18, padding: 24, marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ton profil est publié</div>
            <div style={{ fontSize: 14, color: '#A4B0A6' }}>{myListing.poste} · {myListing.niveau} · {myListing.ville}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditing(true)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Modifier</button>
            <button onClick={handleDelete} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Supprimer</button>
          </div>
        </div>
      )}

      {profile.role === 'joueur' && myListing && editing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Modifier mon profil</h3>
          <form onSubmit={handleSubmit}>
            {renderFormFields()}
            <div style={{ display: 'flex', gap: 12 }}>
              <PrimaryButton type="submit" disabled={geocoding} style={{ width: 'auto', flex: 1 }}>{geocoding ? 'Localisation…' : 'Enregistrer'}</PrimaryButton>
              <button type="button" onClick={() => { setEditing(false); setForm({ ...emptyForm, ...myListing, distance: String(myListing.distance) }); }} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '15px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : players.length === 0 ? (
        <EmptyState icon="👤" title="Aucun profil pour le moment" sub="Les joueurs inscrits peuvent publier leur profil ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {players.map((p) => (
            <div key={p.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', color: '#0B1F1A', fontSize: 16, flexShrink: 0 }}>
                  {initials(p.profiles?.nom)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.profiles?.nom}</div>
                  <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>{p.poste} · {p.niveau} · {p.ville} ({p.distance} km)</div>
                  {p.bio && <div style={{ fontSize: 14, color: '#C7CFC8', marginTop: 10, maxWidth: 460 }}>{p.bio}</div>}
                  <div style={{ marginTop: 12 }}><Badge tone="lime">{p.dispo}</Badge></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <GhostButton onClick={() => onViewGallery(p.owner_id, p.profiles?.nom)}>Galerie</GhostButton>
                {p.owner_id !== user.id && (
                  <button onClick={() => onContact(p.owner_id, p.profiles?.nom, `${p.poste} · ${p.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Contacter</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
