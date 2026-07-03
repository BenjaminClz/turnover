-- À exécuter dans Supabase → SQL Editor → Run
-- Adapte "profiles" si ta table s'appelle autrement

alter table profiles add column nationalites text[] default '{}';
alter table profiles add column ville text;
alter table profiles add column pays text;
alter table profiles add column latitude float8;
alter table profiles add column longitude float8;
alter table profiles add column stat_vitesse smallint default 50 check (stat_vitesse between 0 and 100);
alter table profiles add column stat_defense smallint default 50 check (stat_defense between 0 and 100);
alter table profiles add column stat_vision smallint default 50 check (stat_vision between 0 and 100);
alter table profiles add column stat_technique smallint default 50 check (stat_technique between 0 and 100);
alter table profiles add column stat_combat smallint default 50 check (stat_combat between 0 and 100);
alter table profiles add column stat_attaque smallint default 50 check (stat_attaque between 0 and 100);
alter table profiles add column stat_physique smallint default 50 check (stat_physique between 0 and 100);
alter table profiles add column pied_fort text check (pied_fort in ('gauche', 'droit', 'ambidextre'));
