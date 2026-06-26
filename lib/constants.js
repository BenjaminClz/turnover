export const SPORTS = ['Rugby', 'Football', 'Basketball', 'Handball', 'Volleyball'];

export const NIVEAUX = ['Fédérale 1', 'Fédérale 2', 'Fédérale 3', 'Régionale 1', 'Régionale 2', 'Régionale 3'];

export const POSTES = {
  Rugby: ['Pilier', 'Talonneur', '2e ligne', '3e ligne', 'Demi de mêlée', "Demi d'ouverture", 'Centre', 'Ailier', 'Arrière'],
  Football: ['Gardien', 'Défenseur central', 'Latéral', 'Milieu défensif', 'Milieu offensif', 'Ailier', 'Attaquant'],
  Basketball: ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot'],
  Handball: ['Gardien', 'Ailier', 'Arrière', 'Demi-centre', 'Pivot'],
  Volleyball: ['Passeur', 'Pointu', 'Central', 'Réceptionneur-attaquant', 'Libéro'],
};

export const URGENCES = ['Dès que possible', 'Saison prochaine', 'Selon profil'];

export const ROLES = [
  { value: 'joueur', label: 'Joueur' },
  { value: 'club', label: 'Club' },
  { value: 'sante', label: 'Professionnel de santé' },
  { value: 'preparateur', label: 'Préparateur physique' },
  { value: 'entraineur', label: 'Entraîneur / Coach' },
  { value: 'arbitre', label: 'Arbitre' },
  { value: 'benevole', label: 'Bénévole' },
];

export const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

export const SPECIALITES_SANTE = ['Médecin du sport', 'Kinésithérapeute', 'Ostéopathe', 'Préparateur mental', 'Nutritionniste du sport', 'Infirmier'];

export const TYPES_MISSION_BENEVOLE = ['Administratif / gestion', 'Logistique matchs', 'Buvette / événementiel', 'Transport joueurs', 'Communication / réseaux sociaux', 'Autre'];

export const NIVEAUX_ARBITRAGE = ['Départemental', 'Régional', 'Fédéral'];

