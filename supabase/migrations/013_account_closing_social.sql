-- ═════════════════════════════════════════════════════════════
-- Rota — 013 Closing an account also erases the social layer
--
-- 007's close_member_account() predates posts, comments, follows, boards
-- and blocks (009). Closing an account now removes them too (GDPR art. 17,
-- App Store 5.1.1(v)). Messages stay, from a pseudonymised sender, because
-- the other member may need them in a dispute; they are covered by the
-- retention period in docs/legal/07 §B5.
-- ═════════════════════════════════════════════════════════════

create or replace function public.close_member_account(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
  update public.profiles
     set username = alias, bio = null, avatar_url = null, city = null, show_city = false,
         certified = false, deleted_at = now()
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
  -- Social layer (009): their posts (with tags, likes and comments on them),
  -- their own comments and likes elsewhere, boards, follows and blocks.
  delete from public.posts where author_id = p_user;
  delete from public.post_comments where author_id = p_user;
  delete from public.post_likes where user_id = p_user;
  delete from public.boards where owner_id = p_user;
  delete from public.follows where p_user in (follower_id, followee_id);
  delete from public.member_blocks where p_user in (blocker_id, blocked_id);
  perform public.audit(p_user, 'member', 'profiles', p_user::text, 'account.closed', null,
    jsonb_build_object('alias', alias));
  return alias;
end;
$$;
revoke execute on function public.close_member_account(uuid) from public, anon, authenticated;
grant execute on function public.close_member_account(uuid) to service_role;
