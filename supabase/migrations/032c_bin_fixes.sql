-- 032c: review fixes for the bin and highlights.
-- * One purge predicate (purge_item_due) used by purge_due and purge_done. It
--   waits for open appeals of any age, recent notices, open reports, and posts
--   still pending review. purge_done re-checks it and says whether it deleted.
-- * A story blocked by moderation or deleted leaves every highlight at once.
-- * Highlights fold duplicate story ids, first occurrence kept.
-- * my_activity and board items forget posts in the bin or blocked.
-- * The member RPCs return true when they changed a row; direct DELETE on
--   posts and stories is revoked.

-- ── Indexes ─────────────────────────────────────────────────────
create index if not exists story_highlights_story_ids on public.story_highlights using gin (story_ids);
create index if not exists stories_expiry_live on public.stories (expires_at) where deleted_at is null;

-- ── Deletion only through the bin ───────────────────────────────
revoke delete on public.posts, public.stories from authenticated;

-- ── Highlights: fold duplicates, first occurrence kept ──────────
create or replace function public.story_highlights_from_stories()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  paths text[];
begin
  new.story_ids := coalesce((select array_agg(d.sid order by d.ord)
                               from (select u.sid, min(u.ord) as ord
                                       from unnest(new.story_ids) with ordinality u (sid, ord)
                                      group by u.sid) d), '{}');
  if exists (select 1 from unnest(new.story_ids) sid
              where (tg_op = 'INSERT' or not (sid = any (old.story_ids)))
                and not exists (select 1 from public.stories s
                                 where s.id = sid and s.author_id = new.owner_id
                                   and s.distribution = 'public' and s.deleted_at is null)) then
    raise exception 'story_not_yours';
  end if;
  select array_agg(s.media_path order by array_position(new.story_ids, s.id)) into paths
    from public.stories s where s.id = any (new.story_ids);
  new.media_paths := paths;
  return new;
end $$;
revoke execute on function public.story_highlights_from_stories() from public, anon, authenticated;

-- ── A story that stops being public or is deleted leaves highlights ──
create or replace function public.stories_leave_highlights()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.story_highlights where story_ids <@ array[new.id];
  update public.story_highlights set story_ids = array_remove(story_ids, new.id)
   where story_ids @> array[new.id];
  return null;
end $$;
drop trigger if exists stories_leave_highlights on public.stories;
create trigger stories_leave_highlights after update of distribution, deleted_at on public.stories
  for each row when (new.distribution <> 'public' or new.deleted_at is not null)
  execute function public.stories_leave_highlights();
revoke execute on function public.stories_leave_highlights() from public, anon, authenticated;

-- ── Member RPCs return whether they changed a row ───────────────
drop function if exists public.delete_post(uuid);
drop function if exists public.restore_post(uuid);
drop function if exists public.delete_story(uuid);
drop function if exists public.restore_story(uuid);

create function public.delete_post(p_post uuid)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update public.posts set deleted_at = now()
     where id = p_post and author_id = auth.uid() and deleted_at is null
    returning 1)
  select exists (select 1 from u);
$$;

create function public.restore_post(p_post uuid)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update public.posts set deleted_at = null
     where id = p_post and author_id = auth.uid() and deleted_at > now() - interval '30 days'
    returning 1)
  select exists (select 1 from u);
$$;

-- stories_leave_highlights takes the story out of its highlights.
create function public.delete_story(p_story uuid)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update public.stories set deleted_at = now()
     where id = p_story and author_id = auth.uid() and deleted_at is null
    returning 1)
  select exists (select 1 from u);
$$;

create function public.restore_story(p_story uuid)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update public.stories set deleted_at = null
     where id = p_story and author_id = auth.uid() and deleted_at > now() - interval '30 days'
    returning 1)
  select exists (select 1 from u);
$$;

revoke execute on function public.delete_post(uuid), public.restore_post(uuid), public.delete_story(uuid),
  public.restore_story(uuid) from public, anon, service_role;
grant execute on function public.delete_post(uuid), public.restore_post(uuid), public.delete_story(uuid),
  public.restore_story(uuid) to authenticated;

