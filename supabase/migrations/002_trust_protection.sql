-- Rota — Trust & Protection strategy (P0).
-- Run once in Supabase → SQL Editor → New query → Run, after 001_listing_sizes.sql.
--
-- What this migration does, in one breath:
--   · every listing gets an Approved Replacement Value (ARV) that Rota owns —
--     the owner may only *suggest* one;
--   · rentals become real rows that snapshot the money, the approved value and
--     the policy text the renter consented to at checkout;
--   · blanket deposits are gone: a hold exists only when a RiskDecision asks
--     for one (high value, or a brand-new renter above the first-rental cap);
--   · possession (handover / return) is confirmed with a one-time code, and the
--     return deadline runs from the confirmed handover, not from booking;
--   · claims are owner-submitted, renter-answerable and Rota-decided, capped by
--     the snapshotted max liability;
--   · owner payouts are held until confirmed return + the claim window;
--   · every business number lives in public.policy_config, not in code.
--
-- Money is numeric(10,2) in EUR. The app's m() prints €.

-- ─────────────────────────────────────────────────────────────
-- Policy configuration. These are PROPOSED business defaults, not
-- legal advice: counsel and the payment provider must review them
-- before launch. Change them here (or from an admin tool) — never
-- in the app bundle.
-- ─────────────────────────────────────────────────────────────
create table public.policy_config (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);

insert into public.policy_config (key, value, note) values
  ('policy_version', '"2026-09-p0"', 'Stamped onto every rental snapshot.'),
  ('consent_version', '"2026-09-p0"', 'Version of the saved-payment consent text.'),
  ('renter_service_rate', '0.10', 'Renter surcharge on the rent.'),
  ('owner_service_rate', '0.10', 'Deducted from the owner payout.'),
  ('shipping_fee', '9', 'Round-trip prepaid label.'),
  ('first_rental_arv_cap', '150', 'A first-time renter above this triggers a hold.'),
  ('high_value_cap', '900', 'Launch ceiling for an approved value (750–1000 band).'),
  ('high_value_hold_threshold', '400', 'Approved value above which a hold is asked for.'),
  ('hold_rate', '0.20', 'Hold = approved value × this, capped below.'),
  ('hold_max', '250', 'No hold is ever larger than this.'),
  ('grace_period_hours', '24', 'After the return deadline, before "late".'),
  ('late_fee_per_day_rate', '0.15', 'Daily late fee as a share of the daily rent.'),
  ('late_fee_min_per_day', '5', 'Floor for the daily late fee.'),
  ('late_fee_cap_rate', '0.50', 'Late fees stop at this share of the approved value.'),
  ('late_fee_cap_max', '150', 'Absolute ceiling on accumulated late fees.'),
  ('non_return_review_days', '7', 'Days overdue before a non-return review opens.'),
  ('owner_claim_window_hours', '24', 'Window to open a claim after confirmed return.'),
  ('trusted_owner_clean_rentals', '5', 'Clean rentals before faster payouts (P1).'),
  ('flag_id_step_up', 'false', 'P1 — identity step-up for elevated risk.'),
  ('flag_trust_tiers', 'false', 'P1 — full trust-tier system.'),
  ('flag_risk_scoring', 'false', 'P1 — behavioural risk scoring.')
on conflict (key) do nothing;

alter table public.policy_config enable row level security;

-- Readable before sign-in too: the app shows these numbers to renters anyway,
-- and the onboarding screens load before a session exists. Nothing secret is
-- in here — only business thresholds we disclose at checkout.
create policy "Policy numbers are readable"
  on public.policy_config for select to anon, authenticated using (true);

-- No insert/update/delete grants: only the service role changes policy.
revoke insert, update, delete on public.policy_config from anon, authenticated;

