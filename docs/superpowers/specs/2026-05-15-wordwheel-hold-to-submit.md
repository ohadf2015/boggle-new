# WordWheel Hold-to-Submit Ring

**Date:** 2026-05-15
**Files:** `fe-next/components/daily/WordWheelGame.tsx`, `WordWheelParts.tsx`, new `fe-next/hooks/useHoldToSubmit.ts`

## Goal

In click mode (not drag), once the player has selected ≥ minimum letters (3),
pressing-and-holding the next letter shows a progress ring filling around it.
Sustained press for `HOLD_SUBMIT_MS` (800ms) auto-submits the word, including
the held letter.

## UX rules

- Eligibility checked at `pointerdown`: not game-over, not currently dragging,
  `builtLetters.length >= 3` (so the ring only appears for the 4th letter onward
  — "above the minimum").
- Held letter is **unused** → eager-add it to the word on `pointerdown` + start
  ring + start timer. Suppress the trailing `onClick` so it isn't toggled back off.
- Held letter is **already used** → no add; start ring + timer; on completion
  submit without removing it; suppress trailing `onClick`.
- Quick release (< 800ms) → cancel timer + ring. On a used letter the trailing
  `onClick` still fires (normal remove).
- Drag engages mid-hold → cancel ring; eager-added letter stays in the word;
  drag-add of the remaining letters proceeds with no double-add (guarded by
  `eagerAddedIdxRef`).
- 800ms hold completes → haptic `[20,30,40]`, submit.
- Ring animates regardless of `prefers-reduced-motion` — it is functional
  feedback for a timed action (WCAG 2.3.3 "Essential" exception).
- Existing 1s idle auto-submit, double-tap submit, and drag-release submit are
  all left untouched. The idle path still covers passive submission of
  exactly-minimum-length words.

## Architecture

`WordWheelGame.tsx` is already ~1040 lines (project budget 500), so the new
logic lives in a hook:

```ts
useHoldToSubmit({
  minLength, holdMs,
  builtLettersRef, usedIndicesRef, draggingRef, gameOverRef,
  addLetter, submit, haptic,
}) => { holdingIndex, onLetterPointerDown, onLetterPointerEnd,
        cancelHold, shouldSuppressClick, getEagerAddedIndex }
```

- `addLetter` (in `WordWheelGame`) — extracted from `handleLetterPress`'s
  unused-letter branch. Synchronously writes `builtLettersRef.current` alongside
  `setBuiltLetters` so the drag-engage guard reads fresh state.
- `WheelLetter` (`WordWheelParts.tsx`) — new optional props `showHoldRing`,
  `onHoldStart`, `onHoldEnd`; renders an SVG `HoldRing` overlay.
- `handleLetterPress` — guarded at the top with `shouldSuppressClick()`.
- `tryDragHit` engage block — start-letter add guarded with
  `getEagerAddedIndex() !== startIdx`; calls `cancelHold()`.

Click suppression uses a timestamp (`Date.now() + 150`) rather than a boolean,
so it self-clears if the trailing `onClick` never fires (touch slip / scroll).

## Test matrix (Vitest, fake timers)

1. `< 3` letters + press-and-hold → no ring, no submit.
2. `≥ 3` + unused letter + pointerdown → letter added immediately.
3. `≥ 3` + unused letter + hold 800ms → submit called with the held letter.
4. `≥ 3` + unused letter + quick release → letter stays, no submit, onClick suppressed.
5. `≥ 3` + used letter + quick release → letter removed (onClick fires).
6. `≥ 3` + used letter + hold 800ms → submit called, letter not removed.
