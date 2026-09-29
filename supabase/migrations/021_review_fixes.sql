-- ═════════════════════════════════════════════════════════════
-- Rota — 021 Fixes from the code review of 015–018
--
-- • Stories only point at a file in the author's own post-media folder,
--   never an outside URL (it would skip upload checks and moderation).
-- • The three-report rule counts open reports only: once staff dismiss
--   reports, one new report no longer re-limits the post or hides the
--   comment (and no longer sends the member a fresh notice).
-- • Restoring content settles its notice even when the member never
--   appealed, and tells them.
-- ═════════════════════════════════════════════════════════════

-- NOT VALID: applies to new stories; existing ones expire within 24 h.
alter table public.stories
  add constraint stories_media_in_own_folder
  check (media_path !~ '^[a-zA-Z][a-zA-Z0-9+.-]*:' and split_part(media_path, '/', 1) = author_id::text) not valid;

create or replace function public.social_reports_escalate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  top_reason text;
begin
  if new.post_id is not null
     and (select count(*) from public.social_reports where post_id = new.post_id and state = 'open') >= 3 then
    select r.reason into top_reason from public.social_reports r
     where r.post_id = new.post_id and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    update public.posts
      set distribution = 'limited', distribution_reason = coalesce(top_reason, 'reported')
      where id = new.post_id and distribution = 'public';
  end if;
  if new.comment_id is not null
     and (select count(*) from public.social_reports where comment_id = new.comment_id and state = 'open') >= 3 then
    select r.reason into top_reason from public.social_reports r
     where r.comment_id = new.comment_id and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.post_comments set hidden = true where id = new.comment_id and not hidden;
  end if;
  return new;
end;
$$;
revoke execute on function public.social_reports_escalate() from public, anon, authenticated;

create or replace function public.settle_notices(p_kind text, p_subject uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in
    update public.moderation_notices
       set appeal_state = 'overturned', appeal_decided_at = now(), appeal_decided_by = auth.uid()
     where subject_kind = p_kind and subject_id = p_subject and appeal_state in ('none', 'open')
    returning id
  loop
    perform public.notify_appeal_outcome(v_id);
  end loop;
end;
$$;
revoke execute on function public.settle_notices(text, uuid) from public, anon, authenticated;
