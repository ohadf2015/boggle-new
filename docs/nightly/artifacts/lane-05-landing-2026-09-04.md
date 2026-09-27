status: shipped
attempted: STEP 0 mode-improvement — selecting admin-beta target, will ship one axis improvement
files_touched: fe-next/components/multiplayer/WheelRushCelebration.tsx, fe-next/components/multiplayer/WheelRushView.tsx, fe-next/translations/{en,he,sv,ja,es}.js
next_steps: eslint0 + tsc0 confirmed on both changed .tsx files (full tsc -p tsconfig.json grep for these two filenames returned nothing). Streak resets on round init (onInit) and on any 'almost' tier clear; only 'all' tier increments. Mode improvement block appended to docs/nightly/reports/2026-09-04.md. None — slice is complete and verified.
