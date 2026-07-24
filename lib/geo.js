// Géocodage via l'API Adresse officielle du gouvernement français (gratuite, sans clé)
export async function geocodeVille(ville) {
  if (!ville || !ville.trim()) return null;
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(ville)}&type=municipality&limit=1`);
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    const [longitude, latitude] = feature.geometry.coordinates;
    return { latitude, longitude, label: feature.properties.label };
  } catch {
    return null;
  }
}

// Géocodage via Google Maps (script déjà chargé dans le layout). Plus complet que
// l'API française pour les adresses de rue (elle ne connaît pas toutes les rues).
// Attend que le script Google soit prêt (jusqu'à ~6 s) puis résout, ou null.
export function geocodeAdresseGoogle(adresse) {
  if (typeof window === 'undefined' || !adresse || !adresse.trim()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let tries = 0;
    const attempt = () => {
      if (window.google?.maps?.Geocoder) {
        try {
          new window.google.maps.Geocoder().geocode({ address: adresse }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const loc = results[0].geometry.location;
              resolve({ latitude: loc.lat(), longitude: loc.lng(), label: results[0].formatted_address });
            } else {
              resolve(null);
            }
          });
        } catch { resolve(null); }
        return;
      }
      if (tries++ > 40) { resolve(null); return; }
      setTimeout(attempt, 150);
    };
    attempt();
  });
}

// Géocodage d'une adresse complète (niveau numéro/rue), avec replis successifs :
// 1) Google Maps, 2) API Adresse française niveau rue, 3) niveau ville.
export async function geocodeAdresse(adresse) {
  if (!adresse || !adresse.trim()) return null;

  const google = await geocodeAdresseGoogle(adresse);
  if (google) return google;

  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`);
    const data = await res.json();
    const feature = data?.features?.[0];
    if (feature) {
      const [longitude, latitude] = feature.geometry.coordinates;
      return { latitude, longitude, label: feature.properties.label };
    }
  } catch {
    /* repli ci-dessous */
  }
  return geocodeVille(adresse);
}

// Formule de Haversine — distance réelle en km entre deux points GPS
export function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
