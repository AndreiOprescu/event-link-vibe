## Changes to `src/routes/index.tsx`

1. **Headline** → "The room keeps buzzing after the event ends." (single `<h1>`, lime period accent at end).
2. **Sub-copy** → "Bubbles is a living digital space for events. Every attendee shows up as a glowing bubble. Tap one, hear what they have to say and slide into their LinkedIn, if you want." (highlight "glowing bubble" in lime to tie to the background animation).
3. **Three cards** — drop the "Lane 01/02/03" tag entirely and replace title + body:
   - Card 1 — "Show up as you" / "Create your bubble with a selfie, name and a headline for your goals to show up to the relevant attendee first."
   - Card 2 — "Record a 60s intro" / "Share whatever is on your mind. Keep it easy, make a first impression."
   - Card 3 — "Your bubble is floating" / "Look around the plaza and discover exciting attendees by clicking their bubble." (keep the lime-filled accent variant on this one)
   - Card layout stays the same (icon + title + body); just remove the `tag` line.
4. **Background bubbles** — add a fixed, `pointer-events-none`, `inset-0` layer behind everything containing ~12 absolutely-positioned circles:
   - Sizes 40–140px, soft radial gradient (lime tint → translucent), thin lime ring, subtle blur, opacity 15–30%.
   - Each rises from `translateY(110vh)` to `translateY(-20vh)` with a small horizontal sway and gentle scale pulse via a new `@keyframes bubble-rise` in `src/styles.css`.
   - Durations 22–48s, staggered `animation-delay`, `ease-in-out`, `infinite`.
   - Respects `prefers-reduced-motion` (pause).
5. **Hero positioning** — wrap the main hero content in `relative z-10` so it sits above the bubble layer; the surface card grid keeps its solid background so bubbles read as ambient backdrop only.

## Changes to `src/styles.css`

- Add `@keyframes bubble-rise` (translateY + translateX sway + scale pulse).
- Add a `.bubble` utility class encapsulating the gradient/ring/blur baseline so the JSX stays compact.
- Add a `@media (prefers-reduced-motion: reduce)` rule that pauses `.bubble`.

## Out of scope

- Nav header, "Sign in" / "Join an event" / "Create account" CTAs, footer text, `head()` meta (still says "EventLabs"). If you want the meta / nav also rebranded to "Bubbles", that's a separate request.
- No new dependencies, no route changes, no backend changes.
