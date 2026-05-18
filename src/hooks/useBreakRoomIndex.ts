import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BreakIndexEntry = {
  profile_id: string;
  goal: string;
  room_id: string;
  ts: number;
};

export type BreakIndex = Record<string, { count: number; goalCounts: Record<string, number>; profiles: string[] }>;

const STALE_MS = 20_000;

/**
 * Subscribes to break-index:{eventId} aggregator channel.
 * Each break-room participant heartbeats their {room_id, profile_id, goal}.
 * Returns a snapshot of {roomId: {count, goalCounts}} computed from live heartbeats.
 *
 * Pass `enabled=false` to skip the subscription (e.g. when popover is closed).
 */
export function useBreakRoomIndex(eventId: string | undefined, enabled: boolean = true): BreakIndex {
  const [index, setIndex] = useState<BreakIndex>({});
  const entriesRef = useRef<Map<string, BreakIndexEntry>>(new Map());

  useEffect(() => {
    if (!enabled || !eventId) {
      entriesRef.current.clear();
      setIndex({});
      return;
    }

    const channel = supabase.channel(`break-index:${eventId}`, {
      config: { broadcast: { self: true } },
    });

    const recompute = () => {
      const now = Date.now();
      const out: BreakIndex = {};
      for (const [, e] of entriesRef.current) {
        if (now - e.ts > STALE_MS) continue;
        if (!out[e.room_id]) out[e.room_id] = { count: 0, goalCounts: {}, profiles: [] };
        if (out[e.room_id].profiles.includes(e.profile_id)) continue;
        out[e.room_id].profiles.push(e.profile_id);
        out[e.room_id].count += 1;
        out[e.room_id].goalCounts[e.goal] = (out[e.room_id].goalCounts[e.goal] ?? 0) + 1;
      }
      setIndex(out);
    };

    channel.on("broadcast", { event: "hb" }, (payload) => {
      const e = payload.payload as BreakIndexEntry;
      if (!e?.profile_id || !e?.room_id) return;
      entriesRef.current.set(e.profile_id, { ...e, ts: Date.now() });
      recompute();
    });

    channel.on("broadcast", { event: "leave" }, (payload) => {
      const e = payload.payload as { profile_id: string };
      if (!e?.profile_id) return;
      entriesRef.current.delete(e.profile_id);
      recompute();
    });

    channel.subscribe();

    const tick = setInterval(recompute, 5_000);

    return () => {
      clearInterval(tick);
      supabase.removeChannel(channel);
      entriesRef.current.clear();
    };
  }, [eventId, enabled]);

  return index;
}

/**
 * Companion: while inside a break room, call this to heartbeat into the aggregator channel.
 */
export function useBreakRoomHeartbeat(args: {
  eventId: string;
  roomId: string;
  profileId: string | undefined;
  goal: string;
}) {
  const { eventId, roomId, profileId, goal } = args;
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase.channel(`break-index:${eventId}`);
    let subbed = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") subbed = true;
    });

    const send = () => {
      if (!subbed) return;
      channel.send({
        type: "broadcast",
        event: "hb",
        payload: { profile_id: profileId, goal, room_id: roomId, ts: Date.now() },
      });
    };

    const i = setInterval(send, 10_000);
    const initial = setTimeout(send, 500);

    return () => {
      clearInterval(i);
      clearTimeout(initial);
      if (subbed) {
        channel.send({
          type: "broadcast",
          event: "leave",
          payload: { profile_id: profileId },
        });
      }
      supabase.removeChannel(channel);
    };
  }, [eventId, roomId, profileId, goal]);
}
