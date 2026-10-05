do $$
declare
  m uuid := pg_temp.member('xm');   -- the member who exports, then closes
  o uuid := pg_temp.member('xo');   -- the other member in every relation
  p uuid := pg_temp.member('xp');   -- an accepted follower of m
  conv uuid; j jsonb; jo jsonb; k text; err text;
  missing text[] := '{}'; out jsonb := '{}';
begin
  insert into public.business_details (user_id, siret, declared_name, status) values (m, '91450006100017', 'Shop', 'pending');
  insert into public.member_entitlements (user_id, tryon_credits) values (m, 3);
  insert into public.iap_events (event_id, user_id, kind, product_id) values ('evt-test-033', m, 'purchase', 'tryon_1');
  insert into public.member_mutes (muter_id, muted_id) values (m, o);
  insert into public.member_restricts (restrictor_id, restricted_id) values (m, o), (o, m);
  insert into public.member_hidden_words (member_id, word) values (m, 'nul');
  -- Follows both ways: p follows m (accepted), m follows o, then m goes private and o asks (pending).
  insert into public.follows (follower_id, followee_id) values (p, m), (m, o);
  update public.profiles set is_private = true where id = m;
  insert into public.follows (follower_id, followee_id) values (o, m);
  out := out || jsonb_build_object('request_pending',
    (select status = 'pending' from public.follows where follower_id = o and followee_id = m));

  -- m writes to o.
  perform pg_temp.claims(m); set local role authenticated;
  conv := public.start_conversation(o, null);
  insert into public.messages (conversation_id, body) values (conv, 'corps-export-033');
  reset role;

  -- Export as m.
  perform pg_temp.claims(m); set local role authenticated;
  j := public.export_my_data();
  begin
    perform public.export_member_data(o);
  exception when others then err := sqlerrm;
  end;
  reset role;
  foreach k in array array['messages', 'conversations', 'follows', 'likes', 'comment_likes', 'reposts', 'stories',
                           'highlights', 'boards', 'blocks', 'mutes', 'restricts', 'hidden_words', 'social_reports',
                           'offers', 'favorites', 'entitlements', 'business'] loop
    if not j ? k then missing := missing || k; end if;
  end loop;
  out := out || jsonb_build_object('export_complete', cardinality(missing) = 0, 'missing', to_jsonb(missing));
  out := out || jsonb_build_object(
    'export_own_body', j::text like '%corps-export-033%',
    'no_shadowed', j::text not like '%shadowed%',
    'no_a_state', j::text not like '%a_state%',
    'no_b_state', j::text not like '%b_state%',
    'no_a_read_at', j::text not like '%a_read_at%',
    'no_b_read_at', j::text not like '%b_read_at%',
    'export_member_data_service_only', err is not null);

  -- o's export never carries m's message.
  perform pg_temp.claims(o); set local role authenticated;
  jo := public.export_my_data();
  reset role;
  out := out || jsonb_build_object('other_export_excludes_body', jo::text not like '%corps-export-033%');

  perform public.close_member_account(m);
  out := out || jsonb_build_object(
    'business_gone', not exists (select 1 from public.business_details where user_id = m),
    'entitlements_gone', not exists (select 1 from public.member_entitlements where user_id = m),
    'mutes_gone', not exists (select 1 from public.member_mutes where muter_id = m),
    'restricts_gone', not exists (select 1 from public.member_restricts where m in (restrictor_id, restricted_id)),
    'words_gone', not exists (select 1 from public.member_hidden_words where member_id = m),
    'follows_gone', not exists (select 1 from public.follows where m in (follower_id, followee_id)),
    'requests_gone', not exists (select 1 from public.follows where followee_id = m and status = 'pending'),
    'no_accept_push_on_close', not exists (select 1 from public.notifications
                                            where user_id = o and kind = 'social_follow_accepted'),
    'iap_pseudonymised', (select user_id <> m from public.iap_events where event_id = 'evt-test-033'),
    'profile_cleared', (select business_name is null and pro_until is null and adult_confirmed_at is null
                          and not is_private from public.profiles where id = m));
  raise exception 'RESULT %', out;
end $$;
