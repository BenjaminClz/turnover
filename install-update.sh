#!/bin/bash
set -e

echo "========================================="
echo " Turnover — Photo de profil + galerie club"
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
cp -f files/components/AvatarUpload.js components/AvatarUpload.js
cp -f files/components/PlayersTab.js components/PlayersTab.js
cp -f files/components/StaffTab.js components/StaffTab.js
cp -f files/components/ClubsTab.js components/ClubsTab.js
cp -f files/components/SearchTab.js components/SearchTab.js
cp -f files/components/MessagesTab.js components/MessagesTab.js
cp -f files/lib/use-user.js lib/use-user.js
cp -f files/app/app/page.js app/app/page.js

echo ""
echo "✅ Terminé ! Tu peux relancer :  npm run dev"
echo ""
echo "⚠️  IMPORTANT : assure-toi d'avoir exécuté les scripts SQL"
echo "   avatar-migration.sql ET avatar-storage.sql dans Supabase"
echo "   AVANT de tester, sinon l'upload de photo échouera."
