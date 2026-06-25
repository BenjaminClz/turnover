# Turnover — Guide d'installation et de déploiement

Ce guide suppose que tu as déjà :
- Créé ton projet Supabase
- Exécuté `schema.sql` puis `trigger.sql` dans le SQL Editor de Supabase

## Étape 1 — Créer le bucket de stockage (pour la galerie)

1. Dans Supabase, ouvre **SQL Editor → New query**
2. Colle le contenu de `storage.sql`
3. Clique sur **Run**

Vérifie ensuite dans le menu **Storage** (à gauche) qu'un bucket nommé `gallery` est bien apparu.

## Étape 2 — Activer le temps réel (pour la messagerie)

1. Va dans **Database → Replication** (parfois appelé "Realtime" selon la version)
2. Trouve la table `messages`
3. Active le toggle pour qu'elle soit suivie en temps réel

(Normalement déjà fait automatiquement par la ligne `alter publication supabase_realtime add table public.messages;` dans `schema.sql`, mais vérifie que c'est bien actif.)

## Étape 3 — Installer le projet sur ton ordinateur

Tu as besoin de **Node.js** installé sur ton ordinateur. Si tu ne l'as pas :
- Va sur https://nodejs.org, télécharge la version "LTS", installe-la (clic suivant partout)

Ensuite, ouvre un terminal (sur Mac : application "Terminal" ; sur Windows : "PowerShell" ou "Invite de commandes") :

```bash
# Va dans le dossier où tu as téléchargé/dézippé le projet
cd chemin/vers/turnover-nextjs

# Installe toutes les dépendances (peut prendre 1-2 minutes)
npm install

# Lance le site en local pour tester
npm run dev
```

Ouvre ensuite ton navigateur à l'adresse **http://localhost:3000** — le site devrait s'afficher. Teste la création de compte, vérifie que tu reçois bien l'email de confirmation Supabase.

> Le fichier `.env.local` contient déjà tes clés Supabase, donc tu n'as rien à configurer à cette étape.

## Étape 4 — Mettre le code sur GitHub (nécessaire pour Vercel)

1. Va sur https://github.com, crée un nouveau dépôt (bouton vert "New")
2. Nomme-le `turnover`, laisse-le public ou privé (peu importe), ne coche aucune case d'initialisation
3. Dans ton terminal, toujours dans le dossier du projet :

```bash
git init
git add .
git commit -m "Premier déploiement Turnover"
git branch -M main
git remote add origin https://github.com/TON-NOM-UTILISATEUR/turnover.git
git push -u origin main
```

(Remplace `TON-NOM-UTILISATEUR` par ton vrai nom d'utilisateur GitHub — l'adresse exacte est affichée sur la page de ton nouveau dépôt GitHub après création.)

## Étape 5 — Déployer sur Vercel

1. Va sur https://vercel.com, connecte-toi avec ton compte GitHub
2. Clique sur **"Add New" → "Project"**
3. Choisis le dépôt `turnover` que tu viens de créer
4. Avant de cliquer sur "Deploy", déplie la section **"Environment Variables"** et ajoute les deux variables suivantes (les mêmes que dans ton fichier `.env.local`) :
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://dpanrqprujsdjjjzzpnw.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → (ta longue clé qui commence par `eyJ...`)
5. Clique sur **Deploy**

Après 1-2 minutes, Vercel te donne une URL publique (du type `turnover-xxxx.vercel.app`) — ton site est en ligne.

## Étape 6 — Corriger l'URL de redirection pour le reset de mot de passe

Une fois ton site déployé, il faut dire à Supabase d'accepter cette nouvelle adresse pour les emails de réinitialisation :

1. Dans Supabase, va dans **Authentication → URL Configuration**
2. Dans **"Site URL"**, mets l'adresse Vercel (ex. `https://turnover-xxxx.vercel.app`)
3. Dans **"Redirect URLs"**, ajoute la même adresse suivie de `/reset-password` (ex. `https://turnover-xxxx.vercel.app/reset-password`)
4. Sauvegarde

## Étape 7 — Tester en conditions réelles

- Crée deux comptes différents (un "joueur", un "club") avec deux adresses email différentes que tu peux consulter
- Confirme bien les deux emails reçus
- Connecte-toi avec chacun dans deux navigateurs différents (ou un en navigation privée) pour simuler deux vraies personnes
- Teste : publier un profil, publier un besoin, se contacter, échanger des messages (qui doivent apparaître en temps réel), ajouter une photo dans la galerie

## En cas de problème

- **"Erreur de chargement" partout** → vérifie que les 3 scripts SQL (`schema.sql`, `trigger.sql`, `storage.sql`) ont bien été exécutés sans erreur
- **Pas d'email reçu** → vérifie tes spams ; vérifie aussi dans Supabase, **Authentication → Logs**, si l'envoi a échoué
- **Erreur au moment du `npm install`** → vérifie que Node.js est bien installé (`node -v` dans le terminal doit afficher un numéro de version)
- **Le site fonctionne en local mais pas sur Vercel** → vérifie que les variables d'environnement ont bien été ajoutées dans les réglages du projet Vercel (Settings → Environment Variables)

## Limites encore présentes (pour info)

Cette version corrige les points techniques principaux (vraie base de données, vraie authentification avec email, vrai stockage, vraie messagerie temps réel). Restent encore, si tu veux aller plus loin un jour :
- Pas de modération de contenu automatique
- Pas de recherche géographique réelle (calcul de distance)
- Pas de paiement intégré (Stripe) pour la version payante côté clubs
- Pas de vérification d'identité des clubs
