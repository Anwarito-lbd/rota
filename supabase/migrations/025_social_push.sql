-- ═════════════════════════════════════════════════════════════
-- Rota — 025 Push notifications for messages and the social layer
--
-- Until now only rentals, reminders and claims sent a push. New messages,
-- likes, new followers, reviews, replies and reposts now create a
-- notification too (push only, never an e-mail). Members choose in
-- Réglages › Notifications push: "Messages" and "Likes, abonnés et avis",
-- both on by default once push is on. Blocks and self-actions never notify.
-- ═════════════════════════════════════════════════════════════

alter table public.member_preferences
  add column if not exists push_messages boolean not null default true,
  add column if not exists push_social boolean not null default true;
grant insert (push_messages, push_social), update (push_messages, push_social) on public.member_preferences to authenticated;

create or replace function public.notification_category(p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_kind in ('return_due_soon', 'claim_window_open', 'payout_setup_required') then 'reminders'
    when p_kind in ('claim_opened', 'claim_decided', 'claim_paid', 'non_return_review',
                    'late_fees_started', 'return_overdue', 'charge_failed') then 'claims'
    when p_kind = 'message_received' then 'messages'
    when p_kind like 'social\_%' then 'social'
    else 'bookings'
  end;
$$;
revoke execute on function public.notification_category(text) from public, anon, authenticated;

create or replace function public.claim_push_notifications(p_limit integer default 50)
returns table (
  id uuid, kind text, payload jsonb, token text, lang text, username text,
  listing_title text, start_date date, end_date date)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.notifications n set push_state = 'skipped'
   where n.push_state = 'pending'
     and (n.created_at < now() - interval '1 day'
          or not exists (
            select 1 from public.member_preferences mp
             where mp.user_id = n.user_id and mp.push_enabled and mp.push_token is not null
               and case public.notification_category(n.kind)
                     when 'reminders' then mp.push_reminders
                     when 'claims' then mp.push_claims
                     when 'messages' then mp.push_messages
                     when 'social' then mp.push_social
                     else mp.push_bookings end));

  return query
  with picked as (
    update public.notifications n set push_state = 'sending'
     where n.id in (select x.id from public.notifications x
                     where x.push_state = 'pending'
                     order by x.created_at limit greatest(1, least(p_limit, 100))
                     for update skip locked)
    returning n.*)
  select p.id, p.kind, p.payload, mp.push_token, pr.lang, pr.username, l.title, r.start_date, r.end_date
    from picked p
    join public.member_preferences mp on mp.user_id = p.user_id
    join public.profiles pr on pr.id = p.user_id
    left join public.rentals r on r.id = p.rental_id
    left join public.listings l on l.id = r.listing_id;
end;
$$;
revoke execute on function public.claim_push_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(integer) to service_role;

-- One helper for every social push: never to yourself, never across a block,
-- never to a closed account, never an e-mail.
create function public.notify_social(p_user uuid, p_actor uuid, p_kind text, p_key text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor or public.blocked_between(p_user, p_actor) then
    return;
  end if;
  if exists (select 1 from public.profiles where id = p_user and deleted_at is not null) then
    return;
  end if;
  insert into public.notifications (user_id, kind, payload, dedupe_key, email_state)
  select p_user, p_kind,
         p_payload || jsonb_build_object('actor', pr.username),
         p_key, 'skipped'
    from public.profiles pr where pr.id = p_actor
  on conflict (dedupe_key) do nothing;
end;
$$;
revoke execute on function public.notify_social(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

create function public.messages_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
begin
  select case when c.member_a = new.sender_id then c.member_b else c.member_a end into other
    from public.conversations c where c.id = new.conversation_id;
  perform public.notify_social(other, new.sender_id, 'message_received', 'message:' || new.id::text,
    jsonb_build_object('conversation', new.conversation_id,
                       'preview', case when new.kind = 'text' then left(new.body, 80) else null end,
                       'message_kind', new.kind));
  return null;
end;
$$;
create trigger messages_push after insert on public.messages
  for each row execute function public.messages_push();

create function public.post_likes_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_social(p.author_id, new.user_id, 'social_like',
    'like:' || new.post_id::text || ':' || new.user_id::text, jsonb_build_object('post', new.post_id))
    from public.posts p where p.id = new.post_id;
  return null;
end;
$$;
create trigger post_likes_push after insert on public.post_likes
  for each row execute function public.post_likes_push();

create function public.follows_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_social(new.followee_id, new.follower_id, 'social_follow',
    'follow:' || new.follower_id::text || ':' || new.followee_id::text, '{}'::jsonb);
  return null;
end;
$$;
create trigger follows_push after insert on public.follows
  for each row execute function public.follows_push();

create function public.post_comments_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is null then
    perform public.notify_social(p.author_id, new.author_id, 'social_review', 'review:' || new.id::text,
      jsonb_build_object('post', new.post_id, 'rating', new.rating, 'preview', left(new.body, 80)))
      from public.posts p where p.id = new.post_id;
  else
    perform public.notify_social(c.author_id, new.author_id, 'social_reply', 'reply:' || new.id::text,
      jsonb_build_object('post', new.post_id, 'preview', left(new.body, 80)))
      from public.post_comments c where c.id = new.parent_id;
  end if;
  return null;
end;
$$;
create trigger post_comments_push after insert on public.post_comments
  for each row execute function public.post_comments_push();

create function public.reposts_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_social(p.author_id, new.user_id, 'social_repost',
    'repost:' || new.post_id::text || ':' || new.user_id::text, jsonb_build_object('post', new.post_id))
    from public.posts p where p.id = new.post_id;
  return null;
end;
$$;
create trigger reposts_push after insert on public.reposts
  for each row execute function public.reposts_push();

revoke execute on function public.messages_push() from public, anon, authenticated;
revoke execute on function public.post_likes_push() from public, anon, authenticated;
revoke execute on function public.follows_push() from public, anon, authenticated;
revoke execute on function public.post_comments_push() from public, anon, authenticated;
revoke execute on function public.reposts_push() from public, anon, authenticated;
