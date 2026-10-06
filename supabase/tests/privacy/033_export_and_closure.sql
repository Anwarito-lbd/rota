do $$
declare
  m uuid := pg_temp.member('xm');   -- the member who exports, then closes
  o uuid := pg_temp.member('xo');   -- the other member in every relation
  p uuid := pg_temp.member('xp');   -- an accepted follower of m
  b uuid := pg_temp.member('xb');   -- talks with m, then blocks m
  conv uuid; conv_p uuid; conv_b uuid; lst_o uuid; lst_m uuid; rnt uuid; mid uuid;
  j jsonb; jo jsonb; k text; err text; alias1 text; alias2 text; old_name text;
  missing text[] := '{}'; out jsonb := '{}';
begin
  -- 034 forbids private accounts; the closure's pending-request path is still tested,
  -- so the constraint is lifted inside this transaction (the final raise rolls it back).
  alter table public.profiles drop constraint profiles_always_public;
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

  -- 033b setup ----------------------------------------------------------------
  -- m writes to p (p follows m: direct, pushed with a preview), and to b, who then blocks m.
  perform pg_temp.claims(m); set local role authenticated;
  conv_p := public.start_conversation(p, null);
  insert into public.messages (conversation_id, body) values (conv_p, 'apercu-033b') returning id into mid;
  conv_b := public.start_conversation(b, null);
  reset role;
  insert into public.member_blocks (blocker_id, blocked_id) values (b, m);
  select username into old_name from public.profiles where id = m;
  out := out || jsonb_build_object('push_has_actor_id',
    coalesce((select payload->>'actor_id' = m::text and payload ? 'preview' and push_state = 'pending'
                from public.notifications where user_id = p and dedupe_key = 'message:' || mid::text), false));
  -- An offer, a closed rental and a closed claim with o; a payment account with Stripe ids.
  perform set_config('rota.moderating', 'on', true);
  insert into public.listings (owner_id, title, category, size, price_per_day)
    values (o, 'Robe 033', 'Robes', 'S', 20) returning id into lst_o;
  update public.listings set status = 'active', distribution = 'public' where id = lst_o;
  insert into public.listings (owner_id, title, brand, category, size, price_per_day, city, description,
                               video_path, authenticity_path, photo_paths)
    values (m, 'Manteau 033', 'Marque', 'Manteaux', 'M', 80, 'Paris', 'Porte deux fois',
            m::text || '/v.mp4', m::text || '/proof.jpg', array[m::text || '/1.jpg']) returning id into lst_m;
  update public.listings set distribution_note = 'note interne' where id = lst_m;
  perform set_config('rota.moderating', 'off', true);
  insert into public.media_provenance (owner_id, listing_id, storage_path, kind, capture_source, exif_make, fingerprint)
    values (m, lst_m, m::text || '/1.jpg', 'image', 'library', 'Apple', 'abc123');
  insert into public.offers (listing_id, renter_id, owner_id, per_day, days) values (lst_o, m, o, 15, 2);
  insert into public.rentals (listing_id, renter_id, owner_id, start_date, end_date, days, delivery,
                              price_per_day, rent_amount, renter_service_fee, owner_service_fee, total_charged,
                              owner_payout_amount, approved_value, max_liability, policy_version, consent_version, consent_text)
    values (lst_o, m, o, current_date + 3, current_date + 4, 2, 'meet', 20, 40, 4, 4, 44, 36, 100, 100, 'v1', 'v1', 'ok')
    returning id into rnt;
  update public.rentals set status = 'closed' where id = rnt;
  insert into public.claims (rental_id, owner_id, renter_id, category, description, evidence_paths, requested_amount, status)
    values (rnt, o, m, 'cleaning', 'Taches sur le col', array[o::text || '/' || rnt::text || '/e.jpg'], 10, 'closed');
  insert into public.payment_accounts (user_id, stripe_customer_id, stripe_account_id, payouts_enabled, details_submitted)
    values (m, 'cus_test033b', 'acct_test033b', true, true);

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
                           'offers', 'favorites', 'entitlements', 'business', 'payouts', 'payment_accounts'] loop
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
  -- 033b: no other member's uuid, no Stripe ids, counterparties by name, a blocker stays anonymous.
  out := out || jsonb_build_object(
    'no_other_uuids', position(o::text in j::text) = 0 and position(p::text in j::text) = 0
                      and position(b::text in j::text) = 0,
    'no_stripe_ids', j::text not like '%cus_test033b%' and j::text not like '%acct_test033b%',
    'payment_account_status', coalesce((j->'payment_accounts'->>'payouts_enabled')::boolean, false),
    'counterparty_named', coalesce((select bool_and(x->>'other_username' = (select username from public.profiles where id = o))
                                      from jsonb_array_elements((j->'offers') || (j->'rentals') || (j->'claims')) x), false)
                          and jsonb_array_length((j->'offers') || (j->'rentals') || (j->'claims')) = 3,
    'with_named', coalesce((select c->>'with' from jsonb_array_elements(j->'conversations') c where c->>'id' = conv::text)
                             = (select username from public.profiles where id = o), false),
    'with_null_for_blocker', exists (select 1 from jsonb_array_elements(j->'conversations') c
                                      where c->>'id' = conv_b::text and c->'with' = 'null'::jsonb));

  -- o's export never carries m's message.
  perform pg_temp.claims(o); set local role authenticated;
  jo := public.export_my_data();
  reset role;
  out := out || jsonb_build_object('other_export_excludes_body', jo::text not like '%corps-export-033%');

  alias1 := public.close_member_account(m);
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

  -- 033b closure ----------------------------------------------------------------
  out := out || jsonb_build_object(
    'push_renamed_no_preview', coalesce((select payload->>'actor' = alias1 and not payload ? 'preview'
                                                and not payload ? 'actor_id' and push_state <> 'pending'
                                           from public.notifications where user_id = p and dedupe_key = 'message:' || mid::text), false),
    'no_notification_names_old', not exists (select 1 from public.notifications where payload->>'actor' = old_name),
    'listing_wiped', coalesce((select city is null and description is null and video_path is null and authenticity_path is null
                                      and distribution_note is null and photo_paths = '{}'
                                      and title = 'Manteau 033' and brand = 'Marque' and category = 'Manteaux'
                                      and price_per_day = 80 and status = 'removed'
                                 from public.listings where id = lst_m), false),
    'provenance_gone', not exists (select 1 from public.media_provenance where owner_id = m));
  alias2 := public.close_member_account(m);
  out := out || jsonb_build_object('second_close_same_alias', alias2 = alias1,
    'one_audit_row', (select count(*) from public.audit_log where entity = 'profiles' and entity_id = m::text
                                                            and action = 'account.closed') = 1);
  raise exception 'RESULT %', out;
end $$;
