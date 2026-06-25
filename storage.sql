-- =========================================================
-- TURNOVER — Stockage (Storage) pour la galerie photos/vidéos
-- À exécuter dans SQL Editor, après schema.sql et trigger.sql
-- =========================================================

-- Crée le bucket "gallery" en accès public en lecture
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Tout le monde peut voir les fichiers (galerie publique)
create policy "Lecture publique de la galerie"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Un utilisateur connecté peut uniquement déposer un fichier dans SON propre dossier
-- (le code de l'appli range chaque fichier dans un dossier nommé par son propre user id)
create policy "Upload uniquement dans son propre dossier"
  on storage.objects for insert
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Un utilisateur peut supprimer uniquement ses propres fichiers
create policy "Suppression uniquement de ses propres fichiers"
  on storage.objects for delete
  using (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
