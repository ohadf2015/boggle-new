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
