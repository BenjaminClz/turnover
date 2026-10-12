import { ROLE_LABELS } from '@/lib/constants';

const join = (...parts) => parts.filter(Boolean).join(', ');

// « Pilier, Régionale 1 », « Kinésithérapeute, Rugby »…
export function describeNeed(n) {
  if (n.besoin_type === 'joueur' || !n.besoin_type) return join(n.poste, n.niveau);
  if (n.besoin_type === 'sante') return join(n.specialite || 'Pro santé', n.sport);
  if (n.besoin_type === 'preparateur') return join('Prép. physique', n.sport);
  if (n.besoin_type === 'entraineur') return join(n.specialite || 'Entraîneur', n.niveau);
  if (n.besoin_type === 'arbitre') return join('Arbitre', n.niveau);
  if (n.besoin_type === 'benevole') return n.type_mission || 'Bénévole';
  return '';
}

// Titre court d'une annonce : « Pilier » pour un joueur, sinon le type de profil
export function needTitle(n) {
  if ((n.besoin_type === 'joueur' || !n.besoin_type) && n.poste) return n.poste;
  return ROLE_LABELS[n.besoin_type] || 'Joueur';
}

// Ligne secondaire sous le titre, sans répéter le poste déjà affiché
export function needSub(n) {
  if ((n.besoin_type === 'joueur' || !n.besoin_type) && n.poste) return n.niveau || '';
  return describeNeed(n);
}
