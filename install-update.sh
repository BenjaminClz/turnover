#!/bin/bash
set -e

echo "========================================="
echo " Turnover — Liste bénévole + précision Autre"
echo "========================================="
echo ""

if [ ! -f "package.json" ]; then
  echo "❌ Erreur : ce script doit être lancé DEPUIS le dossier turnover-nextjs."
  exit 1
fi

if [ ! -d "files" ]; then
  echo "❌ Erreur : le dossier 'files' n'a pas été trouvé à côté de ce script."
  exit 1
fi

echo "→ Copie des fichiers mis à jour…"
cp -f files/lib/constants.js lib/constants.js
cp -f files/components/StaffTab.js components/StaffTab.js
cp -f files/components/ClubsTab.js components/ClubsTab.js
cp -f files/components/SearchTab.js components/SearchTab.js

echo ""
echo "✅ Terminé ! Tu peux relancer :  npm run dev"
echo ""
echo "⚠️  IMPORTANT : assure-toi d'avoir exécuté type-mission-autre-migration.sql"
echo "   dans Supabase AVANT de tester."
