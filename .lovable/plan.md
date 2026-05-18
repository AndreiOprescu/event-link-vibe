## Goal

Turn the existing `/app/event/$eventId/break` mock into a real **15-room break system** with seat-based occupancy, isolated chat, smart room matching, and a split-button entry from the event room.

## 1. Break rooms — 15 purpose-named rooms

Each room name describes what you go there to do. Hardcoded in `src/data/break.ts` (same set for every event). 4 seats each (you + up to 3 others).

```text
room-01  💬 Open Chat            casual room, anything goes
room-02  🧠 Deep Discussion      slow, thoughtful threads
room-03  🚀 Project Showcase     show what you're building
room-04  🤝 Co-founder Match     find a co-founder
room-05  🐛 Debug Together       paste code, get help
room-06  💡 Idea Jam             brainstorm new ideas
room-07  🎨 Design Critique      get feedback on UI/UX
room-08  📣 Pitch Practice       rehearse your pitch
room-09  📚 Learn & Teach        ask/answer "how do I…"
room-10  🔌 API & Tools Talk     LLMs, integrations, stacks
room-11  💸 Funding Chat         investors, grants, runway
room-12  📈 Growth & Users       distribution, marketing
room-13  ☕ Coffee Break         pure small talk, no work
room-14  🧘 Quiet Room           low-volume, focus-friendly
room-15  🌐 Hiring & Gigs        who's hiring / looking
```

Each room's name = its purpose, so a user reads the list and knows what kind of conversation lives there.

## 2. Preset goals (12) for smart matching

Replace freeform `profiles.goal` text with a chosen preset (stored as text key in existing `goal` column, no schema change). Used by the main button to pick a room with people who share your goal.

```text
ship-mvp              🚀 Ship an MVP this weekend
find-cofounder        🧠 Find an AI co-founder
pair-designer         🎨 Pair with a designer
pair-engineer         ⚙️ Pair with an engineer
get-funding           💸 Get funding / find investors
find-users            📈 Find early users
learn-ai-tools        🧪 Learn new AI tools
integrate-llms        🔌 Integrate LLM APIs
build-agents          🤖 Build autonomous agents
practice-demoing      🎙️ Practice demoing
mentor-mentee         🧑‍🏫 Mentor / be mentored
just-vibe             🍕 Just vibe & meet people
```

Exported as `BREAK_GOALS` from `src/data/break.ts`. Onboarding's goal field becomes a `<select>` driven by this list. Existing freeform goals fall back to `just-vibe` for matching.

## 3. Presence + ephemeral chat — Supabase Realtime

No new tables, no migrations.

- **Per-room channel**: `break:{eventId}:{roomId}`
  - Presence payload: `{ profile_id, goal, joined_at, seat_index }`.
  - On enter: subscribe, `track()` self with lowest free seat 0–3, render seats from `presence.sync`.
  - On unmount / leave: `untrack()` + `removeChannel()`.
  - Room full (4 present) → redirect back with toast "Room full — pick another".
  - Chat via `broadcast`: `{ id, profile_id, text, ts }`, kept in local state capped at last 100, dropped on leave. No DB writes.

- **Aggregator channel** `break-index:{eventId}` for the picker: each room participant heartbeats `{ room_id, profile_id, goal }` every 10s. Picker subscribes only while open and computes `{ roomId: { count, goalCounts } }`. Stale entries (>20s) evicted client-side.

## 4. Routing

- New: `src/routes/_app.app.event.$eventId.break.$roomId.tsx` — the actual break room.
- Existing `src/routes/_app.app.event.$eventId.break.tsx` → redirect to the smart-pick room (so old `Too crowded` link still works), falling back to `room-01` if snapshot is empty.
- Top-right of break room: `← Back to the map` → `/app/event/$eventId`.

## 5. Split button in the event room

Replace the current `Too crowded` link with a split control:

```text
┌──────────────────────────┬───┐
│ ☕ Too crowded             │ ▾ │
└──────────────────────────┴───┘
```

- **Main half**: computes best room from the aggregator snapshot:
  1. Filter rooms with `count < 4`.
  2. Sort by `goalCounts[myGoal]` desc, then by `count` desc, then by room order.
  3. Navigate there. If snapshot empty / all full → first room with `count < 4`; if all 15 full → toast "All break rooms are full".
- **Arrow half** (`▾`): `Popover` listing all 15 rooms with emoji + purpose name, live `n/4` seat count (greyed at 4/4), and a small `· same goal` badge when ≥1 occupant shares your goal. Full rooms disabled.

## 6. Break-room screen

Reuses the visual language of current `break.tsx` (round table, seats around it, chat panel at bottom), restyled for **4 seats** and themed per room:

```text
              ┌──────────────────────────┐
              │   ← Back to the map      │
              │   💬 Open Chat · 3/4     │
              └──────────────────────────┘

                       seat 0
                         ⬤
                    ┌─────────┐
            seat 3  │  table  │ seat 1
                ⬤   │   💬    │  ⬤
                    └─────────┘
                         ⬤
                       seat 2

   ┌────────────────────────────────────┐
   │  chat (ephemeral, just this room)  │
   └────────────────────────────────────┘
```

- Empty seats render as dashed circles labelled "open".
- Filled seats show avatar (emoji + color from `profiles`), first name, goal chip. Hover opens the same side profile card pattern as current `break.tsx`.
- Chat panel: identical input UX (Mic / Camera stay as visual placeholders — out of scope per "UI change, keep work in frontend"), but flows through the broadcast channel, not `event_messages`.
- Unmount cleans up presence + channel; "Back to the map" and browser back both clean up.

## 7. Files touched

```text
src/data/break.ts                                     [NEW]  BREAK_ROOMS (15 purpose-named), BREAK_GOALS (12), helpers
src/components/app/BreakRoomPicker.tsx                [NEW]  split-button + popover, uses aggregator channel
src/hooks/useBreakRoomIndex.ts                        [NEW]  subscribes to break-index:{eventId}
src/routes/_app.app.event.$eventId.tsx                edit   swap Coffee Link for <BreakRoomPicker />
src/routes/_app.app.event.$eventId.break.tsx         edit   redirect → smart-pick room
src/routes/_app.app.event.$eventId.break.$roomId.tsx  [NEW]  the actual break room (presence + broadcast chat + 4 seats)
src/routes/onboarding.tsx                             edit   goal input → <select> of BREAK_GOALS
```

No DB migration, no new dependencies — all Supabase Realtime, already wired.

## Out of scope (call out, don't build)

- Persisting break-room chat to DB (explicitly ephemeral per your choice).
- Voice / camera / waveform inside break rooms — icons stay as visual placeholders so the look matches the main event room; full media flow stays scoped to the main event room.
- Anti-abuse / kick / mute controls.
- Cross-event room matching.
- Migrating already-saved freeform goal strings on existing profiles (fall back to `just-vibe`; users can re-pick in onboarding).
