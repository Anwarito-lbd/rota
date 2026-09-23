-- Adds multi-size listings. Run once in Supabase → SQL Editor.
-- Until this runs, a listing keeps a single size (the `size` column) and the
-- app simply shows it as text instead of a size picker.

alter table public.listings
  add column if not exists sizes text[] not null default '{}';

-- Existing rows keep their single size inside the new array.
update public.listings set sizes = array[size] where cardinality(sizes) = 0;

-- The column grants in schema.sql are explicit, so the new column needs its own.
grant insert (sizes), update (sizes) on public.listings to authenticated;
