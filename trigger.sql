-- =========================================================
-- TURNOVER — Trigger complémentaire
-- À exécuter APRÈS schema.sql, dans le même SQL Editor
-- Crée automatiquement une ligne dans "profiles" quand
-- quelqu'un confirme son inscription.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', 'Sans nom'),
    coalesce(new.raw_user_meta_data->>'role', 'joueur')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
