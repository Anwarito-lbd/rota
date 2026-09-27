-- 009 — The social layer: fits, dumps, "Rent the look", follows, comments,
-- boards and blocks.
--
-- Rules this migration enforces (not the app):
--   * A post never carries a precise position. Coordinates are rounded to a
--     ~550 m grid on write, whatever the phone sends.
--   * Posts from identity-verified members go live at once; everyone else's
--     wait as 'pending' until someone at Rota has looked. Three reports from
--     different members pull a post back to 'limited'.
--   * Blocking works both ways: neither member sees the other's posts or
--     comments, and neither can follow, like, comment on or tag the other.
--   * Only a post's author can tag pieces on it, and only pieces that are
--     active and distributed.

-- ─────────────────────────────────────────────────────────────
-- 1. Blocks
-- ─────────────────────────────────────────────────────────────
create table public.member_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.member_blocks enable row level security;

create policy "Members manage their own blocks"
  on public.member_blocks for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

revoke all on public.member_blocks from anon, authenticated;
grant select, delete on public.member_blocks to authenticated;
grant insert (blocked_id) on public.member_blocks to authenticated;

-- True when either member blocked the other. Definer, so policies can ask
-- without being able to read other members' block lists.
create function public.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.member_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke execute on function public.blocked_between(uuid, uuid) from public, anon;
grant execute on function public.blocked_between(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Weekly challenges ("Dump de la semaine", "Fit du vendredi")
-- ─────────────────────────────────────────────────────────────
create table public.challenges (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  title_fr text not null check (char_length(title_fr) <= 60),
  title_en text check (char_length(title_en) <= 60),
  title_es text check (char_length(title_es) <= 60),
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on)
);

alter table public.challenges enable row level security;

create policy "Challenges are public to members"
  on public.challenges for select to authenticated
  using (true);

-- Written by Rota only.
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

insert into public.challenges (id, title_fr, title_en, title_es, starts_on, ends_on) values
  ('dump-de-la-semaine', 'Dump de la semaine', 'Dump of the week', 'Dump de la semana', current_date, current_date + 365),
  ('fit-du-vendredi', 'Fit du vendredi', 'Friday fit', 'Look del viernes', current_date, current_date + 365),
  ('soiree', 'Look de soirée', 'Night-out look', 'Look de noche', current_date, current_date + 365)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 3. Posts
-- ─────────────────────────────────────────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('fit', 'dump')),
  -- Paths in the post-media bucket, in display order.
  media_paths text[] not null check (cardinality(media_paths) between 1 and 10),
  caption text check (char_length(caption) <= 500),
  challenge_id text references public.challenges (id) on delete set null,
  -- Approximate area only; see posts_coarsen_area().
  area_lat numeric(8, 5) check (area_lat between -90 and 90),
  area_lng numeric(8, 5) check (area_lng between -180 and 180),
  area_label text check (char_length(area_label) <= 60),
  distribution text not null default 'pending'
    check (distribution in ('pending', 'public', 'limited', 'blocked')),
  distribution_reason text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  check ((area_lat is null) = (area_lng is null))
);

create index posts_feed on public.posts (distribution, created_at desc);
create index posts_author on public.posts (author_id, created_at desc);
create index posts_challenge on public.posts (challenge_id, created_at desc) where challenge_id is not null;
create index posts_area on public.posts (area_lat, area_lng) where area_lat is not null;

-- Rounds to a 0.005° grid (~550 m north–south). The exact point the phone
-- saw is never stored.
create function public.posts_coarsen_area()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.area_lat is not null then
    new.area_lat := round(new.area_lat * 200) / 200;
    new.area_lng := round(new.area_lng * 200) / 200;
  end if;
  return new;
end;
$$;

create trigger posts_coarsen_area
  before insert or update of area_lat, area_lng on public.posts
  for each row execute function public.posts_coarsen_area();

-- Who goes live straight away. Members cannot set distribution themselves
-- (see the column grants), so this is the only way in besides staff.
create function public.posts_initial_distribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified boolean;
  suspended boolean;
begin
  select p.identity_status = 'verified' into verified from public.profiles p where p.id = new.author_id;
  select coalesce(r.posting_suspended, false) into suspended
    from public.member_restrictions r where r.user_id = new.author_id;
  if coalesce(suspended, false) then
    raise exception 'posting_suspended';
  end if;
  new.distribution := case when coalesce(verified, false) then 'public' else 'pending' end;
  new.distribution_reason := case when coalesce(verified, false) then null else 'needs_review' end;
  new.like_count := 0;
  new.comment_count := 0;
  return new;
