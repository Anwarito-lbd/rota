-- ═════════════════════════════════════════════════════════════
-- Rota — 003 Content moderation
--
-- Every listing (and the video that carries it in the feed) is reviewed
-- before it is distributed. The review produces one of four states:
--
--   pending  — not reviewed yet. Visible to its owner only.
--   public   — distributed: feed, Explorer, search.
--   limited  — "ghosted": reachable from the owner's profile and by direct
--              link, rentable, but never pushed into the feed or search.
--   blocked  — removed. Visible to its owner only, with the reason.
--
-- Nothing here decides that a video *is* AI-generated. No detector can say
-- that reliably. The analyzer (supabase/functions/moderate-listings) records
-- signals — what the picture shows, how the file was captured, whether it was
-- seen elsewhere — and distribution follows from rules the business can tune
-- in policy_config. Humans decide anything contested.
--
-- Run after 002_trust_protection.sql. Safe to run once.
-- ═════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 0. Close functions that 002 left callable by anyone
--
-- Postgres grants EXECUTE to PUBLIC on every new function and Supabase
-- exposes the public schema over /rest/v1/rpc. Without this, a signed-out
-- visitor could forge audit entries or run the lifecycle tick.
-- ─────────────────────────────────────────────────────────────
revoke execute on function public.audit(uuid, text, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.rental_lifecycle_tick() from public, anon, authenticated;
revoke execute on function public.book_rental(uuid, date, date, text, text, text) from public, anon;
revoke execute on function public.confirm_possession(uuid, text, text, text) from public, anon;
grant execute on function public.book_rental(uuid, date, date, text, text, text) to authenticated;
grant execute on function public.confirm_possession(uuid, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 1. Policy numbers (tunable without a release)
-- ─────────────────────────────────────────────────────────────
insert into public.policy_config (key, value, note) values
  ('moderation_enabled', 'true',
   'Off = new listings go live unreviewed. Keep on once the analyzer is deployed.'),
  ('moderation_model', '"claude-opus-5"', 'Model the analyzer asks.'),
  ('moderation_effort', '"low"', 'Reasoning effort for the analyzer (low | medium | high).'),
  ('moderation_max_images', '6', 'Photos + video frames sent per review.'),
  ('moderation_max_attempts', '3', 'Analyzer failures before a case goes to a human.'),
  ('moderation_synthetic_limit_imported', '"medium"',
   'Synthetic-looking at or above this level limits reach when the media came from the gallery.'),
  ('moderation_synthetic_limit_in_app', '"high"',
   'Same threshold for media filmed inside Rota (a weaker, client-reported trust signal).'),
  ('moderation_report_threshold', '3',
   'Distinct reporters before a public listing is limited pending human review.')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Distribution state on listings
-- ─────────────────────────────────────────────────────────────
-- Existing listings were already live: they start public. New rows start
-- pending (the default is switched right after the backfill).
alter table public.listings
  add column if not exists distribution text not null default 'public'
    check (distribution in ('pending', 'public', 'limited', 'blocked')),
  add column if not exists distribution_reason text
    check (distribution_reason in (
      'off_topic', 'synthetic_suspected', 'not_original', 'duplicate',
      'unsafe', 'counterfeit_risk', 'reported', 'needs_review', 'other')),
  add column if not exists distribution_note text check (char_length(distribution_note) <= 280),
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_version integer not null default 1;

alter table public.listings alter column distribution set default 'pending';

create index if not exists listings_distribution_idx
  on public.listings (distribution, status, created_at desc);

-- No grant on these columns: members can never write them. Only the
-- security-definer functions below change them.

-- ─────────────────────────────────────────────────────────────
-- 3. Review queue
-- ─────────────────────────────────────────────────────────────
create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null default 'listing' check (subject_type in ('listing')),
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- The listing version this case judges. A verdict on an older version
  -- is recorded but never applied.
  subject_version integer not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  trigger text not null check (trigger in ('new', 'edited', 'reported', 'appeal')),
  state text not null default 'queued'
    check (state in ('queued', 'analyzing', 'decided', 'needs_human', 'closed')),
  attempts integer not null default 0,
  last_error text,
  -- Automated pass
  auto_distribution text check (auto_distribution in ('public', 'limited', 'blocked')),
  auto_reason text,
  signals jsonb not null default '{}',
  model text,
  -- Human pass
  human_distribution text check (human_distribution in ('public', 'limited', 'blocked')),
  human_reason text,
  reviewer_id uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moderation_cases_queue_idx on public.moderation_cases (state, created_at);
create index moderation_cases_listing_idx on public.moderation_cases (listing_id, created_at desc);

alter table public.moderation_cases enable row level security;
revoke all on public.moderation_cases from anon, authenticated;
-- No member policies: the queue and the analyzer's raw signals are staff-only.
-- The member sees the outcome through listings.distribution_note.

-- ─────────────────────────────────────────────────────────────
-- 4. Media provenance
--
-- Reported by the app at upload time. It is a signal, not proof: a modified
-- client could lie about capture_source. The analyzer never trusts it alone.
-- ─────────────────────────────────────────────────────────────
create table public.media_provenance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('image', 'video')),
  capture_source text not null default 'unknown'
    check (capture_source in ('in_app_camera', 'library', 'unknown')),
  width integer,
  height integer,
  duration_ms integer,
  file_size bigint,
  -- size:duration:WxH — catches the exact same file re-uploaded, nothing more.
  fingerprint text,
  exif_make text check (char_length(exif_make) <= 80),
  exif_model text check (char_length(exif_model) <= 80),
  exif_software text check (char_length(exif_software) <= 120),
  -- Stills pulled from a video on the phone, in the moderation-frames bucket.
  frame_paths text[] not null default '{}' check (cardinality(frame_paths) <= 4),
  created_at timestamptz not null default now()
);

