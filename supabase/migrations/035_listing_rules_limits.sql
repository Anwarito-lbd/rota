-- 035: listing rules limits. A renter must read and accept every rule before paying,
-- and members wrote the column with no bound. A listing now carries at most 10 rules,
-- each 1 to 120 characters once trimmed and never null, the app's own limits
-- (ListPiece MAX_RULES / MAX_RULE). Live count of listings was 0 when this ran.
-- A check constraint cannot hold a subquery, hence the immutable helper.

create or replace function public.listing_rules_ok(p_rules text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(cardinality(p_rules), 0) <= 10
     and not exists (
       select 1 from unnest(p_rules) as r(rule)
        where r.rule is null or char_length(btrim(r.rule)) not between 1 and 120);
$$;

alter table public.listings
  add constraint listings_rules_limits check (public.listing_rules_ok(rules));
