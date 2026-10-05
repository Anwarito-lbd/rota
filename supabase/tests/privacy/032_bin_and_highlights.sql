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

  raise exception 'RESULT %', out;
end $$;
