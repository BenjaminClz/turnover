-- =========================================================
-- Galerie « façon Instagram » : description, likes, commentaires
-- À exécuter dans le SQL Editor de Supabase.
-- =========================================================

-- 1. Description (légende) sur les publications de galerie
alter table public.gallery_items add column if not exists description text;

-- 2. Likes sur les publications de galerie
create table if not exists public.gallery_likes (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid references public.gallery_items(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (item_id, user_id)
);

alter table public.gallery_likes enable row level security;

create policy "Tout le monde voit les likes galerie"
  on public.gallery_likes for select using (true);
create policy "Un utilisateur aime avec son propre compte"
  on public.gallery_likes for insert with check (auth.uid() = user_id);
create policy "Un utilisateur retire son propre like"
  on public.gallery_likes for delete using (auth.uid() = user_id);

-- 3. Commentaires sur les publications de galerie
create table if not exists public.gallery_comments (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid references public.gallery_items(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.gallery_comments enable row level security;

create policy "Tout le monde voit les commentaires galerie"
  on public.gallery_comments for select using (true);
create policy "Un utilisateur commente avec son propre compte"
  on public.gallery_comments for insert with check (auth.uid() = author_id);
create policy "Un utilisateur supprime son propre commentaire"
  on public.gallery_comments for delete using (auth.uid() = author_id);
