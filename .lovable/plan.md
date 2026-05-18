## What's actually broken

The console output you pasted is all Lovable preview-iframe noise — source-map 404s, an invalid `sandbox` attribute warning, and cross-origin frame warnings from `lovable.dev`. None of it is your app crashing.

The real bug is in the chat UX in `src/routes/_app.app.event.$eventId.tsx`:

- The bottom message composer sits on the room at `z-30`.
- The `ChatDrawer` opens at `z-50` and covers the full screen.
- So the moment you click on someone's avatar and the drawer opens, the composer is hidden behind it and there's no way to send a message.

A secondary issue: the drawer shows the whole-room chat regardless of which person you clicked, which makes "messaging that one person" feel misleading.

## Fix

1. **Add a composer inside `ChatDrawer`** in `src/routes/_app.app.event.$eventId.tsx`:
   - Footer input + send button using the same `event_messages` insert path.
   - Enter-to-send, disabled when empty.
   - Auto-scroll the sentinel on send and on incoming realtime messages.

2. **Clarify the drawer header** so it's obvious this is the shared room chat, not a private DM:
   - Opened from a person's avatar → header shows that person's avatar + name + subtitle "Room chat · everyone can see this".
   - Opened from the history button → header shows "Room chat".

3. **Keep true 1:1 DMs out of scope for this pass.** Real direct messaging needs a new `direct_messages` table + thread view. Happy to plan that as a follow-up if you want it.

## Hosting

Staying on Lovable hosting — one click on **Publish** when you're ready (gives you `your-app.lovable.app` with custom domain support). No Vercel detour.

## Files touched

- `src/routes/_app.app.event.$eventId.tsx` — extend `ChatDrawer` with a composer + send handler; refine header copy.

No DB changes, no new dependencies.
