import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AvatarBubble } from "@/components/app/AvatarBubble";
import { ArrowLeft, Mail, Linkedin, MessageCircle, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
// TODO: re-enable break rooms
// import { BreakRoomPicker } from "@/components/app/BreakRoomPicker";
import { RoomChat, mediaLabel, type Msg } from "@/components/app/RoomChat";
import { DirectChat } from "@/components/app/DirectChat";
import { ChatSwitcher, type ChatTarget, type ChatSwitcherItems } from "@/components/app/ChatSwitcher";
import { EventIntakeModal } from "@/components/app/EventIntakeModal";
import { VideoIntroModal, VideoIntroRecorder } from "@/components/app/VideoIntro";
import { getInitials } from "@/lib/initials";

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
  const { profile: me, user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [demoProfiles, setDemoProfiles] = useState<Profile[]>([]);
  const [presentProfiles, setPresentProfiles] = useState<Profile[]>([]);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatTarget>({ kind: "room" });
  const [focusDiscussionId, setFocusDiscussionId] = useState<string | null>(null);

  // DM bookkeeping
  type DMRow = { id: string; event_id: string; sender_profile_id: string; recipient_profile_id: string; text: string | null; created_at: string };
  const [dmRows, setDmRows] = useState<DMRow[]>([]);
  const [reads, setReads] = useState<{ room: string | null; dm: Map<string, string> }>({ room: null, dm: new Map() });

  // Per-event membership: drives the intake modal + video prompt
  type Member = { user_id: string; event_id: string; goal: string; intro: string; intro_video_url: string | null; intro_duration_seconds: number | null };
  const [members, setMembers] = useState<Map<string, Member>>(new Map());
  const [memberLoaded, setMemberLoaded] = useState(false);
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  

  const myMember = user ? members.get(user.id) ?? null : null;
  const needsIntake = memberLoaded && !!user && !myMember;

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data as EventRow | null));
    supabase.from("profiles").select("*").eq("is_demo", true).then(({ data }) => setDemoProfiles((data ?? []) as Profile[]));
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

  // Load event_members (used both to know if I need intake, and to show others' intro videos)
  const loadMembers = (uid?: string) => {
    supabase
      .from("event_members")
      .select("user_id,event_id,goal,intro,intro_video_url,intro_duration_seconds")
      .eq("event_id", eventId)
      .then(({ data }) => {
        const m = new Map<string, Member>();
        (data ?? []).forEach((row: any) => m.set(row.user_id, row as Member));
        setMembers(m);
        if (uid !== undefined) setMemberLoaded(true);
      });
  };
  useEffect(() => {
    if (!user) return;
    loadMembers(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, user?.id]);

  // Realtime: new chat messages
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

  // Realtime presence: track who is currently in this event
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel(`event-${eventId}-presence`, {
      config: { presence: { key: me.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setPresentIds(Object.keys(state));
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ profile_id: me.id, online_at: new Date().toISOString() });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [eventId, me?.id]);

  // Fetch profile rows for present users (other than me)
  useEffect(() => {
    const others = presentIds.filter((id) => id && id !== me?.id);
    if (others.length === 0) { setPresentProfiles([]); return; }
    supabase.from("profiles").select("*").in("id", others).then(({ data }) => {
      setPresentProfiles((data ?? []) as Profile[]);
    });
  }, [presentIds.join("|"), me?.id]);

  // Merge everyone we need to render: demo + present users + me. Dedup by id.
  const allPeople = useMemo<Profile[]>(() => {
    const map = new Map<string, Profile>();
    demoProfiles.forEach((p) => map.set(p.id, p));
    presentProfiles.forEach((p) => map.set(p.id, p));
    if (me) map.set(me.id, me);
    return Array.from(map.values());
  }, [demoProfiles, presentProfiles, me]);

  // Cluster people into small groups around fixed seating areas — like a real room.
  const positions = useMemo<Record<string, Position>>(() => {
    const centers = [
      { x: 22, y: 30 },
      { x: 50, y: 24 },
      { x: 78, y: 32 },
      { x: 26, y: 66 },
      { x: 56, y: 74 },
      { x: 80, y: 60 },
      { x: 38, y: 48 },
      { x: 68, y: 50 },
    ];
    // Stable order: keep me anchored to a center, fill clusters left-to-right.
    const ordered = [...allPeople].sort((a, b) => {
      if (me && a.id === me.id) return -1;
      if (me && b.id === me.id) return 1;
      return a.id.localeCompare(b.id);
    });
    const groups: string[][] = centers.map(() => []);
    ordered.forEach((p, i) => {
      const c = Math.floor(i / 3) % centers.length;
      groups[c].push(p.id);
    });
    const out: Record<string, Position> = {};
    groups.forEach((ids, ci) => {
      const center = centers[ci];
      const n = ids.length;
      const radius = n <= 1 ? 0 : n === 2 ? 7 : 9;
      const startAngle = ci * 1.1;
      ids.forEach((id, k) => {
        if (n === 1) {
          out[id] = { x: center.x, y: center.y };
          return;
        }
        const angle = startAngle + (k / n) * Math.PI * 2;
        out[id] = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius * 0.65,
        };
      });
    });
    return out;
  }, [allPeople, me]);

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    allPeople.forEach((p) => m.set(p.id, p));
    return m;
  }, [allPeople]);

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
              {allPeople.length}
            </span>
          </div>
        )}
        <div />
      </div>

      {/* Room floor */}
      <div className="tile-floor absolute inset-0">
        {allPeople.map((a) => {
          const p = positions[a.id];
          if (!p) return null;
          const isMe = me?.id === a.id;
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
              onMouseEnter={() => !isMe && setHover(a.id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="drift" style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}>
                {disc && (
                  <button
                    onClick={() => openThread(disc.id)}
                    className={`absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full rounded-2xl border px-3 py-1.5 text-xs transition hover:scale-105 ${
                      isMe ? "border-lime/50 bg-popover shadow-glow" : "border-border bg-popover shadow-card hover:border-lime"
                    }`}
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
                <div className={isMe ? "bubble-halo rounded-full ring-4 ring-lime ring-offset-2 ring-offset-background" : "bubble-halo"}>
                  <AvatarBubble
                    user={{ id: a.id, name: a.display_name, color: a.color, avatar_url: a.avatar_url }}
                    size={isMe ? 64 : 56}
                    label={!isMe}
                    onClick={() => setSelected(a.id)}
                  />
                </div>
                {isMe && me && (
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    <span className="max-w-[100px] truncate text-[11px] font-semibold text-foreground">{me.display_name}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-lime">you</span>
                  </div>
                )}
                {!isMe && hover === a.id && <HoverCard p={a} />}
              </div>
            </div>
          );
        })}
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
        <ProfileDrawer
          p={selectedUser}
          member={members.get(selectedUser.id) ?? null}
          isMe={!!me && selectedUser.id === me.id}
          onClose={() => setSelected(null)}
          onChat={() => { setFocusDiscussionId(null); setChatOpen(true); }}
          onRecord={() => { setSelected(null); setRecorderOpen(true); }}
        />
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

      {/* First-time intake modal — required to enter */}
      {needsIntake && user && event && (
        <EventIntakeModal
          eventId={eventId}
          eventTitle={event.title}
          userId={user.id}
          onComplete={() => {
            loadMembers(user.id);
            setShowVideoPrompt(true);
          }}
        />
      )}

      {/* First-time video intro popup (after intake) */}
      {showVideoPrompt && !recorderOpen && (
        <VideoIntroModal
          onRecord={() => { setShowVideoPrompt(false); setRecorderOpen(true); }}
          onSkip={() => setShowVideoPrompt(false)}
        />
      )}

      {recorderOpen && user && (
        <VideoIntroRecorder
          eventId={eventId}
          userId={user.id}
          onClose={() => setRecorderOpen(false)}
          onSaved={() => { setRecorderOpen(false); loadMembers(user.id); }}
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

type DrawerMember = { intro_video_url: string | null; intro: string | null } | null;

function ProfileDrawer({
  p,
  member,
  isMe,
  onClose,
  onChat,
  onRecord,
}: {
  p: Profile;
  member: DrawerMember;
  isMe: boolean;
  onClose: () => void;
  onChat: () => void;
  onRecord: () => void;
}) {
  const videoUrl = member?.intro_video_url ?? null;
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="m-4 w-full max-w-xl rounded-3xl border border-border bg-popover p-6 shadow-card sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-col items-center text-center">
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt={p.display_name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full font-semibold"
              style={{ backgroundColor: p.color, color: "#0a0a0a", fontSize: 26 }}
            >
              {getInitials(p.display_name)}
            </div>
          )}
          <div className="mt-3 font-display text-2xl font-semibold">{p.display_name}</div>
          {(p.role || p.company) && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {[p.role, p.company].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        {videoUrl ? (
          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-lime">
              {isMe ? "Your intro" : "Video intro"}
            </div>
            <video
              key={videoUrl}
              src={videoUrl}
              autoPlay
              controls
              playsInline
              preload="metadata"
              className="mt-2 aspect-video w-full rounded-2xl bg-black"
            />
            {isMe && (
              <button
                onClick={onRecord}
                className="mt-3 w-full rounded-full border border-border bg-background px-4 py-2 text-xs text-foreground hover:bg-surface"
              >
                Record a new intro
              </button>
            )}
          </div>
        ) : isMe ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/40 p-5 text-center">
            <div className="font-display text-sm font-semibold">No intro video yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Record a short clip so people in the room know who you are.
            </p>
            <button
              onClick={onRecord}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <Play className="h-3.5 w-3.5" /> Record intro
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-background/40 p-3 text-center text-[11px] text-muted-foreground">
            No intro video yet.
          </div>
        )}

        {p.goal && (
          <div className="mt-5 rounded-xl border border-lime/30 bg-lime/5 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Their goal</div>
            <div className="mt-1 text-sm">{p.goal}</div>
          </div>
        )}
        {member?.intro && !isMe && (
          <div className="mt-3 rounded-xl border border-border bg-background/40 p-3 text-sm text-muted-foreground">
            {member.intro}
          </div>
        )}
        <div className="mt-4 space-y-2 text-sm">
          {p.linkedin && <div className="flex items-center gap-2 text-muted-foreground"><Linkedin className="h-3.5 w-3.5" /> {p.linkedin}</div>}
          {p.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {p.email}</div>}
        </div>
        {!isMe && (
          <button onClick={onChat} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            <MessageCircle className="h-4 w-4" /> Open room chat
          </button>
        )}
      </div>
    </div>
  );
}
