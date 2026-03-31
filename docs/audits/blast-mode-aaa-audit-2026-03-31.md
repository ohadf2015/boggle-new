# Blast Mode AAA Audit -- 6-Expert Team Report
**Date:** 2026-03-31
**Experts:** Visual/Graphics, Game Feel/Juice, UX/UI Design, Performance, Game Design, Audio/Sound

---

## Executive Summary

**Overall Score: 3.5/10** (against Candy Crush / Match Masters / Bejeweled 3 benchmarks)

Blast mode has strong mechanical foundations -- 13 tile types, 31 combos, cascade chains, DDA, seeded multiplayer. But it plays like a **silent prototype with flat visuals**. The most damning finding across all 6 experts: **multiple fully-built features exist as dead code** that were never wired into the production game.

### Dead Code Features (built but never connected)
| Feature | File | Impact |
|---------|------|--------|
| Blast-specific haptics (bomb/lightning/prism patterns) | `hapticFeedback.ts:179-201` | HIGH -- zero haptic feedback in all of Blast |
| Tile clear rotation (`clearRotate` prop) | `BlastTile.tsx:19`, `BlastBoard.tsx:150` | MEDIUM -- tiles always clear at 0deg |
| Near-miss detector | `blastNearMiss.ts:36-90` | HIGH -- tested, complete, never called |
| CSS idle animations (10 tile types) | `globals.css:922-1101` | CRITICAL -- gold shimmer, bomb pulse etc exist but classes not applied |
| PixiJS particle system (11 presets) | `presets/particles.ts` | HIGH -- full particle engine unused in production |
| Color tokens (SHATTER/CHAIN/NEBULA) | `blastColorTokens.ts` | MEDIUM -- exported but never imported |
| `useBlastEngineSounds` hook | `blastEngine/hooks/useBlastEngineSounds.ts` | MEDIUM -- complete sound hook, never imported |
| `playComboSavedSound` | `SoundEffectsContext.tsx` | LOW -- exists, never called from Blast |

**Wiring these dead features alone would jump the score from 3.5 to ~5.5/10 with minimal new code.**

---

## Findings by Expert

### 1. Visual/Graphics Expert -- Score: 3.0/10

| # | Finding | Severity | Current | AAA Target |
|---|---------|----------|---------|------------|
| V1 | Tiles are flat Tailwind gradients, no specular/depth/bevel | CRITICAL | Flat CSS | 4-5 layer depth per tile |
| V2 | Zero destruction particles -- tiles just scale+fade | CRITICAL | opacity:0 | Shatter debris, shockwaves |
| V3 | Cascade chains lack progressive drama (vignette, zoom, trails) | HIGH | Box-shadow glow only | Screen darkening, chromatic aberration |
| V4 | Score flies are small, no trail, no HUD bounce on receive | HIGH | 3-tier Framer Motion arc | Outlined text, particle trail, counter bounce |
| V5 | No screen effects (vignette, bloom, chromatic aberration) | HIGH | None | Post-processing layers |
| V6 | Background is flat `bg-neo-navy`, no ambient particles | MEDIUM | Solid color | Reactive nebula, floating bokeh |
| V7 | Wave/game-over transitions have no cinematic moment | MEDIUM | Static text layout | Confetti, score tally, board dissolve |
| V8 | CSS idle animations exist in globals.css but NOT APPLIED to tiles | CRITICAL | Dead CSS | Shimmer, pulse, rainbow cycle |

**Key insight:** The PixiJS prototype (`BlastGameCanvas.tsx`) already implements particles, screen shake, and score flies -- but it's not wired to production. Sprint 1 should wire existing assets before building new ones.

### 2. Game Feel/Juice Expert -- Score: 4.6/10

