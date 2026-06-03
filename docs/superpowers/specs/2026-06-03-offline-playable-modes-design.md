# Offline Playable Modes — Design Spec

**Date:** 2026-06-03
**Author:** Claude (with Ohad)
**Status:** Draft → implementation
**Goal:** Let players open the app and play a defined subset of single-player modes (Blast, Connections, Daily Word Hunt) with **no network**, instead of being blocked by a "Can't reach LexiClash / Retry" wall.

---

## 1. Context & Constraints (the architecture that shapes everything)

LexiClash native (Capacitor) loads a **remote URL** (`server.url: https://www.lexiclash.live`), not bundled assets. The Next.js app is **server-rendered** (`output: 'standalone'`), so we cannot ship the whole app as static local assets. This single fact is why the app "only opens with wifi": with no network the WebView can't reach the remote host, and Capacitor's `errorPath: 'error.html'` shows a dead-end retry screen.

We are **NOT building offline from scratch.** A 6-phase offline data layer already exists (git `2f19f543e`→`b24fd3b74`, Phase 0–3) and is well-tested:

| Existing piece | Location | State |
|---|---|---|
| Offline store (web IndexedDB / native Capacitor-SQLite) | `lib/offline/{index,storage,migrations}.ts` | ✅ done, tested |
| Offline word validation | `lib/offline/dict.ts`, `hooks/fastValidateWord.ts` | ✅ done |
| Bundled dictionaries (5 langs, gzipped) | `public/dicts/*.dict.gz` | ✅ regenerated 2026-06-02 |
| Score-submission queue + sync | `lib/offline/{scoreQueue,sync,serverRevalidate}.ts` | ✅ done, tested |
| Daily-puzzle prefetch cache | `lib/offline/prefetchDaily.ts` + `app/api/daily/prefetch` | ✅ but **wordhunt-only** |
| Service worker (network-first HTML, cache-first static) | `public/sw.js` | ✅ done |
| Offline UI | `components/offline/{OfflineBanner,OfflineSyncBridge,DailyOfflineFallback}.tsx` | ✅ done |

**Mode readiness (verified, not assumed):**
- **Blast** — `lib/blast/v2/useBlastV2.ts` validates synchronously against bundled `level.words`; free-form bonus words (lvl 25+) route through `fastValidateWord` → offline dict. **Engine is offline-ready.**
- **Connections** — puzzles load from bundled static `lib/connections/puzzles/generated/*.generated.ts` ("deterministic runtime load path"). **Data is offline-ready, no prefetch needed.**
- **Daily Word Hunt** — already has `DailyOfflineFallback` + prefetch path. Partially wired.

## 2. Root causes — why offline doesn't work today

Despite all the infra, offline play is broken by **three** specific blockers:

1. **The feature flag is OFF.** `useOfflineModeFlag()` → `usePostHogFlag('offline-mode', false)`. Defaults false; only on via PostHog or `NEXT_PUBLIC_OFFLINE_DEV=1`. The whole layer is dormant in prod.
2. **`NetworkStatusHandler` walls off the entire app.** When `!isOnline && isNative()` it returns `<OfflineFallback>` **instead of `children`** — replacing the whole app with a dead-end retry screen, even if the app JS already loaded and the mode is playable offline. (`components/native/NetworkStatusHandler.tsx:33`)
3. **Native cold-start dead-ends at `error.html`.** On a fresh launch with no network, Capacitor's `errorPath` HTML shows before/instead of the service worker serving a cached shell. Whether the SW intercepts the WebView's remote-URL cold-start navigation **while offline** is a known-uncertain native behavior we cannot verify in this environment.

## 3. Scope

**In scope:** Make Blast, Connections, and Daily Word Hunt openable & playable offline; replace the dead-end wall with a route-aware gate + an offline launcher; queue results for sync on reconnect (reuse existing queue).

**Out of scope (graceful "needs internet" state, not crash):** Multiplayer, leaderboards, social, auth-gated flows, shop/coins, anything requiring live server state. These show a friendly offline notice, never a white screen.

## 4. Approach (chosen) — Extend the existing layer with a route-aware offline gate

Rather than a separate bundled offline app (huge duplication of the polished UI) or a from-scratch PWA, we **finish the in-flight system** and add the missing connective tissue:

