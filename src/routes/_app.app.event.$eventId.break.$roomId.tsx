import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Linkedin, Mail, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { BREAK_GOALS, BREAK_SEATS_PER_ROOM, getRoom, normalizeGoal } from "@/data/break";
import { useBreakRoomHeartbeat } from "@/hooks/useBreakRoomIndex";
import { RoomChat, type Msg } from "@/components/app/RoomChat";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/event/$eventId/break/$roomId")({
  head: () => ({ meta: [{ title: "Break room — EventLabs" }] }),
  component: BreakRoom,
});

type SeatOccupant = {
  profile_id: string;
  goal: string;
  joined_at: number;
  seat_index: number;
};

function goalLabel(id: string) {
  return BREAK_GOALS.find((g) => g.id === id);
}

function BreakRoom() {
  const { eventId, roomId } = Route.useParams();
  const navigate = useNavigate();
  const { profile: me } = useAuth();
  const room = getRoom(roomId);

  const [occupants, setOccupants] = useState<SeatOccupant[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const mySeatRef = useRef<number | null>(null);

  const myGoal = normalizeGoal(me?.goal);

  // Heartbeat into the aggregator so pickers see this room's count.
  useBreakRoomHeartbeat({ eventId, roomId, profileId: me?.id, goal: myGoal });

  // Per-room presence (seat tracking only).
  useEffect(() => {
    if (!me || !room) return;
    let cancelled = false;
    const channel = supabase.channel(`break:${eventId}:${roomId}`, {
      config: { presence: { key: me.id } },
    });

    const pickSeat = (state: Record<string, SeatOccupant[]>): number => {
      const taken = new Set<number>();
      for (const k of Object.keys(state)) {
        for (const m of state[k]) {
          if (typeof m.seat_index === "number") taken.add(m.seat_index);
        }
      }
      for (let i = 0; i < BREAK_SEATS_PER_ROOM; i++) if (!taken.has(i)) return i;
      return -1;
    };

    const syncOccupants = () => {
      const state = channel.presenceState<SeatOccupant>();
      const flat: SeatOccupant[] = [];
      for (const k of Object.keys(state)) {
        for (const m of state[k]) flat.push(m);
      }
      const byProfile = new Map<string, SeatOccupant>();
      for (const o of flat) {
        const prev = byProfile.get(o.profile_id);
        if (!prev || o.joined_at < prev.joined_at) byProfile.set(o.profile_id, o);
      }
      setOccupants(Array.from(byProfile.values()));
    };

    channel.on("presence", { event: "sync" }, syncOccupants);
    channel.on("presence", { event: "join" }, syncOccupants);
    channel.on("presence", { event: "leave" }, syncOccupants);

    channel.subscribe(async (status) => {
      if (cancelled || status !== "SUBSCRIBED") return;
      const state = channel.presenceState<SeatOccupant>();
      const seat = pickSeat(state);
      if (seat === -1) {
        toast.error(`${room.emoji} ${room.name} is full — pick another room.`);
        navigate({ to: "/app/event/$eventId", params: { eventId } });
        return;
      }
      mySeatRef.current = seat;
      await channel.track({
        profile_id: me.id,
        goal: myGoal,
        joined_at: Date.now(),
        seat_index: seat,
      } satisfies SeatOccupant);
    });

    return () => {
      cancelled = true;
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [eventId, roomId, me, myGoal, room, navigate]);

  // Per-room message fetch + realtime, scoped to room_id.
  useEffect(() => {
    supabase
      .from("event_messages")
      .select("*")
      .eq("event_id", eventId)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as unknown as Msg[]);
      });
  }, [eventId, roomId]);

  useEffect(() => {
    const ch = supabase
      .channel(`event-${eventId}-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as unknown as Msg;
          if (row.room_id !== roomId) return;
          setMessages((m) => [...m, row]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, roomId]);

  // Fetch profile rows for any occupants OR message authors we don't have yet.
  useEffect(() => {
    const needed = new Set<string>();
    occupants.forEach((o) => needed.add(o.profile_id));
    messages.forEach((m) => needed.add(m.profile_id));
    if (me) needed.delete(me.id);
    const missing = [...needed].filter((id) => !profilesMap[id]);
    if (missing.length === 0) return;
    supabase
      .from("profiles")
      .select("*")
      .in("id", missing)
      .then(({ data }) => {
        if (!data) return;
        setProfilesMap((cur) => {
          const next = { ...cur };
          for (const p of data as Profile[]) next[p.id] = p;
          return next;
        });
      });
  }, [occupants, messages, profilesMap, me]);

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    Object.values(profilesMap).forEach((p) => map.set(p.id, p));
    if (me) map.set(me.id, me);
    return map;
  }, [profilesMap, me]);

  // Build seat array (4 slots, undefined when empty).
  const seats = useMemo(() => {
    const arr: (SeatOccupant | undefined)[] = Array(BREAK_SEATS_PER_ROOM).fill(undefined);
    for (const o of occupants) {
      if (o.seat_index >= 0 && o.seat_index < BREAK_SEATS_PER_ROOM) arr[o.seat_index] = o;
    }
    return arr;
  }, [occupants]);

  if (!room) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Unknown break room.</p>
          <Link
            to="/app/event/$eventId"
            params={{ eventId }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the map
          </Link>
        </div>
      </div>
    );
  }

  const selectedOcc = selected ? occupants.find((o) => o.profile_id === selected) : null;
  const selectedProfile = selectedOcc ? profilesMap[selectedOcc.profile_id] : null;
  const occupiedCount = occupants.length;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-2 text-xs font-medium text-lime">
          <span className="text-base leading-none">{room.emoji}</span>
          {room.name} · {occupiedCount}/{BREAK_SEATS_PER_ROOM}
        </div>
        <div className="hidden text-xs text-muted-foreground sm:block">{room.blurb}</div>
        <Link
          to="/app/event/$eventId"
          params={{ eventId }}
          className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.02]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the map
        </Link>
      </div>

      {/* Round table with 4 seats */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[68vmin] w-[68vmin] max-h-[560px] max-w-[560px]">
          {/* Table */}
          <div className="absolute inset-[22%] rounded-full border border-border bg-surface shadow-card">
            <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full border border-dashed border-border/60 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Break · {room.id}
              </div>
              <div className="mt-2 text-5xl">{room.emoji}</div>
              <div className="mt-2 font-display text-xl font-semibold text-lime">{room.name}</div>
              <div className="mt-1 max-w-[70%] text-xs text-muted-foreground">{room.blurb}</div>
            </div>
          </div>

          {/* 4 seats around the table */}
          {seats.map((occ, i) => {
            const angle = (i / BREAK_SEATS_PER_ROOM) * Math.PI * 2 - Math.PI / 2;
            const r = 44;
            const cx = 50 + Math.cos(angle) * r;
            const cy = 50 + Math.sin(angle) * r;
            if (!occ) {
              return (
                <div
                  key={`empty-${i}`}
                  className="absolute"
                  style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                    open
                  </div>
                </div>
              );
            }
            const p = profilesMap[occ.profile_id] ?? (me && occ.profile_id === me.id ? me : undefined);
            const isMe = me && occ.profile_id === me.id;
            const goal = goalLabel(occ.goal);
            return (
              <div
                key={occ.profile_id}
                className="absolute"
                style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setSelected(occ.profile_id)}
                    onMouseEnter={() => setSelected(occ.profile_id)}
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-card transition hover:scale-110 ${
                      isMe ? "ring-4 ring-lime ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{ backgroundColor: p?.color ?? "#A3E635" }}
                  >
                    {p?.emoji ?? "👤"}
                  </button>
                  <div className="mt-1 text-center text-[10px] font-medium text-muted-foreground">
                    {isMe ? "you" : p?.display_name?.split(" ")[0] ?? "guest"}
                  </div>
                  {goal && (
                    <div className="mt-0.5 max-w-[7rem] truncate rounded-full bg-surface px-2 py-0.5 text-[9px] text-muted-foreground">
                      {goal.emoji} {goal.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open chat FAB — same as main map */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="absolute bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.03]"
        >
          <MessageCircle className="h-4 w-4" />
          Room chat
        </button>
      )}

      {/* Side profile */}
      {selected && selectedProfile && selectedProfile.id !== me?.id && !chatOpen && (
        <div className="absolute right-4 top-20 z-40 w-72 rounded-2xl border border-border bg-popover p-5 shadow-card">
          <button onClick={() => setSelected(null)} className="absolute right-3 top-3 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
              style={{ backgroundColor: selectedProfile.color }}
            >
              {selectedProfile.emoji}
            </div>
            <div>
              <div className="font-display text-base font-semibold">{selectedProfile.display_name}</div>
              <div className="text-xs text-muted-foreground">
                {selectedProfile.role}
                {selectedProfile.company ? ` · ${selectedProfile.company}` : ""}
              </div>
            </div>
          </div>
          {selectedOcc && goalLabel(selectedOcc.goal) && (
            <div className="mt-4 rounded-xl border border-lime/30 bg-lime/5 p-3 text-xs">
              <div className="font-mono uppercase tracking-widest text-lime">Goal</div>
              <div className="mt-1 text-foreground">
                {goalLabel(selectedOcc.goal)!.emoji} {goalLabel(selectedOcc.goal)!.label}
              </div>
            </div>
          )}
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {selectedProfile.linkedin && (
              <div className="flex items-center gap-2">
                <Linkedin className="h-3 w-3" /> {selectedProfile.linkedin}
              </div>
            )}
            {selectedProfile.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" /> {selectedProfile.email}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Persisted, per-room chat panel with replies + voice + image + video */}
      {chatOpen && (
        <RoomChat
          eventId={eventId}
          roomId={roomId}
          messages={messages}
          profileById={profileById}
          me={me}
          focusDiscussionId={null}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
