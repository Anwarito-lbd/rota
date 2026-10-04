do $$
declare
  o uuid := pg_temp.member('ro');   -- post owner
  r uuid := pg_temp.member('rr');   -- restricted member
  w uuid := pg_temp.member('rw');   -- writes a hidden word
  v uuid := pg_temp.member('rv');   -- viewer
  p uuid; c_r uuid; c_w uuid; n int; denied text; out jsonb := '{}';
begin
  update public.profiles set identity_status = 'verified' where id = o;
  insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/p.jpg']) returning id into p;
  insert into public.member_restricts (restrictor_id, restricted_id) values (o, r);
  insert into public.member_hidden_words (member_id, word) values (o, 'moche');

  perform pg_temp.claims(r); set local role authenticated;
  insert into public.post_comments (post_id, body, rating) values (p, 'Pas mal', 4) returning id into c_r;
  reset role;
  perform pg_temp.claims(w); set local role authenticated;
  insert into public.post_comments (post_id, body, rating) values (p, 'Franchement MOCHE', 1) returning id into c_w;
  reset role;
  out := out || jsonb_build_object(
    'restricted_author_only', (select visibility from public.post_comments where id = c_r) = 'author_only',
    'hidden_word_author_only', (select visibility from public.post_comments where id = c_w) = 'author_only');

  perform pg_temp.claims(v); set local role authenticated;
  select count(*) into n from public.post_comments where post_id = p;
  out := out || jsonb_build_object('viewer_sees_none', n = 0);
  reset role;
  perform pg_temp.claims(r); set local role authenticated;
  select count(*) into n from public.post_comments where post_id = p;
  out := out || jsonb_build_object('restricted_sees_own', n = 1);
  reset role;
  perform pg_temp.claims(o); set local role authenticated;
  select count(*) into n from public.my_hidden_comments();
  out := out || jsonb_build_object('owner_lists_two_hidden', n = 2);
  perform public.approve_hidden_comment(c_r);
  reset role;
  out := out || jsonb_build_object('approved_public', (select visibility from public.post_comments where id = c_r) = 'public');

  -- Review policy: nobody, then followers.
  update public.posts set comment_policy = 'nobody' where id = p;
  perform pg_temp.claims(v); set local role authenticated;
  begin
    insert into public.post_comments (post_id, body, rating) values (p, 'Top', 5);
  exception when others then denied := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('nobody_refused', denied = 'comments_closed');
  update public.posts set comment_policy = null where id = p;
  update public.profiles set comment_policy = 'followers' where id = o;
  denied := null;
  perform pg_temp.claims(v); set local role authenticated;
  begin
    insert into public.post_comments (post_id, body, rating) values (p, 'Top', 5);
  exception when others then denied := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('followers_only_refused', denied = 'followers_only');

  -- Mute is private to the muter.
  perform pg_temp.claims(v); set local role authenticated;
  insert into public.member_mutes (muted_id, mute_posts, mute_stories) values (o, true, false);
  select count(*) into n from public.member_mutes;
  out := out || jsonb_build_object('muter_sees_mute', n = 1);
  reset role;
  perform pg_temp.claims(o); set local role authenticated;
  select count(*) into n from public.member_mutes;
  out := out || jsonb_build_object('muted_sees_nothing', n = 0);
  reset role;

  raise exception 'RESULT %', out;
end $$;
