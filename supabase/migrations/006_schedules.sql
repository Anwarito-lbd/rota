-- ═════════════════════════════════════════════════════════════
-- Rota — 006 Schedules
--
-- What runs by itself, and how often:
--   every 5 min   rental_lifecycle_tick()  — expiry, reminders, late fees,
--                                            holds, payouts, closing
--   every minute  worker                   — moves money, sends emails
--   every 2 min   moderate-listings        — reviews anything the app
--                                            didn't trigger itself
--
-- BEFORE running this file, store two secrets in the Vault (SQL editor):
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'rota_functions_url');
--   select vault.create_secret('<the same long random string as ROTA_CRON_SECRET>', 'rota_cron_secret');
--
-- Safe to run again: jobs are replaced by name.
-- ═════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Calls one of our Edge Functions with the shared cron secret.
create or replace function public.call_edge_function(p_name text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'rota_functions_url') || '/' || p_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-rota-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'rota_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000);
$$;
revoke execute on function public.call_edge_function(text) from public, anon, authenticated;

select cron.schedule('rota-rental-lifecycle', '*/5 * * * *', $$select public.rental_lifecycle_tick()$$);
select cron.schedule('rota-worker', '* * * * *', $$select public.call_edge_function('worker')$$);
select cron.schedule('rota-moderation-sweep', '*/2 * * * *', $$select public.call_edge_function('moderate-listings')$$);
