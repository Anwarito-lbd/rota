-- 030: mute (my feed only), restrict (their reviews on my posts and their new
-- messages are seen only by them), hidden words, who may review a post, and
-- my_activity without hidden reviews or pending follows.

create table public.member_mutes (
  muter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  mute_posts boolean not null default true,
  mute_stories boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
alter table public.member_mutes enable row level security;
create policy "Members manage their own mutes" on public.member_mutes
  for all to authenticated
  using (muter_id = (select auth.uid())) with check (muter_id = (select auth.uid()));

create table public.member_restricts (
  restrictor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  restricted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restrictor_id, restricted_id),
  check (restrictor_id <> restricted_id)
);
alter table public.member_restricts enable row level security;
create policy "Members manage their own restricts" on public.member_restricts
  for all to authenticated
  using (restrictor_id = (select auth.uid())) with check (restrictor_id = (select auth.uid()));

create table public.member_hidden_words (
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  word text not null check (char_length(btrim(word)) between 2 and 40),
  created_at timestamptz not null default now(),
  primary key (member_id, word)
);
alter table public.member_hidden_words enable row level security;
create policy "Members manage their own hidden words" on public.member_hidden_words
  for all to authenticated
  using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));

-- Lower case, no accents, so "MOCHÉ" matches "moche".
create or replace function public.fold_text(p text)
returns text language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(p, '')),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœ', 'aaaaaaceeeeiiiinooooouuuuyyo');
$$;

-- Built-in list, on unless the member turns it off (profiles.hide_default_words).
create or replace function public.default_hidden_words()
returns text[] language sql immutable set search_path = '' as $$
  select array['connard', 'connasse', 'salope', 'pute', 'encule', 'batard', 'fdp', 'ntm',
               'nique ta', 'grosse vache', 'bitch', 'whore', 'slut', 'retard', 'kys'];
$$;

