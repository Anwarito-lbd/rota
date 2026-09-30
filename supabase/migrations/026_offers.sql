-- ═════════════════════════════════════════════════════════════
-- Rota — 026 Offers the server honours
--
-- A renter proposes a price per day for a piece; the lender accepts or
-- declines within 12 hours; an accepted offer can be booked at that price for
-- 48 hours, once. The price is always taken from the offer row here, never
-- from the app. The conversation shows the offer as a message (kinds 'offer'
-- and 'offer_answer'), but only this table decides.
-- ═════════════════════════════════════════════════════════════

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  per_day numeric(10,2) not null check (per_day > 0),
  days integer not null check (days between 1 and 14),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'used')),
  created_at timestamptz not null default now(),
  answer_by timestamptz not null default now() + interval '12 hours',
  decided_at timestamptz,
  use_by timestamptz
);
create index offers_listing_renter on public.offers (listing_id, renter_id, created_at desc);
alter table public.offers enable row level security;
create policy "The two members of an offer can read it"
  on public.offers for select to authenticated
  using ((select auth.uid()) in (renter_id, owner_id));
revoke all on public.offers from anon, authenticated;
grant select on public.offers to authenticated;

-- Offers and their answers can be posted in a conversation.
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('text', 'meetpoint', 'offer', 'offer_answer'));

create function public.make_offer(p_listing uuid, p_per_day numeric, p_days integer)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  l public.listings%rowtype;
  o public.offers%rowtype;
  floor_price numeric;
begin
  if uid is null then raise exception 'Sign in to book'; end if;
  if public.posting_suspended() then raise exception 'Posting suspended'; end if;
  select * into l from public.listings where id = p_listing and status = 'active' and distribution = 'public';
  if not found or not l.accept_offers then raise exception 'Listing unavailable'; end if;
  if l.owner_id = uid then raise exception 'You cannot rent your own piece'; end if;
  if public.blocked_between(uid, l.owner_id) then raise exception 'Not allowed'; end if;
  if exists (select 1 from public.profiles where id = l.owner_id and vacation) then raise exception 'owner_on_vacation'; end if;
  floor_price := coalesce(l.min_offer, ceil(l.price_per_day::numeric / 2));
  if p_per_day < floor_price or p_per_day >= l.price_per_day::numeric then raise exception 'offer_out_of_range'; end if;
  if p_days < 1 or p_days > 14 then raise exception 'Rental too long'; end if;
  -- A new offer replaces this renter's open one on the same piece.
  update public.offers set status = 'expired', decided_at = now()
   where listing_id = l.id and renter_id = uid and status = 'pending';
  if (select count(*) from public.offers where renter_id = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.offers (listing_id, renter_id, owner_id, per_day, days)
  values (l.id, uid, l.owner_id, round(p_per_day, 2), p_days)
  returning * into o;
  return o;
end;
$$;

create function public.answer_offer(p_offer uuid, p_accept boolean)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offers%rowtype;
begin
  select * into o from public.offers where id = p_offer for update;
  if not found or o.owner_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if o.status <> 'pending' then raise exception 'offer_closed'; end if;
  if o.answer_by < now() then
    update public.offers set status = 'expired', decided_at = now() where id = o.id;
    raise exception 'expired';
  end if;
  update public.offers
     set status = case when p_accept then 'accepted' else 'declined' end,
         decided_at = now(),
         use_by = case when p_accept then now() + interval '48 hours' end
   where id = o.id
  returning * into o;
  return o;
end;
$$;

revoke execute on function public.make_offer(uuid, numeric, integer) from public, anon;
grant execute on function public.make_offer(uuid, numeric, integer) to authenticated;
revoke execute on function public.answer_offer(uuid, boolean) from public, anon;
grant execute on function public.answer_offer(uuid, boolean) to authenticated;

-- book_rental takes an optional accepted offer. Everything else is unchanged.
drop function if exists public.book_rental(uuid, date, date, text, text, text);
create function public.book_rental(
  p_listing uuid, p_start date, p_end date, p_delivery text, p_consent_text text,
  p_method_label text default null, p_offer uuid default null)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
  r public.rentals%rowtype;
  o public.offers%rowtype;
  uid uuid := auth.uid();
  v_per_day numeric(10,2);
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
  v_per_day := l.price_per_day::numeric;
  if p_offer is not null then
    select * into o from public.offers where id = p_offer for update;
    if not found or o.renter_id <> uid or o.listing_id <> l.id or o.status <> 'accepted' or o.use_by < now() then
      raise exception 'offer_invalid';
    end if;
    v_per_day := o.per_day;
  end if;
  v_days := greatest(1, (p_end - p_start) + 1);
  v_rent := round(v_per_day * v_days, 2);
  v_renter_fee := round(v_rent * public.policy_num('renter_service_rate', 0.10), 2);
  v_owner_fee := round(v_rent * public.policy_num('owner_service_rate', 0.10), 2);
  v_ship := case when p_delivery = 'ship' then public.policy_num('shipping_fee', 9) else 0 end;
  v_clean := case when l.cleaning_by_lender then coalesce(l.cleaning_fee, 0) else 0 end;
  v_approved := least(
    coalesce(l.approved_value, 0)::numeric,
    public.policy_num('high_value_cap', 900));
  v_liability := v_approved;
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
    v_per_day, v_rent, v_renter_fee, v_owner_fee,
    v_ship, v_clean, round(v_rent + v_renter_fee + v_ship + v_clean, 2),
    round(v_rent - v_owner_fee, 2),
    v_approved, v_liability, v_hold_needed, v_hold,
    v_late_day, v_late_cap,
    public.policy_num('grace_period_hours', 24)::integer,
    public.policy_num('owner_claim_window_hours', 24)::integer,
    public.policy_num('non_return_review_days', 7)::integer,
    v_policy, public.policy_text('consent_version', '2026-09-p0'), p_consent_text)
  returning * into r;
  if p_offer is not null then
    update public.offers set status = 'used' where id = p_offer;
  end if;
  insert into public.risk_decisions (
    rental_id, listing_id, subject_id, decision, reason, hold_amount, policy_version)
  values (
    r.id, l.id, uid,
    case when v_hold_needed then 'hold_required' else 'none' end,
    v_reason, v_hold, v_policy);
  insert into public.possession_codes (rental_id, kind, code, show_to, confirm_by)
  values
    (r.id, 'handover', lpad((floor(random() * 1000000))::int::text, 6, '0'), l.owner_id, uid),
    (r.id, 'return', lpad((floor(random() * 1000000))::int::text, 6, '0'), uid, l.owner_id);
  insert into public.payment_consents (
    user_id, rental_id, method_label, consent_text, consent_version, off_session)
  values (uid, r.id, p_method_label, p_consent_text,
          public.policy_text('consent_version', '2026-09-p0'), true);
  insert into public.payouts (
    rental_id, owner_id, gross_amount, platform_fee, net_amount, state, hold_reason)
  values (r.id, l.owner_id, v_rent, v_owner_fee, round(v_rent - v_owner_fee, 2),
          'pending', 'awaiting_confirmed_return');
  perform public.audit(uid, 'member', 'rentals', r.id::text, 'book', null, to_jsonb(r));
  return r;
end;
$$;
revoke execute on function public.book_rental(uuid, date, date, text, text, text, uuid) from public, anon;
grant execute on function public.book_rental(uuid, date, date, text, text, text, uuid) to authenticated, service_role;
