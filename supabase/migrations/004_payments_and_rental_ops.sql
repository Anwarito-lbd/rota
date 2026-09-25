-- ═════════════════════════════════════════════════════════════
-- Rota — 004 Payments and rental operations
--
--   • No double booking: an exclusion constraint on (listing, dates).
--   • Real money through Stripe. The database decides *what* is owed and
--     writes it to an outbox (payment_jobs); the `worker` Edge Function
--     moves the money and reports back. Webhooks confirm payments.
--   • Reminders: the lifecycle tick writes notifications; the worker
--     emails them. 006_schedules.sql runs both every few minutes.
--   • Fixes confirm_possession from 002, which could never succeed
--     (it passed a uuid where audit() takes text).
--
-- Run after 003_content_moderation.sql.
-- ═════════════════════════════════════════════════════════════

create extension if not exists btree_gist;

-- ─────────────────────────────────────────────────────────────
-- 1. Policy numbers
-- ─────────────────────────────────────────────────────────────
insert into public.policy_config (key, value, note) values
  ('payment_window_minutes', '30', 'An unpaid booking holds its dates this long.'),
  ('turnaround_days', '1', 'Days blocked after a rental for the return trip and cleaning.'),
  ('max_rental_days', '14', 'Longest single rental.'),
  ('max_booking_lead_days', '180', 'How far ahead a rental can start.'),
  ('return_reminder_hours', '24', 'Reminder sent this long before the return is due.'),
  ('payment_job_max_attempts', '20', 'Retries (backoff up to 12 h, about 6 days) before a money movement needs a person.')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Staff, payment accounts, language
-- ─────────────────────────────────────────────────────────────
create table public.staff_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid());
$$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Kept out of profiles, which every member can read.
create table public.payment_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_account_id text unique,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  identity_session_id text,
  updated_at timestamptz not null default now()
);
alter table public.payment_accounts enable row level security;
revoke all on public.payment_accounts from anon, authenticated;
grant select on public.payment_accounts to authenticated;
create policy "Members read their own payment account"
  on public.payment_accounts for select to authenticated
  using (user_id = (select auth.uid()));

-- Emails go out in the member's language.
alter table public.profiles
  add column if not exists lang text not null default 'fr' check (lang in ('fr', 'en', 'es'));
grant update (lang) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Rentals: payment state and availability
-- ─────────────────────────────────────────────────────────────
alter table public.rentals
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'processing', 'paid', 'failed', 'expired', 'refunded')),
  add column if not exists payment_due_by timestamptz,
  add column if not exists stripe_payment_intent_id text unique,
  add column if not exists stripe_charge_id text,
  add column if not exists hold_status text not null default 'none'
    check (hold_status in ('none', 'pending', 'authorized', 'released', 'captured', 'failed')),
  add column if not exists hold_payment_intent_id text,
  add column if not exists hold_captured numeric(10,2) not null default 0,
  -- late_fees_charged (002) is what has accrued; this is what was collected.
  add column if not exists late_fees_collected numeric(10,2) not null default 0,
  -- Dates the piece is unavailable: the rental plus the turnaround.
  add column if not exists blocked_during daterange,
  -- Set by a dispute or a fraud warning; keeps the payout on hold.
  add column if not exists flagged text check (flagged in ('dispute', 'fraud_warning', 'hold_failed', 'charge_failed'));

create function public.rentals_validate_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.end_date < new.start_date then
    raise exception 'Invalid dates';
  end if;
  if new.start_date < current_date then
    raise exception 'Dates in the past';
  end if;
  if new.start_date > current_date + public.policy_num('max_booking_lead_days', 180)::integer then
    raise exception 'Too far ahead';
  end if;
  if (new.end_date - new.start_date) + 1 > public.policy_num('max_rental_days', 14) then
    raise exception 'Rental too long';
  end if;
  new.blocked_during := daterange(
    new.start_date,
    new.end_date + 1 + public.policy_num('turnaround_days', 1)::integer,
    '[)');
  new.payment_due_by := now() + make_interval(mins => public.policy_num('payment_window_minutes', 30)::integer);
  return new;
