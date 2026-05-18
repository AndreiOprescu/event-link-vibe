import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AVATARS, ME, EVENTS, ChatMsg } from "@/data/mock";
import { AvatarBubble } from "@/components/app/AvatarBubble";
import { ArrowLeft, Coffee, Mail, Linkedin, Mic, Video, Send, MessageCircle, X } from "lucide-react";

export const Route = createFileRoute("/_app/app/event/$eventId")({
  head: () => ({ meta: [{ title: "Event room — EventLabs" }] }),
  component: EventRoom,
});

const STARTER_MSGS = [
  "anyone else here for the AI panel?",
  "this stage is fire 🔥",
  "looking for a designer to grab coffee ☕",
  "loved that talk on memory graphs",
  "who's going to the afterparty?",
  "demo time 🚀",
];

type Position = { x: number; y: number };

function EventRoom() {
  const { eventId } = Route.useParams();
  const nav = useNavigate();
  const event = EVENTS.find((e) => e.id === eventId) ?? EVENTS[0];

  // Pre-compute scattered positions for avatars (room layout)
  const positions = useMemo<Record<string, Position>>(() => {
    const out: Record<string, Position> = {};
    AVATARS.forEach((a, i) => {
      // deterministic pseudo-random
      const seed = (i * 9301 + 49297) % 233280;
      const rx = (seed % 100) / 100;
      const ry = ((seed * 7) % 100) / 100;
      out[a.id] = {
        x: 8 + rx * 84,
        y: 18 + ry * 70,
      };
    });
    out[ME.id] = { x: 48, y: 50 };
    return out;
  }, []);

  const [messages, setMessages] = useState<(ChatMsg & { pos: Position })[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  // Random message generator
  useEffect(() => {
    const id = setInterval(() => {
      const speaker = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      const msg: ChatMsg & { pos: Position } = {
        id: crypto.randomUUID(),
        userId: speaker.id,
        text: STARTER_MSGS[Math.floor(Math.random() * STARTER_MSGS.length)],
        kind: "text",
        at: Date.now(),
        pos: positions[speaker.id],
      };
      setMessages((m) => [...m, msg]);
      setTimeout(() => {
        setMessages((m) => m.filter((x) => x.id !== msg.id));
      }, 5000);
    }, 1800);
    return () => clearInterval(id);
  }, [positions]);

  const sendMessage = () => {
    if (!draft.trim()) return;
    const msg: ChatMsg & { pos: Position } = {
      id: crypto.randomUUID(),
      userId: ME.id,
      text: draft,
      kind: "text",
      at: Date.now(),
      pos: positions[ME.id],
    };
    setMessages((m) => [...m, msg]);
    setTimeout(() => setMessages((m) => m.filter((x) => x.id !== msg.id)), 5000);
    setDraft("");
  };

  const selectedUser = selected
    ? selected === ME.id ? ME : AVATARS.find((a) => a.id === selected)
    : null;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <Link
          to="/app"
          className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs font-medium backdrop-blur-md hover:bg-surface"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back · your avatar disappears
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs backdrop-blur-md sm:flex">
          <span className="font-mono text-muted-foreground">{event.code}</span>
          <span className="text-foreground">{event.title}</span>
          <span className="ml-2 flex items-center gap-1 text-lime">
            <span className="h-1.5 w-1.5 rounded-full bg-lime pulse-lime" />
            {AVATARS.length + 1}
          </span>
        </div>
        <Link
          to="/app/event/$eventId/break"
          params={{ eventId }}
          className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
        >
          <Coffee className="h-3.5 w-3.5" />
          Too crowded
        </Link>
      </div>

      {/* Room floor */}
      <div className="tile-floor absolute inset-0">
        {/* Avatars */}
        {AVATARS.map((a) => {
          const p = positions[a.id];
          return (
            <div
              key={a.id}
              className="absolute drift"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                animationDelay: `${(parseInt(a.id.slice(1)) * 0.3) % 4}s`,
              }}
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              <AvatarBubble user={a} size={56} label onClick={() => setSelected(a.id)} />
              {hover === a.id && <HoverCard userId={a.id} />}
            </div>
          );
        })}

        {/* Me */}
        <div
          className="absolute"
          style={{ left: `${positions[ME.id].x}%`, top: `${positions[ME.id].y}%`, transform: "translate(-50%, -50%)" }}
        >
          <div className="rounded-full ring-4 ring-lime ring-offset-2 ring-offset-background">
            <AvatarBubble user={ME} size={64} label />
          </div>
          <div className="mt-1 text-center text-[10px] font-medium uppercase tracking-widest text-lime">you</div>
        </div>

        {/* Floating messages */}
        {messages.map((m) => {
          const u = m.userId === ME.id ? ME : AVATARS.find((a) => a.id === m.userId)!;
          return (
            <div
              key={m.id}
              className="msg-float pointer-events-auto absolute z-20"
              style={{ left: `${m.pos.x}%`, top: `calc(${m.pos.y}% - 50px)` }}
            >
              <button
                onClick={() => { setSelected(u.id); setChatOpen(true); }}
                className="block max-w-[220px] rounded-2xl border border-border bg-popover px-4 py-2 text-sm shadow-card hover:border-lime"
                style={{ transform: "translateX(-50%)" }}
              >
                <span className="mr-1.5 text-xs font-semibold" style={{ color: u.color }}>{u.name.split(" ")[0]}:</span>
                {m.text}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom compose bar */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-border bg-background/80 p-2 shadow-card backdrop-blur-xl">
          <button className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-lime">
            <Mic className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-lime">
            <Video className="h-4 w-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Say something to the room…"
            className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setChatOpen(true)}
            className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-lime"
            title="Chat history"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            onClick={sendMessage}
            className="flex items-center gap-1 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Profile detail drawer */}
      {selectedUser && !chatOpen && (
        <ProfileDrawer
          user={selectedUser}
          onClose={() => setSelected(null)}
          onChat={() => setChatOpen(true)}
        />
      )}

      {/* Chat thread drawer */}
      {chatOpen && (
        <ChatDrawer
          user={selectedUser}
          onClose={() => { setChatOpen(false); setSelected(null); }}
        />
      )}
    </div>
  );
}

function HoverCard({ userId }: { userId: string }) {
  const u = AVATARS.find((a) => a.id === userId)!;
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-left shadow-card">
      <div className="font-display text-sm font-semibold">{u.name}</div>
      <div className="text-[11px] text-muted-foreground">{u.role} · {u.company}</div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Linkedin className="h-3 w-3" /> {u.linkedin}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Mail className="h-3 w-3" /> {u.email}
      </div>
    </div>
  );
}

