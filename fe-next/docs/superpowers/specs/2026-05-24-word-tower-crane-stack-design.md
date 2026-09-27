# Word Tower — Crane Stack placement layer

**Date:** 2026-05-24
**Status:** Spec + pure core (TDD). Pixi/interaction layer = follow-up.
**Gate:** none of its own — the crane lives inside the already-gated Word Tower (`word-tower` flag). Founder: no separate sub-flag for the crane.

## Idea (founder)
> "Build a word, then like real Tower Bloks try to place it correctly using the crane — if it isn't good it falls apart."

A block (the just-built word) sweeps on a crane above the tower top; the player taps to drop; overlap with the block below decides the outcome — misalignment trims the block, a bad miss topples.

## Cosy reconciliation (the key design call)
Stack is twitchy; we want cosy. So the crane is a **reward amplifier, not a fail-gate**:
- A **valid word always lands** — placement quality scales the *reward*, never survival.
- **PERFECT** (dead center): full block, height bonus (×1.4), perfect-combo + juicy chime.
- **GOOD / SLOPPY**: block trims to the overlap, reduced height (×1.0 / ×0.6).
- **MISS**: cosy "catch" at min width (×0.3). Only **3 bad drops in a row** wobble-topple **1** floor — recoverable, reusing the existing hazard topple. No single-drop game-over.

Vocabulary gate unchanged: the crane is an extra step *after* a valid word. Reduced-motion / accessibility: an instant-drop fallback (tap = drop now) and the existing auto-place path stay available when the flag is off.

> **OPEN FORK — "fall apart" consequence (decide before wiring the UI).** The founder said *"if it isn't good it will fall apart."* This spec bakes in the gentlest read (c). Three options:
> - (a) **Classic Stack** — bad drop ends the run.
> - (b) **Stack-lite** — bad drop loses real floors, a meaningful setback.
> - (c) **Reward-amplifier (current)** — barely any consequence; topple only after 3 bad drops in a row, recoverable.
> The pure core is parameterised, so switching is a constants tweak (`TOPPLE_AFTER_SLOPPY`, `MIN_CAUGHT_OVERLAP`, the height multipliers), not a rewrite. Confirm intent before the interaction layer.

## Phases
1. **Pure core (this session, TDD):** `lib/wordTower/cranePlacement.ts`
   - `evaluatePlacement(offset, consecutiveSloppy) → { quality, overlap, heightMultiplier, perfect, topples }`
   - `nextConsecutiveSloppy(prev, quality)` — reset on good/perfect, increment on sloppy/miss.
   - `craneOffsetAt(elapsedMs, periodMs)` — signed sine sweep position for the crane.
   - No separate feature flag — ships inside the Word Tower gate.
2. **Interaction + feedback (follow-up):** a moving crane indicator over the HUD (DOM, verifiable) → tap drops → outcome drives word height gain + PERFECT/GOOD/SLOPPY/MISS toast + sounds (reuse `playPerfectWordSound`, `playWordAcceptedSound`, `playComboBreakSound`, hazard topple).
3. **Pixi richness (follow-up):** real crane swing + variable-width trimmed blocks in `WordTowerScene`/`towerSprites`. Admin-gated, no headless verify — founder live-checks.

## Thresholds (normalized drop error, 0 = center)
| offset | quality | overlap | height× | topples |
|--------|---------|---------|---------|---------|
| ≤0.08 | perfect | 1.0 | 1.4 | no |
| ≤0.25 | good | 1−offset | 1.0 | no |
| ≤0.6 | sloppy | 1−offset | 0.6 | no |
| >0.6 | miss | max(0.2, 1−offset) | 0.3 | only if prior consecutiveSloppy ≥ 2 |

## Tests
Pure: threshold bands, offset clamping [0,1], overlap monotonic, topple only on miss-after-instability, sloppy counter reset/increment, crane sine bounds.
