// Champs comptés pour le calcul de complétion (80% requis pour débloquer la messagerie).
// Facultatifs et exclus du calcul : annees_pratique, clubs_precedents, bio.
const COMPLETION_FIELDS = ['sport', 'poste', 'niveau', 'ville', 'dispo', 'date_naissance', 'taille_cm', 'poids_kg'];

export function profileCompletion(listing) {
  if (!listing) return 0;
  const filled = COMPLETION_FIELDS.filter((f) => listing[f] !== null && listing[f] !== undefined && listing[f] !== '').length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export const COMPLETION_THRESHOLD = 80;

export function isProfileComplete(listing) {
  return profileCompletion(listing) >= COMPLETION_THRESHOLD;
}
