'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { SPORTS, NIVEAUX, POSTES, URGENCES } from '@/lib/constants';
import { Field, TextInput, TextArea, Select, Badge, EmptyState, PrimaryButton, GhostButton, PageTitle, PageSubtitle } from '@/components/ui';
import { geocodeVille } from '@/lib/geo';
import AvatarUpload, { avatarUrl } from '@/components/AvatarUpload';
import { profileCompletion, COMPLETION_THRESHOLD } from '@/lib/profile-completion';
import PlayerProfileModal from '@/components/PlayerProfileModal';
import PlayerSearchesTab from '@/components/PlayerSearchesTab';
import NationaliteSelect from '@/components/NationaliteSelect';
import StatsSlider from '@/components/StatsSlider';
import StatsRadar from '@/components/StatsRadar';
import PiedFortSelect from '@/components/PiedFortSelect';
import { nationalites } from '@/lib/nationalites';

const initials = (name) => (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const nomNationalite = (code) => nationalites.find((n) => n.code === code)?.nom || code;

const emptyBasicForm = { sport: 'Rugby', poste: '', niveau: 'Régionale 2', ville: '', distance: '15', dispo: 'Dès que possible' };
const emptyDetailsForm = {
  date_naissance: '', taille_cm: '', poids_kg: '', annees_pratique: '', dernier_club: '', dernier_club_niveau: NIVEAUX[0], bio: '',
  nationalites: [],
  stat_vitesse: 50, stat_defense: 50, stat_vision: 50, stat_technique: 50, stat_combat: 50, stat_attaque: 50, stat_physique: 50,
  pied_fort: null,
};

const calculAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const moisDiff = aujourdhui.getMonth() - naissance.getMonth();
  if (moisDiff < 0 || (moisDiff === 0 && aujourdhui.getDate() < naissance.getDate())) age--;
  return age;
};

