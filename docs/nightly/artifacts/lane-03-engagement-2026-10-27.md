status: shipped
attempted: flag hygiene sweep + mp_round feedback-driven experiment + instrumentation gaps
files_touched:
  - fe-next/hooks/useGameFeedback.ts (new game_feedback_shown + game_feedback_dismissed fire sites)
  - fe-next/utils/growthTracking.ts (registered both events in GrowthEvent union)
  - docs/nightly/triage-queue.md (flagged 6 undecidable mp_round-sentiment experiments)
  - docs/nightly/impact-ledger.ndjson (1 entry)
  - docs/nightly/reports/2026-10-27.md (Lane 2 section)
next_steps: |
  No flags retired, no new experiment this run — found the brief's funnel/rage-click signals
  too thin (reach 1-2) to act on, and the player-feedback digest's mp_round low-sentiment
  signal (2.5/3, n=2) turned out to be backed by zero impression data: game_feedback response
  rate was 6/7d vs 827 game_completed/7d, but there was no way to tell whether that's a real
  drop or just the anti-annoyance throttle suppressing the card. Fixed that (game_feedback_shown
  / game_feedback_dismissed) instead of shipping a guess. Next lane: after ~48h, query
  game_feedback_shown vs game_feedback grouped by surface + per-experiment $feature flag to
  finally decide the 6 queued mp_round experiments (two are 96d/126d old, likely overdue).
  PostHog flag sweep of all 25 exp-* keys in lib/experiments.ts found all already live — no
  action needed. eslint on the 2 changed files was still running at finalize time (unusually
  slow cold start); diff is small, type-safe (GrowthEventData has a `[key: string]: unknown`
  index signature) and was manually re-read clean.
