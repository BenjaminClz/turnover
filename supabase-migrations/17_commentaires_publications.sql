-- =========================================================
-- Migration 17 : commentaires sur les publications du fil
-- À exécuter une fois dans Supabase > SQL Editor
-- =========================================================

create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamp with time zone default now()
);

create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "Tout le monde voit les commentaires des publications" on public.post_comments;
create policy "Tout le monde voit les commentaires des publications"
  on public.post_comments for select using (true);

drop policy if exists "Un utilisateur commente avec son propre compte" on public.post_comments;
create policy "Un utilisateur commente avec son propre compte"
  on public.post_comments for insert with check (auth.uid() = author_id);

-- L'auteur du commentaire OU l'auteur de la publication peut le supprimer
drop policy if exists "Auteur du commentaire ou de la publication supprime" on public.post_comments;
create policy "Auteur du commentaire ou de la publication supprime"
  on public.post_comments for delete using (
    auth.uid() = author_id
    or auth.uid() = (select p.author_id from public.posts p where p.id = post_id)
  );
