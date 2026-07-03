import countries from 'i18n-iso-countries';
import fr from 'i18n-iso-countries/langs/fr.json';

countries.registerLocale(fr);

export const nationalites = Object.entries(countries.getNames('fr'))
  .map(([code, nom]) => ({ code, nom }))
  .sort((a, b) => a.nom.localeCompare(b.nom));
