status: shipped
files_touched:
  - fe-next/components/multiplayer/MultiplayerFlow.tsx (re-entrancy guard on handleQuickPlay, fixes /multiplayer rage clicks)
  - fe-next/utils/growthTracking.ts (new typed event mp_quickplay_rapid_click)
  - docs/nightly/triage-queue.md (root-cause note + open flag-hygiene question)
  - docs/nightly/impact-ledger.ndjson (impact entry)
  - docs/nightly/reports/2026-08-14.md (lane 2 section appended)
next_steps: |
  - Check exp-mp-quickplay-eager-disable-v1 PostHog experiment results (created 07-29,
    16d old) for p<0.05/n>=1000 per arm; if eager-disable wins, delete control branch + flag.
  - Watch mp_quickplay_rapid_click volume + rageclicks_24h on /multiplayer over next 3 nights
    to confirm the fix actually killed the signal (see impact-ledger entry).
  - Did NOT touch: /practice/classic and /practice/wheelRush rage clicks (lower score,
    reach=2 each) — not investigated this lane, still open.
  - Did NOT do deep flag-hygiene (decided-winner) sweep — no fast path to experiment
    p-values via the bash helper; would need a targeted HogQL/experiment-results query.
