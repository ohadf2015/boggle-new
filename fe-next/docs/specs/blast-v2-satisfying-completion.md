# Blast V2 — Satisfying Completion, Faster Results, Creative Reveals

Status: in progress · Owner: nightly/Ohad · Created 2026-05-29

## Problem (from goal brief)

Blast V2 "still not good enough":
1. Result screen + continue-to-next-level too slow (~1900ms gate before "Next" is usable).
2. Result page should look better / feel satisfying.
3. Levels should save progress unless the player failed.
4. If ≤2 tiles remain undestroyed, player should still **finish** the level, but earn **fewer stars** (missed the target words).
5. More gaps preventing the mode from feeling fun.
6. Better animations / feel.
7. Level definitions more satisfying — words revealed in **unexpected** ways.
8. More **creative** modifiers (current 3 are just reward-rate multipliers).

## Diagnosis (from code map)

- Win condition is all-or-nothing: `level.words.every(found)` (`useBlastV2.ts:74`). Clear 90% of the board but miss one theme word → stuck forever. **Biggest fun-killer.**
- No fail state exists (infinite undo/shuffle, no timer/moves). So "save progress unless failed" = advance on completion (already true); the only non-completion is **abandoning mid-level** (closing tab), which correctly doesn't advance. **No new fail machinery needed.**
- Result delay `(chainDepth-1)*350 + 700ms` + ~500ms GSAP. `useCompleteCardDelay.ts:30` has a dead placeholder line.
- `starRating` `solid`→2★ path doesn't require all-theme; under the new partial-clear path it would wrongly grant 2★.
- Theme-word finds use the same FX as bonus words; bonus words actually feel *more* rewarded (BONUS pill). Backwards reward psychology.
- Modifiers (gem_rush/coin_bonanza/bonus_storm) only scale reward rates — no gameplay variety.
- Flat moments: gravity collapse FX is a no-op, invalid feedback muted, no board entrance fanfare, double-bonus/frozen-thaw payoffs weak.

## Design decisions (revised after advisor review)

