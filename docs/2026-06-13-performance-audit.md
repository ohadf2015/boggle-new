# Performance Audit — 2026-06-13

Goal: find the slowest parts (frontend + backend), fix the "app feels stuck" symptom
(slow page transitions, loading, skeletons). Grounded in **real-user telemetry**, not guesses.

## Telemetry baseline (web_vitals table, p75, last 14 days)

| Metric | Worst routes (p75) | Verdict |
|---|---|---|
| **LCP** | `/en/multiplayer` 7837ms · `/en` 6080ms · `/he` 5429ms · `/he/daily` 5326ms | 🔴 POOR (>4000) on ~every route |
| **TTFB** | `/en/multiplayer` 1767ms · `/en` 1199ms · `/en/daily` 995ms | 🔴 slow server (>800) |
| **INP** | `/es/multiplayer` 440ms · `/en/multiplayer` 400ms | 🟡 needs-work (>200) |

Device split on `/en`: **desktop LCP (6562ms) ≥ mobile (5846ms)** → the dominant cost is
**JS bundle download/parse + hydration**, not mobile network/images. (Fast desktop still 6.5s.)

LCP attribution (navigationTiming) shows two distinct failure modes:
- TTFB spikes (one sample: `request` phase 8.6s) → server-side SSR blocking.
- Render gap (956ms domInteractive → 3428ms LCP = 2.5s) → client JS after DOM ready.

## SHIPPED — landing SSR data cache (TTFB win, scalable)

**Problem:** `/[locale]` renders as `ƒ` (Dynamic, not ISR), so `fetchLandingData()` ran on
**every request**: 1 sequential `get_current_season_id` RPC + 4 queries against a
CPU-saturated DB. That is the landing TTFB tail.

**Fix:**
- New reusable `fe-next/lib/cache/ttlCache.ts` — in-process TTL cache with single-flight
  coalescing + injectable clock. 6 TDD tests. Reusable for any per-locale/non-realtime SSR fetch.
- `fetchLandingData()` wrapped with a 30s per-locale cache → DB load drops from
  O(requests) to O(locales / 30s).
- Named the SSR `Promise.race` timeout `SSR_LANDING_DATA_BUDGET_MS` (1500ms) — now a
  cold-miss safety net, not a per-request tax.

**Verified (prod build + `curl localhost:3001/en`):** TTFB **638ms (cold miss) → 48ms (cache hit)**.

## INVESTIGATED, NOT SHIPPED — landing JS bundle (the LCP driver)

Landing eagerly loads **~6 MB JS across ~59 chunks** (the desktop-LCP cause). Attempted to
code-split socket.io and pixi.js off the landing via `next/dynamic`. **Reverted** — proven
ineffective: `curl /en` shows socket.io + pixi as eager `<script>` tags *even though
`GameSpecificProviders` never renders on `/en`*. The landing **legitimately uses** these libs
(`useLiveRoomStats` WebSocket; FX layers), and Turbopack groups them into shared chunks, so
splitting one importer cannot remove them. A real win needs deeper work:
- Defer the `useLiveRoomStats` socket connection until below-the-fold / interaction.
- Investigate the 4 largest chunks (541/531/472/445 KB) via `npm run build:analyze`.
- Gotcha learned: static manifests (`*_client-reference-manifest.js`) **cannot** distinguish
  eager from lazy chunks under Turbopack — verify bundle wins by `curl`-ing SSR HTML and
  checking `<script>` presence, or Lighthouse, not manifests.
- **Tooling blocker (2026-06-13):** `@next/bundle-analyzer` is a webpack plugin and is a **no-op
  under the Turbopack build** — `ANALYZE=true npm run build` produces no `.next/analyze` treemap.
  To analyze, run a one-off webpack build (Turbopack disabled) for the treemap, or boot prod +
  `curl /en` and size the `<script>` set. socket.io (~48KB, via
  `LandingView → useLiveRoomStats → useSocketOptional → SocketContext`'s static `socket.io-client`
  import) is only ~0.8% of the 6MB — not worth a `SocketContext` split. The weight is the 4
  largest chunks (~2MB); needs the treemap to target safely.
