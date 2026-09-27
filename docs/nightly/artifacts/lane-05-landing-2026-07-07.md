status: partial
attempted: STEP 0 — Crossword Progressive Clue Warmth (polish:try:crossword:6b3aba4a)

## What shipped
- `GameState` interface: added `slotAttempts: Record<string,number>` + `warmths: Record<string,'cold'|'warm'|'hot'>`
- `initGame` initializes both to `{}`; all `...state` spreads carry them — tsc-clean scaffold

## What did NOT ship (finalize cutoff)
- `inputLetter` warmth computation (wrong slot-fill → attempt++ → attempt≥2 → ratio→level)
- `CrosswordCell.tsx` warmth prop + bg ternary (check > cursor > warmth > inActiveSlot > cream)
- `CrosswordGrid.tsx` destructure warmths, pass warmth={warmths[key]}

## Next steps (resume here)
1. `gameState.ts` inputLetter: before `const next =`, add slotFilled→wrong→warmth block
2. `CrosswordCell.tsx`: add `warmth?:'cold'|'warm'|'hot'` prop, extend bg ternary
3. `CrosswordGrid.tsx`: destructure `warmths` from state, pass to CrosswordCell