| # | Finding | Severity | Current |
|---|---------|----------|---------|
| J1 | No tile press-down squash (`:active` state missing) | HIGH | scale-105 up only |
| J2 | No SVG path connector between traced tiles | HIGH | Highlighted cells, no trail |
| J3 | No impact frame / freeze-frame on word accept | HIGH | Instant flow |
| J4 | Blast haptics are DEAD CODE (never called) | CRITICAL | Zero haptic feedback |
| J5 | `clearRotate` is defined but always undefined (never passed) | HIGH | Tiles clear at 0deg |
| J6 | Near-miss detector is DEAD CODE (tested, complete, never called) | CRITICAL | Zero near-miss feedback |
| J7 | No combo freeze-frame or dramatic pause | HIGH | Flash only |
| J8 | Score counter jumps instantly (no lerp/count-up) | MEDIUM | Static number |
| J9 | Move counter urgency is just color+pulse (no heartbeat, sound, vignette) | MEDIUM | animate-pulse |
| J10 | Standard tiles are completely static (no idle breathing) | MEDIUM | Dead between actions |
| J11 | Wave clear has 2s dead time with no celebration visuals | HIGH | Empty wait |
| J12 | No cascade pitch rise in audio | MEDIUM | Same sound each chain |
| J13 | Combo activation has no type-specific text overlay | MEDIUM | Generic flash only |

**Top 3 bang-for-buck:** Wire haptics (5 lines), wire clearRotate (2 lines), wire near-miss (10 lines).

### 3. UX/UI Expert -- 32 Findings

| # | Finding | Severity |
|---|---------|----------|
| U1 | HUD cognitive overload -- 7 data points in 40px bar | HIGH |
| U2 | 13 tile types with NO tutorial, NO help screen wired | CRITICAL |
| U3 | Combo system completely invisible (30+ combos, zero UI explains them) | CRITICAL |
| U4 | Objective labels show raw enum strings ("score_target", "collect_type") | HIGH |
| U5 | Objective text is 9px -- below minimum legible size | HIGH |
| U6 | Chain text covers entire viewport for 1.2s (fixed inset-0 z-50) | HIGH |
| U7 | Score fly targets hardcoded pixels (breaks on RTL, different widths) | MEDIUM |
| U8 | Dead-end auto-ends game in 500ms -- no player agency | HIGH |
| U9 | SP results screen is minimal -- no stars, no PB, no share | HIGH |
| U10 | Wave transition doesn't preview next wave's new mechanics | HIGH |
| U11 | Word rejection gives no explanation (too short vs not a word vs duplicate) | HIGH |
| U12 | Color-blind players can't distinguish similar tile gradients | HIGH |
| U13 | No meta-progression visible during gameplay | HIGH |
| U14 | No social/competitive hooks in singleplayer | MEDIUM |

### 4. Performance Expert -- Score: Adequate with CRITICAL hotspot

| # | Finding | Severity | Impact |
|---|---------|----------|--------|
| P1 | Cascade state update storm: 20+ setState across awaits | CRITICAL | 12-15 unnecessary renders per word |
| P2 | Sequencer setTimeout jitter (~20ms timing drift) | HIGH | Perceptible animation inconsistency |
| P3 | Full 36-tile overlay re-render on each selection change during drag | HIGH | Reconciliation every 16ms during touch |
| P4 | Low-end devices get full CSS transitions (no isLowEnd check) | HIGH | Jank on budget phones |
| P5 | boxShadow glow triggers CPU repaint on every intensity change | MEDIUM | Continuous repaint |
| P6 | Dead worker file never wired | LOW | Dead code |

**DOM vs Canvas Verdict: HYBRID.** Keep DOM for accessibility + proven touch interaction. Use PixiJS canvas layer behind DOM grid for particles, screen shake, and glow effects. Fix cascade state storm first (move to refs, commit once at end).

### 5. Game Design Expert -- "Engine without a game designer's hand on the throttle"

