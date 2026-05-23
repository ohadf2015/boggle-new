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
  - status: STALE in PostHog (self-reported), created 2026-03-31 (54 days ago)
  - why deferred: PostHog reports zero evaluation in past 7d; no formal experiment linked (0 running experiments in project). Cannot determine winner — no PostHog stats. Confirm there are no `useFeatureFlag('share-prompt-timing')` call sites remaining in code before deleting the PostHog flag.
  - recommended action: grep codebase for `share-prompt-timing`, then delete flag in PostHog UI if no call sites found.

- [Flag] `show-signup-after-first-win` (PostHog id 163655) — **needs human decision**
  - status: ACTIVE, created 2026-03-31 (54 days ago, well past 14-day inconclusive threshold)
  - why deferred: no formal PostHog experiment linked (0 running/stopped experiments). Flag tests "signup after 1st win vs after 3rd game" — this is the hypothesis with the most funnel data support (game_completed → signup only 10%, avg 19h to convert). Either: (a) wire a formal PostHog experiment with `exp-results-share-prompt` as the primary test and retire this flag, or (b) wire an experiment to this flag and measure `signup_completed` by variant. Do not leave running without stats.
  - recommended action: decide wire-or-retire this sprint.

- [Flag] `mp-signup-nudge-copy-v1` (PostHog id 183230) — **needs human decision**
  - status: ACTIVE; description states control has 0/77 converts in 28d (confirmed in registry `lib/experiments.ts:128`)
  - why deferred: no formal PostHog experiment linked, so no p-value. The 0/77 control result strongly implies either the prompt never fires correctly or the sheet is ineffective — both warrant action. With 0 converts across all variants in 28d, the experiment may be measuring the wrong conversion window or the sheet isn't rendering on the expected trigger.
  - recommended action: (a) verify sheet renders in prod (add a Sentry breadcrumb or PostHog event on sheet impression), then (b) wire a PostHog experiment to get stats, or (c) redesign the signup moment entirely given 19h avg time-to-signup data.
