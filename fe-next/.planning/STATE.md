# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-30)

**Core value:** Adventure mode must feel immersive and connected to its themed worlds
**Current focus:** v2.0 Adventure Overhaul - Roadmap Creation Phase

## Current Position

Phase: 29 - Adaptive Difficulty System
Plan: 5 of 5 complete (PHASE COMPLETE)
Status: Complete
Last activity: 2026-01-31 — Completed 29-07-PLAN.md (Adaptive difficulty UI integration)

Progress: [█████░░░░░] 70% (23/33 v2.0 plans complete)

**Phase numbering context:**
- v1.1 completed Phases 15-21 (education + adventure features)
- v1.2 completed Phases 24-25 (platform integration)
- v2.0 starts at Phase 26 (continues from last delivered phase 25)

## v2.0 Milestone Scope

**Transform Adventure Mode** from static word-finding into visually spectacular, feature-rich experience.

**10 Phases (26-35) covering 76 requirements:**

1. **Phase 26: Meta-Progression Foundation** (21 reqs: META + JUICE + UI)
   - XP/leveling, gold currency, stat upgrades, game juice, HUD framework

2. **Phase 27: Dynamic Board Mechanics** (6 reqs: BOARD)
   - Candy Crush cascades, tile movement, explosions, special tiles

3. **Phase 28: Power-Up System** (7 reqs: POWER)
   - Freeze Time, Hint, Score Multiplier with cooldowns and balance

4. **Phase 29: Adaptive Difficulty System** (5 reqs: DIFF)
   - Pre-game difficulty selection, invisible adjustments, gradual hints

5. **Phase 30: Boss Battle Overhaul** (8 reqs: BOSS)
   - 5-phase state machine, telegraphed attacks, cinematics, unique graphics

6. **Phase 31: Skill Tree & Progression Depth** (10 reqs: SKILL + ACHIEVE)
   - Branching skill tree, horizontal progression, achievement system

7. **Phase 32: Visual Polish & Effects** (6 reqs: POLISH)
   - Confetti, fireworks, layered particles with budget enforcement

8. **Phase 33: Cinematic System** (5 reqs: CINE)
   - Remotion-based cutscenes, victory/defeat sequences, skippable after 2s

9. **Phase 34: Dynamic Difficulty Tuning (AI Director)** (5 reqs: DDA)
   - Performance tracking, invisible adjustments, analytics

10. **Phase 35: World Expansion & Tech Debt** (12 reqs: WORLD + DEBT)
    - Worlds 4-5 theming, entry timing fix, MP4 rendering, bug fixes

**Coverage:** 76/76 v2.0 requirements mapped (100%)

## Performance Metrics (v1.0 + v1.1 + v1.2 Complete)

**v1.0 Baseline:**
- Total plans completed: 62
- Total execution time: 4 days (2026-01-21 to 2026-01-25)
- Phases: 1-14 complete

**v1.1 Complete:**
- Plans completed: 42 across Phases 15-21
- Total phases delivered: 21/25 (84%)
- Features shipped: Chain combos, boss battles, education XP, achievements, analytics, rich lesson delivery

**v1.2 Complete:**
- Plans completed: 13 across Phases 24-25
- Features shipped: CrazyGames SDK integration, native iOS/Android apps

**v2.0 Metrics:**
- Roadmap phase: Complete
- Plans completed: 22 (Phase 26: 9 plans COMPLETE, Phase 27: 4 plans + 3 gap closures COMPLETE, Phase 28: 8 plans COMPLETE, Phase 29: 4 plans complete)
- Current phase: Phase 29 - Adaptive Difficulty System (4/5 plans complete)

## Accumulated Context

### v1.0 + v1.1 + v1.2 Decisions

Key decisions from previous milestones:

- **v1.0**: Focus on Worlds 1-3 only → Ship polished subset (Good)
- **v1.0**: Skip boss battles for now → Core adventure loop first (Good)
- **v1.0**: Combined parallax (gyro+gesture+ambient) → "Always alive" feel (Good)
- **v1.0**: Education as separate section → Distinct flow (Good)
- **v1.1**: Research-informed phase ordering → Combo before bosses/XP (Good)
- **v1.1**: Chain combo 1.5x multiplier → Progressive satisfaction curve (Good)
- **v1.1**: Boss 5-phase state machine → Clear game flow stages (Good)
- **v1.1**: Web Speech API over external TTS → Zero latency, offline-capable (Good)
- **v1.1**: WebView approach for native → Preserves SSR, no code duplication (Good)
- **v1.1**: CrazyGames SDK auth only → OAuth hidden on platform (Good)

