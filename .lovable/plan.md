## What to change

### 1. Spread personas evenly across the room
**File:** `src/routes/_app.app.event.$eventId.index.tsx` (`positions` useMemo, lines 188–230)

Replace the 8-cluster seating layout (which packs 3 people per cluster and causes overlap) with an even scatter that:
- Anchors `me` near the center-bottom.
- Distributes everyone else using a deterministic Poisson-disc-style placement on the 100×100 percentage grid: a sequence of candidate points seeded from the profile id, accepted only if they sit ≥ ~14% from every already-placed person and ≥ ~10% from the edges.
- Falls back to the best candidate after N tries so we never silently drop a person.

Result: avatars are spread across the whole floor and never touch, regardless of headcount (up to ~30).

### 2. Make the profile pop-up scrollable
**File:** `src/routes/_app.app.event.$eventId.index.tsx` (`ProfileDrawer`, lines 549–551)

Cap the card height and make only the inner content scroll:
- Outer wrapper stays the centered overlay.
- Inner card: `max-h-[85vh] flex flex-col`, with the close button row stuck to the top and the body wrapped in a `flex-1 overflow-y-auto` section. The page behind no longer scrolls; the modal contents do.

### 3. Fix room-chat uploads (photos, videos, voice) and video playback
**Root cause:** the `event-media` storage bucket has policies that only allow inserts under `avatars/<userId>/...` or `intros/<eventId>/<userId>/...`. Room-chat uploads write to `<eventId>/<profileId>/<uuid>.<ext>` (see `uploadEventMedia` in `src/components/app/RoomChat.tsx`, line 73), so every insert is rejected by RLS → no media is stored → the `<video>`/`<img>`/`<audio>` tags in the feed never have a real URL → "videos not viewable".

**Migration (run via supabase--migration):** add two policies on `storage.objects`:
- INSERT for `authenticated` when `bucket_id = 'event-media'` and the path is `<eventId>/<auth.uid()-owned profile>/...`. Concretely: first folder is any text, second folder is a profile id that belongs to `auth.uid()` (checked via the existing `public.owns_profile` function).
- (Reads are already covered by `event_media_authed_read` + the bucket being public.)

No code change needed in `RoomChat.tsx` for the upload path itself — once the policy lands, the existing `supabase.storage.from('event-media').upload(...)` call succeeds and the inline `<video controls>` / `<img>` / `VoiceMessage` components render the returned public URL.

## Out of scope
- No changes to the camera capture UX, the voice recorder, or message rendering — those already work once the upload succeeds.
- No demo persona / logout-persistence changes (already done in earlier turn).