## Goal
Make the profile-photo button actually upload a picture (gallery or selfie), show that photo in every avatar bubble, and put the username under the user's own bubble on the event screen.

## 1. Database
Add an `avatar_url` column to `profiles` (nullable text). Storage already has a public `event-media` bucket — reuse it under an `avatars/` prefix so we don't need a new bucket.

Add storage RLS so a signed-in user can only write/replace files under `avatars/{their user_id}/...` in `event-media`; everyone authenticated can read (bucket is already public).

## 2. Profile page (`src/routes/_app.app.profile.tsx`)
Stop using the `ME` mock. Pull the real profile via `useAuth()` and:

- Show the current `avatar_url` inside the round preview when present, otherwise fall back to the emoji on the colored disc.
- Replace the "Take a new selfie" button with a single control that opens a hidden `<input type="file" accept="image/*" capture="user">`. On mobile this offers "Take photo / Choose from library"; on desktop it opens the file picker. (One button as requested — no separate gallery/camera split.)
- On select: validate (image, ≤ 5 MB), upload to `event-media` at `avatars/{user_id}/{timestamp}.{ext}` with `upsert: true`, get the public URL, then `update profiles set avatar_url = ...`.
- Show a small spinner state on the button while uploading and a toast on success/failure.
- Wire the existing emoji grid, account fields, goal, and Save button to the real profile row (was previously read-only mock). Keep scope tight — only the photo flow is required, but the form has to read/write real data for the photo change to persist alongside.

## 3. AvatarBubble (`src/components/app/AvatarBubble.tsx`)
Extend `BubbleUser` with optional `avatar_url`. When present, render the photo as a `background-image` (cover, centered) inside the existing round disc and hide the emoji. When absent, keep today's emoji-on-color look. No layout / size changes — bubble-halo and drift keep working.

## 4. Event screen (`src/routes/_app.app.event.$eventId.index.tsx`)
- Pass `avatar_url` through when constructing the `user` prop for `AvatarBubble` (both demo profiles and `me`).
- Under your own bubble, show your `display_name` (small, lime, centered) where the "you" caption sits today. Keep the "you" indicator as a tiny lime dot or short tag next to the name so it's still clear which bubble is yours.

## Out of scope
- Cropping / filters / image compression beyond a size cap.
- Replacing other people's emoji avatars with anything besides their own uploaded photo (if a demo profile has no `avatar_url`, it keeps its emoji).
- Auth/session changes, route changes, or backend functions beyond the one column + storage policies.

## Technical notes
- Upload uses the browser Supabase client (`supabase.storage.from('event-media').upload(...)`) — RLS on `storage.objects` enforces the per-user folder.
- `avatar_url` is stored as the public URL returned by `getPublicUrl`, so reads need no signing.
- After upload, optimistically update local profile state and refetch to keep the event screen in sync.