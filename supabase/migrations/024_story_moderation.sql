-- ═════════════════════════════════════════════════════════════
-- Rota — 024 Stories go through moderation
--
-- Stories from members who have not verified their identity wait as
-- 'pending' (018); until now nobody saw them. They now appear in the staff
-- Social queue with reported stories, and staff publish or remove them.
-- Removing a story sends the author a notice they can contest (DSA art. 17
-- and 20), like posts. Functions below replace 015's versions.
-- ═════════════════════════════════════════════════════════════

alter table public.moderation_notices drop constraint if exists moderation_notices_subject_kind_check;
alter table public.moderation_notices
  add constraint moderation_notices_subject_kind_check
  check (subject_kind in ('listing', 'post', 'comment', 'message', 'account', 'story'));

create function public.stories_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.distribution = 'blocked' and old.distribution <> 'blocked' then
    perform public.issue_moderation_notice(new.author_id, 'story', new.id, 'removed',
      coalesce(current_setting('rota.moderation_reason', true), 'reported'), new.caption);
  elsif new.distribution = 'public' and old.distribution = 'blocked' then
    perform public.settle_notices('story', new.id);
  end if;
  return null;
end;
$$;
create trigger stories_notice after update of distribution on public.stories
  for each row execute function public.stories_notice();
revoke execute on function public.stories_notice() from public, anon, authenticated;

