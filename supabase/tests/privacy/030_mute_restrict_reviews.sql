do $$
declare
  o uuid := pg_temp.member('ro');   -- post owner
  r uuid := pg_temp.member('rr');   -- restricted member
  w uuid := pg_temp.member('rw');   -- writes a hidden word
  v uuid := pg_temp.member('rv');   -- viewer
  o2 uuid := pg_temp.member('rp');  -- second owner, built-in list on
  o3 uuid := pg_temp.member('rq');  -- third owner, built-in list off
  p uuid; p2 uuid; c_r uuid; c_w uuid; c_x uuid; n int; n2 int; ok boolean; denied text; out jsonb := '{}';
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

  -- 030b ---------------------------------------------------------------------
  update public.profiles set identity_status = 'verified' where id = o2;
  update public.profiles set hide_default_words = false where id = o3;
  insert into public.posts (author_id, kind, media_paths) values (o2, 'fit', array[o2::text || '/p.jpg']) returning id into p2;

  -- "en retard" (late) is not an insult.
  perform pg_temp.claims(w); set local role authenticated;
  insert into public.post_comments (post_id, body, rating) values (p2, 'Livraison en retard, sinon top', 4) returning id into c_x;
  reset role;
  out := out || jsonb_build_object('en_retard_public',
    coalesce((select visibility from public.post_comments where id = c_x) = 'public', false));

  -- The owner can write the per-post settings.
  denied := null;
  perform pg_temp.claims(o2); set local role authenticated;
  begin
    update public.posts set comment_policy = 'nobody', hide_like_count = true where id = p2;
  exception when others then denied := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('owner_sets_post_policy', denied is null
    and coalesce((select comment_policy = 'nobody' and hide_like_count from public.posts where id = p2), false));

  -- The review policy covers replies; the owner stays exempt.
  denied := null;
  perform pg_temp.claims(v); set local role authenticated;
  begin
    insert into public.post_comments (post_id, parent_id, body) values (p2, c_x, 'Pareil');
  exception when others then denied := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('nobody_refuses_replies', coalesce(denied = 'comments_closed', false));
  denied := null;
  perform pg_temp.claims(o2); set local role authenticated;
  begin
    insert into public.post_comments (post_id, parent_id, body) values (p2, c_x, 'Merci');
  exception when others then denied := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('owner_replies_despite_nobody', denied is null);

  -- Matching: stored words are folded; plurals, spaces, curly apostrophes, NFD, punctuation.
  insert into public.member_hidden_words (member_id, word) values (o2, 'moche'), (o2, 't''es nul'), (o3, 'fdp!'), (o3, 'x.y');
  insert into public.member_hidden_words (member_id, word) values (o3, '  MOCHÉ ');
  out := out || jsonb_build_object(
    'stored_word_folded', exists (select 1 from public.member_hidden_words where member_id = o3 and word = 'moche'),
    'm_plural_default', public.matches_hidden_words(o2, 'Bande de connards'),
    'm_plural_stored', public.matches_hidden_words(o2, 'Elles sont MOCHES'),
    'm_spaces', public.matches_hidden_words(o2, 'Nique   ta'),
    'm_curly_apostrophe', public.matches_hidden_words(o2, 'T’es nul'),
    'm_nfd', public.matches_hidden_words(o2, 'Mo' || chr(769) || 'che'),
    'm_punctuated_word', public.matches_hidden_words(o3, 'fdp!'),
    'm_dot_is_literal', not public.matches_hidden_words(o3, 'xzy'),
    'm_no_default_when_off', not public.matches_hidden_words(o3, 'connard'));

  -- At most 200 hidden words per member.
  insert into public.member_hidden_words (member_id, word)
    select o3, 'mot' || g
      from generate_series(1, 200 - (select count(*)::int from public.member_hidden_words where member_id = o3)) g;
  denied := null;
  begin
    insert into public.member_hidden_words (member_id, word) values (o3, 'encore');
  exception when others then denied := sqlerrm;
  end;
  out := out || jsonb_build_object('cap_200_words', coalesce(denied = 'too_many_words', false)
    and (select count(*) from public.member_hidden_words where member_id = o3) = 200);

  -- A reply under a hidden review is hidden too.
  update public.profiles set comment_policy = 'everyone' where id = o;
  perform pg_temp.claims(w); set local role authenticated;
  insert into public.post_comments (post_id, parent_id, body) values (p, c_w, 'Je maintiens') returning id into c_x;
  reset role;
  out := out || jsonb_build_object('reply_under_hidden_is_hidden',
    coalesce((select visibility from public.post_comments where id = c_x) = 'author_only', false));

  -- The hidden list skips members blocked either way.
  perform pg_temp.claims(o); set local role authenticated;
  select count(*) into n2 from public.my_hidden_comments();
  reset role;
  insert into public.member_blocks (blocker_id, blocked_id) values (w, o);
  perform pg_temp.claims(o); set local role authenticated;
  select count(*) into n from public.my_hidden_comments();
  reset role;
  delete from public.member_blocks where blocker_id = w and blocked_id = o;
  out := out || jsonb_build_object('hidden_list_skips_blocked', n2 = 2 and n = 0);

  -- approve_hidden_comment says whether it changed something.
  perform pg_temp.claims(v); set local role authenticated;
  begin ok := public.approve_hidden_comment(c_w); exception when others then ok := null; end;
  reset role;
  out := out || jsonb_build_object('stranger_approve_false', coalesce(ok = false, false));
  perform pg_temp.claims(o); set local role authenticated;
  begin ok := public.approve_hidden_comment(c_w); exception when others then ok := null; end;
  out := out || jsonb_build_object('approve_true', coalesce(ok, false));
  begin ok := public.approve_hidden_comment(c_w); exception when others then ok := null; end;
  out := out || jsonb_build_object('approve_again_false', coalesce(ok = false, false));
  reset role;

  -- Indexes and grants.
  out := out || jsonb_build_object(
    'mute_index', exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'member_mutes'
                                                  and indexdef like '%(muted_id)'),
    'restrict_index', exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'member_restricts'
                                                      and indexdef like '%(restricted_id)'),
    'tables_closed_to_anon',
      not has_table_privilege('anon', 'public.member_mutes', 'select,insert,update,delete,truncate,references,trigger')
      and not has_table_privilege('anon', 'public.member_restricts', 'select,insert,update,delete,truncate,references,trigger')
      and not has_table_privilege('anon', 'public.member_hidden_words', 'select,insert,update,delete,truncate,references,trigger'),
    'members_no_truncate',
      not has_table_privilege('authenticated', 'public.member_mutes', 'truncate,references,trigger')
      and not has_table_privilege('authenticated', 'public.member_restricts', 'truncate,references,trigger')
      and not has_table_privilege('authenticated', 'public.member_hidden_words', 'truncate,references,trigger'));

  raise exception 'RESULT %', out;
end $$;
