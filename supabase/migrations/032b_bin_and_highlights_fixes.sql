-- 032b: deleting the last story of a highlight removes the highlight before the
-- story id is taken out. Emptying story_ids first left the derived media_paths
-- null and broke the 1..20 story count, so delete_story failed.

create or replace function public.delete_story(p_story uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.stories set deleted_at = now() where id = p_story and author_id = auth.uid() and deleted_at is null;
  if not found then return; end if;
  delete from public.story_highlights
   where owner_id = auth.uid() and story_ids <@ array[p_story];
  update public.story_highlights set story_ids = array_remove(story_ids, p_story)
   where owner_id = auth.uid() and p_story = any (story_ids);
end $$;

revoke execute on function public.delete_story(uuid) from public, anon;
grant execute on function public.delete_story(uuid) to authenticated;
