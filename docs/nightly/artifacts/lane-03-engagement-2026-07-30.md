status: partial
attempted: pull posthog data (flags + funnel), flag hygiene sweep, add 1 new experiment targeting biggest funnel drop, instrument 2-3 gap events, impact-check exp-wordhunt-clue-shake-v1
files_touched: scripts/nightly/lib/posthog-experiment.sh (added `deactivate` verb), docs/nightly/triage-queue.md, docs/nightly/impact-ledger.ndjson, docs/nightly/reports/2026-07-30.md
shipped:
  - impact-check exp-wordhunt-clue-shake-v1: baseline 8 -> measured 2 rageclicks/7d on /daily/word-hunt -> verdict improved
  - deactivated zombie flag exp-mp-room-join-loading-v1 (0 call sites, unactioned 4 nights) via new posthog-experiment.sh deactivate verb
  - flagged exp-wordwheel-drag-hint-v1 inconclusive (n too small) in triage-queue.md -- it already covers this run's #1 rage-click brief item (/daily/word-wheel), so did not duplicate with a new experiment there
not_shipped: new typed experiment + new instrumentation events (goals 2 and 3) -- ran out of time budget after data pull + flag hygiene; investigated connections/play rage-click (reach too small, el_text null/canvas surface, no quick confident hypothesis) and confirmed 3 already-defined-but-unwired experiments as a better next target than a from-scratch one
next_steps:
  - wire ONE of exp-practice-wheel-cta-v1 / exp-game-abandon-confirm-v1 / exp-mp-round-feedback-top-v1 (all defined in lib/experiments.ts, 0 call sites) -- fastest path to a live new experiment next run, then posthog-experiment.sh ensure
  - add tap-position instrumentation on connections/play pyramid tiles to diagnose the null-el_text rage-click signal before attempting a UI fix there
  - human: decide on exp-wordwheel-drag-hint-v1 (31d, n=12 rageclick events, can't reach significance at current volume -- raise rollout or pick a louder primary metric)