create index media_provenance_listing_idx on public.media_provenance (listing_id);
create index media_provenance_fingerprint_idx on public.media_provenance (fingerprint)
  where fingerprint is not null;

alter table public.media_provenance enable row level security;

create policy "Members describe media on their own listings"
  on public.media_provenance for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.listings l
                where l.id = listing_id and l.owner_id = (select auth.uid()))
    and not exists (select 1 from unnest(frame_paths) p
                    where split_part(p, '/', 1) <> (select auth.uid())::text)
  );

create policy "Members read their own media records"
  on public.media_provenance for select to authenticated
  using (owner_id = (select auth.uid()));

-- Supabase grants every privilege on new tables by default; narrow it.
revoke all on public.media_provenance from anon, authenticated;
grant select on public.media_provenance to authenticated;
grant insert (listing_id, storage_path, kind, capture_source, width, height, duration_ms,
              file_size, fingerprint, exif_make, exif_model, exif_software, frame_paths)
  on public.media_provenance to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Reports from members
-- ─────────────────────────────────────────────────────────────
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  reason text not null check (reason in (
    'not_clothing', 'ai_or_fake', 'inappropriate', 'counterfeit', 'scam', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, listing_id)
);

alter table public.content_reports enable row level security;

create policy "Members report other members' listings"
  on public.content_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and not exists (select 1 from public.listings l
                    where l.id = listing_id and l.owner_id = (select auth.uid()))
  );

create policy "Members see their own reports"
  on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

revoke all on public.content_reports from anon, authenticated;
grant select on public.content_reports to authenticated;
grant insert (listing_id, reason, note) on public.content_reports to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. Appeals
-- ─────────────────────────────────────────────────────────────
create table public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 1000),
  state text not null default 'open' check (state in ('open', 'upheld', 'overturned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index moderation_appeals_one_open
  on public.moderation_appeals (listing_id) where state = 'open';

alter table public.moderation_appeals enable row level security;

create policy "Owners appeal a limited or removed listing"
  on public.moderation_appeals for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.listings l
                where l.id = listing_id
                  and l.owner_id = (select auth.uid())
                  and l.distribution in ('limited', 'blocked'))
  );

