-- 034: every account is public, and live public stories are visible to every member.
-- Rota is a rental app first: the owner decided against private accounts.
-- - is_private stays as a column (always false) so existing reads keep working;
--   members lose the column grant and a check constraint refuses true.
-- - Stories no longer require a follow; can_view_social still applies blocks and
--   closed accounts (and is true for every live public account now).
-- - The follow-request functions from 029 (answer_follow_request, my_follow_requests,
--   follows_set_status, profiles_private_off) stay in place but are now unused:
--   every new follow is accepted at once.

update public.profiles set is_private = false where is_private;

revoke update (is_private) on public.profiles from authenticated;

alter table public.profiles add constraint profiles_always_public check (not is_private);

-- The name is kept so later migrations and docs still match it.
drop policy if exists "Live stories of people I follow, and my own" on public.stories;
create policy "Live stories of people I follow, and my own" on public.stories
  for select to authenticated using (
    deleted_at is null
    and (author_id = (select auth.uid())
         or (distribution = 'public'
             and expires_at > now()
             and public.can_view_social((select auth.uid()), author_id))));
