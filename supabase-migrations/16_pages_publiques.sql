-- =========================================================
-- Migration 16 : pages publiques (joueurs + clubs)
-- À exécuter une fois dans Supabase > SQL Editor
-- =========================================================

-- 1) Joueurs : la page publique n'affiche plus que les profils PUBLIÉS.
--    (Avant, un profil non publié restait accessible si on connaissait son lien.)
create or replace view public.public_player_profiles as
select pl.id, pl.owner_id, pl.sport, pl.poste, pl.niveau, pl.ville, pl.dispo,
       pl.taille_cm, pl.poids_kg, pl.annees_pratique, pl.nationalites, pl.pied_fort,
       pl.stat_vitesse, pl.stat_defense, pl.stat_vision, pl.stat_technique,
       pl.stat_combat, pl.stat_attaque, pl.stat_physique,
       pl.dernier_club, pl.dernier_club_niveau, pl.bio,
       p.nom, p.avatar_path
from public.player_listings pl
join public.profiles p on p.id = pl.owner_id
where pl.published = true;

-- 2) Clubs : uniquement les informations publiques d'un club
--    (jamais l'e-mail, le téléphone ni les données de compte).
create or replace view public.public_club_profiles as
select p.id, p.nom, p.avatar_path, p.adresse, p.infrastructures
from public.profiles p
where p.role = 'club';

-- 3) Annonces des clubs, champs publics uniquement
create or replace view public.public_club_needs as
select n.id, n.owner_id, n.club, n.besoin_type, n.sport, n.poste, n.niveau,
       n.ville, n.urgence, n.details, n.specialite, n.type_mission,
       n.remuneration, n.created_at
from public.club_needs n;

grant select on public.public_player_profiles to anon, authenticated;
grant select on public.public_club_profiles to anon, authenticated;
grant select on public.public_club_needs to anon, authenticated;
