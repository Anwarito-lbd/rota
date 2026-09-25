-- ═════════════════════════════════════════════════════════════
-- Rota — 005 Staff tools and safety
--
--   • An in-app back office for Rota staff: moderation queue, claims,
--     rentals that need a person, safety incidents. Every function checks
--     is_staff() itself; members get "Not allowed".
--   • Safety incidents: suspected child-abuse material (from a hash match
--     or the analyzer) suspends the account, pulls its listings discreetly
--     and keeps the evidence for the report to the authorities.
--   • Cost and spam limits: listings per member per day, analyses per day.
--   • Server-side video stills (see moderate-listings + Mux).
--
-- Make yourself staff once, in the SQL editor:
--   insert into public.staff_members (user_id)
--   select id from public.profiles where username = 'your_username';
--
-- Run after 004_payments_and_rental_ops.sql.
-- ═════════════════════════════════════════════════════════════

insert into public.policy_config (key, value, note) values
  ('max_listings_per_day', '20', 'New listings a member can publish per day.'),
  ('moderation_daily_review_cap', '300',
   'Analyses per day. Past this, cases wait for tomorrow instead of running up the bill.'),
  ('moderation_require_hash_check', 'false',
   'Turn on once a hash-matching vendor is connected: nothing is analysed or published without its answer.')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 1. Restrictions and incidents
-- ─────────────────────────────────────────────────────────────
create table public.member_restrictions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  posting_suspended boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.member_restrictions enable row level security;
revoke all on public.member_restrictions from anon, authenticated;

create table public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('hash_match', 'model_minor_safety', 'member_report', 'other')),
  detail jsonb not null default '{}',
  state text not null default 'open' check (state in ('open', 'reported', 'closed')),
  -- Where it was reported (e.g. PHAROS, NCMEC) and their reference.
  reported_to text,
  report_reference text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles (id)
);
alter table public.safety_incidents enable row level security;
revoke all on public.safety_incidents from anon, authenticated;

