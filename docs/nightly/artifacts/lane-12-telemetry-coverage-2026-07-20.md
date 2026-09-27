status: research-only
files_touched: docs/nightly/impact-ledger.ndjson, docs/nightly/reports/2026-07-20.md
next_steps: |
  1. Wire survival results_viewed: SinglePlayerResults.tsx:189 fires it but survival
     may skip that component — trace the survival results mount path and add
     trackGrowthEvent('results_viewed', { mode: 'survival', score }) on mount.
     56 game_completed with 0 results_viewed in 14d = highest-value backlog item.
  2. Rewire WordCraft telemetry — trackWordCraftAxisLocked/RecallAll/GameStarted all
     orphaned since ~07-06 WordCraft refactor; functions in wordCraftTelemetry.ts,
     need call sites in WordCraftGameScreen.tsx or useWordCraft* hooks.
     Was firing 61x/wk before going dark.
