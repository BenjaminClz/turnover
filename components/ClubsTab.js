'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES, ROLE_LABELS, SPECIALITES_SANTE, TYPES_ENTRAINEUR, TYPES_MISSION_BENEVOLE, NIVEAUX_ARBITRAGE } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, SecondaryButton, GhostButton, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';
import AvatarUpload, { avatarUrl } from '@/components/AvatarUpload';
import GalleryTab from '@/components/GalleryTab';
import { useSubscription } from '@/lib/use-subscription';

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
};

const DELETE_UNDO_DELAY_MS = 5000;

export default function ClubsTab({ user, profile, showToast, onContact, onEditAccount }) {
  const supabase = createClient();
  const { isActive, loading: subLoading } = useSubscription(user.id);
  const [needs, setNeeds] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // id du besoin en cours d'édition, ou null
  const [creatingType, setCreatingType] = useState(null); // type choisi pour une NOUVELLE annonce
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deletePendingId, setDeletePendingId] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
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

    // Compteurs abonnés / abonnements (même principe que le profil joueur).
    const [{ count: fwers }, { count: fwing }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);
    setFollowersCount(fwers || 0);
    setFollowingCount(fwing || 0);

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
      nationalites_recherchees: [],
      pied_fort_recherche: null,
      age_min: null,
      age_max: null,
      taille_min_cm: null,
      poids_min_kg: null,
    };

    if (editingId) {
      const { error } = await supabase.from('club_needs').update(payload).eq('id', editingId);
      if (error) { showToast('Erreur lors de la mise à jour.'); return; }
      showToast('Besoin mis à jour ✓');
    } else {
      const { error } = await supabase.from('club_needs').insert(payload);
      if (error) { showToast('Erreur lors de la publication.'); return; }
      showToast('Besoin publié ✓');

      // Publication automatique dans le fil d'actualité.
      const typeLabel = BESOIN_TYPES.find((t) => t.value === payload.besoin_type)?.label.toLowerCase() || 'un profil';
      await supabase.from('posts').insert({
        author_id: user.id,
        content: `${profile.nom} recherche ${typeLabel} · ${payload.ville}`,
      });

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

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 0', borderBottom: '1px solid #1c332a' }}>
      <span style={{ color: '#8C9A8E' }}>{label}</span>
      <span style={{ color: '#F5F0E6', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div>
      <PageTitle>Mon espace</PageTitle>
      <PageSubtitle>Ton club, tes annonces et tes photos, visibles par les joueurs.</PageSubtitle>

      <div style={{ marginBottom: 20 }}>
        <AvatarUpload userId={user.id} currentPath={profile?.avatar_path} showToast={showToast} onUploaded={() => window.location.reload()} size={84} />
      </div>

      <div style={{ display: 'flex', gap: 36, marginBottom: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F5F0E6' }}>{myListings.length}</div>
          <div style={{ fontSize: 11.5, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Annonces</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F5F0E6' }}>{followersCount}</div>
          <div style={{ fontSize: 11.5, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Abonnés</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F5F0E6' }}>{followingCount}</div>
          <div style={{ fontSize: 11.5, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Abonnements</div>
        </div>
      </div>

      {/* Mes informations club — même principe que la carte du profil joueur */}
      <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 18 }}>Mes informations</h3>
          {onEditAccount && <GhostButton onClick={onEditAccount} style={{ fontSize: 13 }}>Modifier</GhostButton>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0B1F1A', border: '1px solid #274238', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <Badge tone={isActive ? 'lime' : 'default'}>{isActive ? 'Pro' : 'Gratuit'}</Badge>
          <span style={{ fontSize: 12.5, color: '#8C9A8E' }}>
            {isActive ? 'Abonnement actif — annonces illimitées et mise en avant.' : 'Compte gratuit — 1 annonce active à la fois.'}
          </span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <InfoRow label="Nom du club" value={profile?.nom} />
          <InfoRow label="Adresse" value={profile?.adresse} />
        </div>
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
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => startEditing(listing)} style={{ background: 'transparent', border: '1.5px solid #D4FF3F', color: '#D4FF3F', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Modifier</button>
                    <button onClick={() => requestDelete(listing.id)} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Supprimer</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Bouton pour ajouter une nouvelle annonce, ou sélecteur de type si pas encore d'annonce */}
      {!creatingType && !editingId && !(myListings.length >= 1 && !isActive && !subLoading) && (
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
      )}

      {/* Formulaire de création d'une nouvelle annonce */}
      {creatingType && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Tu cherches {BESOIN_TYPES.find((t) => t.value === creatingType)?.label.toLowerCase()}</h3>
          {renderForm(creatingType)}
        </div>
      )}

      {/* Galerie photos du club, intégrée comme sur le profil joueur */}
      <div style={{ marginBottom: 36 }}>
        <GalleryTab
          userId={user.id}
          ownerName={profile?.nom}
          readOnly={false}
          embedded
          title="Photos du club"
          description="Terrain, vestiaires, club-house… visible par les joueurs que tu contactes. Jusqu'à 20 Mo par fichier."
          showToast={showToast}
        />
      </div>

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
