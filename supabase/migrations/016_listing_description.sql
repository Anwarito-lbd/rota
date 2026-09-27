-- ═════════════════════════════════════════════════════════════
-- Rota — 016 A description on listings
--
-- The single-page listing form (like Vinted's) asks for a free-text
-- description. The app drops the column from its insert until this runs.
-- ═════════════════════════════════════════════════════════════

alter table public.listings
  add column if not exists description text check (char_length(description) <= 2000);
grant insert (description), update (description) on public.listings to authenticated;
