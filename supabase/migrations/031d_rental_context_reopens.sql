-- 031d: a declined message request no longer swallows messages about a real rental.
-- Rota is rental-first: once the two members have an offer or a rental in progress
-- (offer pending or accepted; rental neither closed nor cancelled), the declined side
-- moves back to accepted, or to pending (Demandes) when the sender is restricted.
-- A bare listing id is not enough, so a declined stranger can't reopen a conversation
-- by naming any listing.
-- * start_conversation: real context = such an offer or rental between the two members
--   about p_listing.
-- * messages_shadow_drop: no shadow-drop while the pair has such an offer or rental,
--   whichever listing it is about; the declined side reopens the same way.

-- One predicate for both.
create or replace function public.rental_link_active(p_a uuid, p_b uuid, p_listing uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.offers o
                  where ((o.renter_id = p_a and o.owner_id = p_b) or (o.renter_id = p_b and o.owner_id = p_a))
                    and (p_listing is null or o.listing_id = p_listing)
                    and o.status in ('pending', 'accepted'))
      or exists (select 1 from public.rentals r
                  where ((r.renter_id = p_a and r.owner_id = p_b) or (r.renter_id = p_b and r.owner_id = p_a))
                    and (p_listing is null or r.listing_id = p_listing)
                    and r.status not in ('closed', 'cancelled'));
$$;
revoke execute on function public.rental_link_active(uuid, uuid, uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_conversation(p_other uuid, p_listing uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  cid uuid;
  context boolean;
  rental boolean;
  followed boolean;
  restricted boolean;
  other_state text;
  pol text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_other is null or p_other = me then raise exception 'invalid_member'; end if;
  select message_policy into pol from public.profiles where id = p_other and deleted_at is null;
  if not found then raise exception 'invalid_member'; end if;
  if public.blocked_between(me, p_other) then raise exception 'blocked'; end if;

  -- Rental context: the recipient's live listing, or my listing they made an offer on or rented.
  context := p_listing is not null and (
    exists (select 1 from public.listings l
             where l.id = p_listing and l.owner_id = p_other
               and l.status = 'active' and l.distribution in ('public', 'limited'))
    or exists (select 1 from public.listings l
                where l.id = p_listing and l.owner_id = me
                  and (exists (select 1 from public.offers o where o.listing_id = l.id and o.renter_id = p_other)
                       or exists (select 1 from public.rentals r where r.listing_id = l.id and r.renter_id = p_other))));
  -- A real rental between us about this listing: the only thing that reopens a declined side.
  rental := p_listing is not null and public.rental_link_active(me, p_other, p_listing);
  followed := exists (select 1 from public.follows f
                       where f.follower_id = p_other and f.followee_id = me and f.status = 'accepted');
  restricted := exists (select 1 from public.member_restricts r where r.restrictor_id = p_other and r.restricted_id = me);
  -- Restrict first: a restricted sender always lands in requests.
  other_state := case when restricted then 'pending'
                      when context or followed then 'accepted'
                      else 'pending' end;

  a := least(me, p_other);
  b := greatest(me, p_other);
  select id into cid from public.conversations where member_a = a and member_b = b;

  if cid is null then
    -- A visible policy, like "you can't message this account". A restricted member the
    -- recipient follows is never refused, so the restrict stays invisible.
    if not context and not followed and pol in ('following', 'nobody') then raise exception 'messages_closed'; end if;
    insert into public.conversations (member_a, member_b, listing_id, a_state, b_state)
    values (a, b, case when context then p_listing end,
            case when a = p_other then other_state else 'accepted' end,
            case when b = p_other then other_state else 'accepted' end)
    returning id into cid;
  else
    -- My side becomes accepted. The other side moves from pending to accepted with context,
    -- and from declined only with a real rental (to pending if I'm restricted). Otherwise a
    -- declined side never changes (the sender is not told).
    update public.conversations
       set listing_id = case when context then p_listing else listing_id end,
           a_state = case when member_a = me then 'accepted'
                          when a_state = 'pending' and context and other_state = 'accepted' then 'accepted'
                          when a_state = 'declined' and rental then case when restricted then 'pending' else 'accepted' end
                          else a_state end,
           b_state = case when member_b = me then 'accepted'
                          when b_state = 'pending' and context and other_state = 'accepted' then 'accepted'
                          when b_state = 'declined' and rental then case when restricted then 'pending' else 'accepted' end
                          else b_state end
     where id = cid;
  end if;
  return cid;
end $function$;

CREATE OR REPLACE FUNCTION public.messages_shadow_drop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  other uuid;
  other_declined boolean;
begin
  select case when c.member_a = new.sender_id then c.member_b else c.member_a end,
         (case when c.member_a = new.sender_id then c.b_state else c.a_state end) = 'declined'
    into other, other_declined
    from public.conversations c where c.id = new.conversation_id;
  if not coalesce(other_declined, false) then
    return new;
  end if;
  if public.rental_link_active(new.sender_id, other) then
    -- A rental in progress: reopen the recipient's side (Demandes if the sender is restricted).
    update public.conversations c
       set a_state = case when c.member_a = other then reopened.state else c.a_state end,
           b_state = case when c.member_b = other then reopened.state else c.b_state end
      from (select case when exists (select 1 from public.member_restricts r
                                      where r.restrictor_id = other and r.restricted_id = new.sender_id)
                        then 'pending' else 'accepted' end as state) reopened
     where c.id = new.conversation_id;
    return new;
  end if;
  new.shadowed := true;
  return new;
end $function$;
