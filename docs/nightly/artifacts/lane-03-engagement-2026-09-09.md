status: partial
attempted: flag hygiene sweep + one new experiment targeting es singleplayer autoStart=bots rage-clicks, plus instrumentation gaps
files_touched: fe-next/components/singleplayer/useSinglePlayerConfig.ts
next_steps: |
  - Root-caused (not yet fixed) the es/singleplayer?autoStart=bots rage-click cluster (brief score 0.878, reach 9):
    the returning-player gate renders the interactive 'playing' board with grid=null for one paint before
    router.replace() lands on /multiplayer?quickPlay=true. Instrumented singleplayer_bots_stale_redirect
    (locale, entry) in useSinglePlayerConfig.ts to confirm the correlation before touching the redirect timing.
    Query in ~3 days: docs/nightly/impact-ledger.ndjson id=03-engagement-2026-09-09-singleplayer-bots-stale-redirect-actually-wired.
  - If confirmed, fix = defer the initial 'playing' phase until the hasPlayedBotsGame() redirect-or-not decision
    resolves (useSinglePlayerConfig.ts ~L163-210), then wrap as exp-sp-bots-redirect-flash-v1 control/defer-playing.
  - Flag hygiene (decided-winner sweep) and a new live PostHog experiment were NOT done this run — ran out of
    time budget after the diagnosis; no experiment-results query was safe to run in the remaining window.
    Next lane 03 run should pull experiment-results for the active flag list (posthog-query.sh) before
    diagnosing a new target.
