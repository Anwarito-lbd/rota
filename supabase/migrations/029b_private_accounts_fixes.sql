-- 029b: review fixes for 029.
-- Follow lists need both profiles visible; can_view_social answers only for the
-- caller; follow push keys no longer collide; stories and profile_card respect a
-- closed account; anon loses write grants on profiles.
-- Spec: docs/superpowers/specs/2026-10-04-privacy-design.md

-- ── can_view_social answers only for the caller ─────────────────
-- Service and postgres callers (auth.uid() is null) may still ask about anyone.
create or replace function public.can_view_social(p_viewer uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is not null and p_viewer is distinct from auth.uid() then false
    else coalesce(p_viewer = p_owner, false)
      or (p_viewer is not null
          and not public.blocked_between(p_viewer, p_owner)
          and exists (
            select 1 from public.profiles o
             where o.id = p_owner and o.deleted_at is null
               and (not o.is_private
                    or exists (select 1 from public.follows f
                                where f.follower_id = p_viewer and f.followee_id = p_owner
                                  and f.status = 'accepted'))))
  end;
$$;

-- ── A follow row is visible only when both profiles are ─────────
drop policy if exists "Follows are visible when the profiles are" on public.follows;
create policy "Follows are visible when both profiles are" on public.follows
  for select to authenticated using (
    (select auth.uid()) in (follower_id, followee_id)
    or (status = 'accepted'
        and public.can_view_social((select auth.uid()), followee_id)
        and public.can_view_social((select auth.uid()), follower_id)));

-- ── Push keys: one prefix per kind, one bucket per day ──────────
create or replace function public.follows_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare day text := to_char(now(), 'YYYYMMDD');
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.notify_social(new.followee_id, new.follower_id, 'social_follow_request',
        'follow-request:' || new.follower_id::text || ':' || new.followee_id::text || ':' || day, '{}'::jsonb);
    else
      perform public.notify_social(new.followee_id, new.follower_id, 'social_follow',
        'follow:' || new.follower_id::text || ':' || new.followee_id::text || ':' || day, '{}'::jsonb);
    end if;
  elsif old.status = 'pending' and new.status = 'accepted' then
    perform public.notify_social(new.follower_id, new.followee_id, 'social_follow_accepted',
      'follow-accepted:' || new.follower_id::text || ':' || new.followee_id::text || ':' || day, '{}'::jsonb);
  end if;
  return null;
end $$;

-- ── Stories also follow can_view_social (closed accounts) ───────
drop policy if exists "Live stories of people I follow, and my own" on public.stories;
create policy "Live stories of people I follow, and my own" on public.stories
  for select to authenticated using (
    author_id = (select auth.uid())
    or (distribution = 'public' and expires_at > now()
        and exists (select 1 from public.follows f
                     where f.follower_id = (select auth.uid()) and f.followee_id = stories.author_id
                       and f.status = 'accepted')
        and public.can_view_social((select auth.uid()), author_id)));

-- ── profile_card: a closed account shows a minimal card ─────────
create or replace function public.profile_card(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when p.id <> auth.uid() and public.blocked_between(auth.uid(), p.id)
      then jsonb_build_object('id', p.id, 'username', p.username, 'blocked', true)
    when p.deleted_at is not null
      then jsonb_build_object('id', p.id, 'username', p.username, 'deleted', true,
                              'blocked', false, 'can_view', false)
    else jsonb_build_object(
      'id', p.id, 'username', p.username, 'avatar_url', p.avatar_url, 'bio', p.bio,
      'certified', p.certified, 'identity_verified', p.identity_verified,
      'pro_until', p.pro_until, 'account_type', p.account_type,
      'business_verified', p.business_verified, 'business_name', p.business_name,
      'vacation', p.vacation, 'is_private', p.is_private, 'hide_like_counts', p.hide_like_counts,
      'city', case when p.show_city or p.id = auth.uid() then p.city end,
      'deleted', false,
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

-- ── Defence in depth: profile rows come from handle_new_user only ─
revoke insert, update, delete, truncate, references, trigger on public.profiles from anon;
revoke insert, delete, truncate on public.profiles from authenticated;
