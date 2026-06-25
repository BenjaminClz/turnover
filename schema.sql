-- =========================================================
-- TURNOVER — Schéma de base de données Supabase
-- À copier-coller dans : Supabase > SQL Editor > New query
-- =========================================================

-- Extension nécessaire pour générer des UUID
create extension if not exists "uuid-ossp";

-- =========================================================
-- 1. PROFILS UTILISATEURS (lié à l'auth Supabase native)
-- =========================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nom text not null,
  role text not null check (role in ('joueur', 'club')),
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Les profils sont visibles par tous les utilisateurs connectés"
  on public.profiles for select
  using (true);

create policy "Un utilisateur peut modifier uniquement son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Un utilisateur peut créer son propre profil à l'inscription"
  on public.profiles for insert
  with check (auth.uid() = id);


-- =========================================================
-- 2. PROFILS JOUEURS (les fiches sportives)
-- =========================================================
create table public.player_listings (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  sport text not null,
  poste text not null,
  niveau text not null,
  ville text not null,
  distance integer default 15,
  dispo text not null,
  bio text,
  created_at timestamp with time zone default now()
);

alter table public.player_listings enable row level security;

create policy "Tout le monde peut voir les profils joueurs"
  on public.player_listings for select
  using (true);

create policy "Un joueur peut créer son propre profil"
  on public.player_listings for insert
  with check (auth.uid() = owner_id);

create policy "Un joueur peut modifier son propre profil"
  on public.player_listings for update
  using (auth.uid() = owner_id);

create policy "Un joueur peut supprimer son propre profil"
  on public.player_listings for delete
  using (auth.uid() = owner_id);


-- =========================================================
-- 3. BESOINS CLUBS (les postes à pourvoir)
-- =========================================================
create table public.club_needs (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  club text not null,
  sport text not null,
  poste text not null,
  niveau text not null,
  ville text not null,
  urgence text not null,
  details text,
  created_at timestamp with time zone default now()
);

alter table public.club_needs enable row level security;

create policy "Tout le monde peut voir les besoins clubs"
  on public.club_needs for select
  using (true);

create policy "Un club peut créer son propre besoin"
  on public.club_needs for insert
  with check (auth.uid() = owner_id);

create policy "Un club peut modifier son propre besoin"
  on public.club_needs for update
  using (auth.uid() = owner_id);

create policy "Un club peut supprimer son propre besoin"
  on public.club_needs for delete
  using (auth.uid() = owner_id);


-- =========================================================
-- 4. GALERIE (métadonnées des photos/vidéos ; fichiers eux-mêmes
--    stockés dans Supabase Storage, voir guide d'installation)
-- =========================================================
create table public.gallery_items (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  file_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamp with time zone default now()
);

alter table public.gallery_items enable row level security;

create policy "Tout le monde peut voir les galeries"
  on public.gallery_items for select
  using (true);

create policy "Un utilisateur peut ajouter à sa propre galerie"
  on public.gallery_items for insert
  with check (auth.uid() = owner_id);

create policy "Un utilisateur peut supprimer de sa propre galerie"
  on public.gallery_items for delete
  using (auth.uid() = owner_id);


-- =========================================================
-- 5. CONVERSATIONS
-- =========================================================
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_1 uuid references public.profiles(id) on delete cascade not null,
  participant_2 uuid references public.profiles(id) on delete cascade not null,
  context text,
  created_at timestamp with time zone default now(),
  unique (participant_1, participant_2)
);

alter table public.conversations enable row level security;

create policy "Les participants peuvent voir leur conversation"
  on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Un utilisateur peut démarrer une conversation"
  on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);


-- =========================================================
-- 6. MESSAGES
-- =========================================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "Les participants d'une conversation peuvent voir les messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Les participants peuvent envoyer des messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- Active le "temps réel" sur les messages (pour les voir arriver instantanément)
alter publication supabase_realtime add table public.messages;


-- =========================================================
-- FIN DU SCRIPT — Ton schéma est prêt.
-- =========================================================