### v2.0 Decisions

**Roadmap Architecture (2026-01-30):**
- Start phase numbering at 26 (continues from v1.2 Phase 25)
- 10 phases derived from requirement categories (not arbitrary structure)
- Front-load technical risk: Board mechanics (Phase 27) before boss overhaul (Phase 30)
- Horizontal power-up progression: Enable strategies, not inflate numbers
- Invisible adaptive difficulty: Pre-game primary, mid-game subtle
- Particle budget enforcement: Max 50-100 particles, adaptive reduction
- Transform-first animations: GPU-accelerated only, no layout properties
- Boss battles excluded from adaptive difficulty: Fixed patterns for learning

**Phase 26-01 (Adventure XP Utilities, 2026-01-30):**
- RuneScape XP formula: `floor(i + 300 * 2^(i/7)) / 4` for smooth exponential progression
- Max level 50: Manageable v2.0 scope, expandable in v2.1+
- Separate adventure XP from education XP: Different progression philosophies (excitement vs learning pace)
- Pure functions: No external state for easy testing and reusability across frontend/backend

**Phase 26-02 (Gold Currency, 2026-01-30):**
- Exponential gold growth (1.2x per level): Rewards progression without late-game inflation
- Exponential upgrade costs (1.5x per stack): Creates strategic choices, prevents easy max-out
- Max 5 stacks per upgrade: Clear ceiling prevents power creep, maintains balance
- Pure functions for currency logic: No side effects, easy to test and reason about

**Phase 26-03 (Screen Shake, 2026-01-30):**
- Web Animations API over Framer Motion: Zero dependencies, better performance for simple shake
- Transform-only animations: GPU-accelerated, no layout thrashing (verified via grep check)
- Reduced motion flash alternative: Opacity flash maintains feedback without motion (WCAG compliant)
- Conservative parameter ranges: Intensity 2-8px, duration 100-300ms to prevent nausea/motion fatigue

**Phase 26-04 (Adventure XP UI Components, 2026-01-30):**
- useAdventureXp hook returns pending updates: Separates state from persistence, allows parent to batch/handle errors
- Cyan color theme for adventure mode: Differentiates from education yellow, creates distinct identity
- Confetti skipped for reduced motion: Accessibility compliance (WCAG 2.1 AA), prevents motion sickness
- Auto-close modal after 3 seconds: Smooth UX flow without explicit dismiss, keeps game momentum
- Framer Motion for animations: Declarative API with spring physics, zero duration when reduced motion enabled

**Phase 26-05 (Currency Display & Upgrade Shop, 2026-01-30):**
- usePrefersReducedMotion hook for accessibility: WCAG 2.1 compliance, reusable across animated components
- CurrencyDisplay with coin icon: Clear gold visualization, number formatting with commas
- Recent gain animation: Flies up and fades (0.8s), instant for reduced motion users
- UpgradeShop purchase validation: Checks affordability and max stacks, clear feedback
- Neo-brutalist card layout: Hard shadows, chunky borders, high contrast (yellow/lime/black)

**Phase 26-06 (Adaptive Particle System & Score Popup, 2026-01-30):**
- Three-tier particle budgets: low (30), medium (60), high (100) particles based on device
- Zero particles for reduced motion users: Accessibility first, WCAG 2.1 compliant
- Intensity scaling (1-4x): Single component handles all combo tiers without config duplication
- Arc trajectory with quadratic bezier: Natural parabolic motion for score popups (0.8s arc, 0.3s reduced motion fade)
- AdaptiveParticles is purely visual: No text rendering, separation from ComboTierBadge

**Phase 26-07 (Adventure HUD Components, 2026-01-30):**
- Fixed positioning at top/bottom with semi-transparent backgrounds (70% opacity): Board remains focal point
- Radial SVG progress with depleting arc: Clockwise depletion as time progresses, space-efficient (24-48px)
- Visual hierarchy prioritizes timer and score: Timer > Score > Objectives > XP/Gold > Cooldowns
- Responsive design hides XP bar on small screens: Preserves critical info (level, gold, timer) on mobile
- Board-first design principle: HUD at edges only, no center overlap, gameplay never obstructed