end;
$$;

create trigger rentals_validate_dates
  before insert on public.rentals
  for each row execute function public.rentals_validate_dates();

update public.rentals
   set blocked_during = daterange(start_date, end_date + 2, '[)')
 where blocked_during is null;

-- Two live rentals of the same piece can never overlap. Unpaid bookings
-- count (they hold the dates until payment_due_by, then expire).
alter table public.rentals
  add constraint rentals_no_double_booking
  exclude using gist (listing_id with =, blocked_during with &&)
  where (status not in ('cancelled', 'returned', 'closed'));

-- What the calendar greys out. No renter information leaves this function.
create function public.listing_unavailable_ranges(p_listing uuid)
returns table (from_date date, to_date date)
language sql
stable
security definer
set search_path = ''
as $$
  select lower(blocked_during), upper(blocked_during) - 1
  from public.rentals
  where listing_id = p_listing
    and status not in ('cancelled', 'returned', 'closed')
    and upper(blocked_during) > current_date
  order by 1;
$$;
revoke execute on function public.listing_unavailable_ranges(uuid) from public, anon;
grant execute on function public.listing_unavailable_ranges(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Payouts and claims: what was actually moved
-- ─────────────────────────────────────────────────────────────
alter table public.payouts drop constraint if exists payouts_state_check;
alter table public.payouts
  add constraint payouts_state_check check (state in (
    'pending', 'scheduled', 'on_hold', 'released', 'paid', 'failed', 'cancelled')),
  add column if not exists claim_compensation numeric(10,2) not null default 0,
  add column if not exists provider_transfer_id text,
  add column if not exists paid_at timestamptz;

alter table public.claims
  add column if not exists collected_amount numeric(10,2) not null default 0;

-- ─────────────────────────────────────────────────────────────
-- 5. Notifications (reminders and receipts)
-- ─────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  rental_id uuid references public.rentals (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete cascade,
  payload jsonb not null default '{}',
  -- One of each kind per rental per person: the tick can run as often as it likes.
  dedupe_key text not null unique,
  email_state text not null default 'pending'
    check (email_state in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  email_attempts integer not null default 0,
  emailed_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_outbox_idx on public.notifications (email_state, created_at)
  where email_state = 'pending';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "Members read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Members mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.notify(
  p_user uuid, p_kind text, p_rental uuid default null, p_claim uuid default null,
  p_payload jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, rental_id, claim_id, payload, dedupe_key)
  values (p_user, p_kind, p_rental, p_claim, coalesce(p_payload, '{}'),
          p_kind || ':' || coalesce(p_rental::text, '-') || ':' || coalesce(p_claim::text, '-') || ':' || p_user::text)
  on conflict (dedupe_key) do nothing;
$$;

-- The worker's email outbox. Reads the address from auth.users, which
-- the API never exposes.
create function public.claim_notifications(p_limit integer default 25)
returns table (
  id uuid, kind text, payload jsonb, created_at timestamptz, email text, lang text,
  username text, listing_title text, start_date date, end_date date)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  -- Old news is not worth an email.
  update public.notifications set email_state = 'skipped'
   where email_state = 'pending' and created_at < now() - interval '3 days';
  update public.notifications set email_state = 'pending'
   where email_state = 'sending' and created_at < now() - interval '15 minutes' and email_attempts < 5;

  return query
  with picked as (
    update public.notifications n
       set email_state = 'sending', email_attempts = n.email_attempts + 1
     where n.id in (select x.id from public.notifications x
                     where x.email_state = 'pending'
                     order by x.created_at limit greatest(1, least(p_limit, 100))
                     for update skip locked)
    returning n.*)
  select p.id, p.kind, p.payload, p.created_at, u.email::text, pr.lang, pr.username, l.title, r.start_date, r.end_date
    from picked p
    join auth.users u on u.id = p.user_id
    join public.profiles pr on pr.id = p.user_id
    left join public.rentals r on r.id = p.rental_id
    left join public.listings l on l.id = r.listing_id;
end;
$$;

create function public.mark_notification_email(p_id uuid, p_state text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set email_state = case when p_state = 'failed' and email_attempts < 5 then 'pending' else p_state end,
         emailed_at = case when p_state = 'sent' then now() else emailed_at end
   where id = p_id;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Money outbox
-- ─────────────────────────────────────────────────────────────
create table public.payment_jobs (
  id bigserial primary key,
  kind text not null check (kind in (
    'authorize_hold', 'release_hold', 'charge_late_fees', 'charge_claim',
    'transfer_payout', 'refund_rental')),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete cascade,
  payout_id uuid references public.payouts (id) on delete cascade,
  -- Fixed the first time the job runs, so a retry never asks Stripe for a
  -- different amount under the same idempotency key.
  amount numeric(10,2),
  idempotency_key text not null unique,
  state text not null default 'queued' check (state in ('queued', 'running', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  provider_ref text,
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_jobs_queue_idx on public.payment_jobs (state, run_after);
alter table public.payment_jobs enable row level security;
revoke all on public.payment_jobs from anon, authenticated;

create function public.enqueue_payment_job(
  p_kind text, p_rental uuid, p_key text,
  p_claim uuid default null, p_payout uuid default null, p_amount numeric default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.payment_jobs (kind, rental_id, claim_id, payout_id, amount, idempotency_key)
  values (p_kind, p_rental, p_claim, p_payout, p_amount, p_key)
  on conflict (idempotency_key) do nothing;
$$;

-- Hands out due jobs with everything the worker needs to call Stripe.
create function public.claim_payment_jobs(p_limit integer default 10)
returns table (
  id bigint, kind text, rental_id uuid, claim_id uuid, payout_id uuid, amount numeric,
  idempotency_key text, attempts integer,
  renter_customer text, renter_payment_method text, owner_account text,
  payment_intent text, charge text, hold_intent text, hold_amount numeric, hold_captured numeric,
  payout_net numeric, payout_compensation numeric)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.payment_jobs j
     set state = 'queued', updated_at = now()
   where j.state = 'running' and j.updated_at < now() - interval '15 minutes';

  -- Amounts that depend on the rental are read at the moment the job starts.
  update public.payment_jobs j set amount = case j.kind
      when 'charge_late_fees' then (select greatest(r.late_fees_charged - r.late_fees_collected, 0)
                                    from public.rentals r where r.id = j.rental_id)
      when 'transfer_payout' then (select p.net_amount + p.claim_compensation
                                   from public.payouts p where p.id = j.payout_id)
      when 'charge_claim' then (select greatest(coalesce(c.approved_amount, 0) - c.collected_amount, 0)
                                from public.claims c where c.id = j.claim_id)
      when 'authorize_hold' then (select r.deposit_amount from public.rentals r where r.id = j.rental_id)
      else j.amount end
   where j.state = 'queued' and j.amount is null and j.run_after <= now();

  return query
  with picked as (
    update public.payment_jobs j
       set state = 'running', attempts = j.attempts + 1, updated_at = now()
     where j.id in (
       select q.id from public.payment_jobs q
        where q.state = 'queued' and q.run_after <= now()
        order by q.run_after
        limit greatest(1, least(p_limit, 50))
        for update skip locked)
    returning j.*)
  select p.id, p.kind, p.rental_id, p.claim_id, p.payout_id, p.amount, p.idempotency_key, p.attempts,
         renter.stripe_customer_id, consent.provider_method_ref, owner.stripe_account_id,
         r.stripe_payment_intent_id, r.stripe_charge_id, r.hold_payment_intent_id,
         r.deposit_amount, r.hold_captured, po.net_amount, po.claim_compensation
    from picked p
    join public.rentals r on r.id = p.rental_id
    left join public.payment_accounts renter on renter.user_id = r.renter_id
    left join public.payment_accounts owner on owner.user_id = r.owner_id
    left join public.payouts po on po.rental_id = r.id
    left join lateral (
      select pc.provider_method_ref from public.payment_consents pc
       where pc.rental_id = r.id and pc.provider_method_ref is not null and pc.revoked_at is null
       order by pc.granted_at desc limit 1) consent on true;
end;
$$;

-- The worker moved money. Record what happened, in the database's terms.
create function public.complete_payment_job(p_job bigint, p_ref text, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.payment_jobs%rowtype;
  r public.rentals%rowtype;
  moved numeric := coalesce(p_amount, 0);
begin
  select * into j from public.payment_jobs where id = p_job for update;
  if not found or j.state <> 'running' then
    raise exception 'Job not running';
  end if;
  update public.payment_jobs
     set state = 'done', provider_ref = p_ref, last_error = null, updated_at = now()
   where id = j.id;
  select * into r from public.rentals where id = j.rental_id for update;

  if j.kind = 'authorize_hold' then
    update public.rentals set hold_status = 'authorized', hold_payment_intent_id = p_ref where id = r.id;
  elsif j.kind = 'release_hold' then
    update public.rentals set hold_status = 'released' where id = r.id;
  elsif j.kind = 'charge_late_fees' then
    update public.rentals set late_fees_collected = late_fees_collected + moved where id = r.id;
  elsif j.kind = 'charge_claim' then
    update public.claims set collected_amount = collected_amount + moved where id = j.claim_id;
    update public.payouts set claim_compensation = claim_compensation + moved where rental_id = r.id;
    -- Whatever part of the hold was not captured is released by Stripe.
    if r.hold_status = 'authorized' then
      update public.rentals set hold_status = 'captured',
             hold_captured = least(r.deposit_amount, moved) where id = r.id;
    end if;
    perform public.notify(r.owner_id, 'claim_paid', r.id, j.claim_id, jsonb_build_object('amount', moved));
  elsif j.kind = 'transfer_payout' then
    update public.payouts
       set state = 'paid', provider_transfer_id = p_ref, paid_at = now(), hold_reason = null
     where id = j.payout_id;
    perform public.notify(r.owner_id, 'payout_sent', r.id, null, jsonb_build_object('amount', moved));
  elsif j.kind = 'refund_rental' then
    update public.rentals set payment_status = 'refunded', status = 'cancelled' where id = r.id;
    update public.payouts set state = 'cancelled', hold_reason = 'refunded' where rental_id = r.id;
    perform public.notify(r.renter_id, 'refunded', r.id, null, jsonb_build_object('amount', moved));
  end if;

  perform public.audit(null, 'system', 'payment_jobs', j.id::text, 'done.' || j.kind,
    null, jsonb_build_object('rental', r.id, 'ref', p_ref, 'amount', moved));
end;
$$;

-- The worker could not move money. Retry with backoff, or give up and flag.
create function public.fail_payment_job(p_job bigint, p_error text, p_retryable boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.payment_jobs%rowtype;
  r public.rentals%rowtype;
  max_attempts integer := public.policy_num('payment_job_max_attempts', 12)::integer;
begin
  select * into j from public.payment_jobs where id = p_job for update;
  if not found or j.state <> 'running' then
    raise exception 'Job not running';
  end if;

  if p_retryable and j.attempts < max_attempts then
    update public.payment_jobs
       set state = 'queued', last_error = left(p_error, 500), updated_at = now(),
           run_after = now() + least(make_interval(mins => power(2, j.attempts)::integer), interval '12 hours')
     where id = j.id;
    return;
  end if;

  update public.payment_jobs set state = 'failed', last_error = left(p_error, 500), updated_at = now()
   where id = j.id;
  select * into r from public.rentals where id = j.rental_id;

  if j.kind = 'authorize_hold' then
    update public.rentals set hold_status = 'failed', flagged = coalesce(flagged, 'hold_failed') where id = r.id;
  elsif j.kind in ('charge_late_fees', 'charge_claim') then
    update public.rentals set flagged = coalesce(flagged, 'charge_failed') where id = r.id;
    perform public.notify(r.renter_id, 'charge_failed', r.id, j.claim_id, '{}');
  elsif j.kind = 'transfer_payout' then
    update public.payouts set state = 'on_hold', hold_reason = 'transfer_failed' where id = j.payout_id;
  end if;

  perform public.audit(null, 'system', 'payment_jobs', j.id::text, 'failed.' || j.kind,
    null, jsonb_build_object('rental', r.id, 'error', left(p_error, 500)));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. Stripe bookkeeping (called by Edge Functions with the service role)
-- ─────────────────────────────────────────────────────────────
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- True the first time an event id is seen; Stripe retries deliveries.
create function public.record_stripe_event(p_id text, p_type text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.stripe_events (id, type) values (p_id, p_type);
  return true;
exception when unique_violation then
  return false;
end;
$$;

create function public.set_payment_account(
  p_user uuid, p_customer text default null, p_account text default null, p_identity_session text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.payment_accounts (user_id, stripe_customer_id, stripe_account_id, identity_session_id)
  values (p_user, p_customer, p_account, p_identity_session)
  on conflict (user_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.payment_accounts.stripe_customer_id),
    stripe_account_id = coalesce(excluded.stripe_account_id, public.payment_accounts.stripe_account_id),
    identity_session_id = coalesce(excluded.identity_session_id, public.payment_accounts.identity_session_id),
    updated_at = now();
$$;

create function public.set_rental_payment_intent(p_rental uuid, p_intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.rentals set stripe_payment_intent_id = p_intent where id = p_rental;
$$;

create function public.stripe_rental_payment_event(
  p_rental uuid, p_intent text, p_event text,
  p_customer text default null, p_method text default null, p_charge text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rentals%rowtype;
begin
  select * into r from public.rentals where id = p_rental for update;
  if not found or r.stripe_payment_intent_id is distinct from p_intent then
    raise exception 'Payment does not match the rental';
  end if;

  if p_event = 'succeeded' then
    if r.payment_status = 'paid' then
      return;
    end if;
    update public.rentals set payment_status = 'paid', stripe_charge_id = p_charge where id = r.id;
    update public.payment_consents
       set provider = 'stripe', provider_customer_ref = p_customer, provider_method_ref = p_method
     where rental_id = r.id and revoked_at is null;
    if r.status = 'cancelled' then
      -- Paid after the booking had expired and its dates were released.
      perform public.enqueue_payment_job('refund_rental', r.id, 'refund-late-' || r.id::text);
    else
      perform public.notify(r.owner_id, 'booking_confirmed', r.id, null,
        jsonb_build_object('start', r.start_date, 'end', r.end_date));
      perform public.notify(r.renter_id, 'payment_received', r.id, null,
        jsonb_build_object('amount', r.total_charged));
    end if;
  elsif p_event = 'processing' then
    if r.payment_status in ('unpaid', 'failed') then
      update public.rentals set payment_status = 'processing' where id = r.id;
    end if;
  elsif p_event = 'failed' then
    if r.payment_status in ('unpaid', 'processing') then
      update public.rentals set payment_status = 'failed' where id = r.id;
    end if;
  else
    raise exception 'Unknown payment event';
  end if;
  perform public.audit(null, 'system', 'rentals', r.id::text, 'payment.' || p_event,
    jsonb_build_object('payment_status', r.payment_status), jsonb_build_object('intent', p_intent));
end;
$$;

create function public.stripe_account_updated(p_account text, p_payouts_enabled boolean, p_details_submitted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  p record;
begin
  update public.payment_accounts
     set payouts_enabled = p_payouts_enabled, details_submitted = p_details_submitted, updated_at = now()
   where stripe_account_id = p_account
  returning user_id into v_owner;
  if v_owner is null or not p_payouts_enabled then
    return;
  end if;
  -- Payouts that were waiting for this member to finish setting up.
  for p in select * from public.payouts
            where owner_id = v_owner and state = 'on_hold' and hold_reason = 'owner_payout_setup_required'
  loop
    update public.payouts set state = 'released', hold_reason = null, released_at = now() where id = p.id;
    perform public.enqueue_payment_job('transfer_payout', p.rental_id, 'payout-' || p.id::text, null, p.id);
  end loop;
end;
$$;

create function public.stripe_identity_updated(p_user uuid, p_status text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set identity_status = case p_status
       when 'verified' then 'verified'
       when 'processing' then 'pending'
       when 'requires_input' then 'rejected'
       else identity_status end
   where id = p_user
     -- A verified member is never downgraded by a stale event.
     and identity_status <> 'verified';
$$;

create function public.stripe_flag_payment(p_intent text, p_flag text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rentals%rowtype;
begin
  select * into r from public.rentals
   where stripe_payment_intent_id = p_intent or hold_payment_intent_id = p_intent;
  if not found then
    return;
  end if;
  update public.rentals set flagged = p_flag where id = r.id;
  update public.payouts set state = 'on_hold', hold_reason = p_flag
   where rental_id = r.id and state in ('pending', 'scheduled', 'released');
  perform public.audit(null, 'system', 'rentals', r.id::text, 'flag.' || p_flag, null,
    jsonb_build_object('intent', p_intent));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. Possession: fixed, and gated on payment
-- ─────────────────────────────────────────────────────────────
create or replace function public.confirm_possession(
  p_rental uuid,
  p_kind text,
  p_code text,
  p_method text default 'pin'
)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rentals%rowtype;
  pc public.possession_codes%rowtype;
  uid uuid := auth.uid();
  evidence integer;
begin
  if uid is null then
    raise exception 'Sign in to confirm';
  end if;
  if p_kind not in ('handover', 'return') then
    raise exception 'Unknown step';
  end if;

  select * into r from public.rentals where id = p_rental for update;
  if not found or (r.renter_id <> uid and r.owner_id <> uid) then
    raise exception 'Rental not found';
  end if;

  select * into pc from public.possession_codes
  where rental_id = p_rental and kind = p_kind;
  if not found or pc.confirm_by <> uid then
    raise exception 'Only the other party can confirm this step';
  end if;
  if pc.used_at is not null then
    raise exception 'Already confirmed';
  end if;
  if pc.code <> regexp_replace(coalesce(p_code, ''), '\s', '', 'g') then
    raise exception 'Wrong code';
  end if;

  if p_kind = 'handover' then
    if r.status <> 'booked' then
      raise exception 'Rental not awaiting handover';
    end if;
    -- Nothing changes hands before the money is in.
    if r.payment_status <> 'paid' then
      raise exception 'Rental not paid';
    end if;
    select count(*)::integer into evidence
    from public.condition_reports
    where rental_id = p_rental and phase = 'pre_handover';
    if evidence = 0 then
      raise exception 'Condition photos are required before handover';
    end if;

    update public.rentals set
      handover_confirmed_at = now(),
      -- The clock starts here, not at booking.
      return_due_at = now() + (r.days || ' days')::interval,
      status = 'in_progress',
      hold_status = case when r.deposit_required and r.deposit_amount > 0 then 'pending' else hold_status end
    where id = p_rental returning * into r;

    -- A risk-triggered hold is authorised now, for the length of the rental.
    if r.deposit_required and r.deposit_amount > 0 then
      perform public.enqueue_payment_job('authorize_hold', r.id, 'hold-' || r.id::text);
    end if;
  else
    if r.handover_confirmed_at is null then
      raise exception 'Confirm the handover first';
    end if;
    if r.status not in ('in_progress', 'due', 'late', 'non_return_review') then
      raise exception 'Rental not in progress';
    end if;
    update public.rentals set
      return_confirmed_at = now(),
      claim_window_ends_at = now() + (r.claim_window_hours || ' hours')::interval,
      status = 'returned'
    where id = p_rental returning * into r;

    update public.payouts set
      state = 'scheduled',
      release_after = r.claim_window_ends_at,
      hold_reason = 'claim_window'
    where rental_id = p_rental and state = 'pending';

    if r.late_fees_charged > r.late_fees_collected then
      perform public.enqueue_payment_job('charge_late_fees', r.id, 'late-return-' || r.id::text);
    end if;
    perform public.notify(r.owner_id, 'claim_window_open', r.id, null,
      jsonb_build_object('until', r.claim_window_ends_at));
  end if;

  update public.possession_codes set used_at = now()
  where rental_id = p_rental and kind = p_kind;

  insert into public.possession_events (rental_id, kind, method, confirmed_by)
  values (p_rental, p_kind, coalesce(p_method, 'pin'), uid);

  perform public.audit(uid, 'member', 'rentals', p_rental::text, 'confirm_' || p_kind, null, to_jsonb(r));
  return r;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. Claims tell the renter
-- ─────────────────────────────────────────────────────────────
create function public.claims_notify_renter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(new.renter_id, 'claim_opened', new.rental_id, new.id,
    jsonb_build_object('amount', new.requested_amount));
  return null;
end;
$$;

create trigger claims_notify_renter
  after insert on public.claims
  for each row execute function public.claims_notify_renter();

-- ─────────────────────────────────────────────────────────────
-- 10. Lifecycle tick: expiry, reminders, late fees, holds, payouts
-- ─────────────────────────────────────────────────────────────
create or replace function public.rental_lifecycle_tick()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched integer := 0;
  r record;
  p record;
  days_over numeric;
  accrued numeric;
  next_status text;
  remind interval := make_interval(hours => public.policy_num('return_reminder_hours', 24)::integer);
begin
  -- a) Unpaid bookings give their dates back.
  for r in
    select * from public.rentals
     where status = 'booked' and payment_status in ('unpaid', 'failed') and payment_due_by < now()
     for update skip locked
  loop
    update public.rentals set status = 'cancelled', payment_status = 'expired' where id = r.id;
    update public.payouts set state = 'cancelled', hold_reason = 'unpaid' where rental_id = r.id;
    perform public.notify(r.renter_id, 'payment_expired', r.id);
    touched := touched + 1;
  end loop;

  -- b) The day before: a reminder.
  for r in
    select * from public.rentals
     where status = 'in_progress' and return_due_at > now() and return_due_at <= now() + remind
  loop
    perform public.notify(r.renter_id, 'return_due_soon', r.id, null,
      jsonb_build_object('due', r.return_due_at));
  end loop;

  -- c) Due, late, non-return. Fees stop at the snapshotted cap.
  for r in
    select * from public.rentals
     where status in ('in_progress', 'due', 'late') and return_due_at is not null
  loop
    days_over := extract(epoch from (now() - r.return_due_at)) / 86400.0;

    if days_over <= 0 then
      if r.status <> 'in_progress' then
        update public.rentals set status = 'in_progress' where id = r.id;
      end if;
    elsif days_over * 24 <= r.grace_period_hours then
      if r.status <> 'due' then
        update public.rentals set status = 'due' where id = r.id;
        perform public.notify(r.renter_id, 'return_overdue', r.id, null,
          jsonb_build_object('grace_hours', r.grace_period_hours, 'per_day', r.late_fee_per_day));
        touched := touched + 1;
      end if;
    else
      accrued := least(round(floor(days_over) * r.late_fee_per_day, 2), r.late_fee_cap);
      next_status := case when days_over >= r.non_return_review_days then 'non_return_review' else 'late' end;
      update public.rentals set status = next_status, late_fees_charged = accrued where id = r.id;
      if r.status <> 'late' and next_status = 'late' then
        perform public.notify(r.renter_id, 'late_fees_started', r.id, null,
          jsonb_build_object('per_day', r.late_fee_per_day, 'cap', r.late_fee_cap));
      end if;
      if next_status = 'non_return_review' then
        perform public.notify(r.renter_id, 'non_return_review', r.id);
        perform public.notify(r.owner_id, 'non_return_review', r.id);
        perform public.enqueue_payment_job('charge_late_fees', r.id, 'late-nonreturn-' || r.id::text);
      end if;
      touched := touched + 1;
    end if;
  end loop;

  -- d) Claim window over, nothing open: release the hold, pay the owner.
  for r in
    select * from public.rentals x
     where x.status = 'returned' and x.claim_window_ends_at <= now()
       and x.hold_status = 'authorized'
       -- Keep it while a claim is undecided, or decided but not yet collected.
       and not exists (select 1 from public.claims c where c.rental_id = x.id
                        and (c.status in ('submitted', 'renter_responding', 'under_review', 'appealed')
                             or (c.status in ('approved', 'partially_approved')
                                 and coalesce(c.approved_amount, 0) > c.collected_amount)))
  loop
    perform public.enqueue_payment_job('release_hold', r.id, 'release-hold-' || r.id::text);
  end loop;

  for p in
    select po.*, pa.payouts_enabled
      from public.payouts po
      join public.rentals x on x.id = po.rental_id
      left join public.payment_accounts pa on pa.user_id = po.owner_id
     where po.state = 'scheduled' and po.release_after <= now()
       and x.payment_status = 'paid' and x.flagged is null
       and not exists (select 1 from public.claims c where c.rental_id = po.rental_id
                        and c.status in ('submitted', 'renter_responding', 'under_review', 'appealed'))
       and not exists (select 1 from public.payment_jobs j where j.rental_id = po.rental_id
                        and j.kind = 'charge_claim' and j.state in ('queued', 'running'))
     for update of po skip locked
  loop
    if coalesce(p.payouts_enabled, false) then
      update public.payouts set state = 'released', released_at = now(), hold_reason = null where id = p.id;
      perform public.enqueue_payment_job('transfer_payout', p.rental_id, 'payout-' || p.id::text, null, p.id);
    else
      update public.payouts set state = 'on_hold', hold_reason = 'owner_payout_setup_required' where id = p.id;
      perform public.notify(p.owner_id, 'payout_setup_required', p.rental_id);
    end if;
    touched := touched + 1;
  end loop;

  -- e) Settled rentals close.
  update public.rentals x set status = 'closed'
   where x.status = 'returned' and x.claim_window_ends_at <= now()
     and x.hold_status in ('none', 'released', 'captured', 'failed')
     and exists (select 1 from public.payouts po where po.rental_id = x.id and po.state in ('paid', 'cancelled'))
     and not exists (select 1 from public.payment_jobs j where j.rental_id = x.id and j.state in ('queued', 'running'));

  return touched;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 11. Who may call what
-- ─────────────────────────────────────────────────────────────
revoke execute on function public.rentals_validate_dates() from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.enqueue_payment_job(text, uuid, text, uuid, uuid, numeric) from public, anon, authenticated;
revoke execute on function public.claim_payment_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_payment_job(bigint, text, numeric) from public, anon, authenticated;
revoke execute on function public.fail_payment_job(bigint, text, boolean) from public, anon, authenticated;
revoke execute on function public.record_stripe_event(text, text) from public, anon, authenticated;
revoke execute on function public.set_payment_account(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.set_rental_payment_intent(uuid, text) from public, anon, authenticated;
revoke execute on function public.stripe_rental_payment_event(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.stripe_account_updated(text, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.stripe_identity_updated(uuid, text) from public, anon, authenticated;
revoke execute on function public.stripe_flag_payment(text, text) from public, anon, authenticated;
revoke execute on function public.claims_notify_renter() from public, anon, authenticated;
revoke execute on function public.rental_lifecycle_tick() from public, anon, authenticated;
revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;
revoke execute on function public.mark_notification_email(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
grant execute on function public.mark_notification_email(uuid, text) to service_role;
revoke execute on function public.confirm_possession(uuid, text, text, text) from public, anon;
grant execute on function public.confirm_possession(uuid, text, text, text) to authenticated;

grant execute on function public.claim_payment_jobs(integer) to service_role;
grant execute on function public.complete_payment_job(bigint, text, numeric) to service_role;
grant execute on function public.fail_payment_job(bigint, text, boolean) to service_role;
grant execute on function public.record_stripe_event(text, text) to service_role;
grant execute on function public.set_payment_account(uuid, text, text, text) to service_role;
grant execute on function public.set_rental_payment_intent(uuid, text) to service_role;
grant execute on function public.stripe_rental_payment_event(uuid, text, text, text, text, text) to service_role;
grant execute on function public.stripe_account_updated(text, boolean, boolean) to service_role;
grant execute on function public.stripe_identity_updated(uuid, text) to service_role;
grant execute on function public.stripe_flag_payment(text, text) to service_role;
grant execute on function public.rental_lifecycle_tick() to service_role;
