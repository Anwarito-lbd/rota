do $$
declare
  a uuid := pg_temp.member('ma');   -- receives
  b uuid := pg_temp.member('mb');   -- stranger writing
  c uuid := pg_temp.member('mc');   -- someone a follows
  r uuid := pg_temp.member('mr');   -- restricted by a
  t uuid := pg_temp.member('mt');   -- third party with a listing
  s uuid := pg_temp.member('ms');   -- stranger quoting the third party's listing
  o uuid := pg_temp.member('mo');   -- stranger quoting their own listing
  d uuid := pg_temp.member('md');   -- stranger quoting a's removed listing
  lst uuid; lst_t uuid; lst_o uuid; conv uuid; conv2 uuid; cid uuid; mid uuid;
  n int; ok boolean; err text; out jsonb := '{}';
begin
  insert into public.follows (follower_id, followee_id) values (a, c);
  insert into public.listings (owner_id, title, category, size, price_per_day)
    values (a, 'Veste', 'Vestes', 'M', 15) returning id into lst;
  insert into public.listings (owner_id, title, category, size, price_per_day)
    values (t, 'Robe', 'Robes', 'S', 20) returning id into lst_t;
  insert into public.listings (owner_id, title, category, size, price_per_day)
    values (o, 'Jupe', 'Jupes', 'S', 12) returning id into lst_o;
  update public.listings set distribution = 'public', status = 'active' where id in (lst, lst_t, lst_o);

  -- Stranger: pending on a's side, no push row.
  perform pg_temp.claims(b); set local role authenticated;
  conv := public.start_conversation(a, null);
  insert into public.messages (conversation_id, body) values (conv, 'Salut');
  reset role;
  out := out || jsonb_build_object('stranger_pending',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = conv) = 'pending');
  out := out || jsonb_build_object('no_push_for_request',
    not exists (select 1 from public.notifications where user_id = a and kind = 'message_received'));
  perform pg_temp.claims(a); set local role authenticated;
  out := out || jsonb_build_object('inbox_flags_request',
    (select request from public.my_conversations() where conversation_id = conv));
  perform public.accept_message_request(conv);
  out := out || jsonb_build_object('accepted',
    not (select request from public.my_conversations() where conversation_id = conv));
  reset role;

  -- Someone a follows arrives directly.
  perform pg_temp.claims(c); set local role authenticated;
  conv2 := public.start_conversation(a, null);
  reset role;
  out := out || jsonb_build_object('followed_direct',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = conv2) = 'accepted');

  -- message_policy 'following': strangers are refused, a listing chat still works.
  delete from public.conversations where id = conv;
  update public.profiles set message_policy = 'following' where id = a;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    perform public.start_conversation(a, null);
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('following_refuses', err = 'messages_closed');
  conv := public.start_conversation(a, lst);
  reset role;
  out := out || jsonb_build_object('listing_chat_direct',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = conv) = 'accepted');

  -- Decline: shadow-drop. The sender can still "write", nothing reaches a, nothing tells the sender.
  update public.conversations set a_state = 'pending', b_state = 'pending' where id = conv;
  perform pg_temp.claims(a); set local role authenticated;
  perform public.decline_message_request(conv);
  select count(*) into n from public.my_conversations() where conversation_id = conv;
  out := out || jsonb_build_object('declined_hidden', n = 0);
  reset role;
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    cid := public.start_conversation(a, lst);
    insert into public.messages (conversation_id, body) values (conv, 'Encore') returning id into mid;
  exception when others then err := sqlerrm;
  end;
  begin
    ok := public.can_write_conversation(conv);
  exception when others then ok := false;
  end;
  reset role;
  out := out || jsonb_build_object(
    'declined_listing_returns_cid', err is null and cid = conv,
    'declined_not_reopened',
      (select case when member_a = a then a_state else b_state end from public.conversations where id = conv) = 'declined',
    'declined_sender_can_insert', mid is not null,
    'declined_sender_helper_true', ok,
    'declined_message_shadowed', coalesce((select (to_jsonb(m) ->> 'shadowed')::boolean and not m.hidden
                                             from public.messages m where m.id = mid), false),
    'declined_no_push', not exists (select 1 from public.notifications where user_id = a and dedupe_key = 'message:' || mid::text));
  perform pg_temp.claims(a); set local role authenticated;
  select count(*) into n from public.messages where conversation_id = conv;
  out := out || jsonb_build_object('declined_recipient_sees_none', n = 0);
  select count(*) into n from public.my_conversations() where conversation_id = conv;
  out := out || jsonb_build_object('declined_still_no_inbox_row', n = 0);
  reset role;
  perform pg_temp.claims(b); set local role authenticated;
  out := out || jsonb_build_object('declined_sender_inbox_shows_own',
    coalesce((select last_body = 'Encore' and not request from public.my_conversations() where conversation_id = conv), false));
  reset role;

  -- 031c: a moderator un-hiding the message does not expose a shadow-dropped one.
  update public.messages set hidden = false where id = mid;
  perform pg_temp.claims(a); set local role authenticated;
  select count(*) into n from public.messages where conversation_id = conv;
  out := out || jsonb_build_object('moderator_unhide_keeps_shadow', n = 0);
  reset role;

  -- 031c: the sender can read neither the shadow flag nor the conversation's last_message_at.
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    execute 'select shadowed from public.messages where id = $1' using mid;
  exception when others then err := sqlstate;
  end;
  reset role;
  out := out || jsonb_build_object('shadowed_denied', err = '42501');
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    perform last_message_at from public.conversations where id = conv;
  exception when others then err := sqlstate;
  end;
  reset role;
  out := out || jsonb_build_object('last_message_at_denied', err = '42501');
  perform pg_temp.claims(b); set local role authenticated;
  select count(*) into n from public.messages where id = mid;
  out := out || jsonb_build_object('sender_still_sees_own', n = 1);
  reset role;

  -- Read receipts and request states are not readable by members.
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    perform a_read_at from public.conversations where id = conv;
  exception when insufficient_privilege then err := 'denied';
  end;
  reset role;
  out := out || jsonb_build_object('read_at_denied', err = 'denied');
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    perform a_state from public.conversations where id = conv;
  exception when insufficient_privilege then err := 'denied';
  end;
  reset role;
  out := out || jsonb_build_object('a_state_denied', err = 'denied');
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    perform b_state from public.conversations where id = conv;
  exception when insufficient_privilege then err := 'denied';
  end;
  reset role;
  out := out || jsonb_build_object('b_state_denied', err = 'denied');

  -- The write helper says nothing about other people's conversations.
  perform pg_temp.claims(c); set local role authenticated;
  begin
    ok := public.can_write_conversation(conv);
  exception when others then ok := true;
  end;
  reset role;
  out := out || jsonb_build_object('helper_false_for_outsider', not ok);

  -- Restricted: pending, with and without a's listing.
  update public.profiles set message_policy = 'everyone' where id = a;
  insert into public.member_restricts (restrictor_id, restricted_id) values (a, r);
  perform pg_temp.claims(r); set local role authenticated;
  cid := public.start_conversation(a, null);
  reset role;
  out := out || jsonb_build_object('restricted_pending',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = cid) = 'pending');
  delete from public.conversations where id = cid;
  perform pg_temp.claims(r); set local role authenticated;
  cid := public.start_conversation(a, lst);
  reset role;
  out := out || jsonb_build_object('restricted_pending_with_listing',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = cid) = 'pending');

  -- A third party's listing is no context.
  perform pg_temp.claims(s); set local role authenticated;
  cid := public.start_conversation(a, lst_t);
  reset role;
  out := out || jsonb_build_object('third_party_listing_pending',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = cid) = 'pending');

  -- The sender's own listing counts only with an offer or rental from a.
  perform pg_temp.claims(o); set local role authenticated;
  cid := public.start_conversation(a, lst_o);
  reset role;
  out := out || jsonb_build_object('own_listing_no_offer_pending',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = cid) = 'pending');
  delete from public.conversations where id = cid;
  update public.profiles set message_policy = 'nobody' where id = a;
  err := null;
  perform pg_temp.claims(o); set local role authenticated;
  begin
    perform public.start_conversation(a, lst_o);
  exception when others then err := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('own_listing_no_offer_refused', err = 'messages_closed');
  insert into public.offers (listing_id, renter_id, owner_id, per_day, days) values (lst_o, a, o, 10, 2);
  perform pg_temp.claims(o); set local role authenticated;
  cid := public.start_conversation(a, lst_o);
  reset role;
  out := out || jsonb_build_object('own_listing_with_offer_direct',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = cid) = 'accepted');

  -- a's removed listing is no context.
  update public.profiles set message_policy = 'everyone' where id = a;
  update public.listings set status = 'removed' where id = lst;
  perform pg_temp.claims(d); set local role authenticated;
  cid := public.start_conversation(a, lst);
  insert into public.messages (conversation_id, body) values (cid, 'Dispo ?');
  reset role;
  out := out || jsonb_build_object('removed_listing_pending',
    (select case when member_a = a then a_state else b_state end from public.conversations where id = cid) = 'pending');

  -- Replying from a request accepts it.
  perform pg_temp.claims(a); set local role authenticated;
  insert into public.messages (conversation_id, body) values (cid, 'Oui');
  out := out || jsonb_build_object('reply_accepts_request',
    coalesce(not (select request from public.my_conversations() where conversation_id = cid), false));
  reset role;

  -- Previews off: the push carries no text.
  insert into public.member_preferences (user_id, push_previews) values (a, false)
    on conflict (user_id) do update set push_previews = false;
  perform pg_temp.claims(d); set local role authenticated;
  insert into public.messages (conversation_id, body) values (cid, 'Texte secret') returning id into mid;
  reset role;
  out := out || jsonb_build_object('previews_off_null_preview',
    coalesce((select payload ? 'preview' and payload->>'preview' is null from public.notifications
               where user_id = a and dedupe_key = 'message:' || mid::text), false));

  raise exception 'RESULT %', out;
end $$;
