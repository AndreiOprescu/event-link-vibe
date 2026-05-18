revoke execute on function public.owns_profile(uuid) from public, anon;
grant execute on function public.owns_profile(uuid) to authenticated;

drop policy if exists "event_media_public_read" on storage.objects;
create policy "event_media_authed_read"
on storage.objects for select
to authenticated
using (bucket_id = 'event-media');