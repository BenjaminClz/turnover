'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, PrimaryButton, GhostButton, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';
import AvatarUpload, { avatarUrl } from '@/components/AvatarUpload';
import { profileCompletion, COMPLETION_THRESHOLD } from '@/lib/profile-completion';
import NationaliteSelect from '@/components/NationaliteSelect';
import StatsSlider from '@/components/StatsSlider';
import StatsRadar from '@/components/StatsRadar';
import PlayerCard from '@/components/PlayerCard';
import PiedFortSelect from '@/components/PiedFortSelect';
import VilleAutocomplete from '@/components/VilleAutocomplete';
import { SkeletonList } from '@/components/Skeleton';
import { nationalites } from '@/lib/nationalites';

const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

const emptyBasicForm = { sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '', distance: '15', dispo: 'Dès que possible' };
const emptyDetailsForm = {
  date_naissance: '', taille_cm: '', poids_kg: '', annees_pratique: '', dernier_club: '', dernier_club_niveau: NIVEAUX[0], bio: '',
  nationalites: [],
  stat_vitesse: 50, stat_defense: 50, stat_vision: 50, stat_technique: 50, stat_combat: 50, stat_attaque: 50, stat_physique: 50,
  pied_fort: null,
};

const DELETE_UNDO_DELAY_MS = 5000;

const calculAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const moisDiff = aujourdhui.getMonth() - naissance.getMonth();
  if (moisDiff < 0 || (moisDiff === 0 && aujourdhui.getDate() < naissance.getDate())) age--;
  return age;
};

