do $$
declare
  a uuid := pg_temp.member('ma');   -- receives
  b uuid := pg_temp.member('mb');   -- stranger writing
  c uuid := pg_temp.member('mc');   -- someone a follows
  lst uuid; conv uuid; conv2 uuid; n int; err text; out jsonb := '{}';
begin
  insert into public.follows (follower_id, followee_id) values (a, c);
  insert into public.listings (owner_id, title, category, size, price_per_day)
    values (a, 'Veste', 'Vestes', 'M', 15) returning id into lst;

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

  -- Decline: the sender can no longer write.
  update public.conversations set a_state = 'pending', b_state = 'pending' where id = conv;
  perform pg_temp.claims(a); set local role authenticated;
  perform public.decline_message_request(conv);
  select count(*) into n from public.my_conversations() where conversation_id = conv;
  out := out || jsonb_build_object('declined_hidden', n = 0);
  reset role;
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    insert into public.messages (conversation_id, body) values (conv, 'Encore');
  exception when others then err := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('declined_cannot_write', err is not null);

  -- Read receipts are not readable by members.
  err := null;
  perform pg_temp.claims(b); set local role authenticated;
  begin
    perform a_read_at from public.conversations where id = conv;
  exception when insufficient_privilege then err := 'denied';
  end;
  reset role;
  out := out || jsonb_build_object('read_at_denied', err = 'denied');

  raise exception 'RESULT %', out;
end $$;
