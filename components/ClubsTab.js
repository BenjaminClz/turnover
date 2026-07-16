'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES, ROLE_LABELS, SPECIALITES_SANTE, TYPES_ENTRAINEUR, TYPES_MISSION_BENEVOLE, NIVEAUX_ARBITRAGE } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, SecondaryButton, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';
import AvatarUpload, { avatarUrl } from '@/components/AvatarUpload';
import GalleryTab from '@/components/GalleryTab';
import { useSubscription } from '@/lib/use-subscription';
import NationaliteSelect from '@/components/NationaliteSelect';
import { nationalites } from '@/lib/nationalites';

const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

const BESOIN_TYPES = [
  { value: 'joueur', label: 'Un joueur', icon: '🏉' },
  { value: 'sante', label: 'Un professionnel de santé', icon: '🩺' },
  { value: 'preparateur', label: 'Un préparateur physique', icon: '💪' },
  { value: 'entraineur', label: 'Un entraîneur / coach', icon: '📋' },
  { value: 'arbitre', label: 'Un arbitre', icon: '🟨' },
  { value: 'benevole', label: 'Un bénévole', icon: '🤝' },
];

const emptyForm = {
  besoin_type: 'joueur', sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '',
  urgence: 'Dès que possible', details: '', specialite: '', diplome: '', type_mission: '', type_mission_autre: '', remuneration: '',
  nationalites_recherchees: [], pied_fort_recherche: null, age_min: '', age_max: '', taille_min_cm: '', poids_min_kg: '',
};

const DELETE_UNDO_DELAY_MS = 5000;

