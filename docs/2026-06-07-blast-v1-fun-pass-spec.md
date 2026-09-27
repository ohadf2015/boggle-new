# Blast v1 (legacy) Fun Pass — Spec

**Date:** 2026-06-07
**Goal (user):** Make Blast v1 more fun — variable rewards, more effects/juice, randomize "perfect" round-number scores, generate assets, remove confusing locked tiles, give frozen tiles a visible one-hit melt, bump Blast up the mode order (under MP).

> Scope target = LIVE **v1 = legacy** implementation (`components/blast/legacy/`, `lib/blast/` non-v2, `shared/utils/scoring.ts`, `backend/modules/blastModeManager.ts`). NOT `lib/blast/v2/` (admin preview).

## Council synthesis (gemini + grok)
- Variable rewards = **upside-only treasure roll** with a FLOOR (never pay less than base), shown as base+bonus, seeded + capped (anti-cheat safe).
- Frozen = state machine: full → cracked (1 hit, visible partial melt: crack + drip/mist + ice tinkle + light haptic) → shatter (clear). Save big ovation for the clear.
- "Locked" confusion = the **padlock icon** — drop it; frozen reads as ice; frozen-reject uses blue ice-shake, not red wrong-word shake.
- De-round at the **presentation layer** first (483 not 500); seeded bonus lines on result card.
- Juice = causal + staggered feedback stack; cascade ladder by chain depth; reduced-motion fallback.

## Key edit sites (verified)
| Concern | File:line |
|---|---|
| Frost hit decrement / `frost-crack` effect | `components/blast/legacy/utils/clearTilesProcessor.ts:124-129` |
| Tile crack CSS class | `components/blast/legacy/BlastTile.tsx:98-121` |
| Padlock overlay render | `components/blast/legacy/BlastTile.tsx:414-453` |
| `isLocked` derivation | `components/blast/legacy/BlastBoard.tsx:308` |
| Tile state type | `shared/types/blast.ts:96-129` (`hitsRemaining`) |
| Solo score finalize + ScoreFly | `components/blast/legacy/hooks/useBlastWordHandler.ts:122-152` |
| ScoreFly component/props | `components/blast/legacy/BlastScoreFly.tsx:8-18` |
| Milestone array + display | `components/blast/legacy/BlastScoreMilestone.tsx:22,170` |
| Juice kit | `components/blast/legacy/effects/blastJuiceKit.ts:58-62` |
| Reduced motion gate | `hooks/useDevicePerformance.ts`, `BlastFxBridge.tsx:18` |
| Mode order | `components/landing/LandingChallengeCards.tsx` serverOrder block; `lib/landing/fetchGameModeStats.ts:95` |

## Plan (TDD, commit per phase)

### Phase 1 — Frozen melt + de-lock (directions 4,5)
- Remove padlock Lock icon overlay for ice/frozen; render frost/ice visual instead (snowflake corner + frost tint), keep blurred inner-type hint without the lock.
- Make first-hit partial-melt unmistakable: strengthen `blast-tile-frozen-cracked` (and add ice cracked) CSS — visible crack lines + slight melt/drip + opacity bump; add melt-mist particle on `frost-crack` activationEffect (reduced-motion → static cracked frame).
- (Optional) blue ice-shake reject on tapping un-thawed frozen instead of red shake.
- Tests: BlastTile render has no Lock icon for frozen/ice when locked; cracked class applied at hitsRemaining=1; effect mapping for `frost-crack`.

### Phase 2 — Variable rewards + de-round scores (directions 1,3)
- New pure `lib/blast/blastTreasureRoll.ts`: `rollTreasure({seed, base, comboLevel, cascadeDepth, hasSpecial})` → `{ tier:'common'|'lucky'|'jackpot', bonus:number, multiplier }`. Upside-only (bonus ≥ 0), capped (≤ base, hard ceiling), seeded (deterministic, server-verifiable shape). Probabilities ~70/25/5, biased up by combo/cascade/special.
- Wire into SOLO `useBlastWordHandler` only (MP stays deterministic for fairness). Surface base + bonus in ScoreFly (extend `ScoreFlyEvent` with `bonus?`, `luckyTier?`).
- De-round milestones (presentation-only, both modes): seeded organic offset on displayed milestone number (e.g. 100→{97..118}) while crossing logic unchanged.
- Tests: treasure roll floor (never < base), cap, determinism (same seed → same result), bias monotonicity; milestone display jitter deterministic + within band.

### Phase 3 — Juice/effects (directions 2,6)
- Cascade juice ladder: ensure depth 1 pulse → 2 vignette/time-dilation → 3+ shake → 5+ megaPunch (wire/strengthen existing juice kit triggers).
- Lucky/jackpot treasure roll triggers extra burst + ScoreFly gold tier.
- Partial-melt FX from Phase 1.
- All gated by reduced-motion/device-perf.

### Phase 4 — Assets
- Generate: frost-crack sprite / ice-melt, lucky-shimmer glint, refreshed mode card if warranted. Tool: mcp-image. Place under `public/`.

### Phase 5 — Mode order (direction 7)
- Move Blast to sit right after Multiplayer/Arena in `LandingChallengeCards` serverOrder + `DEFAULT_ORDER` in `fetchGameModeStats.ts`.

## Guardrails
- TDD mandatory (RED→GREEN). `t()` for all UI text ×5 langs. Reduced-motion fallbacks. Files <500 lines. Run lint+test+build. Commit per phase (ask first).
- MP score authority untouched (no random server scoring). Variable reward = solo only.
