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
