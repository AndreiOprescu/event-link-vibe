import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarBubble } from "@/components/app/AvatarBubble";
import {
  ArrowLeft, Coffee, Mail, Linkedin, Send, MessageCircle, X, CornerDownRight, Globe2,
  Mic, Camera, Play, Pause, Square, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/app/event/$eventId")({
  head: () => ({ meta: [{ title: "Event room — EventLabs" }] }),
  component: EventRoom,
});

type Position = { x: number; y: number };
type MsgKind = "discussion" | "reply" | "global";
type MediaType = "text" | "audio" | "image" | "video";
type Msg = {
  id: string;
  event_id: string;
  profile_id: string;
  text: string | null;
  created_at: string;
  kind: MsgKind;
  parent_id: string | null;
  media_type: MediaType;
  media_url: string | null;
  media_duration_seconds: number | null;
  waveform_peaks: number[] | null;
};

type EventRow = {
  id: string; code: string; title: string; host: string; date_label: string; status: string; color: string; attendees: number;
};

function firstName(name: string) {
  return name.split(" ")[0];
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mediaLabel(m: Msg): string {
  if (m.media_type === "audio") return `🎤 Voice · ${formatDuration(m.media_duration_seconds || 0)}`;
  if (m.media_type === "image") return m.text ? `📷 Photo · ${m.text.slice(0, 30)}` : "📷 Photo";
  if (m.media_type === "video") {
    const len = m.media_duration_seconds ? ` · ${formatDuration(m.media_duration_seconds)}` : "";
    return m.text ? `🎬 Video${len} · ${m.text.slice(0, 24)}` : `🎬 Video${len}`;
  }
  return m.text || "";
}

async function computeWaveformPeaks(blob: Blob, buckets = 64): Promise<number[] | null> {
  try {
    const buf = await blob.arrayBuffer();
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AC();
    const audioBuf = await ctx.decodeAudioData(buf.slice(0));
    const data = audioBuf.getChannelData(0);
    const bucketSize = Math.max(1, Math.floor(data.length / buckets));
    const peaks: number[] = [];
    for (let i = 0; i < buckets; i++) {
      let max = 0;
      const start = i * bucketSize;
      const end = Math.min(data.length, start + bucketSize);
      for (let j = start; j < end; j++) {
        const v = Math.abs(data[j]);
        if (v > max) max = v;
      }
      peaks.push(Number(max.toFixed(3)));
    }
    ctx.close().catch(() => {});
    return peaks;
  } catch (e) {
    console.warn("waveform decode failed", e);
    return null;
  }
}

async function uploadEventMedia(eventId: string, profileId: string, blob: Blob, ext: string): Promise<string | null> {
  const id = crypto.randomUUID();
  const path = `${eventId}/${profileId}/${id}.${ext}`;
  const { error } = await supabase.storage.from("event-media").upload(path, blob, {
    contentType: blob.type || undefined,
    upsert: false,
  });
  if (error) { console.error("upload error", error); return null; }
  const { data } = supabase.storage.from("event-media").getPublicUrl(path);
  return data.publicUrl;
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
      setMessages((data ?? []) as unknown as Msg[]);
    });
  }, [eventId]);

  useEffect(() => {
    const ch = supabase
      .channel(`event-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` }, (payload) => {
        setMessages((m) => [...m, payload.new as unknown as Msg]);
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
                    {mediaLabel(disc)}
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
                  <div className="truncate" style={{ fontSize: Math.min(14, 11 + count * 0.3) }}>{mediaLabel(disc)}</div>
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
  parentId: string | null;
  authorName: string;
  snippet: string;
} | null;

type PendingMedia = {
  blob: Blob;
  url: string;
  type: "audio" | "image" | "video";
  durationSec?: number;
  peaks?: number[] | null;
};

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
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const discussionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const voice = useVoiceRecorder();

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
    if (!me || sending) return;
    const text = draft.trim();
    if (!text && !pending) return;
    setSending(true);
    let media_url: string | null = null;
    let media_type: MediaType = "text";
    let media_duration_seconds: number | null = null;
    let waveform_peaks: number[] | null = null;
    if (pending) {
      const ext = pending.type === "audio" ? "webm" : pending.type === "image" ? "jpg" : "webm";
      media_url = await uploadEventMedia(eventId, me.id, pending.blob, ext);
      if (!media_url) { setSending(false); setPermError("Upload failed"); return; }
      media_type = pending.type;
      media_duration_seconds = pending.durationSec ?? null;
      waveform_peaks = pending.peaks ?? null;
    }
    const parent_id = kind === "reply" ? replyTo?.parentId ?? null : null;
    const { error } = await supabase.from("event_messages").insert({
      event_id: eventId,
      profile_id: me.id,
      text: text || null,
      kind,
      parent_id,
      media_type,
      media_url,
      media_duration_seconds,
      waveform_peaks: waveform_peaks as unknown as never,
    });
    if (error) console.error(error);
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    setDraft("");
    setReplyTo(null);
    setSending(false);
    requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const startReply = (m: Msg) => {
    const author = profileById.get(m.profile_id);
    if (!author) return;
    const name = firstName(author.display_name);
    const snippet = mediaLabel(m);
    const target: ReplyTarget =
      m.kind === "discussion"
        ? { id: m.id, kind: "reply", parentId: m.id, authorName: name, snippet }
        : m.kind === "reply"
          ? { id: m.id, kind: "reply", parentId: m.parent_id, authorName: name, snippet }
          : { id: m.id, kind: "global", parentId: null, authorName: name, snippet };
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
    if (replyTo) send(replyTo.kind);
    else send("global");
  };

  const startVoice = async () => {
    setPermError(null);
    const ok = await voice.start();
    if (!ok) setPermError("Microphone access needed for voice messages");
  };

  const stopVoice = async () => {
    const result = await voice.stop();
    if (!result) return;
    const peaks = await computeWaveformPeaks(result.blob);
    const url = URL.createObjectURL(result.blob);
    setPending({
      blob: result.blob,
      url,
      type: "audio",
      durationSec: Math.max(1, Math.round(result.durationMs / 1000)),
      peaks,
    });
  };

  const cancelVoice = () => voice.cancel();

  const clearPending = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const onCameraCapture = (file: { blob: Blob; type: "image" | "video"; durationSec?: number }) => {
    const url = URL.createObjectURL(file.blob);
    setPending({ blob: file.blob, url, type: file.type, durationSec: file.durationSec });
  };

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-background/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-card" onClick={(e) => e.stopPropagation()}>
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
            const replyingToGlobal = (m.text ?? "").startsWith("/@")
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

        <div className="border-t border-border p-3 space-y-2">
          {permError && (
            <div className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] text-red-400">{permError}</div>
          )}
          {replyTo && (
            <div className="flex items-center justify-between rounded-full bg-surface px-3 py-1.5 text-[11px]">
              <span className="text-muted-foreground truncate">
                Replying to <span className="font-semibold text-foreground">{replyTo.authorName}</span>
                {replyTo.kind === "reply" ? " (in discussion)" : " (global)"}
                {replyTo.snippet && <span className="ml-1 italic">— {replyTo.snippet.slice(0, 40)}</span>}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {pending && (
            <div className="rounded-2xl border border-lime/40 bg-background/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {pending.type === "audio" && (
                    <VoiceMessage url={pending.url} peaks={pending.peaks ?? null} duration={pending.durationSec ?? 0} />
                  )}
                  {pending.type === "image" && (
                    <img src={pending.url} alt="preview" className="max-h-32 rounded-lg" />
                  )}
                  {pending.type === "video" && (
                    <video src={pending.url} controls playsInline className="max-h-32 rounded-lg" />
                  )}
                </div>
                <button onClick={clearPending} className="text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {voice.recording ? (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/50 bg-background/60 p-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <LiveWaveform analyser={voice.analyser} />
              <span className="font-mono text-[11px] text-muted-foreground">{formatDuration(voice.elapsed)} / 2:00</span>
              <div className="ml-auto flex gap-1">
                <button onClick={cancelVoice} className="rounded-full bg-surface p-1.5 text-muted-foreground hover:text-red-400" title="Cancel">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button onClick={stopVoice} className="rounded-full bg-lime p-1.5 text-primary-foreground" title="Stop">
                  <Square className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/60 p-1.5">
              <button
                onClick={startVoice}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-lime"
                title="Voice message"
                disabled={!!pending}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setPermError(null); setCameraOpen(true); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-lime"
                title="Photo or video"
                disabled={!!pending}
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder={
                  pending
                    ? (pending.type === "audio" ? "Add a note (optional)…" : "Add a caption (optional)…")
                    : replyTo ? "Write your reply…" : "Discussion or global message…"
                }
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {replyTo ? (
            <button
              onClick={() => send(replyTo.kind)}
              disabled={(!draft.trim() && !pending) || sending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-lime py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Send {replyTo.kind === "reply" ? "reply" : "global reply"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => send("discussion")}
                disabled={(!draft.trim() && !pending) || sending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-lime py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                title="Starts a new thread + bubble above your head"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Discussion
              </button>
              <button
                onClick={() => send("global")}
                disabled={(!draft.trim() && !pending) || sending}
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

      {cameraOpen && (
        <CameraSheet
          onCapture={onCameraCapture}
          onClose={() => setCameraOpen(false)}
          onPermError={() => setPermError("Camera access needed for photo & video")}
        />
      )}
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
          <MessageBody m={m} />
        </div>
        <button onClick={onReply} className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-lime">
          <CornerDownRight className="h-3 w-3" /> Reply
        </button>
      </div>
    </div>
  );
}

function MessageBody({ m }: { m: Msg }) {
  if (m.media_type === "audio" && m.media_url) {
    return <VoiceMessage url={m.media_url} peaks={m.waveform_peaks ?? null} duration={m.media_duration_seconds ?? 0} />;
  }
  if (m.media_type === "image" && m.media_url) {
    return (
      <div>
        <ImageWithLightbox src={m.media_url} />
        {m.text && (
          <div className="mt-1 text-xs italic text-muted-foreground">
            {renderTextWithMention(m.text)}
          </div>
        )}
      </div>
    );
  }
  if (m.media_type === "video" && m.media_url) {
    return (
      <div>
        <video src={m.media_url} controls playsInline className="max-h-60 max-w-full rounded-lg" />
        {m.text && (
          <div className="mt-1 text-xs italic text-muted-foreground">
            {renderTextWithMention(m.text)}
          </div>
        )}
      </div>
    );
  }
  return <>{renderTextWithMention(m.text ?? "")}</>;
}

function ImageWithLightbox({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt=""
        loading="lazy"
        onClick={() => setOpen(true)}
        className="max-h-60 max-w-full cursor-zoom-in rounded-lg"
      />
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-6"
          onClick={() => setOpen(false)}
        >
          <img src={src} alt="" className="max-h-full max-w-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
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
  const text = m.text ?? "";
  const match = text.match(/^\/@(\S+)\s+/);
  if (!match) return null;
  const targetName = match[1].toLowerCase();
  for (let i = feed.length - 1; i >= 0; i--) {
    const candidate = feed[i];
    if (candidate.id === m.id) continue;
    if (new Date(candidate.created_at) >= new Date(m.created_at)) continue;
    if (candidate.kind !== "global") continue;
    const author = profileById.get(candidate.profile_id);
    if (!author) continue;
    if (firstName(author.display_name).toLowerCase() === targetName) {
      const label = mediaLabel(candidate);
      return label.length > 60 ? label.slice(0, 60) + "…" : label;
    }
  }
  return null;
}

/* ------------------------- Voice recorder hook ------------------------- */

function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const resolveRef = useRef<((b: { blob: Blob; durationMs: number } | null) => void) | null>(null);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setAnalyser(null);
    setRecording(false);
  };

  const stop = (): Promise<{ blob: Blob; durationMs: number } | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") { resolve(null); return; }
      resolveRef.current = resolve;
      try { rec.stop(); } catch { resolve(null); cleanup(); }
    });
  };

  const start = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      setAnalyser(an);
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const durationMs = Date.now() - startTimeRef.current;
        const r = resolveRef.current;
        resolveRef.current = null;
        cleanup();
        r?.({ blob, durationMs });
      };
      startTimeRef.current = Date.now();
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - startTimeRef.current;
        setElapsed(Math.floor(ms / 1000));
        if (ms >= 120000) stop();
      }, 200);
      return true;
    } catch (e) {
      console.warn("mic permission denied", e);
      cleanup();
      return false;
    }
  };

  const cancel = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.onstop = null as unknown as (() => void);
        rec.stop();
      } catch { /* noop */ }
    }
    resolveRef.current = null;
    cleanup();
  };

  return { recording, elapsed, analyser, start, stop, cancel };
}

