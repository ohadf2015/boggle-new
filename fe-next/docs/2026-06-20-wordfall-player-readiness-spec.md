# Wordfall (Blast V2) — Player-Readiness Spec (2026-06-20)

> `/goal`: find gaps/bugs/UX issues, make Wordfall ready for players, actually fun,
> with more feel of progression. Mode = `/blast/v2`, single-player deterministic
> chain puzzle. Public per memory.

## Investigation findings (ground-truthed, not guessed)

| Area | Finding | Severity |
|---|---|---|
| **Hint button** | `onHint={() => { /* Plan 5 wires hints */ }}` in `BlastGame.tsx` — a literal empty stub. At L18+ players see a "Hint" button that does **nothing**. The `shuffle` reducer case (50c deduct + `hintsUsed++`, no visible help) is never dispatched. No board-highlight code ever existed. | **Bug — dead UI** |
| **Bonus words** | Free-form bonus hunting already works at **every level** (async verify→`onForceBonus`, BlastGame:225, ungated). HUD counter + per-word feedback already fire. But the **explanatory unlock card is at L25** — most players quit first and never learn the mechanic exists. The `bonusDictionary` flag only gates *instant inline* acceptance + the card. | **Discovery gap** |
| **Result card** | Well-built (stars hero, coins, chest bar, highlight). But the ONLY CTA is "Next Level" — no Replay, no Home. During play the bottom nav is hidden, so the cards are the only exit. | **UX gap** |
| **Failed card** | Only "Try Again" — no Home/exit either. | **UX gap** |
| **Progression** | Mechanic unlocks are very back-loaded: hint L18, bonus L25. The fun layers most players never reach. | **Pacing** |
| **Randomness** | Already handled by the **live** surprise system (`BlastSurpriseBanner`, PITY=4 → fires early). L1–30 replay-determinism is intentional + low felt value. **Defer P2 seeded-placement** (risk > reward). | OK / defer |
| **Empty void** | Board is bottom-anchored (gravity) in a tall area → at L1 the top ~60% of a desktop viewport is dead black space. Intentional falling aesthetic but reads unfinished early. | Polish — deferred (mechanic risk) |

## Scope (this PR)

### Phase 1 — Wire the dead hint button (real, visible feature)
- New `revealHint` reducer action in `useBlastV2.ts`: picks the next **formable**
  theme word via `detectCascade(level, foundWords, config)` (returns `{word, cells}`),
  sets `hintCells: CellId[]`, increments `hintsUsed`, fires `trackBlastHintUsed`.
  No-op if not playing / nothing formable.
- **Cost = a star, not coins.** `hintsUsed` already drives the rating (1 hint still
  allows 2★, 2+ → 1★). The reducer's `coins` is only the in-game delta, so the old
  `shuffle` coin-deduct charged nothing real and was confusing. Star penalty is the
  honest, friendly cost; the hint reveals ONE word and doesn't auto-solve.
- Clear `hintCells` on any board-changing action (submit / bonus / undo) by wrapping
  the reducer returns (`{...applyX(...), hintCells: []}`).
- `BlastBoard` already accepts `revealGlowCells` → fold `hintCells` into that union
  so the hinted cells glow. No new board prop needed.
- `BlastHud` hint button: add 💡 icon + aria; stays enabled while playing (reducer
  no-ops when nothing to hint).
- Wire `BlastGame` `onHint` → `handlers.onRevealHint`; pass `state.hintCells` to board.

### Phase 2 — Result/Failed card escape routes
- `BlastLevelCompleteCard`: add a secondary CTA row below "Next Level": **Replay**
  (re-mount same level = `onRetry`) + **Home**. New optional props `onReplay`, `onHome`.
- `BlastLevelFailedCard`: add **Home** beside "Try Again". New optional `onHome`.
- `BlastGame` threads `onReplay`/`onHome`; `BlastV2PageClient` provides
  `onHome={() => router.push('/' + locale)}` (homepage).

### Phase 3 — Front-load progression (teach the fun earlier)
Sync BOTH `mechanic-flags.ts` gates and `mechanic-cards.ts` `level`:
- `revealLetterHint`: 18 → **7** (recourse arrives right before frozen-tiles L8).
- `bonusDictionary`: 25 → **9** (teach + speed up a mechanic already live from L1).
New cadence: 3 coin · 4 reverse · 6 gem · 7 hint · 8 frozen · 9 bonus · 12 cascade ·
15 double · 30 wordHint · 35 lateral · 40 multi. No collisions.
- Board-generation gates (coin/gem/frozen/doubleBonus) are **unchanged** → solvability
  + generator tests untouched.

### Deferred (flagged, not done)
- **P2 seeded board placement** — low felt value, touches solvability assert. Surprise
  system already supplies variety.
- **Empty-void layout** — falling-tile gravity is intentional; vertical-centering risks
  the mechanic feel. Browser-verify required; out of scope here.

## Testing
- TDD: `mechanic-flags.test.ts` (new gate levels), `useBlastV2` hint action tests,
  card CTA tests (Replay/Home present + fire callbacks).
- `npm run lint && test (changed) && tsc` per phase. Browser re-verify hint glow + cards.
- i18n keys (`blast.complete.replay`, `blast.complete.home`, `blast.failed.home`,
  `blast.hint.*`) added ×5 native.