create policy "Owners read their own appeals"
  on public.moderation_appeals for select to authenticated
  using (owner_id = (select auth.uid()));

-- Members write the listing and their message; state is Rota's.
revoke all on public.moderation_appeals from anon, authenticated;
grant select on public.moderation_appeals to authenticated;
grant insert (listing_id, message) on public.moderation_appeals to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. Listing triggers
-- ─────────────────────────────────────────────────────────────
-- Set by the moderation functions for the duration of their transaction.
-- Member writes never carry it, so they can never promote a listing.
create function public.moderating() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('rota.moderating', true), '') = 'on';
$$;

create function public.listing_moderation_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  enabled boolean := coalesce(
    (select (value #>> '{}')::boolean from public.policy_config where key = 'moderation_enabled'),
    true);
  prefix text := new.owner_id::text || '/';
  paths_changed boolean;
begin
  -- A listing may only show media its owner uploaded. Without this a member
  -- could point photo_paths at someone else's files. Checked when the paths
  -- are written, so older rows are not re-judged on unrelated updates.
  -- OLD is empty on insert, so decide separately rather than in one OR.
  if tg_op = 'INSERT' then
    paths_changed := true;
  else
    paths_changed := (new.photo_paths, new.video_path, new.authenticity_path)
                     is distinct from (old.photo_paths, old.video_path, old.authenticity_path);
  end if;
  if paths_changed
     and (exists (select 1 from unnest(coalesce(new.photo_paths, '{}')) p where p not like prefix || '%')
          or (new.video_path is not null and new.video_path not like prefix || '%')
          or (new.authenticity_path is not null and new.authenticity_path not like prefix || '%')) then
    raise exception 'Media must be uploaded by the listing owner';
  end if;

  if public.moderating() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.distribution := case when enabled then 'pending' else 'public' end;
    new.distribution_reason := null;
    new.distribution_note := null;
    new.moderated_at := null;
    new.moderation_version := 1;
    return new;
  end if;

  -- An edit that changes what people see is a new version to review.
  -- A removed listing stays removed: the way back is an appeal.
  if (new.title, new.brand, new.category, new.occasion, new.video_path, new.photo_paths)
     is distinct from
     (old.title, old.brand, old.category, old.occasion, old.video_path, old.photo_paths) then
    new.moderation_version := old.moderation_version + 1;
    if enabled and old.distribution <> 'blocked' then
      new.distribution := 'pending';
      new.distribution_reason := null;
      new.distribution_note := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_moderation_gate
  before insert or update on public.listings
  for each row execute function public.listing_moderation_gate();

create function public.listing_enqueue_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.distribution <> 'pending' or public.moderating() then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if new.moderation_version = old.moderation_version then
      return null;
    end if;
  end if;
  insert into public.moderation_cases (listing_id, subject_version, owner_id, trigger)
  values (new.id, new.moderation_version, new.owner_id,
          case when tg_op = 'INSERT' then 'new' else 'edited' end);
  return null;
end;
$$;

create trigger listings_enqueue_review
  after insert or update on public.listings
  for each row execute function public.listing_enqueue_review();

-- ─────────────────────────────────────────────────────────────
-- 8. Who sees what
-- ─────────────────────────────────────────────────────────────
-- Limited listings stay readable (profile, direct link) — that is what
-- ghosting means. Pending and removed ones are visible to their owner only.
-- The feed and search additionally ask for distribution = 'public'.
drop policy if exists "Active listings are visible to signed-in members" on public.listings;

create policy "Members see distributed listings and their own"
  on public.listings for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (status = 'active' and distribution in ('public', 'limited'))
  );

-- book_rental reads listings as definer, so it cannot rely on the policy
-- above. Refuse bookings on anything not distributed.
create function public.rentals_require_distributed_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.listings
                 where id = new.listing_id and distribution in ('public', 'limited')) then
    raise exception 'Listing unavailable';
  end if;
  return new;
end;
$$;

create trigger rentals_require_distributed_listing
  before insert on public.rentals
  for each row execute function public.rentals_require_distributed_listing();

