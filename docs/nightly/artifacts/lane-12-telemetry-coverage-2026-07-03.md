status: research-only
files_touched: docs/nightly/reports/2026-07-03.md
next_steps: |
  1. Query PostHog for distinct_id overlap: users with game_completed[mode=classic] but no growth:results_viewed — confirms if it's consent-based (SP users opted out) or rendering-path issue
  2. If rendering issue: add debug console.log to SinglePlayerResults.tsx:188 useEffect temporarily, or check if SinglePlayerView ever routes SP completions through a different results component
  3. If consent: add results_viewed to CANONICAL_DUAL_EMIT (dual-emit for consent-independent tracking) — though this won't fix opt-out users
  4. Wire connections mode game_completed (2 starts, 0 completions)
  5. Delete zombie flags: exp-blast-wave-banner-v1 / exp-wordwheel-drag-hint-v1 (see open watches)
