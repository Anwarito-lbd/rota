-- 029: private accounts and follow requests; other members read profiles column
-- by column (city, lang, identity_status and settings stay private); blocks also
-- hide the profile row, listings, favourites and bookings; 18+ declared at sign-up.
-- Spec: docs/superpowers/specs/2026-10-04-privacy-design.md
-- Live history: the final revoke (trigger functions) was applied as a second entry, private_accounts_trigger_grants.

alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists hide_like_counts boolean not null default false,
  add column if not exists comment_policy text not null default 'everyone',
  add column if not exists message_policy text not null default 'everyone',
  add column if not exists hide_default_words boolean not null default true,
  add column if not exists adult_confirmed_at timestamptz,
  add column if not exists identity_verified boolean generated always as (identity_status = 'verified') stored;

alter table public.profiles
  add constraint profiles_comment_policy check (comment_policy in ('everyone', 'followers', 'nobody')),
  add constraint profiles_message_policy check (message_policy in ('everyone', 'following', 'nobody'));

-- Follow status first: the SQL functions below are checked against it when created.
alter table public.follows add column if not exists status text not null default 'accepted';
alter table public.follows add constraint follows_status check (status in ('accepted', 'pending'));
create index if not exists follows_pending on public.follows (followee_id) where status = 'pending';

-- ── Column grants ───────────────────────────────────────────────
revoke select on public.profiles from anon, authenticated;
grant select (id, username, avatar_url, bio, certified, created_at, username_confirmed, vacation,
              pro_until, account_type, business_name, business_verified, identity_verified,
              is_private, hide_like_counts)
  on public.profiles to authenticated;
grant update (is_private, hide_like_counts, comment_policy, message_policy, hide_default_words)
  on public.profiles to authenticated;

drop policy if exists "Profiles are visible to signed-in members" on public.profiles;
create policy "Profiles are visible to members, never across a block" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or not public.blocked_between((select auth.uid()), id));

-- The member's own full row.
create or replace function public.my_profile()
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(p) from public.profiles p where p.id = auth.uid();
$$;

-- 18+ is a declaration, recorded once.
create or replace function public.confirm_adult()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set adult_confirmed_at = coalesce(adult_confirmed_at, now()) where id = auth.uid();
$$;

-- ── Who may see someone's social side ───────────────────────────
create or replace function public.can_view_social(p_viewer uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_viewer = p_owner, false)
      or (p_viewer is not null
          and not public.blocked_between(p_viewer, p_owner)
          and exists (
            select 1 from public.profiles o
             where o.id = p_owner and o.deleted_at is null
               and (not o.is_private
                    or exists (select 1 from public.follows f
                                where f.follower_id = p_viewer and f.followee_id = p_owner
                                  and f.status = 'accepted'))));
$$;

-- ── Follow requests ─────────────────────────────────────────────
create or replace function public.follows_set_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.status := case when exists (select 1 from public.profiles where id = new.followee_id and is_private)
                     then 'pending' else 'accepted' end;
  return new;
end $$;
create trigger follows_set_status before insert on public.follows
  for each row execute function public.follows_set_status();

create or replace function public.follows_push()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_social(new.followee_id, new.follower_id,
      case when new.status = 'pending' then 'social_follow_request' else 'social_follow' end,
      'follow:' || new.follower_id::text || ':' || new.followee_id::text, '{}'::jsonb);
  elsif old.status = 'pending' and new.status = 'accepted' then
    perform public.notify_social(new.follower_id, new.followee_id, 'social_follow_accepted',
      'follow-accepted:' || new.follower_id::text || ':' || new.followee_id::text, '{}'::jsonb);
  end if;
  return null;
end $$;
drop trigger if exists follows_push on public.follows;
create trigger follows_push after insert or update of status on public.follows
  for each row execute function public.follows_push();

create or replace function public.answer_follow_request(p_follower uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_accept then
    update public.follows set status = 'accepted'
     where follower_id = p_follower and followee_id = me and status = 'pending';
  else
    delete from public.follows where follower_id = p_follower and followee_id = me and status = 'pending';
  end if;
end $$;

create or replace function public.my_follow_requests()
returns table (follower_id uuid, username text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.follower_id, p.username, p.avatar_url, f.created_at
    from public.follows f join public.profiles p on p.id = f.follower_id
   where f.followee_id = auth.uid() and f.status = 'pending' and p.deleted_at is null
   order by f.created_at desc
   limit 200;
$$;

-- Going public accepts every waiting request.
create or replace function public.profiles_private_off()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted' where followee_id = new.id and status = 'pending';
  end if;
  return null;
end $$;
create trigger profiles_private_off after update of is_private on public.profiles
  for each row execute function public.profiles_private_off();

drop policy if exists "Follow graph is visible to members" on public.follows;
create policy "Follows are visible when the profiles are" on public.follows
  for select to authenticated using (
    (select auth.uid()) in (follower_id, followee_id)
    or (status = 'accepted'
        and not public.blocked_between((select auth.uid()), follower_id)
        and not public.blocked_between((select auth.uid()), followee_id)
        and (public.can_view_social((select auth.uid()), followee_id)
             or public.can_view_social((select auth.uid()), follower_id))));
create policy "Members remove their own followers" on public.follows
  for delete to authenticated using (followee_id = (select auth.uid()));

-- ── Social content follows can_view_social ──────────────────────
drop policy if exists "Members see distributed posts and their own" on public.posts;
create policy "Posts: my own, or distributed by someone I may see" on public.posts
  for select to authenticated using (
    author_id = (select auth.uid())
    or (distribution in ('public', 'limited') and public.can_view_social((select auth.uid()), author_id)));

drop policy if exists "Live stories of people I follow, and my own" on public.stories;
create policy "Live stories of people I follow, and my own" on public.stories
  for select to authenticated using (
    author_id = (select auth.uid())
    or (distribution = 'public' and expires_at > now()
        and exists (select 1 from public.follows f
                     where f.follower_id = (select auth.uid()) and f.followee_id = stories.author_id
                       and f.status = 'accepted')
        and not public.blocked_between((select auth.uid()), author_id)));

drop policy if exists "Highlights are visible to members, never across a block" on public.story_highlights;
create policy "Highlights follow the owner's privacy" on public.story_highlights
  for select to authenticated using (
    owner_id = (select auth.uid()) or public.can_view_social((select auth.uid()), owner_id));

drop policy if exists "Members repost public posts of others" on public.reposts;
create policy "Members repost posts of public accounts" on public.reposts
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p join public.profiles o on o.id = p.author_id
                 where p.id = reposts.post_id and p.distribution = 'public'
                   and p.author_id <> (select auth.uid()) and not o.is_private
                   and not public.blocked_between((select auth.uid()), p.author_id)));

