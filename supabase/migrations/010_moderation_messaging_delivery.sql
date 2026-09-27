-- 010 — Finishing the core: moderation of the social layer, in-app
-- messaging, and a server switch for Rota Delivery.
--
--   * Staff review pending posts and every report on posts, comments,
--     members and messages from the Admin screen, oldest first (the
--     community rules promise action within 24 hours). Every decision is in
--     the audit log.
--   * Members message each other inside Rota, one conversation per pair of
--     members. Nobody can message across a block or while suspended, and a
--     message can be reported like anything else.
--   * Rota Delivery stays off until labels and tracking exist: the booking
--     function refuses delivery = 'ship' while flag_rota_delivery is false.

-- ─────────────────────────────────────────────────────────────
-- 1. Reports get a state, and can target a message
-- ─────────────────────────────────────────────────────────────
alter table public.social_reports
  add column state text not null default 'open' check (state in ('open', 'actioned', 'dismissed')),
  add column decided_by uuid references public.profiles (id) on delete set null,
  add column decided_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 2. Messaging
-- ─────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- The two members, stored in a fixed order so a pair has one conversation.
  member_a uuid not null references public.profiles (id) on delete cascade,
  member_b uuid not null references public.profiles (id) on delete cascade,
  -- The piece it started from, if any; shown as context in the thread.
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  a_read_at timestamptz,
  b_read_at timestamptz,
  check (member_a < member_b),
  unique (member_a, member_b)
);

create index conversations_a on public.conversations (member_a, last_message_at desc);
create index conversations_b on public.conversations (member_b, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'meetpoint')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  -- For a meeting-point proposal: { "place": "...", "area": "..." }. A public
  -- place from Rota's list, never a home address.
  meta jsonb,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation on public.messages (conversation_id, created_at);

alter table public.social_reports
  add column message_id uuid references public.messages (id) on delete cascade;

-- Exactly one target, now including messages.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.social_reports'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%num_nonnulls%'
  loop
    execute format('alter table public.social_reports drop constraint %I', c);
  end loop;
end;
$$;

alter table public.social_reports
  add constraint social_reports_one_target
  check (num_nonnulls(post_id, comment_id, member_id, message_id) = 1);

create unique index social_reports_once_message
  on public.social_reports (reporter_id, message_id) where message_id is not null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create function public.is_conversation_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation and (select auth.uid()) in (c.member_a, c.member_b)
  );
$$;

revoke execute on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create policy "Members see their own conversations"
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (member_a, member_b));

create policy "Members see messages in their conversations"
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id) and (not hidden or sender_id = (select auth.uid())));

create policy "Members write in their conversations, never across a block"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.member_a, c.member_b)
        and not public.blocked_between(c.member_a, c.member_b)
    )
    and not exists (
      select 1 from public.member_restrictions r
      where r.user_id = (select auth.uid()) and r.posting_suspended
    )
  );

-- Conversations are created by start_conversation() only; members read them
-- and mark them read through mark_conversation_read().
revoke all on public.conversations, public.messages from anon, authenticated;
grant select on public.conversations, public.messages to authenticated;
grant insert (conversation_id, kind, body, meta) on public.messages to authenticated;

-- Reporting a message: the reporter must be in the conversation and not
-- its sender. Replaces the 009 policy with the message case added.
drop policy if exists "Members report what they can see, never themselves" on public.social_reports;
create policy "Members report what they can see, never themselves"
  on public.social_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (member_id is null or member_id <> (select auth.uid()))
    and (post_id is null or exists (
      select 1 from public.posts p where p.id = post_id and p.author_id <> (select auth.uid())))
    and (comment_id is null or exists (
      select 1 from public.post_comments c where c.id = comment_id and c.author_id <> (select auth.uid())))
    and (message_id is null or exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id <> (select auth.uid())
        and public.is_conversation_member(m.conversation_id)))
  );

grant insert (message_id) on public.social_reports to authenticated;

