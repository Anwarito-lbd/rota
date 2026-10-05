-- 032: deleting a post or story puts it in a 30-day bin ("Récemment supprimé"),
-- then the worker purges files and rows. Content under a moderation notice from
-- the last 6 months (DSA art. 20 appeal window) waits. Highlights now point to
-- the member's own published stories, never to arbitrary paths. Post areas use
-- a 0.01° grid (about 1 km).

alter table public.posts add column if not exists deleted_at timestamptz;
alter table public.stories add column if not exists deleted_at timestamptz;
create index if not exists posts_deleted on public.posts (deleted_at) where deleted_at is not null;
create index if not exists stories_deleted on public.stories (deleted_at) where deleted_at is not null;

drop policy if exists "Posts: my own, or distributed by someone I may see" on public.posts;
create policy "Posts: my own, or distributed by someone I may see" on public.posts
  for select to authenticated using (
    deleted_at is null
    and (author_id = (select auth.uid())
         or (distribution in ('public', 'limited') and public.can_view_social((select auth.uid()), author_id))));

drop policy if exists "Live stories of people I follow, and my own" on public.stories;
create policy "Live stories of people I follow, and my own" on public.stories
  for select to authenticated using (
    deleted_at is null
    and (author_id = (select auth.uid())
         or (distribution = 'public' and expires_at > now()
             and exists (select 1 from public.follows f
                          where f.follower_id = (select auth.uid()) and f.followee_id = stories.author_id
                            and f.status = 'accepted')
             and public.can_view_social((select auth.uid()), author_id))));

-- Deletion goes through the bin.
drop policy if exists "Authors delete their own posts" on public.posts;
drop policy if exists "Members delete their own stories" on public.stories;

create or replace function public.delete_post(p_post uuid)
returns void language sql security definer set search_path = '' as $$
  update public.posts set deleted_at = now() where id = p_post and author_id = auth.uid() and deleted_at is null;
$$;

create or replace function public.restore_post(p_post uuid)
returns void language sql security definer set search_path = '' as $$
  update public.posts set deleted_at = null
   where id = p_post and author_id = auth.uid() and deleted_at > now() - interval '30 days';
$$;

create or replace function public.delete_story(p_story uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.stories set deleted_at = now() where id = p_story and author_id = auth.uid() and deleted_at is null;
  if not found then return; end if;
  update public.story_highlights set story_ids = array_remove(story_ids, p_story)
   where owner_id = auth.uid() and p_story = any (story_ids);
  delete from public.story_highlights where owner_id = auth.uid() and cardinality(story_ids) = 0;
end $$;

create or replace function public.restore_story(p_story uuid)
returns void language sql security definer set search_path = '' as $$
  update public.stories set deleted_at = null
   where id = p_story and author_id = auth.uid() and deleted_at > now() - interval '30 days';
$$;

create or replace function public.my_recently_deleted()
returns table (kind text, id uuid, media text, deleted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'post', p.id, p.media_paths[1], p.deleted_at from public.posts p
   where p.author_id = auth.uid() and p.deleted_at > now() - interval '30 days'
  union all
  select 'story', s.id, s.media_path, s.deleted_at from public.stories s
   where s.author_id = auth.uid() and s.deleted_at > now() - interval '30 days'
  order by 4 desc;
$$;

-- ── Highlights hold story ids; paths are derived ────────────────
alter table public.story_highlights add column if not exists story_ids uuid[] not null default '{}';
update public.story_highlights h
   set story_ids = coalesce((select array_agg(s.id order by array_position(h.media_paths, s.media_path))
                               from public.stories s
                              where s.author_id = h.owner_id and s.media_path = any (h.media_paths)
                                and s.deleted_at is null), '{}');
delete from public.story_highlights where cardinality(story_ids) = 0;
alter table public.story_highlights drop constraint if exists story_highlights_own_media;
alter table public.story_highlights add constraint story_highlights_story_count
  check (cardinality(story_ids) between 1 and 20);

-- Every story id added must be the owner's own published, undeleted story.
-- On update only the newly added ids are checked: ids already in the highlight
-- were checked when they were added, so removing one (delete_story) or
-- reordering never fails because another story was moderated since.
create or replace function public.story_highlights_from_stories()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  paths text[];
begin
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
drop trigger if exists story_highlights_from_stories on public.story_highlights;
create trigger story_highlights_from_stories before insert or update of story_ids on public.story_highlights
  for each row execute function public.story_highlights_from_stories();
revoke execute on function public.story_highlights_from_stories() from public, anon, authenticated;

-- Members no longer write paths directly (022 granted these per column).
revoke insert (title, media_paths), update (title, media_paths) on public.story_highlights from authenticated;
revoke insert, update on public.story_highlights from authenticated;
grant insert (title, story_ids), update (title, story_ids) on public.story_highlights to authenticated;
drop function if exists public.paths_in_own_folder(text[], text);

-- ── Purge queue for the worker (service role) ───────────────────
create or replace function public.purge_due(p_limit integer default 50)
returns table (kind text, id uuid, paths text[])
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'post'::text, p.id, p.media_paths
      from public.posts p
     where p.deleted_at < now() - interval '30 days'
    union all
    select 'story', s.id, array[s.media_path]
      from public.stories s
     where (s.deleted_at < now() - interval '30 days'
            or (s.deleted_at is null and s.expires_at < now() - interval '30 days'))
       and not exists (select 1 from public.story_highlights h where s.id = any (h.story_ids))
  ) due (kind, id, paths)
  where not exists (
    select 1 from public.moderation_notices n
     where n.subject_id = due.id
       and coalesce(n.appeal_decided_at, n.created_at) > now() - interval '6 months')
  limit greatest(1, least(p_limit, 200));
$$;

create or replace function public.purge_done(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'post' then delete from public.posts where id = p_id and deleted_at is not null;
  elsif p_kind = 'story' then delete from public.stories where id = p_id;
  end if;
end $$;

-- ── 1 km grid ───────────────────────────────────────────────────
create or replace function public.posts_coarsen_area()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.area_lat is not null then
    new.area_lat := round(new.area_lat * 100) / 100;
    new.area_lng := round(new.area_lng * 100) / 100;
  end if;
  return new;
end $$;
revoke execute on function public.posts_coarsen_area() from public, anon, authenticated;
update public.posts set area_lat = area_lat, area_lng = area_lng where area_lat is not null;

revoke execute on function public.delete_post(uuid), public.restore_post(uuid), public.delete_story(uuid),
  public.restore_story(uuid), public.my_recently_deleted(), public.purge_due(integer), public.purge_done(text, uuid)
  from public, anon;
grant execute on function public.delete_post(uuid), public.restore_post(uuid), public.delete_story(uuid),
  public.restore_story(uuid), public.my_recently_deleted() to authenticated;
revoke execute on function public.purge_due(integer), public.purge_done(text, uuid) from authenticated;
grant execute on function public.purge_due(integer), public.purge_done(text, uuid) to service_role;
