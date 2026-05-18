import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarBubble } from "@/components/app/AvatarBubble";
import { ArrowLeft, Coffee, Mail, Linkedin, Send, MessageCircle, X, CornerDownRight, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/app/event/$eventId")({
  head: () => ({ meta: [{ title: "Event room — EventLabs" }] }),
  component: EventRoom,
});

type Position = { x: number; y: number };
type MsgKind = "discussion" | "reply" | "global";
type Msg = {
  id: string;
  event_id: string;
  profile_id: string;
  text: string;
  created_at: string;
  kind: MsgKind;
  parent_id: string | null;
};

type EventRow = {
  id: string; code: string; title: string; host: string; date_label: string; status: string; color: string; attendees: number;
};

function firstName(name: string) {
  return name.split(" ")[0];
}

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
    supabase.from("event_messages").select("*").eq("event_id", eventId).order("created_at", { ascending: true }).then(({ data }) => {
      setMessages((data ?? []) as Msg[]);
    });
  }, [eventId]);

  useEffect(() => {
    const ch = supabase
      .channel(`event-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` }, (payload) => {
        setMessages((m) => [...m, payload.new as Msg]);
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

  // Reply counts per discussion id
  const replyCount = useMemo(() => {
    const c = new Map<string, number>();
    messages.forEach((m) => {
      if (m.kind === "reply" && m.parent_id) c.set(m.parent_id, (c.get(m.parent_id) ?? 0) + 1);
    });
    return c;
  }, [messages]);

  // Latest active discussion per profile (one bubble per person)
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
          const disc = activeDiscussionByProfile.get(a.id);
          const count = disc ? replyCount.get(disc.id) ?? 0 : 0;
          const bubbleSize = Math.min(140, 48 + count * 8);
          return (
            <div
              key={a.id}
              className="absolute drift"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)", animationDelay: `${(a.id.charCodeAt(0) * 0.13) % 4}s` }}
              onMouseEnter={() => setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              {disc && (
                <button
                  onClick={() => openThread(disc.id)}
                  className="absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full rounded-2xl border border-border bg-popover px-3 py-1.5 text-xs shadow-card transition hover:border-lime hover:scale-105"
                  style={{ minWidth: bubbleSize, maxWidth: 240 }}
                  title={`${count} repl${count === 1 ? "y" : "ies"}`}
                >
                  <div className="truncate" style={{ fontSize: Math.min(14, 11 + count * 0.3) }}>
                    {disc.text}
                  </div>
                  {count > 0 && (
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-lime">
                      {count} repl{count === 1 ? "y" : "ies"}
                    </div>
                  )}
                </button>
              )}
              <AvatarBubble user={{ id: a.id, name: a.display_name, emoji: a.emoji, color: a.color }} size={56} label onClick={() => setSelected(a.id)} />
              {hover === a.id && <HoverCard p={a} />}
            </div>
          );
        })}

        {me && positions[me.id] && (() => {
          const disc = activeDiscussionByProfile.get(me.id);
          const count = disc ? replyCount.get(disc.id) ?? 0 : 0;
          const bubbleSize = Math.min(140, 48 + count * 8);
          return (
            <div className="absolute" style={{ left: `${positions[me.id].x}%`, top: `${positions[me.id].y}%`, transform: "translate(-50%, -50%)" }}>
              {disc && (
                <button
                  onClick={() => openThread(disc.id)}
                  className="absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full rounded-2xl border border-lime/50 bg-popover px-3 py-1.5 text-xs shadow-glow transition hover:scale-105"
                  style={{ minWidth: bubbleSize, maxWidth: 240 }}
                >
                  <div className="truncate" style={{ fontSize: Math.min(14, 11 + count * 0.3) }}>{disc.text}</div>
                  {count > 0 && (
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-lime">
                      {count} repl{count === 1 ? "y" : "ies"}
                    </div>
                  )}
                </button>
              )}
              <div className="rounded-full ring-4 ring-lime ring-offset-2 ring-offset-background">
                <AvatarBubble user={{ id: me.id, name: me.display_name, emoji: me.emoji, color: me.color }} size={64} label />
              </div>
              <div className="mt-1 text-center text-[10px] font-medium uppercase tracking-widest text-lime">you</div>
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

type ReplyTarget = {
  id: string;
  kind: MsgKind;
  parentId: string | null; // For replies-to-discussion: the discussion id. For global replies: null.
  authorName: string;
  snippet: string;
} | null;

function RoomChat({
  eventId, messages, profileById, me, focusDiscussionId, onClose,
}: {
  eventId: string;
  messages: Msg[];
  profileById: Map<string, Profile>;
  me: Profile | null;
  focusDiscussionId: string | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const discussionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-expand & scroll to focused discussion
  useEffect(() => {
    if (focusDiscussionId) {
      setExpanded((s) => new Set(s).add(focusDiscussionId));
      requestAnimationFrame(() => {
        discussionRefs.current[focusDiscussionId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }, [focusDiscussionId]);

  // Top-level feed: discussions + globals, interleaved by created_at
  const feed = useMemo(
    () => messages.filter((m) => m.kind === "discussion" || m.kind === "global"),
    [messages]
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, Msg[]>();
    messages.filter((m) => m.kind === "reply" && m.parent_id).forEach((m) => {
      const arr = map.get(m.parent_id!) ?? [];
      arr.push(m);
      map.set(m.parent_id!, arr);
    });
    return map;
  }, [messages]);

  const send = async (kind: MsgKind) => {
    const text = draft.trim();
    if (!text || !me || sending) return;
    setSending(true);
    const parent_id = kind === "reply" ? replyTo?.parentId ?? null : null;
    const { error } = await supabase.from("event_messages").insert({
      event_id: eventId, profile_id: me.id, text, kind, parent_id,
    });
    if (error) console.error(error);
    setDraft("");
    setReplyTo(null);
    setSending(false);
    requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const startReply = (m: Msg) => {
    const author = profileById.get(m.profile_id);
    if (!author) return;
    const name = firstName(author.display_name);
    const target: ReplyTarget =
      m.kind === "discussion"
        ? { id: m.id, kind: "reply", parentId: m.id, authorName: name, snippet: m.text }
        : m.kind === "reply"
          ? { id: m.id, kind: "reply", parentId: m.parent_id, authorName: name, snippet: m.text }
          : { id: m.id, kind: "global", parentId: null, authorName: name, snippet: m.text };
    setReplyTo(target);
    setDraft((d) => {
      const prefix = `/@${name} `;
      if (d.startsWith("/@")) return prefix + d.replace(/^\/@\S+\s*/, "");
      return prefix + d;
    });
    setTimeout(() => inputRef.current?.focus(), 0);
    if (target.kind === "reply" && target.parentId) {
      setExpanded((s) => new Set(s).add(target.parentId!));
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onSubmit = () => {
    if (replyTo) {
      send(replyTo.kind);
    } else {
      // Default Enter = global
      send("global");
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-background/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lime">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-semibold">Room chat</div>
              <div className="text-[10px] text-muted-foreground">Discussions & global messages</div>
            </div>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {feed.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-12">No messages yet — start a discussion or say hi 👋</div>
          )}
          {feed.map((m) => {
            const author = profileById.get(m.profile_id);
            if (!author) return null;
            if (m.kind === "discussion") {
              const replies = repliesByParent.get(m.id) ?? [];
              const isOpen = expanded.has(m.id);
              return (
                <div
                  key={m.id}
                  ref={(el) => { discussionRefs.current[m.id] = el; }}
                  className="rounded-2xl border border-border bg-background/40 p-3"
                >
                  <MessageRow m={m} author={author} me={me} onReply={() => startReply(m)} badge="discussion" />
                  {replies.length > 0 && (
                    <>
                      <button
                        onClick={() => toggleExpand(m.id)}
                        className="mt-2 text-[11px] font-mono uppercase tracking-widest text-lime hover:underline"
                      >
                        {isOpen ? "less..." : `more... (${replies.length})`}
                      </button>
                      {isOpen && (
                        <div className="mt-2 space-y-2 border-l-2 border-lime/30 pl-3">
                          {replies.map((r) => {
                            const ra = profileById.get(r.profile_id);
                            if (!ra) return null;
                            return <MessageRow key={r.id} m={r} author={ra} me={me} onReply={() => startReply(r)} compact />;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }
            // Global
            const replyingToGlobal = m.text.startsWith("/@")
              ? findRepliedGlobalSnippet(m, feed, profileById)
              : null;
            return (
              <div key={m.id}>
                {replyingToGlobal && (
                  <div className="ml-2 mb-0.5 text-[10px] text-muted-foreground italic">
                    ↳ replying to: <span className="truncate">{replyingToGlobal}</span>
                  </div>
                )}
                <MessageRow m={m} author={author} me={me} onReply={() => startReply(m)} badge="global" />
              </div>
            );
          })}
          <div ref={sentinelRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3 space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between rounded-full bg-surface px-3 py-1.5 text-[11px]">
              <span className="text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">{replyTo.authorName}</span>
                {replyTo.kind === "reply" ? " (in discussion)" : " (global)"}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-1.5">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder={replyTo ? "Write your reply…" : "Discussion or global message…"}
              className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {replyTo ? (
            <button
              onClick={() => send(replyTo.kind)}
              disabled={!draft.trim() || sending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-lime py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Send {replyTo.kind === "reply" ? "reply" : "global reply"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => send("discussion")}
                disabled={!draft.trim() || sending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-lime py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                title="Starts a new thread + bubble above your head"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Discussion
              </button>
              <button
                onClick={() => send("global")}
                disabled={!draft.trim() || sending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background/60 py-2 text-xs font-semibold text-foreground hover:bg-surface disabled:opacity-40"
                title="Flat message in the global feed"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Global
                <Send className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  m, author, me, onReply, badge, compact,
}: {
  m: Msg;
  author: Profile;
  me: Profile | null;
  onReply: () => void;
  badge?: "discussion" | "global";
  compact?: boolean;
}) {
  const mine = me && m.profile_id === me.id;
  return (
    <div className={`flex items-start gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm" style={{ backgroundColor: author.color }}>
        {author.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold" style={{ color: author.color }}>
            {firstName(author.display_name)}{mine ? " (you)" : ""}
          </span>
          {badge === "discussion" && (
            <span className="rounded-full bg-lime/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-lime">discussion</span>
          )}
          {badge === "global" && (
            <span className="rounded-full bg-surface px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">global</span>
          )}
        </div>
        <div className={`mt-0.5 rounded-xl bg-surface px-3 py-1.5 ${mine ? "border border-lime/40" : ""}`}>
          {renderTextWithMention(m.text)}
        </div>
        <button onClick={onReply} className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-lime">
          <CornerDownRight className="h-3 w-3" /> Reply
        </button>
      </div>
    </div>
  );
}

function renderTextWithMention(text: string) {
  const match = text.match(/^\/@(\S+)\s+(.*)$/s);
  if (!match) return <span>{text}</span>;
  return (
    <span>
      <span className="font-semibold text-lime">@{match[1]}</span> {match[2]}
    </span>
  );
}

function findRepliedGlobalSnippet(m: Msg, feed: Msg[], profileById: Map<string, Profile>): string | null {
  const match = m.text.match(/^\/@(\S+)\s+/);
  if (!match) return null;
  const targetName = match[1].toLowerCase();
  // Find most recent prior global by an author whose first name matches
  for (let i = feed.length - 1; i >= 0; i--) {
    const candidate = feed[i];
    if (candidate.id === m.id) continue;
    if (new Date(candidate.created_at) >= new Date(m.created_at)) continue;
    if (candidate.kind !== "global") continue;
    const author = profileById.get(candidate.profile_id);
    if (!author) continue;
    if (firstName(author.display_name).toLowerCase() === targetName) {
      return candidate.text.length > 60 ? candidate.text.slice(0, 60) + "…" : candidate.text;
    }
  }
  return null;
}
