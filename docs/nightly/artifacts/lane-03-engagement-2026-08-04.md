status: partial
files_touched: fe-next/utils/growthTracking.ts, fe-next/app/[locale]/PageClient.tsx, docs/nightly/impact-ledger.ndjson, docs/nightly/reports/2026-08-04.md
next_steps: |
  - Run posthog-experiment.sh ensure for the 5 confirmed-wired flags (exp-wordwheel-drag-hint-v1, exp-results-replay-cta-v1, exp-game-abandon-confirm-v1, exp-landing-quick-play-v1, exp-mp-quickplay-eager-disable-v1) - not run this lane, no risk, just time-boxed out.
  - 16 unwired exp-* keys in lib/experiments.ts (0 non-test call sites) - biggest is exp-practice-wheel-cta-v1 (targets practice/wheelRush 43% drop) - wire or delete.
  - Build the clarity-banner variant for the FTUE ?next= bounce (root-caused this run, instrumented only) - new exp-ftue-redirect-clarity-v1, control=silent bounce (current) vs banner="quick setup, then Practice" - once ftue_redirect_landed vs ftue_redirect_resumed data confirms the drop-off.
  - Re-check impact-ledger verdict for mp_lobby_join_timeout in a few more days - only 1 sample so far, too early to call.