create function public.start_conversation(p_other uuid, p_listing uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  cid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_other is null or p_other = me then raise exception 'invalid_member'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then raise exception 'invalid_member'; end if;
  if public.blocked_between(me, p_other) then raise exception 'blocked'; end if;
  a := least(me, p_other);
  b := greatest(me, p_other);
  select id into cid from public.conversations where member_a = a and member_b = b;
  if cid is null then
    insert into public.conversations (member_a, member_b, listing_id)
    values (a, b, p_listing)
    returning id into cid;
  elsif p_listing is not null then
    update public.conversations set listing_id = p_listing where id = cid;
  end if;
  return cid;
end;
$$;

revoke execute on function public.start_conversation(uuid, uuid) from public, anon;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

create function public.mark_conversation_read(p_conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
     set a_read_at = case when member_a = auth.uid() then now() else a_read_at end,
         b_read_at = case when member_b = auth.uid() then now() else b_read_at end
   where id = p_conversation and auth.uid() in (member_a, member_b);
$$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create function public.messages_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         a_read_at = case when member_a = new.sender_id then new.created_at else a_read_at end,
         b_read_at = case when member_b = new.sender_id then new.created_at else b_read_at end
   where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.messages_touch_conversation();

-- The inbox: one row per conversation, with the other member's public
-- profile, the last message and an unread count.
create function public.my_conversations()
returns table (
  conversation_id uuid, other_id uuid, other_username text, other_avatar text,
  other_verified boolean, listing_id uuid, last_body text, last_kind text,
  last_sender uuid, last_message_at timestamptz, unread integer, blocked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         o.id, o.username, o.avatar_url, o.identity_status = 'verified',
         c.listing_id,
         lm.body, lm.kind, lm.sender_id, c.last_message_at,
         (select count(*)::integer from public.messages m
           where m.conversation_id = c.id and m.sender_id <> auth.uid() and not m.hidden
             and m.created_at > coalesce(case when c.member_a = auth.uid() then c.a_read_at else c.b_read_at end, 'epoch')),
         public.blocked_between(c.member_a, c.member_b)
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = auth.uid() then c.member_b else c.member_a end
    left join lateral (
      select m.body, m.kind, m.sender_id from public.messages m
       where m.conversation_id = c.id and not m.hidden
       order by m.created_at desc limit 1) lm on true
   where auth.uid() in (c.member_a, c.member_b)
   order by c.last_message_at desc
   limit 200;
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- New messages reach the other phone in real time (RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Staff: the social moderation queue
-- ─────────────────────────────────────────────────────────────
create function public.staff_social_queue()
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
  -- Posts waiting for review, or reported.
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
  -- Reported comments.
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
  -- Reported messages.
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
  -- Reported members.
  select 'member', pr.id, pr.id, pr.username, pr.bio, '{}'::text[],
         case when coalesce(mr.posting_suspended, false) then 'suspended' else 'active' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.profiles pr on pr.id = r.member_id
    left join public.member_restrictions mr on mr.user_id = pr.id
   where r.state = 'open'
   group by pr.id, pr.username, pr.bio, mr.posting_suspended
   order by 11;
end;
$$;

revoke execute on function public.staff_social_queue() from public, anon;
grant execute on function public.staff_social_queue() to authenticated;

-- One decision per target. p_action:
--   post     → 'publish' | 'limit' | 'remove' | 'dismiss'
--   comment  → 'hide' | 'dismiss'
--   message  → 'hide' | 'dismiss'
--   member   → 'suspend' | 'dismiss'
create function public.staff_decide_social(p_kind text, p_target uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  report_state text := case when p_action = 'dismiss' then 'dismissed' else 'actioned' end;
begin
  perform public.require_staff();

  if p_kind = 'post' then
    if p_action not in ('publish', 'limit', 'remove', 'dismiss') then raise exception 'invalid_action'; end if;
    update public.posts
       set distribution = case p_action when 'publish' then 'public' when 'limit' then 'limited'
                                        when 'remove' then 'blocked' else distribution end,
           distribution_reason = case p_action when 'publish' then null when 'dismiss' then distribution_reason
                                               else coalesce(p_note, 'reported') end
     where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where post_id = p_target and state = 'open';
  elsif p_kind = 'comment' then
    if p_action not in ('hide', 'dismiss') then raise exception 'invalid_action'; end if;
    update public.post_comments set hidden = (p_action = 'hide') where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where comment_id = p_target and state = 'open';
  elsif p_kind = 'message' then
    if p_action not in ('hide', 'dismiss') then raise exception 'invalid_action'; end if;
    update public.messages set hidden = (p_action = 'hide') where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where message_id = p_target and state = 'open';
  elsif p_kind = 'member' then
    if p_action not in ('suspend', 'dismiss') then raise exception 'invalid_action'; end if;
    if p_action = 'suspend' then
      insert into public.member_restrictions (user_id, posting_suspended, reason)
      values (p_target, true, coalesce(p_note, 'reported'))
      on conflict (user_id) do update set posting_suspended = true, reason = excluded.reason;
    end if;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where member_id = p_target and state = 'open';
  else
    raise exception 'invalid_kind';
  end if;

  perform public.audit(me, 'rota', 'social_' || p_kind, p_target::text, 'moderation.' || p_action, null,
                       jsonb_build_object('note', p_note));
end;
$$;

revoke execute on function public.staff_decide_social(text, uuid, text, text) from public, anon;
grant execute on function public.staff_decide_social(text, uuid, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Rota Delivery switch
-- ─────────────────────────────────────────────────────────────
insert into public.policy_config (key, value, note) values
  ('flag_rota_delivery', 'false',
   'Rota Delivery (prepaid labels + tracking). Off until the carrier integration ships; see docs/DELIVERY.md.')
on conflict (key) do nothing;

create function public.rentals_require_delivery_enabled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.delivery = 'ship'
     and coalesce((select (value #>> '{}')::boolean from public.policy_config where key = 'flag_rota_delivery'), false) = false then
    raise exception 'delivery_unavailable';
  end if;
  return new;
end;
$$;

create trigger rentals_require_delivery_enabled
  before insert on public.rentals
  for each row execute function public.rentals_require_delivery_enabled();