- **Status: deferred to a dedicated effort** — high effort, Turbopack-uncertain payoff, landing
  files under active concurrent edits. This is the largest remaining LCP lever.
- **TREEMAP OBTAINED (2026-06-13):** `next build --experimental-analyze` IS the Turbopack-native
  analyzer (the webpack `@next/bundle-analyzer` is the no-op). Output: `.next/diagnostics/
  route-bundle-stats.json` (per-route `firstLoadUncompressedJsBytes` + `firstLoadChunkPaths`) and
  `.next/diagnostics/analyze/`. Landing `/[locale]` = **7,068,292 bytes (7 MB) first-load JS / 65
  chunks**. Top chunks: 5× ~415–541KB dominated by **posthog-js + d3**, 2× ~330–415KB = **pixi**.
  **Defer targets (concrete):**
  1. **posthog-js — SHIPPED 2026-06-13 (lazy proxy). ~198KB raw / ~60KB gzipped off EVERY route's
     eager parse path.** Root: 23 modules did `import posthog from 'posthog-js'`, so Turbopack
     hoisted the lib into the shared-commons chunk (it shipped on all 199/203 routes incl `/blog/*`,
     same wall-shape as pixi). Unlike pixi, posthog's API is narrow (capture/identify/register/
     people/getFeatureFlag/onFeatureFlags/opt) and NOBODY consumes the `usePostHog()` React context
     (all 8 flag hooks use the local `usePostHogFlag`, which reads the singleton and already guards
     `typeof posthog?.getFeatureFlag !== 'function'` → default). So a drop-in lazy proxy was feasible:
       - NEW `lib/analytics/lazyPosthog.ts` (TDD, 11 tests): default export with the same method
         surface, NO static `posthog-js` import. `init()` triggers a one-time `import('posthog-js')`;
         fire-and-forget calls buffer (capped) + flush in order AFTER init (so pre-consent events
         still hit the `opt_out_capturing_by_default` instance and drop — GDPR preserved); sync
         `getFeatureFlag` returns undefined until load; `onFeatureFlags` callbacks queue then wire.
       - All 23 `import posthog from 'posthog-js'` → `@/lib/analytics/lazyPosthog`. PostHogProvider
         drops the `posthog-js/react` PHProvider wrapper (0 context consumers) and triggers the lazy
         load in its EXISTING mount effect (conservative: preserves `web_vitals_attribution` LCP
         capture timing — do NOT idle-defer init or you blind the nightly perf-watch).
       - Completeness gate (the make-or-break, mirrors how the pixi wall was proven): after the swap
         `grep "from 'posthog-js'"` returns only a type-only import + comments. Oracle: rebuild
         `--experimental-analyze` + tight lib-signature (`__PosthogExtensions__|rrweb|loaded_recorder`)
         → **real posthog lib in 0/203 firstLoad**; `curl :3001/en` served `<script>` set → **0 eager
         heavy-posthog scripts**. The lib is now a 198KB/60KB-gz lazy chunk loaded on first init.
       - Test maintenance: 27 suites that `vi.mock('posthog-js')` re-pointed to
         `vi.mock('@/lib/analytics/lazyPosthog')` (the real new dependency) — assertions unchanged.
       - GOTCHA: a broad signature (`opt_out_capturing_by_default`) FALSE-POSITIVES on the app-shell
         chunk that holds PostHogProvider's literal init-config string + web-vitals code (184KB). Use
         lib-internal markers (rrweb/__PosthogExtensions__) to measure the actual library, not config.
  2. **pixi (~744KB) — ATTEMPTED 2026-06-13, PROVEN INFEASIBLE via source-level dynamic import.**
     Tried `dynamic(() => import(...), {ssr:false})` on BOTH landing-eager FX mounts
     (`SharedFxMount`, `GlobalCoinEarnFx` in essential-providers). Result: landing firstLoad moved
     **−8KB** (just the mount-component code); pixi stayed. THREE independent signals agree it's a
     Turbopack **shared-commons chunk**, not a per-route import:
       - `route-bundle-stats.json`: **641KB pixi present in EVERY route's firstLoad — incl. `/blog/*`
         static articles that import zero game/FX code.** A per-route import could never appear on a
         blog page → it's one global commons chunk fed by the *union* of all importers.
       - `curl localhost:3001/en` + sizing the served `<script>` set: **640KB pixi genuinely served
         eagerly** (4 chunks, 468KB dominant) — confirms it's real download weight, not a manifest
         over-count.
       - Static-import reachability walk from all shell roots (conditional-providers, locale layout,
         PageClient, page): **0 eager source paths to `pixi.js`.** Nothing in the landing source tree
         statically imports pixi — Turbopack hoisted it because **40+ route-split modules** (blast,
         adventure, wordcraft, wordtower, daily wheel, results, gameEngine, SharedFxApp) each
         statically `import 'pixi.js'`, making it "common enough" to put in the always-loaded chunk.
     **Why there's no clean cut:** the commons chunk dissolves only if ALL ~40 importers defer pixi;
     cutting any subset (e.g. just SharedFxApp) leaves the other 39 edges → chunk stays. The only
     real levers are (a) Turbopack chunk-grouping config (webpack `splitChunks` cacheGroups has no
     clean Next-16-Turbopack equivalent), or (b) lazy `await import('pixi.js')` inside all 40+
     importers incl. hot game paths — infeasible/high-risk for ~200KB gzipped. **This is a wall, not
     a TODO. The "feels stuck" symptom was already addressed by the mascot LCP fix + TTFB cache;
     pixi sits behind game routes that legitimately need it.** (The mount-defer was reverted — it
     was inert; shipping it would mislead like the socket split would have.)
  3. **d3:** NOT directly imported by landing (recharts importers are all `*ChartInner` = lazy);
     it's Turbopack vendor-chunk grouping with the still-eager posthog. Will NOT fall out on its own —
     same commons-chunk dynamic as pixi; tied to the (separate, TDD-gated) posthog effort.
  **METHOD CAVEAT:** verify bundle wins by `curl localhost:3001/en` + sizing the served `<script>`
  set AND cross-checking `route-bundle-stats.json` per-route (a lib on a feature-less route like
  `/blog/*` = proof of a shared-commons chunk that source-level `dynamic()` cannot split). Manifests
  alone lie under Turbopack.

