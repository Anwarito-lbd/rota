-- ═════════════════════════════════════════════════════════════
-- Rota — 017 Proof of authenticity above 30 €/day; parcel size
--
-- • Proof is required for luxury brands (unchanged) and now for any piece
--   rented at MORE than 30 € a day (was: from 50 €).
-- • Listings carry the parcel size chosen in the form (small / medium /
--   large), used once Rota Delivery is switched on.
-- ═════════════════════════════════════════════════════════════

update public.policy_config
   set value = '30', note = 'Daily price above which proof of authenticity is required.', updated_at = now()
 where key = 'authenticity_price_per_day';

create or replace function public.listing_needs_proof(p_brand text, p_price integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_price, 0) > public.policy_num('authenticity_price_per_day', 30)
      or public.normalize_brand(p_brand) in (
           select jsonb_array_elements_text(value) from public.policy_config where key = 'luxury_brands');
$$;
revoke execute on function public.listing_needs_proof(text, integer) from public, anon;
grant execute on function public.listing_needs_proof(text, integer) to authenticated;

alter table public.listings
  add column if not exists parcel_size text check (parcel_size in ('s', 'm', 'l'));
grant insert (parcel_size), update (parcel_size) on public.listings to authenticated;
