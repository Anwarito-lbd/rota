-- ═════════════════════════════════════════════════════════════
-- Rota — 014 The cron secret lives only in the Vault
--
-- 006's scheduled calls send the Vault secret 'rota_cron_secret'. The
-- functions used to compare it with an Edge Function secret holding the
-- same value, which meant copying a secret by hand. They now ask the
-- database instead (service role only), so the value is generated in the
-- Vault and never leaves it:
--
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'rota_cron_secret');
--
-- ROTA_CRON_SECRET as an Edge Function secret still works if set.
-- ═════════════════════════════════════════════════════════════

create function public.cron_secret_matches(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    char_length(p_secret) >= 16
      and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'rota_cron_secret'),
    false);
$$;
revoke execute on function public.cron_secret_matches(text) from public, anon, authenticated;
grant execute on function public.cron_secret_matches(text) to service_role;