end;
$$;

create trigger posts_initial_distribution
  before insert on public.posts
  for each row execute function public.posts_initial_distribution();

alter table public.posts enable row level security;

create policy "Members see distributed posts and their own"
  on public.posts for select to authenticated
  using (
    author_id = (select auth.uid())
    or (distribution in ('public', 'limited') and not public.blocked_between((select auth.uid()), author_id))
  );

create policy "Members publish as themselves"
  on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "Authors edit their own posts"
  on public.posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors delete their own posts"
  on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

revoke all on public.posts from anon, authenticated;
grant select, delete on public.posts to authenticated;
grant insert (kind, media_paths, caption, challenge_id, area_lat, area_lng, area_label) on public.posts to authenticated;
grant update (caption, challenge_id, area_lat, area_lng, area_label) on public.posts to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. "Rent the look" — pieces tagged inside a photo
-- ─────────────────────────────────────────────────────────────
create table public.post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  media_index smallint not null default 0 check (media_index between 0 and 9),
  -- Position inside the photo, 0..1 from the top-left corner.
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  unique (post_id, listing_id, media_index)
);

create index post_tags_post on public.post_tags (post_id);
create index post_tags_listing on public.post_tags (listing_id);

alter table public.post_tags enable row level security;

-- Readable whenever the post is (the subquery runs under the posts policy).
create policy "Tags follow their post"
  on public.post_tags for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Authors tag distributed pieces on their own posts"
  on public.post_tags for insert to authenticated
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'active' and l.distribution in ('public', 'limited')
        and not public.blocked_between((select auth.uid()), l.owner_id)
    )
  );

create policy "Authors remove tags from their own posts"
  on public.post_tags for delete to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

revoke all on public.post_tags from anon, authenticated;
grant select, delete on public.post_tags to authenticated;
grant insert (post_id, listing_id, media_index, x, y) on public.post_tags to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Follows
-- ─────────────────────────────────────────────────────────────
create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on public.follows (followee_id);

alter table public.follows enable row level security;

create policy "Follow graph is visible to members"
  on public.follows for select to authenticated
  using (true);

create policy "Members follow as themselves, never across a block"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.blocked_between(follower_id, followee_id));

create policy "Members unfollow as themselves"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

revoke all on public.follows from anon, authenticated;
grant select, delete on public.follows to authenticated;
grant insert (followee_id) on public.follows to authenticated;

-- A block ends any follow in either direction.
create function public.member_blocks_unfollow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

create trigger member_blocks_unfollow
  after insert on public.member_blocks
  for each row execute function public.member_blocks_unfollow();

-- ─────────────────────────────────────────────────────────────
-- 6. Likes and comments
-- ─────────────────────────────────────────────────────────────
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Members see their own likes"
  on public.post_likes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members like posts they can see"
  on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id));

create policy "Members unlike"
  on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.post_likes from anon, authenticated;
grant select, delete on public.post_likes to authenticated;
grant insert (post_id) on public.post_likes to authenticated;

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index post_comments_post on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "Comments follow their post, minus blocked members"
  on public.post_comments for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id)
    and (author_id = (select auth.uid()) or (not hidden and not public.blocked_between((select auth.uid()), author_id)))
  );

create policy "Members comment on posts they can see, never across a block"
  on public.post_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.distribution = 'public'
        and not public.blocked_between((select auth.uid()), p.author_id)
    )
    and not exists (
      select 1 from public.member_restrictions r
      where r.user_id = (select auth.uid()) and r.posting_suspended
    )
  );

-- Authors remove their own comments; post authors remove any comment
-- under their post.
create policy "Comment and post authors delete comments"
  on public.post_comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );

revoke all on public.post_comments from anon, authenticated;
grant select, delete on public.post_comments to authenticated;
grant insert (post_id, body) on public.post_comments to authenticated;

-- Counters, kept by the database so members cannot inflate them.
create function public.posts_bump_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := case when tg_op = 'INSERT' then new.post_id else old.post_id end;
begin
  if tg_table_name = 'post_likes' then
    update public.posts set like_count = greatest(0, like_count + delta) where id = target;
  else
    update public.posts set comment_count = greatest(0, comment_count + delta) where id = target;
  end if;
  return null;
end;
$$;

