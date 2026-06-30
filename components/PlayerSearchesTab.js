'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, SecondaryButton } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';

const emptyForm = { sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '', urgence: 'Dès que possible', details: '' };

export default function PlayerSearchesTab({ user, showToast, onContact }) {
  const supabase = createClient();
  const [searches, setSearches] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_searches')
      .select('*, profiles(nom)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setSearches(data || []);
    setMyListings((data || []).filter((s) => s.owner_id === user.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreating = () => { setForm(emptyForm); setCreating(true); setEditingId(null); };
  const startEditing = (listing) => { setForm({ ...emptyForm, ...listing }); setEditingId(listing.id); setCreating(false); };
  const cancelForm = () => { setCreating(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poste || !form.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    setGeocoding(true);
    const geo = await geocodeVille(form.ville);
    setGeocoding(false);
    if (!geo) { showToast(`Ville "${form.ville}" non reconnue.`); return; }

    const payload = {
      owner_id: user.id, sport: form.sport, poste: form.poste, niveau: form.niveau, ville: form.ville,
      urgence: form.urgence, details: form.details, latitude: geo.latitude, longitude: geo.longitude,
    };

    if (editingId) {
      const { error } = await supabase.from('player_searches').update(payload).eq('id', editingId);
      if (error) { showToast('Erreur lors de la mise à jour.'); return; }
      showToast('Recherche mise à jour ✓');
    } else {
      const { error } = await supabase.from('player_searches').insert(payload);
      if (error) { showToast('Erreur lors de la publication.'); return; }
      showToast('Recherche publiée ✓');
    }
    cancelForm();
    load();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('player_searches').delete().eq('id', id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    showToast('Recherche supprimée.');
    load();
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value, poste: '' })} options={SPORTS} /></Field>
        <Field label="Poste"><Select value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} options={['', ...(POSTES[form.sport] || [])]} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Field label="Niveau recherché"><Select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} options={NIVEAUX} /></Field>
        <Field label="Ville"><TextInput value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Annemasse" /></Field>
      </div>
      <Field label="Urgence"><Select value={form.urgence} onChange={(e) => setForm({ ...form, urgence: e.target.value })} options={URGENCES} /></Field>
      <Field label="Détails"><TextArea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Ce que tu recherches dans un club, tes disponibilités d'entraînement…" /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <PrimaryButton type="submit" disabled={geocoding} style={{ width: 'auto', flex: 1 }}>{geocoding ? 'Localisation…' : (editingId ? 'Enregistrer' : 'Publier cette recherche')}</PrimaryButton>
        <SecondaryButton type="button" onClick={cancelForm}>Annuler</SecondaryButton>
      </div>
    </form>
  );

  const othersSearches = searches.filter((s) => s.owner_id !== user.id);

  return (
    <div>
      <p style={{ fontSize: 14, color: '#A4B0A6', marginBottom: 20 }}>
        Publie une recherche active pour signaler que tu cherches un club — gratuit et illimité, en plus de ton profil.
      </p>

      {myListings.length > 0 && !creating && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, color: '#D4FF3F', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 700 }}>Mes recherches ({myListings.length})</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {myListings.map((listing) => (
              editingId === listing.id ? (
                <div key={listing.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ marginBottom: 18, fontSize: 16 }}>Modifier ma recherche</h3>
                  {renderForm()}
                </div>
              ) : (
                <div key={listing.id} style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid #D4FF3F', borderRadius: 14, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{listing.poste} · {listing.niveau}</div>
                    <div style={{ fontSize: 13, color: '#A4B0A6', marginTop: 2 }}>{listing.ville}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEditing(listing)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '8px 14px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Modifier</button>
                    <button onClick={() => handleDelete(listing.id)} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '8px 14px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Supprimer</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {!creating && !editingId && (
        <div style={{ marginBottom: 28 }}>
          <button onClick={startCreating} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '12px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Publier une recherche de club
          </button>
        </div>
      )}

      {creating && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <h3 style={{ marginBottom: 18, fontSize: 16 }}>Nouvelle recherche de club</h3>
          {renderForm()}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 30 }}>Chargement…</div>
      ) : othersSearches.length === 0 ? (
        <EmptyState icon="🔍" title="Aucune autre recherche pour le moment" sub="Les recherches publiées par d'autres joueurs apparaîtront ici." />
      ) : (
        <div>
          <h3 style={{ fontSize: 14, color: '#D4FF3F', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 700 }}>Autres joueurs en recherche</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {othersSearches.map((s) => (
              <div key={s.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.profiles?.nom} <span style={{ color: '#A4B0A6', fontWeight: 500 }}>cherche</span> {s.poste}</div>
                  <div style={{ fontSize: 13, color: '#A4B0A6', marginTop: 2 }}>{s.niveau} · {s.ville}</div>
                  {s.details && <div style={{ fontSize: 13, color: '#C7CFC8', marginTop: 6, maxWidth: 420 }}>{s.details}</div>}
                  <div style={{ marginTop: 8 }}><Badge tone={s.urgence === 'Dès que possible' ? 'urgent' : 'default'}>{s.urgence}</Badge></div>
                </div>
                <button onClick={() => onContact(s.owner_id, s.profiles?.nom, `${s.poste} · ${s.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Contacter</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