1. **Single source of truth: an offline-capable allowlist.** A pure module `lib/offline/offlineCapableModes.ts` exporting the set of routes/modes that work offline + `isOfflineCapable(pathname)`. Consumed by the gate, the launcher, and the SW precache list — no drift.
2. **Route-aware gate (replaces the app-wall).** `NetworkStatusHandler` changes from "offline → wall the whole app" to: *offline + current route is offline-capable → render the game; offline + not capable → show OfflineFallback (now with a "Play offline" CTA back to the launcher).*
3. **Offline launcher.** When offline and the user is at a non-capable route (or the home redirect target), show a branded screen listing the playable-offline modes (Blast / Connections / Daily) as entry buttons, instead of a bare "Retry". Reuses neo-brutalist tokens + Mascot.
4. **SW precache of offline-capable shells.** Extend `public/sw.js` `PRECACHE_ASSETS` / add an install-time precache of the offline-capable route HTML + the root→/{locale} redirect, so a cold offline start has a cached document to serve. (This is the lever that *might* fix native cold-start — see risk below.)
5. **Enable the capability independent of the dormant sync flag.** Split "offline play allowed" from the experimental `offline-mode` PostHog sync flag. Offline *play* (boot + Blast/Connections/Daily) ships on by default for native; the `offline-mode` flag continues to gate the score-sync/reconciliation behavior until proven. Rationale: the sync flag being off must not keep blocking basic offline play.
6. **Wire results offline.** On Blast/Connections/Daily completion while offline, enqueue via existing `scoreQueue.enqueueScore`; existing `OfflineSyncBridge`/`flushQueue` drains on reconnect. Prewarm the dict for the active locale on entry to an offline-capable mode.

## 5. Components & data flow

```
Capacitor cold start (offline)
   └─ WebView → www.lexiclash.live
        ├─ SW registered+active? → serve cached shell  ──┐   (Gap A1: native-verify)
        └─ else → error.html (improved: "Play offline" → deep link into cached launcher)
                                                          │
App boots (cached) ─→ LanguageProvider ─→ NetworkStatusHandler (route-aware gate)
   ├─ online → children
   ├─ offline + isOfflineCapable(path) → children (the game) + OfflineBanner
   └─ offline + !capable → OfflineLauncher (Blast / Connections / Daily buttons)

In-mode (offline):
   Blast/Connections/Daily → play from bundled data + offline dict
        └─ on finish → scoreQueue.enqueueScore(...)  ── reconnect ──> flushQueue → /api/scores/sync
```

## 6. Units (each independently testable)

- `lib/offline/offlineCapableModes.ts` — `OFFLINE_CAPABLE_MODES`, `isOfflineCapable(pathname)`. Pure. **TDD.**
- `components/native/NetworkStatusHandler.tsx` — route-aware gate. **TDD** (render children when capable+offline; fallback when not).
- `components/offline/OfflineLauncher.tsx` — lists offline-capable modes; i18n×5; neo-brutalist. Tested for: shows only capable modes, deep links correct, RTL.
- `public/sw.js` — add offline-capable route precache + the redirect target. (SW logic is hard to unit-test; cover the precache-list construction in a pure helper if extracted.)
- Mode wiring: ensure Blast SP + Connections enqueue scores offline (most already routes through existing hooks — verify + fill gaps).
- `error.html` — add a "Play offline" affordance that navigates into the (cached) app launcher route.

## 7. Error handling & edge cases

- **Dict cold (never loaded online):** `fastValidateWord` already degrades permissive (length ≥ 3). Offline Blast theme words don't need the dict at all; bonus words degrade. Acceptable.
- **Connections offline:** static bundle is always present → fully functional. Submissions queue.
- **Reconnect mid-game:** OfflineBanner flips; queue flushes via existing bridge; no interrupt to play.
- **Non-capable route while offline:** launcher, never blank.
- **i18n:** all new strings via `t()` across en/he/sv/ja/es; RTL for he.

## 8. Risks

- **R1 (load-bearing, native-only): SW cold-start interception.** Whether a SW registered on the remote origin intercepts Capacitor's WebView cold-start navigation while offline cannot be verified in this dev environment. **Mitigation:** (a) precache offline-capable shells so the SW *has* something to serve; (b) keep/extend `error.html` as a manual "Play offline" entry as the fallback path; (c) **mark on-device validation as a required pre-ship gate** — if SW intercept fails on device, the fallback is error.html → deep-link, and a follow-up spec evaluates a bundled mini-shell. The web app and "app-already-loaded-then-dropped" path (Gap 2) are fully fixed regardless.
- **R2: Nightly loop touches these files.** `public/sw.js` is currently uncommitted-modified (cache-name bump). Commit per-phase, verify branch before each commit (memory: daemon switches branches / deletes untracked files).
- **R3: RSC/`_next/data` staleness offline.** Cache-first static + stale-while-revalidate already handle chunks; verify cached navigation within the app doesn't require fresh RSC for the 3 modes.

## 9. Testing strategy