export default function ClubsTab({ user, profile, showToast, onContact }) {
  const supabase = createClient();
  const { isActive, loading: subLoading } = useSubscription(user.id);
  const [needs, setNeeds] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // id du besoin en cours d'édition, ou null
  const [creatingType, setCreatingType] = useState(null); // type choisi pour une NOUVELLE annonce
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showInfraGallery, setShowInfraGallery] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState(null);
  const deleteTimerRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('club_needs')
      .select('*, profiles(nom)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setNeeds(data || []);
    setMyListings((data || []).filter((n) => n.owner_id === user.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Annule la suppression programmée si le composant est démonté entre-temps.
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  // Avertit avant de quitter la page si une annonce est en cours de création/édition.
  useEffect(() => {
    const isEditing = !!creatingType || !!editingId;
    if (!isEditing) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [creatingType, editingId]);

  const startCreating = (type) => {
    setForm({ ...emptyForm, besoin_type: type });
    setCreatingType(type);
    setEditingId(null);
  };

  const startEditing = (listing) => {
    setForm({ ...emptyForm, ...listing });
    setEditingId(listing.id);
    setCreatingType(null);
  };

  const cancelForm = () => {
    setCreatingType(null);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ville.trim()) { showToast('La ville est obligatoire.'); return; }
    if (form.besoin_type === 'joueur' && !form.poste) { showToast('Choisis le poste recherché.'); return; }

    setGeocoding(true);
    const geo = await geocodeVille(form.ville);
    setGeocoding(false);
    if (!geo) { showToast(`Ville "${form.ville}" non reconnue.`); return; }

    const payload = {
      owner_id: user.id, club: profile.nom, besoin_type: form.besoin_type,
      sport: form.sport, poste: form.poste || null, niveau: form.niveau || null, ville: form.ville,
      urgence: form.urgence, details: form.details,
      specialite: form.specialite, diplome: form.diplome, type_mission: form.type_mission,
      type_mission_autre: form.type_mission === 'Autre' ? (form.type_mission_autre || null) : null,
      remuneration: form.besoin_type === 'joueur' ? (form.remuneration || null) : null,
      latitude: geo.latitude, longitude: geo.longitude,
      nationalites_recherchees: form.nationalites_recherchees,
      pied_fort_recherche: form.besoin_type === 'joueur' ? form.pied_fort_recherche : null,
      age_min: form.age_min ? parseInt(form.age_min) : null,
      age_max: form.age_max ? parseInt(form.age_max) : null,
      taille_min_cm: form.besoin_type === 'joueur' && form.taille_min_cm ? parseInt(form.taille_min_cm) : null,
      poids_min_kg: form.besoin_type === 'joueur' && form.poids_min_kg ? parseInt(form.poids_min_kg) : null,
    };

    if (editingId) {
      const { error } = await supabase.from('club_needs').update(payload).eq('id', editingId);
      if (error) { showToast('Erreur lors de la mise à jour.'); return; }
      showToast('Besoin mis à jour ✓');
    } else {
      const { error } = await supabase.from('club_needs').insert(payload);
      if (error) { showToast('Erreur lors de la publication.'); return; }
      showToast('Besoin publié ✓');
      if (payload.besoin_type === 'joueur') {
        const { data: matches } = await supabase
          .from('player_listings')
          .select('owner_id')
          .eq('sport', payload.sport)
          .eq('poste', payload.poste);
        const notifRows = (matches || [])
          .filter((m) => m.owner_id !== user.id)
          .map((m) => ({
            user_id: m.owner_id,
            type: 'offre_correspondante',
            title: `Nouvelle offre : ${payload.club}`,
            body: `${payload.poste} · ${payload.niveau || ''} · ${payload.ville}`,
            link_tab: 'recherche',
          }));
        if (notifRows.length > 0) {
          await supabase.from('notifications').insert(notifRows);
        }
      }
    }
    cancelForm();
    load();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('club_needs').delete().eq('id', id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    load();
  };

  // Suppression réversible : la suppression réelle est programmée après un délai
  // pendant lequel on peut annuler (pattern « Annuler l'envoi » de Gmail).
  const requestDelete = (id) => {
    setDeletePendingId(id);
    deleteTimerRef.current = setTimeout(() => {
      handleDelete(id);
      setDeletePendingId(null);
    }, DELETE_UNDO_DELAY_MS);
  };

  const cancelDelete = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setDeletePendingId(null);
  };

  const renderSpecificFields = (type) => {
    if (type === 'joueur') {
      return (
        <>
          <div className="tv-grid-2" style={{ gap: 18 }}>
            <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value, poste: '' })} options={SPORTS} /></Field>
            <Field label="Poste recherché"><Select value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} options={['', ...(POSTES[form.sport] || [])]} /></Field>
          </div>
          <Field label="Niveau du club"><Select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} options={NIVEAUX} /></Field>
          <Field label="Rémunération / défraiement (facultatif)" hint="Texte libre, ex. « Défraiement 50€/match », « Logement + indemnités »…">
            <TextInput value={form.remuneration} onChange={(e) => setForm({ ...form, remuneration: e.target.value })} placeholder="ex. Défraiement 50€/match" />
          </Field>

          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <h4 style={{ fontSize: 14.5, marginBottom: 4 }}>Critères physiques (facultatif, spécifique aux joueurs)</h4>
          </div>

          <Field label="Pied fort recherché">
            <div style={{ display: 'flex', gap: 10 }}>
              {['', 'gauche', 'droit', 'ambidextre'].map((option) => (
                <button
                  key={option || 'indifferent'}
                  type="button"
                  onClick={() => setForm({ ...form, pied_fort_recherche: option || null })}
                  style={{
                    padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'capitalize',
                    border: (form.pied_fort_recherche || '') === option ? '1.5px solid #D4FF3F' : '1.5px solid #2C4A3D',
                    background: (form.pied_fort_recherche || '') === option ? '#D4FF3F' : 'transparent',
                    color: (form.pied_fort_recherche || '') === option ? '#0B1F1A' : '#A4B0A6',
                  }}
                >
                  {option || 'Indifférent'}
                </button>
              ))}
            </div>
          </Field>

          <div className="tv-grid-2" style={{ gap: 18 }}>
            <Field label="Taille minimum (cm)"><TextInput type="number" value={form.taille_min_cm} onChange={(e) => setForm({ ...form, taille_min_cm: e.target.value })} placeholder="ex. 175" /></Field>
            <Field label="Poids minimum (kg)"><TextInput type="number" value={form.poids_min_kg} onChange={(e) => setForm({ ...form, poids_min_kg: e.target.value })} placeholder="ex. 80" /></Field>
          </div>
        </>
      );
    }
    if (type === 'sante') {
      return (
        <>
          <Field label="Spécialité recherchée"><Select value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} options={['', ...SPECIALITES_SANTE]} /></Field>
          <Field label="Sport concerné"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
        </>
      );
    }
    if (type === 'preparateur') {
      return <Field label="Sport concerné"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>;
    }
    if (type === 'entraineur') {
      return (
        <>
          <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
          <Field label="Spécialité recherchée"><Select value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} options={['', ...TYPES_ENTRAINEUR]} /></Field>
          <Field label="Niveau à encadrer"><TextInput value={form.niveau || ''} onChange={(e) => setForm({ ...form, niveau: e.target.value })} placeholder="ex. Seniors Régionale 2, U16…" /></Field>
        </>
      );
    }
    if (type === 'arbitre') {
      return (
        <>
          <Field label="Sport"><Select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} options={SPORTS} /></Field>
          <Field label="Niveau d'arbitrage souhaité"><Select value={form.niveau || ''} onChange={(e) => setForm({ ...form, niveau: e.target.value })} options={['', ...NIVEAUX_ARBITRAGE]} /></Field>
        </>
      );
    }
    if (type === 'benevole') {
      return (
        <>
          <Field label="Type de mission"><Select value={form.type_mission} onChange={(e) => setForm({ ...form, type_mission: e.target.value })} options={['', ...TYPES_MISSION_BENEVOLE]} /></Field>
          {form.type_mission === 'Autre' && (
            <Field label="Précise la mission"><TextInput value={form.type_mission_autre} onChange={(e) => setForm({ ...form, type_mission_autre: e.target.value })} placeholder="ex. Animation jeune public, entretien matériel…" /></Field>
          )}
        </>
      );
    }
    return null;
  };

  const renderForm = (type) => (
    <form onSubmit={handleSubmit}>
      {renderSpecificFields(type)}

      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <h4 style={{ fontSize: 14.5, marginBottom: 4 }}>Critères recherchés (facultatif)</h4>
        <p style={{ fontSize: 12.5, color: '#A4B0A6', marginBottom: 16 }}>Les mêmes catégories que celles renseignées par les profils, quel que soit le poste recherché.</p>
      </div>
      <Field label="Nationalité(s) recherchée(s)">
        <NationaliteSelect
          value={form.nationalites_recherchees}
          onChange={(codes) => setForm({ ...form, nationalites_recherchees: codes })}
        />
      </Field>
      <div className="tv-grid-2" style={{ gap: 18 }}>
        <Field label="Âge minimum"><TextInput type="number" value={form.age_min} onChange={(e) => setForm({ ...form, age_min: e.target.value })} placeholder="ex. 18" /></Field>
        <Field label="Âge maximum"><TextInput type="number" value={form.age_max} onChange={(e) => setForm({ ...form, age_max: e.target.value })} placeholder="ex. 60" /></Field>
      </div>

      <div className="tv-grid-2" style={{ gap: 18 }}>
        <Field label="Ville"><TextInput value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Annemasse" /></Field>
        <Field label="Urgence"><Select value={form.urgence} onChange={(e) => setForm({ ...form, urgence: e.target.value })} options={URGENCES} /></Field>
      </div>
      <Field label="Détails"><TextArea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Jours d'entraînement, ambiance du club, conditions…" /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <PrimaryButton type="submit" disabled={geocoding} style={{ width: 'auto', flex: 1 }}>{geocoding ? 'Localisation…' : (editingId ? 'Enregistrer' : 'Publier ce besoin')}</PrimaryButton>
        <SecondaryButton type="button" onClick={cancelForm}>Annuler</SecondaryButton>
      </div>
    </form>
  );

  const criteresLabel = (n) => {
    const parts = [];
    if (n.nationalites_recherchees?.length > 0) parts.push(n.nationalites_recherchees.map(nomNationalite).join(', '));
    if (n.age_min || n.age_max) parts.push(`${n.age_min || '?'}-${n.age_max || '?'} ans`);
    if (n.besoin_type === 'joueur') {
      if (n.pied_fort_recherche) parts.push(`Pied ${n.pied_fort_recherche}`);
      if (n.taille_min_cm) parts.push(`≥ ${n.taille_min_cm} cm`);
      if (n.poids_min_kg) parts.push(`≥ ${n.poids_min_kg} kg`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const describeNeed = (n) => {
    if (n.besoin_type === 'joueur' || !n.besoin_type) return `${n.poste || ''} · ${n.niveau || ''}`.trim();
    if (n.besoin_type === 'sante') return `${n.specialite || 'Professionnel de santé'} · ${n.sport || ''}`.trim();
    if (n.besoin_type === 'preparateur') return `Préparateur physique · ${n.sport || ''}`.trim();
    if (n.besoin_type === 'entraineur') return `${n.specialite || 'Entraîneur'} ${n.sport || ''} · ${n.niveau || ''}`.trim();
    if (n.besoin_type === 'arbitre') return `Arbitre ${n.sport || ''} · ${n.niveau || ''}`.trim();
    if (n.besoin_type === 'benevole') return n.type_mission === 'Autre' && n.type_mission_autre ? n.type_mission_autre : (n.type_mission || 'Bénévole');
    return '';
  };

  const othersNeeds = needs.filter((n) => n.owner_id !== user.id);

  return (
    <div>
      <PageTitle>Mon espace club</PageTitle>
      <PageSubtitle>Publie autant de besoins que nécessaire — joueur, staff médical, encadrement technique ou bénévole.</PageSubtitle>

      <div style={{ marginBottom: 28 }}>
        <AvatarUpload userId={user.id} currentPath={profile?.avatar_path} showToast={showToast} onUploaded={() => window.location.reload()} size={84} />
      </div>

      {isActive && (
        <div style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid #D4FF3F', borderRadius: 14, padding: 18, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge tone="lime">Pro</Badge>
          <span style={{ fontSize: 14, color: '#A4B0A6' }}>Abonnement actif — annonces illimitées et mise en avant débloquées.</span>
        </div>
      )}

      <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 24, marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, marginBottom: 4 }}>Infrastructures du club</h3>
            <p style={{ fontSize: 13.5, color: '#A4B0A6' }}>Terrain, vestiaires, club-house… visible par tous les joueurs et profils que tu contactes.</p>
          </div>
          <SecondaryButton onClick={() => setShowInfraGallery((v) => !v)} style={{ width: 'auto' }}>
            {showInfraGallery ? 'Masquer' : 'Gérer la galerie'}
          </SecondaryButton>
        </div>
        {showInfraGallery && (
          <div style={{ marginTop: 24 }}>
            <GalleryTab userId={user.id} ownerName={profile?.nom} readOnly={false} showToast={showToast} />
          </div>
        )}
      </div>

      {/* Mes annonces actives, chacune avec son propre Modifier/Supprimer */}
      {myListings.length > 0 && !creatingType && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, color: '#D4FF3F', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Mes annonces ({myListings.length})</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {myListings.map((listing) => (
              deletePendingId === listing.id ? (
                <div key={listing.id} style={{ background: '#152E26', border: '1.5px solid #D4FF3F', borderRadius: 16, padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 14, color: '#A4B0A6' }}>Annonce supprimée.</span>
                  <button onClick={cancelDelete} style={{ background: 'transparent', border: 'none', color: '#D4FF3F', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Annuler</button>
                </div>
              ) : editingId === listing.id ? (
                <div key={listing.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28 }}>
                  <h3 style={{ marginBottom: 20, fontSize: 18 }}>Modifier — {ROLE_LABELS[listing.besoin_type] || 'Joueur'}</h3>
                  {renderForm(listing.besoin_type)}
                </div>
              ) : (
                <div key={listing.id} style={{ background: 'rgba(212,255,63,0.06)', border: '1.5px solid #D4FF3F', borderRadius: 16, padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{ROLE_LABELS[listing.besoin_type] || 'Joueur'}</div>
                    <div style={{ fontSize: 14, color: '#A4B0A6' }}>{describeNeed(listing)} · {listing.ville}</div>
                    {listing.remuneration && <div style={{ fontSize: 13, color: '#D4FF3F', marginTop: 4 }}>💰 {listing.remuneration}</div>}
                    {criteresLabel(listing) && <div style={{ fontSize: 12.5, color: '#8C9A8E', marginTop: 4 }}>🎯 {criteresLabel(listing)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => startEditing(listing)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Modifier</button>
                    <button onClick={() => requestDelete(listing.id)} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Supprimer</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Bouton pour ajouter une nouvelle annonce, ou sélecteur de type si pas encore d'annonce */}
      {!creatingType && !editingId && (
        myListings.length >= 1 && !isActive && !subLoading ? (
          <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Limite gratuite atteinte</h3>
            <p style={{ fontSize: 14, color: '#A4B0A6', marginBottom: 20, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              Le compte gratuit permet 1 annonce active. Passe par l'onglet <strong style={{ color: '#F5F0E6' }}>Abonnement</strong> pour en publier davantage.
            </p>
          </div>
        ) : (
          <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>{myListings.length > 0 ? 'Publier une nouvelle annonce' : 'Tu cherches…'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {BESOIN_TYPES.map((t) => (
                <button key={t.value} onClick={() => startCreating(t.value)} style={{ background: '#0B1F1A', border: '1.5px solid #2C4A3D', borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'left', color: '#F5F0E6', transition: 'border-color .15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#D4FF3F'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2C4A3D'}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* Formulaire de création d'une nouvelle annonce */}
      {creatingType && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Tu cherches {BESOIN_TYPES.find((t) => t.value === creatingType)?.label.toLowerCase()}</h3>
          {renderForm(creatingType)}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : othersNeeds.length === 0 ? (
        <EmptyState icon="📋" title="Aucune autre annonce pour le moment" sub="Les annonces des autres clubs apparaîtront ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <h2 style={{ fontSize: 15, color: '#D4FF3F', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Annonces des autres clubs</h2>
          {othersNeeds.map((n) => (
            <div key={n.id} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{n.club} <span style={{ color: '#A4B0A6', fontWeight: 500 }}>cherche</span> {ROLE_LABELS[n.besoin_type]?.toLowerCase() || 'un joueur'}</div>
                <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>{describeNeed(n)} · {n.ville}</div>
                {n.remuneration && <div style={{ fontSize: 13.5, color: '#D4FF3F', marginTop: 6 }}>💰 {n.remuneration}</div>}
                {criteresLabel(n) && <div style={{ fontSize: 12.5, color: '#8C9A8E', marginTop: 4 }}>🎯 {criteresLabel(n)}</div>}
                {n.details && <div style={{ fontSize: 14, color: '#C7CFC8', marginTop: 10, maxWidth: 460 }}>{n.details}</div>}
                <div style={{ marginTop: 12 }}><Badge tone={n.urgence === 'Dès que possible' ? 'urgent' : 'default'}>{n.urgence}</Badge></div>
              </div>
              <button onClick={() => onContact(n.owner_id, n.club, describeNeed(n))} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Contacter</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
