do $$
declare
  o uuid := pg_temp.member('bo');
  v uuid := pg_temp.member('bv');
  p uuid; p2 uuid; s uuid; s_other uuid; h uuid; n int; err text; out jsonb := '{}';
begin
  update public.profiles set identity_status = 'verified' where id = o;
  update public.profiles set identity_status = 'verified' where id = v;
  insert into public.posts (author_id, kind, media_paths, area_lat, area_lng)
    values (o, 'fit', array[o::text || '/p.jpg'], 48.86321, 2.34712) returning id into p;
  out := out || jsonb_build_object('grid_1km', (select area_lat = 48.86 and area_lng = 2.35 from public.posts where id = p));
  insert into public.stories (author_id, media_path) values (o, o::text || '/s.jpg') returning id into s;
  insert into public.stories (author_id, media_path) values (v, v::text || '/x.jpg') returning id into s_other;
  perform set_config('rota.moderating', 'on', true);
  update public.stories set distribution = 'public' where id in (s, s_other);
  perform set_config('rota.moderating', 'off', true);

  perform pg_temp.claims(o); set local role authenticated;
  insert into public.story_highlights (title, story_ids) values ('Été', array[s]) returning id into h;
  out := out || jsonb_build_object('paths_derived',
    (select media_paths = array[o::text || '/s.jpg'] from public.story_highlights where id = h));
  begin
    insert into public.story_highlights (title, story_ids) values ('Vol', array[s_other]);
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('other_story_refused', err = 'story_not_yours');
  perform public.delete_post(p);
  reset role;

  perform pg_temp.claims(v); set local role authenticated;
  select count(*) into n from public.posts where id = p;
  out := out || jsonb_build_object('deleted_hidden', n = 0);
  reset role;
  perform pg_temp.claims(o); set local role authenticated;
  select count(*) into n from public.my_recently_deleted();
  out := out || jsonb_build_object('in_bin', n = 1);
  perform public.restore_post(p);
  reset role;
  perform pg_temp.claims(v); set local role authenticated;
  select count(*) into n from public.posts where id = p;
  out := out || jsonb_build_object('restored_visible', n = 1);
  reset role;

  -- Deleting a story takes it out of highlights; an empty highlight goes.
  perform pg_temp.claims(o); set local role authenticated;
  perform public.delete_story(s);
  reset role;
  out := out || jsonb_build_object('empty_highlight_removed', not exists (select 1 from public.story_highlights where id = h));

  -- Purge queue: 31 days old is due, unless a recent moderation notice protects it.
  update public.posts set deleted_at = now() - interval '31 days' where id = p;
  insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/q.jpg']) returning id into p2;
  update public.posts set deleted_at = now() - interval '31 days' where id = p2;
  insert into public.moderation_notices (member_id, subject_kind, subject_id, action, reason, automated)
    values (o, 'post', p2, 'removed', 'other', false);
  select count(*) into n from public.purge_due(50) where id = p;
  out := out || jsonb_build_object('old_post_due', n = 1);
  select count(*) into n from public.purge_due(50) where id = p2;
  out := out || jsonb_build_object('notice_protects', n = 0);

  -- 032c ---------------------------------------------------------------------
  declare
    f uuid := pg_temp.member('bf');   -- follows o
    u uuid := pg_temp.member('bu');   -- unverified author: posts stay pending
    c uuid := pg_temp.member('bc');   -- comments on o's post, saves it to a board
    s3 uuid; s4 uuid; s5 uuid; h2 uuid; h3 uuid; b uuid; cm uuid;
    p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid; p9 uuid;
    ok boolean; ok2 boolean;
  begin
    -- The member RPCs say whether they changed something.
    insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/3.jpg']) returning id into p3;
    insert into public.stories (author_id, media_path) values (o, o::text || '/s5.jpg') returning id into s5;
    perform pg_temp.claims(o); set local role authenticated;
    out := out || jsonb_build_object(
      'delete_post_true', public.delete_post(p3),
      'delete_post_again_false', not public.delete_post(p3),
      'restore_post_true', public.restore_post(p3),
      'delete_story_true', public.delete_story(s5),
      'delete_story_again_false', not public.delete_story(s5),
      'restore_story_true', public.restore_story(s5));
    reset role;
    perform pg_temp.claims(v); set local role authenticated;
    out := out || jsonb_build_object('delete_others_post_false', not public.delete_post(p3));
    reset role;

    -- Deletion only through the bin.
    out := out || jsonb_build_object('no_direct_delete_grant',
      not has_table_privilege('authenticated', 'public.posts', 'DELETE')
      and not has_table_privilege('authenticated', 'public.stories', 'DELETE'));

    -- Indexes for highlights and expired stories.
    out := out || jsonb_build_object(
      'highlights_gin_index', exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'story_highlights'
                                                         and indexdef ilike '%using gin (story_ids)%'),
      'stories_expiry_index', exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'stories'
                                                         and indexdef ilike '%(expires_at) where (deleted_at is null)%'));

    -- Duplicate story ids are folded, first occurrence kept.
    insert into public.stories (author_id, media_path) values (o, o::text || '/s3.jpg') returning id into s3;
    insert into public.stories (author_id, media_path) values (o, o::text || '/s4.jpg') returning id into s4;
    perform set_config('rota.moderating', 'on', true);
    update public.stories set distribution = 'public' where id in (s3, s4);
    perform set_config('rota.moderating', 'off', true);
    perform pg_temp.claims(o); set local role authenticated;
    insert into public.story_highlights (title, story_ids) values ('Trois', array[s3, s4, s3]) returning id into h2;
    insert into public.story_highlights (title, story_ids) values ('Seule', array[s3]) returning id into h3;
    reset role;
    out := out || jsonb_build_object('dedupe_first_order',
      coalesce((select story_ids = array[s3, s4] and media_paths = array[o::text || '/s3.jpg', o::text || '/s4.jpg']
                  from public.story_highlights where id = h2), false));

    -- A story blocked by moderation leaves every highlight.
    perform pg_temp.claims(f); set local role authenticated;
    insert into public.follows (followee_id) values (o);
    ok := exists (select 1 from public.story_highlights where owner_id = o and (o::text || '/s3.jpg') = any (media_paths));
    reset role;
    perform set_config('rota.moderating', 'on', true);
    update public.stories set distribution = 'blocked' where id = s3;
    perform set_config('rota.moderating', 'off', true);
    perform pg_temp.claims(f); set local role authenticated;
    ok2 := not exists (select 1 from public.story_highlights where owner_id = o and (o::text || '/s3.jpg') = any (media_paths));
    reset role;
    out := out || jsonb_build_object(
      'blocked_story_path_gone', ok and ok2,
      'blocked_only_story_highlight_gone', not exists (select 1 from public.story_highlights where id = h3),
      'blocked_other_story_kept', coalesce((select story_ids = array[s4] and media_paths = array[o::text || '/s4.jpg']
                                              from public.story_highlights where id = h2), false));

    -- my_activity forgets a post once it is in the bin.
    insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/4.jpg']) returning id into p4;
    perform pg_temp.claims(c); set local role authenticated;
    insert into public.post_comments (post_id, body, rating) values (p4, 'Très joli', 5) returning id into cm;
    reset role;
    perform pg_temp.claims(o); set local role authenticated;
    insert into public.post_comments (post_id, parent_id, body) values (p4, cm, 'Merci beaucoup');
    reset role;
    perform pg_temp.claims(c); set local role authenticated;
    ok := exists (select 1 from public.my_activity(200) a where a.kind = 'reply' and a.post_id = p4);
    reset role;
    perform pg_temp.claims(o); set local role authenticated;
    perform public.delete_post(p4);
    reset role;
    perform pg_temp.claims(c); set local role authenticated;
    ok2 := not exists (select 1 from public.my_activity(200) a where a.post_id = p4);
    reset role;
    out := out || jsonb_build_object('activity_reply_before_delete', ok, 'activity_gone_after_delete', ok2);

    -- A board shows a saved post only while the post is visible.
    insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/5.jpg']) returning id into p5;
    perform pg_temp.claims(c); set local role authenticated;
    insert into public.boards (name) values ('Idées') returning id into b;
    insert into public.board_items (board_id, post_id) values (b, p5);
    ok := exists (select 1 from public.board_items where board_id = b);
    reset role;
    perform pg_temp.claims(o); set local role authenticated;
    perform public.delete_post(p5);
    reset role;
    perform pg_temp.claims(c); set local role authenticated;
    ok2 := not exists (select 1 from public.board_items where board_id = b);
    reset role;
    out := out || jsonb_build_object('board_item_before_delete', ok, 'board_item_hidden_after_delete', ok2);

    -- Purge queue: an open appeal, an open report and an unreviewed post all wait.
    insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/6.jpg']) returning id into p6;
    insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/7.jpg']) returning id into p7;
    insert into public.posts (author_id, kind, media_paths) values (u, 'fit', array[u::text || '/8.jpg']) returning id into p8;
    insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/9.jpg']) returning id into p9;
    update public.posts set deleted_at = now() - interval '31 days' where id in (p6, p7, p8, p9);
    insert into public.moderation_notices (member_id, subject_kind, subject_id, action, reason, automated,
                                           created_at, appeal_state, appeal_message, appealed_at)
      values (o, 'post', p6, 'removed', 'other', false,
              now() - interval '7 months', 'open', 'Je conteste cette décision', now() - interval '5 months');
    insert into public.social_reports (reporter_id, post_id, reason) values (v, p7, 'other');
    out := out || jsonb_build_object(
      'open_appeal_protects', not exists (select 1 from public.purge_due(200) d where d.id = p6),
      'open_report_protects', not exists (select 1 from public.purge_due(200) d where d.id = p7),
      'pending_not_due', (select distribution from public.posts where id = p8) = 'pending'
                         and not exists (select 1 from public.purge_due(200) d where d.id = p8));

    -- purge_done re-checks: true only when it deleted.
    ok := exists (select 1 from public.purge_due(200) d where d.id = p9);
    insert into public.moderation_notices (member_id, subject_kind, subject_id, action, reason, automated)
      values (o, 'post', p9, 'removed', 'other', false);
    ok2 := not public.purge_done('post', p9) and exists (select 1 from public.posts where id = p9);
    out := out || jsonb_build_object('purge_done_rechecks', ok and ok2);
    -- Separate statements: a query does not see rows its own function call deleted.
    ok := public.purge_done('post', p);
    out := out || jsonb_build_object('purge_done_deletes', ok and not exists (select 1 from public.posts where id = p));
  end;

  raise exception 'RESULT %', out;
end $$;
