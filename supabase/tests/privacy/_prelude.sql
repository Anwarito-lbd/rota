-- Paste before any test in this folder, in the same execute_sql call.
-- Throwaway members; the test's final RAISE rolls everything back.
create or replace function pg_temp.member(p_name text) returns uuid
language plpgsql as $$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          u::text || '@test.rota', jsonb_build_object('username', p_name || substr(md5(u::text), 1, 8)),
          now(), now());
  return u;
end $$;

-- Sets the JWT claims; follow with `set local role authenticated;` and come back with `reset role;`.
create or replace function pg_temp.claims(p uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
