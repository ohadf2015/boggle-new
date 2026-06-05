# Triage Queue

Items deferred from automated nightly triage. Human review required.

---

## 2026-06-02 (lane-03 engagement)

### [Flags] Prior entries corrected — call sites ARE present

- **`show-signup-after-first-win`** (prior entries 05-26, 05-28, 06-01 all said "no call sites found") — **CORRECTION**: call site exists at `fe-next/components/singleplayer/results/hooks/useSignupPrompt.ts:61` via `usePostHogFlag('show-signup-after-first-win', 'after-first-win')`. 63d old, 34 exposures last 30d (19 after-first-win / 15 after-third-game). Still inconclusive; decision needed.

- **`share-prompt-timing`** (prior entries 05-26, 05-28 said "no call sites found") — **CORRECTION**: call site exists at `fe-next/components/singleplayer/SinglePlayerResults.tsx:173` via `usePostHogFlag('share-prompt-timing', 'results-page')` + `useSharePromptImpression.ts`. 63d old, 0 PostHog exposures last 30d = flag evaluates but SDK may not fire `$feature_flag_called` at the right moment. Recommend retire.

### [Experiment] `exp-results-replay-cta-v1` — activated in PostHog

- **PostHog flag id 197044** created 2026-06-02 — 50/50 split `control` vs `quick-replay`
- Code was already fully wired in `SinglePlayerResults.tsx:183-352` (`useExperiment` + conditional CTA button + `results_cta_clicked {cta: 'quick_replay'}` tracking)
- Experiment is now LIVE. Measure: `results_cta_clicked {cta: 'quick_replay'}` → `game_started` within 10min per person.

---

## 2026-06-02

- [Sentry] TypeError: Cannot read properties of null (reading 'x') — JAVASCRIPT-NEXTJS-13Y
  - first seen: 2026-05-06, last seen: 2026-05-06, count: 500, userCount: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred
  - why: minified Pixi rAF stack in /he/blast; last seen 4 weeks ago, pre-dates MP Blast sync fixes (05-30). 1 user. Likely self-resolved. Unactionable without source map — needs source map upload to Sentry or local repro.
  - recommended owner: review-by-eod (resolve in Sentry if no recurrence after 05-30 fixes)

- [Sentry] Error: relation "profiles" does not exist — JAVASCRIPT-NEXTJS-1JR
  - first seen: 2026-05-27, last seen: 2026-05-27, count: 18, userCount: 5
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (already fixed — migration 20260527230753 per prior memory)
  - why: DB-layer fix already shipped same day. Sentry issue stale. Resolve in UI.
  - recommended owner: review-by-eod (mark resolved in Sentry)

- [Sentry] [CoinContext] Failed to add coins — JAVASCRIPT-NEXTJS-1JP
  - first seen: 2026-05-27, last seen: 2026-05-27, count: 6, userCount: 5
  - link: https://lexiclash.sentry.io/issues/123033015/
  - status: deferred (downstream of 1JR — profiles table missing caused coin transaction failure)
  - why: Same incident as 1JR. Already fixed. Resolve in UI.
  - recommended owner: review-by-eod (mark resolved in Sentry alongside 1JR)

- [Supabase] Authenticated SECURITY DEFINER: upsert_push_token
  - status: deferred (intentional design)
  - why: function body uses auth.uid() and must UPDATE other users' tokens WHERE user_id != auth.uid() — requires elevated privileges. Only authenticated role has execute (no anon). Design is correct.
  - recommended owner: self (no action needed)

- [Supabase] RLS always-true INSERT on web_vitals
  - status: deferred (intentional design)
  - why: Telemetry collection. Any user (anon+auth) should be able to submit web vitals. Open INSERT is by design; SELECT is admin-only. No narrowing possible without breaking collection.
  - recommended owner: self (no action needed)

---

## 2026-06-01

### [Flags] Stalled A/B experiments — human decision needed

