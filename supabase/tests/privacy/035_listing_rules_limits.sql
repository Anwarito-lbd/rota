do $$
declare
  o uuid := pg_temp.member('rl');
  out jsonb := '{}';
  ok boolean;
  ms text := (extract(epoch from now()) * 1000)::bigint::text;
  ten text[] := array(select 'Règle ' || g from generate_series(1, 10) g);
begin
  -- 10 rules of up to 120 characters pass; an 11th rule, an empty or blank one,
  -- a 121-character one or a null one is refused. As a member, like the app.
  perform pg_temp.claims(o); set local role authenticated;

  insert into public.listings (owner_id, title, category, size, price_per_day, photo_paths, rules)
  values (o, 'Robe dix règles', 'Robes', 'S', 20, array[o::text || '/' || ms || '-a1b2c3.jpg'],
          ten[1:9] || repeat('x', 120));
  out := out || jsonb_build_object('ten_rules_120_chars_ok', true);

  insert into public.listings (owner_id, title, category, size, price_per_day, rules)
  values (o, 'Robe sans règle', 'Robes', 'S', 20, '{}');
  out := out || jsonb_build_object('no_rules_ok', true);

  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, rules)
    values (o, 'Robe onze', 'Robes', 'S', 20, ten || 'Une de trop'::text);
    ok := true;
  exception when check_violation then ok := false;
  end;
  out := out || jsonb_build_object('eleven_refused', not ok);

  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, rules)
    values (o, 'Robe longue règle', 'Robes', 'S', 20, array[repeat('x', 121)]);
    ok := true;
  exception when check_violation then ok := false;
  end;
  out := out || jsonb_build_object('rule_121_refused', not ok);

  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, rules)
    values (o, 'Robe règle vide', 'Robes', 'S', 20, array['   ']);
    ok := true;
  exception when check_violation then ok := false;
  end;
  out := out || jsonb_build_object('blank_refused', not ok);

  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, rules)
    values (o, 'Robe règle nulle', 'Robes', 'S', 20, array[null::text]);
    ok := true;
  exception when check_violation then ok := false;
  end;
  out := out || jsonb_build_object('null_refused', not ok);

  -- An update is held to the same limits.
  begin
    update public.listings set rules = ten || 'Une de trop'::text where owner_id = o and title = 'Robe sans règle';
    ok := true;
  exception when check_violation then ok := false;
  end;
  out := out || jsonb_build_object('update_eleven_refused', not ok);
  reset role;

  -- 035b: the helper is not callable by visitors; members still pass the check.
  out := out || jsonb_build_object(
    'anon_cannot_execute', not has_function_privilege('anon', 'public.listing_rules_ok(text[])', 'execute'),
    'public_cannot_execute', not exists (
      select 1 from pg_proc p, aclexplode(p.proacl) a
       where p.oid = 'public.listing_rules_ok(text[])'::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE'),
    'authenticated_can_execute', has_function_privilege('authenticated', 'public.listing_rules_ok(text[])', 'execute'));
  set local role anon;
  begin
    perform public.listing_rules_ok(array['x']);
    ok := true;
  exception when insufficient_privilege then ok := false;
  end;
  reset role;
  out := out || jsonb_build_object('anon_call_denied', not ok);
  perform pg_temp.claims(o); set local role authenticated;
  insert into public.listings (owner_id, title, category, size, price_per_day, rules)
  values (o, 'Robe après 035b', 'Robes', 'S', 20, array['Pas de parfum']);
  out := out || jsonb_build_object('member_insert_after_revoke_ok', true);
  reset role;

  raise exception 'RESULT %', out;
end $$;