create function public.policy_num(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (value #>> '{}')::numeric from public.policy_config where key = p_key),
    p_default);
$$;

create function public.policy_text(p_key text, p_default text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select value #>> '{}' from public.policy_config where key = p_key),
    p_default);
$$;

grant execute on function public.policy_num(text, numeric) to authenticated;
grant execute on function public.policy_text(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Approved Replacement Value on the listing.
-- retail_value stays what it always was: what the owner typed.
-- suggested_value is the owner's suggestion for the ARV.
-- approved_value is Rota's number — members can never write it.
-- ─────────────────────────────────────────────────────────────
alter table public.listings
  add column if not exists suggested_value integer check (suggested_value >= 0),
  add column if not exists approved_value integer check (approved_value >= 0),
  add column if not exists approved_value_at timestamptz,
  add column if not exists approved_value_source text not null default 'auto'
    check (approved_value_source in ('auto', 'review', 'owner_suggested')),
  add column if not exists value_status text not null default 'auto'
    check (value_status in ('auto', 'pending_review', 'approved', 'rejected'));

-- The owner may suggest; only the service role may approve.
grant insert (suggested_value), update (suggested_value) on public.listings to authenticated;

-- A listing always has an approved value so nothing books without a liability
-- cap. Auto value = the owner's number, clamped to the launch high-value cap;
-- anything that hits the clamp is queued for a human review.
create function public.listing_auto_approved_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap numeric := public.policy_num('high_value_cap', 900);
  asked numeric := coalesce(new.suggested_value, new.retail_value, 0);
begin
  if tg_op = 'UPDATE' and new.approved_value is distinct from old.approved_value then
    -- A real approval decision (service role) wins; just stamp it.
    new.approved_value_at := now();
    return new;
  end if;
  if tg_op = 'UPDATE' and old.value_status = 'approved' then
    -- A value a human approved is not re-derived because the owner edited
    -- their suggestion; that goes back through review instead.
    new.approved_value := old.approved_value;
    new.approved_value_source := old.approved_value_source;
    new.value_status := case when asked <> coalesce(old.suggested_value, old.retail_value, 0)
                             then 'pending_review' else old.value_status end;
    return new;
  end if;
  new.approved_value := least(greatest(asked, 0), cap);
  new.approved_value_at := now();
  new.approved_value_source := 'auto';
  new.value_status := case when asked > cap then 'pending_review' else 'auto' end;
  return new;
end;
$$;

create trigger listings_auto_approved_value
  before insert or update of suggested_value, retail_value, approved_value
  on public.listings
  for each row execute function public.listing_auto_approved_value();

-- Backfill: existing rows get an approved value from what the owner already typed.
update public.listings set suggested_value = retail_value where suggested_value is null;

-- ─────────────────────────────────────────────────────────────
-- Rentals. Everything money- or liability-shaped is a snapshot: a
-- later edit to the listing must never change what the renter agreed to.
-- ─────────────────────────────────────────────────────────────
create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,

  status text not null default 'booked' check (status in (
    'booked', 'in_progress', 'due', 'late', 'non_return_review',
    'returned', 'closed', 'cancelled')),

  start_date date not null,
  end_date date not null,
  days integer not null check (days >= 1),
  delivery text not null check (delivery in ('ship', 'meet')),

  -- Money snapshot (EUR).
  price_per_day numeric(10,2) not null,
  rent_amount numeric(10,2) not null,
  renter_service_fee numeric(10,2) not null,
  owner_service_fee numeric(10,2) not null,
  shipping_fee numeric(10,2) not null default 0,
  cleaning_fee numeric(10,2) not null default 0,
  total_charged numeric(10,2) not null,
  owner_payout_amount numeric(10,2) not null,

  -- Liability snapshot. max_liability is the ceiling for every later
  -- damage / non-return charge on this rental, for ever.
  approved_value numeric(10,2) not null check (approved_value >= 0),
  max_liability numeric(10,2) not null check (max_liability >= 0),

  -- Deposit / hold: false for a normal rental. Only a RiskDecision turns it on.
  deposit_required boolean not null default false,
  deposit_amount numeric(10,2) not null default 0,

  -- Late-fee schedule, snapshotted so a policy change cannot rewrite history.
  late_fee_per_day numeric(10,2) not null default 0,
  late_fee_cap numeric(10,2) not null default 0,
  late_fees_charged numeric(10,2) not null default 0,

  grace_period_hours integer not null default 24,
  claim_window_hours integer not null default 24,
  non_return_review_days integer not null default 7,

  policy_version text not null,
  consent_version text not null,
  consent_text text not null,
  consented_at timestamptz not null default now(),

  -- The clock starts at the CONFIRMED handover, not at booking.
  handover_confirmed_at timestamptz,
  return_due_at timestamptz,
  return_confirmed_at timestamptz,
  claim_window_ends_at timestamptz,

  created_at timestamptz not null default now(),
  constraint liability_within_approved_value check (max_liability <= approved_value),
  constraint deposit_only_when_required check (deposit_required or deposit_amount = 0)
);

create index rentals_renter_idx on public.rentals (renter_id, created_at desc);
create index rentals_owner_idx on public.rentals (owner_id, created_at desc);
create index rentals_due_idx on public.rentals (status, return_due_at);

-- ─────────────────────────────────────────────────────────────
-- Risk decisions: why a hold was (or was not) asked for.
-- ─────────────────────────────────────────────────────────────
create table public.risk_decisions (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  subject_id uuid not null references public.profiles (id) on delete cascade,
  decision text not null check (decision in ('none', 'hold_required', 'id_step_up', 'blocked')),
  reason text not null,
  hold_amount numeric(10,2) not null default 0,
  policy_version text not null,
  decided_by text not null default 'auto' check (decided_by in ('auto', 'rota')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Condition evidence. Deliberately tiny: a handful of photos and a
-- timestamp, not an inspection form.
-- ─────────────────────────────────────────────────────────────
create table public.condition_reports (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  phase text not null check (phase in ('pre_handover', 'post_return')),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) between 1 and 8),
  note text check (char_length(note) <= 500),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index condition_reports_rental_idx on public.condition_reports (rental_id, phase);

-- ─────────────────────────────────────────────────────────────
-- Possession: the one-time codes and the confirmed events.
-- The code lives in its own table so only the person who must SHOW it
-- can read it. The person who must TYPE it never sees the row.
-- ─────────────────────────────────────────────────────────────
create table public.possession_codes (
  rental_id uuid not null references public.rentals (id) on delete cascade,
  kind text not null check (kind in ('handover', 'return')),
  code text not null,
  show_to uuid not null references public.profiles (id) on delete cascade,
  confirm_by uuid not null references public.profiles (id) on delete cascade,
  used_at timestamptz,
  primary key (rental_id, kind)
);

create table public.possession_events (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  kind text not null check (kind in ('handover', 'return')),
  method text not null default 'pin' check (method in ('pin', 'qr')),
  confirmed_by uuid not null references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  unique (rental_id, kind)
);

-- ─────────────────────────────────────────────────────────────
-- Saved payment method consent. No provider is wired yet: the
-- provider_* columns are the seam a PSP (Stripe SetupIntent →
-- off-session PaymentIntent) fills in from the server.
-- ─────────────────────────────────────────────────────────────
create table public.payment_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rental_id uuid references public.rentals (id) on delete set null,
  method_label text,
  consent_text text not null,
  consent_version text not null,
  off_session boolean not null default true,
  provider text not null default 'none',
  provider_customer_ref text,
  provider_method_ref text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index payment_consents_user_idx on public.payment_consents (user_id, granted_at desc);

-- ─────────────────────────────────────────────────────────────
-- Claims. The owner submits and evidences; the renter answers;
-- Rota decides the approved amount. Owners never charge renters.
-- ─────────────────────────────────────────────────────────────
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('damage', 'cleaning', 'late', 'non_return', 'other')),
  description text not null check (char_length(description) between 10 and 2000),
  evidence_paths text[] not null default '{}' check (cardinality(evidence_paths) <= 8),
  requested_amount numeric(10,2) not null check (requested_amount >= 0),

  status text not null default 'submitted' check (status in (
    'submitted', 'renter_responding', 'under_review',
    'approved', 'partially_approved', 'denied', 'appealed', 'closed')),

  renter_response text check (char_length(renter_response) <= 2000),
  renter_responded_at timestamptz,

  -- Rota only.
  approved_amount numeric(10,2) check (approved_amount >= 0),
  decision_note text,
  decided_at timestamptz,

  appeal_note text check (char_length(appeal_note) <= 2000),
  appealed_at timestamptz,

  created_at timestamptz not null default now()
);