**Phase 26-08 (Meta-Progression Integration, 2026-01-30):**
- Hooks integrated with temp-user-id: Auth wiring deferred to future phase, enables full testing now
- Upgrade multipliers applied to base values: (base × upgrade) × combo ensures impactful but balanced
- Score popup arc trajectory: Targets score counter position for visual continuity, falls back to fade
- Combo juice intensity scaling: Shake 2-8px and particles 10-50 based on tier (Nice/Great/Amazing/LEGENDARY)
- Level-up modal auto-dismisses: 3s timeout maintains game momentum, instant skip for reduced motion
- Integration test pattern: Mock hooks + verify state changes + test end-to-end flows (10 scenarios, 308 lines)

**Phase 26-09 (Gap Closure, 2026-01-30):**
- Replace ScorePopupFly with juice/ScorePopup: Quadratic bezier arc trajectory vs linear keyframes for natural parabolic motion
- Dynamic targetPosition calculation: Ensures arc trajectory accuracy across screen sizes and layouts
- Translation-first compliance: Replaced hardcoded "XP" with t('adventure.xp.label') in all 4 languages
- Gaming abbreviations vary by language: XP (en), נק' (he), EP (sv), 経験値 (ja) - respect cultural norms

**Phase 27-01 (Cascade Loop State Machine, 2026-01-30):**
- 5-phase cascade cycle: idle → removing → falling → spawning → checking (repeats until no matches)
- Phase timing: 250ms per phase (750ms total cascade), configurable via milliseconds (not frame counts)
- Pure functions exported: applyGravity, spawnNewTiles, checkForMatches for external use/testing
- Reduced motion support: 1ms phase durations for instant transitions (no "skip animation" flag)
- onPhaseChange callback: Enables UI coordination (shake on remove, particles on spawn)

**Phase 27-03 (Explosion Visual Effects, 2026-01-30):**
- Radial particle burst pattern: 360° spread for omnidirectional explosion feel (vs directional fountain)
- Intensity scaling (1-4): Maps to 15/30/45/60 particles based on word length (3-4/5-6/7-9/10+ letters)
- Reuse Phase 26 particle budget: Maintains consistency with adaptive particle framework, zero new infrastructure
- CSS explosion-ring animation: GPU-accelerated transform-only (scale + opacity) for 60fps performance
- Normalized position calculation: Pixel coords → 0-1 range for fireConfetti origin accuracy

**Phase 27-07 (Gap Closure: Locked/Multiplier Tile CSS, 2026-01-30):**
- Grey/steel theme for locked tiles: Desaturation filter, chain pattern, steel bar overlay conveys restricted state
- Lime/gold theme for multiplier tiles: Brightness boost, radiant energy, sparkle effects convey bonus/reward state
- GPU-accelerated CSS only: Transform, opacity, filter properties for 60fps performance
- Reduced motion support: Static box-shadow and filter feedback when prefers-reduced-motion enabled
- CSS testing pattern: Verify class definitions and keyframe animations exist in test suite

**Phase 28-01 (Power-Up State Machine, 2026-01-30):**
- 3-state lifecycle: ready → active → cooldown → ready (automatic transitions)
- activatePowerUp: Instant effects (freezeTime, hint) or duration-based (scoreMultiplier 30s)
- tickCooldown: Drift-free countdown using timestamps (not interval accumulation)
- 60-second cooldown for all power-ups (balances strategic use vs accessibility)
- TDD: 16 tests, 98% coverage, RED-GREEN-REFACTOR verified

**Phase 28-03 (Power-Up UI Components, 2026-01-30):**
- PowerUpButton: Neo-brutalist styling (bg-neo-purple, border-3, shadow-hard), state-based interaction
- CooldownIndicator integration: Radial progress display with icon
- PowerUpActivationEffect: 0.25s burst (shake intensity 4, particles intensity 2)
- Color schemes: cyan/blue (freeze), yellow/gold (hint), purple/pink (multiplier)
- Zero animation for reduced motion users: Accessibility first (WCAG 2.1 compliant)
- 28 tests passing (17 PowerUpButton + 11 PowerUpActivationEffect)