- **Partial completion via FORMABILITY, not raw tile count.** Raw tile count is wrong: generated boards are mostly filler letters, so a player can clear all theme words and still sit at 15+ tiles. The precise "board has nothing left to give" signal — and the actual soft-lock bug — is `detectAllCascades(level, found, config).length === 0` (no remaining theme word is still formable). Completion fires when:
  `allThemeFound || noThemeWordFormable || tilesRemaining <= 2`
  - `noThemeWordFormable` is the soft-lock rescue (collapse stranded a target → previously stuck forever). Completing is the only escape, so no floor needed (a player can't make words unformable by *not* playing — words stay formable until their tiles are removed).
  - `tilesRemaining <= 2` kept purely to honor the literal brief; harmless OR-clause that rarely fires alone.
  - Checked **only in the post-clear submit branches** (`applyValidatedSubmit` AND `applyForceBonus` — both, or a bonus word that strands the last theme word leaves the player stuck).
  - **CRITICAL (advisor #2):** must use the **unfiltered** `detectAllCascades(newLevel, newFound, config)` ("are ANY theme words still formable"). Do NOT reuse the `revealed` var at `useBlastV2.ts:178-181` — that is filtered to *newly* formable words (`!formableBefore.has`) and would give false completions. Capture the raw call result before the `.filter`.
  - Extract a pure `computeCompletion(level, found, config) → { complete, reason }` in `engine/cascade.ts` and unit-test the formability branches directly.
  - A degenerate board that *starts* with ≤2 tiles or 0 formable never auto-completes on load because the check lives in the submit branch, not the initializer.
- **Star table** (explicit all-theme gate on BOTH branches):
  - `!allTheme` (partial / board-cleared, targets missed) → **1★** (the "finish but fewer stars" rule).
  - `allTheme && spotless && (fast || ≥1 bonus)` → **3★**.
  - `allTheme && hints≤1 && wrongs≤5` → **2★**.
  - `allTheme` otherwise → **1★**.
- **Server: NO change.** `clear-level/route.ts:76` hardcodes `stars = 1` and never trusts the client's rating — stars are client-display/local only. No `tilesRemaining` wire field. Anti-cheat (`validateLevelClear`) only checks words-in-level + time floor + coin ceiling; a partial finish has *fewer* found words → stricter, not looser. Nothing to waive. **State explicitly: "fewer stars on partial finish" is a local-UX promise, not server-enforced.**
- **Result speed**: `SETTLE_MS 700→300`, cap chain term at 2 beats, remove dead placeholder line; faster GSAP entrance; **tap-anywhere-to-advance available DURING the settle window** (let an impatient player skip the wait entirely — single biggest "feels faster" lever), not just after the card renders.
- **"Save progress unless failed"**: there is no fail state (infinite undo/shuffle). The only non-advancement was the *soft-lock* (stuck, effectively a fail). Partial-completion IS the mechanism that satisfies this — you now always complete + advance unless you abandon the tab. Mid-level board-state resume (resuming a half-solved board) is OUT of scope — the resume hint saves *which level*, not board state; Blast levels are short.
- **No invented timer/move-limit.** Casual mode stays casual.
- **`completionReason` set at completion time in the reducer** (snapshot into state when status flips to `levelComplete` + into HistoryEntry for undo), NOT re-derived in `useMemo` — a late collapse must not flip the reason while the card shows. (advisor #3)
- **Partial finish is framed as success, never punishment** (advisor #1): explorer players who strand a word via bonus collapses will trigger this. Copy = "Board cleared!" / celebratory, never "you missed N words". The star count carries the nuance, the words don't.
- **Tap-to-advance during settle = an overlay that captures the pointer** (advisor #5), isolated from the board beneath (no tile-select / drag leak); guarded by an `advancingRef`-style latch so it can't double-fire with the button.
- **Phase 4 `fog` decision (advisor #4):** tiles render face-down but **remain fully selectable and matchable** (trace-blind). This is a deliberate gameplay twist (select letters you can't see → "unexpected reveal"), reveal-on-adjacent-clear. Confirm no `validateSelection`/`detectAllCascades` change needed — matching reads `column.tiles`, which fog never alters; fog is a parallel display mask only.

## Phases (smallest-risk-highest-impact first; commit per phase, ask before commit)

- **Phase 1 — Partial completion + star rework** (pure logic, fully TDD'd). NO server change.
  Files: `useBlastV2.ts` (completion check uses formability in both submit branches; expose `completionReason: 'mastered' | 'partial'` on derived state), `anti-cheat.ts` (`starRating`: gate the `solid`→2★ branch on `allTheme`; add explicit `!allTheme → 1★`), `BlastGame.tsx` (derive reason → pass to complete card for copy). `clear-level` route untouched.
- **Phase 2 — Faster + better result screen.**
  `useCompleteCardDelay.ts` (SETTLE 700→300, cap chain at 2 beats, remove dead line), `BlastLevelCompleteCard.tsx` (tap-to-advance during settle, "Board cleared" vs "Mastered!" headline by reason, snappier GSAP, partial-finish styling), i18n keys ×5.
- **Phase 3 — Satisfying reveals + FX gaps.**
  Distinct theme-word "TARGET!" celebration vs bonus; celebrate cascade-created words ("you made APPLE!"); fill flat moments (gravity collapse, invalid punch, board entrance). Lean on existing `detectAllCascades` — **no `placement.ts` rewrite.** Commit/validate Phases 1–2 before starting this.
- **Phase 4 — ONE creative modifier: `fog`.**
  Tiles hidden (face-down) until an adjacent tile clears — directly serves the "unexpected reveal" goal and is mostly a render-layer concern (no `validateSelection` change). `bomb` and `wildcard` deferred to their own spec (wildcard breaks exact-letter matching in `validateSelection`/`detectAllCascades`/solver/anti-cheat — not one phase, three features).

## Test strategy

Phase 1 is pure functions → Vitest. Cover: partial completion fires only after a clear; `tilesRemaining<=2` completes; all-theme still 3★; partial caps at 1★; anti-cheat waiver for board-clear; degenerate start board doesn't auto-complete.