create index claims_rental_idx on public.claims (rental_id);

-- A claim can never ask for — or be granted — more than the liability the
-- renter saw when they booked. Belt and braces: this holds for the service
-- role too, so a mis-typed admin number cannot overcharge.
create function public.claims_respect_liability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap numeric;
  already numeric;
begin
  select r.max_liability, r.late_fees_charged into cap, already
  from public.rentals r where r.id = new.rental_id;
  if cap is null then
    raise exception 'Unknown rental';
  end if;
  -- Late fees already paid count toward the same exposure ceiling.
  cap := greatest(cap - coalesce(already, 0), 0);
  if new.requested_amount > cap then
    new.requested_amount := cap;
  end if;
  if new.approved_amount is not null and new.approved_amount > cap then
    new.approved_amount := cap;
  end if;
  return new;
end;
$$;

create trigger claims_cap_amounts
  before insert or update on public.claims
  for each row execute function public.claims_respect_liability();

-- ─────────────────────────────────────────────────────────────
-- Payouts. Nothing is released at booking or at handover: a payout
-- is scheduled at confirmed return and released after the claim window.
-- ─────────────────────────────────────────────────────────────
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rentals (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  gross_amount numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  claim_deductions numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null,
  state text not null default 'pending' check (state in (
    'pending', 'scheduled', 'on_hold', 'released', 'cancelled')),
  hold_reason text,
  release_after timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Audit log. Every override of a value, a claim amount, a payout or
-- an account status lands here. Written by the server only; not
-- readable through the API (no select policy for members).
-- ─────────────────────────────────────────────────────────────
create table public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null default 'system' check (actor_role in ('system', 'member', 'rota')),
  entity text not null,
  entity_id text,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);

