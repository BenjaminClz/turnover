#!/bin/bash
set -e

echo "========================================="
echo " Turnover — Plusieurs besoins simultanés"
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

echo "→ Copie du fichier mis à jour…"
cp -f files/components/ClubsTab.js components/ClubsTab.js

echo ""
echo "✅ Terminé ! Tu peux relancer :  npm run dev"
