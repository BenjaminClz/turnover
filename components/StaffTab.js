'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, URGENCES, SPECIALITES_SANTE, TYPES_MISSION_BENEVOLE, NIVEAUX_ARBITRAGE, ROLE_LABELS } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';
import AvatarUpload, { avatarUrl } from '@/components/AvatarUpload';

const ROLE_CONFIG = {
  sante: {
    title: 'Professionnels de santé',
    subtitle: 'Médecins, kinésithérapeutes, ostéopathes… visibles par les clubs qui recherchent un suivi médical.',
    formTitle: 'Publier mon profil',
  },
  preparateur: {
    title: 'Préparateurs physiques',
    subtitle: 'Visibles par les clubs qui recherchent un encadrement de la préparation physique.',
    formTitle: 'Publier mon profil',
  },
  entraineur: {
    title: 'Entraîneurs / Coachs',
    subtitle: 'Visibles par les clubs qui recherchent un encadrement technique.',
    formTitle: 'Publier mon profil',
  },
  arbitre: {
    title: 'Arbitres',
    subtitle: 'Visibles par les clubs et ligues qui recherchent des arbitres pour leurs rencontres.',
    formTitle: 'Publier mon profil',
  },
  benevole: {
    title: 'Bénévoles',
    subtitle: "Visibles par les clubs qui recherchent de l'aide sur la vie du club.",
    formTitle: 'Proposer mon aide',
  },
};

const emptyForm = { specialite: '', diplome: '', sport: 'Rugby', niveau: '', type_mission: '', type_mission_autre: '', ville: '', distance: '25', dispo: 'Dès que possible', bio: '' };

