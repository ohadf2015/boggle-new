status: shipped
files_touched:
  - fe-next/app/[locale]/connections/daily/DailyPageClient.tsx
  - fe-next/lib/experiments.ts
  - fe-next/utils/growthTracking.ts
  - docs/nightly/reports/2026-11-08.md
  - docs/nightly/impact-ledger.ndjson
  - docs/nightly/triage-queue.md
next_steps: >
  New flag exp-connections-howtoplay-tap-v1 (id 350961) live 50/50 — read rage-click
  count on /es/connections/daily in ~7 days (impact-ledger entry has the query).
  Deactivated phantom flag exp-wordhunt-issue-probe-v1 (id 328881, zero code ever
  backed it) — if word_hunt issue-probing is still wanted, build fresh from
  exp-mp-round-issue-probe-v1 pattern, don't resurrect. Did not reach goal-3's
  "2-3 new events" quota beyond connections_howtoplay_tapped (1 event) — ran out of
  time budget after the flag-hygiene finding; pick up 1-2 more instrumentation gaps
  next run (candidates: growthradar rage-click surfaces, word-tower rage clicks per brief).