**Phase 28-04 (PowerUpBar Component, 2026-01-30):**
- PowerUpBar container: Fixed bottom-center positioning with horizontal button layout
- State machine integration: usePowerUpState hooks for each power-up (ready/active/cooldown)
- Effect activation: usePowerUpEffects hooks with cascade blocking logic
- Cascade blocking: All buttons disabled when cascadeActive=true (prevents mid-cascade activation)
- Visual effects: PowerUpActivationEffect triggered on activation (0.25s burst)
- Persistence ready: Accepts dictionary prop for hint validation preparation

**Phase 28-05 (Power-Up Integration, 2026-01-30):**
- PowerUpBar integrated into AdventureGame with conditional rendering (entryPhase='playing', not paused, not complete)
- Power-up state management: scoreMultiplier, multiplierExpiresAt, hintWord, hintTiles, hintExpiresAt
- Effect handlers: handleFreezeTime (timer callback), handleHint (5s tile highlight), handleScoreMultiplier (30s 2x multiplier)
- Score calculation integration: scoreValue multiplied by scoreMultiplier (stacks multiplicatively with gold tiles)
- Hint highlighting: hintTiles converted to indices and passed to AdventureGrid via hintHighlightIndices
- Auto-clear timers: Hint (5s) and Score Multiplier (30s) automatically reset state
- Integration tests: 11 tests verifying all effects, conditional rendering, and multiplicative stacking (gold 3x × multiplier 2x = 6x)

**Phase 28-06 (Skill Balance Verification, 2026-01-30):**
- Balance verification tests confirm all levels beatable without power-ups (POWER-07 requirement)
- 12 automated tests validate score targets, time limits, and word availability
- Margin-based assertions: 50% word availability buffer, 80% time efficiency assumption
- Human verification: All 3 power-ups, cooldowns, cascade blocking, reduced motion, and RTL tested
- Power-up design philosophy validated: Optional strategic advantage, not mandatory crutch

**Phase 28-07 (Freeze Time Effect Wiring, 2026-01-30):**
- ADD_TIME reducer action added to useAdventureGame for timer extension
- addTime method capped at levelConfig.timerSeconds to prevent overflow
- handleFreezeTime calls addTime(10) to extend timer by 10 seconds
- Freeze Time power-up now fully functional with actual timer extension
- TDD pattern: Failing tests first, implementation second, integration verification third

**Phase 28-08 (Wire Power-Up Inventory Persistence, 2026-01-30):**
- usePowerUpState extended with initialCooldownTimestamp option for persistence restoration
- PowerUpBar integrated with usePowerUpInventory (calls startCooldown on activation, passes timestamps to state machines)
- AdventureGame detects level changes via useEffect + previousLevelRef and calls resetCooldowns
- localStorage persistence: Cooldowns survive browser refresh, navigation, tab switching
- Level transition behavior: Cooldowns reset to 0 when levelConfig.level changes (fresh start per level)
- 62 total tests passing across all power-up hooks and components (100% integration coverage)

**Phase 29-01 (Performance Tracker Utilities, 2026-01-31):**
- Weighted score formula: completion 50%, time 30%, accuracy 20% (completion most important for progression)
- Rolling window size: 3 attempts (balances stability vs responsiveness to performance changes)
- Boss levels (level 7) excluded from tier decisions (fixed patterns for learning, not adaptive)
- Pure function architecture: All utilities stateless for testability and composability across frontend/backend
- TDD RED-GREEN-REFACTOR: 17 tests, 100% coverage, all functions pure with no side effects

**Phase 29-02 (Tier Assignment Logic, 2026-01-31):**
- Priority-based decision tree: insufficient data → failure detection → mastery detection → default
- Failure threshold: 2 failures in last 3 attempts triggers downgrade to easy tier
- Mastery threshold: All 3 attempts complete with scores > 0.8 (strictly greater, not >=) triggers upgrade to hard
- Failure detection prioritized over mastery: Prevents mixed signals from causing incorrect tier
- Reason strings for analytics: 4 distinct reasons (insufficient_data, high_failure_rate, consistent_mastery, balanced_performance)
- Pure function design: No side effects, testable, reusable across components

