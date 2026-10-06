-- 033f: storage paths by allow-list.
-- The 033e deny-list let a tab, line feed or carriage return through inside '..'
-- ('<me>/.\t./<them>/x.jpg'); URL parsers strip those and collapse the '..'.
-- A path is now '<owner>' followed by one or more '/<segment>', where a segment is
-- letters, digits, '-' or '_' with single dots between them. The app's upload
-- format, '<uid>[/<sub>]/<ms>-<base36>.<ext>', passes. The TypeScript pathOwnedBy
-- (functions/_shared/clients.ts) uses the same expression.
-- path_owned_by keeps its signature, so the listing gate and paths_owned_by pick
-- it up; the stories and posts checks are re-added so existing rows are validated
-- again (live counts are 0).
-- storage_orphans gains an attempt counter: the worker stops retrying after 10.

create or replace function public.path_owned_by(p_path text, p_owner uuid)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    p_owner is not null
      and p_path ~ ('^' || p_owner::text || '(/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*)+$'),
    false);
$$;

alter table public.stories drop constraint stories_media_in_own_folder;
alter table public.stories add constraint stories_media_in_own_folder
  check (public.path_owned_by(media_path, author_id));
alter table public.posts drop constraint posts_media_in_own_folder;
alter table public.posts add constraint posts_media_in_own_folder
  check (public.paths_owned_by(media_paths, author_id));

alter table public.storage_orphans add column if not exists attempts integer not null default 0;
