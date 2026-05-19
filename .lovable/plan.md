## Goal

Keep the existing round-table-with-4-seats layout in the break room, but upgrade the chat to full parity with the main event (persisted via `event_messages`, scoped per room, with replies and voice/image/video). The split-button entry already routes correctly.

## 1. Schema — add `room_id` to `event_messages`

Single migration. Nullable text column; `NULL` = main map (every existing row stays on the main map).

```sql
ALTER TABLE public.event_messages
  ADD COLUMN room_id TEXT NULL;

CREATE INDEX event_messages_event_room_idx
  ON public.event_messages (event_id, room_id, created_at);
```

No RLS change needed — existing `select true` / `insert own profile` policies already cover the new column.

## 2. Extract `RoomChat` into a shared component

Pull the existing `RoomChat` + media helpers (`uploadEventMedia`, `computeWaveformPeaks`, `useVoiceRecorder`) out of `src/routes/_app.app.event.$eventId.tsx` into:

```text
src/components/app/RoomChat.tsx        [NEW]  the chat panel + media + replies
src/lib/event-media.ts                 [NEW]  upload + waveform helpers
```

`RoomChat` gains a `roomId: string | null` prop:
- Initial fetch: `.eq("event_id", eventId).eq("room_id", roomId)` (use `.is("room_id", null)` when `roomId === null`).
- Realtime: subscribe to `event-${eventId}-${roomId ?? "main"}` and filter inserts by `room_id`.
- Inserts include `room_id: roomId` in the payload.

Main map route swaps its inline `<RoomChat …/>` for `<RoomChat eventId={eventId} roomId={null} … />`. Behaviour on the main map is unchanged.

## 3. Break-room route — keep the table, upgrade the chat

`src/routes/_app.app.event.$eventId.break.$roomId.tsx`:

- **Keep**: round table in the center, 4 seats around it, presence-driven seat assignment (`pickSeat` lowest-free 0–3), full-room redirect + toast, heartbeat into the aggregator, hover/side profile card.
- **Replace** the bottom ephemeral chat input with `<RoomChat eventId={eventId} roomId={roomId} … />`. Same component, same Mic / Camera / Image / reply UI as the main map.
- Remove the ephemeral `ChatMsg` state, `broadcast`-based `msg` events, and the local `<input>` chat box. Presence channel stays for seat tracking only.
- Top bar unchanged (`← Back to the map`, `{emoji} {name} · n/4`, blurb).

```text
              ┌──────────────────────────┐
              │  ← Back to the map       │
              │  💬 Open Chat · 3/4      │
              └──────────────────────────┘

                       seat 0
                         ⬤
                    ┌─────────┐
            seat 3  │  table  │ seat 1
                ⬤   │   💬    │  ⬤
                    └─────────┘
                         ⬤
                       seat 2

           [ 💬 Room chat ]  ← FAB opens shared RoomChat
```

Chat opens as the same panel as the main map (replies, voice, image, video, waveform), but messages are filtered to `room_id = roomId` and only visible inside this break room.

## 4. Files touched

```text
supabase/migrations/<ts>_event_messages_room_id.sql              [NEW]  ALTER TABLE + index
src/lib/event-media.ts                                           [NEW]  uploadEventMedia + computeWaveformPeaks (moved)
src/components/app/RoomChat.tsx                                  [NEW]  extracted chat panel, takes roomId prop
src/routes/_app.app.event.$eventId.tsx                           edit   use shared <RoomChat roomId={null}/>
src/routes/_app.app.event.$eventId.break.$roomId.tsx             edit   keep table+seats, mount <RoomChat roomId={roomId}/>
```

`BreakRoomPicker`, `useBreakRoomIndex`, `useBreakRoomHeartbeat`, the smart-pick redirect, and `src/data/break.ts` stay untouched.

## Out of scope

- Migrating existing rows into break rooms (all existing messages stay `room_id = NULL` → main map).
- Drifting avatars / discussion bubbles in the break room (seats stay fixed at the table).
- Showing per-room message counts in the picker (still `n/4` seats).
- Anti-abuse / kick / mute.