**Phase 29-04 (Config Adjuster, 2026-01-31):**
- Tier-based level modifications: Easy (+20% timer, -20% score), Hard (-15% timer), Normal (unchanged)
- Boss level exclusion: isBossLevel=true always returns unmodified config (consistent patterns for learning)
- Selective modification: Only primary scoreTarget objectives adjusted, wordCount and secondary unchanged
- Floor division: Math.floor() for timer/score to avoid fractional values in UI
- Boss identification verified: Tests validate level 7 has isBossLevel=true across worlds
- Immutability pattern: Pure function returns new config, never mutates input
- 16 tests with 100% coverage on configAdjuster.ts

**Phase 29-06 (Power-Up Cooldown Multiplier, 2026-01-31):**
- usePowerUpState accepts cooldownMultiplier option (default 1.0 preserves existing behavior)
- Hard tier uses 1.5x multiplier: 60s base → 90s effective cooldown
- Math.floor applied to effectiveCooldown to prevent fractional UI values
- All cooldown calculations use effectiveCooldown (initial state, countdown, persistence)
- 7 new tests verify multiplier behavior (default, 1.5x, 0.5x, 2.0x, 0, fractional)
- 28 total tests passing on usePowerUpState.ts

**Phase 29-07 (Adaptive Difficulty UI Integration, 2026-01-31):**
- Adaptive hints take highest priority over power-up and manual hints
- HintMessage returns null for 'none' level to minimize rendering overhead
- PowerUpBar accepts optional cooldownMultiplier prop (defaults to 1.0 for backward compatibility)
- Translation keys already existed in all 4 languages (en, he, sv, ja) - no additions needed
- Hint priority chain: adaptive difficulty hints > power-up hints > manual hint button
- Completion recording: recordCompletion called after recordAttempt for tier updates
- 18 total tests passing (6 HintMessage + 12 AdventureGame integration)

### Pending Todos

None - Starting fresh milestone with roadmap complete.

### Blockers/Concerns

**v2.0 Architecture Risks (from research):**
- React Context re-render cascade risk (InGameContext has 57 properties)
  - Mitigation: Use Zustand for high-frequency state (boss HP, combos)
- Framer Motion layout thrashing risk (animating width/height)
  - Mitigation: Transform-first architecture, code review enforcement
- Power creep risk (power-ups become mandatory)
  - Mitigation: Test every level without power-ups first
- Rubber-banding perception risk (adaptive difficulty too obvious)
  - Mitigation: Pre-game adjustments primary, invisible mid-game

**v1.1 Carryover (included in Phase 35):**
- World 4-5 theming (Phase 22) not completed
- Tech debt cleanup (Phase 23) not completed
- Entry sequence timing still 2.38s (380ms over target)
- Video MP4 files not rendered (render script exists)

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed 29-07-SUMMARY.md (Adaptive Difficulty UI Integration) - Phase 29 COMPLETE (5/5 plans)
Resume file: None

**Next action:** Start Phase 30 - Boss Battle Overhaul
**Note:** Adaptive difficulty system fully integrated into AdventureGame with hint rendering and tier adjustments

**v2.0 Milestone Goals:**
Transform Adventure Mode with:
1. Dynamic board mechanics (moving tiles, cascades, explosions)
2. Power-up system with mid-game boosters
3. Meta-progression and skill trees
4. Boss battle overhaul with unique graphics/mechanics
5. Enhanced visual content pipeline (Remotion, Image MCP, Python)
6. Polished in-game UI with improved hierarchy
7. Dynamic difficulty adaptation
8. Complete v1.1 carryover (Worlds 4-5, tech debt)

**Technology Additions (from research):**
- GSAP 3.14.2 for complex board animations
- tsParticles 3.x for particle effects
- XState 5.24.0 for boss state machines
- Immer for nested state updates
- Remotion + Lottie + Skia for cinematics
- rembg (Python) for background removal
- Image MCP + FLUX.1 for boss graphics

---
*State initialized: 2026-01-30 for v2.0 milestone*
*Last updated: 2026-01-31 (Phase 29 in progress: 2/5 plans complete - performance tracker, tier assigner done)*
