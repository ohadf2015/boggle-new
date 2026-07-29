# Homepage LCP / slow-loading — root cause + fix

**Date:** 2026-06-07
**Symptom:** "performance issues and slow loading times across the app"

## Evidence (primary source — real users, `web_vitals` table, last 7d, 7,162 rows)

| metric | p75 | threshold (good/poor) | % poor |
|---|---|---|---|
| **LCP** | **4981 ms** | 2500 / 4000 | **31.2%** |
| CLS | 0.30 | 0.10 / 0.25 | 28.7% |
| FCP | 1848 ms | 1800 / 3000 | 13.3% |
| TTFB | 1040 ms | 800 / 1800 | 12.8% |
| INP | 264 ms | 200 / 500 | 8.3% |

Worst high-traffic routes by LCP p75: `/en` 5784 (n153), `/he` 5644 (n143), `/en/multiplayer` 8238 (n96), `/es/multiplayer` 5515 (n110).
**Desktop LCP (5388) WORSE than mobile (4612)** — rules out bandwidth; points at render/main-thread.

### Ruled out (with proof)
- **Realtime WAL→JSON parser** (82% of `pg_stat_statements` total) is a **197-day cumulative** stat (window since 2025-11-21) with **zero active replication slots** and an **empty `supabase_realtime` publication** now → already remediated, NOT current load. Do not touch realtime; do not reset stats.
- TTFB p75 ~1s is secondary; the LCP gap (≈3.9s) is client-side, not SSR.

## Root cause (measured via Playwright LCP trace on prod, both viewports)

The largest above-the-fold elements are **hidden until JS hydration completes**:

1. **`components/daily/DailyChallengeBanner.tsx`** (desktop LCP element = `/modes/daily.png`):
   - L185-203: pre-hydration returns a skeleton whose base class includes **`opacity-0`** → the SSR HTML for the banner is invisible. `isClient` flips only after hydration.
   - L270-271: the banner image `m.div` starts `opacity: 0`, revealed by framer-motion `whileInView` spring → needs hydration + IntersectionObserver + spring.
   - Double-gated → LCP cannot fire until full hydration (~5s on desktop).
2. **`components/landing/ModeCard.tsx`** (mobile LCP element = `/modes/practice.png`):
   - L295-296: mode image `m.div` `initial={{ scale:0.6, opacity:0, y:20 }}` + `whileInView` → same opacity-0-until-hydration block.
   - Image (L311) has no `priority` → fetch deprioritized.

framer-motion serializes `initial` into SSR HTML, so the server literally ships invisible content. Desktop is worse because it also eagerly mounts `PlayfulBackground intensity="high"` (LandingView L179), pushing hydration later.

## Fix (TDD)

Goal: the LCP element paints at SSR / first paint, not post-hydration. Keep the pop (scale/slide) — only stop hiding via opacity.

1. New shared `lib/landing/modeImageEntrance.ts` — entrance config that **stays visible** (`opacity:1`; subtle `scale`/`y` pop), single source for ModeCard + DailyChallengeBanner. Locks the regression with a test asserting it never hides via opacity.
2. `ModeCard.tsx`: use shared entrance; add `priority?: boolean` prop → passes `priority` to the mode `<Image>`.
3. `DailyChallengeBanner.tsx`: remove `opacity-0` from the `!isClient` skeleton (paint a visible skeleton at SSR); use shared entrance; image `priority`.
4. `LandingChallengeCards.tsx`: pass `priority` to the first above-the-fold mode cards (arena, practice) — the LCP candidates. Daily banner image is always priority.

### Tests (RED → GREEN)
- `modeImageEntrance.test.ts`: `initial.opacity` is not 0 (visible) and equals whileInView opacity → no opacity reveal.
- `ModeCard` perf test: `priority` prop → rendered `<img>` is `fetchpriority="high"` and not `loading="lazy"`.
- `DailyChallengeBanner` perf test: pre-hydration skeleton className has no `opacity-0`; image is priority.

### Validation
- `npm run lint && npm run test:frontend && npm run build` green.
- Post-deploy: re-run Playwright LCP trace on `/en` + `/he`; expect LCP element to paint at first paint (no hydration gate) and p75 to fall under 2.5s over the next days in `web_vitals`.

## Out of scope (noted, not done)
- CLS 0.30 is dominated by **ad insertion** (AdSense/AdMob), not in headless trace; prior work already reserves ad slot heights. The SSR-paint fix also reduces the cards-swap CLS as a side effect.
- Multiplayer hero (`arena-hub-hero.jpg`, 147KB) painted 1.6s in fast trace; real 8.2s is image-weight on slow networks — separate follow-up (responsive/priority).
- `web_vitals` reporter does not capture the LCP element in metadata — add `attribution.element`/`url` for future diagnosis (follow-up).
