-- ═════════════════════════════════════════════════════════════
-- Rota — 015 DSA: statements of reasons, appeals, public reports
--
-- docs/legal/07 §A3–A5:
--   • art. 17 — every restriction (listing or post limited/removed, comment
--     or message hidden, posting suspended) creates a notice for the member:
--     what, why, on what basis, whether it was automated, how to contest.
--   • art. 20 — the member contests the notice in the app for 6 months.
--     Listings go through the existing listing appeal (003); everything else
--     lands in the staff Social queue, where overturning reverses the action.
--   • art. 16 — anyone, member or not, can report content through a public
--     web form (Edge Function `report`). Staff see it in the Social queue.
--
-- Notices come from triggers on the restricted rows, so every path (staff
-- action, three reports, the listing analyzer) is covered. Restrictions that
-- follow a child-safety incident send no notice (they may alert the author
-- before the authorities act); staff contact the member themselves.
-- ═════════════════════════════════════════════════════════════

create table public.moderation_notices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null check (subject_kind in ('listing', 'post', 'comment', 'message', 'account')),
  subject_id uuid not null,
  action text not null check (action in ('limited', 'removed', 'hidden', 'suspended')),
  reason text not null,
  basis text not null default 'terms' check (basis in ('terms', 'law')),
  explanation text check (char_length(explanation) <= 500),
  excerpt text check (char_length(excerpt) <= 140),
  automated boolean not null,
  created_at timestamptz not null default now(),
  appeal_state text not null default 'none' check (appeal_state in ('none', 'open', 'upheld', 'overturned')),
  appeal_message text check (char_length(appeal_message) between 10 and 1000),
  appealed_at timestamptz,
  appeal_decided_at timestamptz,
  appeal_decided_by uuid references public.profiles (id) on delete set null,
  appeal_note text check (char_length(appeal_note) <= 500)
);
create index moderation_notices_member on public.moderation_notices (member_id, created_at desc);
create index moderation_notices_subject on public.moderation_notices (subject_kind, subject_id);
create index moderation_notices_open_appeals on public.moderation_notices (appealed_at) where appeal_state = 'open';
alter table public.moderation_notices enable row level security;
create policy "Members read the decisions about them"
  on public.moderation_notices for select to authenticated
  using (member_id = (select auth.uid()));
revoke all on public.moderation_notices from anon, authenticated;
grant select on public.moderation_notices to authenticated;

-- Reason codes the app words itself; anything else is kept as the explanation.
create function public.notice_reason(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p in ('reported', 'off_topic', 'synthetic_suspected', 'not_original', 'duplicate',
                         'unsafe', 'counterfeit_risk', 'needs_review', 'harassment', 'scam', 'inappropriate')
              then p else 'other' end;
$$;

create function public.issue_moderation_notice(
  p_member uuid, p_kind text, p_subject uuid, p_action text, p_reason text,
  p_excerpt text, p_explanation text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_explanation, current_setting('rota.moderation_note', true), '')), '');
  v_automated boolean := not coalesce(public.is_staff(), false);
begin
  if p_member is null then
    return null;
  end if;
  -- Account being closed: nothing to tell.
  if exists (select 1 from public.profiles where id = p_member and deleted_at is not null) then
    return null;
  end if;
  insert into public.moderation_notices
    (member_id, subject_kind, subject_id, action, reason, explanation, excerpt, automated)
  values
    (p_member, p_kind, p_subject, p_action, public.notice_reason(p_reason),
     left(coalesce(v_note, case when public.notice_reason(p_reason) = 'other' then p_reason end), 500),
     left(p_excerpt, 140), v_automated)
  returning id into v_id;
  insert into public.notifications (user_id, kind, payload, dedupe_key)
  values (p_member, 'moderation_notice',
          jsonb_build_object('notice', v_id, 'subject', p_kind, 'action', p_action),
          'moderation_notice:' || v_id::text);
  perform public.audit(auth.uid(), case when v_automated then 'system' else 'rota' end,
    'moderation_notices', v_id::text, 'notice.' || p_action, null,
    jsonb_build_object('subject', p_kind, 'subject_id', p_subject, 'reason', p_reason));
  return v_id;
end;
$$;

