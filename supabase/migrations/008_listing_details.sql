-- ═════════════════════════════════════════════════════════════
-- Rota — 008 Listing details
--
--   • category_id: the leaf of the category tree (mobile/src/data/taxonomy.ts),
--     e.g. 'women.clothing.evening'. `category` keeps its French label.
--   • size_fit: how the piece fits, -2 (runs very small) … 0 (true to size)
--     … 2 (runs very large). Null for one-size items.
--   • Proof of authenticity is required for luxury brands and for pieces
--     rented at or above a daily price, enforced here so a modified app
--     can't skip it. Both lists live in policy_config.
--
-- Run after 007_account_settings.sql.
-- ═════════════════════════════════════════════════════════════

alter table public.listings
  add column if not exists category_id text check (category_id ~ '^[a-z]+(\.[a-z_]+){1,3}$'),
  add column if not exists size_fit smallint check (size_fit between -2 and 2);

grant insert (category_id, size_fit), update (category_id, size_fit) on public.listings to authenticated;

-- Generated from LUXURY_KEYS in mobile/src/data/taxonomy.ts (names without
-- case, accents or punctuation). Add a brand here and the app follows.
insert into public.policy_config (key, value, note) values
  ('authenticity_price_per_day', '50', 'Daily price from which proof of authenticity is required.'),
  ('luxury_brands', '["alaia","alexandermcqueen","balenciaga","balmain","bottegaveneta","boucheron","bulgari","burberry","cartier","celine","chanel","chloe","chopard","christiandior","christianlouboutin","delvaux","dg","dior","dolcegabbana","eliesaab","fendi","givenchy","goyard","gucci","hermes","jeanpaulgaultier","jilsander","jimmychoo","lanvin","loewe","louboutin","louisvuitton","lv","maisonmargiela","manoloblahnik","margiela","marni","mcqueen","messika","miumiu","moncler","moschino","mugler","offwhite","prada","rabanne","rickowens","rogervivier","rolex","saintlaurent","stellamccartney","tiffanyco","valentino","vancleefarpels","vca","versace","ysl","yvessaintlaurent","zuhairmurad"]',
   'Brands that always need proof of authenticity, normalised like normalize_brand().')
on conflict (key) do nothing;

-- Same normalisation as the app's normalizeBrand(): lower case, accents
-- dropped, anything but letters and digits removed. "Chloé" = "chloe".
create function public.normalize_brand(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    lower(translate(coalesce(p, ''),
      'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝýÿ',
      'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYyy')),
    '[^a-z0-9]', '', 'g');
$$;

create function public.listing_needs_proof(p_brand text, p_price integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_price, 0) >= public.policy_num('authenticity_price_per_day', 50)
      or public.normalize_brand(p_brand) in (
           select jsonb_array_elements_text(value) from public.policy_config where key = 'luxury_brands');
$$;

create function public.listing_authenticity_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger listings_authenticity_gate
  before insert or update on public.listings
  for each row execute function public.listing_authenticity_gate();

revoke execute on function public.listing_authenticity_gate() from public, anon, authenticated;
revoke execute on function public.listing_needs_proof(text, integer) from public, anon;
grant execute on function public.listing_needs_proof(text, integer) to authenticated;
