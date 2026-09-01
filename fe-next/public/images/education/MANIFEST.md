# Education Pro Assets Manifest

Two static images. Both are wired into components; nothing here is unused.

> **2026-09-01 — the whole education art set was regenerated.** Read
> "Education hero set" at the bottom before regenerating anything here: the seven
> shipped files were drawn with **six different mascots**, none of them Lexi, and
> four had garbled text baked in. The rules below exist because of that.

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

- 69,260 bytes, 960×540 (regenerated 2026-09-01; was 54,540 bytes and showed a
  **green pixel robot** instead of Lexi)
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

**Motion on the education landing is now solved without new assets:** the hero's
right column carries `<Mascot variant="scholar">` (`/mascot/scholar.webp`, 98
frames, 181 KB, already in the shipped mascot set). It is clipped to a circle on
purpose — that file has an OPAQUE dark background and unclipped it punches a
dark rectangle through the mock's leaderboard card.

## Education hero set (one directory up, in `public/images/`)

Regenerated 2026-09-01. `education-hero-{en,he,sv,ja,es}.{webp,jpg}` +
`education-access-hero.webp`. Every one of them previously showed a **different**
character — a green blob, a cat, a blue tile-person, a cube-head — and none was
Lexi. Four had garbled text baked in: the Hebrew board read as nonsense
(`דן כותץ`, `שול מח ישוברם`), the Spanish said `SPANISH EDUCTA!` over a fake word
grid, the Japanese page carried `KOREAN` and `PLIDY`.

| File | Bytes | Dimensions | Lexi's pose |
|---|---|---|---|
| `education-hero-en` | 60,192 webp / 111,035 jpg | 1200×675 | reading, glasses |
| `education-hero-he` | 66,738 / 118,143 | 1200×675 | cheering at a lime cube |
| `education-hero-sv` | 74,148 / 124,478 | 1200×675 | at the board with chalk |
| `education-hero-ja` | 78,512 / 133,361 | 1200×675 | grad cap, mid-jump |
| `education-hero-es` | 75,868 / 132,546 | 1200×675 | holding a trophy |
| `education-access-hero` | 63,626 webp | 918×880 | grad cap, waving on a podium |

Rules for anyone regenerating these:

- **Locale variants differ by POSE, never by glyph.** No Hebrew, Japanese, or
  Swedish characters in the art. These files are also the OpenGraph/Twitter cards
  for ~14 SEO routes, so a garbled glyph gets scraped and cached by Google and
  Facebook — which is how the last set's nonsense Hebrew ended up as the share
  card. Letter cubes carry single capital **Latin** letters only.
- **Composition must survive a brutal crop.** `EducationHeroBanner.tsx` renders
  the `<img>` as `absolute inset-0 object-cover` inside a `<picture>` that
  contributes zero height, so the section's height comes from its text block
  (~350 px at ~1150 px wide ≈ 4:1). Only the middle horizontal band is visible
  on the page; the full 16:9 frame is only ever seen as an OG card. Put Lexi
  vertically centred and right of centre, fill the left half with classroom, and
  keep the extreme top and bottom edges free of anything load-bearing.
- **Both formats.** `<source srcSet={webp}>` with an `<img src={jpg}>` fallback —
  replacing only the webp leaves the old art being served to some clients.
- **Byte budget is real.** That `<img>` is `loading="eager" fetchPriority="high"`,
  the LCP element on 9+ pages. Stay at or under the numbers above.
- `ru` has no bespoke asset and deliberately reuses `en` (see
  `EducationHeroBanner.tsx` and `heroImage()` in `lib/seo/educationLanding.ts`).
