-- ═════════════════════════════════════════════════════════════
-- Rota — 036 Virtual try-on: the server holds the budget
--
-- Before: the app spent the credit (consume_tryon), then asked the
-- `tryon-token` function for a Decart token. The function only counted
-- tokens in its own memory, so a member calling it directly, from any
-- number of function instances, got paid Decart sessions without credit.
--
-- Now `tryon-token` asks the database first (tryon_token_allowed):
--   · Pro, or a pass opened by spending one credit (30 min): 20 tokens / hour
--   · otherwise a small free allowance per day (0 at launch, see below)
--   · and a ceiling for the whole service per day, a hard stop rather
--     than a budget alert.
-- ═════════════════════════════════════════════════════════════

insert into public.policy_config (key, value, note) values
  ('tryon_pass_minutes', '30', 'One try-on credit opens a session this long.'),
  ('tryon_tokens_per_hour', '20', 'Decart tokens per paying member per hour.'),
  ('tryon_free_per_day', '3', 'Free try-ons per member per day without Pro or credit. Set to 0 when store purchases open.'),
  ('tryon_tokens_per_day_total', '500', 'Hard ceiling on Decart tokens for the whole service per day.')
on conflict (key) do nothing;

alter table public.member_entitlements add column if not exists tryon_pass_until timestamptz;

create table public.tryon_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  paid boolean not null,
  created_at timestamptz not null default now()
);
create index tryon_tokens_user_time on public.tryon_tokens (user_id, created_at);
create index tryon_tokens_time on public.tryon_tokens (created_at);
alter table public.tryon_tokens enable row level security;
revoke all on public.tryon_tokens from anon, authenticated;

-- One try-on: free with Pro; a pass still open costs nothing more;
-- otherwise one credit opens a pass.
create or replace function public.consume_tryon()
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
  if exists (select 1 from public.member_entitlements
              where user_id = uid and tryon_pass_until > now()) then
    return true;
  end if;
  update public.member_entitlements
     set tryon_credits = tryon_credits - 1,
         tryon_pass_until = now() + make_interval(mins => public.policy_num('tryon_pass_minutes', 30)::int),
         updated_at = now()
   where user_id = uid and tryon_credits > 0;
  return found;
end;
$$;
revoke execute on function public.consume_tryon() from public, anon;
grant execute on function public.consume_tryon() to authenticated;

-- Called by the tryon-token function (service role) before each Decart token.
-- 'ok' | 'no_credit' | 'rate_limited' | 'busy'
create function public.tryon_token_allowed(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid boolean;
  n integer;
begin
  if p_user is null then return 'no_credit'; end if;
  -- One decision at a time per member, so parallel calls can't overshoot.
  perform pg_advisory_xact_lock(hashtext('tryon:' || p_user::text));

  if (select count(*) from public.tryon_tokens where created_at > now() - interval '1 day')
     >= public.policy_num('tryon_tokens_per_day_total', 500) then
    return 'busy';
  end if;

  v_paid := public.is_pro(p_user) or exists (
    select 1 from public.member_entitlements where user_id = p_user and tryon_pass_until > now());

  if v_paid then
    select count(*) into n from public.tryon_tokens
     where user_id = p_user and created_at > now() - interval '1 hour';
    if n >= public.policy_num('tryon_tokens_per_hour', 20) then return 'rate_limited'; end if;
  else
    select count(*) into n from public.tryon_tokens
     where user_id = p_user and not paid and created_at > now() - interval '1 day';
    if n >= public.policy_num('tryon_free_per_day', 3) then return 'no_credit'; end if;
  end if;

  insert into public.tryon_tokens (user_id, paid) values (p_user, v_paid);
  delete from public.tryon_tokens where user_id = p_user and created_at < now() - interval '2 days';
  return 'ok';
end;
$$;
revoke execute on function public.tryon_token_allowed(uuid) from public, anon, authenticated;
grant execute on function public.tryon_token_allowed(uuid) to service_role;