create function public.audit(
  p_actor uuid, p_role text, p_entity text, p_entity_id text,
  p_action text, p_before jsonb, p_after jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_role, entity, entity_id, action, before, after)
  values (p_actor, p_role, p_entity, p_entity_id, p_action, p_before, p_after);
$$;

-- Approved value, claim decisions, payout state and account flags are
-- Rota decisions: log them whatever wrote them.
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.audit(
    auth.uid(),
    case when auth.uid() is null then 'system' else 'member' end,
    tg_table_name, new.id::text, tg_op,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new));
  return new;
end;
$$;

create trigger claims_audit
  after insert or update on public.claims
  for each row execute function public.audit_row_change();

create trigger payouts_audit
  after insert or update on public.payouts
  for each row execute function public.audit_row_change();

create trigger listings_value_audit
  after update of approved_value, value_status on public.listings
  for each row execute function public.audit_row_change();

create trigger profiles_status_audit
  after update of identity_status, certified on public.profiles
  for each row execute function public.audit_row_change();

create trigger risk_decisions_audit
  after insert on public.risk_decisions
  for each row execute function public.audit_row_change();

-- Money on a rental never moves after booking; status and accrued late fees do.
create trigger rentals_progress_audit
  after update of status, late_fees_charged on public.rentals
  for each row execute function public.audit_row_change();

