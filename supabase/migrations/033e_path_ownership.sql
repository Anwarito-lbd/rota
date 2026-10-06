-- 033e: storage paths stay in their owner's folder; a sturdier bin purge.
-- 1. path_owned_by(path, owner): the first segment is the owner's id, the path is
--    not a URL, no segment is empty, '.' or '..', and it holds no '%' or '\'.
--    The listing gate (photos, video, proof), stories and posts all use it, so a
--    member can no longer point a row at another member's file ('<me>/../<them>/x').
--    Column SELECT on listings.authenticity_path is NOT revoked: members read
--    listings with select('*, owner:...'), which a column revoke would break.
--    The export only signs paths that pass the same rule (account function).
-- 2. purge_due returns author_id (the worker only removes files under it) and
--    runs oldest first, so the queue order is stable.
-- 3. storage_orphans: files whose removal failed after their row was purged;
--    the worker retries them. Service role only.
-- 4. close_member_account: a payload whose actor_id is JSON null falls back to the
--    username match. Only that condition changes; the rest is the live 033c body.

-- 1 ---------------------------------------------------------------------------------
create or replace function public.path_owned_by(p_path text, p_owner uuid)
returns boolean language sql immutable set search_path = '' as $$
  select p_path is not null and p_owner is not null
     and split_part(p_path, '/', 1) = p_owner::text
     and p_path like p_owner::text || '/%'
     and p_path !~ '^[a-zA-Z][a-zA-Z0-9+.-]*:'
     and position('%' in p_path) = 0
     and position(E'\\' in p_path) = 0
     and not exists (select 1 from unnest(string_to_array(p_path, '/')) s where s in ('', '.', '..'));
$$;

-- Every element of an array passes path_owned_by (check constraints cannot hold a subquery).
create or replace function public.paths_owned_by(p_paths text[], p_owner uuid)
returns boolean language sql immutable set search_path = '' as $$
  select p_paths is not null
     and not exists (select 1 from unnest(p_paths) x where not public.path_owned_by(x, p_owner));
$$;

