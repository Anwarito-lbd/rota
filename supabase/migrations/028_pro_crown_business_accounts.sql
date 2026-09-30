-- ═════════════════════════════════════════════════════════════
-- Rota — 028 Pro crown and business (boutique) accounts
--
-- • Pro crown: profiles.pro_until mirrors member_entitlements (027), so every
--   member can see who is Pro (a crown next to the name). Only the store
--   webhook changes it; members can't write it.
-- • Boutiques: a shop registers with its SIRET. The `verify-business` Edge
--   Function checks it against the public French company register
--   (recherche-entreprises.api.gouv.fr) and, when the company exists and is
--   active, marks the profile as a verified business: "Boutique vérifiée".
--   The trader label is also what the DSA (art. 30) and consumer law require:
--   buyers must know when they deal with a professional.
-- ═════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists pro_until timestamptz,
  add column if not exists account_type text not null default 'personal' check (account_type in ('personal', 'business')),
  add column if not exists business_name text check (char_length(business_name) <= 120),
  add column if not exists business_verified boolean not null default false;
-- No update grant on these: pro_until comes from the store, the rest from
-- register_business() and the verification function.

create function public.entitlements_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set pro_until = new.pro_until where id = new.user_id;
  return null;
end;
$$;
create trigger entitlements_to_profile after insert or update of pro_until on public.member_entitlements
  for each row execute function public.entitlements_to_profile();
revoke execute on function public.entitlements_to_profile() from public, anon, authenticated;

-- Private details of a shop: only the shop and staff read them.
create table public.business_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  siret text not null check (siret ~ '^[0-9]{14}$'),
  declared_name text not null check (char_length(declared_name) between 2 and 120),
  legal_name text,
  address text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index business_details_siret on public.business_details (siret) where status = 'verified';
alter table public.business_details enable row level security;
create policy "Shops read their own details, staff read all"
  on public.business_details for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
revoke all on public.business_details from anon, authenticated;
grant select on public.business_details to authenticated;

-- SIRET check digit (Luhn), so typos are caught before asking the register.
create function public.siret_valid(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p ~ '^[0-9]{14}$' and (
    -- La Poste's establishments follow their own rule; the register decides.
    p like '356000000%'
    or (select sum(case when (14 - i) % 2 = 1 then d * 2 - case when d * 2 > 9 then 9 else 0 end else d end) % 10 = 0
          from (select i, substr(p, i, 1)::int as d from generate_series(1, 14) i) digits)
  );
$$;

-- The shop declares itself; verification follows in the Edge Function.
create function public.register_business(p_siret text, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s text := regexp_replace(coalesce(p_siret, ''), '\s', '', 'g');
begin
  if uid is null then raise exception 'Not allowed'; end if;
  if not public.siret_valid(s) then raise exception 'siret_invalid'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'business_name_required'; end if;
  if exists (select 1 from public.business_details where siret = s and status = 'verified' and user_id <> uid) then
    raise exception 'siret_taken';
  end if;
  insert into public.business_details (user_id, siret, declared_name)
  values (uid, s, btrim(p_name))
  on conflict (user_id) do update set siret = excluded.siret, declared_name = excluded.declared_name,
    status = 'pending', legal_name = null, address = null, checked_at = null;
  update public.profiles
     set account_type = 'business', business_name = btrim(p_name), business_verified = false
   where id = uid;
end;
$$;
revoke execute on function public.register_business(text, text) from public, anon;
grant execute on function public.register_business(text, text) to authenticated;

-- Called by verify-business (service role) with what the register said.
create function public.set_business_verification(
  p_user uuid, p_ok boolean, p_legal_name text, p_address text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.business_details
     set status = case when p_ok then 'verified' else 'rejected' end,
         legal_name = p_legal_name, address = p_address, checked_at = now()
   where user_id = p_user;
  update public.profiles
     set business_verified = p_ok,
         business_name = case when p_ok and p_legal_name is not null then coalesce(business_name, p_legal_name) else business_name end
   where id = p_user;
end;
$$;
revoke execute on function public.set_business_verification(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.set_business_verification(uuid, boolean, text, text) to service_role;