-- ── my_activity: posts in the bin or blocked are gone (030 otherwise) ──
create or replace function public.my_activity(p_limit integer default 60)
returns table (kind text, actor_id uuid, actor_username text, actor_avatar text, post_id uuid, media text, body text,
               created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'like'::text, l.user_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], null::text, l.created_at
      from public.post_likes l join public.posts p on p.id = l.post_id join public.profiles pr on pr.id = l.user_id
     where p.author_id = auth.uid() and l.user_id <> auth.uid()
       and p.deleted_at is null and p.distribution <> 'blocked'
    union all
    select case when c.parent_id is null then 'comment' else 'reply' end, c.author_id, pr.username, pr.avatar_url,
           p.id, p.media_paths[1], c.body, c.created_at
      from public.post_comments c join public.posts p on p.id = c.post_id join public.profiles pr on pr.id = c.author_id
     where c.author_id <> auth.uid() and not c.hidden and c.visibility = 'public'
       and p.deleted_at is null and p.distribution <> 'blocked'
       and (p.author_id = auth.uid()
            or exists (select 1 from public.post_comments parent
                        where parent.id = c.parent_id and parent.author_id = auth.uid()))
    union all
    select 'repost', r.user_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], null, r.created_at
      from public.reposts r join public.posts p on p.id = r.post_id join public.profiles pr on pr.id = r.user_id
     where p.author_id = auth.uid()
       and p.deleted_at is null and p.distribution <> 'blocked'
    union all
    select 'follow', f.follower_id, pr.username, pr.avatar_url, null, null, null, f.created_at
      from public.follows f join public.profiles pr on pr.id = f.follower_id
     where f.followee_id = auth.uid() and f.status = 'accepted'
  ) a (kind, actor_id, actor_username, actor_avatar, post_id, media, body, created_at)
  where auth.uid() is not null and not public.blocked_between(auth.uid(), a.actor_id)
  order by a.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

-- ── Board items: a saved post shows only while the caller may see it ──
drop policy if exists "Board items follow their board" on public.board_items;
create policy "Board items follow their board" on public.board_items
  for select to authenticated using (
    exists (select 1 from public.boards b where b.id = board_items.board_id)
    and (post_id is null or exists (select 1 from public.posts p where p.id = board_items.post_id)));

-- ── Purge: one predicate, used by the queue and by the delete ───
-- Internal: runs inside purge_due and purge_done (owner rights), members
-- and the API cannot call it.
create or replace function public.purge_item_due(p_kind text, p_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select case p_kind
    when 'post' then exists (
      select 1 from public.posts p
       where p.id = p_id
         and p.deleted_at < now() - interval '30 days'
         and p.distribution <> 'pending'
         and not exists (select 1 from public.social_reports r where r.post_id = p.id and r.state = 'open'))
    when 'story' then exists (
      select 1 from public.stories s
       where s.id = p_id
         and (s.deleted_at < now() - interval '30 days'
              or (s.deleted_at is null and s.expires_at < now() - interval '30 days'))
         and not exists (select 1 from public.story_highlights h where h.story_ids @> array[s.id])
         and not exists (select 1 from public.social_reports r where r.story_id = s.id and r.state = 'open'))
    else false
  end
  and not exists (
    select 1 from public.moderation_notices n
     where n.subject_kind = p_kind and n.subject_id = p_id
       and (n.appeal_state = 'open'
            or coalesce(n.appeal_decided_at, n.created_at) > now() - interval '6 months'));
$$;
revoke execute on function public.purge_item_due(text, uuid) from public, anon, authenticated, service_role;

create or replace function public.purge_due(p_limit integer default 50)
returns table (kind text, id uuid, paths text[])
language sql stable security definer set search_path = '' as $$
  select due.kind, due.id, due.paths from (
    select 'post'::text, p.id, p.media_paths
      from public.posts p
     where p.deleted_at < now() - interval '30 days'
    union all
    select 'story', s.id, array[s.media_path]
      from public.stories s
     where s.deleted_at < now() - interval '30 days'
    union all
    select 'story', s.id, array[s.media_path]
      from public.stories s
     where s.deleted_at is null and s.expires_at < now() - interval '30 days'
  ) due (kind, id, paths)
  where public.purge_item_due(due.kind, due.id)
  limit greatest(1, least(p_limit, 200));
$$;

drop function if exists public.purge_done(text, uuid);
create function public.purge_done(p_kind text, p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'post' then
    perform 1 from public.posts where id = p_id for update;
  elsif p_kind = 'story' then
    perform 1 from public.stories where id = p_id for update;
  else
    return false;
  end if;
  if not found or not public.purge_item_due(p_kind, p_id) then
    return false;
  end if;
  if p_kind = 'post' then
    delete from public.posts where id = p_id;
  else
    delete from public.stories where id = p_id;
  end if;
  return found;
end $$;

revoke execute on function public.purge_due(integer), public.purge_done(text, uuid) from public, anon, authenticated;
grant execute on function public.purge_due(integer), public.purge_done(text, uuid) to service_role;