function ProfileDrawer({ user, onClose, onChat }: { user: any; onClose: () => void; onChat: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-background/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="m-4 w-full max-w-sm rounded-3xl border border-border bg-popover p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: user.color }}>
            {user.emoji}
          </div>
          <div>
            <div className="font-display text-xl font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.role} · {user.company}</div>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-lime/30 bg-lime/5 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Their goal</div>
          <div className="mt-1 text-sm">{user.goal}</div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><Linkedin className="h-3.5 w-3.5" /> {user.linkedin}</div>
          <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {user.email}</div>
        </div>
        <button
          onClick={onChat}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <MessageCircle className="h-4 w-4" /> Open chat
        </button>
      </div>
    </div>
  );
}

function ChatDrawer({ user, onClose }: { user: any; onClose: () => void }) {
  const [tab, setTab] = useState<"thread" | "room">(user ? "thread" : "room");
  const [msgs, setMsgs] = useState<{ id: string; mine: boolean; text: string }[]>([
    { id: "1", mine: false, text: "hey! saw your post about the AI panel" },
    { id: "2", mine: true, text: "yes! you going?" },
    { id: "3", mine: false, text: "for sure — let's grab a coffee after" },
  ]);
  const [d, setD] = useState("");

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-background/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ backgroundColor: user.color }}>
                {user.emoji}
              </div>
            )}
            <div>
              <div className="font-display text-sm font-semibold">{user?.name ?? "Room chat"}</div>
              <div className="text-[10px] text-muted-foreground">{tab === "thread" ? "Direct thread" : "Everyone in the room"}</div>
            </div>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="flex gap-1 border-b border-border p-2">
          {user && (
            <button
              onClick={() => setTab("thread")}
              className={`flex-1 rounded-lg py-2 text-xs font-medium ${tab === "thread" ? "bg-lime text-primary-foreground" : "text-muted-foreground hover:bg-surface"}`}
            >
              Thread
            </button>
          )}
          <button
            onClick={() => setTab("room")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${tab === "room" ? "bg-lime text-primary-foreground" : "text-muted-foreground hover:bg-surface"}`}
          >
            Full room history
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "thread" ? (
            <div className="space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.mine ? "ml-auto bg-lime text-primary-foreground" : "bg-surface"}`}>
                  {m.text}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {AVATARS.slice(0, 8).map((a, i) => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm" style={{ backgroundColor: a.color }}>{a.emoji}</div>
                  <div>
                    <div className="text-[10px] font-semibold" style={{ color: a.color }}>{a.name.split(" ")[0]}</div>
                    <div className="rounded-2xl bg-surface px-3 py-1.5 text-sm">{STARTER_MSGS[i % STARTER_MSGS.length]}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <button className="rounded-full p-2 text-muted-foreground hover:text-lime"><Mic className="h-4 w-4" /></button>
          <button className="rounded-full p-2 text-muted-foreground hover:text-lime"><Video className="h-4 w-4" /></button>
          <input
            value={d}
            onChange={(e) => setD(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && d.trim()) {
                setMsgs((m) => [...m, { id: crypto.randomUUID(), mine: true, text: d }]);
                setD("");
              }
            }}
            placeholder="Write a message…"
            className="flex-1 rounded-full bg-surface px-4 py-2 text-sm outline-none"
          />
          <button
            onClick={() => {
              if (!d.trim()) return;
              setMsgs((m) => [...m, { id: crypto.randomUUID(), mine: true, text: d }]);
              setD("");
            }}
            className="rounded-full bg-lime p-2 text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