-- ── Blocks reach listings, favourites and bookings ──────────────
drop policy if exists "Members see distributed listings and their own" on public.listings;
create policy "Members see distributed listings and their own, never across a block" on public.listings
  for select to authenticated using (
    owner_id = (select auth.uid())
    or (status = 'active' and distribution in ('public', 'limited')
        and not public.blocked_between((select auth.uid()), owner_id)));

drop policy if exists "Members manage their own favorites" on public.favorites;
create policy "Members see their own favorites" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members remove their own favorites" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "Members favourite listings, never across a block" on public.favorites
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and not exists (select 1 from public.listings l
                     where l.id = favorites.listing_id
                       and public.blocked_between((select auth.uid()), l.owner_id)));

create or replace function public.rentals_not_across_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.blocked_between(new.renter_id, new.owner_id) then raise exception 'blocked'; end if;
  return new;
end $$;
create trigger rentals_not_across_block before insert on public.rentals
  for each row execute function public.rentals_not_across_block();

-- ── What a profile screen needs, in one call ────────────────────
create or replace function public.profile_card(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when p.id <> auth.uid() and public.blocked_between(auth.uid(), p.id)
      then jsonb_build_object('id', p.id, 'username', p.username, 'blocked', true)
    else jsonb_build_object(
      'id', p.id, 'username', p.username, 'avatar_url', p.avatar_url, 'bio', p.bio,
      'certified', p.certified, 'identity_verified', p.identity_verified,
      'pro_until', p.pro_until, 'account_type', p.account_type,
      'business_verified', p.business_verified, 'business_name', p.business_name,
      'vacation', p.vacation, 'is_private', p.is_private, 'hide_like_counts', p.hide_like_counts,
      'city', case when p.show_city or p.id = auth.uid() then p.city end,
      'deleted', p.deleted_at is not null,
      'blocked', false,
      'followers', (select count(*) from public.follows f where f.followee_id = p.id and f.status = 'accepted'),
      'following', (select count(*) from public.follows f where f.follower_id = p.id and f.status = 'accepted'),
      'follow_status', coalesce((select f.status from public.follows f
                                  where f.follower_id = auth.uid() and f.followee_id = p.id), 'none'),
      'follows_me', exists (select 1 from public.follows f
                             where f.follower_id = p.id and f.followee_id = auth.uid() and f.status = 'accepted'),
      'can_view', public.can_view_social(auth.uid(), p.id))
  end
  from public.profiles p where p.id = p_id;
$$;

-- ── 18+ at sign-up (metadata "adult": "true") ───────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted text := lower(nullif(new.raw_user_meta_data ->> 'username', ''));
  adult timestamptz := case when new.raw_user_meta_data ->> 'adult' = 'true' then now() end;
  base text;
  candidate text;
  tries integer := 0;
begin
  if wanted is not null then
    insert into public.profiles (id, username, adult_confirmed_at) values (new.id, wanted, adult);
    return new;
  end if;
  base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._]', '', 'g');
  base := left(base, 14);
  if char_length(base) < 3 or base in ('admin', 'rota', 'support', 'moderation', 'help') then
    base := 'membre';
  end if;
  loop
    candidate := base || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where username = candidate);
    tries := tries + 1;
    if tries > 20 then
      candidate := left(base, 10) || substr(replace(new.id::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;
  insert into public.profiles (id, username, username_confirmed, adult_confirmed_at)
  values (new.id, candidate, false, adult);
  return new;
end $$;

-- ── Grants ──────────────────────────────────────────────────────
revoke execute on function public.my_profile(), public.confirm_adult(), public.can_view_social(uuid, uuid),
  public.answer_follow_request(uuid, boolean), public.my_follow_requests(), public.profile_card(uuid)
  from public, anon;
grant execute on function public.my_profile(), public.confirm_adult(), public.can_view_social(uuid, uuid),
  public.answer_follow_request(uuid, boolean), public.my_follow_requests(), public.profile_card(uuid)
  to authenticated;

-- Trigger functions are not RPCs.
revoke execute on function public.follows_set_status(), public.profiles_private_off(),
  public.rentals_not_across_block() from public, anon, authenticated;