| # | Finding | Severity |
|---|---------|----------|
| G1 | Near-miss system is DEAD CODE (3rd expert to flag this) | CRITICAL |
| G2 | DDA breaks competitive integrity in MP (per-player spawn modifier) | HIGH |
| G3 | Wave 5 introduces NOTHING new (dead wave -- punishment without reward) | HIGH |
| G4 | Wave 7+ is infinite treadmill with same 2 objectives forever | HIGH |
| G5 | Silver/gold/diamond are 3 tiles doing the same thing (score multiply) | HIGH |
| G6 | 31 combos is too many -- zero discoverability, mostly noise | MEDIUM |
| G7 | No pre-game booster selection (zero strategic meta-layer) | HIGH |
| G8 | No daily challenge specific to Blast | CRITICAL |
| G9 | Two competing star calculators (bug) | MEDIUM |
| G10 | Live leaderboard prop exists but is unused (`_leaderboard`) | HIGH |
| G11 | No anticipation beat before cascade resolution | HIGH |
| G12 | No onboarding/tutorial for 13 tile types | HIGH |
| G13 | DDA too primitive -- only adjusts spawn rate, triggers too late (3 fails) | HIGH |
| G14 | No vowel floor guarantee -- boards can be unplayable | MEDIUM |

### 6. Audio/Sound Expert -- Score: 1.5/10

| # | Finding | Severity |
|---|---------|----------|
| A1 | Only 3 distinct sounds in entire mode (18% coverage of 28 trigger points) | CRITICAL |
| A2 | Zero tile-type-specific destruction sounds | CRITICAL |
| A3 | Zero background music / ambient audio | CRITICAL |
| A4 | Zero haptic feedback (despite HapticsManager existing) | CRITICAL |
| A5 | `useBlastEngineSounds` is dead code (never imported) | HIGH |
| A6 | `playWordAcceptedSound` fires TWICE per word (bug at lines 258+264) | HIGH |
| A7 | Combo break only fires on game over, not on actual combo timeout | HIGH |
| A8 | No audio-animation synchronization (sequencer has no audio callbacks) | HIGH |
| A9 | No tile interaction sounds (tap, drag, path building) | HIGH |
| A10 | No cascade/chain pitch escalation | HIGH |

**Full Sound Bible provided:** 65+ sound specifications across 8 layers (interaction, resolution, destruction, cascade, combo, UI, celebration, ambient music).

---

## Cross-Expert Consensus: Top Issues

These issues were flagged by 3+ experts independently:

| Issue | Flagged By | Priority |
|-------|-----------|----------|
| Near-miss detector is dead code | Juice, Game Design, Audio | CRITICAL |
| Blast haptics are dead code | Juice, Audio, UX | CRITICAL |
| No tile destruction particles/effects | Visual, Juice, Audio | CRITICAL |
| No tutorial/onboarding for tile types | UX, Game Design | CRITICAL |
| Cascade state update storm | Performance | CRITICAL |
| CSS idle animations not applied | Visual, Juice | CRITICAL |
| No anticipation beat before cascades | Game Design, Juice | HIGH |
| No background music/ambient audio | Audio | CRITICAL |

---

## Improvement Roadmap

### Sprint 0: Wire Dead Code (1 day, ~50 lines changed)
*Impact: 3.5 -> 5.0/10*

| Task | Files | Lines |
|------|-------|-------|
| Wire CSS idle animation classes to BlastTile | `BlastTile.tsx` | ~10 |
| Wire blast haptics (bomb/lightning/prism) | `BlastGame.tsx` | ~5 |
| Wire clearRotate (random rotation per tile) | `useBlastSequencer.ts`, `BlastBoard.tsx` | ~5 |
| Wire near-miss detection + shimmer UI | `BlastGame.tsx`, new small component | ~30 |
| Fix double playWordAcceptedSound | `BlastGame.tsx:258,264` | ~2 |
| Wire SHATTER_COLORS/CHAIN_GLOW_COLORS to production | `BlastEffectsLayer.tsx`, `BlastTile.tsx` | ~10 |
| Disable DDA in multiplayer | `useBlastEngine.ts:291` | ~3 |
| Delete duplicate star calculator | `blastLevelClear.ts:106-112` | Delete |

### Sprint 1: Core Feel (2-3 days)
*Impact: 5.0 -> 6.5/10*

| Task | Priority |
|------|----------|
| Tile specular highlight + depth (::before/::after pseudo-elements) | CRITICAL |
| Tile active:scale-95 press state | HIGH |
| Score counter lerp animation | HIGH |
| HUD micro-animations (pulse on score update, combo pop-in) | HIGH |
| 300ms anticipation beat before cascade | HIGH |
| Move counter heartbeat at low moves | HIGH |
| Chain text scoped to board area (not fixed inset-0) | HIGH |
| Screen shake on every word clear (not just chain 3+) | MEDIUM |
| Board zoom during cascade chains | MEDIUM |