export default function PlayersTab({ user, profile, showToast, onContact, onViewGallery }) {
  const supabase = createClient();
  const [players, setPlayers] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [basicForm, setBasicForm] = useState(emptyBasicForm);
  const [detailsForm, setDetailsForm] = useState(emptyDetailsForm);
  const [viewingPlayer, setViewingPlayer] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_listings')
      .select('*, profiles(nom, avatar_path)')
      .order('created_at', { ascending: false });
    if (error) { showToast('Erreur de chargement.'); setLoading(false); return; }
    setPlayers(data || []);
    const mine = (data || []).find((p) => p.owner_id === user.id);
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
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateBasic = async (e) => {
    e.preventDefault();
    if (!basicForm.poste || !basicForm.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    setGeocoding(true);
    const geo = await geocodeVille(basicForm.ville);
    setGeocoding(false);
    if (!geo) { showToast(`Ville "${basicForm.ville}" non reconnue. Vérifie l'orthographe.`); return; }

    const payload = {
      owner_id: user.id,
      sport: basicForm.sport, poste: basicForm.poste, niveau: basicForm.niveau, ville: basicForm.ville,
      distance: parseInt(basicForm.distance) || 15, dispo: basicForm.dispo,
      latitude: geo.latitude, longitude: geo.longitude,
    };
    const { error } = await supabase.from('player_listings').insert(payload);
    if (error) { showToast('Erreur lors de la publication.'); return; }
    showToast('Profil créé ✓ Complète-le pour débloquer la messagerie.');
    load();
  };

  const handleUpdateBasic = async (e) => {
    e.preventDefault();
    if (!basicForm.poste || !basicForm.ville.trim()) { showToast('Complète au moins le poste et la ville.'); return; }
    setGeocoding(true);
    const geo = await geocodeVille(basicForm.ville);
    setGeocoding(false);
    if (!geo) { showToast(`Ville "${basicForm.ville}" non reconnue.`); return; }

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

  const handleDelete = async () => {
    if (!myListing) return;
    const { error } = await supabase.from('player_listings').delete().eq('id', myListing.id);
    if (error) { showToast('Erreur lors de la suppression.'); return; }
    setMyListing(null);
    setBasicForm(emptyBasicForm);
    setDetailsForm(emptyDetailsForm);
    showToast('Profil supprimé.');
    load();
  };

  const renderBasicFields = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Field label="Sport"><Select value={basicForm.sport} onChange={(e) => setBasicForm({ ...basicForm, sport: e.target.value, poste: '' })} options={SPORTS} /></Field>
        <Field label="Poste"><Select value={basicForm.poste} onChange={(e) => setBasicForm({ ...basicForm, poste: e.target.value })} options={['', ...(POSTES[basicForm.sport] || [])]} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Field label="Niveau"><Select value={basicForm.niveau} onChange={(e) => setBasicForm({ ...basicForm, niveau: e.target.value })} options={NIVEAUX} /></Field>
        <Field label="Ville"><TextInput value={basicForm.ville} onChange={(e) => setBasicForm({ ...basicForm, ville: e.target.value })} placeholder="Genève" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Field label="Rayon (km)"><TextInput type="number" value={basicForm.distance} onChange={(e) => setBasicForm({ ...basicForm, distance: e.target.value })} /></Field>
        <Field label="Disponibilité"><Select value={basicForm.dispo} onChange={(e) => setBasicForm({ ...basicForm, dispo: e.target.value })} options={URGENCES} /></Field>
      </div>
    </>
  );

  const completion = myListing ? profileCompletion(myListing) : 0;
  const isComplete = completion >= COMPLETION_THRESHOLD;

  return (
    <div>
      <PageTitle>Profils joueurs</PageTitle>
      <PageSubtitle>Visibles par tous les clubs. Crée le tien si tu cherches une équipe.</PageSubtitle>

      {profile.role === 'joueur' && (
        <div style={{ marginBottom: 28 }}>
          <AvatarUpload userId={user.id} currentPath={profile.avatar_path} showToast={showToast} onUploaded={() => window.location.reload()} />
        </div>
      )}

      {/* Pas encore de profil : formulaire court */}
      {profile.role === 'joueur' && !myListing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Publier mon profil</h3>
          <form onSubmit={handleCreateBasic}>
            {renderBasicFields()}
            <PrimaryButton type="submit" disabled={geocoding}>{geocoding ? 'Localisation de la ville…' : 'Publier mon profil'}</PrimaryButton>
          </form>
        </div>
      )}

      {/* Profil existant : carte résumé + barre de complétion */}
      {profile.role === 'joueur' && myListing && !editing && (
        <div style={{ background: isComplete ? 'rgba(212,255,63,0.06)' : 'rgba(255,107,107,0.06)', border: `1.5px solid ${isComplete ? '#D4FF3F' : '#FF6B6B'}`, borderRadius: 18, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Ton profil est publié</div>
              <div style={{ fontSize: 14, color: '#A4B0A6' }}>{myListing.poste} · {myListing.niveau} · {myListing.ville}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(true)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Modifier</button>
              <button onClick={handleDelete} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
          <div style={{ height: 6, background: '#0B1F1A', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${completion}%`, background: isComplete ? '#D4FF3F' : '#FF6B6B', transition: 'width .2s ease' }} />
          </div>
          <div style={{ fontSize: 13, color: '#A4B0A6' }}>
            Profil complété à {completion}%{!isComplete && ` — ${COMPLETION_THRESHOLD}% requis pour débloquer la messagerie`}
          </div>
        </div>
      )}

      {profile.role === 'joueur' && myListing && editing && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>Modifier mon profil</h3>
          <form onSubmit={handleUpdateBasic}>
            {renderBasicFields()}
            <div style={{ display: 'flex', gap: 12 }}>
              <PrimaryButton type="submit" disabled={geocoding} style={{ width: 'auto', flex: 1 }}>{geocoding ? 'Localisation…' : 'Enregistrer'}</PrimaryButton>
              <button type="button" onClick={() => { setEditing(false); setBasicForm({ ...emptyBasicForm, ...myListing, distance: String(myListing.distance) }); }} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '15px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Complément d'informations personnelles, obligatoire pour débloquer la messagerie */}
      {profile.role === 'joueur' && myListing && !editingDetails && !isComplete && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 24, marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Complète ton profil pour débloquer la messagerie</h3>
          <p style={{ fontSize: 13.5, color: '#A4B0A6', marginBottom: 18, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            Date de naissance, taille et poids sont nécessaires pour que les clubs puissent te contacter.
          </p>
          <button onClick={() => setEditingDetails(true)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Compléter mon profil</button>
        </div>
      )}

      {profile.role === 'joueur' && myListing && isComplete && !editingDetails && (
        <div style={{ marginBottom: 36, textAlign: 'right' }}>
          <GhostButton onClick={() => setEditingDetails(true)}>Modifier mes informations personnelles</GhostButton>
        </div>
      )}

      {profile.role === 'joueur' && myListing && editingDetails && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 28, marginBottom: 36 }}>
          <h3 style={{ marginBottom: 6, fontSize: 18 }}>Informations personnelles</h3>
          <p style={{ fontSize: 13, color: '#A4B0A6', marginBottom: 20 }}>Date de naissance, taille et poids sont nécessaires pour débloquer la messagerie. Le reste est facultatif.</p>
          <form onSubmit={handleSaveDetails}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
              <Field label="Date de naissance"><TextInput type="date" value={detailsForm.date_naissance} onChange={(e) => setDetailsForm({ ...detailsForm, date_naissance: e.target.value })} /></Field>
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
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr', gap: 10 }}>
                <TextInput
                  value={detailsForm.dernier_club}
                  onChange={(e) => setDetailsForm({ ...detailsForm, dernier_club: e.target.value })}
                  placeholder="ex. RC Annemasse"
                />
                <Select
                  value={detailsForm.dernier_club_niveau}
                  onChange={(e) => setDetailsForm({ ...detailsForm, dernier_club_niveau: e.target.value })}
                  options={NIVEAUX}
                />
              </div>
            </Field>
            <Field label="Présentation (facultatif)"><TextArea value={detailsForm.bio} onChange={(e) => setDetailsForm({ ...detailsForm, bio: e.target.value })} placeholder="Ton parcours, ce que tu recherches…" /></Field>

            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, marginBottom: 4 }}>Points forts</h4>
              <p style={{ fontSize: 13, color: '#A4B0A6', marginBottom: 16 }}>Positionne les curseurs pour donner une idée de ton profil de jeu.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <StatsSlider
                  stats={detailsForm}
                  onChange={(key, val) => setDetailsForm({ ...detailsForm, [key]: val })}
                />
                <div style={{ display: 'flex', alignItems: 'center' }}>
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
      )}

      {profile.role === 'joueur' && myListing && isComplete && (
        <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 18, padding: 24, marginBottom: 36 }}>
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Je recherche un club</h3>
          <PlayerSearchesTab user={user} showToast={showToast} onContact={onContact} />
        </div>
      )}

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : players.length === 0 ? (
        <EmptyState icon="👤" title="Aucun profil pour le moment" sub="Les joueurs inscrits peuvent publier leur profil ici." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {players.map((p) => (
            <div key={p.id} className="tv-card" onClick={() => setViewingPlayer(p)} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                {p.profiles?.avatar_path ? (
                  <img src={avatarUrl(supabase, p.profiles.avatar_path)} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#D4FF3F,#7fb83a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', color: '#0B1F1A', fontSize: 16, flexShrink: 0 }}>
                    {initials(p.profiles?.nom)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.profiles?.nom}</div>
                  <div style={{ fontSize: 14, color: '#A4B0A6', marginTop: 4 }}>{p.poste} · {p.niveau} · {p.ville} ({p.distance} km)</div>
                  <div style={{ fontSize: 13, color: '#8C9A8E', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {p.date_naissance && <span>{calculAge(p.date_naissance)} ans</span>}
                    {p.taille_cm && <span>{p.taille_cm} cm</span>}
                    {p.poids_kg && <span>{p.poids_kg} kg</span>}
                    {p.annees_pratique != null && <span>{p.annees_pratique} ans de pratique</span>}
                    {p.pied_fort && <span>Pied {p.pied_fort}</span>}
                  </div>
                  {p.nationalites?.length > 0 && (
                    <div style={{ fontSize: 13, color: '#C7CFC8', marginTop: 4 }}>
                      {p.nationalites.map(nomNationalite).join(', ')}
                    </div>
                  )}
                  {p.dernier_club && (
                    <div style={{ fontSize: 13, color: '#C7CFC8', marginTop: 4 }}>
                      Dernier club : {p.dernier_club} ({p.dernier_club_niveau})
                    </div>
                  )}
                  {p.bio && <div style={{ fontSize: 14, color: '#C7CFC8', marginTop: 10, maxWidth: 460 }}>{p.bio}</div>}
                  <div style={{ marginTop: 12 }}><Badge tone="lime">{p.dispo}</Badge></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <button className="tv-btn" onClick={() => setViewingPlayer(p)} style={{ background: 'transparent', border: '1.5px solid #D4FF3F', color: '#D4FF3F', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Voir profil</button>
                <GhostButton onClick={() => onViewGallery(p.owner_id, p.profiles?.nom)}>Galerie</GhostButton>
                {p.owner_id !== user.id && (
                  <button className="tv-btn" onClick={() => onContact(p.owner_id, p.profiles?.nom, `${p.poste} · ${p.ville}`)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Contacter</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PlayerProfileModal
        player={viewingPlayer}
        supabase={supabase}
        currentUserId={user.id}
        onClose={() => setViewingPlayer(null)}
        onContact={onContact}
        onViewGallery={onViewGallery}
      />
    </div>
  );
}
