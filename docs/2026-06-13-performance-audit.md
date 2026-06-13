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

## INFRA — Supabase Realtime WAL decode = 83% of DB CPU (cost/headroom, NOT latency)

`db_perf_top_query_audit`: top 2 queries (`SELECT wal->>... as type,schema,table`) = **63.1% +
20.1% = 83.2%** of total DB CPU, ~1M calls/window. Cause: 2 active Realtime replication slots
with **0 subscriptions and 0 published tables** — the Realtime server decodes every high-churn
write (`profiles.last_seen_at`, `web_vitals`, `analytics_events`) then discards it (nothing
published). This is **wasted CPU/cost, not a query-latency cause** (app queries measure 1–7ms
even under this load). Remediation (infra, needs care):
- Investigate disabling unused Realtime "Postgres Changes" / "Broadcast from DB" if no feature
  consumes them (Supabase dashboard — outward-facing, do not blind-change).
- Safe app-side lever: throttle `profiles.last_seen_at` writes (n=40243) — skip if <5min stale —
  to cut WAL decode volume.

## BACKEND DEBT — auth.getUser() round-trips

96 routes still call `supabase.auth.getUser()` (50–200ms Auth round-trip each). Infra to fix
already exists (`lib/auth/verifyJwtLocal` + `getAuthedUser`, used in 15+ routes). Migrate
hottest **read-only GET** paths to `getAuthedUser(request)`; keep remote `getUser` on
mutations/security-critical (local verify can't detect mid-token revocation). See memory
`auth-getuser-refactor-playbook`.

## DB advisors (supabase get_advisors performance)

99 unindexed FKs (mostly small tables — low priority), 7 unused indexes, 1 `auth_rls_initplan`
on `web_vitals` (wrap `auth.<fn>()` in `(select ...)` to evaluate once per query).