## INFRA — Supabase Realtime WAL decode = 83% of DB CPU (cost/headroom, NOT latency)

`db_perf_top_query_audit`: top 2 queries (`SELECT wal->>... as type,schema,table`) = **63.1% +
20.1% = 83.2%** of total DB CPU, ~1M calls/window. Cause: 2 active Realtime replication slots
with **0 subscriptions and 0 published tables** — the Realtime server decodes every high-churn
write (`profiles.last_seen_at`, `web_vitals`, `analytics_events`) then discards it (nothing
published). This is **wasted CPU/cost, not a query-latency cause** (app queries measure 1–7ms
even under this load). Remediation (infra, needs care):
- Investigate disabling unused Realtime "Postgres Changes" / "Broadcast from DB" if no feature
  consumes them (Supabase dashboard — outward-facing, do not blind-change).
- **SHIPPED** — `profiles.last_seen_at` write throttle. Root cause was write *amplification*:
  `useFriends` is mounted by several always-present components (GlobalBottomNav, HeaderMobileMenu,
  FriendsActivityFeed, FriendActivityRow), each running its own 2-min interval → one user emitted
  N `UPDATE profiles SET last_seen_at` writes per cycle (each with an auth.getUser round-trip).
  Added a module-level shared throttle (`utils/onlineStatusThrottle.ts`, 4 TDD tests): ≤1 write
  per 90s window across all mounts. 90s < the 5-min online threshold, so presence stays accurate.
  Cuts both the profiles writes feeding the WAL decoder and the Auth round-trips.

