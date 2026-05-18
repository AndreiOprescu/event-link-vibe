ALTER TABLE public.event_messages
  ADD COLUMN kind text NOT NULL DEFAULT 'global',
  ADD COLUMN parent_id uuid REFERENCES public.event_messages(id) ON DELETE CASCADE;

ALTER TABLE public.event_messages
  ADD CONSTRAINT event_messages_kind_check CHECK (kind IN ('discussion','reply','global'));

CREATE INDEX idx_event_messages_parent ON public.event_messages(event_id, parent_id);
CREATE INDEX idx_event_messages_kind_time ON public.event_messages(event_id, kind, created_at);