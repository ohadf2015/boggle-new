# Blast Mode Rework Plan — "Candy Crush Feel"

> **Goal**: Transform Blast Mode from "functional but flat" to "juicy and addictive"
> **Philosophy**: Don't rebuild mechanics — rebuild *feel*. The 13 tile types, 39 combos, and cascade system are solid. The problem is timing, rhythm, and feedback escalation.

---

## Diagnosis: Why It Doesn't Feel Fun

### 1. No Anticipation-Release Rhythm
- Word submit → everything fires at once (explosions + cascade + score)
- Candy Crush: match → brief anticipation pause → explosion → gravity → surprise cascade
- **Fix**: Sequence effects with deliberate pauses between phases

### 2. Flat Cascade Feedback
- Chain 1 looks/sounds identical to chain 4
- No escalating text ("Sweet!" → "Divine!"), no pitch-shifting, no growing particles
- **Fix**: Escalating feedback tiers per chain level

### 3. Orphaned Juice Systems
- `useBlastIntensity` — defined but never called (intensity always undefined)
- `BlastBoardIntensity` — imported but never rendered
- `BlastShatterEffect` — defined, never used
- `useBlastSugarCrush` — exists but not wired to game end
- **Fix**: Wire all existing juice systems

### 4. No Move Urgency
- Waves 1-2 have 20/18 moves but feel infinite (no pressure)
- No visual urgency when moves are low (no color shift, no pulse)
- **Fix**: Visual urgency at ≤3 moves, tighter move budgets

### 5. Score Feedback is Weak
- Score just increments a number — no physical weight
- No score-fly animation (points traveling to counter)
- No counter "bump" on big scores
- **Fix**: Score fly + counter bump + slot-machine roll

