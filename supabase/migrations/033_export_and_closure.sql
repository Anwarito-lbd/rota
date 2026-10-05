-- 033: the data export covers everything the member has on Rota (GDPR art. 15/20),
-- and closing an account removes everything that isn't a legal record, in one
-- transaction. Purchase records stay for accounting under a random id.

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
      'following', coalesce((select jsonb_agg(jsonb_build_object('member', pr.username, 'status', f.status, 'since', f.created_at))
                               from public.follows f join public.profiles pr on pr.id = f.followee_id
                              where f.follower_id = p_user), '[]'),
      'followers', coalesce((select jsonb_agg(jsonb_build_object('member', pr.username, 'status', f.status, 'since', f.created_at))
                               from public.follows f join public.profiles pr on pr.id = f.follower_id
                              where f.followee_id = p_user), '[]')),
    'blocks', coalesce((select jsonb_agg(jsonb_build_object('member', pr.username, 'since', b.created_at))
                          from public.member_blocks b join public.profiles pr on pr.id = b.blocked_id
                         where b.blocker_id = p_user), '[]'),
    'mutes', coalesce((select jsonb_agg(jsonb_build_object('member', pr.username, 'posts', m.mute_posts, 'stories', m.mute_stories))
                         from public.member_mutes m join public.profiles pr on pr.id = m.muted_id
                        where m.muter_id = p_user), '[]'),
    'restricts', coalesce((select jsonb_agg(jsonb_build_object('member', pr.username, 'since', r.created_at))
                             from public.member_restricts r join public.profiles pr on pr.id = r.restricted_id
                            where r.restrictor_id = p_user), '[]'),
    'hidden_words', coalesce((select jsonb_agg(w.word) from public.member_hidden_words w where w.member_id = p_user), '[]'),
    'conversations', coalesce((select jsonb_agg(jsonb_build_object('id', c.id,
                          'with', (select pr.username from public.profiles pr
                                    where pr.id = case when c.member_a = p_user then c.member_b else c.member_a end),
                          'listing_id', c.listing_id, 'created_at', c.created_at))
                          from public.conversations c where p_user in (c.member_a, c.member_b)), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('conversation_id', m.conversation_id, 'kind', m.kind,
                          'body', m.body, 'created_at', m.created_at) order by m.created_at)
                          from public.messages m where m.sender_id = p_user), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at)
                          from public.offers o where p_user in (o.renter_id, o.owner_id)), '[]'),
    'favorites', coalesce((select jsonb_agg(jsonb_build_object('listing_id', f.listing_id, 'created_at', f.created_at))
                             from public.favorites f where f.user_id = p_user), '[]'),
    'entitlements', (select to_jsonb(e) - 'user_id' from public.member_entitlements e where e.user_id = p_user),
    'purchases', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'product', i.product_id, 'at', i.received_at))
                             from public.iap_events i where i.user_id = p_user), '[]'),
    'business', (select to_jsonb(b) - 'user_id' from public.business_details b where b.user_id = p_user),
    'rentals', coalesce((select jsonb_agg(to_jsonb(r) - 'stripe_payment_intent_id' - 'stripe_charge_id'
                                          - 'hold_payment_intent_id' order by r.created_at)
                           from public.rentals r where p_user in (r.renter_id, r.owner_id)), '[]'),
    'claims', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                          from public.claims c where p_user in (c.renter_id, c.owner_id)), '[]'),
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
                          'payload', n.payload) order by n.created_at)
                          from public.notifications n where n.user_id = p_user), '[]')
  )
  where p_user is not null;
$$;

create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.export_member_data(auth.uid());
$$;

create or replace function public.close_member_social(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.stories where author_id = p_user;
  delete from public.reposts where user_id = p_user;
  delete from public.comment_likes where user_id = p_user;
  delete from public.story_highlights where owner_id = p_user;
  delete from public.member_mutes where p_user in (muter_id, muted_id);
  delete from public.member_restricts where p_user in (restrictor_id, restricted_id);
  delete from public.member_hidden_words where member_id = p_user;
  delete from public.offers where p_user in (renter_id, owner_id) and status <> 'used';
  delete from public.business_details where user_id = p_user;
  delete from public.member_entitlements where user_id = p_user;
  delete from public.ai_usage where user_id = p_user;
  update public.iap_events set user_id = gen_random_uuid() where user_id = p_user;
$$;

create or replace function public.close_member_account(p_user uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  alias text := 'deleted_' || substr(md5(p_user::text), 1, 10);
begin
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
  perform set_config('rota.moderating', 'on', true);
  update public.listings set status = 'removed', distribution = 'blocked', distribution_reason = 'other'
   where owner_id = p_user;
  perform set_config('rota.moderating', 'off', true);
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

revoke execute on function public.export_member_data(uuid) from public, anon, authenticated;
grant execute on function public.export_member_data(uuid) to service_role;
revoke execute on function public.close_member_social(uuid) from public, anon, authenticated;
grant execute on function public.close_member_social(uuid) to service_role;
revoke execute on function public.close_member_account(uuid) from public, anon, authenticated;
grant execute on function public.close_member_account(uuid) to service_role;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated, service_role;
