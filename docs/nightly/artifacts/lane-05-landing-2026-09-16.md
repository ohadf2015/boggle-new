status: shipped
attempted: STEP 0 default — improve one existing admin-beta mode (self-select axis), fallback landing variant only if disqualified
files_touched:
  - fe-next/host/components/pre-game/GameInstructions.tsx
next_steps: Word Tower MP mode had NO how-to-play entry (config lookup returned undefined → panel silently rendered null) — added one reusing existing wordTower.cardTitle/cardDesc + generic basics/combo keys (already localized 6 langs, zero new strings). Sealed Bid (crossword's sibling admin-gated mode) still lacks an entry too — same gap, next-night candidate. Verify visually as admin: open MP host pre-game, select Word Tower, confirm how-to-play panel now renders with the tower icon (purple) and 3 steps.
