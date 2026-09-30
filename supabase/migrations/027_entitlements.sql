-- ═════════════════════════════════════════════════════════════
-- Rota — 027 Rota Pro and try-on credits, bought through the stores
--
-- Digital purchases go through Apple / Google in-app purchase (App Store
-- 3.1.1), relayed by RevenueCat. RevenueCat calls the `iap-webhook` Edge
-- Function, which records the event here with the service role. Members
-- can only read their own rights and spend a try-on credit; nothing on the
-- phone can grant Pro or credits.
--
--   Products: rota_pro_monthly (auto-renewing, 5,99 €)
--             rota_tryon_1     (consumable, 0,99 €, one try-on)
--   RevenueCat app user id = the Supabase user id.
-- ═════════════════════════════════════════════════════════════

create table public.member_entitlements (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pro_until timestamptz,
  tryon_credits integer not null default 0 check (tryon_credits >= 0),
  updated_at timestamptz not null default now()
);
alter table public.member_entitlements enable row level security;
create policy "Members read their own rights"
  on public.member_entitlements for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.member_entitlements from anon, authenticated;
grant select on public.member_entitlements to authenticated;

-- Each store event once, whatever RevenueCat retries.
create table public.iap_events (
  event_id text primary key,
  user_id uuid,
  kind text not null,
  product_id text,
  received_at timestamptz not null default now()
);
alter table public.iap_events enable row level security;
revoke all on public.iap_events from anon, authenticated;

create function public.iap_apply_event(
  p_event_id text, p_user uuid, p_type text, p_product text, p_expires timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.iap_events (event_id, user_id, kind, product_id)
  values (p_event_id, p_user, p_type, p_product)
  on conflict (event_id) do nothing;
  if not found then
    return 'duplicate';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    return 'unknown_user';
  end if;
  insert into public.member_entitlements (user_id) values (p_user) on conflict (user_id) do nothing;

  if p_product = 'rota_pro_monthly' then
    if p_type in ('INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED') then
      update public.member_entitlements set pro_until = greatest(coalesce(pro_until, now()), p_expires), updated_at = now()
       where user_id = p_user;
    elsif p_type = 'EXPIRATION' then
      update public.member_entitlements set pro_until = least(coalesce(pro_until, now()), now()), updated_at = now()
       where user_id = p_user;
    end if;
    -- CANCELLATION only stops the renewal: Pro stays until pro_until.
  elsif p_product = 'rota_tryon_1' and p_type in ('NON_RENEWING_PURCHASE', 'INITIAL_PURCHASE') then
    update public.member_entitlements set tryon_credits = tryon_credits + 1, updated_at = now()
     where user_id = p_user;
  end if;
  return 'applied';
end;
$$;
revoke execute on function public.iap_apply_event(text, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.iap_apply_event(text, uuid, text, text, timestamptz) to service_role;

create function public.is_pro(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select e.pro_until > now() from public.member_entitlements e where e.user_id = p_user), false);
$$;
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;
grant execute on function public.is_pro(uuid) to service_role;

-- One try-on: free with Pro, otherwise one credit. False when none left.
create function public.consume_tryon()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if public.is_pro(uid) then return true; end if;
  update public.member_entitlements set tryon_credits = tryon_credits - 1, updated_at = now()
   where user_id = uid and tryon_credits > 0;
  return found;
end;
$$;
revoke execute on function public.consume_tryon() from public, anon;
grant execute on function public.consume_tryon() to authenticated;

-- AI calls per member per day (outfit planner), counted by the function.
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  calls integer not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create function public.bump_ai_usage(p_user uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.ai_usage (user_id, day, calls) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n <= p_limit;
end;
$$;
revoke execute on function public.bump_ai_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(uuid, integer) to service_role;
