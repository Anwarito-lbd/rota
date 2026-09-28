-- ═════════════════════════════════════════════════════════════
-- Rota — 019 Fix: the "posting suspended" checks in RLS policies
--
-- 009 (comments) and 010 (messages) checked member_restrictions inside the
-- insert policies. Those run as the member, who has no access to that
-- table, so every comment and message was refused with "permission denied".
-- The check now goes through a security-definer function that only answers
-- yes/no for the caller.
-- ═════════════════════════════════════════════════════════════

create function public.posting_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.posting_suspended from public.member_restrictions r where r.user_id = auth.uid()), false);
$$;
revoke execute on function public.posting_suspended() from public, anon;
grant execute on function public.posting_suspended() to authenticated;

drop policy if exists "Members comment on posts they can see, never across a block" on public.post_comments;
create policy "Members comment on posts they can see, never across a block"
  on public.post_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.distribution = 'public'
        and not public.blocked_between((select auth.uid()), p.author_id)
    )
    and not public.posting_suspended()
  );

drop policy if exists "Members write in their conversations, never across a block" on public.messages;
create policy "Members write in their conversations, never across a block"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.member_a, c.member_b)
        and not public.blocked_between(c.member_a, c.member_b)
    )
    and not public.posting_suspended()
  );
