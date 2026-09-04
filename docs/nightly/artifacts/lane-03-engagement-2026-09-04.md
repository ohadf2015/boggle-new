status: shipped
attempted: flag hygiene sweep (3 IMPACT CHECK verdicts) + new experiment targeting es/singleplayer rageclick + 2-3 instrumentation events
files_touched:
  - fe-next/utils/growthTracking.ts (new event type + trackSingleplayerBotsStaleRedirect())
  - fe-next/components/singleplayer/useSinglePlayerConfig.ts (call site at the returning-player redirect)
  - docs/nightly/impact-ledger.ndjson (3 impact-check verdicts + 1 new-shipment entry)
  - docs/nightly/triage-queue.md (2 entries: redirect UX fix to-do, dead exp-practice-wheel-cta-v1 flag)
  - docs/nightly/reports/2026-09-04.md (Lane 2 section appended)
next_steps: |
  No new experiment shipped — root-caused the #1 brief item (es/singleplayer?autoStart=bots
  rageclick) to a silent client-side redirect in useSinglePlayerConfig.ts:173-181 (returning
  player silently router.replace()'d off an interactive pre-game screen with no loading state)
  and shipped instrumentation (singleplayer_bots_stale_redirect) instead of a rushed UI fix.
  Next run: query the new event after ~3 days of data, join against
  mp_quickplay_initiated{trigger:'url_param'}, and if confirmed, ship a SinglePlayerPhase
  loading state on that branch. Also pick up exp-practice-wheel-cta-v1 (dead flag, 0 call
  sites) — wire or delete. No flags were retired this run (nothing met the decided-winner bar).
