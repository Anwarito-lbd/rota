-- ═════════════════════════════════════════════════════════════
-- Rota — 022 Highlights on profiles
--
-- Instagram-style highlights: a titled set of photos pinned under the
-- profile header. They reuse files the member already uploaded to their own
-- post-media folder (posts or stories), so nothing new goes around the
-- upload checks. Visible to members unless a block stands between them.
-- ═════════════════════════════════════════════════════════════

-- True when every path is a file in `folder` of the bucket, never a URL.
create function public.paths_in_own_folder(p_paths text[], p_folder text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(p !~ '^[a-zA-Z][a-zA-Z0-9+.-]*:' and split_part(p, '/', 1) = p_folder), false)
    from unnest(p_paths) p;
$$;

create table public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 24),
  media_paths text[] not null check (cardinality(media_paths) between 1 and 20),
  created_at timestamptz not null default now(),
  constraint story_highlights_own_media check (public.paths_in_own_folder(media_paths, owner_id::text))
);
create index story_highlights_owner on public.story_highlights (owner_id, created_at);
alter table public.story_highlights enable row level security;

create policy "Highlights are visible to members, never across a block"
  on public.story_highlights for select to authenticated
  using (owner_id = (select auth.uid()) or not public.blocked_between((select auth.uid()), owner_id));
create policy "Members create their own highlights"
  on public.story_highlights for insert to authenticated
  with check (owner_id = (select auth.uid()) and not public.posting_suspended());
create policy "Members edit their own highlights"
  on public.story_highlights for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Members delete their own highlights"
  on public.story_highlights for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.story_highlights from anon, authenticated;
grant select, delete on public.story_highlights to authenticated;
grant insert (title, media_paths), update (title, media_paths) on public.story_highlights to authenticated;
revoke execute on function public.paths_in_own_folder(text[], text) from public, anon;
grant execute on function public.paths_in_own_folder(text[], text) to authenticated;

-- Closing an account (013/018) also removes them.
create or replace function public.close_member_social(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.stories where author_id = p_user;
  delete from public.reposts where user_id = p_user;
  delete from public.comment_likes where user_id = p_user;
  delete from public.story_highlights where owner_id = p_user;
$$;
revoke execute on function public.close_member_social(uuid) from public, anon, authenticated;
grant execute on function public.close_member_social(uuid) to service_role;
