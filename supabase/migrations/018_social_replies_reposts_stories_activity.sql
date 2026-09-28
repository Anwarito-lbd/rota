-- ═════════════════════════════════════════════════════════════
-- Rota — 018 Comment replies and likes, reposts, stories, activity
--
-- • post_comments.parent_id: a reply (one level deep); comment_likes.
-- • reposts: share someone's post to your followers; repost_count.
-- • stories: one photo, visible 24 h to members who follow you; same
--   moderation gate as posts (verified authors go live, others wait).
-- • my_activity(): likes, comments, replies, reposts and new followers
--   that concern me, newest first — the Notifications screen.
-- Blocks apply everywhere through blocked_between().
-- ═════════════════════════════════════════════════════════════

-- ── Replies and comment likes ──
alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments (id) on delete cascade,
  add column if not exists like_count integer not null default 0;
create index if not exists post_comments_parent on public.post_comments (parent_id) where parent_id is not null;
grant insert (parent_id) on public.post_comments to authenticated;

-- A reply answers a top-level comment of the same post.
create function public.post_comments_parent_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.post_comments p
     where p.id = new.parent_id and p.post_id = new.post_id and p.parent_id is null
  ) then
    raise exception 'invalid_parent';
  end if;
  return new;
end;
$$;
create trigger post_comments_parent_check before insert on public.post_comments
  for each row execute function public.post_comments_parent_check();

create table public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
create policy "Members see their own comment likes"
  on public.comment_likes for select to authenticated using (user_id = (select auth.uid()));
create policy "Members like comments they can see"
  on public.comment_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.post_comments c where c.id = comment_id));
create policy "Members unlike comments"
  on public.comment_likes for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.comment_likes from anon, authenticated;
grant select, delete on public.comment_likes to authenticated;
grant insert (comment_id) on public.comment_likes to authenticated;

create function public.comment_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.post_comments
     set like_count = greatest(0, like_count + case when tg_op = 'INSERT' then 1 else -1 end)
   where id = case when tg_op = 'INSERT' then new.comment_id else old.comment_id end;
  return null;
end;
$$;
create trigger comment_likes_count after insert or delete on public.comment_likes
  for each row execute function public.comment_likes_count();

-- ── Reposts ──
alter table public.posts add column if not exists repost_count integer not null default 0;

create table public.reposts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index reposts_user on public.reposts (user_id, created_at desc);
alter table public.reposts enable row level security;
create policy "Reposts of visible posts are visible"
  on public.reposts for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)
         and not public.blocked_between((select auth.uid()), user_id));
create policy "Members repost public posts of others"
  on public.reposts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p
                 where p.id = post_id and p.distribution = 'public' and p.author_id <> (select auth.uid())
                   and not public.blocked_between((select auth.uid()), p.author_id))
  );
create policy "Members undo their reposts"
  on public.reposts for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.reposts from anon, authenticated;
grant select, delete on public.reposts to authenticated;
grant insert (post_id) on public.reposts to authenticated;

create function public.reposts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
     set repost_count = greatest(0, repost_count + case when tg_op = 'INSERT' then 1 else -1 end)
   where id = case when tg_op = 'INSERT' then new.post_id else old.post_id end;
  return null;
end;
$$;
create trigger reposts_count after insert or delete on public.reposts
  for each row execute function public.reposts_count();

-- ── Stories (24 h) ──
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  media_path text not null,
  caption text check (char_length(caption) <= 150),
  distribution text not null default 'pending' check (distribution in ('pending', 'public', 'blocked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index stories_live on public.stories (author_id, expires_at desc);
alter table public.stories enable row level security;

create function public.stories_initial_distribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.member_restrictions r where r.user_id = new.author_id and r.posting_suspended) then
    raise exception 'posting_suspended';
  end if;
  new.distribution := case when exists (select 1 from public.profiles p where p.id = new.author_id and p.identity_status = 'verified')
                           then 'public' else 'pending' end;
  new.expires_at := now() + interval '24 hours';
  return new;
end;
$$;
create trigger stories_initial_distribution before insert on public.stories
  for each row execute function public.stories_initial_distribution();

create policy "Live stories of people I follow, and my own"
  on public.stories for select to authenticated
  using (
    author_id = (select auth.uid())
    or (distribution = 'public' and expires_at > now()
        and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = author_id)
        and not public.blocked_between((select auth.uid()), author_id))
  );
create policy "Members post their own stories"
  on public.stories for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Members delete their own stories"
  on public.stories for delete to authenticated using (author_id = (select auth.uid()));
revoke all on public.stories from anon, authenticated;
grant select, delete on public.stories to authenticated;
grant insert (media_path, caption) on public.stories to authenticated;

-- Stories can be reported like posts.
alter table public.social_reports add column if not exists story_id uuid references public.stories (id) on delete cascade;
alter table public.social_reports drop constraint if exists social_reports_one_target;
alter table public.social_reports
  add constraint social_reports_one_target
  check (num_nonnulls(post_id, comment_id, member_id, message_id, story_id) = 1);
grant insert (story_id) on public.social_reports to authenticated;

-- ── Activity ──
create function public.my_activity(p_limit integer default 60)
returns table (kind text, actor_id uuid, actor_username text, actor_avatar text, post_id uuid, media text, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select 'like'::text, l.user_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], null::text, l.created_at
      from public.post_likes l join public.posts p on p.id = l.post_id join public.profiles pr on pr.id = l.user_id
     where p.author_id = auth.uid() and l.user_id <> auth.uid()
    union all
    select case when c.parent_id is null then 'comment' else 'reply' end, c.author_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], c.body, c.created_at
      from public.post_comments c join public.posts p on p.id = c.post_id join public.profiles pr on pr.id = c.author_id
     where c.author_id <> auth.uid() and not c.hidden
       and (p.author_id = auth.uid()
            or exists (select 1 from public.post_comments parent where parent.id = c.parent_id and parent.author_id = auth.uid()))
    union all
    select 'repost', r.user_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], null, r.created_at
      from public.reposts r join public.posts p on p.id = r.post_id join public.profiles pr on pr.id = r.user_id
     where p.author_id = auth.uid()
    union all
    select 'follow', f.follower_id, pr.username, pr.avatar_url, null, null, null, f.created_at
      from public.follows f join public.profiles pr on pr.id = f.follower_id
     where f.followee_id = auth.uid()
  ) a (kind, actor_id, actor_username, actor_avatar, post_id, media, body, created_at)
  where auth.uid() is not null and not public.blocked_between(auth.uid(), a.actor_id)
  order by a.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;
revoke execute on function public.my_activity(integer) from public, anon;
grant execute on function public.my_activity(integer) to authenticated;

revoke execute on function public.post_comments_parent_check() from public, anon, authenticated;
revoke execute on function public.comment_likes_count() from public, anon, authenticated;
revoke execute on function public.reposts_count() from public, anon, authenticated;
revoke execute on function public.stories_initial_distribution() from public, anon, authenticated;

-- Closing an account (013) also removes these.
create or replace function public.close_member_social(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.stories where author_id = p_user;
  delete from public.reposts where user_id = p_user;
  delete from public.comment_likes where user_id = p_user;
$$;
revoke execute on function public.close_member_social(uuid) from public, anon, authenticated;
grant execute on function public.close_member_social(uuid) to service_role;