-- ─────────────────────────────────────────────────────────────
-- 9. Reports and appeals feed the queue
-- ─────────────────────────────────────────────────────────────
create function public.content_report_escalate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold integer := public.policy_num('moderation_report_threshold', 3)::integer;
  reporters integer;
  l public.listings%rowtype;
begin
  select count(distinct reporter_id) into reporters
  from public.content_reports where listing_id = new.listing_id;

  select * into l from public.listings where id = new.listing_id;
  if reporters < threshold or l.distribution <> 'public' then
    return null;
  end if;

  perform set_config('rota.moderating', 'on', true);
  update public.listings
     set distribution = 'limited',
         distribution_reason = 'reported',
         distribution_note = 'Signalée par plusieurs membres — en cours de vérification.',
         moderated_at = now()
   where id = l.id;
  perform set_config('rota.moderating', 'off', true);

  insert into public.moderation_cases (listing_id, subject_version, owner_id, trigger, state)
  values (l.id, l.moderation_version, l.owner_id, 'reported', 'needs_human');

  perform public.audit(null, 'system', 'listing', l.id::text, 'distribution.reported',
    jsonb_build_object('distribution', l.distribution),
    jsonb_build_object('distribution', 'limited', 'reporters', reporters));
  return null;
end;
$$;

create trigger content_reports_escalate
  after insert on public.content_reports
  for each row execute function public.content_report_escalate();

create function public.moderation_appeal_enqueue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
begin
  select * into l from public.listings where id = new.listing_id;
  insert into public.moderation_cases (listing_id, subject_version, owner_id, trigger, state)
  values (l.id, l.moderation_version, l.owner_id, 'appeal', 'needs_human');
  return null;
end;
$$;

create trigger moderation_appeals_enqueue
  after insert on public.moderation_appeals
  for each row execute function public.moderation_appeal_enqueue();

-- ─────────────────────────────────────────────────────────────
-- 10. Analyzer and reviewer entry points (service role only)
-- ─────────────────────────────────────────────────────────────

-- Hands out queued cases. With p_listing, only that listing's case (the app
-- asks right after publishing); without it, cases old enough that the app
-- has finished uploading frames (the scheduled sweep).
create function public.claim_moderation_cases(
  p_listing uuid default null,
  p_min_age_seconds integer default 120,
  p_limit integer default 5)
returns setof public.moderation_cases
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A run that died mid-analysis gives its case back.
  update public.moderation_cases
     set state = 'queued', updated_at = now()
   where state = 'analyzing' and updated_at < now() - interval '10 minutes';

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