- **`show-signup-after-first-win`** (PostHog flag #163655, active, 62+ days, **26 after-first-win / 22 after-third-game** per 90d $feature_flag_called query 2026-06-01)
  - Status: Active but stalled — far below 1000/arm threshold for statistical inference
  - Context: Tests whether prompting guests after first-win vs 3rd game lifts signup CVR. Code searches found **no usages in fe-next/** — flag is orphaned (no call sites). Default = `after-first-win`.
  - Decision needed: **Recommend retire** — 48 exposures in 62 days, no code call sites found, zero conversion data. Keep `after-first-win` behavior (no code change needed since flag not wired).
  - Action: Delete flag in PostHog UI.

- **`share-prompt-timing`** (PostHog flag #163656, active, 62+ days, **2 exposures** per 90d $feature_flag_called query 2026-06-01)
  - Status: Near-dead — 2 total exposures in 90 days. Code searches found **no usages in fe-next/** — flag is orphaned.
  - Decision needed: **Recommend retire** — clearly dead experiment, no code call sites.
  - Action: Delete flag in PostHog UI.

- **`mp-signup-nudge-copy-v1`** (PostHog flag #183230, active, 29 days, **42 toast-disabled / 27 control** per 90d $feature_flag_called query 2026-06-01 — 0 conversions)
  - Status: Conversion = 0/69 exposures across arms. Clear failure on conversion, below 1000/arm but 0/69 is statistically meaningful.
  - Decision needed: (a) declare `toast-disabled` the winner (removing the toast = minimal downside, confirmed 0 uplift), (b) keep running to gather more data
  - Advisory: 0/69 is strong evidence the nudge mechanics are broken regardless of copy. Suggest user-research before iterating on copy.

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

## 2026-05-28

- [Flag] `show-signup-after-first-win` (PostHog id 163655, created 2026-03-31 — 58 days)
  - description: A/B show signup prompt after first win vs after 3rd game
  - status: inconclusive, >14 days, no stats engine result linked — retire or conclude
  - exposures: ~43 (per memory log 2026-05-27); far below 1 000/arm threshold for significance
  - how it works: `usePostHogFlag('show-signup-after-first-win', 'after-first-win')` in `useSignupPrompt.ts:61` — raw flag, not wired to `useExperiment`; no typed exposure tracking
  - variants: `after-first-win` (control/default) · `after-third-game`
  - recommended action: if no clear signal needed, keep `after-first-win` path (emotional peak), delete the flag + conditional in `useSignupPrompt.ts`; or wire via `useExperiment` + add to experiments registry before concluding
  - recommended owner: growth

- [Flag] `share-prompt-timing` (PostHog id 163656, created 2026-03-31 — 58 days)
  - description: A/B show share prompt immediately after win vs on results page
  - status: inconclusive, >14 days, 0 `share_win_prompt_shown` events in last 7 days — data gap
  - how it works: `usePostHogFlag('share-prompt-timing', 'results-page')` in `SinglePlayerResults.tsx:167`; raw flag, no typed exposure tracking
  - variants: `results-page` (default) · `immediate`
  - recommended action: if share prompt is rarely triggered (0 events/7d), the experiment can't conclude; decide whether to retire the feature or add minimum traffic gate; delete flag + dead `showShareImmediate` branch if retiring
  - recommended owner: growth

- [Flag] `mp-signup-nudge-copy-v1` (PostHog id 183230, created 2026-05-08 — 49 days)
  - description: MP signup nudge copy + toast gate; control = sheet+toast; toast-disabled = sheet only; value-prop/social-proof = alternate copy
  - status: inconclusive — flag description notes 0/77 converts in 28d across all variants; no stats engine result linked
  - how it works: `usePostHogFlag` or `useFeatureFlag` in `useMultiplayerSignupNudge.ts`
  - recommended action: low-volume game makes 77 total exposures insufficient for significance; decision: pick control (current sheet+toast) and delete flag + variant branches, OR keep running and target 300/arm minimum first
  - recommended owner: growth

## 2026-06-01

- [Supabase] upsert_push_token SECURITY DEFINER callable by authenticated
  - advisor: authenticated_security_definer_function_executable
  - status: deferred (reviewed — intentional)
  - why: function body uses cross-user UPDATE (`WHERE user_id != auth.uid()`) to deactivate tokens on account switch. SECURITY INVOKER would break that under RLS. SECURITY DEFINER is load-bearing. Only callsite is server-side route `app/api/player/push-token/route.ts:48` (not raw client RPC). Mild risk: authenticated users can call via `/rest/v1/rpc/upsert_push_token` directly and deactivate another user's token if they know the token value — acceptable given token opacity.
  - recommended owner: review-by-eod

- [Supabase] web_vitals RLS INSERT policy always true
  - advisor: rls_policy_always_true
  - status: deferred (intentional)
  - why: public web vitals collection is intentional — anyone can INSERT performance data. No PII in the table. No fix needed.
  - recommended owner: self

- [Sentry JAVASCRIPT-NEXTJS-13Y] TypeError: Cannot read properties of null (reading 'x') on /he/blast
  - first/last seen: 2026-05-06 (same day), count: 500, users: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred (stale, 1 user)
  - why: null read is inside Pixi v8 render loop (not our RAF tick). Our `useBlastDebris.ts:170` already guards `d.graphic.position`. Fix requires `ticker.stop()` before `destroy()` or Pixi upgrade. Has not recurred in 25 days.
  - recommended owner: review-by-eod

- [Sentry JAVASCRIPT-NEXTJS-1JR] Error: relation "profiles" does not exist on POST /api/coins
  - first/last seen: 2026-05-27, count: 18, users: 5
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (already resolved)
  - why: `profiles` table confirmed to exist in DB. Error stopped 2026-05-27 after migration `20260527230753`. No code change needed.
  - recommended owner: self

## 2026-06-03
- [Sentry] 14R/14S game_sessions check_player_id constraint violation
  - first: 2026-05-12, last: 2026-05-12, count: 56, userCount: 0
  - link: https://lexiclash.sentry.io/issues/119434883/
  - status: shipped (UUID guard in gameSessionLogger.ts:136)
  - why: bot IDs like "bot_abc123" passed !userId guard, reached INSERT, failed UUID constraint
  - recommended owner: review-by-eod — add test in gameSessionLogger.test.ts
- [Sentry] 13Y (null 'x' Blast rAF), 15B/15E (_cancelResize Blast)
  - status: already fixed — SharedFxApp.ts generation+live guards (comments cite these Sentry IDs)
- [Sentry] 1JR/1JP (profiles/coins)
  - status: already fixed — mig 20260527230753 (per memory)

## 2026-06-03 (Lane 01)
- [Supabase security] upsert_push_token — SECURITY DEFINER callable by `authenticated`
  - function: public.upsert_push_token(p_token, p_platform, p_device_id)
  - status: deferred — intentional by design
  - why: function body does cross-user token deactivation (`user_id != auth.uid()`) which REQUIRES SECURITY DEFINER to bypass RLS. `anon` is already excluded from ACL (proacl only has postgres/authenticated/service_role). Switching to SECURITY INVOKER would silently break token rotation for users who switch accounts on the same device.
  - recommended owner: review-by-eod — confirm cross-user UPDATE is desired scope or refactor to service-role server call
- [Supabase security] web_vitals RLS INSERT always true — policy "Anyone can insert web vitals"
  - table: public.web_vitals
  - status: deferred — intentional by design
  - why: policy name explicitly states intent (anonymous telemetry collection). Restricting would break CWV metric ingestion from unauthenticated users. Low-harm table (write-only telemetry, no PII).
  - recommended owner: self — accept as intentional or add row-level rate limit if spam becomes concern
- [Sentry] 14R — game_sessions check_player_id constraint violation
  - first/last seen: 2026-05-12 (3 weeks ago), 56 occurrences, 0 users
  - status: deferred — likely self-resolved post Blast per-player board redesign (2026-05-31)
  - why: call path was endGame → recordGameResultsToSupabase → processPlayerResult → logGameSession; the redesign reworked this entire path. If constraint violations resume after 2026-05-31 release, root cause = bot/guest player_id bypassing UUID check_player_id constraint.
  - recommended owner: backend — monitor post next MP session; add null/UUID guard in logGameSession if recurs
- [Sentry] 1JR/1JP — profiles + CoinContext (re-confirm stale)
  - status: previously documented as fixed (mig 20260527230753 per prior triage)
  - last seen: 2026-05-27 — no recurrence in 7 days, profiles table verified EXISTS
  - recommended owner: self — auto-close if no recurrence by 2026-06-10

## 2026-06-04
- [Sentry] TypeError: Cannot read properties of null (reading 'x') — JAVASCRIPT-NEXTJS-13Y
  - first seen: 2026-05-06, last seen: 2026-05-06, count: 500, users: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred
  - why: minified stack in /he/blast (requestAnimationFrame path), no source maps available; likely Pixi null tile ref in render loop
  - recommended owner: backend

- [Supabase] RLS policy always true — web_vitals INSERT (Anyone can insert web vitals)
  - status: deferred
  - why: policy replacement; failure mode = lock out legitimate web-vitals inserts
  - recommended owner: review-by-eod

- [Sentry] Error: relation "profiles" does not exist — JAVASCRIPT-NEXTJS-1JR
  - first seen: recent, count: 5 users
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (not investigated this run — time budget)
  - why: reach=5, needs stack trace + schema check; could be migration order issue
  - recommended owner: backend

## 2026-06-04 — Flag hygiene (lane-03)
- `share-prompt-timing` (PostHog id 163656, created 2026-03-31): 65 days old, **0 exposures in last 30d**. Flag may not be reaching trigger. Check `useSharePromptImpression` + `SinglePlayerResults` condition `hasMinimumScore`. Either retire or fix trigger.
- `show-signup-after-first-win` (PostHog id 163655, created 2026-03-31): 65 days old, 35 exposures, **0 signups both arms** (`after-first-win`=17, `after-third-game`=18). Tracking was broken (InlineSignupCard emitted no events). Re-evaluate after `signup_prompt_shown` fix ships. If still 0 conversion after 14d → retire.

## 2026-06-05
- [Sentry] TypeError: Cannot read properties of null (reading 'x') — JAVASCRIPT-NEXTJS-13Y
  - first seen: 2026-05-06, last seen: 2026-05-06, count: 500, users: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred
  - why: minified stack trace (requestAnimationFrame in Pixi/game engine), needs source maps to pinpoint; only 1 user, 1 day old, no recurrence
  - recommended owner: backend/game-engine team with source maps

- [Sentry] churn-signals report failed with status 502 — JAVASCRIPT-NEXTJS-1KQ (escalating)
  - first seen: 2026-06-03, last seen: 2026-06-04, count: 276, users: 3
  - link: https://lexiclash.sentry.io/issues/124871662/
  - status: deferred
  - why: 502 is Railway's reverse proxy timing out before Next.js responds; root cause is getUserFromRequest() creates a new Supabase anon client + network auth.getUser(token) round-trip on every request — auth-adjacent refactor needed (local JWT verify)
  - recommended owner: review-by-eod; fix = replace getUserFromRequest with local SUPABASE_JWT_SECRET verify

- [Supabase] SECURITY DEFINER upsert_push_token executable by authenticated role
  - status: deferred
  - why: authenticated execute is intentional (API route calls rpc as authed user); only risk is authenticated users bypassing API validation; the function uses auth.uid() internally so blast radius is self-scoped
  - recommended owner: review-by-eod; confirm function body uses auth.uid() and not p_user_id param

- [Supabase] RLS always-true INSERT on web_vitals
  - status: deferred
  - why: appears intentional (anon web vital tracking, route passes null player_id for guests); false-positive advisory
  - recommended owner: confirm intent — if anon inserts are desired, add a comment on the migration explaining the policy is by design
