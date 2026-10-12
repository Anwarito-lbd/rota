-- 031c: close two ways to tell a message was shadow-dropped.
-- 1. The shadow-drop gets its own column, `shadowed`, that members can't read. `hidden`
--    stays moderation's: un-hiding a message never exposes a shadow-dropped one.
--    Existing rows: none to move (checked live before applying: 0 hidden messages,
--    0 declined conversations), so nothing is rewritten here.
-- 2. conversations.last_message_at is no longer readable by members (the app reads it
--    only through my_conversations()).

alter table public.messages add column if not exists shadowed boolean not null default false;

-- Column grants instead of table-level SELECT: everything but `shadowed`.
revoke select on public.messages from anon, authenticated;
grant select (id, conversation_id, sender_id, kind, body, meta, hidden, created_at)
  on public.messages to authenticated;

revoke select (last_message_at) on public.conversations from authenticated;

drop policy if exists "Members see messages in their conversations" on public.messages;
create policy "Members see messages in their conversations" on public.messages
  for select to authenticated using (
    public.is_conversation_member(conversation_id)
    and ((not hidden and not shadowed) or sender_id = (select auth.uid())));

create or replace function public.messages_shadow_drop()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.conversations c
              where c.id = new.conversation_id
                and (case when c.member_a = new.sender_id then c.b_state else c.a_state end) = 'declined') then
    new.shadowed := true;
  end if;
  return new;
end $$;
revoke execute on function public.messages_shadow_drop() from public, anon, authenticated;

create or replace function public.messages_touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_at = case when new.hidden or new.shadowed then last_message_at else new.created_at end,
         a_read_at = case when member_a = new.sender_id then new.created_at else a_read_at end,
         b_read_at = case when member_b = new.sender_id then new.created_at else b_read_at end,
         a_state = case when member_a = new.sender_id then 'accepted' else a_state end,
         b_state = case when member_b = new.sender_id then 'accepted' else b_state end
   where id = new.conversation_id;
  return null;
end $$;
revoke execute on function public.messages_touch_conversation() from public, anon, authenticated;

create or replace function public.messages_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  other uuid;
  other_state text;
  previews boolean;
begin
  if new.hidden or new.shadowed then return null; end if;
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

-- The recipient's view skips shadowed messages; the sender's view includes their own.
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
           where m.conversation_id = c.id and m.sender_id <> auth.uid() and not m.hidden and not m.shadowed
             and m.created_at > coalesce(case when c.member_a = auth.uid() then c.a_read_at else c.b_read_at end, 'epoch')),
         public.blocked_between(c.member_a, c.member_b),
         (case when c.member_a = auth.uid() then c.a_state else c.b_state end) = 'pending'
    from public.conversations c
    join public.profiles o on o.id = case when c.member_a = auth.uid() then c.member_b else c.member_a end
    left join lateral (
      select m.body, m.kind, m.sender_id, m.created_at from public.messages m
       where m.conversation_id = c.id and ((not m.hidden and not m.shadowed) or m.sender_id = auth.uid())
       order by m.created_at desc limit 1) lm on true
   where auth.uid() in (c.member_a, c.member_b)
     and (case when c.member_a = auth.uid() then c.a_state else c.b_state end) <> 'declined'
   order by greatest(c.last_message_at, lm.created_at) desc
   limit 200;
$$;
