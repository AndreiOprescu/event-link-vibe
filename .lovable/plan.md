## Problem

Navigating to `/app/event/:eventId/break/:roomId` shows a black screen. The break-room screen itself (`_app.app.event.$eventId.break.$roomId.tsx`) is fine — round table, 4 seats, occupants — but it never renders.

The cause is the parent route file `src/routes/_app.app.event.$eventId.break.tsx`. It is a parent of the `$roomId` child route, but its component (`BreakRedirect`) does two wrong things at once:

1. It renders `<Navigate to=".../break/$roomId" .../>` unconditionally, so even when the URL already targets a specific room, it tries to redirect again (often back to itself or another room, depending on counts) — causing a redirect loop / blank screen.
2. It never renders `<Outlet />`, so even if the child route matches, the break-room UI has nowhere to mount.

## Fix

Split the `/break` segment into a layout + an index route, mirroring the pattern we already used for `$eventId`:

1. **Create** `src/routes/_app.app.event.$eventId.break.index.tsx`
   - Path: `/_app/app/event/$eventId/break/`
   - Contains the existing `BreakRedirect` logic (smart-pick best room, `<Navigate replace />` to `.../break/$roomId`).
   - Only runs when the URL is exactly `/app/event/:eventId/break` (no roomId).

2. **Replace** `src/routes/_app.app.event.$eventId.break.tsx` with a minimal pathless layout:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/_app/app/event/$eventId/break")({
     component: () => <Outlet />,
   });
   ```

With this, `/app/event/:id/break/room-04` matches the layout (renders `<Outlet />`) and the `$roomId` child mounts the round-table screen. `/app/event/:id/break` (no room) still smart-redirects via the new index route. `BreakRoomPicker` and the room screen itself need no changes.

`src/routeTree.gen.ts` regenerates automatically.

## Out of scope

No changes to `BreakRoom` UI, seats, chat, presence, or `BreakRoomPicker`.
