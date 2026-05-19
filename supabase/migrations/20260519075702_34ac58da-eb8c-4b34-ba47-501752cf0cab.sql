ALTER TABLE public.event_messages ADD COLUMN room_id TEXT NULL;
CREATE INDEX event_messages_event_room_idx ON public.event_messages (event_id, room_id, created_at);