-- ─────────────────────────────────────────────────────────────
-- Booking. The renter never writes the money or the liability cap:
-- this function computes the whole snapshot server-side from the
-- listing and the policy table, then hands the row back.
-- ─────────────────────────────────────────────────────────────
create function public.book_rental(
  p_listing uuid,
  p_start date,
  p_end date,
  p_delivery text,
  p_consent_text text,
  p_method_label text default null
)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
  r public.rentals%rowtype;
  uid uuid := auth.uid();
  v_days integer;
  v_rent numeric(10,2);
  v_renter_fee numeric(10,2);
  v_owner_fee numeric(10,2);
  v_ship numeric(10,2);
  v_clean numeric(10,2);
  v_approved numeric(10,2);
  v_liability numeric(10,2);
  v_hold numeric(10,2) := 0;
  v_hold_needed boolean := false;
  v_reason text := 'deposit_free_default';
  v_prior integer;
  v_policy text := public.policy_text('policy_version', '2026-09-p0');
  v_late_day numeric(10,2);
  v_late_cap numeric(10,2);
begin
  if uid is null then
    raise exception 'Sign in to book';
  end if;

  select * into l from public.listings where id = p_listing and status = 'active';
  if not found then
    raise exception 'Listing unavailable';
  end if;
  if l.owner_id = uid then
    raise exception 'You cannot rent your own piece';
  end if;
  if p_delivery not in ('ship', 'meet') then
    raise exception 'Unknown handover mode';
  end if;

  v_days := greatest(1, (p_end - p_start) + 1);
  v_rent := round(l.price_per_day::numeric * v_days, 2);
  v_renter_fee := round(v_rent * public.policy_num('renter_service_rate', 0.10), 2);
  v_owner_fee := round(v_rent * public.policy_num('owner_service_rate', 0.10), 2);
  v_ship := case when p_delivery = 'ship' then public.policy_num('shipping_fee', 9) else 0 end;
  v_clean := case when l.cleaning_by_lender then coalesce(l.cleaning_fee, 0) else 0 end;

  -- Liability is the approved value as it stands right now, frozen here.
  v_approved := least(
    coalesce(l.approved_value, 0)::numeric,
    public.policy_num('high_value_cap', 900));
  v_liability := v_approved;

  -- Deposit-free by default. A hold is a risk decision, not a rule.
  select count(*)::integer into v_prior
  from public.rentals
  where renter_id = uid and status in ('returned', 'closed');

  if v_approved > public.policy_num('high_value_hold_threshold', 400) then
    v_hold_needed := true;
    v_reason := 'high_value_item';
  elsif v_prior = 0 and v_approved > public.policy_num('first_rental_arv_cap', 150) then
    v_hold_needed := true;
    v_reason := 'first_rental_above_cap';
  end if;

  if v_hold_needed then
    v_hold := round(least(v_approved * public.policy_num('hold_rate', 0.20),
                          public.policy_num('hold_max', 250)), 2);
  end if;

  v_late_day := round(greatest(
    l.price_per_day::numeric * public.policy_num('late_fee_per_day_rate', 0.15),
    public.policy_num('late_fee_min_per_day', 5)), 2);
  v_late_cap := round(least(
    v_approved * public.policy_num('late_fee_cap_rate', 0.50),
    public.policy_num('late_fee_cap_max', 150)), 2);

  insert into public.rentals (
    listing_id, renter_id, owner_id, start_date, end_date, days, delivery,
    price_per_day, rent_amount, renter_service_fee, owner_service_fee,
    shipping_fee, cleaning_fee, total_charged, owner_payout_amount,
    approved_value, max_liability, deposit_required, deposit_amount,
    late_fee_per_day, late_fee_cap,
    grace_period_hours, claim_window_hours, non_return_review_days,
    policy_version, consent_version, consent_text)
  values (
    l.id, uid, l.owner_id, p_start, p_end, v_days, p_delivery,
    l.price_per_day, v_rent, v_renter_fee, v_owner_fee,
    v_ship, v_clean, round(v_rent + v_renter_fee + v_ship + v_clean, 2),
    round(v_rent - v_owner_fee, 2),
    v_approved, v_liability, v_hold_needed, v_hold,
    v_late_day, v_late_cap,
    public.policy_num('grace_period_hours', 24)::integer,
    public.policy_num('owner_claim_window_hours', 24)::integer,
    public.policy_num('non_return_review_days', 7)::integer,
    v_policy, public.policy_text('consent_version', '2026-09-p0'), p_consent_text)
  returning * into r;

  insert into public.risk_decisions (
    rental_id, listing_id, subject_id, decision, reason, hold_amount, policy_version)
  values (
    r.id, l.id, uid,
    case when v_hold_needed then 'hold_required' else 'none' end,
    v_reason, v_hold, v_policy);

  -- The owner shows the handover code, the renter types it (the renter is the
  -- one taking possession). At return it is the other way round.
  insert into public.possession_codes (rental_id, kind, code, show_to, confirm_by)
  values
    (r.id, 'handover', lpad((floor(random() * 1000000))::int::text, 6, '0'), l.owner_id, uid),
    (r.id, 'return', lpad((floor(random() * 1000000))::int::text, 6, '0'), uid, l.owner_id);

  insert into public.payment_consents (
    user_id, rental_id, method_label, consent_text, consent_version, off_session)
  values (uid, r.id, p_method_label, p_consent_text,
          public.policy_text('consent_version', '2026-09-p0'), true);

  -- Owner funds are parked from the start: nothing is released at booking.
  insert into public.payouts (
    rental_id, owner_id, gross_amount, platform_fee, net_amount, state, hold_reason)
  values (r.id, l.owner_id, v_rent, v_owner_fee, round(v_rent - v_owner_fee, 2),
          'pending', 'awaiting_confirmed_return');

  perform public.audit(uid, 'member', 'rentals', r.id::text, 'book', null, to_jsonb(r));
  return r;
