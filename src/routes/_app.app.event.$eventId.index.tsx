import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AvatarBubble } from "@/components/app/AvatarBubble";
import { ArrowLeft, Mail, Linkedin, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { BreakRoomPicker } from "@/components/app/BreakRoomPicker";
import { RoomChat, mediaLabel, type Msg } from "@/components/app/RoomChat";

export const Route = createFileRoute("/_app/app/event/$eventId/")({
  head: () => ({ meta: [{ title: "Event room — EventLabs" }] }),
  component: EventRoom,
});

type Position = { x: number; y: number };

type EventRow = {
  id: string; code: string; title: string; host: string; date_label: string; status: string; color: string; attendees: number;
};

function EventRoom() {
  const { eventId } = Route.useParams();
  const { profile: me } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [focusDiscussionId, setFocusDiscussionId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data as EventRow | null));
    supabase.from("profiles").select("*").eq("is_demo", true).then(({ data }) => setProfiles((data ?? []) as Profile[]));
    supabase
      .from("event_messages")
      .select("*")
      .eq("event_id", eventId)
      .is("room_id", null)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as unknown as Msg[]);
      });
  }, [eventId]);

  useEffect(() => {
    const ch = supabase
      .channel(`event-${eventId}-main`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` }, (payload) => {
        const row = payload.new as unknown as Msg;
        if (row.room_id !== null) return;
        setMessages((m) => [...m, row]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  const positions = useMemo<Record<string, Position>>(() => {
    const out: Record<string, Position> = {};
    profiles.forEach((p, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      out[p.id] = { x: 8 + ((seed % 100) / 100) * 84, y: 18 + (((seed * 7) % 100) / 100) * 70 };
    });
    if (me) out[me.id] = { x: 48, y: 50 };
    return out;
  }, [profiles, me]);

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    if (me) m.set(me.id, me);
    return m;
  }, [profiles, me]);

  const replyCount = useMemo(() => {
    const c = new Map<string, number>();
    messages.forEach((m) => {
      if (m.kind === "reply" && m.parent_id) c.set(m.parent_id, (c.get(m.parent_id) ?? 0) + 1);
    });
    return c;
  }, [messages]);

  const activeDiscussionByProfile = useMemo(() => {
    const map = new Map<string, Msg>();
    messages
      .filter((m) => m.kind === "discussion")
      .forEach((m) => {
        const prev = map.get(m.profile_id);
        if (!prev || new Date(m.created_at) > new Date(prev.created_at)) map.set(m.profile_id, m);
      });
    return map;
  }, [messages]);

  const openThread = (discussionId: string) => {
    setFocusDiscussionId(discussionId);
    setChatOpen(true);
  };

  const selectedUser = selected ? profileById.get(selected) ?? null : null;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <Link to="/app" className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs font-medium backdrop-blur-md hover:bg-surface">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back · your avatar disappears
        </Link>
        {event && (
          <div className="hidden items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs backdrop-blur-md sm:flex">
            <span className="font-mono text-muted-foreground">{event.code}</span>
            <span className="text-foreground">{event.title}</span>
            <span className="ml-2 flex items-center gap-1 text-lime">
              <span className="h-1.5 w-1.5 rounded-full bg-lime pulse-lime" />
              {profiles.length + 1}
            </span>
          </div>
        )}
        <BreakRoomPicker eventId={eventId} goal={me?.goal} />
      </div>

      {/* Room floor */}
      <div className="tile-floor absolute inset-0">
        {profiles.map((a) => {
          const p = positions[a.id];
          if (!p) return null;
          const disc = activeDiscussionByProfile.get(a.id);
          const count = disc ? replyCount.get(disc.id) ?? 0 : 0;
          const bubbleSize = Math.min(140, 48 + count * 8);
          const seed = a.id.charCodeAt(0) + a.id.charCodeAt(1 % a.id.length);
          const delay = -((seed * 0.37) % 6);
          const duration = 5 + ((seed * 0.19) % 4);
          return (
            <div
              key={a.id}
              className="absolute"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="drift" style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}>
                {disc && (
                  <button
                    onClick={() => openThread(disc.id)}
                    className="absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full rounded-2xl border border-border bg-popover px-3 py-1.5 text-xs shadow-card transition hover:border-lime hover:scale-105"
                    style={{ minWidth: bubbleSize, maxWidth: 240 }}
                    title={`${count} repl${count === 1 ? "y" : "ies"}`}
                  >
                    <div className="truncate" style={{ fontSize: Math.min(14, 11 + count * 0.3) }}>
                      {mediaLabel(disc)}
                    </div>
                    {count > 0 && (
                      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-lime">
                        {count} repl{count === 1 ? "y" : "ies"}
                      </div>
                    )}
                  </button>
                )}
                <div className="bubble-halo">
                  <AvatarBubble user={{ id: a.id, name: a.display_name, emoji: a.emoji, color: a.color }} size={56} label onClick={() => setSelected(a.id)} />
                </div>
                {hover === a.id && <HoverCard p={a} />}
              </div>
            </div>
          );
        })}

        {me && positions[me.id] && (() => {
          const disc = activeDiscussionByProfile.get(me.id);
          const count = disc ? replyCount.get(disc.id) ?? 0 : 0;
          const bubbleSize = Math.min(140, 48 + count * 8);
          return (
            <div className="absolute" style={{ left: `${positions[me.id].x}%`, top: `${positions[me.id].y}%`, transform: "translate(-50%, -50%)" }}>
              <div className="drift" style={{ animationDelay: "-1.5s", animationDuration: "7s" }}>
                {disc && (
                  <button
                    onClick={() => openThread(disc.id)}
                    className="absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full rounded-2xl border border-lime/50 bg-popover px-3 py-1.5 text-xs shadow-glow transition hover:scale-105"
                    style={{ minWidth: bubbleSize, maxWidth: 240 }}
                  >
                    <div className="truncate" style={{ fontSize: Math.min(14, 11 + count * 0.3) }}>{mediaLabel(disc)}</div>
                    {count > 0 && (
                      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-lime">
                        {count} repl{count === 1 ? "y" : "ies"}
                      </div>
                    )}
                  </button>
                )}
                <div className="bubble-halo rounded-full ring-4 ring-lime ring-offset-2 ring-offset-background">
                  <AvatarBubble user={{ id: me.id, name: me.display_name, emoji: me.emoji, color: me.color }} size={64} label />
                </div>
                <div className="mt-1 text-center text-[10px] font-medium uppercase tracking-widest text-lime">you</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Open chat FAB */}
      {!chatOpen && (
        <button
          onClick={() => { setFocusDiscussionId(null); setChatOpen(true); }}
          className="absolute bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.03]"
        >
          <MessageCircle className="h-4 w-4" />
          Room chat
        </button>
      )}

      {selectedUser && !chatOpen && (
        <ProfileDrawer p={selectedUser} onClose={() => setSelected(null)} onChat={() => { setFocusDiscussionId(null); setChatOpen(true); }} />
      )}

      {chatOpen && (
        <RoomChat
          eventId={eventId}
          roomId={null}
          messages={messages}
          profileById={profileById}
          me={me}
          focusDiscussionId={focusDiscussionId}
          onClose={() => { setChatOpen(false); setSelected(null); setFocusDiscussionId(null); }}
        />
      )}
    </div>
  );
}

function HoverCard({ p }: { p: Profile }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-left shadow-card">
      <div className="font-display text-sm font-semibold">{p.display_name}</div>
      <div className="text-[11px] text-muted-foreground">{p.role} · {p.company}</div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Linkedin className="h-3 w-3" /> {p.linkedin}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Mail className="h-3 w-3" /> {p.email}
      </div>
    </div>
  );
}

function ProfileDrawer({ p, onClose, onChat }: { p: Profile; onClose: () => void; onChat: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-background/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="m-4 w-full max-w-sm rounded-3xl border border-border bg-popover p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: p.color }}>
            {p.emoji}
          </div>
          <div>
            <div className="font-display text-xl font-semibold">{p.display_name}</div>
            <div className="text-xs text-muted-foreground">{p.role} · {p.company}</div>
          </div>
        </div>
        {p.goal && (
          <div className="mt-5 rounded-xl border border-lime/30 bg-lime/5 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Their goal</div>
            <div className="mt-1 text-sm">{p.goal}</div>
          </div>
        )}
        <div className="mt-4 space-y-2 text-sm">
          {p.linkedin && <div className="flex items-center gap-2 text-muted-foreground"><Linkedin className="h-3.5 w-3.5" /> {p.linkedin}</div>}
          {p.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {p.email}</div>}
        </div>
        <button onClick={onChat} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow">
          <MessageCircle className="h-4 w-4" /> Open room chat
        </button>
      </div>
    </div>
  );
}