-- Called by the analyzer. Suspends posting and takes every listing of the
-- account out of view without telling the account why (it shows as
-- "being checked"), so evidence isn't destroyed before a person looks.
create function public.open_safety_incident(p_listing uuid, p_kind text, p_detail jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
  v_id uuid;
begin
  select * into l from public.listings where id = p_listing;
  insert into public.safety_incidents (listing_id, owner_id, kind, detail)
  values (p_listing, l.owner_id, p_kind, coalesce(p_detail, '{}'))
  returning id into v_id;

  insert into public.member_restrictions (user_id, posting_suspended, reason)
  values (l.owner_id, true, 'safety_incident')
  on conflict (user_id) do update set posting_suspended = true, reason = 'safety_incident';

  perform set_config('rota.moderating', 'on', true);
  update public.listings
     set distribution = 'pending', distribution_reason = null, distribution_note = null
   where owner_id = l.owner_id and id <> p_listing and distribution in ('public', 'limited');
  update public.listings
     set distribution = 'blocked', distribution_reason = 'unsafe', distribution_note = null, moderated_at = now()
   where id = p_listing;
  perform set_config('rota.moderating', 'off', true);

  perform public.audit(null, 'system', 'safety_incidents', v_id::text, 'open.' || p_kind,
    null, jsonb_build_object('listing', p_listing, 'owner', l.owner_id));
  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. Limits on new listings
-- ─────────────────────────────────────────────────────────────
create function public.listings_member_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today integer;
begin
  if exists (select 1 from public.member_restrictions
             where user_id = new.owner_id and posting_suspended) then
    raise exception 'Posting suspended';
  end if;
  select count(*)::integer into today from public.listings
   where owner_id = new.owner_id and created_at > now() - interval '24 hours';
  if today >= public.policy_num('max_listings_per_day', 20) then
    raise exception 'Too many listings today';
  end if;
  return new;
end;
$$;

create trigger listings_member_limits
  before insert on public.listings
  for each row execute function public.listings_member_limits();

-- ─────────────────────────────────────────────────────────────
-- 3. Analyzer: daily cap, server stills, usage
-- ─────────────────────────────────────────────────────────────
alter table public.media_provenance
  add column if not exists server_asset_id text,
  add column if not exists server_frame_paths text[] not null default '{}';

create or replace function public.claim_moderation_cases(
  p_listing uuid default null,
  p_min_age_seconds integer default 120,
  p_limit integer default 5)
returns setof public.moderation_cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  started_today integer;
begin
  update public.moderation_cases
     set state = 'queued', updated_at = now()
   where state = 'analyzing' and updated_at < now() - interval '10 minutes';

  -- Past the daily budget, cases simply wait (the listing stays "being checked").
  select count(*)::integer into started_today from public.moderation_cases
   where attempts > 0 and updated_at >= date_trunc('day', now());
  if started_today >= public.policy_num('moderation_daily_review_cap', 300) then
    return;
  end if;

  return query
  update public.moderation_cases c
     set state = 'analyzing', attempts = c.attempts + 1, updated_at = now()
   where c.id in (
     select q.id from public.moderation_cases q
      where q.state = 'queued'
        and (p_listing is null or q.listing_id = p_listing)
        and (p_listing is not null or q.created_at < now() - make_interval(secs => p_min_age_seconds))
      order by q.created_at
      limit greatest(1, least(p_limit, 20))
      for update skip locked)
  returning c.*;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Staff: moderation
-- ─────────────────────────────────────────────────────────────
create function public.require_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
end;
$$;

create function public.staff_moderation_queue()
returns table (
  case_id uuid, trigger text, created_at timestamptz, listing_id uuid, title text, brand text,
  category text, owner_username text, distribution text, distribution_reason text,
  auto_reason text, summary text, cues jsonb, photo_paths text[], video_path text,
  frame_paths text[], authenticity_path text, report_count integer, report_reasons text[],
  appeal_message text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff();
  return query
  select c.id, c.trigger, c.created_at, l.id, l.title, l.brand, l.category, pr.username,
         l.distribution, l.distribution_reason, c.auto_reason,
         c.signals #>> '{verdict,reviewer_summary}', c.signals #> '{verdict,synthetic_cues}',
         l.photo_paths, l.video_path,
         coalesce((select array_agg(f) from public.media_provenance mp,
                   unnest(case when cardinality(mp.server_frame_paths) > 0
                               then mp.server_frame_paths else mp.frame_paths end) f
                   where mp.listing_id = l.id), '{}'),
         l.authenticity_path,
         (select count(*)::integer from public.content_reports cr where cr.listing_id = l.id),
         coalesce((select array_agg(distinct cr.reason) from public.content_reports cr where cr.listing_id = l.id), '{}'),
         (select a.message from public.moderation_appeals a where a.listing_id = l.id and a.state = 'open' limit 1)
    from public.moderation_cases c
    join public.listings l on l.id = c.listing_id
    join public.profiles pr on pr.id = l.owner_id
   where c.state = 'needs_human'
   order by c.created_at;
end;
$$;

create function public.staff_decide_moderation(
  p_case uuid, p_distribution text, p_reason text default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();
  perform public.decide_moderation_case(p_case, p_distribution, p_reason, p_note, auth.uid());
  -- Other cases on the same listing are settled by this decision.
  update public.moderation_cases
     set state = 'closed', updated_at = now()
   where listing_id = (select listing_id from public.moderation_cases where id = p_case)
     and state = 'needs_human' and id <> p_case;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Staff: claims
-- ─────────────────────────────────────────────────────────────
create function public.staff_claims_queue()
returns table (
  claim_id uuid, rental_id uuid, created_at timestamptz, status text, category text,
  description text, evidence_paths text[], requested_amount numeric, renter_response text,
  appeal_note text, max_claimable numeric, deposit_amount numeric, listing_title text,
  owner_username text, renter_username text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff();
  return query
  select c.id, c.rental_id, c.created_at, c.status, c.category, c.description, c.evidence_paths,
         c.requested_amount, c.renter_response, c.appeal_note,
         greatest(r.max_liability - r.late_fees_charged, 0), r.deposit_amount, l.title,
         o.username, rn.username
    from public.claims c
    join public.rentals r on r.id = c.rental_id
    join public.listings l on l.id = r.listing_id
    join public.profiles o on o.id = c.owner_id
    join public.profiles rn on rn.id = c.renter_id
   where c.status in ('submitted', 'renter_responding', 'under_review', 'appealed')
   order by c.created_at;
end;
$$;

-- Rota decides; the liability cap trigger from 002 still applies.
create function public.staff_decide_claim(p_claim uuid, p_approved numeric, p_note text)
returns public.claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.claims%rowtype;
  jobs integer;
begin
  perform public.require_staff();
  if p_approved is null or p_approved < 0 then
    raise exception 'Invalid amount';
  end if;
  select * into c from public.claims where id = p_claim for update;
  if not found or c.status not in ('submitted', 'renter_responding', 'under_review', 'appealed') then
    raise exception 'Claim not awaiting a decision';
  end if;

  update public.claims set
    approved_amount = p_approved,
    status = case when p_approved = 0 then 'denied'
                  when p_approved < requested_amount then 'partially_approved'
                  else 'approved' end,
    decision_note = left(p_note, 2000),
    decided_at = now()
  where id = c.id returning * into c;

  if coalesce(c.approved_amount, 0) > c.collected_amount then
    select count(*)::integer into jobs from public.payment_jobs where claim_id = c.id;
    perform public.enqueue_payment_job('charge_claim', c.rental_id,
      'claim-' || c.id::text || '-' || jobs::text, c.id);
  end if;

  perform public.notify(c.owner_id, 'claim_decided', c.rental_id, c.id,
    jsonb_build_object('approved', c.approved_amount, 'status', c.status));
  perform public.notify(c.renter_id, 'claim_decided', c.rental_id, c.id,
    jsonb_build_object('approved', c.approved_amount, 'status', c.status));
  perform public.audit(auth.uid(), 'rota', 'claims', c.id::text, 'decide',
    null, jsonb_build_object('approved', c.approved_amount, 'status', c.status));
  return c;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Staff: rentals that need a person
-- ─────────────────────────────────────────────────────────────
create function public.staff_rentals_attention()
returns table (
  rental_id uuid, listing_title text, owner_username text, renter_username text, status text,
  payment_status text, flagged text, hold_status text, payout_state text, payout_hold_reason text,
  total_charged numeric, start_date date, end_date date, return_due_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff();
  return query
  select r.id, l.title, o.username, rn.username, r.status, r.payment_status, r.flagged, r.hold_status,
         p.state, p.hold_reason, r.total_charged, r.start_date, r.end_date, r.return_due_at
    from public.rentals r
    join public.listings l on l.id = r.listing_id
    join public.profiles o on o.id = r.owner_id
    join public.profiles rn on rn.id = r.renter_id
    left join public.payouts p on p.rental_id = r.id
   where r.flagged is not null
      or r.status = 'non_return_review'
      or (p.state in ('on_hold', 'failed') and p.hold_reason <> 'owner_payout_setup_required')
      or exists (select 1 from public.payment_jobs j where j.rental_id = r.id and j.state = 'failed')
   order by r.created_at desc;
end;
$$;

-- Before handover only: cancel, and refund if it was paid.
create function public.staff_cancel_rental(p_rental uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rentals%rowtype;
begin
  perform public.require_staff();
  select * into r from public.rentals where id = p_rental for update;
  if not found or r.status <> 'booked' then
    raise exception 'Only a rental not yet handed over can be cancelled here';
  end if;
  if r.payment_status = 'paid' then
    perform public.enqueue_payment_job('refund_rental', r.id, 'refund-staff-' || r.id::text);
  else
    update public.rentals set status = 'cancelled' where id = r.id;
    update public.payouts set state = 'cancelled', hold_reason = 'cancelled' where rental_id = r.id;
  end if;
  perform public.audit(auth.uid(), 'rota', 'rentals', r.id::text, 'cancel', null,
    jsonb_build_object('note', left(p_note, 500)));
end;
$$;

-- A dispute or warning was resolved in Rota's favour: the payout resumes.
create function public.staff_clear_flag(p_rental uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();
  update public.rentals set flagged = null where id = p_rental;
  update public.payouts
     set state = 'scheduled', release_after = least(coalesce(release_after, now()), now()), hold_reason = null
   where rental_id = p_rental and state = 'on_hold'
     and hold_reason in ('dispute', 'fraud_warning', 'transfer_failed');
  update public.payment_jobs set state = 'queued', attempts = 0, run_after = now()
   where rental_id = p_rental and state = 'failed' and kind = 'transfer_payout';
  perform public.audit(auth.uid(), 'rota', 'rentals', p_rental::text, 'clear_flag', null,
    jsonb_build_object('note', left(p_note, 500)));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. Staff: safety incidents
-- ─────────────────────────────────────────────────────────────
create function public.staff_incidents()
returns table (
  incident_id uuid, created_at timestamptz, kind text, state text, listing_id uuid,
  listing_title text, owner_username text, reported_to text, report_reference text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff();
  return query
  select i.id, i.created_at, i.kind, i.state, i.listing_id, l.title, p.username, i.reported_to, i.report_reference
    from public.safety_incidents i
    left join public.listings l on l.id = i.listing_id
    left join public.profiles p on p.id = i.owner_id
   where i.state <> 'closed'
   order by i.created_at;
end;
$$;

create function public.staff_update_incident(
  p_incident uuid, p_state text, p_reported_to text default null, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff();
  if p_state not in ('reported', 'closed') then
    raise exception 'Unknown state';
  end if;
  update public.safety_incidents
     set state = p_state,
         reported_to = coalesce(p_reported_to, reported_to),
         report_reference = coalesce(p_reference, report_reference),
         closed_at = case when p_state = 'closed' then now() else closed_at end,
         closed_by = case when p_state = 'closed' then auth.uid() else closed_by end
   where id = p_incident;
  perform public.audit(auth.uid(), 'rota', 'safety_incidents', p_incident::text, 'state.' || p_state,
    null, jsonb_build_object('reported_to', p_reported_to, 'reference', p_reference));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. Staff can see the private files they must judge
-- ─────────────────────────────────────────────────────────────
create policy "Staff read files under review"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('moderation-frames', 'moderation-quarantine', 'private-docs', 'rental-evidence')
    and public.is_staff()
  );

-- ─────────────────────────────────────────────────────────────
-- 9. Grants
-- ─────────────────────────────────────────────────────────────
revoke execute on function public.open_safety_incident(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.listings_member_limits() from public, anon, authenticated;
revoke execute on function public.claim_moderation_cases(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.require_staff() from public, anon, authenticated;
grant execute on function public.open_safety_incident(uuid, text, jsonb) to service_role;
grant execute on function public.claim_moderation_cases(uuid, integer, integer) to service_role;

-- Staff functions check is_staff() themselves; members get "Not allowed".
revoke execute on function public.staff_moderation_queue() from public, anon;
revoke execute on function public.staff_decide_moderation(uuid, text, text, text) from public, anon;
revoke execute on function public.staff_claims_queue() from public, anon;
revoke execute on function public.staff_decide_claim(uuid, numeric, text) from public, anon;
revoke execute on function public.staff_rentals_attention() from public, anon;
revoke execute on function public.staff_cancel_rental(uuid, text) from public, anon;
revoke execute on function public.staff_clear_flag(uuid, text) from public, anon;
revoke execute on function public.staff_incidents() from public, anon;
revoke execute on function public.staff_update_incident(uuid, text, text, text) from public, anon;
grant execute on function public.staff_moderation_queue() to authenticated;
grant execute on function public.staff_decide_moderation(uuid, text, text, text) to authenticated;
grant execute on function public.staff_claims_queue() to authenticated;
grant execute on function public.staff_decide_claim(uuid, numeric, text) to authenticated;
grant execute on function public.staff_rentals_attention() to authenticated;
grant execute on function public.staff_cancel_rental(uuid, text) to authenticated;
grant execute on function public.staff_clear_flag(uuid, text) to authenticated;
grant execute on function public.staff_incidents() to authenticated;
grant execute on function public.staff_update_incident(uuid, text, text, text) to authenticated;
