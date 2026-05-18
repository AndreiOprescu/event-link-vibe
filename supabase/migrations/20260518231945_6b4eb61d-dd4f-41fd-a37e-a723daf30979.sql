-- Extend event_messages with media columns
alter table public.event_messages
  add column if not exists media_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists media_duration_seconds integer,
  add column if not exists waveform_peaks jsonb;

alter table public.event_messages
  drop constraint if exists event_messages_media_type_check;
alter table public.event_messages
  add constraint event_messages_media_type_check
  check (media_type in ('text','audio','image','video'));

-- Allow text to be null when media is attached
alter table public.event_messages alter column text drop not null;
alter table public.event_messages
  drop constraint if exists event_messages_text_or_media_check;
alter table public.event_messages
  add constraint event_messages_text_or_media_check
  check (text is not null or media_type <> 'text');

-- Helper: does the auth user own this profile?
create or replace function public.owns_profile(_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _profile_id and user_id = auth.uid()
  );
$$;

-- Storage bucket for media
insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "event_media_public_read" on storage.objects;
create policy "event_media_public_read"
on storage.objects for select
using (bucket_id = 'event-media');

-- Authenticated insert into own profile folder: {event_id}/{profile_id}/{file}
drop policy if exists "event_media_insert_own" on storage.objects;
create policy "event_media_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-media'
  and public.owns_profile(((storage.foldername(name))[2])::uuid)
);