-- ═════════════════════════════════════════════════════════════
-- Rota — 007 Account settings
--
-- What the Settings screens read and write:
--   • profile: username (still unique), bio, city, show city
--   • a private shipping address, shown only to the owner of a paid rental
--     that ships, so they know where to send the piece
--   • notification preferences, respected by the worker for e-mail and push
--   • a copy of your data (GDPR art. 15/20)
--   • closing your account (GDPR art. 17): personal data is erased, rental
--     and payment records are kept pseudonymised because the law requires it
--
-- Run after 006_schedules.sql.
-- ═════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. Profile
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists show_city boolean not null default true,
  add column if not exists deleted_at timestamptz;

-- The unique constraint and the format check on username still apply.
grant update (username, show_city) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Shipping address (private)
-- ─────────────────────────────────────────────────────────────
create table public.member_addresses (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  full_name text not null check (char_length(full_name) between 2 and 80),
  line1 text not null check (char_length(line1) between 3 and 120),
  line2 text check (char_length(line2) <= 120),
  postal_code text not null check (postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  city text not null check (char_length(city) between 1 and 80),
  country text not null default 'FR' check (country ~ '^[A-Z]{2}$'),
  phone text check (phone ~ '^[+0-9 ().-]{6,20}$'),
  updated_at timestamptz not null default now()
);
alter table public.member_addresses enable row level security;
revoke all on public.member_addresses from anon, authenticated;
grant select, delete on public.member_addresses to authenticated;
grant insert (full_name, line1, line2, postal_code, city, country, phone),
      update (full_name, line1, line2, postal_code, city, country, phone, updated_at)
  on public.member_addresses to authenticated;
create policy "Members manage their own address"
  on public.member_addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Where to send the piece: the renter's address, to the owner of that
-- rental only, once paid, and only for rentals that ship.
create function public.rental_shipping_address(p_rental uuid)
returns table (full_name text, line1 text, line2 text, postal_code text, city text, country text, phone text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.full_name, a.line1, a.line2, a.postal_code, a.city, a.country, a.phone
    from public.rentals r
    join public.member_addresses a on a.user_id = r.renter_id
   where r.id = p_rental
     and r.delivery = 'ship'
     and r.payment_status = 'paid'
     and r.status not in ('cancelled', 'closed')
     and auth.uid() in (r.owner_id, r.renter_id);
$$;
revoke execute on function public.rental_shipping_address(uuid) from public, anon;
grant execute on function public.rental_shipping_address(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Notification preferences
-- ─────────────────────────────────────────────────────────────
create table public.member_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  email_reminders boolean not null default true,
  push_enabled boolean not null default false,
  push_bookings boolean not null default true,
  push_reminders boolean not null default true,
  push_claims boolean not null default true,
  push_token text check (push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$'),
  updated_at timestamptz not null default now()
);
alter table public.member_preferences enable row level security;
revoke all on public.member_preferences from anon, authenticated;
grant select on public.member_preferences to authenticated;
grant insert (email_reminders, push_enabled, push_bookings, push_reminders, push_claims, push_token),
      update (email_reminders, push_enabled, push_bookings, push_reminders, push_claims, push_token, updated_at)
  on public.member_preferences to authenticated;
create policy "Members manage their own preferences"
  on public.member_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Which setting a notification falls under. Payments, bookings, claims and
-- late returns are always e-mailed: they carry money and deadlines.
create function public.notification_category(p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_kind in ('return_due_soon', 'claim_window_open', 'payout_setup_required') then 'reminders'
    when p_kind in ('claim_opened', 'claim_decided', 'claim_paid', 'non_return_review',
                    'late_fees_started', 'return_overdue', 'charge_failed') then 'claims'
    else 'bookings'
  end;
$$;

alter table public.notifications
  add column if not exists push_state text not null default 'pending'
    check (push_state in ('pending', 'sending', 'sent', 'skipped', 'failed'));
create index if not exists notifications_push_outbox_idx on public.notifications (push_state, created_at)
  where push_state = 'pending';

-- Same outbox as 004, now skipping the reminder e-mails a member turned off.
create or replace function public.claim_notifications(p_limit integer default 25)
returns table (
  id uuid, kind text, payload jsonb, created_at timestamptz, email text, lang text,
  username text, listing_title text, start_date date, end_date date)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.notifications set email_state = 'skipped'
   where email_state = 'pending' and created_at < now() - interval '3 days';
  update public.notifications n set email_state = 'skipped'
    from public.member_preferences mp
   where n.email_state = 'pending' and mp.user_id = n.user_id
     and not mp.email_reminders and public.notification_category(n.kind) = 'reminders';
  update public.notifications set email_state = 'pending'
   where email_state = 'sending' and created_at < now() - interval '15 minutes' and email_attempts < 5;

  return query
  with picked as (
    update public.notifications n
       set email_state = 'sending', email_attempts = n.email_attempts + 1
     where n.id in (select x.id from public.notifications x
                     where x.email_state = 'pending'
                     order by x.created_at limit greatest(1, least(p_limit, 100))
                     for update skip locked)
    returning n.*)
  select p.id, p.kind, p.payload, p.created_at, u.email::text, pr.lang, pr.username, l.title, r.start_date, r.end_date
    from picked p
    join auth.users u on u.id = p.user_id
    join public.profiles pr on pr.id = p.user_id
    left join public.rentals r on r.id = p.rental_id
    left join public.listings l on l.id = r.listing_id;
end;
$$;

-- Push outbox: only members who turned push on, per category.
create function public.claim_push_notifications(p_limit integer default 50)
returns table (
  id uuid, kind text, payload jsonb, token text, lang text, username text,
  listing_title text, start_date date, end_date date)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.notifications n set push_state = 'skipped'
   where n.push_state = 'pending'
     and (n.created_at < now() - interval '1 day'
          or not exists (
            select 1 from public.member_preferences mp
             where mp.user_id = n.user_id and mp.push_enabled and mp.push_token is not null
               and case public.notification_category(n.kind)
                     when 'reminders' then mp.push_reminders
                     when 'claims' then mp.push_claims
                     else mp.push_bookings end));

  return query
  with picked as (
    update public.notifications n set push_state = 'sending'
     where n.id in (select x.id from public.notifications x
                     where x.push_state = 'pending'
                     order by x.created_at limit greatest(1, least(p_limit, 100))
                     for update skip locked)
    returning n.*)
  select p.id, p.kind, p.payload, mp.push_token, pr.lang, pr.username, l.title, r.start_date, r.end_date
    from picked p
    join public.member_preferences mp on mp.user_id = p.user_id
    join public.profiles pr on pr.id = p.user_id
    left join public.rentals r on r.id = p.rental_id
    left join public.listings l on l.id = r.listing_id;
end;
$$;

create function public.mark_push(p_id uuid, p_state text, p_drop_token boolean default false)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set push_state = p_state where id = p_id;
  -- The device said the token is gone (app deleted): stop sending to it.
  update public.member_preferences set push_token = null
   where p_drop_token and user_id = (select user_id from public.notifications where id = p_id);
$$;

revoke execute on function public.notification_category(text) from public, anon, authenticated;
revoke execute on function public.claim_push_notifications(integer) from public, anon, authenticated;
revoke execute on function public.mark_push(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(integer) to service_role;
grant execute on function public.mark_push(uuid, text, boolean) to service_role;
grant execute on function public.claim_notifications(integer) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. A copy of your data
-- ─────────────────────────────────────────────────────────────
create function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at)
                  from auth.users u where u.id = auth.uid()),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'address', (select to_jsonb(a) - 'user_id' from public.member_addresses a where a.user_id = auth.uid()),
    'preferences', (select to_jsonb(m) - 'push_token' from public.member_preferences m where m.user_id = auth.uid()),
    'listings', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at)
                            from public.listings l where l.owner_id = auth.uid()), '[]'),
    'rentals', coalesce((select jsonb_agg(to_jsonb(r) - 'stripe_payment_intent_id' - 'stripe_charge_id'
                                          - 'hold_payment_intent_id' order by r.created_at)
                           from public.rentals r where auth.uid() in (r.renter_id, r.owner_id)), '[]'),
    'claims', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                          from public.claims c where auth.uid() in (c.renter_id, c.owner_id)), '[]'),
    'payment_consents', coalesce((select jsonb_agg(jsonb_build_object(
                          'rental_id', pc.rental_id, 'consent_text', pc.consent_text,
                          'consent_version', pc.consent_version, 'granted_at', pc.granted_at))
                          from public.payment_consents pc where pc.user_id = auth.uid()), '[]'),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('listing_id', cr.listing_id,
                          'reason', cr.reason, 'note', cr.note, 'created_at', cr.created_at))
                          from public.content_reports cr where cr.reporter_id = auth.uid()), '[]'),
    'appeals', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at)
                          from public.moderation_appeals a where a.owner_id = auth.uid()), '[]'),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'created_at', n.created_at,
                          'payload', n.payload) order by n.created_at)
                          from public.notifications n where n.user_id = auth.uid()), '[]')
  )
  where auth.uid() is not null;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Closing an account
-- ─────────────────────────────────────────────────────────────
-- Refuses while anything is in progress: a rental not settled, money owed
-- either way. Then erases what identifies the member. Rentals, payments,
-- claims and the audit log stay, tied to a meaningless username.
create function public.close_member_account(p_user uuid)
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
  -- Only money actually received counts: an unpaid booking's payout is just a placeholder.
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

  -- Unpaid bookings just go.
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

  perform public.audit(p_user, 'member', 'profiles', p_user::text, 'account.closed', null,
    jsonb_build_object('alias', alias));
  return alias;
end;
$$;
revoke execute on function public.close_member_account(uuid) from public, anon, authenticated;
grant execute on function public.close_member_account(uuid) to service_role;