- Unit (Vitest, TDD): allowlist module, NetworkStatusHandler gate, OfflineLauncher rendering/i18n/RTL, any extracted SW precache-list helper, score-enqueue-on-offline-finish for each mode.
- Existing offline suite (`lib/offline/__tests__/*`) must stay green.
- Manual/native (pre-ship gate): cold-start offline launch on a real Android/iOS build → confirm app opens and Blast/Connections/Daily are playable; confirm reconnect flush.
- Gates: `npm run lint && npm run test && npm run build` (frontend tsc as type gate per project convention).

## 9a. Implementation outcome (2026-06-03)

Shipped (TDD, all gates green — verified in-browser where possible):
- `lib/offline/offlineCapableModes.ts` — allowlist + `isOfflineCapable` + `offlineCapableRoutes` (12 tests).
- `components/native/NetworkStatusHandler.tsx` — route-aware gate: offline-capable routes keep rendering on a connection drop; only server-only routes hit the fallback (8 tests).
- `components/native/OfflineFallback.tsx` — now an offline *launcher*: CTAs to Blast/Connections/Daily + `playablePrompt`, i18n×5, RTL (10 tests).
- `hooks/useOfflineModeFlag.ts` — clarified as a **staged PostHog rollout** (recommend native-targeted 1%→100%); `NEXT_PUBLIC_OFFLINE_DEV=1` forces on. Deliberately NOT hard-defaulted-on: it activates a Phase 0–3 score-queue/sync subsystem that has never run in prod — rollout pace is the operator's call.
- `capacitor-assets/error.html` — auto-recovers into the app on `online` event + `/api/ping` poll (no native uncertainty; pure UX win).

**What actually works now:** a **mid-session connectivity drop while on an offline-capable screen** — the gate keeps the in-memory game rendered instead of walling it off. This needs no service worker (React state is already in memory).

**What does NOT work yet — and why:** cold-start offline and offline navigation *between* modes both need the service worker to serve cached route shells + RSC. In-browser verification (Chromium, prod-ish server) revealed the SW layer is currently broken — see §9b. So the launcher CTAs and cold-start are forward-compatible groundwork, gated on the SW fix.

## 9b. Critical discovery — the service worker layer is broken (the true cold-start blocker)

In-browser verification (offline reload + cache inspection) surfaced pre-existing infrastructure bugs that block *all* offline-shell behavior, independent of this feature:

1. **`/sw.js` returns HTTP 500 in dev:** `"A conflicting public file and page file was found for path /sw.js"`. Both `public/sw.js` AND `app/sw.js/route.ts` claim `/sw.js`; Next forbids that. In dev (public served) it 500s → SW never registers → `controller:false`, empty cache, every offline fetch `ERR_INTERNET_DISCONNECTED`.
2. **Dual divergent SW sources:** in `output: 'standalone'`, `public/` is NOT served, so production serves the **inlined copy in `app/sw.js/route.ts` (`CACHE_NAME 'lexiclash-v1'`)** — stale vs `public/sw.js` (`v4`). The "keep in sync" comment was never honored → prod runs a stale v1 SW and any edit to `public/sw.js` never ships.
3. **Root-redirect entry gap:** the WebView entry is `/` → 308 redirect (non-200, uncacheable) → nothing cached to serve on cold offline launch even if the SW worked.

### Recommended SW fix (follow-up, production-verified)
- **Single-source the SW:** move the canonical SW out of `public/` (e.g. `lib/sw/sw-source.js`, not route-matching → kills the `/sw.js` conflict), have `app/sw.js/route.ts` read it (with `outputFileTracingIncludes` so it survives the standalone bundle) and serve with the existing JS headers + a minimal inline fallback if the read fails. Delete the divergent inline copy.
- **Precache offline-capable shells + the locale home(s)** in `install` (resilient per-route; see reverted draft in git history of this branch for the pattern + `offlineCapableRoutes()` as the route source).
- **Navigation fallback** in the `fetch` handler: on a failed `navigate` request that misses exact cache, serve a cached locale shell so the root-redirect entry can still boot offline.
- **Verify in a real production build** (not the dev-fallback that masked this): `next build` → serve → DevTools Offline → reload → confirm boot + offline client-nav fetches cached RSC. Only then is R1 (native cold-start SW interception) the remaining unknown.

## 10. Done criteria

1. With network off and app already loaded (native): navigating to Blast/Connections/Daily renders the game, not the wall.
2. Offline launcher lists exactly the offline-capable modes and deep-links into them.
3. Results completed offline enqueue and flush on reconnect.
4. Non-capable routes show a friendly offline notice, never blank.
5. All gates green; existing offline tests still pass.
6. Native cold-start behavior documented + validated on device (R1) — or fallback path shipped with a tracked follow-up.
