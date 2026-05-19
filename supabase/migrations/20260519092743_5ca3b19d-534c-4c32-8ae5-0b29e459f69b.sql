
CREATE TABLE IF NOT EXISTS public.event_members (
  user_id uuid NOT NULL,
  event_id text NOT NULL,
  goal text NOT NULL,
  intro text NOT NULL,
  intro_video_url text,
  intro_duration_seconds integer,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_members_select_auth" ON public.event_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_members_insert_own" ON public.event_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_members_update_own" ON public.event_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Storage policies for event-media bucket
CREATE POLICY "event_media_auth_upload_avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-media'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "event_media_auth_update_avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-media'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "event_media_auth_upload_intros" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-media'
    AND (storage.foldername(name))[1] = 'intros'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

CREATE POLICY "event_media_auth_update_intros" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-media'
    AND (storage.foldername(name))[1] = 'intros'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );
