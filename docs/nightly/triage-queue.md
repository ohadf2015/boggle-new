# Triage Queue

Items deferred from automated nightly triage. Human review required.

---

## 2026-05-21

- [Sentry] `InvalidStateError: Failed to start the audio device`
  - first seen: 2026-05-21 ~01:00 UTC, last seen: 2026-05-21 ~01:00 UTC, count: 1, users: 0
  - issue: JAVASCRIPT-NEXTJS-1HM, culprit: `/es/multiplayer`
  - why deferred: browser Web Audio API device-level failure — no server-side fix; may need try/catch around AudioContext init with graceful fallback
  - recommended owner: frontend (audio init guard in multiplayer sound hooks)

- [Sentry] `wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': HTTP status code is not ok`
  - first seen: 2026-05-21 ~01:00 UTC, last seen: 2026-05-21 ~01:00 UTC, count: 1, users: 0
  - issue: JAVASCRIPT-NEXTJS-14N, culprit: `/:locale/practice/:mode`
  - why deferred: WASM file returned non-200 from CDN/server — transient or missing fallback; needs investigation of which WASM asset and whether it has a sync fallback
  - recommended owner: backend/infra (check CDN serving of WASM chunks for practice mode)

- [PostHog] `Minified React error #418` — hydration mismatch
  - first seen: 2026-05-20T21:23 UTC, last seen: same, count: 1, users: 1
  - url: `https://www.lexiclash.live/en?room=LPEVHC` (iOS Mobile Safari 26.4)
  - why deferred: single occurrence, no useful stack trace from minified bundle; needs repro or source-map correlation
  - recommended owner: frontend (check multiplayer room join page for SSR/client mismatch)

- [Supabase] `anon_security_definer_function_executable` — CRITICAL
  - functions: `award_ad_coins`, `increment_blast_progress`, `auto_remediate_realtime_publication`, `snapshot_db_perf_top_queries`, `snapshot_realtime_publication`
  - why deferred: auth-adjacent; anon role can call `award_ad_coins` and `increment_blast_progress` directly via REST — this is a coin/progress manipulation vector. Requires REVOKE EXECUTE on anon role + verify if any client calls these unauthenticated.
  - recommended owner: backend/security (URGENT — `award_ad_coins` + `increment_blast_progress` especially)

- [Supabase] `authenticated_security_definer_function_executable` — admin RPCs
  - functions: `admin_activity_stats`, `admin_bulk_ban_players`, `admin_cohort_retention`, `admin_engagement_funnel`, `admin_language_breakdown`, `admin_overview_stats`, `apply_prestige`, `add_league_xp`
  - why deferred: auth-adjacent; any authenticated user can call admin RPCs and `apply_prestige`/`add_league_xp` — privilege escalation vector
  - recommended owner: backend/security

- [Supabase] `security_definer_view` ERROR — `public.v_suspicious_realtime_publications`
  - why deferred: auth-adjacent; SECURITY DEFINER view runs with owner privileges — confirm intended or switch to SECURITY INVOKER
  - recommended owner: backend

- [Supabase] `rls_policy_always_true` WARN — 5 tables
  - tables: `connections_feedback`, `custom_puzzle_attempts`, `custom_puzzles`, `score_challenge_attempts`, `teacher_access_requests`, `web_vitals`
  - why deferred: security policy change; always-true INSERT bypasses RLS — intentional for some (web_vitals anonymous telemetry) but needs design review for others
  - recommended owner: design + backend

## 2026-05-23

- [Sentry] JAVASCRIPT-NEXTJS-1CK — word-tower `paintTile` null.clear
  - first seen: 2026-05-14, last seen: 2026-05-22T16:01, count: 2, users: 1 (אוהד/founder)
  - why deferred: stale — fix shipped in `b81a66e87` same day. Sentry MCP token is read-only (403), cannot resolve programmatically. Please resolve manually at https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1CK
  - recommended owner: self (manual Sentry resolve only)

- [Sentry] JAVASCRIPT-NEXTJS-14N — wasm streaming compile failed
  - first seen: 10 days ago, last seen: 6h ago, count: 10, users: 1
  - why deferred: previously triaged as transient/needs sourcemaps (per prior memory). `/singleplayer` WASM fetch returning non-200 — likely CDN cache issue not app bug.
  - recommended owner: infra/deploy

- [Sentry] JAVASCRIPT-NEXTJS-1HM — InvalidStateError: Failed to start audio device
  - first seen: 2 days ago, last seen: 11h ago, count: 2, users: 0
  - why deferred: browser permission/autoplay policy — no first-party code to fix; audio device start requires user gesture. Not reproducible from code alone.
  - recommended owner: design (add gesture-gate before audio init in lightning-round)

- [Sentry] JAVASCRIPT-NEXTJS-145 — [REDLOCK] Lock acquisition failed for cron:reengagement-email
  - first seen: 15 days ago, last seen: 12h ago, count: 2, users: 0
  - why deferred: expected in multi-instance deploy (redlock contention = correct behavior, not a bug). Would need Redis single-writer guarantee to eliminate. Non-actionable at code level.
  - recommended owner: infra (confirm single-instance or accept as noise)

- [Sentry] JAVASCRIPT-NEXTJS-1J6 — FRIEND_MESSAGES Error getting unread count (empty error)
  - first seen/last seen: 2026-05-23T09:42, count: 1, users: 1 (אוהד/founder)
  - partial fix shipped: improved logging to surface `error.code` + `error.details` (was `""` / empty)
  - why deferred full fix: root cause unknown without error code/details — need one more occurrence with improved logging to see the actual Supabase error
  - recommended owner: self (check next Sentry event for 1J6 with the new code/details context)

- [Sentry] JAVASCRIPT-NEXTJS-1J3 + 1J2 — [Lobby] Error: {} (minified)
  - first seen: 14h ago, count: 1 each, users: 0
  - why deferred: no source maps; minified stack is unreadable. Need sourcemaps for Sentry.
  - recommended owner: infra/build (enable Sentry sourcemap upload in CI)

- [Supabase] feedback_reports — RLS enabled, no policies defined
  - why deferred: auth-adjacent (RLS policy change). API inserts via service role (bypasses RLS), so functional. But no authenticated SELECT policy = no direct client reads. Verify this is intentional (should be).
  - recommended owner: backend/security

- [Supabase] Auth RLS Init Plan — 6 tables including `daily_streak_freezes` (recently shipped)
  - why deferred: performance optimization requiring migration (add `SET search_path` or restructure policies). Non-blocking today.
  - recommended owner: backend (next perf sprint)

## Flag Hygiene — 2026-05-23

- [Flag] `share-prompt-timing` (PostHog id 163656) — **retire**
  - status: STALE in PostHog, created 2026-03-31 (56 days as of 05-26). **2026-05-26 update:** only 2 total exposures ever ("immediate" variant, 2x) in 60 days of data. Permanently underpowered — will never reach stat-sig. Call sites still present: `useSharePromptImpression.ts` + `SinglePlayerResults.tsx`. Remove call sites + delete PostHog flag.
  - recommended action: grep `share-prompt-timing` → remove `usePostHogFlag` read + `useSharePromptImpression` enabled gate → delete PostHog flag.

- [Flag] `show-signup-after-first-win` (PostHog id 163655) — **needs human decision**
  - status: ACTIVE, created 2026-03-31 (56 days as of 05-26). **2026-05-26 update:** 42 total exposures (23 after-first-win, 19 after-third-game) — far below 1000/arm threshold. No linked experiment in typed registry. Still using raw `usePostHogFlag` in `useSignupPrompt.ts:61`. Either: (a) wire a formal PostHog experiment and update to `useExperiment('show-signup-after-first-win')` with typed registry entry, or (b) pick one variant and retire the flag.
  - recommended action: decide wire-or-retire this sprint.

## 2026-05-24

- [Sentry] JAVASCRIPT-NEXTJS-1J7 — [REDLOCK] Lock acquisition failed for cron:auto-promotion
  - first seen: 2026-05-24T~13h ago, last seen: 2026-05-24T~11h ago, count: 2, users: 0
  - why deferred: same pattern as 145 (reengagement-email Redlock). Expected contention in multi-instance Railway deploy. Not a code bug; both instances race to acquire lock, one wins, one logs error. Non-actionable at code level.
  - recommended owner: infra (confirm single-instance or accept as noise; consider suppressing Sentry capture for REDLOCK contention logs)

- [Sentry] JAVASCRIPT-NEXTJS-1J8 — SyntaxError in Turbopack worker (multiplayer page)
  - first seen: 2026-05-24T13:25 UTC, last seen: 2026-05-24T13:39 UTC, count: 5, users: 0
  - culprit: `/:locale/multiplayer`, error: `Unexpected non-whitespace character after JSON at position 106`
  - why deferred: stack trace is entirely inside `turbopack-worker-*.js` parsing a URL-encoded JSON parameter — no first-party code in the frame. Likely a Turbopack/Next.js infrastructure bug affecting specific Android 10 WebViews running Chrome Mobile 148. Cannot be fixed in user code without sourcemaps.
  - recommended owner: infra/build (enable Sentry sourcemap upload; if reproducible, file Next.js/Turbopack upstream issue)

- [Sentry] JAVASCRIPT-NEXTJS-1J5 — Error in registerPushToken: {} — **FIXED tonight**
  - root cause: `crypto.randomUUID` absent in Chrome WebView 91 (Android emulator default image)
  - fix: `_generateUUID()` polyfill in `utils/pushNotifications/tokenRegistration.ts`
  - shipped in this lane run (not committed yet)

- [Flag] `mp-signup-nudge-copy-v1` (PostHog id 183230) — **needs human decision**
  - status: ACTIVE; description states control has 0/77 converts in 28d (confirmed in registry `lib/experiments.ts:128`)
  - why deferred: no formal PostHog experiment linked, so no p-value. The 0/77 control result strongly implies either the prompt never fires correctly or the sheet is ineffective — both warrant action. With 0 converts across all variants in 28d, the experiment may be measuring the wrong conversion window or the sheet isn't rendering on the expected trigger.
  - recommended action: (a) verify sheet renders in prod (add a Sentry breadcrumb or PostHog event on sheet impression), then (b) wire a PostHog experiment to get stats, or (c) redesign the signup moment entirely given 19h avg time-to-signup data.

## 2026-05-26

- [Supabase] `anon_security_definer_function_executable` — **NEW: `sync_coins`** (update to 2026-05-21 entry)
  - function: `public.sync_coins(p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb)` callable by `anon` role via `/rest/v1/rpc/sync_coins`
  - risk: unauthenticated HTTP POST can set coin balance for any user_id — coin manipulation vector
  - why deferred: auth-adjacent (security privilege change); requires REVOKE EXECUTE ON FUNCTION public.sync_coins FROM anon + verify no legitimate anon call site
  - recommended owner: backend/security (URGENT — same priority as `award_ad_coins`)

- [Supabase] `function_search_path_mutable` — `sync_coins` + `update_word_hunt_player_stats`
  - both SECURITY DEFINER functions with mutable search_path — allows search_path injection if attacker can influence session search_path before the call
  - fix: `ALTER FUNCTION public.sync_coins SET search_path = public;` and `ALTER FUNCTION public.update_word_hunt_player_stats SET search_path = public;`
  - why deferred: modifying SECURITY DEFINER functions at 03:00 is security-adjacent; verify no test harness relies on schema-qualified override before applying
  - recommended owner: backend (low-effort once human verifies no call-site dependency)

- [PostHog] WASM fetch failure on `/en/daily/word-wheel` — recurring pattern
  - error: `RuntimeError: Aborted(both async and sync fetching of the wasm failed)` — 1 occurrence, 1 user (Edge 148 / Windows 10)
  - timestamp: 2026-05-25T08:42:27Z; chunk `/_next/static/chunks/0bwv0jwk01wlj.js`
  - why deferred: single occurrence, same pattern as prior JAVASCRIPT-NEXTJS-14N (wasm streaming compile failed). Likely transient CDN hiccup or Edge-specific WASM loading quirk. Not reproducible without source maps or repro steps.
  - recommended owner: infra (confirm WASM assets served with correct MIME type and no CORS/CSP block on word-wheel page; add error boundary with retry for WASM init)

## 2026-05-27

- [Supabase] `sync_coins` + `function_search_path_mutable` (2026-05-26 entry)
  - status: shipped (migration `fix_function_search_path_mutable`, same run as below)
  - note: REVOKE also shipped (see `anon_security_definer_function_executable` below)

- [Supabase] `anon_security_definer_function_executable` — all 6 RPCs (2026-05-26 entry update)
  - status: shipped (migration `revoke_anon_execute_on_secdef_rpcs`)
  - verified: 0 anon callsites in codebase; all API routes gate on `auth.getUser()`; cron fns invoked by pg_cron (postgres role, not anon)

- [Supabase] `auth_rls_initplan` — 9 policies on 4 tables
  - affected: `teacher_access_requests` (3), `teacher_access_allowlist` (3), `word_tower_progress` (2), `daily_streak_freezes` (1)
  - fix: replace `auth.uid()` with `(select auth.uid())` in each policy expression
  - status: deferred
  - why: requires DROP + CREATE POLICY (replacement) — failure mode = users locked out of their own records; performance-only (not a bug)
  - recommended owner: review-by-eod

- [Supabase] `multiple_permissive_policies` — `teacher_access_requests` (5 overlapping SELECT policies)
  - affected roles: anon, authenticated, authenticator, dashboard_user, supabase_privileged_role
  - status: deferred
  - why: consolidation requires design decision on which policy wins; no production impact now
  - recommended owner: backend

- [Sentry] JAVASCRIPT-NEXTJS-145 — `[REDLOCK] Lock acquisition failed for cron:reengagement-email`
  - first/last seen: ~20h ago, count: 1, users: 0
  - status: deferred
  - why: single occurrence, 0 users; Redis lock contention on cron is transient / expected under concurrent server instances; no user-visible impact
  - recommended owner: backend (check if reengagement cron overlaps with another lock holder; consider jittered scheduling)

- [Sentry] JAVASCRIPT-NEXTJS-14N + PostHog `RuntimeError: Aborted(wasm failed)` on `/practice/:mode`
  - count: 1, users: 0 (Sentry); 1 occurrence, 1 user (PostHog)
  - status: deferred (same recurring pattern as 2026-05-26 entry)
  - why: transient CDN/Edge WASM load failure; no repro, no source maps for stack attribution
  - recommended owner: infra (verify WASM MIME type + CSP on practice pages; add retry error boundary)
