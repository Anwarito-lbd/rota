-- 031b: review fixes for message requests.
-- C1: a declined side is never changed by the other member, listing or not.
-- I1: request states are no longer readable by members. Writing into a conversation the
--     other side declined still "works" for the sender, but the message is shadow-hidden:
--     no push, never shown to the recipient, nothing tells the sender.
-- I2: listing context only for the recipient's live listing, or the sender's own listing
--     the recipient made an offer on or rented. Restrict wins over context.
-- m2: replying from a request accepts it.

revoke select (a_state, b_state) on public.conversations from authenticated;

create or replace function public.start_conversation(p_other uuid, p_listing uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  cid uuid;
  context boolean;
  followed boolean;
  restricted boolean;
  other_state text;
  pol text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_other is null or p_other = me then raise exception 'invalid_member'; end if;
  select message_policy into pol from public.profiles where id = p_other and deleted_at is null;
  if not found then raise exception 'invalid_member'; end if;
  if public.blocked_between(me, p_other) then raise exception 'blocked'; end if;

  -- Rental context: the recipient's live listing, or my listing they made an offer on or rented.
  context := p_listing is not null and (
    exists (select 1 from public.listings l
             where l.id = p_listing and l.owner_id = p_other
               and l.status = 'active' and l.distribution in ('public', 'limited'))
    or exists (select 1 from public.listings l
                where l.id = p_listing and l.owner_id = me
                  and (exists (select 1 from public.offers o where o.listing_id = l.id and o.renter_id = p_other)
                       or exists (select 1 from public.rentals r where r.listing_id = l.id and r.renter_id = p_other))));
  followed := exists (select 1 from public.follows f
                       where f.follower_id = p_other and f.followee_id = me and f.status = 'accepted');
  restricted := exists (select 1 from public.member_restricts r where r.restrictor_id = p_other and r.restricted_id = me);
  -- Restrict first: a restricted sender always lands in requests.
  other_state := case when restricted then 'pending'
                      when context or followed then 'accepted'
                      else 'pending' end;

  a := least(me, p_other);
  b := greatest(me, p_other);
  select id into cid from public.conversations where member_a = a and member_b = b;

  if cid is null then
    -- A visible policy, like "you can't message this account". A restricted member the
    -- recipient follows is never refused, so the restrict stays invisible.
    if not context and not followed and pol in ('following', 'nobody') then raise exception 'messages_closed'; end if;
    insert into public.conversations (member_a, member_b, listing_id, a_state, b_state)
    values (a, b, case when context then p_listing end,
            case when a = p_other then other_state else 'accepted' end,
            case when b = p_other then other_state else 'accepted' end)
    returning id into cid;
  else
    -- My side becomes accepted. The other side moves only from pending to accepted, and
    -- only with context; a declined side never changes (the sender is not told).
    update public.conversations
       set listing_id = case when context then p_listing else listing_id end,
           a_state = case when member_a = me then 'accepted'
                          when a_state = 'pending' and context and other_state = 'accepted' then 'accepted'
                          else a_state end,
           b_state = case when member_b = me then 'accepted'
                          when b_state = 'pending' and context and other_state = 'accepted' then 'accepted'
                          else b_state end
     where id = cid;
  end if;
  return cid;
end $$;

-- Who may write: a member, no block, not suspended. Says nothing about the other side's
-- state, and nothing at all about conversations the caller isn't in.
create or replace function public.can_write_conversation(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c
                  where c.id = p_conversation
                    and (select auth.uid()) in (c.member_a, c.member_b)
                    and not public.blocked_between(c.member_a, c.member_b))
         and not public.posting_suspended();
$$;
revoke execute on function public.can_write_conversation(uuid) from public, anon;
grant execute on function public.can_write_conversation(uuid) to authenticated;

drop policy if exists "Members write in their conversations, never across a block" on public.messages;
create policy "Members write in their conversations, never across a block" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and public.can_write_conversation(conversation_id));

-- Shadow-drop: a message into a conversation the other side declined is hidden at birth.
-- The sender still sees it (select policy), the recipient never does.
create or replace function public.messages_shadow_drop()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.conversations c
              where c.id = new.conversation_id
                and (case when c.member_a = new.sender_id then c.b_state else c.a_state end) = 'declined') then
    new.hidden := true;
  end if;
  return new;
end $$;
revoke execute on function public.messages_shadow_drop() from public, anon, authenticated;

drop trigger if exists messages_shadow_drop on public.messages;
create trigger messages_shadow_drop before insert on public.messages
  for each row execute function public.messages_shadow_drop();

-- Hidden messages bump nothing the recipient could see. Writing accepts my own side,
-- so replying from a request accepts it.
create or replace function public.messages_touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_at = case when new.hidden then last_message_at else new.created_at end,
         a_read_at = case when member_a = new.sender_id then new.created_at else a_read_at end,
         b_read_at = case when member_b = new.sender_id then new.created_at else b_read_at end,
         a_state = case when member_a = new.sender_id then 'accepted' else a_state end,
         b_state = case when member_b = new.sender_id then 'accepted' else b_state end
   where id = new.conversation_id;
  return null;
end $$;
revoke execute on function public.messages_touch_conversation() from public, anon, authenticated;

-- No push for hidden messages or requests; no text when previews are off.
create or replace function public.messages_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  other uuid;
  other_state text;
  previews boolean;
begin
  if new.hidden then return null; end if;
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
revoke execute on function public.messages_push() from public, anon, authenticated;

-- The inbox shows my own shadow-hidden messages to me (as the thread does), so a decline
-- never shows on the sender's side; the recipient's view only counts visible messages.
create or replace function public.my_conversations()
returns table (conversation_id uuid, other_id uuid, other_username text, other_avatar text, other_verified boolean,
               listing_id uuid, last_body text, last_kind text, last_sender uuid,
               last_message_at timestamptz, unread integer, blocked boolean, request boolean)
language sql stable security definer set search_path = '' as $$
  select c.id,
         o.id, o.username, o.avatar_url, o.identity_status = 'verified',
         c.listing_id,
         lm.body, lm.kind, lm.sender_id, greatest(c.last_message_at, lm.created_at),
         (select count(*)::integer from public.messages m
           where m.conversation_id = c.id and m.sender_id <> auth.uid() and not m.hidden
             and m.created_at > coalesce(case when c.member_a = auth.uid() then c.a_read_at else c.b_read_at end, 'epoch')),
         public.blocked_between(c.member_a, c.member_b),
         (case when c.member_a = auth.uid() then c.a_state else c.b_state end) = 'pending'
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = auth.uid() then c.member_b else c.member_a end
    left join lateral (
      select m.body, m.kind, m.sender_id, m.created_at from public.messages m
       where m.conversation_id = c.id and (not m.hidden or m.sender_id = auth.uid())
       order by m.created_at desc limit 1) lm on true
   where auth.uid() in (c.member_a, c.member_b)
     and (case when c.member_a = auth.uid() then c.a_state else c.b_state end) <> 'declined'
   order by greatest(c.last_message_at, lm.created_at) desc
   limit 200;
$$;