create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.posts_bump_counters();
create trigger post_comments_count after insert or delete on public.post_comments
  for each row execute function public.posts_bump_counters();

-- ─────────────────────────────────────────────────────────────
-- 7. Boards — saved looks, like Pinterest
-- ─────────────────────────────────────────────────────────────
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (listing_id is null)),
  unique (board_id, post_id),
  unique (board_id, listing_id)
);

alter table public.boards enable row level security;
alter table public.board_items enable row level security;

create policy "Owners manage their boards; public boards are readable"
  on public.boards for select to authenticated
  using (owner_id = (select auth.uid()) or (not is_private and not public.blocked_between((select auth.uid()), owner_id)));

create policy "Owners create boards"
  on public.boards for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners rename boards"
  on public.boards for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "Owners delete boards"
  on public.boards for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Board items follow their board"
  on public.board_items for select to authenticated
  using (exists (select 1 from public.boards b where b.id = board_id));

create policy "Owners add to their boards"
  on public.board_items for insert to authenticated
  with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));

create policy "Owners remove from their boards"
  on public.board_items for delete to authenticated
  using (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));

revoke all on public.boards, public.board_items from anon, authenticated;
grant select, delete on public.boards, public.board_items to authenticated;
grant insert (name, is_private) on public.boards to authenticated;
grant update (name, is_private) on public.boards to authenticated;
grant insert (board_id, post_id, listing_id) on public.board_items to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. Reports on posts, comments and members
-- ─────────────────────────────────────────────────────────────
create table public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.post_comments (id) on delete cascade,
  member_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in (
    'not_clothing', 'ai_or_fake', 'inappropriate', 'counterfeit', 'scam', 'harassment', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id, member_id) = 1)
);

create unique index social_reports_once_post on public.social_reports (reporter_id, post_id) where post_id is not null;
create unique index social_reports_once_comment on public.social_reports (reporter_id, comment_id) where comment_id is not null;
create unique index social_reports_once_member on public.social_reports (reporter_id, member_id) where member_id is not null;

alter table public.social_reports enable row level security;

create policy "Members report what they can see, never themselves"
  on public.social_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (member_id is null or member_id <> (select auth.uid()))
    and (post_id is null or exists (
      select 1 from public.posts p where p.id = post_id and p.author_id <> (select auth.uid())))
    and (comment_id is null or exists (
      select 1 from public.post_comments c where c.id = comment_id and c.author_id <> (select auth.uid())))
  );

create policy "Members see their own reports"
  on public.social_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

revoke all on public.social_reports from anon, authenticated;
grant select on public.social_reports to authenticated;
grant insert (post_id, comment_id, member_id, reason, note) on public.social_reports to authenticated;

-- Three reports from different members pull a post from the feeds and hide
-- a comment, pending a look from Rota.
create function public.social_reports_escalate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.post_id is not null
     and (select count(*) from public.social_reports where post_id = new.post_id) >= 3 then
    update public.posts
      set distribution = 'limited', distribution_reason = 'reported'
      where id = new.post_id and distribution = 'public';
  end if;
  if new.comment_id is not null
     and (select count(*) from public.social_reports where comment_id = new.comment_id) >= 3 then
    update public.post_comments set hidden = true where id = new.comment_id;
  end if;
  return new;
end;
$$;

create trigger social_reports_escalate
  after insert on public.social_reports
  for each row execute function public.social_reports_escalate();

-- ─────────────────────────────────────────────────────────────
-- 9. Near me
-- ─────────────────────────────────────────────────────────────
-- Invoker rights: the posts policy still decides what comes back.
create function public.posts_near(p_lat double precision, p_lng double precision, p_km double precision default 5)
returns table (post_id uuid, km double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id,
         6371 * 2 * asin(sqrt(
           power(sin(radians(p.area_lat::double precision - p_lat) / 2), 2)
           + cos(radians(p_lat)) * cos(radians(p.area_lat::double precision))
             * power(sin(radians(p.area_lng::double precision - p_lng) / 2), 2)
         )) as km
  from public.posts p
  where p.area_lat is not null
    and p.distribution = 'public'
    and p.area_lat between p_lat - p_km / 111.0 and p_lat + p_km / 111.0
  order by km
  limit 200;
$$;

revoke execute on function public.posts_near(double precision, double precision, double precision) from public, anon;
grant execute on function public.posts_near(double precision, double precision, double precision) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 10. Storage for post photos and videos
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 104857600,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy "Members upload post media into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
