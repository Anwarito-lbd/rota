-- 033c: closing an account renames the member in other members' notifications.
-- The old match (actor_id = member OR actor = old username) could rename another
-- member's rows when a username was freed and reused. Rows that carry actor_id now
-- match on the id only; the username is used only for legacy rows without actor_id.
-- Only that condition changes; the rest is the live 033b body.

CREATE OR REPLACE FUNCTION public.close_member_account(p_user uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
     and ((payload ? 'actor_id' and payload->>'actor_id' = p_user::text)
          or (not payload ? 'actor_id' and payload->>'actor' = old_name));
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
end $function$;
