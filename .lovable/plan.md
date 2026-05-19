## Goal

After signup, send the user to a real profile-setup screen (name, company, role, LinkedIn, track, optional photo) that **saves to their profile**. Only after that can they enter `/app`, pick an event, and see the per-event 2-question intake popup.

Today the `/onboarding` screen is a static demo — none of the inputs are wired up, so signups go straight to `/app` with an empty profile.

## Changes

### 1. Database

Add a `profile_completed boolean not null default false` column to `profiles` so we can tell first-time users apart from returning ones reliably (doesn't depend on guessing from field contents).

### 2. `/onboarding` — turn into the real first-time profile setup

Rewrite `src/routes/onboarding.tsx`:
- Require an authenticated session (redirect to `/login` if none).
- Prefill from existing `profiles` row (so users who refresh don't lose progress).
- Two short steps:
  1. **About you** — display name (required), company / university, role, LinkedIn, track picker.
  2. **Your face** — emoji picker + optional "Upload photo" / "Take a selfie" (reuse the same upload helper used in `_app.app.profile.tsx`).
- On finish: `update profiles set display_name, company, role, linkedin, track, emoji, color, avatar_url, profile_completed = true where user_id = auth.uid()`, then `navigate({ to: "/app" })`.
- Remove the email/password fields from the onboarding form (account already exists at this point).

### 3. Route the user through onboarding after signup

- `src/routes/login.tsx`: after a successful `signUp` and after Google OAuth, navigate to `/onboarding` instead of `/app`. (Sign-in path still goes to `/app`.)
- `src/routes/_app.tsx`: once `profile` is loaded, if `profile.profile_completed === false`, redirect to `/onboarding`. This catches Google users on first login and anyone who bailed mid-setup.
- `/onboarding` itself: if `profile_completed === true`, send them straight to `/app` (so the link isn't a trap for returning users).

### 4. Per-event intake stays as-is

`EventIntakeModal` keeps popping up the first time a user opens an event (gated by the existing `event_members` row check). No changes needed — it just won't be the user's *first* prompt anymore.

## Resulting flow

```text
Sign up  ->  /onboarding (profile setup, saved to profiles)
          ->  /app (events list)
          ->  pick an event
          ->  /app/event/:id  (2-question EventIntakeModal, first visit only)
```

## Files touched

- `supabase/migrations/...` — add `profile_completed` column.
- `src/routes/onboarding.tsx` — rewrite as real profile setup form.
- `src/routes/login.tsx` — post-signup + post-OAuth redirect to `/onboarding`.
- `src/routes/_app.tsx` — gate on `profile_completed`.
- `src/hooks/useAuth.ts` — add `profile_completed` to the `Profile` type.
