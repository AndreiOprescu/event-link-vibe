## What changes

Voice notes, photos, and short videos become first-class messages in the room chat. They use the **exact same kind logic** as text: any of them can be sent as a **Discussion**, **Reply**, or **Global** message and behave identically (bubbles above heads grow with replies, threads expand under `more.../less...`, global replies prepend `/@Name`, etc.).

## Composer additions

The current composer keeps its text input and Discussion/Global buttons. Two new icon buttons sit to the left of the text input:

```text
[🎤 voice] [📷 camera]   __________________  
                         [Discussion]  [Global]
```

### Voice button (🎤)
- Tap once → starts recording from the device mic via `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder`.
- While recording, the composer is replaced by a recording strip: red dot, MM:SS timer, ✕ cancel, ⏹ stop. A live waveform (see below) animates as you speak.
- Hard cap **2:00** — auto-stops at 120s.
- On stop: inline preview shows the custom waveform player + duration. Discussion/Global buttons re-appear. Sending uploads the blob then inserts the message.

### Camera button (📷)
- Opens a full-screen capture sheet over the chat using `getUserMedia({ video: { facingMode: 'user' }, audio: <mode==='video'> })` rendered into a `<video>` element.
- Sheet has a top toggle: **Photo / Video**.
  - **Photo** mode: big shutter button → draws current video frame to `<canvas>`, exports JPEG blob.
  - **Video** mode: tap-to-start, tap-to-stop via `MediaRecorder`, hard cap **15s**.
- After capture: preview + Retake / Use. "Use" closes sheet, drops media into composer as pending attachment.
- For photos and videos, a **caption** text field appears under the preview in the composer ("Add a caption…"). Caption is optional and goes into the existing `text` column. For videos, captions also work and render below the player.
- All tracks `stop()`-ed when sheet closes (no orphan camera light).

### Pending media + reply mode
- Only ONE pending media attachment at a time. Text input doubles as the caption.
- When `replyTo` is set, the contextual single send button is used; kind is `reply`/`global`. A `/@Name` text caption is auto-prefilled; media-only (no caption) is allowed for replies too.
- ✕ on the attachment chip drops the pending media.

## Audio waveform visualizations

Custom lightweight waveform — no new dependencies, all built on Web Audio API + `<canvas>`.

**Recording strip (live)**
- While recording, an `AnalyserNode` from the mic stream feeds time-domain data into a small canvas at ~30fps. Rendered as ~32 vertical bars in lime, mirrored around centerline, smoothed with a tiny low-pass average. Replaces the static red-dot indicator.

**Playback (recorded voice notes)**
- On send, the recorded `Blob` is decoded **once** with `OfflineAudioContext.decodeAudioData`, downsampled to **64 amplitude buckets** (peak per bucket), stored as a JSON array in a new `event_messages.waveform_peaks` column.
- `<VoiceMessage>` component renders those 64 bars in a canvas. Tap to play/pause; played-portion bars fill in lime, unplayed are muted-foreground. A thin progress cursor sweeps across as the underlying `<audio>` element ticks (no visible controls — the waveform IS the control). Duration pill (`0:12`) sits to the right.
- Fallback: if `waveform_peaks` is null (legacy/decoding fail), render flat baseline + native `<audio controls>`.

## Rendering

`MessageRow` learns three new body shapes based on `media_type`:
- `audio` → `<VoiceMessage>` (custom waveform player) + duration pill.
- `image` → `<img>` capped at ~240px with click-to-zoom modal. **Caption** (if present) renders italic, muted-foreground, below the image — supports `/@Name` mention coloring just like text messages.
- `video` → `<video controls playsinline>` capped at ~240px, with optional caption below in the same style as images.

**Discussion bubble above heads** (room floor): when active discussion's `media_type !== 'text'`, render icon-label instead of text snippet:
- `🎤 Voice · 0:12`
- `📷 Photo` (+ truncated caption if present, e.g. `📷 Photo · "view from the booth"`)
- `🎬 Video · 0:08` (+ truncated caption if present)

Size-grows-with-replies logic stays the same.

**Global "replying to:" link**: when parent global is media, snippet becomes `🎤 Voice` / `📷 Photo: <caption>` / `🎬 Video: <caption>`.

## Data model

Migration on `event_messages`:
- Add `media_type text not null default 'text'` with check `media_type in ('text','audio','image','video')`.
- Add `media_url text` (public storage URL).
- Add `media_duration_seconds integer` (null for images).
- Add `waveform_peaks jsonb` (null unless media_type='audio'; 64-number array).
- `text` becomes nullable. Add check: `text is not null or media_type <> 'text'`.

New storage bucket `event-media` (public read):
- Path: `event-media/{event_id}/{profile_id}/{uuid}.{ext}`.
- RLS on `storage.objects`:
  - Public SELECT on bucket `event-media`.
  - INSERT allowed to authenticated users where `(storage.foldername(name))[2]` matches a profile id owned by `auth.uid()`, gated by a SECURITY DEFINER helper `public.owns_profile(profile_id uuid)`.

Upload flow: client uploads blob via `supabase.storage.from('event-media').upload(...)` → `getPublicUrl` → insert `event_messages` row with `media_type`, `media_url`, `media_duration_seconds`, `waveform_peaks` (audio only), `text` (caption or null), plus `kind`/`parent_id` from composer state.

## Files touched

- `supabase/migrations/<new>.sql` — schema + bucket + policies above.
- `src/integrations/supabase/types.ts` — auto-regenerated.
- `src/routes/_app.app.event.$eventId.tsx`:
  - Extend `Msg` type with `media_type`, `media_url`, `media_duration_seconds`, `waveform_peaks`.
  - Add `useVoiceRecorder()` hook — `MediaRecorder` for audio + live `AnalyserNode` waveform.
  - Add `computeWaveformPeaks(blob)` helper — `OfflineAudioContext` decode → 64 buckets.
  - Add `<VoiceMessage>` component — canvas-based playback waveform with play/pause + progress.
  - Add `<LiveWaveform>` component — canvas tied to the analyser during recording.
  - Add `<CameraSheet>` component — full-screen photo/video capture.
  - Add `<ImageLightbox>` component — click-to-zoom for images.
  - Extend `RoomChat` composer with mic + camera buttons, pending-media state, caption input for photo/video.
  - Extend `MessageRow` to render audio/image/video bodies + captions.
  - Update floating discussion bubble + `findRepliedGlobalSnippet` to produce media labels (with caption when present).

No new npm dependencies — `MediaRecorder`, `getUserMedia`, `OfflineAudioContext`, `AnalyserNode`, `<canvas>`.

## Out of scope (call out, don't build)

- Image filters / cropping / editing before send.
- Background blur, virtual cameras, or AR.
- Transcription of voice notes.
- Live-streaming a camera (this is capture-and-send, not live video chat).

## Permissions UX

If the user denies mic or camera permission, show a one-line toast under the composer: "Microphone access needed for voice messages" / "Camera access needed for photo & video". No retry loop; user re-triggers by tapping the button again.