create or replace function public.staff_social_queue()
returns table (
  kind text, target_id uuid, member_id uuid, member_username text, body text,
  media_paths text[], distribution text, report_count integer, report_reasons text[],
  report_notes text[], waiting_since timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff();
  return query
  select 'post', p.id, p.author_id, pr.username, p.caption, p.media_paths, p.distribution,
         (select count(*)::integer from public.social_reports r where r.post_id = p.id and r.state = 'open'),
         coalesce((select array_agg(distinct r.reason) from public.social_reports r where r.post_id = p.id and r.state = 'open'), '{}'),
         coalesce((select array_agg(r.note) from public.social_reports r where r.post_id = p.id and r.state = 'open' and r.note is not null), '{}'),
         least(case when p.distribution = 'pending' then p.created_at end,
               (select min(r.created_at) from public.social_reports r where r.post_id = p.id and r.state = 'open'))
    from public.posts p
    join public.profiles pr on pr.id = p.author_id
   where p.distribution = 'pending'
      or exists (select 1 from public.social_reports r where r.post_id = p.id and r.state = 'open')
  union all
  select 'comment', c.id, c.author_id, pr.username, c.body, '{}'::text[],
         case when c.hidden then 'hidden' else 'public' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.post_comments c on c.id = r.comment_id
    join public.profiles pr on pr.id = c.author_id
   where r.state = 'open'
   group by c.id, c.author_id, pr.username, c.body, c.hidden
  union all
  select 'message', m.id, m.sender_id, pr.username, m.body, '{}'::text[],
         case when m.hidden then 'hidden' else 'public' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.messages m on m.id = r.message_id
    join public.profiles pr on pr.id = m.sender_id
   where r.state = 'open'
   group by m.id, m.sender_id, pr.username, m.body, m.hidden
  union all
  select 'member', pr.id, pr.id, pr.username, pr.bio, '{}'::text[],
         case when coalesce(mr.posting_suspended, false) then 'suspended' else 'active' end,
         count(r.id)::integer, array_agg(distinct r.reason),
         coalesce(array_agg(r.note) filter (where r.note is not null), '{}'), min(r.created_at)
    from public.social_reports r
    join public.profiles pr on pr.id = r.member_id
    left join public.member_restrictions mr on mr.user_id = pr.id
   where r.state = 'open'
   group by pr.id, pr.username, pr.bio, mr.posting_suspended
  union all
  select 'story', s.id, s.author_id, pr.username, s.caption, array[s.media_path], s.distribution,
         (select count(*)::integer from public.social_reports r where r.story_id = s.id and r.state = 'open'),
         coalesce((select array_agg(distinct r.reason) from public.social_reports r where r.story_id = s.id and r.state = 'open'), '{}'),
         coalesce((select array_agg(r.note) from public.social_reports r where r.story_id = s.id and r.state = 'open' and r.note is not null), '{}'),
         least(case when s.distribution = 'pending' then s.created_at end,
               (select min(r.created_at) from public.social_reports r where r.story_id = s.id and r.state = 'open'))
    from public.stories s
    join public.profiles pr on pr.id = s.author_id
   where s.expires_at > now()
     and (s.distribution = 'pending'
          or exists (select 1 from public.social_reports r where r.story_id = s.id and r.state = 'open'))
  union all
  select 'appeal', n.id, n.member_id, pr.username, n.appeal_message,
         coalesce((select p.media_paths from public.posts p where n.subject_kind = 'post' and p.id = n.subject_id),
                  (select array[s.media_path] from public.stories s where n.subject_kind = 'story' and s.id = n.subject_id),
                  '{}'),
         n.subject_kind || ':' || n.action,
         0, array[n.reason],
         array_remove(array[n.excerpt, n.explanation], null), n.appealed_at
    from public.moderation_notices n
    join public.profiles pr on pr.id = n.member_id
   where n.appeal_state = 'open' and n.subject_kind <> 'listing'
  union all
  select 'web', w.id, null::uuid, coalesce(w.reporter_name, w.reporter_email, '—'), w.description, '{}'::text[],
         w.reason, 1, array[w.reason], array[w.content_url], w.created_at
    from public.web_reports w
   where w.state = 'open'
   order by 11;
end;
$$;
revoke execute on function public.staff_social_queue() from public, anon;
grant execute on function public.staff_social_queue() to authenticated;

create or replace function public.staff_decide_social(p_kind text, p_target uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  report_state text := case when p_action = 'dismiss' then 'dismissed' else 'actioned' end;
  n public.moderation_notices%rowtype;
  top_reason text;
begin
  perform public.require_staff();
  -- Read by the notice triggers: the staff note becomes the member's explanation.
  perform set_config('rota.moderation_note', coalesce(p_note, ''), true);
  if p_kind = 'post' then
    if p_action not in ('publish', 'limit', 'remove', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.post_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    update public.posts
       set distribution = case p_action when 'publish' then 'public' when 'limit' then 'limited'
                                        when 'remove' then 'blocked' else distribution end,
           distribution_reason = case p_action when 'publish' then null when 'dismiss' then distribution_reason
                                               else coalesce(top_reason, 'reported') end
     where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where post_id = p_target and state = 'open';
  elsif p_kind = 'comment' then
    if p_action not in ('hide', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.comment_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.post_comments set hidden = (p_action = 'hide') where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where comment_id = p_target and state = 'open';
  elsif p_kind = 'message' then
    if p_action not in ('hide', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.message_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.messages set hidden = (p_action = 'hide') where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where message_id = p_target and state = 'open';
  elsif p_kind = 'member' then
    if p_action not in ('suspend', 'dismiss') then raise exception 'invalid_action'; end if;
    if p_action = 'suspend' then
      select r.reason into top_reason from public.social_reports r
       where r.member_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
      insert into public.member_restrictions (user_id, posting_suspended, reason)
      values (p_target, true, coalesce(top_reason, 'reported'))
      on conflict (user_id) do update set posting_suspended = true, reason = excluded.reason;
    end if;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where member_id = p_target and state = 'open';
  elsif p_kind = 'story' then
    if p_action not in ('publish', 'remove', 'dismiss') then raise exception 'invalid_action'; end if;
    select r.reason into top_reason from public.social_reports r
     where r.story_id = p_target and r.state = 'open' group by r.reason order by count(*) desc limit 1;
    perform set_config('rota.moderation_reason', coalesce(top_reason, 'reported'), true);
    update public.stories
       set distribution = case p_action when 'publish' then 'public' when 'remove' then 'blocked' else distribution end
     where id = p_target;
    update public.social_reports set state = report_state, decided_by = me, decided_at = now()
     where story_id = p_target and state = 'open';
  elsif p_kind = 'appeal' then
    if p_action not in ('overturn', 'uphold') then raise exception 'invalid_action'; end if;
    select * into n from public.moderation_notices where id = p_target and appeal_state = 'open' for update;
    if not found then raise exception 'not_found'; end if;
    if p_action = 'overturn' then
      if n.subject_kind = 'post' then
        update public.posts set distribution = 'public', distribution_reason = null where id = n.subject_id;
      elsif n.subject_kind = 'comment' then
        update public.post_comments set hidden = false where id = n.subject_id;
      elsif n.subject_kind = 'message' then
        update public.messages set hidden = false where id = n.subject_id;
      elsif n.subject_kind = 'story' then
        update public.stories set distribution = 'public' where id = n.subject_id;
      elsif n.subject_kind = 'account' then
        update public.member_restrictions set posting_suspended = false where user_id = n.subject_id;
      end if;
    end if;
    update public.moderation_notices
       set appeal_state = case p_action when 'overturn' then 'overturned' else 'upheld' end,
           appeal_decided_at = now(), appeal_decided_by = me, appeal_note = left(p_note, 500)
     where id = n.id;
    perform public.notify_appeal_outcome(n.id);
  elsif p_kind = 'web' then
    if p_action not in ('actioned', 'dismiss') then raise exception 'invalid_action'; end if;
    update public.web_reports set state = report_state, decided_by = me, decided_at = now()
     where id = p_target and state = 'open';
  else
    raise exception 'invalid_kind';
  end if;
  perform public.audit(me, 'rota', 'social_' || p_kind, p_target::text, 'moderation.' || p_action, null,
                       jsonb_build_object('note', p_note));
end;
$$;
revoke execute on function public.staff_decide_social(text, uuid, text, text) from public, anon;
grant execute on function public.staff_decide_social(text, uuid, text, text) to authenticated;
