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

  raise exception 'RESULT %', out;
end $$;