export default function PlayersTab({ user, profile, showToast }) {
  const supabase = createClient();
  const [myListing, setMyListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [basicForm, setBasicForm] = useState(emptyBasicForm);
  const [detailsForm, setDetailsForm] = useState(emptyDetailsForm);
  const [villeCoords, setVilleCoords] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const deleteTimerRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const { data: mine, error } = await supabase
      .from('player_listings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setMyListing(mine || null);
    if (mine) {
      setBasicForm({ ...emptyBasicForm, ...mine, distance: String(mine.distance) });
      setDetailsForm({
        date_naissance: mine.date_naissance || '', taille_cm: mine.taille_cm ?? '', poids_kg: mine.poids_kg ?? '',
        annees_pratique: mine.annees_pratique ?? '', dernier_club: mine.dernier_club || '', dernier_club_niveau: mine.dernier_club_niveau || NIVEAUX[0], bio: mine.bio || '',
        nationalites: mine.nationalites || [],
        stat_vitesse: mine.stat_vitesse ?? 50, stat_defense: mine.stat_defense ?? 50, stat_vision: mine.stat_vision ?? 50,
        stat_technique: mine.stat_technique ?? 50, stat_combat: mine.stat_combat ?? 50, stat_attaque: mine.stat_attaque ?? 50,
        stat_physique: mine.stat_physique ?? 50,
        pied_fort: mine.pied_fort || null,
      });
    }

    // Compteurs abonnés / abonnements.
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

  // Avertit avant de quitter la page si un formulaire est en cours de modification.
  useEffect(() => {
    const isEditing = editing || editingDetails || (!myListing && (basicForm.poste || basicForm.ville));
    if (!isEditing) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editing, editingDetails, myListing, basicForm]);

  const handleCreateBasic = async (e) => {
    e.preventDefault();
    if (!basicForm.poste || !basicForm.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    let geo = villeCoords && villeCoords.ville === basicForm.ville ? villeCoords : null;
    if (!geo) {
      setGeocoding(true);
      geo = await geocodeVille(basicForm.ville);
      setGeocoding(false);
      if (!geo) { showToast(`Ville "${basicForm.ville}" non reconnue. Vérifie l'orthographe.`); return; }
    }

    const payload = {
      owner_id: user.id,
      sport: basicForm.sport, poste: basicForm.poste, niveau: basicForm.niveau, ville: basicForm.ville,
      distance: parseInt(basicForm.distance) || 15, dispo: basicForm.dispo,
      latitude: geo.latitude, longitude: geo.longitude,
      published: false,
    };
    const { error } = await supabase.from('player_listings').insert(payload);
    if (error) { showToast('Erreur lors de la création.'); return; }
    showToast('Profil créé ✓ Complète-le pour pouvoir le publier.');
    load();
  };

  const handleUpdateBasic = async (e) => {
    e.preventDefault();
    if (!basicForm.poste || !basicForm.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    let geo = villeCoords && villeCoords.ville === basicForm.ville ? villeCoords : null;
    if (!geo) {
      setGeocoding(true);
      geo = await geocodeVille(basicForm.ville);
      setGeocoding(false);
      if (!geo) { showToast(`Ville "${basicForm.ville}" non reconnue.`); return; }
    }

    const payload = {
      sport: basicForm.sport, poste: basicForm.poste, niveau: basicForm.niveau, ville: basicForm.ville,
      distance: parseInt(basicForm.distance) || 15, dispo: basicForm.dispo,
      latitude: geo.latitude, longitude: geo.longitude,
    };
    const { error } = await supabase.from('player_listings').update(payload).eq('id', myListing.id);
    if (error) { showToast('Erreur lors de la mise à jour.'); return; }
    showToast('Profil mis à jour ✓');
    setEditing(false);
    load();
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (detailsForm.date_naissance) {
      const age = calculAge(detailsForm.date_naissance);
      if (age != null && age < 18) {
        showToast('Turnover est réservé aux personnes de 18 ans et plus.');
        return;
      }
    }
    const payload = {
      date_naissance: detailsForm.date_naissance || null,
      taille_cm: detailsForm.taille_cm ? parseInt(detailsForm.taille_cm) : null,
      poids_kg: detailsForm.poids_kg ? parseInt(detailsForm.poids_kg) : null,
      annees_pratique: detailsForm.annees_pratique ? parseInt(detailsForm.annees_pratique) : null,
      dernier_club: detailsForm.dernier_club.trim() || null,
      dernier_club_niveau: detailsForm.dernier_club.trim() ? detailsForm.dernier_club_niveau : null,
      bio: detailsForm.bio || null,
      nationalites: detailsForm.nationalites,
      stat_vitesse: detailsForm.stat_vitesse,
      stat_defense: detailsForm.stat_defense,
      stat_vision: detailsForm.stat_vision,
      stat_technique: detailsForm.stat_technique,
      stat_combat: detailsForm.stat_combat,
      stat_attaque: detailsForm.stat_attaque,
      stat_physique: detailsForm.stat_physique,
      pied_fort: detailsForm.pied_fort,
    };
    const { error } = await supabase.from('player_listings').update(payload).eq('id', myListing.id);
    if (error) { showToast('Erreur lors de la mise à jour.'); return; }
    showToast('Informations enregistrées ✓');
    setEditingDetails(false);
    load();
  };

  const handlePublish = async () => {
    setPublishing(true);
    const { error } = await supabase.from('player_listings').update({ published: true }).eq('id', myListing.id);
    setPublishing(false);
    if (error) { showToast('Erreur lors de la publication.'); return; }
    showToast('Profil publié ✓ Les clubs peuvent maintenant te trouver.');

    // Publication automatique dans le fil d'actualité.
    await supabase.from('posts').insert({
      author_id: user.id,
      content: `${profile.nom} est maintenant disponible : ${myListing.poste} · ${myListing.niveau} · ${myListing.ville}`,
    });

    load();
  };

  const handleUnpublish = async () => {
    const { error } = await supabase.from('player_listings').update({ published: false }).eq('id', myListing.id);
    if (error) { showToast('Erreur.'); return; }
    showToast('Profil retiré de la recherche.');
    load();
  };

  // Suppression réversible : on programme la suppression réelle après un délai
  // pendant lequel l'utilisateur peut annuler (pattern « Annuler l'envoi » de Gmail).
  const requestDelete = () => {
    if (!myListing) return;
    setDeletePending(true);
    deleteTimerRef.current = setTimeout(async () => {
      const { error } = await supabase.from('player_listings').delete().eq('id', myListing.id);
      if (error) { showToast('Erreur lors de la suppression.'); setDeletePending(false); return; }
      setMyListing(null);
      setBasicForm(emptyBasicForm);
      setDetailsForm(emptyDetailsForm);
      setDeletePending(false);
      load();
    }, DELETE_UNDO_DELAY_MS);
  };

  const cancelDelete = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setDeletePending(false);
  };

  const renderBasicFields = () => (
    <>
      <div className="tv-grid-2" style={{ gap: 18 }}>
        <Field label="Sport"><Select value={basicForm.sport} onChange={(e) => setBasicForm({ ...basicForm, sport: e.target.value, poste: '' })} options={SPORTS} /></Field>
        <Field label="Poste"><Select value={basicForm.poste} onChange={(e) => setBasicForm({ ...basicForm, poste: e.target.value })} options={['', ...(POSTES[basicForm.sport] || [])]} /></Field>
      </div>
      <div className="tv-grid-2" style={{ gap: 18 }}>
        <Field label="Niveau"><Select value={basicForm.niveau} onChange={(e) => setBasicForm({ ...basicForm, niveau: e.target.value })} options={NIVEAUX} /></Field>
        <Field label="Ville">
          <VilleAutocomplete
            onSelect={(data) => {
              setBasicForm({ ...basicForm, ville: data.ville });
              setVilleCoords(data);
            }}
          />
          {basicForm.ville && <div style={{ fontSize: 12.5, color: '#8C9A8E', marginTop: 6 }}>Sélectionnée : {basicForm.ville}</div>}
        </Field>
      </div>
      <div className="tv-grid-2" style={{ gap: 18 }}>
        <Field label="Rayon (km)"><TextInput type="number" value={basicForm.distance} onChange={(e) => setBasicForm({ ...basicForm, distance: e.target.value })} /></Field>
        <Field label="Disponibilité"><Select value={basicForm.dispo} onChange={(e) => setBasicForm({ ...basicForm, dispo: e.target.value })} options={URGENCES} /></Field>
      </div>
    </>
  );

  const completion = myListing ? profileCompletion(myListing) : 0;
  const isComplete = completion >= COMPLETION_THRESHOLD;
  const isPublished = myListing?.published === true;

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 0', borderBottom: '1px solid #1c332a' }}>
      <span style={{ color: '#8C9A8E' }}>{label}</span>
      <span style={{ color: '#F5F0E6', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div>
      <PageTitle>Mon profil</PageTitle>
      <PageSubtitle>Ton profil joueur, visible des clubs uniquement une fois publié.</PageSubtitle>

      <div style={{ marginBottom: 20 }}>
        <AvatarUpload userId={user.id} currentPath={profile.avatar_path} showToast={showToast} onUploaded={() => window.location.reload()} />
      </div>

      <div style={{ display: 'flex', gap: 36, marginBottom: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F5F0E6' }}>{followersCount}</div>
          <div style={{ fontSize: 11.5, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Abonnés</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F5F0E6' }}>{followingCount}</div>
          <div style={{ fontSize: 11.5, color: '#8C9A8E', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Abonnements</div>
        </div>
      </div>

      {!myListing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Créer mon profil</h3>
          <form onSubmit={handleCreateBasic}>
            {renderBasicFields()}
            <PrimaryButton type="submit" disabled={geocoding}>{geocoding ? 'Localisation de la ville…' : 'Créer mon profil'}</PrimaryButton>
          </form>
        </div>
      )}

      {loading ? (
        <SkeletonList count={1} />
      ) : myListing && (
        <>
          {editing ? (
            <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 20, fontSize: 18 }}>Modifier mes informations de base</h3>
              <form onSubmit={handleUpdateBasic}>
                {renderBasicFields()}
                <div style={{ display: 'flex', gap: 12 }}>
                  <PrimaryButton type="submit" disabled={geocoding} style={{ width: 'auto', flex: 1 }}>{geocoding ? 'Localisation…' : 'Enregistrer'}</PrimaryButton>
                  <button type="button" onClick={() => { setEditing(false); setBasicForm({ ...emptyBasicForm, ...myListing, distance: String(myListing.distance) }); }} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '15px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                </div>
              </form>
            </div>
          ) : editingDetails ? (
            <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 6, fontSize: 18 }}>Informations personnelles</h3>
              <p style={{ fontSize: 13, color: '#A4B0A6', marginBottom: 20 }}>Date de naissance, taille et poids comptent pour ta progression vers les 80%. Le reste est facultatif.</p>
              <form onSubmit={handleSaveDetails}>
                <div className="tv-grid-2" style={{ gap: 18 }}>
                  <Field label="Date de naissance" hint="Turnover est réservé aux 18 ans et plus."><TextInput type="date" value={detailsForm.date_naissance} onChange={(e) => setDetailsForm({ ...detailsForm, date_naissance: e.target.value })} /></Field>
                  <Field label="Taille (cm)"><TextInput type="number" value={detailsForm.taille_cm} onChange={(e) => setDetailsForm({ ...detailsForm, taille_cm: e.target.value })} placeholder="180" /></Field>
                  <Field label="Poids (kg)"><TextInput type="number" value={detailsForm.poids_kg} onChange={(e) => setDetailsForm({ ...detailsForm, poids_kg: e.target.value })} placeholder="85" /></Field>
                </div>

                <Field label="Nationalité(s)">
                  <NationaliteSelect
                    value={detailsForm.nationalites}
                    onChange={(codes) => setDetailsForm({ ...detailsForm, nationalites: codes })}
                  />
                </Field>

                <Field label="Années de pratique (facultatif)"><TextInput type="number" value={detailsForm.annees_pratique} onChange={(e) => setDetailsForm({ ...detailsForm, annees_pratique: e.target.value })} placeholder="8" /></Field>

                <Field label="Dernier club (facultatif)">
                  <div className="tv-grid-2" style={{ gap: 10 }}>
                    <TextInput value={detailsForm.dernier_club} onChange={(e) => setDetailsForm({ ...detailsForm, dernier_club: e.target.value })} placeholder="ex. RC Annemasse" />
                    <Select value={detailsForm.dernier_club_niveau} onChange={(e) => setDetailsForm({ ...detailsForm, dernier_club_niveau: e.target.value })} options={NIVEAUX} />
                  </div>
                </Field>

                <Field label="Présentation (facultatif)"><TextArea value={detailsForm.bio} onChange={(e) => setDetailsForm({ ...detailsForm, bio: e.target.value })} placeholder="Ton parcours, ce que tu recherches…" /></Field>

                <div style={{ marginTop: 8, marginBottom: 24 }}>
                  <h4 style={{ fontSize: 15, marginBottom: 4 }}>Points forts</h4>
                  <p style={{ fontSize: 13, color: '#A4B0A6', marginBottom: 16 }}>Positionne les curseurs pour donner une idée de ton profil de jeu.</p>
                  <div className="tv-grid-2 tv-stats-grid" style={{ gap: 32 }}>
                    <StatsSlider
                      stats={detailsForm}
                      onChange={(key, val) => setDetailsForm({ ...detailsForm, [key]: val })}
                    />
                    <div className="tv-radar-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StatsRadar stats={detailsForm} />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <PiedFortSelect
                    sport={basicForm.sport}
                    poste={basicForm.poste}
                    value={detailsForm.pied_fort}
                    onChange={(val) => setDetailsForm({ ...detailsForm, pied_fort: val })}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <PrimaryButton type="submit" style={{ width: 'auto', flex: 1 }}>Enregistrer</PrimaryButton>
                  <button type="button" onClick={() => setEditingDetails(false)} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '15px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 24, opacity: deletePending ? 0.35 : 1, pointerEvents: deletePending ? 'none' : 'auto', transition: 'opacity .2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ fontSize: 18 }}>Mes informations</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <GhostButton onClick={() => setEditing(true)} style={{ fontSize: 13 }}>Modifier l'essentiel</GhostButton>
                  <GhostButton onClick={() => setEditingDetails(true)} style={{ fontSize: 13 }}>Modifier les détails</GhostButton>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <InfoRow label="Sport" value={myListing.sport} />
                <InfoRow label="Poste" value={myListing.poste} />
                <InfoRow label="Niveau" value={myListing.niveau} />
                <InfoRow label="Ville" value={`${myListing.ville} (rayon ${myListing.distance} km)`} />
                <InfoRow label="Disponibilité" value={<Badge tone="lime">{myListing.dispo}</Badge>} />
                <InfoRow label="Âge" value={calculAge(myListing.date_naissance) ? `${calculAge(myListing.date_naissance)} ans` : null} />
                <InfoRow label="Taille" value={myListing.taille_cm ? `${myListing.taille_cm} cm` : null} />
                <InfoRow label="Poids" value={myListing.poids_kg ? `${myListing.poids_kg} kg` : null} />
                <InfoRow label="Années de pratique" value={myListing.annees_pratique != null ? `${myListing.annees_pratique} ans` : null} />
                <InfoRow label="Nationalité(s)" value={myListing.nationalites?.length > 0 ? myListing.nationalites.map(nomNationalite).join(', ') : null} />
                <InfoRow label="Pied fort" value={myListing.pied_fort} />
                <InfoRow label="Dernier club" value={myListing.dernier_club ? `${myListing.dernier_club} (${myListing.dernier_club_niveau})` : null} />
              </div>

              {myListing.bio && (
                <div style={{ marginTop: 20, marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, color: '#D4FF3F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Présentation</div>
                  <div style={{ fontSize: 14.5, color: '#C7CFC8', lineHeight: 1.6 }}>{myListing.bio}</div>
                </div>
              )}

              {[myListing.stat_vitesse, myListing.stat_defense, myListing.stat_vision, myListing.stat_technique, myListing.stat_combat, myListing.stat_attaque, myListing.stat_physique].some((v) => v != null) && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                  <PlayerCard player={myListing} nom={profile.nom} avatarSrc={profile.avatar_path ? avatarUrl(supabase, profile.avatar_path) : null} />
                </div>
              )}

              <div style={{ marginTop: 28, textAlign: 'right' }}>
                <button onClick={requestDelete} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Supprimer mon profil</button>
              </div>
            </div>
          )}

          <div style={{ background: isPublished ? 'rgba(212,255,63,0.06)' : 'rgba(255,107,107,0.06)', border: `1.5px solid ${isPublished ? '#D4FF3F' : (isComplete ? '#D4FF3F' : '#FF6B6B')}`, borderRadius: 18, padding: 24, marginTop: 24, marginBottom: 24, opacity: deletePending ? 0.35 : 1, pointerEvents: deletePending ? 'none' : 'auto', transition: 'opacity .2s ease' }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Mon annonce</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
              <div>
                {isPublished ? (
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge tone="lime">Publié</Badge> Visible par tous les clubs
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {isComplete ? 'Profil prêt à être publié' : 'Complète ton profil pour le publier'}
                  </div>
                )}
                <div style={{ fontSize: 14, color: '#A4B0A6' }}>{myListing.poste} · {myListing.niveau} · {myListing.ville}</div>
              </div>
              {isPublished ? (
                <GhostButton onClick={handleUnpublish} style={{ fontSize: 12.5 }}>Retirer de la recherche</GhostButton>
              ) : isComplete ? (
                <PrimaryButton onClick={handlePublish} disabled={publishing} style={{ width: 'auto' }}>
                  {publishing ? 'Publication…' : 'Publier mon profil'}
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={() => setEditingDetails(true)} style={{ width: 'auto' }}>
                  Compléter mon profil ({completion}%)
                </PrimaryButton>
              )}
            </div>
            <div style={{ height: 6, background: '#0B1F1A', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${completion}%`, background: isComplete ? '#D4FF3F' : '#FF6B6B', transition: 'width .2s ease' }} />
            </div>
            <div style={{ fontSize: 13, color: '#A4B0A6' }}>
              Profil complété à {completion}%{!isComplete && ` — ${COMPLETION_THRESHOLD}% requis pour pouvoir publier`}
            </div>
            <div style={{ fontSize: 13, marginTop: 12 }}>
              <a href={`/j/${myListing.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#D4FF3F', textDecoration: 'underline' }}>
                Voir / partager mon profil public ↗
              </a>
            </div>
          </div>
        </>
      )}

      {deletePending && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#152E26', border: '1.5px solid #D4FF3F', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, zIndex: 500, boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}>
          <span style={{ fontSize: 14 }}>Profil supprimé.</span>
          <button onClick={cancelDelete} style={{ background: 'transparent', border: 'none', color: '#D4FF3F', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Annuler</button>
        </div>
      )}
    </div>
  );
}
