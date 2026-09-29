-- ═════════════════════════════════════════════════════════════
-- Rota — 020 Comments become reviews
--
-- A top-level comment on a post is now a review: 1 to 5 stars plus text.
-- Replies (parent_id set) carry no stars. One review per member per post,
-- and never on your own post. Comments written before this migration keep
-- rating = null and still show, without stars.
-- ═════════════════════════════════════════════════════════════

alter table public.post_comments
  add column if not exists rating smallint check (rating between 1 and 5),
  add constraint post_comments_reply_has_no_rating check (parent_id is null or rating is null);

grant insert (rating) on public.post_comments to authenticated;

create unique index if not exists post_comments_one_review
  on public.post_comments (post_id, author_id)
  where parent_id is null and rating is not null;

-- New top-level comments must be reviews, and not on the author's own post.
create function public.post_comments_review_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    if new.rating is null then
      raise exception 'rating_required';
    end if;
    if exists (select 1 from public.posts p where p.id = new.post_id and p.author_id = new.author_id) then
      raise exception 'own_post';
    end if;
  end if;
  return new;
end;
$$;
create trigger post_comments_review_check before insert on public.post_comments
  for each row execute function public.post_comments_review_check();
revoke execute on function public.post_comments_review_check() from public, anon, authenticated;

-- A post's author may clear replies under it, never someone's review
-- (hiding bad reviews would mislead other members). Reviewers still delete
-- their own, and reported reviews go through moderation.
drop policy if exists "Comment and post authors delete comments" on public.post_comments;
create policy "Comment and post authors delete comments"
  on public.post_comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or (parent_id is not null
        and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())))
  );
