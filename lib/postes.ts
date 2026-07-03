// Postes où le jeu au pied est déterminant → champ "pied fort" affiché.
// Basé exactement sur les libellés de POSTES dans lib/constants.js.
const POSTES_AU_PIED = {
  Rugby: new Set(['Demi de mêlée', "Demi d'ouverture", 'Arrière', 'Centre']),
  Football: new Set([
    'Gardien', 'Défenseur central', 'Latéral', 'Milieu défensif',
    'Milieu offensif', 'Ailier', 'Attaquant',
  ]),
  // Basketball, Handball, Volleyball : pas de notion de pied fort
};

export function posteDemandeAuPied(sport, poste) {
  return POSTES_AU_PIED[sport]?.has(poste) ?? false;
}