-- When a restriction is lifted, an open appeal on it is settled in the member's favour.
create function public.settle_notices(p_kind text, p_subject uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.moderation_notices
     set appeal_state = 'overturned', appeal_decided_at = now(), appeal_decided_by = auth.uid()
   where subject_kind = p_kind and subject_id = p_subject and appeal_state = 'open';
$$;

create function public.posts_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.distribution in ('limited', 'blocked') and new.distribution is distinct from old.distribution then
    perform public.issue_moderation_notice(new.author_id, 'post', new.id,
      case when new.distribution = 'blocked' then 'removed' else 'limited' end,
      coalesce(new.distribution_reason, 'other'), new.caption);
  elsif new.distribution = 'public' and old.distribution in ('limited', 'blocked') then
    perform public.settle_notices('post', new.id);
  end if;
  return null;
end;
$$;
create trigger posts_notice after update of distribution on public.posts
  for each row execute function public.posts_notice();

create function public.comments_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden and not old.hidden then
    perform public.issue_moderation_notice(new.author_id, 'comment', new.id, 'hidden',
      coalesce(current_setting('rota.moderation_reason', true), 'reported'), new.body);
  elsif old.hidden and not new.hidden then
    perform public.settle_notices('comment', new.id);
  end if;
  return null;
end;
$$;
create trigger post_comments_notice after update of hidden on public.post_comments
  for each row execute function public.comments_notice();

create function public.messages_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden and not old.hidden then
    perform public.issue_moderation_notice(new.sender_id, 'message', new.id, 'hidden',
      coalesce(current_setting('rota.moderation_reason', true), 'reported'), new.body);
  elsif old.hidden and not new.hidden then
    perform public.settle_notices('message', new.id);
  end if;
  return null;
end;
$$;
create trigger messages_notice after update of hidden on public.messages
  for each row execute function public.messages_notice();

create function public.restrictions_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.posting_suspended and (tg_op = 'INSERT' or not old.posting_suspended) then
    if coalesce(new.reason, '') <> 'safety_incident' then
      perform public.issue_moderation_notice(new.user_id, 'account', new.user_id, 'suspended',
        coalesce(new.reason, 'other'), null);
    end if;
  elsif tg_op = 'UPDATE' and old.posting_suspended and not new.posting_suspended then
    perform public.settle_notices('account', new.user_id);
  end if;
  return null;
end;
$$;
create trigger member_restrictions_notice after insert or update of posting_suspended on public.member_restrictions
  for each row execute function public.restrictions_notice();

create function public.listings_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.distribution in ('limited', 'blocked') and new.distribution is distinct from old.distribution then
    if exists (select 1 from public.safety_incidents i where i.listing_id = new.id and i.state <> 'closed') then
      return null;
    end if;
    perform public.issue_moderation_notice(new.owner_id, 'listing', new.id,
      case when new.distribution = 'blocked' then 'removed' else 'limited' end,
      coalesce(new.distribution_reason, 'other'), new.title, new.distribution_note);
  elsif new.distribution = 'public' and old.distribution in ('limited', 'blocked') then
    perform public.settle_notices('listing', new.id);
  end if;
  return null;
end;
$$;
create trigger listings_notice after update of distribution on public.listings
  for each row execute function public.listings_notice();

-- A listing appeal decided through the listing queue settles the notice too.
create function public.listing_appeal_settles_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state in ('upheld', 'overturned') and old.state = 'open' then
    update public.moderation_notices
       set appeal_state = new.state, appeal_decided_at = now(), appeal_decided_by = auth.uid()
     where subject_kind = 'listing' and subject_id = new.listing_id and appeal_state = 'open';
    perform public.notify_appeal_outcome(n.id)
       from public.moderation_notices n
      where n.subject_kind = 'listing' and n.subject_id = new.listing_id
        and n.appeal_decided_at >= now() - interval '1 minute';
  end if;
  return null;
end;
$$;

create function public.notify_appeal_outcome(p_notice uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, payload, dedupe_key)
  select n.member_id, 'appeal_decided',
         jsonb_build_object('notice', n.id, 'subject', n.subject_kind, 'outcome', n.appeal_state),
         'appeal_decided:' || n.id::text
    from public.moderation_notices n
   where n.id = p_notice and n.appeal_state in ('upheld', 'overturned')
  on conflict (dedupe_key) do nothing;
$$;

create trigger moderation_appeals_settle_notice after update of state on public.moderation_appeals
  for each row execute function public.listing_appeal_settles_notice();

-- ── The member contests ──────────────────────────────────────

create function public.appeal_moderation_notice(p_notice uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.moderation_notices%rowtype;
  msg text := btrim(coalesce(p_message, ''));
begin
  select * into n from public.moderation_notices where id = p_notice for update;
  if not found or n.member_id <> auth.uid() then
    raise exception 'not_found';
  end if;
  if n.appeal_state <> 'none' then
    raise exception 'already_appealed';
  end if;
  if n.created_at < now() - interval '6 months' then
    raise exception 'appeal_window_closed';
  end if;
  if char_length(msg) < 10 or char_length(msg) > 1000 then
    raise exception 'appeal_length';
  end if;
  update public.moderation_notices
     set appeal_state = 'open', appeal_message = msg, appealed_at = now()
   where id = n.id;
  if n.subject_kind = 'listing' then
    insert into public.moderation_appeals (listing_id, owner_id, message)
    select l.id, l.owner_id, msg from public.listings l
     where l.id = n.subject_id and l.distribution in ('limited', 'blocked')
       and not exists (select 1 from public.moderation_appeals a where a.listing_id = l.id and a.state = 'open');
  end if;
  perform public.audit(auth.uid(), 'member', 'moderation_notices', n.id::text, 'appeal', null,
    jsonb_build_object('subject', n.subject_kind));
end;
$$;

-- ── Public reports (art. 16), written only by the `report` function ──

create table public.web_reports (
  id uuid primary key default gen_random_uuid(),
  content_url text not null check (char_length(content_url) between 8 and 500),
  reason text not null check (reason in (
    'illegal', 'counterfeit', 'harassment', 'inappropriate', 'scam', 'ip_rights', 'minor_safety', 'other')),
  description text not null check (char_length(description) between 20 and 3000),
  reporter_name text check (char_length(reporter_name) <= 120),
  reporter_email text check (char_length(reporter_email) <= 200),
  good_faith boolean not null check (good_faith),
  source_hash text,
  state text not null default 'open' check (state in ('open', 'actioned', 'dismissed')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index web_reports_open on public.web_reports (created_at) where state = 'open';
create index web_reports_source on public.web_reports (source_hash, created_at);
alter table public.web_reports enable row level security;
revoke all on public.web_reports from anon, authenticated;

create function public.submit_web_report(
  p_url text, p_reason text, p_description text, p_name text, p_email text,
  p_good_faith boolean, p_source_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select count(*) from public.web_reports
       where source_hash = p_source_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited';
  end if;
  insert into public.web_reports (content_url, reason, description, reporter_name, reporter_email, good_faith, source_hash)
  values (btrim(p_url), p_reason, btrim(p_description), nullif(btrim(p_name), ''), nullif(btrim(p_email), ''),
          coalesce(p_good_faith, false), p_source_hash)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Staff queue and decisions (replace 010's versions) ───────

create or replace function public.staff_social_queue()
returns table (
  kind text, target_id uuid, member_id uuid, member_username text, body text,
  media_paths text[], distribution text, report_count integer, report_reasons text[],
  report_notes text[], waiting_since timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff();
  return query
  select 'post', p.id, p.author_id, pr.username, p.caption, p.media_paths, p.distribution,
         (select count(*)::integer from public.social_reports r where r.post_id = p.id and r.state = 'open'),
         coalesce((select array_agg(distinct r.reason) from public.social_reports r where r.post_id = p.id and r.state = 'open'), '{}'),
         coalesce((select array_agg(r.note) from public.social_reports r where r.post_id = p.id and r.state = 'open' and r.note is not null), '{}'),
         least(case when p.distribution = 'pending' then p.created_at end,
               (select min(r.created_at) from public.social_reports r where r.post_id = p.id and r.state = 'open'))
    from public.posts p
    join public.profiles pr on pr.id = p.author_id
   where p.distribution = 'pending'
      or exists (select 1 from public.social_reports r where r.post_id = p.id and r.state = 'open')
  union all
  select 'comment', c.id, c.author_id, pr.username, c.body, '{}'::text[],
         case when c.hidden then 'hidden' else 'public' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.post_comments c on c.id = r.comment_id
    join public.profiles pr on pr.id = c.author_id
   where r.state = 'open'
   group by c.id, c.author_id, pr.username, c.body, c.hidden
  union all
  select 'message', m.id, m.sender_id, pr.username, m.body, '{}'::text[],
         case when m.hidden then 'hidden' else 'public' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.messages m on m.id = r.message_id
    join public.profiles pr on pr.id = m.sender_id
   where r.state = 'open'
   group by m.id, m.sender_id, pr.username, m.body, m.hidden
  union all
  select 'member', pr.id, pr.id, pr.username, pr.bio, '{}'::text[],
         case when coalesce(mr.posting_suspended, false) then 'suspended' else 'active' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.profiles pr on pr.id = r.member_id
    left join public.member_restrictions mr on mr.user_id = pr.id
   where r.state = 'open'
   group by pr.id, pr.username, pr.bio, mr.posting_suspended
  union all
  select 'appeal', n.id, n.member_id, pr.username, n.appeal_message,
         coalesce((select p.media_paths from public.posts p where n.subject_kind = 'post' and p.id = n.subject_id), '{}'),
         n.subject_kind || ':' || n.action,
         0, array[n.reason],
         array_remove(array[n.excerpt, n.explanation], null), n.appealed_at
    from public.moderation_notices n
    join public.profiles pr on pr.id = n.member_id
   where n.appeal_state = 'open' and n.subject_kind <> 'listing'
  union all
  select 'web', w.id, null::uuid, coalesce(w.reporter_name, w.reporter_email, '—'), w.description, '{}'::text[],
         w.reason, 1, array[w.reason], array[w.content_url], w.created_at
    from public.web_reports w
   where w.state = 'open'
   order by 11;
end;
$$;
revoke execute on function public.staff_social_queue() from public, anon;
grant execute on function public.staff_social_queue() to authenticated;

create or replace function public.staff_decide_social(p_kind text, p_target uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  report_state text := case when p_action = 'dismiss' then 'dismissed' else 'actioned' end;
  n public.moderation_notices%rowtype;
  top_reason text;
begin
  perform public.require_staff();
  -- Read by the notice triggers: the staff note becomes the member's explanation.
  perform set_config('rota.moderation_note', coalesce(p_note, ''), true);
  if p_kind = 'post' then
    if p_action not in ('publish', 'limit', 'remove', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.post_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    update public.posts
       set distribution = case p_action when 'publish' then 'public' when 'limit' then 'limited'
                                        when 'remove' then 'blocked' else distribution end,
           distribution_reason = case p_action when 'publish' then null when 'dismiss' then distribution_reason
                                               else coalesce(top_reason, 'reported') end
     where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where post_id = p_target and state = 'open';
  elsif p_kind = 'comment' then
    if p_action not in ('hide', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.comment_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.post_comments set hidden = (p_action = 'hide') where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where comment_id = p_target and state = 'open';
  elsif p_kind = 'message' then
    if p_action not in ('hide', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.message_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.messages set hidden = (p_action = 'hide') where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where message_id = p_target and state = 'open';
  elsif p_kind = 'member' then
    if p_action not in ('suspend', 'dismiss') then raise exception 'invalid_action'; end if;
    if p_action = 'suspend' then
      select r.reason into top_reason from public.social_reports r
       where r.member_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
      insert into public.member_restrictions (user_id, posting_suspended, reason)
      values (p_target, true, coalesce(top_reason, 'reported'))
      on conflict (user_id) do update set posting_suspended = true, reason = excluded.reason;
    end if;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where member_id = p_target and state = 'open';
  elsif p_kind = 'appeal' then
    if p_action not in ('overturn', 'uphold') then raise exception 'invalid_action'; end if;
    select * into n from public.moderation_notices where id = p_target and appeal_state = 'open' for update;
    if not found then raise exception 'not_found'; end if;
    if p_action = 'overturn' then
      if n.subject_kind = 'post' then
        update public.posts set distribution = 'public', distribution_reason = null where id = n.subject_id;
      elsif n.subject_kind = 'comment' then
        update public.post_comments set hidden = false where id = n.subject_id;
      elsif n.subject_kind = 'message' then
        update public.messages set hidden = false where id = n.subject_id;
      elsif n.subject_kind = 'account' then
        update public.member_restrictions set posting_suspended = false where user_id = n.subject_id;
      end if;
    end if;
    update public.moderation_notices
       set appeal_state = case p_action when 'overturn' then 'overturned' else 'upheld' end,
           appeal_decided_at = now(), appeal_decided_by = me, appeal_note = left(p_note, 500)
     where id = n.id;
    perform public.notify_appeal_outcome(n.id);
  elsif p_kind = 'web' then
    if p_action not in ('actioned', 'dismiss') then raise exception 'invalid_action'; end if;
    update public.web_reports set state = report_state, decided_by = me, decided_at = now()
     where id = p_target and state = 'open';
  else
    raise exception 'invalid_kind';
  end if;
  perform public.audit(me, 'rota', 'social_' || p_kind, p_target::text, 'moderation.' || p_action, null,
                       jsonb_build_object('note', p_note));
end;
$$;
revoke execute on function public.staff_decide_social(text, uuid, text, text) from public, anon;
grant execute on function public.staff_decide_social(text, uuid, text, text) to authenticated;

-- The three-report rule (009) names the most common reason instead of "reported".
create or replace function public.social_reports_escalate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  top_reason text;
begin
  if new.post_id is not null
     and (select count(*) from public.social_reports where post_id = new.post_id) >= 3 then
    select r.reason into top_reason from public.social_reports r
     where r.post_id = new.post_id group by r.reason order by count(*) desc limit 1;
    update public.posts
      set distribution = 'limited', distribution_reason = coalesce(top_reason, 'reported')
      where id = new.post_id and distribution = 'public';
  end if;
  if new.comment_id is not null
     and (select count(*) from public.social_reports where comment_id = new.comment_id) >= 3 then
    select r.reason into top_reason from public.social_reports r
     where r.comment_id = new.comment_id group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.post_comments set hidden = true where id = new.comment_id and not hidden;
  end if;
  return new;
end;
$$;

-- Account export (007) includes the decisions about the member.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at)
                  from auth.users u where u.id = auth.uid()),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'address', (select to_jsonb(a) - 'user_id' from public.member_addresses a where a.user_id = auth.uid()),
    'preferences', (select to_jsonb(m) - 'push_token' from public.member_preferences m where m.user_id = auth.uid()),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at)
                            from public.listings l where l.owner_id = auth.uid()), '[]'),
    'posts', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at)
                         from public.posts p where p.author_id = auth.uid()), '[]'),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('post_id', c.post_id, 'body', c.body,
                          'created_at', c.created_at) order by c.created_at)
                          from public.post_comments c where c.author_id = auth.uid()), '[]'),
    'rentals', coalesce((select jsonb_agg(to_jsonb(r) - 'stripe_payment_intent_id' - 'stripe_charge_id'
                                          - 'hold_payment_intent_id' order by r.created_at)
                           from public.rentals r where auth.uid() in (r.renter_id, r.owner_id)), '[]'),
    'claims', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                          from public.claims c where auth.uid() in (c.renter_id, c.owner_id)), '[]'),
    'payment_consents', coalesce((select jsonb_agg(jsonb_build_object(
                          'rental_id', pc.rental_id, 'consent_text', pc.consent_text,
                          'consent_version', pc.consent_version, 'granted_at', pc.granted_at))
                          from public.payment_consents pc where pc.user_id = auth.uid()), '[]'),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('listing_id', cr.listing_id,
                          'reason', cr.reason, 'note', cr.note, 'created_at', cr.created_at))
                          from public.content_reports cr where cr.reporter_id = auth.uid()), '[]'),
    'appeals', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at)
                          from public.moderation_appeals a where a.owner_id = auth.uid()), '[]'),
    'moderation_decisions', coalesce((select jsonb_agg(to_jsonb(n) - 'appeal_decided_by' order by n.created_at)
                          from public.moderation_notices n where n.member_id = auth.uid()), '[]'),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'created_at', n.created_at,
                          'payload', n.payload) order by n.created_at)
                          from public.notifications n where n.user_id = auth.uid()), '[]')
  )
  where auth.uid() is not null;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Internal helpers are never callable over the API.
revoke execute on function public.notice_reason(text) from public, anon, authenticated;
revoke execute on function public.issue_moderation_notice(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.settle_notices(text, uuid) from public, anon, authenticated;
revoke execute on function public.notify_appeal_outcome(uuid) from public, anon, authenticated;
revoke execute on function public.posts_notice() from public, anon, authenticated;
revoke execute on function public.comments_notice() from public, anon, authenticated;
revoke execute on function public.messages_notice() from public, anon, authenticated;
revoke execute on function public.restrictions_notice() from public, anon, authenticated;
revoke execute on function public.listings_notice() from public, anon, authenticated;
revoke execute on function public.listing_appeal_settles_notice() from public, anon, authenticated;
revoke execute on function public.social_reports_escalate() from public, anon, authenticated;
revoke execute on function public.submit_web_report(text, text, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_web_report(text, text, text, text, text, boolean, text) to service_role;
revoke execute on function public.appeal_moderation_notice(uuid, text) from public, anon;
grant execute on function public.appeal_moderation_notice(uuid, text) to authenticated;