## BACKEND — auth.getUser() round-trips (investigated 2026-06-13)

The 50–200ms `auth.getUser()` Auth round-trip. Findings:

1. **Per-request middleware — ALREADY FIXED.** `proxy.ts:116-121` switched from `getUser()`
   (network, every request) to `getSession()` (local JWT read). The highest-frequency
   round-trip is gone.
2. **`updateOnlineStatus` — FIXED this session** (commit `c5751d4be`). It did an `auth.getUser()`
   per call; the new module-level throttle cuts those round-trips ~N× alongside the writes.
3. **API-route `auth.getUser()` calls — UNBLOCKED + first batch SHIPPED (`83eddb003`).**
   - `SUPABASE_JWT_SECRET` provisioned (Supabase dashboard → Railway + `.env.local`) and
     verified: `verifyJwtLocal` accepts real-secret-signed tokens, rejects wrong-secret ones.
   - **Key realization:** the fast path needs BOTH a secret AND callers that send a Bearer.
     The hot routes were called via plain cookie `fetch()`, so even the 3 pre-wired routes
     were silently falling back to the round-trip. Fixed end-to-end:
     - backend → `getAuthedUser(request)` (keep `createClient()` for queries so RLS still
       applies; `fetchWithAuth` sends cookies alongside the Bearer): `boosts/status`,
       `referral/stats`, `word-forge/progress`.
     - frontend → `fetchWithAuth`: `useBoostStatus`, `useReferralDashboard`, `useWordForgeRun`,
       `useWinStreak` (GET), `useStreakFreezeStatus`.
   - **Verified on prod build:** valid-secret token → 404 (auth passed, cookie-less query),
     wrong-secret → 401, no-auth → 401 ⟹ local verify active, round-trip eliminated.
   - **Remaining:** more read-only GET routes can follow the same two-half pattern. Keep remote
     `getUser` on mutations/security-critical. Future hardening: asymmetric signing keys +
     `getClaims()` (no secret to manage). See memory `auth-getuser-refactor-playbook`.

   _(historical — now resolved:)_
   - `lib/auth/getAuthedUser` + `verifyJwtLocal` exist and 3 hot GETs (streak/notifications/gifts)
     are wired, but the fast path is **inert**: `SUPABASE_JWT_SECRET` is not set locally, and the
     project's JWKS is empty (`{"keys":[]}` → legacy **HS256 symmetric**), so local verify has no
     key material. `getAuthedUser` silently falls back to the remote round-trip everywhere.
   - **Activation (one-time, dashboard-only — not MCP-accessible):**
     - **Option A (quick):** Supabase Dashboard → Settings → API → JWT Secret → copy → add
       `SUPABASE_JWT_SECRET` to Railway env + `.env.local`. Existing `verifyJwtLocal` (HS256)
       activates immediately for the 3 wired routes.
     - **Option B (recommended, no secret to manage):** enable **asymmetric JWT signing keys**
       in Supabase Auth → JWKS populates → switch `verifyJwtLocal`/`getAuthedUser` to
       `supabase.auth.getClaims()` (local JWKS verify). Modern, rotation-safe.
   - **Migration is security-sensitive:** the proven pattern (streak GET) pairs `getAuthedUser`
     with a **service-role** client (RLS bypass) + explicit `.eq(id, user.id)` filtering — because
     bearer-only clients (Capacitor) have no cookie session. Do the broader route migration only
     after the key is live so the win is verifiable and each query's user-filter is reviewed.
   - See memory `auth-getuser-refactor-playbook`.

## DB advisors (supabase get_advisors performance)

99 unindexed FKs (mostly small tables — low priority), 7 unused indexes, 1 `auth_rls_initplan`
on `web_vitals` (wrap `auth.<fn>()` in `(select ...)` to evaluate once per query).
