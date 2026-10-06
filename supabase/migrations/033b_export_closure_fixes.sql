-- 033b: review fixes for the export and the account closure.
-- 1. Closing an account renames the member in other members' notifications and drops
--    message previews; unsent pushes are skipped. notify_social now stores actor_id so
--    later matches use the id rather than the username.
-- 2. A closed member's removed listings lose their personal fields (city, description,
--    video, proof, photos, moderation note). Title, brand, category and price stay.
--    The authenticity gate lets a removed listing lose its proof, server side only.
-- 3. Closing twice is a no-op that returns the same alias.
-- 4. The export names counterparties instead of carrying their uuids, strips the
--    uploader folder from claim evidence paths, and drops actor_id from notifications.
-- 5. A member who blocked the exporter (or was blocked) shows as null, never by name.
-- 6. The export adds payouts and the payment account status (no Stripe ids); closure
--    deletes media provenance rows (EXIF, fingerprints).

create or replace function public.notify_social(p_user uuid, p_actor uuid, p_kind text, p_key text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = p_actor or public.blocked_between(p_user, p_actor) then
    return;
  end if;
  if exists (select 1 from public.profiles where id = p_user and deleted_at is not null) then
    return;
  end if;
  insert into public.notifications (user_id, kind, payload, dedupe_key, email_state)
  select p_user, p_kind,
         p_payload || jsonb_build_object('actor', pr.username, 'actor_id', p_actor),
         p_key, 'skipped'
    from public.profiles pr where pr.id = p_actor
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.listing_authenticity_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Account closure wipes the proof of a listing it removes.
  if public.moderating() and new.status = 'removed' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if (new.brand, new.price_per_day, new.authenticity_path)
       is not distinct from (old.brand, old.price_per_day, old.authenticity_path) then
      return new;
    end if;
  end if;
  if new.authenticity_path is null and public.listing_needs_proof(new.brand, new.price_per_day) then
    raise exception 'Authenticity proof required';
  end if;
  return new;
end;
$$;

create or replace function public.export_member_data(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at)
                  from auth.users u where u.id = p_user),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = p_user),
    'address', (select to_jsonb(a) - 'user_id' from public.member_addresses a where a.user_id = p_user),
    'preferences', (select to_jsonb(m) - 'push_token' from public.member_preferences m where m.user_id = p_user),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at) from public.listings l where l.owner_id = p_user), '[]'),
    'posts', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.posts p where p.author_id = p_user), '[]'),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('post_id', c.post_id, 'body', c.body, 'rating', c.rating,
                          'created_at', c.created_at) order by c.created_at)
                          from public.post_comments c where c.author_id = p_user), '[]'),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('post_id', l.post_id, 'created_at', l.created_at))
                         from public.post_likes l where l.user_id = p_user), '[]'),
    'comment_likes', coalesce((select jsonb_agg(jsonb_build_object('comment_id', l.comment_id, 'created_at', l.created_at))
                                 from public.comment_likes l where l.user_id = p_user), '[]'),
    'reposts', coalesce((select jsonb_agg(jsonb_build_object('post_id', r.post_id, 'created_at', r.created_at))
                           from public.reposts r where r.user_id = p_user), '[]'),
    'stories', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.stories s where s.author_id = p_user), '[]'),
    'highlights', coalesce((select jsonb_agg(to_jsonb(h)) from public.story_highlights h where h.owner_id = p_user), '[]'),
    'boards', coalesce((select jsonb_agg(to_jsonb(b) || jsonb_build_object('items',
                          (select coalesce(jsonb_agg(jsonb_build_object('post_id', i.post_id, 'listing_id', i.listing_id)), '[]')
                             from public.board_items i where i.board_id = b.id)))
                          from public.boards b where b.owner_id = p_user), '[]'),
    'follows', jsonb_build_object(
      'following', coalesce((select jsonb_agg(jsonb_build_object(
                               'member', case when public.blocked_between(p_user, pr.id) then null else pr.username end,
                               'status', f.status, 'since', f.created_at))
                               from public.follows f join public.profiles pr on pr.id = f.followee_id
                              where f.follower_id = p_user), '[]'),
      'followers', coalesce((select jsonb_agg(jsonb_build_object(
                               'member', case when public.blocked_between(p_user, pr.id) then null else pr.username end,
                               'status', f.status, 'since', f.created_at))
                               from public.follows f join public.profiles pr on pr.id = f.follower_id
                              where f.followee_id = p_user), '[]')),
    'blocks', coalesce((select jsonb_agg(jsonb_build_object('member', pr.username, 'since', b.created_at))
                          from public.member_blocks b join public.profiles pr on pr.id = b.blocked_id
                         where b.blocker_id = p_user), '[]'),
    'mutes', coalesce((select jsonb_agg(jsonb_build_object(
                         'member', case when public.blocked_between(p_user, pr.id) then null else pr.username end,
                         'posts', m.mute_posts, 'stories', m.mute_stories))
                         from public.member_mutes m join public.profiles pr on pr.id = m.muted_id
                        where m.muter_id = p_user), '[]'),
    'restricts', coalesce((select jsonb_agg(jsonb_build_object(
                             'member', case when public.blocked_between(p_user, pr.id) then null else pr.username end,
                             'since', r.created_at))
                             from public.member_restricts r join public.profiles pr on pr.id = r.restricted_id
                            where r.restrictor_id = p_user), '[]'),
    'hidden_words', coalesce((select jsonb_agg(w.word) from public.member_hidden_words w where w.member_id = p_user), '[]'),
    'conversations', coalesce((select jsonb_agg(jsonb_build_object('id', c.id,
                          'with', (select case when public.blocked_between(p_user, pr.id) then null else pr.username end
                                     from public.profiles pr
                                    where pr.id = case when c.member_a = p_user then c.member_b else c.member_a end),
                          'listing_id', c.listing_id, 'created_at', c.created_at))
                          from public.conversations c where p_user in (c.member_a, c.member_b)), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('conversation_id', m.conversation_id, 'kind', m.kind,
                          'body', m.body, 'created_at', m.created_at) order by m.created_at)
                          from public.messages m where m.sender_id = p_user), '[]'),
    'offers', coalesce((select jsonb_agg((to_jsonb(o) - 'renter_id' - 'owner_id') || jsonb_build_object(
                          'role', case when o.renter_id = p_user then 'renter' else 'owner' end,
                          'other_username', (select case when public.blocked_between(p_user, pr.id) then null else pr.username end
                                               from public.profiles pr
                                              where pr.id = case when o.renter_id = p_user then o.owner_id else o.renter_id end))
                          order by o.created_at)
                          from public.offers o where p_user in (o.renter_id, o.owner_id)), '[]'),
    'favorites', coalesce((select jsonb_agg(jsonb_build_object('listing_id', f.listing_id, 'created_at', f.created_at))
                             from public.favorites f where f.user_id = p_user), '[]'),
    'entitlements', (select to_jsonb(e) - 'user_id' from public.member_entitlements e where e.user_id = p_user),
    'purchases', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'product', i.product_id, 'at', i.received_at))
                             from public.iap_events i where i.user_id = p_user), '[]'),
    'business', (select to_jsonb(b) - 'user_id' from public.business_details b where b.user_id = p_user),
    'rentals', coalesce((select jsonb_agg((to_jsonb(r) - 'stripe_payment_intent_id' - 'stripe_charge_id'
                                           - 'hold_payment_intent_id' - 'renter_id' - 'owner_id') || jsonb_build_object(
                          'role', case when r.renter_id = p_user then 'renter' else 'owner' end,
                          'other_username', (select case when public.blocked_between(p_user, pr.id) then null else pr.username end
                                               from public.profiles pr
                                              where pr.id = case when r.renter_id = p_user then r.owner_id else r.renter_id end))
                          order by r.created_at)
                           from public.rentals r where p_user in (r.renter_id, r.owner_id)), '[]'),
    'claims', coalesce((select jsonb_agg((to_jsonb(c) - 'renter_id' - 'owner_id') || jsonb_build_object(
                          'role', case when c.renter_id = p_user then 'renter' else 'owner' end,
                          'other_username', (select case when public.blocked_between(p_user, pr.id) then null else pr.username end
                                               from public.profiles pr
                                              where pr.id = case when c.renter_id = p_user then c.owner_id else c.renter_id end),
                          -- Stored as <uploader uid>/<rental id>/<file>: keep the rental and file only.
                          'evidence_paths', (select coalesce(jsonb_agg(regexp_replace(e, '^[^/]*/', '')), '[]')
                                               from unnest(c.evidence_paths) e))
                          order by c.created_at)
                          from public.claims c where p_user in (c.renter_id, c.owner_id)), '[]'),
    'payouts', coalesce((select jsonb_agg(to_jsonb(po) - 'owner_id' - 'provider_transfer_id' order by po.created_at)
                           from public.payouts po where po.owner_id = p_user), '[]'),
    'payment_accounts', (select jsonb_build_object('payouts_enabled', pa.payouts_enabled,
                                                   'details_submitted', pa.details_submitted,
                                                   'card_on_file', pa.stripe_customer_id is not null,
                                                   'payout_account_connected', pa.stripe_account_id is not null,
                                                   'identity_check_started', pa.identity_session_id is not null,
                                                   'updated_at', pa.updated_at)
                           from public.payment_accounts pa where pa.user_id = p_user),
    'payment_consents', coalesce((select jsonb_agg(jsonb_build_object('rental_id', pc.rental_id,
                          'consent_text', pc.consent_text, 'consent_version', pc.consent_version, 'granted_at', pc.granted_at))
                          from public.payment_consents pc where pc.user_id = p_user), '[]'),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('listing_id', cr.listing_id, 'reason', cr.reason,
                          'note', cr.note, 'created_at', cr.created_at))
                          from public.content_reports cr where cr.reporter_id = p_user), '[]'),
    'social_reports', coalesce((select jsonb_agg(jsonb_build_object('reason', sr.reason, 'note', sr.note,
                          'state', sr.state, 'created_at', sr.created_at))
                          from public.social_reports sr where sr.reporter_id = p_user), '[]'),
    'appeals', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at)
                          from public.moderation_appeals a where a.owner_id = p_user), '[]'),
    'moderation_decisions', coalesce((select jsonb_agg(to_jsonb(n) - 'appeal_decided_by' order by n.created_at)
                          from public.moderation_notices n where n.member_id = p_user), '[]'),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'created_at', n.created_at,
                          'payload', n.payload - 'actor_id') order by n.created_at)
                          from public.notifications n where n.user_id = p_user), '[]')
  )
  where p_user is not null;
