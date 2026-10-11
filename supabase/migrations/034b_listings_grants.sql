-- 034b: listings grants. Visitors (anon) only read listings; RLS was the only thing
-- stopping their writes. Members never delete or truncate listings directly (the app
-- has no `from('listings').delete()`; closure and moderation run as the service role),
-- so those go too. Members keep their column-level insert and update grants.
revoke insert, update, delete, truncate, references, trigger on public.listings from anon;
revoke delete, truncate on public.listings from authenticated;
