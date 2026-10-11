do $$
declare
  out jsonb := '{}';
  p text;
begin
  -- Visitors (anon) may only read listings; nobody but the service role deletes or truncates.
  foreach p in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
    out := out || jsonb_build_object('anon_no_' || lower(p), not has_table_privilege('anon', 'public.listings', p));
  end loop;
  out := out || jsonb_build_object(
    'anon_no_column_insert', not has_any_column_privilege('anon', 'public.listings', 'INSERT'),
    'anon_no_column_update', not has_any_column_privilege('anon', 'public.listings', 'UPDATE'),
    'anon_still_selects', has_table_privilege('anon', 'public.listings', 'SELECT'),
    'auth_no_delete', not has_table_privilege('authenticated', 'public.listings', 'DELETE'),
    'auth_no_truncate', not has_table_privilege('authenticated', 'public.listings', 'TRUNCATE'),
    'auth_still_selects', has_table_privilege('authenticated', 'public.listings', 'SELECT'),
    'auth_still_inserts_columns', has_any_column_privilege('authenticated', 'public.listings', 'INSERT'),
    'auth_still_updates_columns', has_any_column_privilege('authenticated', 'public.listings', 'UPDATE'));
  raise exception 'RESULT %', out;
end $$;
