status: research-only
attempted: impact check for mode_card_rapid_reclick; flag hygiene sweep; mp_round sentiment analysis; zombie flag detection
files_touched: docs/nightly/impact-ledger.ndjson, docs/nightly/triage-queue.md, docs/nightly/reports/2026-07-21.md
next_steps: |
  1. Wire exp-mp-results-score-context-v1 in ResultsMainContent.tsx (mp 2p only, score-vs-avg chip)
  2. Expand exp-mp-lobby-connect-feedback-v1 to EN locale (/en/multiplayer same rage-click pattern, reach=5)
  3. Human: deactivate exp-mp-room-join-loading-v1 in PostHog (zombie, 0 callsites)
  4. mode_card_rapid_reclick neutral at 7d — re-check at 14d
