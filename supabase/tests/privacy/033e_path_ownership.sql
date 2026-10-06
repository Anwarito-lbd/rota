-- 033e: storage paths must sit in their owner's folder, with no traversal tricks;
-- purge_due names the author and runs oldest first; failed file removals are kept
-- in a service-only table.
do $$
declare
  m uuid := pg_temp.member('pm');   -- writes listings, posts and stories
  v uuid := pg_temp.member('pv');   -- the member whose folder m aims at
  lst uuid; s_new uuid; s_old uuid; first_id uuid; err text; ok boolean; out jsonb := '{}';
begin
  update public.profiles set identity_status = 'verified' where id in (m, v);

  -- The helper ------------------------------------------------------------------
  if to_regprocedure('public.path_owned_by(text,uuid)') is not null then
    execute $q$
      select public.path_owned_by($1 || '/a/b.jpg', $3)
         and not public.path_owned_by($1 || '/../' || $2 || '/x.jpg', $3)
         and not public.path_owned_by($1 || '//x.jpg', $3)
         and not public.path_owned_by($1 || '/./x.jpg', $3)
         and not public.path_owned_by($1 || '/a/..', $3)
         and not public.path_owned_by($1 || '/%2e%2e/x.jpg', $3)
         and not public.path_owned_by($1 || E'/..\\x.jpg', $3)
         and not public.path_owned_by($1, $3)
         and not public.path_owned_by($1 || '/', $3)
         and not public.path_owned_by('https://x.test/' || $1 || '/a.jpg', $3)
         and not public.path_owned_by($1 || ':/a.jpg', $3)
         and not public.path_owned_by($2 || '/a.jpg', $3)
         and not coalesce(public.path_owned_by(null, $3), false)$q$
      into ok using m::text, v::text, m;
  end if;
  out := out || jsonb_build_object('helper_rules', coalesce(ok, false));

  -- Listings: the gate refuses traversal in every path column -------------------
  perform set_config('rota.moderating', 'on', true);
  err := 'none';
  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, authenticity_path)
      values (m, 'Robe 033e', 'Robes', 'S', 20, m::text || '/../' || v::text || '/x.jpg');
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('listing_proof_traversal_refused', err like '%Media must be uploaded%');
  err := 'none';
  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, photo_paths)
      values (m, 'Robe 033e', 'Robes', 'S', 20, array[m::text || '/%2e%2e/' || v::text || '/1.jpg']);
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('listing_photo_encoded_refused', err like '%Media must be uploaded%');
  err := 'none';
  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, video_path)
      values (m, 'Robe 033e', 'Robes', 'S', 20, m::text || '//v.mp4');
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('listing_video_empty_segment_refused', err like '%Media must be uploaded%');
  err := 'none';
  begin
    insert into public.listings (owner_id, title, category, size, price_per_day, photo_paths, video_path, authenticity_path)
      values (m, 'Robe 033e', 'Robes', 'S', 20, array[m::text || '/1.jpg'], m::text || '/v.mp4', m::text || '/proof.jpg')
      returning id into lst;
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('listing_valid_accepted', err = 'none' and lst is not null);
  err := 'none';
  begin
    update public.listings set authenticity_path = m::text || '/../' || v::text || '/x.jpg' where id = lst;
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('listing_update_traversal_refused', err like '%Media must be uploaded%');
  perform set_config('rota.moderating', 'off', true);

  -- Stories and posts: check constraints ----------------------------------------
  err := 'none';
  begin
    insert into public.stories (author_id, media_path) values (m, m::text || '/../' || v::text || '/s.jpg');
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('story_traversal_refused', err like '%check constraint%');
  err := 'none';
  begin
    insert into public.posts (author_id, kind, media_paths)
      values (m, 'fit', array[m::text || '/ok.jpg', m::text || '/../' || v::text || '/p.jpg']);
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('post_traversal_refused', err like '%check constraint%');
  err := 'none';
  begin
    insert into public.posts (author_id, kind, media_paths) values (m, 'fit', array[v::text || '/p.jpg']);
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('post_other_folder_refused', err like '%check constraint%');
  err := 'none';
  begin
    insert into public.posts (author_id, kind, media_paths) values (m, 'fit', array[m::text || '/p.jpg']);
  exception when others then err := sqlerrm;
  end;
  out := out || jsonb_build_object('post_valid_accepted', err = 'none');

  -- purge_due: the author comes back, oldest first, service role only -----------
  insert into public.stories (author_id, media_path) values (m, m::text || '/new.jpg') returning id into s_new;
  insert into public.stories (author_id, media_path) values (m, m::text || '/old.jpg') returning id into s_old;
  update public.stories set deleted_at = now() - interval '35 days' where id = s_new;
  update public.stories set deleted_at = now() - interval '40 days' where id = s_old;
  select d.id into first_id from public.purge_due(1) d;
  out := out || jsonb_build_object(
    'purge_due_oldest_first', first_id = s_old,
    -- The heap or an index may return this order by luck: the definition must ask for it.
    'purge_due_ordered', pg_get_functiondef('public.purge_due(integer)'::regprocedure) ilike '%order by%',
    'purge_due_has_author', pg_get_function_result('public.purge_due(integer)'::regprocedure) like '%author_id uuid%',
    'purge_due_service_only', has_function_privilege('service_role', 'public.purge_due(integer)', 'execute')
                              and not has_function_privilege('authenticated', 'public.purge_due(integer)', 'execute')
                              and not has_function_privilege('anon', 'public.purge_due(integer)', 'execute'));

  -- storage_orphans: RLS on, service role only ----------------------------------
  out := out || jsonb_build_object('orphans_service_only', coalesce((
    select c.relrowsecurity
       and not has_table_privilege('authenticated', c.oid, 'select')
       and not has_table_privilege('authenticated', c.oid, 'insert')
       and not has_table_privilege('anon', c.oid, 'select')
       and has_table_privilege('service_role', c.oid, 'insert')
       and has_table_privilege('service_role', c.oid, 'delete')
      from pg_class c where c.oid = to_regclass('public.storage_orphans')), false));
  raise exception 'RESULT %', out;
end $$;
