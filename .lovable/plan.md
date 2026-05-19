## Goal
Split the single photo button on `/app/profile` into two distinct actions:
1. **Upload from gallery / files** — opens a standard file picker.
2. **Take a selfie** — opens the device camera, lets the user capture a still, confirm, and upload it.

## Behavior

### Button 1 — "Upload photo"
- Hidden `<input type="file" accept="image/*">` (no `capture` attribute, so desktop and mobile both show the file/gallery picker).
- Reuses the existing upload + DB-update flow.

### Button 2 — "Take a selfie"
- Opens a modal/sheet that requests the camera via `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })`.
- Shows a live `<video>` preview (mirrored), a circular framing overlay, and a "Capture" button.
- On capture: draw the current frame to a `<canvas>` at a reasonable max size (e.g. 720×720, square center-cropped), then `canvas.toBlob(..., "image/jpeg", 0.9)`.
- Show a "Retake / Use photo" confirm step. On confirm, run the same upload flow as button 1.
- On close (or after upload), stop all tracks (`stream.getTracks().forEach(t => t.stop())`) so the camera light turns off.
- Handle permission denial / no camera: show a small inline error in the modal and a retry button.

### Layout
Stack the two buttons vertically under the avatar in the profile card. Primary-looking outlined button for "Upload photo" + lime-filled button for "Take a selfie" (since selfie is the new highlight action). Show one shared "Uploading…" state on whichever flow is active.

## Files to touch
- `src/routes/_app.app.profile.tsx` — split the existing button, add the camera modal component (kept in the same file, small).
- No DB / storage / RLS changes — reuses the existing `avatars/{user_id}/...` flow added last turn.

## Out of scope
- Cropping UI beyond the auto square center-crop.
- Filters, retouching, multi-camera switching (front/back toggle) — front camera only.
- Browser-permission deep links / OS-level help.

## Technical notes
- `getUserMedia` requires HTTPS (preview + published Lovable URLs are already HTTPS — fine).
- The modal must always release the camera in a `useEffect` cleanup and on close/capture/error so the indicator light doesn't stay on.
- Mirror only the preview (`transform: scaleX(-1)` on the `<video>`), NOT the captured canvas — otherwise the saved photo is flipped.