# Drop the green; vibrant warm palette + multi-color bubbles

## What's wrong now
- The lime green accent (`--lime`) is still everywhere — buttons, rings, halos, glows, rising bubbles, "REC" dots, etc. It clashes with the cream warm theme.
- Avatar bubbles and the rising background bubbles only use a single hue (lime), so they don't read as different people.
- The DB still seeds new profiles with a partly-green palette (`#A3E635`, `#34D399`).

## Plan

### 1. Replace the green token (keeps every component on track)
In `src/styles.css`:
- Repurpose the `--lime` / `--lime-glow` tokens (without renaming — they're used in 14 files) so they point at a vibrant **coral-poppy** hue instead of green:
  - `--lime: oklch(0.7 0.2 30)` (warm coral-red)
  - `--lime-glow: oklch(0.7 0.2 30 / 0.55)`
- Also add three new tokens for variety so bubbles and decorative bits can pull from a palette: `--brand-blush`, `--brand-butter`, `--brand-sky`, `--brand-terracotta`, `--brand-grape` (all light-theme friendly, no green).
- Drop `--chart-3` lime; replace with grape.
- `--accent` and `--ring` flip from green to coral so toasts, focus rings, and check states stay consistent.
- `--primary` already coral — leave it.

### 2. Multi-color bubbles
Two kinds of "bubbles" exist; fix both.

**a) Avatar bubbles (one per person)** — already driven by `profile.color`, but the values are mostly green/neon. Two changes:
- **Migration** to refresh the seed palette in `handle_new_user()` and `UPDATE` existing `profiles` rows to a vibrant warm palette of 8 colors:
  `#F26A4F` (coral), `#F4A36C` (peach), `#F2C14E` (butter), `#E55B7E` (raspberry), `#7BAFD4` (sky), `#5D7CBA` (cornflower), `#C66B9E` (orchid), `#D9613C` (terracotta).
  No green, no neon. Each existing profile gets reassigned deterministically (hash of `id` → palette index) so colors stay stable per user but are spread evenly.
- `AvatarBubble` already renders `profile.color` as the circle fill, so once the values change every person reads as a distinct dot.

**b) Rising background bubbles (`.bubble` in `styles.css`)** — currently all the same lime gradient. Replace with **5 variants** (`.bubble--coral`, `.bubble--peach`, `.bubble--sky`, `.bubble--orchid`, `.bubble--butter`), each its own radial gradient + soft border + warm glow. Update the bubble spawner (wherever `.bubble` divs are generated — likely in `index.tsx` / app shell) to cycle through the variants so the field reads as a happy, multicolor crowd instead of one tint.

**c) Bubble halo behind your own avatar** (`.bubble-halo::before`) — change from lime radial to a soft coral→peach radial so it still highlights "you" but matches the theme.

### 3. Small follow-ups
- The "REC" recording badge in `VideoIntro.tsx` uses `bg-destructive` — already red, fine.
- `.pulse-lime` keeps its class name but, because `--lime-glow` is now coral, it auto-becomes a coral pulse. No code edits needed at call sites.
- Tile-floor pattern stays warm-paper — already correct.

## Files touched
- `src/styles.css` — token redefinitions + 5 bubble variant classes + halo recolor.
- `supabase/migrations/<new>.sql` — update `handle_new_user()` palette + `UPDATE profiles SET color = ...` for existing rows.
- Whichever file spawns the `.bubble` decorations (need to locate during build — candidates: `src/routes/index.tsx`, `src/routes/_app.tsx`, `AppShell.tsx`) to cycle the new variant classes.

## Out of scope
- No layout, copy, typography, or feature changes.
- No changes to the video-intro upload bug (already addressed in the prior plan).
