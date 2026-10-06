do $$
declare
  o uuid := pg_temp.member('uo');   -- story author
  v uuid := pg_temp.member('uv');   -- stranger, follows nobody
  k uuid := pg_temp.member('uk');   -- blocked by o
  d uuid := pg_temp.member('ud');   -- author whose account is closed
  s uuid; s_old uuid; s_d uuid; n int; err text; out jsonb := '{}';
begin
  -- Nobody can go private: members lack the column grant, the table refuses it.
  perform pg_temp.claims(o); set local role authenticated;
  begin
    update public.profiles set is_private = true where id = o;
  exception when others then err := sqlstate;
  end;
  reset role;
  out := out || jsonb_build_object('member_cannot_go_private', err = '42501');
  err := null;
  begin
    update public.profiles set is_private = true where id = o;
  exception when others then err := sqlstate;
  end;
  out := out || jsonb_build_object('table_refuses_private', err = '23514',
    'no_private_accounts', not exists (select 1 from public.profiles where is_private));

  -- Stories: a live public story, an expired one, and a closed account's story.
  insert into public.stories (author_id, media_path) values (o, o::text || '/s.jpg') returning id into s;
  insert into public.stories (author_id, media_path) values (o, o::text || '/old.jpg') returning id into s_old;
  insert into public.stories (author_id, media_path) values (d, d::text || '/d.jpg') returning id into s_d;
  perform set_config('rota.moderating', 'on', true);
  update public.stories set distribution = 'public' where id in (s, s_old, s_d);
  perform set_config('rota.moderating', 'off', true);
  update public.stories set expires_at = now() - interval '1 minute' where id = s_old;
  update public.profiles set deleted_at = now() where id = d;
  insert into public.member_blocks (blocker_id, blocked_id) values (o, k);

  perform pg_temp.claims(v); set local role authenticated;
  select count(*) into n from public.stories where id = s;
  out := out || jsonb_build_object('stranger_sees_live_story', n = 1);
  select count(*) into n from public.stories where id = s_old;
  out := out || jsonb_build_object('expired_hidden', n = 0);
  select count(*) into n from public.stories where id = s_d;
  out := out || jsonb_build_object('closed_author_hidden', n = 0);
  reset role;

  perform pg_temp.claims(k); set local role authenticated;
  select count(*) into n from public.stories where id = s;
  out := out || jsonb_build_object('blocked_hidden', n = 0);
  select count(*) into n from public.stories where id = s_d;
  out := out || jsonb_build_object('blocked_closed_author_hidden', n = 0);
  reset role;

  perform pg_temp.claims(o); set local role authenticated;
  select count(*) into n from public.stories where id in (s, s_old);
  out := out || jsonb_build_object('author_sees_own', n = 2);
  reset role;

  raise exception 'RESULT %', out;
end $$;
