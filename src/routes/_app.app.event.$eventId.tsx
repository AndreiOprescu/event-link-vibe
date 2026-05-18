import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarBubble } from "@/components/app/AvatarBubble";
import { ArrowLeft, Coffee, Mail, Linkedin, Mic, Video, Send, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/app/event/$eventId")({
  head: () => ({ meta: [{ title: "Event room — EventLabs" }] }),
  component: EventRoom,
});

type Position = { x: number; y: number };
type Msg = {
  id: string;
  event_id: string;
  profile_id: string;
  text: string;
  created_at: string;
};

type EventRow = {
  id: string; code: string; title: string; host: string; date_label: string; status: string; color: string; attendees: number;
};

function EventRoom() {
  const { eventId } = Route.useParams();
  const { profile: me } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data as EventRow | null));
    supabase.from("profiles").select("*").eq("is_demo", true).then(({ data }) => setProfiles((data ?? []) as Profile[]));
    supabase.from("event_messages").select("*").eq("event_id", eventId).order("created_at", { ascending: true }).then(({ data }) => {
      setMessages((data ?? []) as Msg[]);
    });
  }, [eventId]);

  // Realtime new messages
  useEffect(() => {
    const ch = supabase
      .channel(`event-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` }, (payload) => {
        setMessages((m) => [...m, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  // Tick for floating message TTL
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Layout positions
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

  // Only show last messages that are < 8s old as floating bubbles
  const floating = messages.filter((m) => now - new Date(m.created_at).getTime() < 8000);

  const sendMessage = async () => {
    if (!draft.trim() || !me) return;
    const text = draft.trim();
    setDraft("");
    const { error } = await supabase.from("event_messages").insert({ event_id: eventId, profile_id: me.id, text });
    if (error) console.error(error);
  };

  const selectedUser = selected ? profileById.get(selected) ?? null : null;

  useEffect(() => {
    if (chatOpen) sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatOpen, messages.length]);

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
        <Link to="/app/event/$eventId/break" params={{ eventId }} className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]">
          <Coffee className="h-3.5 w-3.5" />
          Too crowded
        </Link>
      </div>

      {/* Room floor */}
      <div className="tile-floor absolute inset-0">
        {profiles.map((a) => {
          const p = positions[a.id];
          if (!p) return null;
          return (
            <div
              key={a.id}
              className="absolute drift"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)", animationDelay: `${(a.id.charCodeAt(0) * 0.13) % 4}s` }}
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              <AvatarBubble user={{ id: a.id, name: a.display_name, emoji: a.emoji, color: a.color }} size={56} label onClick={() => setSelected(a.id)} />
              {hover === a.id && <HoverCard p={a} />}
            </div>
          );
        })}

        {me && positions[me.id] && (
          <div className="absolute" style={{ left: `${positions[me.id].x}%`, top: `${positions[me.id].y}%`, transform: "translate(-50%, -50%)" }}>
            <div className="rounded-full ring-4 ring-lime ring-offset-2 ring-offset-background">
              <AvatarBubble user={{ id: me.id, name: me.display_name, emoji: me.emoji, color: me.color }} size={64} label />
            </div>
            <div className="mt-1 text-center text-[10px] font-medium uppercase tracking-widest text-lime">you</div>
          </div>
        )}

        {floating.map((m) => {
          const u = profileById.get(m.profile_id);
          const pos = positions[m.profile_id];
          if (!u || !pos) return null;
          return (
            <div key={m.id} className="msg-float pointer-events-auto absolute z-20" style={{ left: `${pos.x}%`, top: `calc(${pos.y}% - 50px)` }}>
              <button
                onClick={() => { setSelected(u.id); setChatOpen(true); }}
                className="block max-w-[220px] rounded-2xl border border-border bg-popover px-4 py-2 text-sm shadow-card hover:border-lime"
                style={{ transform: "translateX(-50%)" }}
              >
                <span className="mr-1.5 text-xs font-semibold" style={{ color: u.color }}>{u.display_name.split(" ")[0]}:</span>
                {m.text}
              </button>
            </div>
          );
        })}
      </div>

      {/* Compose bar */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-border bg-background/80 p-2 shadow-card backdrop-blur-xl">
          <button className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-lime"><Mic className="h-4 w-4" /></button>
          <button className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-lime"><Video className="h-4 w-4" /></button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Say something to the room…"
            className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setChatOpen(true)} className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-lime" title="Chat history">
            <MessageCircle className="h-4 w-4" />
          </button>
          <button onClick={sendMessage} className="flex items-center gap-1 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {selectedUser && !chatOpen && (
        <ProfileDrawer p={selectedUser} onClose={() => setSelected(null)} onChat={() => setChatOpen(true)} />
      )}

      {chatOpen && (
        <ChatDrawer
          user={selectedUser}
          messages={messages}
          profileById={profileById}
          me={me}
          onClose={() => { setChatOpen(false); setSelected(null); }}
          sentinelRef={sentinelRef}
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
          <MessageCircle className="h-4 w-4" /> Open chat
        </button>
      </div>
    </div>
  );
}

function ChatDrawer({
  user, messages, profileById, me, onClose, sentinelRef, eventId,
}: {
  user: Profile | null;
  messages: Msg[];
  profileById: Map<string, Profile>;
  me: Profile | null;
  onClose: () => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  eventId: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || !me || sending) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("event_messages").insert({ event_id: eventId, profile_id: me.id, text });
    if (error) console.error(error);
    setSending(false);
    requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-background/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ backgroundColor: user.color }}>
                {user.emoji}
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lime">
                <MessageCircle className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="font-display text-sm font-semibold">{user?.display_name ?? "Room chat"}</div>
              <div className="text-[10px] text-muted-foreground">
                {user ? "Room chat · everyone can see this" : "Everyone in the room"}
              </div>
            </div>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-12">No messages yet — say hi 👋</div>
          )}
          {messages.map((m) => {
            const u = profileById.get(m.profile_id);
            const mine = me && m.profile_id === me.id;
            return (
              <div key={m.id} className={`flex items-start gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                {u && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm" style={{ backgroundColor: u.color }}>{u.emoji}</div>
                )}
                <div className={mine ? "max-w-[80%] rounded-2xl bg-lime px-4 py-2 text-sm text-primary-foreground" : "max-w-[80%]"}>
                  {!mine && u && (
                    <div className="text-[10px] font-semibold" style={{ color: u.color }}>{u.display_name.split(" ")[0]}</div>
                  )}
                  {mine ? m.text : <div className="rounded-2xl bg-surface px-3 py-1.5 text-sm">{m.text}</div>}
                </div>
              </div>
            );
          })}
          <div ref={sentinelRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 p-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={user ? "Message everyone in the room…" : "Message the room…"}
              className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className="flex items-center gap-1 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