$$;

create or replace function public.close_member_account(p_user uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  alias text := 'deleted_' || substr(md5(p_user::text), 1, 10);
  old_name text;
begin
  -- Already closed: nothing to write, no second audit row.
  if exists (select 1 from public.profiles where id = p_user and deleted_at is not null and username = alias) then
    return alias;
  end if;
  if exists (select 1 from public.rentals r
              where p_user in (r.renter_id, r.owner_id)
                and (r.status in ('in_progress', 'due', 'late', 'non_return_review', 'returned')
                     or (r.status = 'booked' and r.payment_status in ('paid', 'processing')))) then
    raise exception 'Active rentals';
  end if;
  if exists (select 1 from public.payouts p join public.rentals r on r.id = p.rental_id
              where p.owner_id = p_user and r.payment_status in ('paid', 'processing')
                and p.state in ('pending', 'scheduled', 'on_hold', 'released')) then
    raise exception 'Payouts pending';
  end if;
  if exists (select 1 from public.claims c
              where p_user in (c.renter_id, c.owner_id)
                and c.status in ('submitted', 'renter_responding', 'under_review', 'appealed')) then
    raise exception 'Open claims';
  end if;
  select username into old_name from public.profiles where id = p_user;
  update public.rentals set status = 'cancelled', payment_status = 'expired'
   where p_user in (renter_id, owner_id) and status = 'booked';
  update public.payouts p set state = 'cancelled', hold_reason = 'account_closed'
    from public.rentals r
   where r.id = p.rental_id and p_user in (r.renter_id, r.owner_id) and r.status = 'cancelled' and p.state = 'pending';
  -- Follows go before is_private flips to false: otherwise profiles_private_off accepts
  -- every pending request and each requester gets a "follow accepted" push from the
  -- closing account.
  delete from public.follows where p_user in (follower_id, followee_id);
  update public.profiles
     set username = alias, bio = null, avatar_url = null, city = null, show_city = false,
         certified = false, deleted_at = now(), business_name = null, business_verified = false,
         account_type = 'personal', pro_until = null, vacation = false, lang = 'fr',
         identity_status = 'none', adult_confirmed_at = null, is_private = false,
         hide_like_counts = false, comment_policy = 'everyone', message_policy = 'everyone'
   where id = p_user;
  -- Other members' notifications stop naming the member or quoting their messages.
  update public.notifications
     set payload = (payload - 'preview' - 'actor_id') || jsonb_build_object('actor', alias),
         push_state = case when push_state = 'pending' then 'skipped' else push_state end
   where user_id <> p_user
     and (payload->>'actor_id' = p_user::text or payload->>'actor' = old_name);
  perform set_config('rota.moderating', 'on', true);
  update public.listings
     set status = 'removed', distribution = 'blocked', distribution_reason = 'other',
         city = null, description = null, video_path = null, authenticity_path = null,
         distribution_note = null, photo_paths = '{}'
   where owner_id = p_user;
  perform set_config('rota.moderating', 'off', true);
  delete from public.media_provenance where owner_id = p_user;
  delete from public.member_addresses where user_id = p_user;
  delete from public.member_preferences where user_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.favorites where user_id = p_user;
  delete from public.staff_members where user_id = p_user;
  delete from public.posts where author_id = p_user;
  delete from public.post_comments where author_id = p_user;
  delete from public.post_likes where user_id = p_user;
  delete from public.boards where owner_id = p_user;
  delete from public.member_blocks where p_user in (blocker_id, blocked_id);
  perform public.close_member_social(p_user);
  perform public.audit(p_user, 'member', 'profiles', p_user::text, 'account.closed', null,
    jsonb_build_object('alias', alias));
  return alias;
end $$;

revoke execute on function public.notify_social(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.notify_social(uuid, uuid, text, text, jsonb) to service_role;
revoke execute on function public.listing_authenticity_gate() from public, anon, authenticated;
grant execute on function public.listing_authenticity_gate() to service_role;
revoke execute on function public.export_member_data(uuid) from public, anon, authenticated;
grant execute on function public.export_member_data(uuid) to service_role;
revoke execute on function public.close_member_account(uuid) from public, anon, authenticated;
grant execute on function public.close_member_account(uuid) to service_role;
