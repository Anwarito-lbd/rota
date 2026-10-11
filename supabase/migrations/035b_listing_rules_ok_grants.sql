-- 035b: listing_rules_ok is only a check helper, not an API. Visitors (anon) cannot
-- call it; members keep their explicit grant because the listings check runs as the
-- inserting role. service_role keeps its own grant.
revoke execute on function public.listing_rules_ok(text[]) from public, anon;