### Sprint 2: Destruction & Particles (3-4 days)
*Impact: 6.5 -> 7.5/10*

| Task | Priority |
|------|----------|
| CSS particle burst on tile clear (6-8 dots per tile) | CRITICAL |
| Bomb radial shockwave ring | HIGH |
| Lightning forked flash effect | HIGH |
| Prism rainbow ring | HIGH |
| Progressive vignette during chains | HIGH |
| Reactive background (NEBULA_COLORS gradient shift) | MEDIUM |
| Floating ambient particles | MEDIUM |
| SVG path connector between traced tiles | MEDIUM |

### Sprint 3: Audio Foundation (3-4 days)
*Impact: 7.5 -> 8.0/10*

| Task | Priority |
|------|----------|
| Tile-type destruction sounds (7 new .wav assets) | CRITICAL |
| Path-building chromatic tones (Web Audio oscillator) | HIGH |
| Word accepted length-scaled sounds | HIGH |
| Cascade pitch escalation per chain level | HIGH |
| Background music (4-stem reactive loop) | HIGH |
| Move counter warning sounds | MEDIUM |
| Wave clear fanfare + star reveal stamps | MEDIUM |
| Wire combo break to actual combo timeout | MEDIUM |

### Sprint 4: UX & Onboarding (2-3 days)
*Impact: 8.0 -> 8.5/10*

| Task | Priority |
|------|----------|
| Tile guide modal (wire onShowHelp) | CRITICAL |
| First-encounter tooltips for new tile types | HIGH |
| "Coming Next" preview on wave transitions | HIGH |
| Differentiated rejection feedback | HIGH |
| Objective labels translated (not raw enum strings) | HIGH |
| Dead-end: remove auto-timeout, require player action | HIGH |
| SP results rebuild (stars, PB, share card) | HIGH |
| Color-blind tile shape indicators | MEDIUM |

### Sprint 5: Game Design Polish (3-4 days)
*Impact: 8.5 -> 9.0/10*

| Task | Priority |
|------|----------|
| Rework wave progression (split W4, fix W5 dead spot) | HIGH |
| Wave 7+ rotating objective variety | HIGH |
| Merge silver into gold, rework diamond mechanic | HIGH |
| Pre-game booster selection | HIGH |
| Daily Blast Challenge (seeded board + leaderboard) | CRITICAL |
| Combo Codex UI (discovered vs undiscovered) | MEDIUM |
| Wire live leaderboard in MP | HIGH |
| 10s "final round" in MP | MEDIUM |
| Combo hint glow (nearby combinable tiles) | MEDIUM |

### Sprint 6: Performance (2 days)

| Task | Priority |
|------|----------|
| Cascade state: move to refs, commit once at end | CRITICAL |
| rAF-based sequencer (replace setTimeout) | HIGH |
| Selection via direct DOM class toggle during drag | HIGH |
| Low-end device adaptive checks for BlastTile | HIGH |
| Replace boxShadow glow with opacity-animated pseudo-element | MEDIUM |
| PixiJS hybrid layer for particles behind DOM grid | MEDIUM |

---

## Projected Score Progression

| Milestone | Score | Key Change |
|-----------|-------|------------|
| Current | 3.5/10 | Flat, silent, dead features |
| After Sprint 0 | 5.0/10 | Dead code wired, tiles shimmer, haptics work |
| After Sprint 1 | 6.5/10 | Depth, anticipation, micro-animations |
| After Sprint 2 | 7.5/10 | Particles, effects, atmosphere |
| After Sprint 3 | 8.0/10 | Full audio landscape |
| After Sprint 4 | 8.5/10 | Learnable, accessible, polished UX |
| After Sprint 5 | 9.0/10 | Deep, replayable, competitive |

---

## Total Findings: 96
- CRITICAL: 18
- HIGH: 42
- MEDIUM: 26
- LOW: 10

**Report:** `docs/audits/blast-mode-aaa-audit-2026-03-31.md`