create or replace function public.listing_moderation_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  enabled boolean := coalesce(
    (select (value #>> '{}')::boolean from public.policy_config where key = 'moderation_enabled'),
    true);
  paths_changed boolean;
begin
  if tg_op = 'INSERT' then
    paths_changed := true;
  else
    paths_changed := (new.photo_paths, new.video_path, new.authenticity_path)
                     is distinct from (old.photo_paths, old.video_path, old.authenticity_path);
  end if;
  if paths_changed
     and (not public.paths_owned_by(coalesce(new.photo_paths, '{}'), new.owner_id)
          or (new.video_path is not null and not public.path_owned_by(new.video_path, new.owner_id))
          or (new.authenticity_path is not null and not public.path_owned_by(new.authenticity_path, new.owner_id))) then
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
$function$;

-- Live tables hold no rows that fail the rule, so both constraints are validated.
alter table public.stories drop constraint if exists stories_media_in_own_folder;
alter table public.stories add constraint stories_media_in_own_folder
  check (public.path_owned_by(media_path, author_id));
alter table public.posts add constraint posts_media_in_own_folder
  check (public.paths_owned_by(media_paths, author_id));

-- 2 ---------------------------------------------------------------------------------
drop function public.purge_due(integer);
create function public.purge_due(p_limit integer default 50)
returns table(kind text, id uuid, author_id uuid, paths text[])
language sql stable security definer set search_path = '' as $$
  select due.kind, due.id, due.author_id, due.paths from (
    select 'post'::text, p.id, p.author_id, p.media_paths, p.deleted_at
      from public.posts p
     where p.deleted_at < now() - interval '30 days'
    union all
    select 'story', s.id, s.author_id, array[s.media_path], s.deleted_at
      from public.stories s
     where s.deleted_at < now() - interval '30 days'
    union all
    select 'story', s.id, s.author_id, array[s.media_path], s.expires_at
      from public.stories s
     where s.deleted_at is null and s.expires_at < now() - interval '30 days'
  ) due (kind, id, author_id, paths, since)
  where public.purge_item_due(due.kind, due.id)
  order by due.since, due.id
  limit greatest(1, least(p_limit, 200));
$$;
revoke execute on function public.purge_due(integer) from public, anon, authenticated;
grant execute on function public.purge_due(integer) to service_role;

-- 3 ---------------------------------------------------------------------------------
create table if not exists public.storage_orphans (
  bucket text not null,
  path text not null,
  failed_at timestamptz not null default now(),
  primary key (bucket, path)
);
alter table public.storage_orphans enable row level security;
revoke all on public.storage_orphans from public, anon, authenticated;
grant select, insert, update, delete on public.storage_orphans to service_role;

-- 4 ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_member_account(p_user uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  alias text := 'deleted_' || substr(md5(p_user::text), 1, 10);
  old_name text;
begin
  -- Already closed: nothing to write, no second audit row.
  if exists (select 1 from public.profiles where id = p_user and deleted_at is not null and username = alias) then
    return alias;
  end if;
  if exists (select 1 from public.rentals r
              where p_user in (r.renter_id, r.owner_id)
                and (r.status in ('in_progress', 'due', 'late', 'non_return_review', 'returned')
                     or (r.status = 'booked' and r.payment_status in ('paid', 'processing')))) then
    raise exception 'Active rentals';
  end if;
  if exists (select 1 from public.payouts p join public.rentals r on r.id = p.rental_id
              where p.owner_id = p_user and r.payment_status in ('paid', 'processing')
                and p.state in ('pending', 'scheduled', 'on_hold', 'released')) then
    raise exception 'Payouts pending';
  end if;
  if exists (select 1 from public.claims c
              where p_user in (c.renter_id, c.owner_id)
                and c.status in ('submitted', 'renter_responding', 'under_review', 'appealed')) then
    raise exception 'Open claims';
  end if;
  select username into old_name from public.profiles where id = p_user;
  update public.rentals set status = 'cancelled', payment_status = 'expired'
   where p_user in (renter_id, owner_id) and status = 'booked';
  update public.payouts p set state = 'cancelled', hold_reason = 'account_closed'
    from public.rentals r
   where r.id = p.rental_id and p_user in (r.renter_id, r.owner_id) and r.status = 'cancelled' and p.state = 'pending';
  -- Follows go before is_private flips to false: otherwise profiles_private_off accepts
  -- every pending request and each requester gets a "follow accepted" push from the
  -- closing account.
  delete from public.follows where p_user in (follower_id, followee_id);
  update public.profiles
     set username = alias, bio = null, avatar_url = null, city = null, show_city = false,
         certified = false, deleted_at = now(), business_name = null, business_verified = false,
         account_type = 'personal', pro_until = null, vacation = false, lang = 'fr',
         identity_status = 'none', adult_confirmed_at = null, is_private = false,
         hide_like_counts = false, comment_policy = 'everyone', message_policy = 'everyone'
   where id = p_user;
  -- Other members' notifications stop naming the member or quoting their messages.
  update public.notifications
     set payload = (payload - 'preview' - 'actor_id') || jsonb_build_object('actor', alias),
         push_state = case when push_state = 'pending' then 'skipped' else push_state end
   where user_id <> p_user
     and (coalesce(payload->>'actor_id', '') = p_user::text
          or (coalesce(payload->>'actor_id', '') = '' and payload->>'actor' = old_name));
  perform set_config('rota.moderating', 'on', true);
  update public.listings
     set status = 'removed', distribution = 'blocked', distribution_reason = 'other',
         city = null, description = null, video_path = null, authenticity_path = null,
         distribution_note = null, photo_paths = '{}'
   where owner_id = p_user;
  perform set_config('rota.moderating', 'off', true);
  delete from public.media_provenance where owner_id = p_user;
  delete from public.member_addresses where user_id = p_user;
  delete from public.member_preferences where user_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.favorites where user_id = p_user;
  delete from public.staff_members where user_id = p_user;
  delete from public.posts where author_id = p_user;
  delete from public.post_comments where author_id = p_user;
  delete from public.post_likes where user_id = p_user;
  delete from public.boards where owner_id = p_user;
  delete from public.member_blocks where p_user in (blocker_id, blocked_id);
  perform public.close_member_social(p_user);
  perform public.audit(p_user, 'member', 'profiles', p_user::text, 'account.closed', null,
    jsonb_build_object('alias', alias));
  return alias;
end $function$;