/* --------------------------- Live waveform --------------------------- */

function LiveWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(buf);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 32;
      const step = Math.floor(buf.length / bars);
      const bw = w / bars;
      ctx.fillStyle = "#a3e635";
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += Math.abs(buf[i * step + j] - 128);
        const v = sum / step / 128;
        const bh = Math.max(2, v * h);
        ctx.fillRect(i * bw + bw * 0.2, (h - bh) / 2, bw * 0.6, bh);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);
  return <canvas ref={canvasRef} width={160} height={28} className="h-7" />;
}

/* ------------------------- Voice playback ------------------------- */

function VoiceMessage({ url, peaks, duration }: { url: string; peaks: number[] | null; duration: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || duration || 1));
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, [duration]);

  useEffect(() => {
    if (!peaks) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const bw = w / peaks.length;
    const playedIdx = Math.floor(progress * peaks.length);
    peaks.forEach((v, i) => {
      const bh = Math.max(2, v * h);
      ctx.fillStyle = i <= playedIdx ? "#a3e635" : "#5a5a5a";
      ctx.fillRect(i * bw + bw * 0.15, (h - bh) / 2, bw * 0.7, bh);
    });
  }, [peaks, progress]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  if (!peaks) {
    return (
      <div className="flex items-center gap-2">
        <audio controls src={url} className="h-8 max-w-full" />
        <span className="font-mono text-[10px] text-muted-foreground">{formatDuration(duration)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime text-primary-foreground"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <canvas ref={canvasRef} width={180} height={28} className="h-7" />
      <span className="font-mono text-[10px] text-muted-foreground">{formatDuration(duration)}</span>
      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  );
}

/* --------------------------- Camera sheet --------------------------- */

function CameraSheet({
  onCapture, onClose, onPermError,
}: {
  onCapture: (file: { blob: Blob; type: "image" | "video"; durationSec?: number }) => void;
  onClose: () => void;
  onPermError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [preview, setPreview] = useState<{ url: string; blob: Blob; type: "image" | "video"; durationSec?: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (preview) return;
    let active = true;
    (async () => {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: mode === "video",
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setError(null);
      } catch {
        setError("Camera access needed");
        onPermError();
      }
    })();
    return () => { active = false; stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, preview]);

  useEffect(() => () => stopStream(), []);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreview({ url, blob, type: "image" });
      stopStream();
    }, "image/jpeg", 0.85);
  };

  const startVideo = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      const durationSec = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
      const url = URL.createObjectURL(blob);
      setPreview({ url, blob, type: "video", durationSec });
      setRecording(false);
      stopStream();
    };
    recStartRef.current = Date.now();
    rec.start();
    setRecording(true);
    setRecElapsed(0);
  };

  const stopVideo = () => { recorderRef.current?.stop(); };

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const s = Math.floor((Date.now() - recStartRef.current) / 1000);
      setRecElapsed(s);
      if (s >= 15) stopVideo();
    }, 200);
    return () => window.clearInterval(id);
  }, [recording]);

  const use = () => {
    if (!preview) return;
    onCapture({ blob: preview.blob, type: preview.type, durationSec: preview.durationSec });
    onClose();
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-black text-white" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-3">
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-xs">Close</button>
        {!preview && (
          <div className="flex gap-1 rounded-full bg-white/10 p-1 text-xs">
            <button onClick={() => setMode("photo")} className={`rounded-full px-3 py-1 ${mode === "photo" ? "bg-lime text-primary-foreground" : ""}`}>Photo</button>
            <button onClick={() => setMode("video")} className={`rounded-full px-3 py-1 ${mode === "video" ? "bg-lime text-primary-foreground" : ""}`}>Video</button>
          </div>
        )}
        <div className="w-12" />
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {error && <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-red-300">{error}</div>}
        {!preview && (
          <video ref={videoRef} playsInline muted className="max-h-full max-w-full" />
        )}
        {preview?.type === "image" && (
          <img src={preview.url} alt="capture" className="max-h-full max-w-full" />
        )}
        {preview?.type === "video" && (
          <video src={preview.url} controls playsInline className="max-h-full max-w-full" />
        )}
        {recording && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            REC {recElapsed}s / 15s
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 p-4">
        {preview ? (
          <>
            <button onClick={retake} className="rounded-full bg-white/10 px-4 py-2 text-xs">Retake</button>
            <button onClick={use} className="rounded-full bg-lime px-6 py-2 text-sm font-semibold text-primary-foreground">Use</button>
          </>
        ) : mode === "photo" ? (
          <button
            onClick={snap}
            disabled={!!error}
            className="h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-30"
            aria-label="Take photo"
          />
        ) : (
          <button
            onClick={recording ? stopVideo : startVideo}
            disabled={!!error}
            className={`h-16 w-16 rounded-full border-4 border-white disabled:opacity-30 ${recording ? "bg-red-500" : "bg-red-500/60"}`}
            aria-label={recording ? "Stop recording" : "Start recording"}
          />
        )}
      </div>
    </div>
  );
}
