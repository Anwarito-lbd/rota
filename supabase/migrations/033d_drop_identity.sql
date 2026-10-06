-- 033d: closing an account removes the Apple / Google identity link (service role only).
-- Called by the account Edge Function after the sign-in is replaced and banned.
-- Email identities are never touched here.

create or replace function public.drop_identity(p_identity uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.identities where id = p_identity and provider <> 'email';
$$;
revoke execute on function public.drop_identity(uuid) from public, anon, authenticated;
grant execute on function public.drop_identity(uuid) to service_role;
