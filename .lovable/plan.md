# Per-event video intros — promote to modal + larger playback

## Current state
- `event_members` table already stores `intro_video_url` + `intro_duration_seconds` per (user_id, event_id).
- `VideoIntroRecorder` works (camera, 2-min cap, upload to `event-media/intros/{eventId}/{userId}/...`, saves URL on the member row).
- Today the video step is a small bottom-of-screen "VideoIntroPrompt" toast shown only after the text intake modal — easy to miss.
- Clicking another user's avatar: if they have a video, a small overlay plays just the video + name; if not, the `ProfileDrawer` shows avatar + name + details (no video).

## What changes

### 1. First-time video intro as a real popup
Replace the small `VideoIntroPrompt` toast with a centered modal (`VideoIntroModal`) that appears the first time a user enters an event, right after the existing two-question intake.

Modal contents:
- Title: "Add a video intro"
- Short copy explaining the two prompt options.
- Two suggestion chips the user can tap to pre-fill what they'll talk about:
  - "Introduce yourself"
  - "What do you think of the event so far?"
- Primary button: **Record video** → opens existing `VideoIntroRecorder`.
- Secondary text button: **Skip for now** → dismisses; user can record later from their own avatar tap.
- Shown only on first event entry (driven by absence of a row in `event_members` for this user+event — same trigger as today). Will not reappear on subsequent visits.

### 2. Let users add/replace their own video later
On the event screen, tapping your own avatar (currently does nothing) opens a small "Your intro" panel with:
- Preview of current video if one exists.
- Button: **Record new intro** (re-opens `VideoIntroRecorder`, overwrites `intro_video_url`).

### 3. Bigger, unified profile drawer for other users
Rework `ProfileDrawer` so a single drawer always handles the avatar tap (remove the separate video-only overlay):

```
+----------------------------------+
|        [Avatar circle]           |
|        Display Name              |
|        Role · Company            |
|                                  |
|  +----------------------------+  |
|  |                            |  |
|  |   <video> 16:9, large      |  |  ← only if intro_video_url
|  |                            |  |
|  +----------------------------+  |
|                                  |
|  Their goal (lime card)          |
|  LinkedIn · Email                |
+----------------------------------+
```

- Drawer max width grows from `max-w-sm` → `max-w-xl` so the video has real estate.
- Video element: `aspect-video w-full rounded-2xl bg-black`, `controls autoPlay playsInline`.
- If the user has no video, drawer renders as today (no empty video box, just a subtle "No intro video yet" line).
- Remove the separate `playingVideoFor` overlay branch; every avatar tap now routes through `setSelected(a.id)`.

### 4. Storage / data
No schema changes needed. Existing `event-media` bucket + `event_members` columns cover this. Existing storage RLS already scopes writes to `intros/{eventId}/{userId}/...`.

## Files touched
- `src/components/app/VideoIntro.tsx` — add `VideoIntroModal` (centered popup with the two prompt chips); keep `VideoIntroRecorder` as-is; remove `VideoIntroPrompt` usage (can leave the export for now).
- `src/routes/_app.app.event.$eventId.index.tsx`
  - Replace `VideoIntroPrompt` with `VideoIntroModal` in the first-time flow.
  - Make own-avatar tap open a small "Your intro" panel with a re-record button.
  - Collapse `playingVideoFor` overlay into `ProfileDrawer`; pass `member` (with `intro_video_url`) into the drawer.
- `ProfileDrawer` (same file) — widen, render large video at top under name + avatar, keep goal/links below.

## Out of scope
- No DB migration.
- No changes to the text intake modal questions, auth, or events list.
- Break-room feature stays hidden.
