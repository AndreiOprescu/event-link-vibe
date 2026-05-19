CREATE POLICY "event_media_chat_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-media'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] NOT IN ('avatars', 'intros')
  AND public.owns_profile(((storage.foldername(name))[2])::uuid)
);