# Turnover — Nouvelles fonctionnalités profil joueur

## 1. Installer les packages (terminal, à la racine du projet)

```bash
npm install i18n-iso-countries react-select use-places-autocomplete recharts
```

## 2. Copier les dossiers

Copie les dossiers `lib/` et `components/` de ce zip directement à la racine
de ton projet Next.js (ou dans `src/` si ton projet utilise cette structure).

Si tu as déjà des dossiers `lib/` ou `components/` avec d'autres fichiers,
ne remplace pas les dossiers entiers : copie uniquement les fichiers listés
ci-dessous à l'intérieur.

- lib/nationalites.ts
- lib/postes.ts
- components/NationaliteSelect.tsx
- components/VilleAutocomplete.tsx
- components/StatsSlider.tsx
- components/StatsRadar.tsx
- components/PiedFortSelect.tsx

## 3. Exécuter migration.sql dans Supabase

Dashboard Supabase → SQL Editor → New query → colle le contenu de
`migration.sql` → Run.

## 4. Clé Google Places API (pour VilleAutocomplete)

- Crée une clé sur https://console.cloud.google.com avec l'API "Places API" activée
- Ajoute dans `.env.local` :
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=ta_cle_ici
- Charge le script dans ton layout :
  <script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`} async />

## 5. Intégration dans le formulaire de profil

Reste à brancher ces composants dans ton formulaire existant. Envoie le
fichier du formulaire actuel pour avoir le diff exact.
