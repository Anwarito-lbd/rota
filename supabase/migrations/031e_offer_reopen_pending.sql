-- 031e: a pending offer reopens a declined conversation into Demandes, not the inbox.
-- * accepted: an accepted offer or a live rental (rental neither closed nor cancelled)
--   between the two members, and the sender is not restricted. The recipient took part
--   in it, so the conversation comes back as it was.
-- * pending (Demandes, no push): a pending offer, or any of the above from a restricted
--   sender, created or decided after the last decline. Declining again from Demandes
--   sticks until a newer offer or rental arrives; to close it for good, block.
-- * Otherwise the side stays declined and the message is shadow-dropped.
-- start_conversation looks at the named listing only (a bare listing never counts);
-- the shadow-drop trigger at any listing between the two. Decline times are kept per
-- side and are not readable by members (conversations has column grants only).

alter table public.conversations
  add column if not exists a_declined_at timestamptz,
  add column if not exists b_declined_at timestamptz;

create or replace function public.reopen_state(p_sender uuid, p_other uuid, p_listing uuid, p_declined_at timestamptz)
returns text language sql stable security definer set search_path = '' as $$
  with link as (
    select coalesce(o.decided_at, o.created_at) as since, o.status = 'accepted' as strong
      from public.offers o
     where ((o.renter_id = p_sender and o.owner_id = p_other) or (o.renter_id = p_other and o.owner_id = p_sender))
       and (p_listing is null or o.listing_id = p_listing)
       and o.status in ('pending', 'accepted')
    union all
    select r.created_at, true
      from public.rentals r
     where ((r.renter_id = p_sender and r.owner_id = p_other) or (r.renter_id = p_other and r.owner_id = p_sender))
       and (p_listing is null or r.listing_id = p_listing)
       and r.status not in ('closed', 'cancelled')
  ), restricted as (
    select exists (select 1 from public.member_restricts m
                    where m.restrictor_id = p_other and m.restricted_id = p_sender) as yes
  )
  select case
    when not (select yes from restricted) and exists (select 1 from link where strong) then 'accepted'
    when exists (select 1 from link where since > coalesce(p_declined_at, '-infinity')) then 'pending'
  end;
$$;
revoke execute on function public.reopen_state(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.decline_message_request(p_conversation uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.conversations
     set a_state = case when member_a = auth.uid() and a_state = 'pending' then 'declined' else a_state end,
         a_declined_at = case when member_a = auth.uid() and a_state = 'pending' then clock_timestamp() else a_declined_at end,
         b_state = case when member_b = auth.uid() and b_state = 'pending' then 'declined' else b_state end,
         b_declined_at = case when member_b = auth.uid() and b_state = 'pending' then clock_timestamp() else b_declined_at end
   where id = p_conversation and auth.uid() in (member_a, member_b);
$function$;

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
    -- and from declined only through an offer or rental about this listing (031e rules).
    -- Otherwise a declined side never changes (the sender is not told).
    update public.conversations
       set listing_id = case when context then p_listing else listing_id end,
           a_state = case when member_a = me then 'accepted'
                          when a_state = 'pending' and context and other_state = 'accepted' then 'accepted'
                          when a_state = 'declined' and p_listing is not null
                            then coalesce(public.reopen_state(me, p_other, p_listing, a_declined_at), a_state)
                          else a_state end,
           b_state = case when member_b = me then 'accepted'
                          when b_state = 'pending' and context and other_state = 'accepted' then 'accepted'
                          when b_state = 'declined' and p_listing is not null
                            then coalesce(public.reopen_state(me, p_other, p_listing, b_declined_at), b_state)
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
  other_state text;
  declined_at timestamptz;
  reopened text;
begin
  select case when c.member_a = new.sender_id then c.member_b else c.member_a end,
         case when c.member_a = new.sender_id then c.b_state else c.a_state end,
         case when c.member_a = new.sender_id then c.b_declined_at else c.a_declined_at end
    into other, other_state, declined_at
    from public.conversations c where c.id = new.conversation_id;
  if other_state is distinct from 'declined' then
    return new;
  end if;
  reopened := public.reopen_state(new.sender_id, other, null, declined_at);
  if reopened is not null then
    update public.conversations c
       set a_state = case when c.member_a = other then reopened else c.a_state end,
           b_state = case when c.member_b = other then reopened else c.b_state end
     where c.id = new.conversation_id;
    return new;
  end if;
  new.shadowed := true;
  return new;
end $function$;

drop function if exists public.rental_link_active(uuid, uuid, uuid);
