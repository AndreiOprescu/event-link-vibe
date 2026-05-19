## Goal
Overhaul auth + onboarding + event entry flow: add Google sign-in, email confirmation, photo-only profiles, per-event intake questions, and a video intro.

## 1. Auth (`src/routes/login.tsx`)
- Subtitle copy → "Sign in to find your people."
- Add **"Continue with Google"** button above email form using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" })`. Also call `supabase--configure_social_auth` with `providers: ["google"]`.
- After email signup: do NOT auto-sign-in. Show message: **"Check your inbox — click the link we sent to confirm your account."** (Email confirmation required; do not enable auto-confirm.)
- After sign-in, redirect to `/app` (events list). Onboarding pop-up will be triggered from there, not from a separate `/onboarding` route redirect.

## 2. Events list copy (`src/routes/_app.app.index.tsx`)
- Replace "Drop into an event." → **"Welcome back — your rooms are waiting."**
- Code-entry only shown for events the user hasn't joined before. Past joins persist via new `event_members` table (see §6). Joined events appear automatically in the "live/upcoming" tabs without re-entering a code.

## 3. Profile model — drop emojis, photo-first
- `AvatarBubble`: when no `avatar_url`, render a **colored circle with initials** (derived from `display_name`) instead of emoji. Keep `color` field for the circle background.
- Remove emoji picker from profile/onboarding UI everywhere it appears.
- Profile fallback everywhere a bubble is rendered.

## 4. Profile screen (`src/routes/_app.app.profile.tsx`) restructure
- Rename "Account" section → **"Tell us about yourself"**.
- Replace `first_name` + `last_name` inputs with a single **Full name** field (maps to `display_name`).
- Field order: **Full name → Email → Company / University → Role → LinkedIn → Track**.
- Add **profile picture uploader** (uploads to existing `event-media` bucket under `avatars/<user_id>.jpg`, writes `profiles.avatar_url`).
- Remove the per-profile "Your goal at events" question from this screen (it moves to the per-event intake).

## 5. Per-event intake pop-up (new component)
- Trigger: first time a user enters a given event (no row in `event_members` for that user+event).
- Modal flow, required to enter:
  1. Welcome line: *"Welcome to {event.title}."*
  2. **What would you like to get out of this event?** (textarea, required)
  3. **Introduce yourself.** (short text/bio, required, with helper "A sentence or two.")
- On submit → insert into new `event_members` (user_id, event_id, goal, intro, joined_at). Subsequent entries skip the modal.

## 6. Video intro prompt
- After modal submit (first time only), show a soft prompt card in the event room: *"Want to introduce yourself on video? Up to 2 minutes — optional."* with Record / Skip buttons.
- Recording uses `MediaRecorder` (webcam + mic), 120s hard cap with countdown, upload to `event-media` bucket under `intros/<event_id>/<user_id>.webm`.
- Save `intro_video_url` + `intro_duration` on the `event_members` row.
- In the event room, every avatar bubble becomes clickable: clicking opens a small overlay that auto-plays that person's intro video (falls back to "no intro yet" if missing).

## 7. Database changes (one migration)
- `event_members` table: `user_id uuid`, `event_id text`, `goal text not null`, `intro text not null`, `intro_video_url text`, `intro_duration_seconds int`, `joined_at timestamptz default now()`, PK (user_id, event_id). RLS: select all authenticated, insert/update own row.
- Storage policies on `event-media` for authenticated upload of own `avatars/` and `intros/` paths.
- Leave `profiles.goal` / `profiles.emoji` columns in place (unused by UI) to avoid breaking existing code paths.

## 8. Out of scope
- No changes to break-room files (still hidden).
- No changes to `events` seed data.
- No deletion of unused columns.

## Technical notes
- Google OAuth: must call `supabase--configure_social_auth` in same turn as adding the button or first sign-in fails with "provider is not enabled".
- Email confirmation: keep `auto_confirm_email: false` (default). Update signup success copy.
- Video upload: use direct `supabase.storage.from('event-media').upload(...)` from browser (RLS-scoped); no server fn needed.
- Initials helper: first letter of first two whitespace-split words of `display_name`, uppercased.
