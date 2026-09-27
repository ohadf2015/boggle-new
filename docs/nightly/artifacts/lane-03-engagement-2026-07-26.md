status: shipped
attempted: Impact checks on 3 prior experiments, flag hygiene sweep, revert regressed experiment
files_touched:
  - fe-next/app/[locale]/multiplayer/useMultiplayerJoin.ts
  - fe-next/lib/experiments.ts
  - docs/nightly/impact-ledger.ndjson
  - docs/nightly/reports/2026-07-26.md
outcome: REGRESSION detected in exp-mp-lobby-connect-feedback-v1 (rage clicks 6→22, +267% over 7d). Reverted — eager-feedback arm removed from useMultiplayerJoin.ts, experiment retired from experiments.ts. Control (silent 5s wait, button stays enabled) restored.
next_steps: Create PostHog flag for exp-wordwheel-drag-hint-v1 (wired in code, flag missing); investigate why wordhunt_invalid_submitted fires 0 events despite ship on 2026-07-22
