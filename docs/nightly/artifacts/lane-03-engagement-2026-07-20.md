status: shipped
attempted: Impact-check exp-singleplayer-word-goal-v1, new exp-mp-results-rival-best-word-v1 experiment, PostHog flag creation, translation key, triage stale flag
files_touched:
  - fe-next/lib/experiments.ts (new exp-mp-results-rival-best-word-v1 defineExperiment)
  - fe-next/components/results/ResultsMainContent.tsx (useExperiment hook + highlightStats rival word chip)
  - fe-next/translations/en.js (results.rivalBestWord key)
  - docs/nightly/impact-ledger.ndjson (verdict for exp-singleplayer-word-goal-v1 = improved, avg 9.9/day post vs 4.4/day pre)
next_steps:
  - Add results.rivalBestWord to he/sv/ja/es locale files (fallback string in code covers tonight)
  - Check triage-queue for exp-results-replay-cta-v1 (48d, human review needed)
  - exp-mp-round-reaction-v1 ensure flag call (already in PostHog, created 07-18)
