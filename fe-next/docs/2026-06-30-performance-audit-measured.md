# Performance Audit — Measured, Not Inspected (2026-06-30)

Goal: "improve all the performance in the app." Approach: **measure before refactoring** — every
prior perf incident in this repo's memory shows static-inspection "gaps" that turned out false
(word-wheel "input delay" REFUTED on real-browser; "uncompressed HTML" a CDP ghost; ~40% of a
notification audit's "gaps" false). So each hypothesis below was *verified*, not assumed.

## Headline

**Every surface that can be measured here is already well-optimized — verified, not assumed.**
- **Bundle:** lean (first-load ~225KB gzip shared; heavy chunks lazy + route-scoped).
- **DB/server:** clean (idle, realtime publication empty, no rogue subs/sockets).
- **Landing hydration (real browser, prod build):** TBT **53ms** — Google "good" band.

Nine candidate levers were investigated; all nine were either already handled or measurement
artifacts. There is **no large, safe, unaddressed win** in bundle, DB, or landing hydration.

**The one thing NOT verifiable in this environment:** INP during a *live, authed multiplayer game*
(memory: ~253ms tree re-render on interaction). It needs a backend-connected, real-device session
with a CPU flame chart — high-regression-risk (Class-3 reconnect/rehydrate paths) and not
reproducible headlessly. Do it only with that trace in hand; a blind refactor here would be guessing.

## Verified findings (hypothesis → evidence → verdict)

| # | Hypothesis (from static map) | Evidence | Verdict |
|---|---|---|---|
| 1 | Landing hooks open Supabase **realtime** subs (WAL cost) | Traced all 6 landing hooks: `useLiveRoomStats` (socket poll), rest are one-shot fetch/RPC/localStorage. No `.channel().on('postgres_changes')` anywhere. | **REFUTED** — zero realtime on landing |
| 2 | `user_notifications` in `supabase_realtime` publication (the 94.82%-CPU table) | `SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime'` → **empty** in prod | **CLEAN** — auto-remediation (pg_cron jobid 24) already dropped it |
| 3 | Realtime WAL parser = 70% of DB CPU | `pg_stat_statements`: top 2 queries (`SELECT wal->>…`) = 70.7%, BUT absolute ≈ 98s CPU/day ≈ **0.1% sustained** on a pre-traction idle DB | **GHOST** — 70% of near-zero. Not a bottleneck |
| 4 | Landing opens a websocket per visitor (room count) | `SocketProvider` only mounts on game routes; `useLiveRoomStats` gets null context on landing → graceful no-op | **REFUTED** — no socket on landing |
| 5 | `moment.js` (+all locales) = 6.3MB chunk | Not a dependency (`npm ls moment` empty). The grep "moment 80×" was a minified-substring false positive | **REFUTED** — moment absent; `date-fns` v4 is the date lib |
| 6 | `three.js` (~1MB) eager in grid-game bundle | `three` is transitive only via `@vfx-js/core`, which `useVFXShader.ts:43` **already loads via `await import()`**. Type-only import on line 15 (erased). | **ALREADY OPTIMAL** — three.js behind a dynamic boundary |
| 7 | `recharts` (v3, heavy) eager | All 5 `*ChartInner.tsx` loaded via `() => import(...)` (next/dynamic) | **ALREADY LAZY** |
| 8 | Sentry Replay (~50KB) eager app-wide | `integrations: [browserTracingIntegration]` only — no `replayIntegration`. Replay sample rates 0. Session replay is LogRocket (deferred 3s). | **ALREADY TRIMMED** |

## What's actually true (the measured baseline)

- **First-load JS shared by all routes:** 741 KB uncompressed / **~225 KB gzip** (react-dom 195KB +
  a 467KB shared chunk = framework + lean Sentry core + i18n + app shared code). Reasonable; not bloated.
- **Heavy chunks are lazy + route-scoped:** the two largest on-disk chunks (6.3MB, 3.2MB
  uncompressed) are async/game/admin chunks (pixi game engine, charts, vfx) — paid only by users
  who hit those routes, not app-wide.
- **next.config already has:** `reactCompiler: true` (auto-memo), `optimizePackageImports`
  (lucide/framer/date-fns/radix), image WebP/AVIF + 1y cache, Sentry treeshake. `<Link>` prefetch off.
- **DB/server:** idle (pre-traction). Realtime publication empty. No rogue subscriptions or sockets.

## Runtime hydration — MEASURED (real browser, production build)

Built the worktree to a runnable prod build, ran `next start` on :3010, and read the browser's
Performance API (longtask + LCP observers, `buffered:true`) on a fresh load — a real runtime number,
not CPU profiling.

| Metric (local prod build) | Landing `/en` | Multiplayer `/en/multiplayer` |
|---|---|---|
| FCP | 244ms | 144ms |
| LCP | 576ms | 236ms |
| Long tasks during hydration | 4 | 0 |
| Max single long task | 94ms | 0 |
| **Total Blocking Time** | **53ms** | **0ms** |

- **MP's 0 long tasks is NOT a "fast" verdict** — the local server has no Supabase/socket env, so
  the guest lobby renders thin. This number under-represents real authed MP.

### CPU-throttled (the profile that matters — this is a phone game)

Unthrottled desktop numbers are misleading for a phone-first audience. Re-measured landing under
CDP `Emulation.setCPUThrottlingRate` (4× = Lighthouse mid-tier mobile, 6× = low-end):

| Landing `/en` | TBT | LCP | Long tasks | Max task |
|---|---|---|---|---|
| 1× (desktop) | 0ms | 252ms | 0 | 0 |
| **4× (mid mobile)** | **208ms** | 524ms | 3 | 180ms |
| **6× (low-end)** | **551ms** | 1076ms | 6 | 262ms |

So on real phones the landing **does** carry a hydration tax: TBT crosses Google's "good" line
(200ms) at 4× and hits 551ms at 6×. The desktop "53ms good" verdict was a measurement-profile error.

**Attribution (CPU profile, 6× throttle, ~702ms sampled hydration window):**
- **~467ms `(native)`/`(program)`** — JS parse/compile/GC. Broad bundle-eval cost, amplified by the
  throttle. No single hot function; reduced only by shipping/evaluating less root JS.
- **~66ms react-dom (chunk 36782149)** — reconciler hydrating the tree. Inherent to a large client tree.
- **~66ms locale-layout client chunk** — providers/auth init (minified line attribution is broad, not
  a single deferrable call).

**Verdict:** the mobile cost is **broad** (parse/eval + hydration of a large client tree), not one
deferrable hot spot. No safe one-line win. Real reduction is **structural** and carries real risk:

1. **Double-tree hydration.** `LandingView` renders BOTH the mobile `HomeHub` (`md:hidden`) and the
   full desktop tree (`hidden md:flex`); CSS-gated, so every device hydrates both. Single-tree render
   would cut hydration work — BUT the CSS-gate is deliberate (avoids the hydration-CLS/#418 a JS
   viewport-branch caused). Needs care to not reintroduce that bug.
2. **RSC-ify static SEO sections.** `LandingSEOSection` + `LandingBlogSection` are static client
   imports inside the `'use client'` `LandingView`, so they hydrate. They're non-interactive SEO
   content — rendering them as Server Components (siblings in `(home)/page.tsx`, outside LandingView)
   would drop them from the hydration tree with identical HTML (no CLS, SEO preserved). Moderate refactor.
3. **Reduce root client JS / provider stack** — 13 sync providers wrap every route; each is
   load-bearing, so this is delicate.

These are scoped projects with regression risk against documented fixes — not blind one-liners. Do
with re-measurement (this same throttle harness) before/after, not on inspection.

## Attempted fix + rigorous before/after (the empirical verdict)

Shipped safe code-splitting across 6 files: interaction-gated modals/overlays → `next/dynamic`
({ssr:false}) **and** conditional render on open-state (SeasonClaim [all routes], AuthModal
[landing/brain/profile/referrals], ShareReferral [landing], HostLeftGrace [multiplayer]). All green:
tsc 0, lint 0, parent tests pass.

Measured before/after, **same commit, same harness, 5 warm samples each, 4× CPU throttle:**

| Route | Baseline TBT | After (dynamic only) | After (dynamic + conditional render) |
|---|---|---|---|
| `/en` (landing) | 182ms | 186ms | 174ms |
| `/en/brain` | 347ms | 359ms | 359ms |
| `/en/multiplayer` | 165ms | 165ms | 160ms |

**Verdict: CPU-bound TBT is flat (all within sample noise).** Deferring ~40-50KB of modals does not
move TBT because the cost is the **core first-load bundle parse (~467ms @6× via CPU profile) +
react-dom hydration** — already lean (225KB gzip) and load-bearing. The modals are noise against it.

**What the changes DO improve:** fewer bytes downloaded on initial load (modal chunks fetch on
interaction, not on mount) — a **network/download** win for slow mobile connections that a
localhost CPU-throttle harness cannot measure. Standard best practice; kept.

**Honest conclusion:** there is **no safe, quick code change that demonstrably improves mobile CPU
TBT** on this app — it is already well-optimized; the remaining cost is the irreducible core
framework+app bundle parse on a throttled CPU. A demonstrable TBT win requires **architectural**
work: RSC migration of static subtrees (so less hydrates) or trimming the 13-provider root stack —
major, higher-risk projects, each to be done with this before/after harness. Single-tree landing
render is NOT viable (SSR has no viewport → either drops above-the-fold SSR content = SEO/LCP/CLS
regression, or reintroduces the #418 the CSS-gate prevents).

## The one real remaining lever (NOT done here — needs a real-device trace)

Per repo memory: felt-perf is **main-thread JS during hydration → LCP render-delay / INP**,
worst on `/multiplayer` (652-line PageClient, 8 socket/game hooks mount synchronously; INP ~253ms
from tree re-render). This is a *runtime* cost, not bundle size — none of the above touches it.

**Why not fixed blind:** (a) `/multiplayer` LobbyView is SSR'd, so the LCP element likely paints from
server HTML — deferring client hooks may optimize the wrong metric; (b) splitting the socket flow is
Class-3 "asymmetric paths" territory (reconnect/rehydrate regressions); (c) not headlessly
reproducible — needs real-device CPU profiling to target the actual long task. Recommend a measured
follow-up: capture a real-device performance trace on `/multiplayer`, identify the longest hydration
task, then defer/memoize *that specific* work.

## Process note

This audit cost ~4 build attempts (concurrent-session `.next/lock` contention + analyzer OOM at
6–8GB heap). Worked around via detached git worktree with symlinked `node_modules` + plain build,
then read chunk sizes directly off `.next/static/chunks` + `build-manifest.json` (no analyzer needed).
