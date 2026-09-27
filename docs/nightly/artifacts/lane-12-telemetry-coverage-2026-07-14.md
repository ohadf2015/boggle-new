status: shipped
attempted: Run coverage audit, check impact-check for word-wheel results_viewed, fix highest-value dead/silent event
files_touched:
  - fe-next/components/blast/legacy/BlastResultsSummary.tsx
  - fe-next/components/blast/legacy/__tests__/BlastResultsSummary.test.tsx
  - docs/nightly/impact-ledger.ndjson
  - docs/nightly/reports/2026-07-14.md
next_steps: Wire results_viewed for word-hunt (DailyWordHuntResults.tsx) and wheel-rush — same pattern; 22 tests green, eslint clean
