
-- Direct messages between two profiles within an event
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL,
  sender_profile_id uuid NOT NULL,
  recipient_profile_id uuid NOT NULL,
  text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT direct_messages_no_self CHECK (sender_profile_id <> recipient_profile_id)
);

CREATE INDEX direct_messages_pair_idx
  ON public.direct_messages (event_id, sender_profile_id, recipient_profile_id, created_at);
CREATE INDEX direct_messages_recipient_idx
  ON public.direct_messages (event_id, recipient_profile_id, created_at);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- A user can read a DM if they own the sender or recipient profile.
CREATE POLICY direct_messages_select_participant
ON public.direct_messages
FOR SELECT
TO authenticated
USING (
  public.owns_profile(sender_profile_id)
  OR public.owns_profile(recipient_profile_id)
);

-- A user can insert a DM only as themselves (sender profile must be theirs).
CREATE POLICY direct_messages_insert_own
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (public.owns_profile(sender_profile_id));

-- Per-user read receipts for both room and DM scopes.
CREATE TABLE public.chat_reads (
  profile_id uuid NOT NULL,
  event_id text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('room','dm')),
  peer_profile_id uuid,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, event_id, scope, peer_profile_id)
);

-- Ensure uniqueness for room rows (where peer_profile_id is null) too.
CREATE UNIQUE INDEX chat_reads_room_unique
  ON public.chat_reads (profile_id, event_id, scope)
  WHERE peer_profile_id IS NULL;

ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_reads_select_own
ON public.chat_reads
FOR SELECT
TO authenticated
USING (public.owns_profile(profile_id));

CREATE POLICY chat_reads_insert_own
ON public.chat_reads
FOR INSERT
TO authenticated
WITH CHECK (public.owns_profile(profile_id));

CREATE POLICY chat_reads_update_own
ON public.chat_reads
FOR UPDATE
TO authenticated
USING (public.owns_profile(profile_id))
WITH CHECK (public.owns_profile(profile_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
