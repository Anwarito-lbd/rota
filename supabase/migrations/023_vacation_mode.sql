-- ═════════════════════════════════════════════════════════════
-- Rota — 023 Vacation mode
--
-- Like Vinted's "mode vacances": a lender pauses every piece at once. The
-- pieces stay on their profile, but they leave the feed and nobody can book
-- them until the lender comes back. Rentals already booked are not touched.
-- ═════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists vacation boolean not null default false;
grant update (vacation) on public.profiles to authenticated;

-- New bookings of a piece whose lender is away are refused, whatever the client.
create function public.rentals_owner_not_on_vacation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.owner_id and p.vacation) then
    raise exception 'owner_on_vacation';
  end if;
  return new;
end;
$$;
create trigger rentals_owner_not_on_vacation before insert on public.rentals
  for each row execute function public.rentals_owner_not_on_vacation();
revoke execute on function public.rentals_owner_not_on_vacation() from public, anon, authenticated;
