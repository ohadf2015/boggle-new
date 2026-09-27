status: shipped
attempted: Coverage audit, impact check results_viewed/word-hunt, fix blast highlight-trap preventing BlastResultsSummary from mounting
files_touched:
  - fe-next/components/blast/legacy/BlastView.tsx
  - fe-next/components/blast/legacy/__tests__/BlastView.telemetry.test.tsx
  - docs/nightly/impact-ledger.ndjson
next_steps: |
  - Monitor blast results_viewed fires in PostHog (baseline was 0/14d, expect ~3/day after fix)
  - Wire results_viewed to classic/survival/wheel-rush (next highest traffic modes with no results_viewed wiring)
  - classic: 375 starts / 165 completions in 14d — highest priority next
