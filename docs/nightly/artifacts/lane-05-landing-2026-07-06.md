status: research-only
attempted: crossword Progressive Clue Warmth (polish:try:crossword:6b3aba4a) — discovered target, mapped implementation, hit time cutoff before edits
files_touched: none
next_steps: |
  Implement crossword warmth feedback (4 files, ~30 lines total):
  1. fe-next/lib/crossword/types.ts — add `warmth: Record<string, 'cold'|'warm'|'hot'>` and `checkCount: number` to GameState
  2. fe-next/lib/crossword/gameState.ts — in checkAll(): per-word correctCount -> warmth level (0=cold, 1..len/2=warm, >len/2=hot); only populate when checkCount>=2; increment checkCount; clear warmth on input alongside checks
  3. fe-next/components/crossword/CrosswordCell.tsx — add warmth prop; when check==='wrong' && warmth, override bg (cold=bg-neo-navy/20, warm=bg-amber-400/30, hot=bg-orange-500/40)
  4. fe-next/components/crossword/CrosswordGrid.tsx — pass warmth={warmth?.[key]} to each CrosswordCell
  No new i18n strings needed (purely visual). Spec: docs/nightly/reports/2026-06-30.md lines 106-111
