# Education Pro Assets Manifest

Two static images. Both are wired into components; nothing here is unused.

Every size and measurement below was taken from the file on disk on 2026-08-25
(`wc -c`, `ffprobe`, `ffmpeg ssim`). An earlier version of this manifest quoted
sizes and a motion figure that no shipped file ever had — see "Dropped assets".

Neo-brutalist ground rules both follow: dark navy #1a1a2e, hard-edged pixel
shadows (zero blur), solid black borders, electric lime #BFFF00 / cyan #00FFFF /
pink #FF1493. **Zero baked text**, which is the whole reason one file can serve
all six locales — meaning arrives through `alt={t(...)}` and the surrounding copy.
Keep it that way if either is ever regenerated.

## pro-unlocks.webp — free-vs-Pro comparison

- 66,658 bytes, 1168×880
- Used by `components/education/ProFramingSection.tsx`, above the two tier cards
- Alt: `education.landing.pro.comparisonAlt`

Split composition. Left: stacked classrooms behind padlocks, desaturated. Right:
more classrooms, open, full of students, lime and cyan. It makes the same argument
the cards make below it, in one glance.

## pro-hero-poster.webp — classroom mid-game

- 54,540 bytes, 960×540
- Used by `app/[locale]/teacher/upgrade/PageClient.tsx`, above the pricing cards,
  with `priority` (it is above the fold on the one page that takes payment)
- Alt: `teacher.subscription.proHeroAlt`

Isometric classroom, students at their own devices, letter tiles, mascot centre.
Despite the `-poster` name it is a plain still — see below for why.

## Dropped assets (2026-08-25)

`pro-hero.mp4`, `pro-hero.webm`, `cap-hit.mp4`, `cap-hit.webm`, `cap-hit-poster.webp`
were deleted. Measured, not assumed:

- **`pro-hero` had no motion.** Frames extracted across its four seconds are the
  same picture: SSIM frame-0 vs frame-2s = **0.990** (1.000 is identical). The
  previous manifest claimed 0.418 "confirming visible real motion" — that figure
  does not describe this file. 189 KB of MP4+WebM to deliver what the 54 KB
  poster already delivers, so the poster ships alone.
- **`cap-hit` was static too** (SSIM 0.978), and its doors are already open in
  frame 0, so the "doors swing open" beat it was generated for never happens.
  It also shows *empty* seats — the wrong argument for "unlimited students" — and
  is dominated by `neo-yellow`, which the design system reserves for
  celebration/gold, not generic chrome.

If motion is wanted here later, generate it and verify the same way before
wiring it: extract frames, look at them, and measure. A generation prompt asking
for motion is not evidence that motion arrived.
