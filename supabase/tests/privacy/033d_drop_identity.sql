-- 033d: drop_identity removes an Apple / Google link, never an email identity,
-- and only the service role may call it.
do $$
declare
  u uuid := pg_temp.member('xi');
  apple uuid := gen_random_uuid();
  mail uuid := gen_random_uuid();
  err text; out jsonb := '{}';
begin
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (apple, 'apple-sub-' || u::text, u, jsonb_build_object('sub', 'apple-sub-' || u::text), 'apple', now(), now()),
         (mail, u::text, u, jsonb_build_object('sub', u::text, 'email', u::text || '@test.rota'), 'email', now(), now());
  -- A member cannot call it.
  perform pg_temp.claims(u); set local role authenticated;
  begin
    perform public.drop_identity(apple);
  exception when others then err := sqlerrm;
  end;
  reset role;
  out := out || jsonb_build_object('member_refused', err is not null,
    'apple_kept_after_refusal', exists (select 1 from auth.identities where id = apple));
  -- The service role can.
  set local role service_role;
  perform public.drop_identity(apple);
  perform public.drop_identity(mail);
  reset role;
  out := out || jsonb_build_object(
    'apple_gone', not exists (select 1 from auth.identities where id = apple),
    'email_kept', exists (select 1 from auth.identities where id = mail),
    'owner', (select pg_get_userbyid(proowner) from pg_proc where oid = 'public.drop_identity(uuid)'::regprocedure) = 'postgres');
  raise exception 'RESULT %', out;
end $$;
