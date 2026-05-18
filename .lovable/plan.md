## What changes

Rebuild the chat model in the event room around three message kinds. The current `event_messages` table becomes the parent table, with a new self-referential `parent_id` and a `kind` column.

### The three message kinds

1. **Discussion** — starts a new thread.
   - Floats as a bubble above the author's head in the room (replaces the old 8s ephemeral float).
   - Bubble size grows linearly with reply count: e.g. base 48px + 8px per reply, capped at ~140px.
   - Bubble persists as long as the author is in the room.
   - Also appears in the side chat history as the top of a thread.
   - Clicking the bubble opens the side chat AND auto-expands that thread.

2. **Reply** — child of a Discussion.
   - Lives only inside its parent discussion's thread in the side chat.
   - Collapsed by default behind a `more...` toggle under each discussion; toggle flips to `less...` when open. Auto-expanded when the user arrived by clicking the floating bubble.
   - Each reply has its own ↩ Reply button. Clicking it focuses the composer and prepends `/@Name ` to the draft (where Name is the target's first name). The user can edit/delete that prefix freely.
   - Increments the parent's reply count → grows the parent's floating bubble.

3. **Global** — flat message in the side chat's main feed.
   - Can be replied to; the reply is ALSO a Global message, not a sub-thread.
   - Global replies render with `/@Name ` prefix AND a subtle "replying to: <snippet>" link above the bubble that scrolls to the original on click.

### Composer

Two send buttons side-by-side:
- **Discussion** (lime, primary) — sends as a new discussion.
- **Global** (outline) — sends as a global message.

When the user clicks Reply on any message, the composer enters "reply mode":
- Shows a small "Replying to <Name>" chip with an ✕ to cancel.
- Pre-fills `/@Name ` in the input.
- Send button collapses to a single contextual one matching the parent's kind (Reply-to-Discussion or Global Reply). Cancelling restores the two-button state.

### Side chat panel layout

```text
┌─ Room chat ──────────────────── ✕ ┐
│                                    │
│  [Global feed + Discussion roots,  │
│   interleaved by created_at]       │
│                                    │
│   💬 Maya — "Anyone doing the      │
│     hands-on lab after lunch?"     │
│     [more... (3)]                  │
│       └ Alex: count me in          │
│         [↩ Reply]                  │
│       └ Sam: /@Alex same           │
│         [↩ Reply]                  │
│                                    │
│   🌐 Jordan — keynote was 🔥       │
│     [↩ Reply]                      │
│   🌐 Priya — /@Jordan agreed       │
│     ↳ replying to: keynote was 🔥  │
│                                    │
├────────────────────────────────────┤
│ [Replying to Maya ✕]               │
│ /@Maya ___________________  [Send] │
└────────────────────────────────────┘
```

### Room floor

- Each profile that has an active discussion shows ONE bubble above their avatar (their most recent discussion). Hover shows the discussion text; click opens the side chat with that thread auto-expanded.
- Bubble size = `clamp(48, 48 + replies * 8, 140)` px.
- The transient "say something to the room" floating bubbles are removed — that surface is replaced by Discussion bubbles. The bottom compose bar in the room is also removed; all composing happens in the side chat.

## Data model

Migration on `event_messages`:
- Add `kind text not null default 'global'` with check `kind in ('discussion','reply','global')`.
- Add `parent_id uuid references public.event_messages(id) on delete cascade`.
- Add index on `(event_id, parent_id)` and `(event_id, kind, created_at)`.
- Backfill existing rows as `kind='global'`, `parent_id=null`.
- RLS stays as-is (select for authenticated, insert when profile is yours).

Reply count is derived (not stored): `select count(*) from event_messages where parent_id = $1`. Cheap with the index; realtime increments locally when a new reply arrives.

## Files touched

- `supabase/migrations/<new>.sql` — schema change above.
- `src/routes/_app.app.event.$eventId.tsx` — biggest change:
  - Remove bottom compose bar and ephemeral floating-message rendering.
  - Add per-profile "active discussion" bubble rendering on the room floor with size-by-reply-count and click → open thread.
  - Rewrite `ChatDrawer` into a `RoomChat` panel that interleaves discussion roots + globals, renders replies behind `more.../less...`, and supports the reply chip + dual send buttons.
  - Extend realtime subscription so reply inserts bump the right parent's bubble size and thread.
- `src/integrations/supabase/types.ts` — regenerates after migration (auto).

No new dependencies.

## Out of scope (call out, don't build)

- True 1:1 DMs — still needs a separate `direct_messages` table; not part of this rework.
- Mentions as real entities (autocomplete, notifications) — `/@Name` is a plain-text convention for now.
- Edit/delete of messages.
