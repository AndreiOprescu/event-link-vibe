
ALTER TABLE public.chat_reads DROP CONSTRAINT chat_reads_pkey;
ALTER TABLE public.chat_reads ALTER COLUMN peer_profile_id DROP NOT NULL;
ALTER TABLE public.chat_reads ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY;
DROP INDEX IF EXISTS chat_reads_room_unique;
CREATE UNIQUE INDEX chat_reads_dm_unique
  ON public.chat_reads (profile_id, event_id, scope, peer_profile_id)
  WHERE peer_profile_id IS NOT NULL;
CREATE UNIQUE INDEX chat_reads_room_unique
  ON public.chat_reads (profile_id, event_id, scope)
  WHERE peer_profile_id IS NULL;
