-- 030b: review fixes for 030.
-- Per-post settings writable, better hidden-word matching (folded, one regex,
-- plurals), no "retard" false positive, a 200-word cap, the review policy on
-- replies, replies under a hidden review hidden too, approve_hidden_comment
-- returns whether it changed something, blocked authors out of the hidden list,
-- indexes and tighter grants on the 030 tables.
--
-- Note: posts.comment_count deliberately includes author_only reviews
-- (posts_bump_counters counts every insert), so a restricted member can't
-- detect the restriction from a counter that doesn't move.

-- 1. The owner sets these on their own post (the update policy already limits rows).
grant insert (comment_policy, hide_like_count), update (comment_policy, hide_like_count)
  on public.posts to authenticated;

-- 3. Lower case, compatibility-decomposed, no combining marks or zero-width
-- characters, straight apostrophes, ligatures spelled out, single spaces.
create or replace function public.fold_text(p text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
           replace(replace(replace(
             translate(
               regexp_replace(normalize(lower(coalesce(p, '')), NFKD),
                 '[' || chr(768) || '-' || chr(879) || chr(8203) || '-' || chr(8205) || chr(8288) || chr(65279) || ']',
                 '', 'g'),
               chr(8217) || chr(8216) || 'ø', '''''o'),
             'œ', 'oe'), 'æ', 'ae'), 'ß', 'ss'),
           '\s+', ' ', 'g'));
$$;

-- 2. "retard" is gone: it matched the French "en retard" (late).
create or replace function public.default_hidden_words()
returns text[] language sql immutable set search_path = '' as $$
  select array['connard', 'connasse', 'salope', 'pute', 'encule', 'batard', 'fdp', 'ntm',
               'nique ta', 'grosse vache', 'bitch', 'whore', 'slut', 'kys'];
$$;

-- 3. One alternation, the body folded once; a word matches on its own or with
-- a plural ending (s, x, es), between non-alphanumeric characters or the ends.
create or replace function public.matches_hidden_words(p_owner uuid, p_body text)
returns boolean language sql stable security definer set search_path = '' as $$
  with words as (
    select w.word from public.member_hidden_words w where w.member_id = p_owner
    union
    select public.fold_text(d) from unnest(public.default_hidden_words()) d
     where exists (select 1 from public.profiles pr where pr.id = p_owner and pr.hide_default_words)
  ),
  pattern as (
    select string_agg(regexp_replace(words.word, '([.*+?^${}()|\[\]\\])', '\\\1', 'g'), '|') as alternation
      from words
     where words.word <> ''
  )
  select coalesce(
    (select public.fold_text(p_body)
              ~ ('(^|[^[:alnum:]])(' || pattern.alternation || ')(s|x|es)?($|[^[:alnum:]])')
       from pattern
      where pattern.alternation is not null),
    false);
$$;

-- 3. Stored words are folded; existing rows are folded and deduplicated first.
delete from public.member_hidden_words a
 using public.member_hidden_words b
 where a.member_id = b.member_id
   and public.fold_text(a.word) = public.fold_text(b.word)
   and (a.created_at, a.word) > (b.created_at, b.word);
delete from public.member_hidden_words where char_length(public.fold_text(word)) < 2;
update public.member_hidden_words set word = public.fold_text(word) where word <> public.fold_text(word);

-- 5. At most 200 words per member.
create or replace function public.member_hidden_words_prepare()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.word := public.fold_text(new.word);
  if tg_op = 'INSERT'
     and (select count(*) from public.member_hidden_words w where w.member_id = new.member_id) >= 200 then
    raise exception 'too_many_words';
  end if;
  return new;
end $$;
create trigger member_hidden_words_prepare before insert or update on public.member_hidden_words
  for each row execute function public.member_hidden_words_prepare();

-- 4 and 6. The review policy covers replies too (the owner stays exempt), and a
-- reply under a review only its author can see is hidden as well.
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
  if new.parent_id is not null and exists (
       select 1 from public.post_comments c where c.id = new.parent_id and c.visibility = 'author_only') then
    new.visibility := 'author_only';
  end if;
  if owner is null or new.author_id = owner then return new; end if;
  if pol = 'nobody' then raise exception 'comments_closed'; end if;
  if pol = 'followers' and not exists (
       select 1 from public.follows f
        where f.follower_id = new.author_id and f.followee_id = owner and f.status = 'accepted') then
    raise exception 'followers_only';
  end if;
  if exists (select 1 from public.member_restricts m where m.restrictor_id = owner and m.restricted_id = new.author_id)
     or public.matches_hidden_words(owner, new.body) then
    new.visibility := 'author_only';
  end if;
  return new;
end $$;

-- 7. True when a hidden comment on my post became public, false otherwise.
drop function public.approve_hidden_comment(uuid);
create function public.approve_hidden_comment(p_comment uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.post_comments c set visibility = 'public'
    from public.posts p
   where c.id = p_comment and c.visibility = 'author_only'
     and p.id = c.post_id and p.author_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- 8. Members blocked either way are left out.
create or replace function public.my_hidden_comments()
returns table (comment_id uuid, post_id uuid, author_id uuid, author_username text, body text,
               rating smallint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.post_id, c.author_id, pr.username, c.body, c.rating, c.created_at
    from public.post_comments c
    join public.posts p on p.id = c.post_id
    join public.profiles pr on pr.id = c.author_id
   where p.author_id = auth.uid() and c.visibility = 'author_only' and not c.hidden
     and not public.blocked_between(auth.uid(), c.author_id)
   order by c.created_at desc
   limit 200;
$$;

-- 9. Indexes for "who muted / restricted me" lookups and cascading deletes.
create index if not exists member_mutes_muted on public.member_mutes (muted_id);
create index if not exists member_restricts_restricted on public.member_restricts (restricted_id);

-- 10. Signed-out callers get nothing; members get rows only through RLS.
revoke all on public.member_mutes, public.member_restricts, public.member_hidden_words from anon;
revoke truncate, references, trigger on public.member_mutes, public.member_restricts, public.member_hidden_words
  from authenticated;

revoke execute on function public.approve_hidden_comment(uuid) from public, anon;
grant execute on function public.approve_hidden_comment(uuid) to authenticated;
revoke execute on function public.member_hidden_words_prepare() from public, anon, authenticated;
revoke execute on function public.fold_text(text), public.default_hidden_words() from public, anon;
