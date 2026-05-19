## What you'll get

- Tap any other person's bubble → their profile drawer shows a primary button **"Start a conversation with {first name}!"** (replacing today's "Open room chat").
- That opens a private 1-on-1 chat with that person, scoped to this event. Messages are saved and reappear next time.
- The chat panel header becomes a **dropdown** listing **Room chat** + every private chat you have in this event, each with the person's avatar and an unread count.
- A small **notification dot** appears on the floating "Room chat" button on the event screen whenever you have unread messages — either in the room or in any of your private chats. The dot in the dropdown also marks which specific conversation is unread.

## How it works

```text
Bubble tap → Profile drawer
              └─ "Start a conversation with Alex!"  ──► DM panel with Alex
                                                         └─ Header dropdown:
                                                              • Room chat      (• unread)
                                                              • Alex           (active)
                                                              • Priya          (• 2)
                                                              • Marco
```

## Scope

- Direct chats are **per event** (same person in two events = two separate chats), text only for v1 (matches the brief; voice/photo/video can be added later).
- Conversations and unread state persist across reloads and devices for the signed-in user.
- No changes to bubbles, intros, intake, or the room-chat composer behaviour.

## Technical details

1. **New table `direct_messages`** in Lovable Cloud
   - Columns: `id`, `event_id`, `sender_profile_id`, `recipient_profile_id`, `text`, `created_at`.
   - Indexes on `(event_id, sender_profile_id, recipient_profile_id, created_at)` and the reverse pair, so loading a 1:1 thread is fast.
   - RLS: a signed-in user can read a row only if they are the sender or the recipient (matched via `profiles.user_id = auth.uid()`). Insert allowed only when the sender profile belongs to the signed-in user and sender ≠ recipient.
   - Realtime publication enabled so new DMs stream in live.

2. **New table `chat_reads`**
   - Columns: `profile_id`, `event_id`, `scope` (`'room'` or `'dm'`), `peer_profile_id` (nullable; set for DM rows), `last_read_at`.
   - Primary key: `(profile_id, event_id, scope, coalesce(peer_profile_id, '00000000-...'))`.
   - RLS: read/write only your own rows.
   - Updated whenever the user opens a given conversation; unread counts = messages newer than `last_read_at`.

3. **DM panel component (`DirectChat.tsx`)**
   - Reuses the right-side drawer layout from `RoomChat`.
   - Loads the full thread for `(event_id, me, peer)` ordered by `created_at`, subscribes to inserts via Supabase Realtime, auto-scrolls to bottom.
   - Send button inserts a row, optimistic append, errors toast via `sonner`.
   - On mount/focus, upserts `chat_reads` for this conversation.

4. **Chat header dropdown (`ChatSwitcher.tsx`)**
   - Shows in both `RoomChat` and `DirectChat` headers.
   - Items: "Room chat" + every peer the user has at least one DM with in this event, plus the currently-selected peer if any.
   - Each item shows avatar, display name, and a small coral dot + count when unread. Clicking switches the active chat without closing the panel.

5. **Event route wiring (`src/routes/_app.app.event.$eventId.index.tsx`)**
   - Add `activeChat: { kind: 'room' } | { kind: 'dm', peerId }` state alongside `chatOpen`.
   - Replace `ProfileDrawer`'s "Open room chat" button with the new "Start a conversation with {firstName}!" CTA that sets `activeChat` to that peer and opens the panel.
   - Load each DM peer's latest message + unread count once, plus a single realtime subscription for incoming DMs to me in this event, to keep the unread badge and dropdown fresh.
   - Floating "Room chat" FAB gets a small coral dot when there is any unread room message OR any unread DM.

6. **No changes** to: `EventIntakeModal`, `VideoIntro*`, avatar/bubble layout, room-message schema, break rooms.

## Verification

- Two browser sessions in the same event: A taps B → starts conversation → sends "hi". B sees a notification dot on the room-chat FAB, opens it, switches via the dropdown to A's thread, replies. Both threads + room chat appear in the dropdown for each side.
- Reload the page: history is still there, dots clear once the conversation is opened.
- DM RLS: a third user C cannot read A↔B messages (verified via a quick query as C).