export default function StaffTab({ role, user, profile, showToast, onContact }) {
  const supabase = createClient();
  const config = ROLE_CONFIG[role];
  const [listings, setListings] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_listings')
      .select('*, profiles(nom, avatar_path)')
      .eq('role', role)
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setListings(data || []);
    const mine = (data || []).find((l) => l.owner_id === user.id);
    setMyListing(mine || null);
    if (mine) setForm({ ...emptyForm, ...mine, distance: String(mine.distance) });
    setLoading(false);
  };

  useEffect(() => { load(); setEditing(false); }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ville.trim()) { showToast('La ville est obligatoire.'); return; }
    setGeocoding(true);
    const geo = await geocodeVille(form.ville);
    setGeocoding(false);
    if (!geo) { showToast(`Ville "${form.ville}" non reconnue.`); return; }

    const payload = {
      owner_id: user.id, role,
      specialite: form.specialite, diplome: form.diplome, sport: form.sport, niveau: form.niveau, type_mission: form.type_mission,
      type_mission_autre: form.type_mission === 'Autre' ? (form.type_mission_autre || null) : null,
      ville: form.ville, distance: parseInt(form.distance) || 25, dispo: form.dispo, bio: form.bio,
      latitude: geo.latitude, longitude: geo.longitude,
    };

    if (myListing) {
      const { error } = await supabase.from('staff_listings').update(payload).eq('id', myListing.id);
      if (error) { showToast('Erreur lors de la mise à jour.'); return; }
      showToast('Profil mis à jour ✓');
    } else {
      const { error } = await supabase.from('staff_listings').insert(payload);
      if (error) { showToast('Erreur lors de la publication.'); return; }
      showToast('Profil publié ✓');

      // Publication automatique dans le fil d'actualité.
      await supabase.from('posts').insert({
        author_id: user.id,
        content: `${profile.nom} propose ses services : ${ROLE_LABELS[role]} · ${payload.ville}`,
      });
    }
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!myListing) return;
    const { error } = await supabase.from('staff_listings').delete().eq('id', myListing.id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    setMyListing(null);
    setForm(emptyForm);
    showToast('Profil supprimé.');
    load();
  };

  const renderSpecificFields = () => {
    if (role === 'sante') {
      return (
        <>
          <Field label="Spécialité"><Select value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} options={['', ...SPECIALITES_SANTE]} /></Field>
          <Field label="Diplôme / certification"><TextInput value={form.diplome} onChange={(e) => setForm({ ...form, diplome: e.target.value })} placeholder="ex. Diplôme d'État de kinésithérapie" /></Field>
          <Field label="Sport(s) suivi(s)"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
        </>
      );
    }
    if (role === 'preparateur') {
      return (
        <>
          <Field label="Diplôme / certification"><TextInput value={form.diplome} onChange={(e) => setForm({ ...form, diplome: e.target.value })} placeholder="ex. BPJEPS, Licence STAPS…" /></Field>
          <Field label="Sport(s) suivi(s)"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
        </>
      );
    }
    if (role === 'entraineur') {
      return (
        <>
          <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
          <Field label="Niveau encadré"><TextInput value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} placeholder="ex. Seniors Régionale 2, U16…" /></Field>
          <Field label="Diplôme"><TextInput value={form.diplome} onChange={(e) => setForm({ ...form, diplome: e.target.value })} placeholder="ex. BMU, DEJEPS…" /></Field>
        </>
      );
    }
    if (role === 'arbitre') {
      return (
        <>
          <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
          <Field label="Niveau d'arbitrage"><Select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} options={['', ...NIVEAUX_ARBITRAGE]} /></Field>
        </>
      );
    }
    if (role === 'benevole') {
      return (
        <>
          <Field label="Type de mission"><Select value={form.type_mission} onChange={(e) => setForm({ ...form, type_mission: e.target.value })} options={['', ...TYPES_MISSION_BENEVOLE]} /></Field>
          {form.type_mission === 'Autre' && (
            <Field label="Précise ta mission"><TextInput value={form.type_mission_autre} onChange={(e) => setForm({ ...form, type_mission_autre: e.target.value })} placeholder="ex. Animation jeune public, entretien matériel…" /></Field>
          )}
          <Field label="Sport (optionnel)"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={['', ...SPORTS]} /></Field>
        </>
      );
    }
    return null;
  };

  const renderCardDetails = (l) => {
    if (l.role === 'sante') return `${l.specialite || 'Professionnel de santé'} · ${l.sport || ''}`.trim();
    if (l.role === 'preparateur') return `Préparateur physique · ${l.sport || ''}`.trim();
    if (l.role === 'entraineur') return `Entraîneur ${l.sport || ''} · ${l.niveau || ''}`.trim();
    if (l.role === 'arbitre') return `Arbitre ${l.sport || ''} · ${l.niveau || ''}`.trim();
    if (l.role === 'benevole') return l.type_mission === 'Autre' && l.type_mission_autre ? l.type_mission_autre : (l.type_mission || 'Bénévole');
    return '';
  };

  const showForm = editing || (!myListing && true);

  return (
    <div>
      <PageTitle>{config.title}</PageTitle>
      <PageSubtitle>{config.subtitle}</PageSubtitle>

      <div style={{ marginBottom: 28 }}>
        <AvatarUpload userId={user.id} currentPath={profile?.avatar_path} showToast={showToast} onUploaded={() => window.location.reload()} />
      </div>

      {!myListing && !editing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>{config.formTitle}</h3>
          <form onSubmit={handleSubmit}>
            {renderSpecificFields()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Ville"><TextInput value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Genève" /></Field>
              <Field label="Rayon (km)"><TextInput type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} /></Field>
            </div>
            <Field label="Disponibilité"><Select value={form.dispo} onChange={(e) => setForm({ ...form, dispo: e.target.value })} options={URGENCES} /></Field>
            <Field label="Présentation"><TextArea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Ton parcours, ce que tu proposes…" /></Field>
            <PrimaryButton type="submit" disabled={geocoding}>{geocoding ? 'Localisation…' : 'Publier'}</PrimaryButton>
          </form>
        </div>
      )}

      {myListing && !editing && (
        <div style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid #D4FF3F', borderRadius: 18, padding: 24, marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ton profil est publié</div>
            <div style={{ fontSize: 14, color: '#A4B0A6' }}>{renderCardDetails(myListing)} · {myListing.ville}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditing(true)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Modifier</button>
            <button onClick={handleDelete} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Supprimer</button>
          </div>
        </div>
      )}

      {myListing && editing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Modifier mon profil</h3>
          <form onSubmit={handleSubmit}>
            {renderSpecificFields()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Ville"><TextInput value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></Field>
              <Field label="Rayon (km)"><TextInput type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} /></Field>
            </div>
            <Field label="Disponibilité"><Select value={form.dispo} onChange={(e) => setForm({ ...form, dispo: e.target.value })} options={URGENCES} /></Field>
            <Field label="Présentation"><TextArea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <PrimaryButton type="submit" disabled={geocoding} style={{ width: 'auto', flex: 1 }}>{geocoding ? 'Localisation…' : 'Enregistrer'}</PrimaryButton>
              <button type="button" onClick={() => { setEditing(false); setForm({ ...emptyForm, ...myListing, distance: String(myListing.distance) }); }} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '15px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : listings.length === 0 ? (
        <EmptyState icon="🧑‍⚕️" title="Aucun profil pour le moment" sub="Les premiers profils apparaîtront ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {listings.map((l) => (
            <div key={l.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                {l.profiles?.avatar_path && (
                  <img src={avatarUrl(supabase, l.profiles.avatar_path)} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{l.profiles?.nom}</div>
                  <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>{renderCardDetails(l)} · {l.ville} ({l.distance} km)</div>
                  {l.bio && <div style={{ fontSize: 14, color: '#C7CFC8', marginTop: 10, maxWidth: 480 }}>{l.bio}</div>}
                  <div style={{ marginTop: 12 }}><Badge tone="lime">{l.dispo}</Badge></div>
                </div>
              </div>
              {l.owner_id !== user.id && (
                <button onClick={() => onContact(l.owner_id, l.profiles?.nom, renderCardDetails(l))} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Contacter</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
