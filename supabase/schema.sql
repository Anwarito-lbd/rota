-- Rota — database schema for Supabase (Postgres).
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project.

-- ─────────────────────────────────────────────────────────────
-- Profiles: one row per account, created automatically at signup.
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Lowercase only, so uniqueness is also case-insensitive.
  username text not null unique
    check (username ~ '^[a-z0-9._]{3,20}$')
    check (username not in ('admin', 'rota', 'support', 'moderation', 'help')),
  avatar_url text,
  city text,
  bio text check (char_length(bio) <= 300),
  -- Set by moderators only (see the column grants below).
  identity_status text not null default 'none'
    check (identity_status in ('none', 'pending', 'verified', 'rejected')),
  certified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Creates the profile from the username passed at signup. If the username is
-- taken or invalid, the insert fails and so does the signup — no duplicates.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the signup form check a username before creating the account.
create function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Listings
-- ─────────────────────────────────────────────────────────────
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  brand text check (char_length(brand) <= 60),
  category text not null,
  size text not null,
  occasion text,
  price_per_day integer not null check (price_per_day between 1 and 1000),
  retail_value integer check (retail_value >= 0),
  -- The lender may only charge for cleaning if she does it herself.
  cleaning_by_lender boolean not null default false,
  cleaning_fee integer not null default 0 check (cleaning_fee between 0 and 200),
  rules text[] not null default '{}',
  accept_offers boolean not null default true,
  min_offer integer check (min_offer >= 1),
  instant_book boolean not null default true,
  local_handover boolean not null default true,
  city text,
  video_path text,
  photo_paths text[] not null default '{}',
  authenticity_path text,
  -- Reviewed by moderators from the receipt or label photo.
  authenticity_status text not null default 'none'
    check (authenticity_status in ('none', 'pending', 'verified', 'rejected')),
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  created_at timestamptz not null default now(),
  constraint cleaning_fee_only_when_lender_cleans
    check (cleaning_by_lender or cleaning_fee = 0)
);

create index listings_feed_idx on public.listings (status, created_at desc);
create index listings_owner_idx on public.listings (owner_id);

-- ─────────────────────────────────────────────────────────────
-- Favorites (likes / saves)
-- ─────────────────────────────────────────────────────────────
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: every table is locked down, then opened
-- only as far as each rule below allows.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;

create policy "Profiles are visible to signed-in members"
  on public.profiles for select to authenticated using (true);

create policy "Members edit their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Members can change these columns only — never their own verification flags.
revoke update on public.profiles from authenticated;
grant update (avatar_url, city, bio) on public.profiles to authenticated;

create policy "Active listings are visible to signed-in members"
  on public.listings for select to authenticated
  using (status = 'active' or owner_id = (select auth.uid()));

create policy "Members create their own listings"
  on public.listings for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Members edit their own listings"
  on public.listings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "Members delete their own listings"
  on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()));

-- The authenticity verdict is a moderator decision, not an owner setting.
revoke insert, update on public.listings from authenticated;
grant insert (
  owner_id, title, brand, category, size, occasion, price_per_day, retail_value,
  cleaning_by_lender, cleaning_fee, rules, accept_offers, min_offer, instant_book,
  local_handover, city, video_path, photo_paths, authenticity_path, status
) on public.listings to authenticated;
grant update (
  title, brand, category, size, occasion, price_per_day, retail_value,
  cleaning_by_lender, cleaning_fee, rules, accept_offers, min_offer, instant_book,
  local_handover, city, video_path, photo_paths, authenticity_path, status
) on public.listings to authenticated;

create policy "Members manage their own favorites"
  on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- File storage. Each member writes only inside a folder named
-- after their own user id, e.g. listing-media/<uid>/video.mp4
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('listing-media', 'listing-media', true, 104857600,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']),
  -- ID documents and receipts: never public.
  ('private-docs', 'private-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

create policy "Members upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'listing-media', 'private-docs')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members replace their own files"
  on storage.objects for update to authenticated
  using ((storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Members delete their own files"
  on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Members read their own private documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