end;
$$;

grant execute on function public.book_rental(uuid, date, date, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Possession confirmation. Only the counterparty can confirm, and
-- only with the code. The handover also starts the rental clock.
-- ─────────────────────────────────────────────────────────────
create function public.confirm_possession(
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
      status = 'in_progress'
    where id = p_rental returning * into r;
  else
    if r.handover_confirmed_at is null then
      raise exception 'Confirm the handover first';
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
  end if;

  update public.possession_codes set used_at = now()
  where rental_id = p_rental and kind = p_kind;

  insert into public.possession_events (rental_id, kind, method, confirmed_by)
  values (p_rental, p_kind, coalesce(p_method, 'pin'), uid);

  perform public.audit(uid, 'member', 'rentals', p_rental, 'confirm_' || p_kind, null, to_jsonb(r));
  return r;
end;
$$;

grant execute on function public.confirm_possession(uuid, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Lifecycle tick — the seam for the reminder / late / non-return
-- automation. NOTHING SCHEDULES THIS YET. Wire it to pg_cron (or an
-- Edge Function) once the notification transport exists:
--   select cron.schedule('rota-rentals', '*/15 * * * *',
--                        $$select public.rental_lifecycle_tick()$$);
-- Late fees are accrued here, tiered by the daily rate and stopped at
-- the snapshotted cap — they never run away.
-- ─────────────────────────────────────────────────────────────
create function public.rental_lifecycle_tick()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched integer := 0;
  r record;
  days_over numeric;
  accrued numeric;
begin
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
      -- Grace period: reminded, not yet late, no fee.
      if r.status <> 'due' then
        update public.rentals set status = 'due' where id = r.id;
        touched := touched + 1;
      end if;
    else
      accrued := least(round(floor(days_over) * r.late_fee_per_day, 2), r.late_fee_cap);
      update public.rentals set
        status = case when days_over >= r.non_return_review_days
                      then 'non_return_review' else 'late' end,
        late_fees_charged = accrued
      where id = r.id;
      touched := touched + 1;
    end if;
  end loop;

  -- Release owner funds only after the claim window closed with no open claim.
  update public.payouts p set state = 'released', released_at = now(), hold_reason = null
  where p.state = 'scheduled'
    and p.release_after is not null
    and p.release_after <= now()
    and not exists (
      select 1 from public.claims c
      where c.rental_id = p.rental_id
        and c.status not in ('denied', 'closed'));

  return touched;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.rentals enable row level security;
alter table public.risk_decisions enable row level security;
alter table public.condition_reports enable row level security;
alter table public.possession_codes enable row level security;
alter table public.possession_events enable row level security;
alter table public.payment_consents enable row level security;
alter table public.claims enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_log enable row level security;

create policy "Members see their own rentals"
  on public.rentals for select to authenticated
  using (renter_id = (select auth.uid()) or owner_id = (select auth.uid()));

-- Rentals are only ever created and moved by the functions above.
revoke insert, update, delete on public.rentals from authenticated;

create policy "Members see risk decisions about themselves"
  on public.risk_decisions for select to authenticated
  using (subject_id = (select auth.uid()));

revoke insert, update, delete on public.risk_decisions from authenticated;

create policy "Both parties read the condition evidence"
  on public.condition_reports for select to authenticated
  using (exists (
    select 1 from public.rentals r
    where r.id = rental_id
      and ((select auth.uid()) in (r.renter_id, r.owner_id))));

create policy "Parties add their own condition evidence"
  on public.condition_reports for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and ((select auth.uid()) in (r.renter_id, r.owner_id))));

revoke insert, update, delete on public.condition_reports from authenticated;
grant insert (rental_id, author_id, phase, photo_paths, note, captured_at)
  on public.condition_reports to authenticated;

-- Only the person who must SHOW the code can read it.
create policy "The code is visible to the party who shows it"
  on public.possession_codes for select to authenticated
  using (show_to = (select auth.uid()));

revoke insert, update, delete on public.possession_codes from authenticated;

create policy "Both parties read the possession events"
  on public.possession_events for select to authenticated
  using (exists (
    select 1 from public.rentals r
    where r.id = rental_id
      and ((select auth.uid()) in (r.renter_id, r.owner_id))));

revoke insert, update, delete on public.possession_events from authenticated;

create policy "Members read their own payment consents"
  on public.payment_consents for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members record their own consent"
  on public.payment_consents for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke insert, update, delete on public.payment_consents from authenticated;
-- The provider_* columns are filled in by the server, never by the app.
grant insert (user_id, rental_id, method_label, consent_text, consent_version, off_session)
  on public.payment_consents to authenticated;

create policy "Both parties read the claim"
  on public.claims for select to authenticated
  using ((select auth.uid()) in (owner_id, renter_id));

create policy "Owners open a claim on their own returned rental"
  on public.claims for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_id = (select auth.uid())
        and r.renter_id = claims.renter_id
        and r.return_confirmed_at is not null
        and (r.claim_window_ends_at is null or r.claim_window_ends_at >= now())));

