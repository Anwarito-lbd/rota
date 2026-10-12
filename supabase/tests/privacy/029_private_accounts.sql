do $$
declare
  o uuid := pg_temp.member('po');  -- private owner
  s uuid := pg_temp.member('ps');  -- stranger
  f uuid := pg_temp.member('pf');  -- follower
  q uuid := pg_temp.member('pq');  -- second requester
  lst uuid; n int; j jsonb; denied boolean := false; out jsonb := '{}';
begin
  -- 034 forbids private accounts; this test still covers the private path, so it lifts
  -- the constraint inside its own transaction (the final raise rolls it back).
  alter table public.profiles drop constraint profiles_always_public;
  update public.profiles set identity_status = 'verified', city = 'Paris', show_city = false where id = o;
  insert into public.posts (author_id, kind, media_paths) values (o, 'fit', array[o::text || '/p.jpg']);
  insert into public.stories (author_id, media_path) values (o, o::text || '/s.jpg');
  perform set_config('rota.moderating', 'on', true);
  update public.stories set distribution = 'public' where author_id = o;
  insert into public.listings (owner_id, title, category, size, price_per_day)
    values (o, 'Robe test', 'Robes', 'S', 20) returning id into lst;
  update public.listings set status = 'active', distribution = 'public' where id = lst;
  perform set_config('rota.moderating', 'off', true);
  update public.profiles set is_private = true where id = o;

  -- f and q ask to follow; private means pending.
  perform pg_temp.claims(f); set local role authenticated;
  insert into public.follows (followee_id) values (o);
  select count(*) into n from public.posts where author_id = o;
  out := out || jsonb_build_object('pending_sees_no_posts', n = 0);
  reset role;
  perform pg_temp.claims(q); set local role authenticated;
  insert into public.follows (followee_id) values (o);
  reset role;
  out := out || jsonb_build_object('request_is_pending',
    (select status from public.follows where follower_id = f and followee_id = o) = 'pending');

  -- A stranger sees the listing, not the social side, and no city.
  perform pg_temp.claims(s); set local role authenticated;
  select count(*) into n from public.posts where author_id = o;
  out := out || jsonb_build_object('stranger_no_posts', n = 0);
  select count(*) into n from public.stories where author_id = o;
  out := out || jsonb_build_object('stranger_no_stories', n = 0);
  select count(*) into n from public.follows where followee_id = o;
  out := out || jsonb_build_object('stranger_no_followers_list', n = 0);
  select count(*) into n from public.listings where id = lst;
  out := out || jsonb_build_object('stranger_sees_listing', n = 1);
  j := public.profile_card(o);
  out := out || jsonb_build_object('card_private', (j ->> 'is_private')::boolean,
                                   'card_cannot_view', not (j ->> 'can_view')::boolean,
                                   'card_hides_city', j -> 'city' = 'null'::jsonb);
  begin
    perform city from public.profiles where id = o;
  exception when insufficient_privilege then denied := true;
  end;
  out := out || jsonb_build_object('city_column_denied', denied);
  reset role;

  -- The owner accepts f.
  perform pg_temp.claims(o); set local role authenticated;
  perform public.answer_follow_request(f, true);
  select count(*) into n from public.my_follow_requests();
  out := out || jsonb_build_object('one_request_left', n = 1);
  reset role;
  perform pg_temp.claims(f); set local role authenticated;
  select count(*) into n from public.posts where author_id = o;
  out := out || jsonb_build_object('accepted_sees_posts', n = 1);
  select count(*) into n from public.stories where author_id = o;
  out := out || jsonb_build_object('accepted_sees_stories', n = 1);
  out := out || jsonb_build_object('card_accepted', public.profile_card(o) ->> 'follow_status' = 'accepted');
  reset role;

  -- o is still private: a stranger learns nothing of o's followers, even from f's side.
  perform pg_temp.claims(s); set local role authenticated;
  select count(*) into n from public.follows where followee_id = o;
  out := out || jsonb_build_object('stranger_no_private_followers', n = 0);
  select count(*) into n from public.follows where follower_id = f and followee_id = o;
  out := out || jsonb_build_object('stranger_no_private_edge_via_follower', n = 0);
  out := out || jsonb_build_object('no_oracle_for_others', not public.can_view_social(f, o));
  reset role;

  -- Going public accepts the remaining request.
  update public.profiles set is_private = false where id = o;
  out := out || jsonb_build_object('public_accepts_pending',
    (select status from public.follows where follower_id = q and followee_id = o) = 'accepted');

  -- Block: profile, listing and favourites disappear for the blocked member.
  insert into public.member_blocks (blocker_id, blocked_id) values (o, s);
  perform pg_temp.claims(s); set local role authenticated;
  select count(*) into n from public.listings where id = lst;
  out := out || jsonb_build_object('blocked_no_listing', n = 0);
  select count(*) into n from public.profiles where id = o;
  out := out || jsonb_build_object('blocked_no_profile_row', n = 0);
  out := out || jsonb_build_object('blocked_card', (public.profile_card(o) ->> 'blocked')::boolean);
  denied := false;
  begin
    insert into public.favorites (listing_id) values (lst);
  exception when others then denied := true;
  end;
  out := out || jsonb_build_object('blocked_no_favorite', denied);
  reset role;

  -- 18+ declared at sign-up.
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-4000-8000-000000000029', '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'adult29@test.rota', '{"username":"adult29test","adult":"true"}', now(), now());
  out := out || jsonb_build_object('adult_recorded',
    (select adult_confirmed_at is not null from public.profiles where id = '00000000-0000-4000-8000-000000000029'));

  -- Follow, unfollow, go private, request again: the request still notifies.
  declare r uuid := pg_temp.member('nr'); t uuid := pg_temp.member('nt');
  begin
    perform pg_temp.claims(r); set local role authenticated;
    insert into public.follows (followee_id) values (t);
    delete from public.follows where follower_id = r and followee_id = t;
    reset role;
    update public.profiles set is_private = true where id = t;
    perform pg_temp.claims(r); set local role authenticated;
    insert into public.follows (followee_id) values (t);
    reset role;
    out := out || jsonb_build_object('rerequest_notifies',
      exists (select 1 from public.notifications where user_id = t and kind = 'social_follow_request'));
  end;

  -- Write grants: anon writes nothing, members insert or delete no profile row.
  out := out || jsonb_build_object('anon_no_profile_writes',
    not (has_table_privilege('anon', 'public.profiles', 'INSERT')
         or has_table_privilege('anon', 'public.profiles', 'UPDATE')
         or has_table_privilege('anon', 'public.profiles', 'DELETE')
         or has_any_column_privilege('anon', 'public.profiles', 'INSERT')
         or has_any_column_privilege('anon', 'public.profiles', 'UPDATE')),
    'member_no_profile_insert_delete',
    not (has_any_column_privilege('authenticated', 'public.profiles', 'INSERT')
         or has_table_privilege('authenticated', 'public.profiles', 'DELETE')
         or has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')));
  perform pg_temp.claims(f); set local role authenticated;
  update public.profiles set bio = 'still editable' where id = f;
  reset role;
  out := out || jsonb_build_object('member_edits_own_bio',
    (select bio from public.profiles where id = f) = 'still editable');

  -- A closed account: stories hidden from an accepted follower, minimal card.
  update public.profiles set deleted_at = now() where id = o;
  perform pg_temp.claims(f); set local role authenticated;
  select count(*) into n from public.stories where author_id = o;
  out := out || jsonb_build_object('closed_no_stories', n = 0);
  j := public.profile_card(o);
  out := out || jsonb_build_object('closed_card_minimal',
    (j ->> 'deleted')::boolean and not (j ->> 'can_view')::boolean and not (j ? 'bio') and not (j ? 'followers'));
  reset role;

  raise exception 'RESULT %', out;
end $$;
