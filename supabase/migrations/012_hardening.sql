-- ═════════════════════════════════════════════════════════════
-- Rota — 012 Hardening
--
-- Found by the Supabase security advisor on the first real project.
-- Trigger functions are never meant to be called over the API; Postgres
-- refuses to run them outside a trigger anyway, but they should not even
-- appear as callable RPCs. Same for the policy readers: the app reads
-- policy_config directly, the RPCs are only used inside the database.
-- ═════════════════════════════════════════════════════════════

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.claims_respect_liability() from public, anon, authenticated;
revoke execute on function public.listing_auto_approved_value() from public, anon, authenticated;
revoke execute on function public.member_blocks_unfollow() from public, anon, authenticated;
revoke execute on function public.messages_touch_conversation() from public, anon, authenticated;
revoke execute on function public.posts_bump_counters() from public, anon, authenticated;
revoke execute on function public.posts_initial_distribution() from public, anon, authenticated;
revoke execute on function public.posts_coarsen_area() from public, anon, authenticated;
revoke execute on function public.rentals_require_delivery_enabled() from public, anon, authenticated;
revoke execute on function public.social_reports_escalate() from public, anon, authenticated;

revoke execute on function public.policy_num(text, numeric) from public, anon, authenticated;
revoke execute on function public.policy_text(text, text) from public, anon, authenticated;