create policy "Renters answer a claim against them"
  on public.claims for update to authenticated
  using (renter_id = (select auth.uid()))
  with check (renter_id = (select auth.uid()));

revoke insert, update, delete on public.claims from authenticated;
-- status, approved_amount, decision_note and decided_at are Rota's alone.
grant insert (rental_id, owner_id, renter_id, category, description, evidence_paths, requested_amount)
  on public.claims to authenticated;
grant update (renter_response, renter_responded_at, appeal_note, appealed_at)
  on public.claims to authenticated;

create policy "Owners read their own payouts"
  on public.payouts for select to authenticated
  using (owner_id = (select auth.uid()));

revoke insert, update, delete on public.payouts from authenticated;

-- audit_log: no policy for members at all — service role only.
revoke all on public.audit_log from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Evidence storage. Private bucket; a file lives at
-- rental-evidence/<uploader uid>/<rental id>/<file>, so both parties
-- of that rental can read it and nobody else can.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rental-evidence', 'rental-evidence', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "Parties upload rental evidence in their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'rental-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.rentals r
      where r.id::text = (storage.foldername(name))[2]
        and ((select auth.uid()) in (r.renter_id, r.owner_id))));

create policy "Parties read the evidence of their own rental"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'rental-evidence'
    and exists (
      select 1 from public.rentals r
      where r.id::text = (storage.foldername(name))[2]
        and ((select auth.uid()) in (r.renter_id, r.owner_id))));
