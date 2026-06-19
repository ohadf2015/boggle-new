# Frontend Performance Audit — fe-next

**Date:** 2026-06-19 · **Scope:** `--frontend` (bundle, re-renders, images/assets, network/async)
**Stack:** Next.js 16 (App Router) · React 19 (+ React Compiler) · TS · Tailwind · Express + Socket.IO
**Method:** 4 parallel read-only investigation agents + direct verification of headline claims.

## TL;DR

The app is **already well-optimized** on the hard things: 138 files use `next/dynamic`/`React.lazy`, pixi.js is lazy-loaded (not first-load), bundlewatch enforces 250KB JS / 50KB CSS gzip, AVIF/WebP + 1yr immutable caching configured, fonts use `next/font` with `display:swap` + locale-split preload, React Scan is dev-gated, contexts mostly memoized, queries parallelized/paginated, compression on.

**Biggest real wins are small:** a handful of context/hot-render memo fixes, an auth round-trip migration already half-done, one missing cache header, and ~150MB of **deploy/repo bloat** (marketing + dead assets) that does NOT hurt page load but slows builds/deploys.

---

## P0 — High impact, low effort

### 1. `AdMobContext` value not memoized — re-renders ALL `useAdMob()` consumers
`contexts/AdMobContext.tsx:195` — value object built inline every render.
**Fix:** `useMemo(() => ({...}), [tier, authResolved])`. ~5 min.

### 2. Missing `Cache-Control` on word-tower leaderboard
`app/api/word-tower/leaderboard/route.ts:61` — top-50 (mostly static) hits DB every request, no cache header.
**Fix:** `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`. 1 line.

### 3. Dead/marketing assets bloating the deploy image (NOT page perf)
`public/` is **592MB**. Breakdown of the non-user-facing bulk:
- `public/images/promo/` = **94MB** — Remotion render inputs (`WordHuntPromoVideo*.tsx`), never served to players.
- `public/images/blog/` = **33MB** — unoptimized blog JPGs (some 2.5MB); served, but `next/image` re-encodes on demand.
- `public/mascot/originals/` = **15MB** — **zero code references; dead.**
**Fix:** Move promo render-inputs out of `public/` (or to a non-deployed dir); delete `mascot/originals`; let `next/image` keep handling blog. Cuts deploy image ~140MB, faster builds. Low effort, zero player-facing risk.

---

## P1 — Medium impact

### 4. `CompactLeaderboard` O(n×m) `find()` in hot render
`components/game/CompactLeaderboard.tsx:295` — `scoreChanges.find(...)` per player per race-tick (~100ms cadence).
**Fix:** precompute `useMemo(() => new Map(scoreChanges.map(c => [c.username, c])), [scoreChanges])`, then `.get(username)`.

### 5. `auth.getUser()` overused on read-only GET routes
**106** `auth.getUser()` calls across 61 `app/api/**/route.ts` (each 50–200ms network round-trip). A faster `getAuthedUser()` (local JWT verify, sub-ms) exists but is used in only ~10 routes. See `.claude/rules/50-supabase-perf.md` + memory `auth-getuser-refactor-playbook`.
**Fix:** migrate read-only GETs to `getAuthedUser()`; keep `auth.getUser()` for mutations. Systematic, medium effort. Start with hot paths: `coins` GET (`route.ts:145`), events.

### 6. Sequential auth + dependent query in events route
`app/api/events/route.ts:7-29` — events fetch, then `auth.getUser()` (sequential), then participants. ~100–300ms cold.
**Fix:** `Promise.all([eventsQuery, userQuery])`; cache the non-user-specific events list (60s TTL).

### 7. Celebration videos delivered per-game (already lazy, verify attributes)
`components/mascot/MascotCelebrationVideo.tsx` — `/mascots/celebration-*.mp4` (2.6–5.7MB each, 55MB dir). Post-game only, not first-load. Confirm `preload="none"` + poster so they don't pre-fetch before the result screen renders.

---

## P2 — Low impact / hygiene

- **8. Animation/audio lib redundancy** — deps carry gsap + framer-motion + @react-spring; howler + tone + use-sound + @pixi/sound; 6+ confetti/particle libs. Audit actual usage, drop unused. (Bundle is already split, so impact is modest, but reduces surface.)
- **9. Dead `transpilePackages` entries** — `next.config.mjs:106-109` lists three/@react-three/* which are NOT in package.json. Delete 4 lines.
- **10. `framer-motion` + `date-fns` in BOTH `optimizePackageImports` and `transpilePackages`** (`next.config.mjs:85-116`) — transpile can blunt tree-shaking; pick one.
- **11. Remotion in `dependencies`** — if build/server-only, move to devDependencies to keep client install lean.
- **12. `ToggleGroupContext` inline value** (`components/ui/toggle-group.tsx:67`) — minor; memo only if profiling flags it.
- **13. Auth-callback polling race** (`app/[locale]/auth/callback/PageClient.tsx:223,239`) — overlapping `setInterval`/`setTimeout` session checks; guard with an in-flight flag.
- **14. `check-asset-sizes.ts`** only scans `public/assets/` — most heavy assets live in `public/images|music|mascots`. Widen the scan dir.

---

## Verified as healthy (no action)

- pixi.js lazy via `await import('pixi.js')` inside `mount()` — not in first-load.
- `LanguageProvider`, `GridCell`, `CompactLeaderboard`, `BlastMPLeaderboard` already `memo()` + memoized values.
- `useGridInteraction` drag setState is cell-gated (ref-based, fires only on cell change).
- Socket handlers use refs + memoized closures; Zustand uses selective selectors; leaderboard updates throttled 150ms.
- No N+1 loops, no unpaginated payloads, no unawaited promises in critical paths; Express `compression()` on.
- React Scan double-gated (`NODE_ENV==='development'` AND `NEXT_PUBLIC_ENABLE_REACT_SCAN`). *Verify the flag is unset in prod env.*

---

## Recommended order (impact ÷ effort)

1. **#1 AdMob memo** + **#2 leaderboard cache header** + **#9/#10 next.config cleanup** — ~30 min, all trivial.
2. **#3 strip promo/dead assets from deploy** — biggest size cut, zero risk.
3. **#4 CompactLeaderboard map** — fixes a real per-tick cost in MP races.
4. **#5/#6 auth round-trip migration** — best latency ROI but ongoing; do hot paths first.

## Profiling next steps (measure, don't guess)
- `npm run build:analyze` (ANALYZE=true) → confirm first-load JS per route against the 250KB budget.
- `npm run lighthouse:ci` (mobile+desktop configs already present) → baseline LCP/INP/CLS.
- React Scan in a local MP game → confirm #1/#4 fixes drop re-render counts.