### 6. Tile Clear Feels Weightless
- Tiles scale to 0 and vanish — no "pop" moment
- No white flash before destruction (Candy Crush's key trick)
- No tile-specific destruction styles
- **Fix**: Flash → scale up → burst particle pattern

### 7. Gravity Has No Weight
- Tiles translate down with spring easing but no stagger between columns
- All tiles land simultaneously — feels mechanical, not physical
- **Fix**: Column stagger (30-50ms offsets), landing bounce, dust particles

---

## Sprint Plan (4 Sprints)

### Sprint 1: "The Feel" — Animation Timing Rework
> **Impact**: Highest. This single sprint will transform the game feel.
> **Scope**: Modify timing constants, add anticipation pauses, wire orphaned systems.

#### 1A. Rework Cascade Timing Constants
**File**: `BlastCascadeOverlay.tsx`, `useBlastCascade.ts`

Current:
```
clear: 200ms + 6ms stagger
pause: 80ms
fall: 180ms + 40ms/row
appear: 160ms + 8ms stagger
```

New timing (Candy Crush rhythm):
```
anticipation: 120ms (tiles flash white + scale 110%)  ← NEW
clear: 180ms (burst outward from center)
pause: 150ms (let eye register empty spaces)  ← was 80ms
fall: 250ms + 50ms/row (real gravity feel)    ← was 180+40
land_bounce: 80ms (overshoot + settle)         ← NEW
appear: 200ms + 12ms stagger (pop in from above) ← was 160+8
chain_pause: 100ms (between cascade chains)    ← NEW
```

#### 1B. Add Anticipation Phase
**File**: `BlastCascadeOverlay.tsx`

Before tiles clear, add 120ms where:
- Matched tiles flash to white (brightness filter)
- Scale up to 110% (the "about to pop" moment)
- All other tiles dim slightly (opacity 0.7)
- This creates the critical anticipation beat

#### 1C. Column-Staggered Gravity
**File**: `BlastCascadeOverlay.tsx`

Current: all tiles fall simultaneously
New: each column starts falling 30ms after the previous
- Creates "rain" effect instead of synchronized drop
- Add 2px overshoot bounce on landing
- Optional: tiny dust particle at landing position

#### 1D. Wire useBlastIntensity
**File**: `BlastGame.tsx`, `BlastGameLayout.tsx`

- Call `useBlastIntensity(comboLevel, cascadeChainLevel, comboStreakLevel, isHotPhase)` in BlastGame
- Pass intensity to BlastGameLayout
- Render `BlastBoardIntensity` wrapping the grid (currently imported but not in JSX)
- Render `BlastReactiveBackground` (already conditional on intensity > 0, will now work)

#### 1E. Wire Sugar Crush End Sequence
**File**: `BlastGame.tsx`, `BlastView.tsx`

- When moves exhausted → trigger Sugar Crush: remaining specials fire sequentially (300ms each)
- Convert remaining moves to random special tiles first
- Each detonation adds score with flying popup
- After all specials fired → proceed to wave transition

#### 1F. Add Chain Escalation Feedback
**File**: `BlastCascadeOverlay.tsx`, `BlastGameLayout.tsx`

Per chain level, escalate:
| Chain | Text | Shake | Particle Density | Speed |
|-------|------|-------|-------------------|-------|
| 1 | — | none | 1x | 1.0x |
| 2 | "Nice!" | subtle (2px) | 1.5x | 0.85x |
| 3 | "Amazing!" | medium (4px) | 2x | 0.7x |
| 4+ | "INCREDIBLE!" | strong (6px) | 3x | 0.6x |

Text uses Framer Motion: enter at 150% scale, settle to 100%, fade out over 800ms.

---

### Sprint 2: "The Juice" — Score & Tile Feedback
> **Impact**: High. Makes every word submission feel rewarding.

#### 2A. Score Fly Animation
**New component**: `BlastScoreFly.tsx`

When tiles clear:
1. Score number spawns at center of cleared tiles
2. Arcs toward score counter (quadratic bezier, ~600ms)
3. Score counter "bumps" (scale 1→1.15→1, 200ms) on absorption
4. Counter rolls digits slot-machine style for big scores (>50pts)

#### 2B. Tile Destruction Styles by Type
**File**: `BlastCascadeOverlay.tsx`, `BlastExplosionLayer.tsx`

| Tile Type | Destruction Style |
|-----------|-------------------|
| standard | White flash → shrink → 3 particles |
| gold | Golden burst → coin-flip spin → sparkle trail |
| bomb | Expand → flash red → 3x3 shockwave ring |
| lightning | Electric crackle → column beam (top→bottom, 150ms) |
| prism | Rainbow refraction → cross beams extend outward |
| ice | Crack lines appear → shatter into 6 shards |
| gem | Glow intensify → 3 gem shards fly out → collect animation |
| diamond | Brilliant flash → prismatic rays → 5x text |

#### 2C. Word Length Celebration Tiers
**File**: `BlastGame.tsx`, new `BlastWordCelebrationText.tsx`

| Length | Feedback |
|--------|----------|
| 3 | Clean pop, +score |
| 4 | "Good!" text, slightly bigger particles |
| 5 | "Great!" text, screen glow pulse |
| 6 | "Amazing!" text, board shake, particle burst |
| 7+ | "INCREDIBLE!" text, full screen flash, massive particles |

#### 2D. Combo Detonation Sequencing
**File**: `clearTilesProcessor.ts`, `BlastExplosionLayer.tsx`

Current: all combo effects fire simultaneously
New: stagger combo effects 200ms apart
- First tile effect fires → 200ms pause → second tile effect
- Creates the "one-two punch" feeling
- Camera (board) shakes on each hit separately

#### 2E. Move Counter Urgency
**File**: `BlastMoveCounter.tsx`, `BlastGameLayout.tsx`

| Moves Left | Visual |
|------------|--------|
| >5 | Normal display |
| 3-5 | Yellow pulse, subtle scale breathing |
| 1-2 | Red pulse, stronger breathing, board edge tint |
| 0 | Flash → Sugar Crush sequence |

---

### Sprint 3: "The Polish" — Transitions & Progression Feel
> **Impact**: Medium. Makes the session arc feel complete.

#### 3A. Wave Intro Cinematic
**File**: `BlastWaveIntro.tsx` (rework)

- Wave number slams in from top (spring animation)
- Objectives slide in with stagger
- New tile types for this wave preview with glow
- 1.5s total, skippable with tap
- "GO!" text with burst → game starts

#### 3B. Wave Complete Celebration
**File**: `BlastLevelClearOverlay.tsx` (rework)

1. All remaining tiles burst in radial wave from center (100ms stagger rings)
2. Stars fill in sequence (1→2→3) with individual celebrations
3. Score tallies with accelerating tick sound feel (counter rolls fast)
4. "Wave X Complete!" banner with confetti
5. 2s auto-advance or tap to continue

#### 3C. Board Clear "Shatter" Effect
**File**: `BlastShatterEffect.tsx` (currently unused — wire it)

When >80% of board cleared in single cascade chain:
- Board cracks from impact point (CSS clip-path animation)
- Fragments fly outward with physics
- Screen flash + strong shake
- Bonus score popup "BOARD CLEAR!"

#### 3D. Near-Miss Motivation
**File**: `BlastNearMissIndicator.tsx` (new)

When objective is 80%+ complete:
- Objective bar glows and pulses
- "Almost there!" text appears briefly
- Remaining target tiles shimmer

#### 3E. Idle Hint Enhancement
**File**: `useBlastHint.ts`

After 5s of no interaction:
- Valid word path tiles gently shimmer (current behavior, enhance)
- Add subtle "trail" connecting the tiles
- First hint is free, subsequent hints cost a move

---

### Sprint 4: "The Rebalance" — Wave Design & Difficulty
> **Impact**: Medium. Makes the game challenging and replayable.

#### 4A. Wave Rebalance
**File**: `blastWaveConfig.ts`

Current problem: Waves 1-2 feel like tutorials, Waves 5-6 spike hard.

New curve:
| Wave | Grid | Moves | Specials | Feel |
|------|------|-------|----------|------|
| 1 | 5×5 | 15 | 8% | Tutorial — easy but not boring |
| 2 | 5×5 | 14 | 12% | Introduction — first real objectives |
| 3 | 6×6 | 16 | 15% | Expansion — bigger board, more combos |
| 4 | 6×6 | 14 | 18% | Challenge — tight moves, mixed objectives |
| 5 | 6×6 | 12 | 22% | Expert — every move counts |
| 6+ | 6×6 | 10 | 25% | Endless — scaling difficulty |

Key changes: Start with 5x5 (less overwhelming), fewer moves on wave 1 (creates urgency from start), wave 3 expands to 6x6 (feels like progression).

#### 4B. Objective Variety
**File**: `blastWaveObjectives.ts`

Add missing objective types:
- **Letter Drop**: Specific letters must reach bottom row (gravity-driven)
- **Color Clear**: Clear all tiles of a specific type
- **Chain Target**: Achieve a cascade chain of N levels
- **Speed Round**: Time-limited wave (30s, unlimited moves)

#### 4C. Star Thresholds Rebalance
**File**: `blastStarCalculator.ts`

Current: based on clear % (50%/80%)
New: composite score:
- Clear %: 40% weight
- Score achieved vs target: 30% weight
- Longest chain: 15% weight
- Moves remaining: 15% weight

#### 4D. Dynamic Difficulty Adjustment Polish
**File**: `blastDDA.ts`

- If player fails wave 2x → reduce move count by 1 less, increase special spawn +3%
- If player 3-stars consistently → reduce moves by 1, decrease specials -2%
- Never show the player this is happening

---

## Implementation Order & Dependencies

```
Sprint 1 (The Feel) ← START HERE, highest ROI
  1D (wire intensity) — no deps
  1E (wire sugar crush) — no deps
  1A (timing constants) — no deps
  1B (anticipation phase) — depends on 1A
  1C (column stagger) — depends on 1A
  1F (chain escalation) — depends on 1A

Sprint 2 (The Juice) — after Sprint 1
  2A (score fly) — no deps
  2E (move urgency) — no deps
  2B (tile destruction styles) — depends on Sprint 1 timing
  2C (word celebrations) — no deps
  2D (combo sequencing) — depends on Sprint 1 timing

Sprint 3 (The Polish) — after Sprint 2
  3A (wave intro) — no deps
  3B (wave complete) — no deps
  3C (board shatter) — depends on Sprint 1
  3D (near miss) — no deps
  3E (idle hint) — no deps

Sprint 4 (The Rebalance) — after Sprint 3
  4A-4D can be done in any order
```

## Files Modified Per Sprint

### Sprint 1 (~12 files)
- `BlastCascadeOverlay.tsx` — timing + anticipation + column stagger
- `useBlastCascade.ts` — timing constants + chain pause
- `BlastGame.tsx` — wire intensity + sugar crush
- `BlastGameLayout.tsx` — render BlastBoardIntensity + chain text
- `useBlastIntensity.ts` — no changes needed (already correct)
- `BlastExplosionLayer.tsx` — particle density scaling
- `BlastComboFlash.tsx` — adjust timing to new rhythm
- New: `BlastChainText.tsx` — "Nice!", "Amazing!", "INCREDIBLE!" component

### Sprint 2 (~10 files)
- New: `BlastScoreFly.tsx` — score arc animation
- `BlastGameHeader.tsx` — score counter bump
- `BlastExplosionLayer.tsx` — tile-specific particles
- `BlastCascadeOverlay.tsx` — tile-specific destruction styles
- `clearTilesProcessor.ts` — staggered combo execution
- `BlastMoveCounter.tsx` — urgency states
- New: `BlastWordCelebrationText.tsx` — word length tiers

### Sprint 3 (~8 files)
- `BlastWaveIntro.tsx` — rework animation
- `BlastLevelClearOverlay.tsx` — rework celebration
- `BlastShatterEffect.tsx` — wire to game
- New: `BlastNearMissIndicator.tsx`
- `useBlastHint.ts` — enhanced shimmer

### Sprint 4 (~5 files)
- `blastWaveConfig.ts` — rebalance
- `blastWaveObjectives.ts` — new objective types
- `blastStarCalculator.ts` — composite scoring
- `blastDDA.ts` — polish adjustment curves

## Testing Strategy

Each sprint includes tests for:
- **Animation timing**: Verify cascade phase durations match constants
- **State transitions**: Phase machine flows correctly
- **Score calculations**: Fly animations carry correct values
- **Accessibility**: All new animations respect `useReducedMotion()`
- **Multiplayer**: Seeded RNG still produces deterministic results
- **i18n**: All new text strings use `t('key')` pattern

## Success Criteria

After all 4 sprints, Blast Mode should feel:
1. **Rhythmic** — clear anticipation → action → cascade → surprise pattern
2. **Escalating** — small words feel clean, long words feel POWERFUL
3. **Urgent** — every move matters, no "infinite moves" feeling
4. **Surprising** — cascades create "I didn't expect that!" moments
5. **Complete** — wave start → gameplay → celebration → next wave feels like a full arc
