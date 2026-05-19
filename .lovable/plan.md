## Goal
Hide the "Too crowded / break rooms" entry point from the event room so it's not accessible, without deleting any files (so it can be re-enabled later).

## Change
**File:** `src/routes/_app.app.event.$eventId.index.tsx`

1. Remove the `<BreakRoomPicker eventId={eventId} goal={me?.goal} />` render in the top bar (replace with an empty spacer `<div />` so the flex `justify-between` layout keeps Back + event-title group positioned correctly).
2. Comment out the `import { BreakRoomPicker } from "@/components/app/BreakRoomPicker";` line with a `// TODO: re-enable break rooms` note, so the component, hook, and routes (`break.tsx`, `break.index.tsx`, `break.$roomId.tsx`) all remain on disk and untouched.

## Out of scope
- Not deleting `BreakRoomPicker.tsx`, `useBreakRoomIndex.ts`, `break.ts`, or any `/break` route files.
- Not touching DB tables or RLS.
- No other UI changes.

## Re-enable later
Uncomment the import and restore the `<BreakRoomPicker .../>` line in the top bar.