create or replace function public.matches_hidden_words(p_owner uuid, p_body text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from (select public.fold_text(w.word) as word from public.member_hidden_words w where w.member_id = p_owner
            union all
            select d from unnest(public.default_hidden_words()) d
             where exists (select 1 from public.profiles pr where pr.id = p_owner and pr.hide_default_words)) words
     where public.fold_text(p_body) ~ ('\m' || regexp_replace(words.word, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M'));
$$;

alter table public.post_comments add column if not exists visibility text not null default 'public';
alter table public.post_comments add constraint post_comments_visibility check (visibility in ('public', 'author_only'));
alter table public.posts add column if not exists comment_policy text;
alter table public.posts add constraint posts_comment_policy
  check (comment_policy is null or comment_policy in ('everyone', 'followers', 'nobody'));
alter table public.posts add column if not exists hide_like_count boolean;

create or replace function public.post_comments_privacy()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  pol text;
begin
  select p.author_id, coalesce(p.comment_policy, pr.comment_policy) into owner, pol
    from public.posts p join public.profiles pr on pr.id = p.author_id
   where p.id = new.post_id;
  new.visibility := 'public';
  if owner is null or new.author_id = owner then return new; end if;
  if new.parent_id is null then
    if pol = 'nobody' then raise exception 'comments_closed'; end if;
    if pol = 'followers' and not exists (
         select 1 from public.follows f
          where f.follower_id = new.author_id and f.followee_id = owner and f.status = 'accepted') then
      raise exception 'followers_only';
    end if;
  end if;
  if exists (select 1 from public.member_restricts m where m.restrictor_id = owner and m.restricted_id = new.author_id)
     or public.matches_hidden_words(owner, new.body) then
    new.visibility := 'author_only';
  end if;
  return new;
end $$;
create trigger post_comments_privacy before insert on public.post_comments
  for each row execute function public.post_comments_privacy();

drop policy if exists "Comments follow their post, minus blocked members" on public.post_comments;
create policy "Comments follow their post, minus blocked and hidden ones" on public.post_comments
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_comments.post_id)
    and (author_id = (select auth.uid())
         or (not hidden and visibility = 'public'
             and not public.blocked_between((select auth.uid()), author_id))));

-- No push for a review only its author can see.
create or replace function public.post_comments_push()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility <> 'public' then return null; end if;
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
end $$;

create or replace function public.my_hidden_comments()
returns table (comment_id uuid, post_id uuid, author_id uuid, author_username text, body text,
               rating smallint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.post_id, c.author_id, pr.username, c.body, c.rating, c.created_at
    from public.post_comments c
    join public.posts p on p.id = c.post_id
    join public.profiles pr on pr.id = c.author_id
   where p.author_id = auth.uid() and c.visibility = 'author_only' and not c.hidden
   order by c.created_at desc
   limit 200;
$$;

create or replace function public.approve_hidden_comment(p_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.post_comments c set visibility = 'public'
    from public.posts p
   where c.id = p_comment and p.id = c.post_id and p.author_id = auth.uid();
end $$;

-- Pending follows and hidden reviews are not activity.
create or replace function public.my_activity(p_limit integer default 60)
returns table (kind text, actor_id uuid, actor_username text, actor_avatar text, post_id uuid,
               media text, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'like'::text, l.user_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], null::text, l.created_at
      from public.post_likes l join public.posts p on p.id = l.post_id join public.profiles pr on pr.id = l.user_id
     where p.author_id = auth.uid() and l.user_id <> auth.uid()
    union all
    select case when c.parent_id is null then 'comment' else 'reply' end, c.author_id, pr.username, pr.avatar_url,
           p.id, p.media_paths[1], c.body, c.created_at
      from public.post_comments c join public.posts p on p.id = c.post_id join public.profiles pr on pr.id = c.author_id
     where c.author_id <> auth.uid() and not c.hidden and c.visibility = 'public'
       and (p.author_id = auth.uid()
            or exists (select 1 from public.post_comments parent
                        where parent.id = c.parent_id and parent.author_id = auth.uid()))
    union all
    select 'repost', r.user_id, pr.username, pr.avatar_url, p.id, p.media_paths[1], null, r.created_at
      from public.reposts r join public.posts p on p.id = r.post_id join public.profiles pr on pr.id = r.user_id
     where p.author_id = auth.uid()
    union all
    select 'follow', f.follower_id, pr.username, pr.avatar_url, null, null, null, f.created_at
      from public.follows f join public.profiles pr on pr.id = f.follower_id
     where f.followee_id = auth.uid() and f.status = 'accepted'
  ) a (kind, actor_id, actor_username, actor_avatar, post_id, media, body, created_at)
  where auth.uid() is not null and not public.blocked_between(auth.uid(), a.actor_id)
  order by a.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

-- "Near me" skips members I muted.
create or replace function public.posts_near(p_lat double precision, p_lng double precision, p_km double precision default 5)
returns table (post_id uuid, km double precision)
language sql stable set search_path = '' as $$
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
    and not exists (select 1 from public.member_mutes m
                     where m.muter_id = auth.uid() and m.muted_id = p.author_id and m.mute_posts)
  order by km
  limit 200;
$$;

revoke execute on function public.my_hidden_comments(), public.approve_hidden_comment(uuid),
  public.matches_hidden_words(uuid, text) from public, anon;
grant execute on function public.my_hidden_comments(), public.approve_hidden_comment(uuid) to authenticated;

-- matches_hidden_words is only called by the trigger (as its owner). Left open,
-- any member could probe another member's hidden word list with it.
revoke execute on function public.matches_hidden_words(uuid, text) from authenticated;
-- Trigger functions are never called directly.
revoke execute on function public.post_comments_privacy() from public, anon, authenticated;
-- Harmless immutable helpers, but no reason for anonymous callers.
revoke execute on function public.fold_text(text), public.default_hidden_words() from public, anon;
