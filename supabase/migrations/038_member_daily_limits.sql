-- ═════════════════════════════════════════════════════════════
-- Rota — 038 Daily ceilings per member
--
-- Listings already stop at 20 a day (005). Everything else a member can
-- create had no ceiling: one account, or a script with a stolen session,
-- could post thousands of posts and stories (each file is stored and
-- downloaded, both billed), or flood other members with comments,
-- messages and follow notifications. These limits sit far above what a
-- real member does in a day; staff can change them in policy_config.
-- ═════════════════════════════════════════════════════════════

insert into public.policy_config (key, value, note) values
  ('max_posts_per_day', '30', 'Posts a member can publish per day.'),
  ('max_stories_per_day', '50', 'Stories a member can publish per day.'),
  ('max_comments_per_day', '300', 'Comments a member can write per day.'),
  ('max_messages_per_day', '500', 'Messages a member can send per day.'),
  ('max_follows_per_day', '200', 'Members someone can follow per day.'),
  ('max_uploads_per_day', '200', 'Files a member can upload per day, all buckets together.')
on conflict (key) do nothing;

create index if not exists stories_author_created on public.stories (author_id, created_at desc);
create index if not exists post_comments_author_created on public.post_comments (author_id, created_at desc);
create index if not exists messages_sender_created on public.messages (sender_id, created_at desc);
create index if not exists follows_follower_created on public.follows (follower_id, created_at desc);

-- One trigger function for the four tables; the table decides the column and the limit.
create function public.member_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  lim numeric;
begin
  case tg_table_name
    when 'posts' then
      select count(*) into n from public.posts where author_id = new.author_id and created_at > now() - interval '24 hours';
      lim := public.policy_num('max_posts_per_day', 30);
    when 'stories' then
      select count(*) into n from public.stories where author_id = new.author_id and created_at > now() - interval '24 hours';
      lim := public.policy_num('max_stories_per_day', 50);
    when 'post_comments' then
      select count(*) into n from public.post_comments where author_id = new.author_id and created_at > now() - interval '24 hours';
      lim := public.policy_num('max_comments_per_day', 300);
    when 'messages' then
      select count(*) into n from public.messages where sender_id = new.sender_id and created_at > now() - interval '24 hours';
      lim := public.policy_num('max_messages_per_day', 500);
    when 'follows' then
      select count(*) into n from public.follows where follower_id = new.follower_id and created_at > now() - interval '24 hours';
      lim := public.policy_num('max_follows_per_day', 200);
  end case;
  if n >= lim then
    raise exception 'Too many today: %', tg_table_name using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.member_daily_limit() from public, anon, authenticated;

create trigger posts_daily_limit before insert on public.posts
  for each row execute function public.member_daily_limit();
create trigger stories_daily_limit before insert on public.stories
  for each row execute function public.member_daily_limit();
create trigger post_comments_daily_limit before insert on public.post_comments
  for each row execute function public.member_daily_limit();
create trigger messages_daily_limit before insert on public.messages
  for each row execute function public.member_daily_limit();
create trigger follows_daily_limit before insert on public.follows
  for each row execute function public.member_daily_limit();

-- Uploads: a restrictive policy, so it applies on top of every bucket's own
-- insert policy. Files always live under the member's id (033e/033f).
create function public.upload_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*) from storage.objects o
           where o.name like (select auth.uid())::text || '/%'
             and o.created_at > now() - interval '24 hours')
         < public.policy_num('max_uploads_per_day', 200);
$$;
revoke execute on function public.upload_allowed() from public, anon;
grant execute on function public.upload_allowed() to authenticated;

drop policy if exists "Daily upload ceiling" on storage.objects;
create policy "Daily upload ceiling" on storage.objects
  as restrictive for insert to authenticated
  with check (public.upload_allowed());