-- Records what the analyzer found and, unless a human must look first,
-- applies it. A verdict on a stale version is kept for the record only.
create function public.apply_moderation_verdict(
  p_case uuid,
  p_distribution text,      -- public | limited | blocked, or null to hold as pending
  p_reason text,
  p_note text,
  p_signals jsonb,
  p_model text,
  p_needs_human boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.moderation_cases%rowtype;
  l public.listings%rowtype;
begin
  select * into c from public.moderation_cases where id = p_case for update;
  if not found or c.state <> 'analyzing' then
    raise exception 'Case not being analyzed';
  end if;

  update public.moderation_cases
     set auto_distribution = p_distribution,
         auto_reason = p_reason,
         signals = coalesce(p_signals, '{}'),
         model = p_model,
         last_error = null,
         state = case when p_needs_human then 'needs_human' else 'decided' end,
         decided_at = case when p_needs_human then null else now() end,
         updated_at = now()
   where id = c.id;

  select * into l from public.listings where id = c.listing_id for update;
  if l.moderation_version <> c.subject_version or p_distribution is null then
    return;
  end if;

  perform set_config('rota.moderating', 'on', true);
  update public.listings
     set distribution = p_distribution,
         distribution_reason = case when p_distribution = 'public' then null else p_reason end,
         distribution_note = case when p_distribution = 'public' then null else left(p_note, 280) end,
         moderated_at = now()
   where id = l.id;
  perform set_config('rota.moderating', 'off', true);

  perform public.audit(null, 'system', 'listing', l.id::text, 'distribution.auto',
    jsonb_build_object('distribution', l.distribution),
    jsonb_build_object('distribution', p_distribution, 'reason', p_reason, 'case', c.id));
end;
$$;

-- The analyzer failed (network, provider error). Retry, then hand to a human.
create function public.release_moderation_case(p_case uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.moderation_cases
     set state = case
                   when attempts >= public.policy_num('moderation_max_attempts', 3) then 'needs_human'
                   else 'queued' end,
         last_error = left(p_error, 500),
         updated_at = now()
   where id = p_case and state = 'analyzing';
$$;

-- A human decision. Run from the SQL editor (or a future back office) as
-- service role. Closes the case and settles any open appeal.
create function public.decide_moderation_case(
  p_case uuid,
  p_distribution text,
  p_reason text default null,
  p_note text default null,
  p_reviewer uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.moderation_cases%rowtype;
  l public.listings%rowtype;
begin
  if p_distribution not in ('public', 'limited', 'blocked') then
    raise exception 'Unknown distribution';
  end if;
  select * into c from public.moderation_cases where id = p_case for update;
  if not found then
    raise exception 'Unknown case';
  end if;
  select * into l from public.listings where id = c.listing_id for update;

  update public.moderation_cases
     set human_distribution = p_distribution, human_reason = p_reason,
         reviewer_id = p_reviewer, state = 'closed', decided_at = now(), updated_at = now()
   where id = c.id;

  perform set_config('rota.moderating', 'on', true);
  update public.listings
     set distribution = p_distribution,
         distribution_reason = case when p_distribution = 'public' then null else coalesce(p_reason, 'other') end,
         distribution_note = case when p_distribution = 'public' then null else left(p_note, 280) end,
         moderated_at = now()
   where id = l.id;
  perform set_config('rota.moderating', 'off', true);

  update public.moderation_appeals
     set state = case when p_distribution = 'public' or
                           (p_distribution = 'limited' and l.distribution = 'blocked')
                      then 'overturned' else 'upheld' end,
         decided_at = now()
   where listing_id = l.id and state = 'open';

  perform public.audit(p_reviewer, 'rota', 'listing', l.id::text, 'distribution.human',
    jsonb_build_object('distribution', l.distribution),
    jsonb_build_object('distribution', p_distribution, 'reason', p_reason, 'case', c.id));
end;
$$;

revoke execute on function public.moderating() from public, anon, authenticated;
revoke execute on function public.listing_moderation_gate() from public, anon, authenticated;
revoke execute on function public.listing_enqueue_review() from public, anon, authenticated;
revoke execute on function public.rentals_require_distributed_listing() from public, anon, authenticated;
revoke execute on function public.content_report_escalate() from public, anon, authenticated;
revoke execute on function public.moderation_appeal_enqueue() from public, anon, authenticated;
revoke execute on function public.claim_moderation_cases(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.apply_moderation_verdict(uuid, text, text, text, jsonb, text, boolean)
  from public, anon, authenticated;
revoke execute on function public.release_moderation_case(uuid, text) from public, anon, authenticated;
revoke execute on function public.decide_moderation_case(uuid, text, text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.claim_moderation_cases(uuid, integer, integer) to service_role;
grant execute on function public.apply_moderation_verdict(uuid, text, text, text, jsonb, text, boolean)
  to service_role;
grant execute on function public.release_moderation_case(uuid, text) to service_role;
grant execute on function public.decide_moderation_case(uuid, text, text, text, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 11. Storage
-- ─────────────────────────────────────────────────────────────
-- Stills pulled from videos on the phone. Private: only the analyzer reads them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moderation-frames', 'moderation-frames', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Media pulled out of the public bucket when a listing is removed for
-- unsafe content. Kept for the appeal and for any legal request.
insert into storage.buckets (id, name, public, file_size_limit)
values ('moderation-quarantine', 'moderation-quarantine', false, 104857600)
on conflict (id) do nothing;

create policy "Members upload frames into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'moderation-frames'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- No select / update / delete policies on either bucket for members.
