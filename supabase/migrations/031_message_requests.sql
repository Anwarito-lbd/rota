-- 031: message requests. A first message from someone the recipient doesn't
-- follow waits in "Demandes" (no push, no read receipt). Conversations about a
-- listing of either member always arrive. message_policy 'following' / 'nobody'
-- refuses strangers. Read times are no longer readable by members.

alter table public.conversations
  add column if not exists a_state text not null default 'accepted',
  add column if not exists b_state text not null default 'accepted';
alter table public.conversations
  add constraint conversations_a_state check (a_state in ('accepted', 'pending', 'declined')),
  add constraint conversations_b_state check (b_state in ('accepted', 'pending', 'declined'));

alter table public.member_preferences add column if not exists push_previews boolean not null default true;
-- Members write their own preferences column by column (see 007 and 025).
grant insert (push_previews), update (push_previews) on public.member_preferences to authenticated;

-- Read times only through my_conversations().
revoke select on public.conversations from anon, authenticated;
grant select (id, member_a, member_b, listing_id, created_at, last_message_at, a_state, b_state)
  on public.conversations to authenticated;

create or replace function public.start_conversation(p_other uuid, p_listing uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  cid uuid;
  context boolean;
  followed boolean;
  other_state text;
  current_state text;
  pol text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_other is null or p_other = me then raise exception 'invalid_member'; end if;
  select message_policy into pol from public.profiles where id = p_other and deleted_at is null;
  if not found then raise exception 'invalid_member'; end if;
  if public.blocked_between(me, p_other) then raise exception 'blocked'; end if;

  -- A listing of one of the two members makes it a rental conversation.
  context := p_listing is not null
             and exists (select 1 from public.listings l where l.id = p_listing and l.owner_id in (me, p_other));
  followed := exists (select 1 from public.follows f
                       where f.follower_id = p_other and f.followee_id = me and f.status = 'accepted');
  -- A restricted sender lands in requests, but is refused exactly like any other
  -- followed member would be (never), so the restrict stays invisible.
  other_state := case
    when context then 'accepted'
    when exists (select 1 from public.member_restricts r where r.restrictor_id = p_other and r.restricted_id = me) then 'pending'
    when followed then 'accepted'
    else 'pending' end;

  a := least(me, p_other);
  b := greatest(me, p_other);
  select id, case when member_a = p_other then a_state else b_state end into cid, current_state
    from public.conversations where member_a = a and member_b = b;

  if cid is null then
    if not context and not followed and pol in ('following', 'nobody') then raise exception 'messages_closed'; end if;
    insert into public.conversations (member_a, member_b, listing_id, a_state, b_state)
    values (a, b, case when context then p_listing end,
            case when a = p_other then other_state else 'accepted' end,
            case when b = p_other then other_state else 'accepted' end)
    returning id into cid;
  else
    if current_state = 'declined' and not context then raise exception 'messages_closed'; end if;
    -- Writing to someone accepts the conversation on my side; a listing accepts both sides.
    update public.conversations
       set listing_id = case when context then p_listing else listing_id end,
           a_state = case when member_a = me or context then 'accepted' else a_state end,
           b_state = case when member_b = me or context then 'accepted' else b_state end
     where id = cid;
  end if;
  return cid;
end $$;

create or replace function public.accept_message_request(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversations
     set a_state = case when member_a = auth.uid() then 'accepted' else a_state end,
         b_state = case when member_b = auth.uid() then 'accepted' else b_state end
   where id = p_conversation and auth.uid() in (member_a, member_b);
$$;

create or replace function public.decline_message_request(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversations
     set a_state = case when member_a = auth.uid() and a_state = 'pending' then 'declined' else a_state end,
         b_state = case when member_b = auth.uid() and b_state = 'pending' then 'declined' else b_state end
   where id = p_conversation and auth.uid() in (member_a, member_b);
$$;

-- Never write into a conversation the other side declined.
drop policy if exists "Members write in their conversations, never across a block" on public.messages;
create policy "Members write in their conversations, never across a block" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.conversations c
                 where c.id = messages.conversation_id
                   and (select auth.uid()) in (c.member_a, c.member_b)
                   and not public.blocked_between(c.member_a, c.member_b)
                   and (case when c.member_a = (select auth.uid()) then c.b_state else c.a_state end) <> 'declined')
    and not public.posting_suspended());

-- No push while it is a request; no text when previews are off.
create or replace function public.messages_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  other uuid;
  other_state text;
  previews boolean;
begin
  select case when c.member_a = new.sender_id then c.member_b else c.member_a end,
         case when c.member_a = new.sender_id then c.b_state else c.a_state end
    into other, other_state
    from public.conversations c where c.id = new.conversation_id;
  if other_state <> 'accepted' then return null; end if;
  select coalesce(mp.push_previews, true) into previews from public.member_preferences mp where mp.user_id = other;
  perform public.notify_social(other, new.sender_id, 'message_received', 'message:' || new.id::text,
    jsonb_build_object('conversation', new.conversation_id,
                       'preview', case when new.kind = 'text' and coalesce(previews, true) then left(new.body, 80) end,
                       'message_kind', new.kind));
  return null;
end $$;

-- The inbox: requests flagged, declined ones gone.
drop function if exists public.my_conversations();
create function public.my_conversations()
returns table (conversation_id uuid, other_id uuid, other_username text, other_avatar text, other_verified boolean,
               listing_id uuid, last_body text, last_kind text, last_sender uuid,
               last_message_at timestamptz, unread integer, blocked boolean, request boolean)
language sql stable security definer set search_path = '' as $$
  select c.id,
         o.id, o.username, o.avatar_url, o.identity_status = 'verified',
         c.listing_id,
         lm.body, lm.kind, lm.sender_id, c.last_message_at,
         (select count(*)::integer from public.messages m
           where m.conversation_id = c.id and m.sender_id <> auth.uid() and not m.hidden
             and m.created_at > coalesce(case when c.member_a = auth.uid() then c.a_read_at else c.b_read_at end, 'epoch')),
         public.blocked_between(c.member_a, c.member_b),
         (case when c.member_a = auth.uid() then c.a_state else c.b_state end) = 'pending'
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = auth.uid() then c.member_b else c.member_a end
    left join lateral (
      select m.body, m.kind, m.sender_id from public.messages m
       where m.conversation_id = c.id and not m.hidden
       order by m.created_at desc limit 1) lm on true
   where auth.uid() in (c.member_a, c.member_b)
     and (case when c.member_a = auth.uid() then c.a_state else c.b_state end) <> 'declined'
   order by c.last_message_at desc
   limit 200;
$$;

revoke execute on function public.accept_message_request(uuid), public.decline_message_request(uuid),
  public.my_conversations() from public, anon;
grant execute on function public.accept_message_request(uuid), public.decline_message_request(uuid),
  public.my_conversations() to authenticated;
revoke execute on function public.messages_push() from public, anon, authenticated;
