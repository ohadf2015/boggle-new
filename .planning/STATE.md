# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-30)

**Core value:** Adventure mode must feel immersive and connected to its themed worlds
**Current focus:** v2.0 Adventure Overhaul - Phase 28 Power-Up System

## Current Position

Phase: 28 - Power-Up System
Plan: 4 of 6 (PowerUpBar & Inventory COMPLETE)
Status: Phase 28 In Progress
Last activity: 2026-01-30 — Completed 28-04-PLAN.md (PowerUpBar Container & Inventory Persistence)

Progress: [████████████░] 91% (15/16 v2.0 plans complete: Phase 26: 9/9, Phase 27: 7/7, Phase 28: 4/6)

**Phase numbering context:**
- v1.1 completed Phases 15-21 (education + adventure features)
- v1.2 completed Phases 24-25 (platform integration)
- v2.0 starts at Phase 26 (continues from last delivered phase 25)
  - Phase 26 complete: Meta-Progression Foundation (9/9 plans)
  - Phase 27 active: Dynamic Board Mechanics (5/6 plans)

## v2.0 Milestone Scope

**Transform Adventure Mode** from static word-finding into visually spectacular, feature-rich experience.

**10 Phases (26-35) covering 76 requirements:**

1. **Phase 26: Meta-Progression Foundation** (21 reqs: META + JUICE + UI) ✅ COMPLETE
   - XP/leveling, gold currency, stat upgrades, game juice, HUD framework

2. **Phase 27: Dynamic Board Mechanics** (6 reqs: BOARD) ✅ COMPLETE
   - Candy Crush cascades, tile movement, explosions, special tiles

3. **Phase 28: Power-Up System** (7 reqs: POWER) 🔄 IN PROGRESS (4/6 plans)
   - Freeze Time, Hint, Score Multiplier with cooldowns and balance
   - ✅ 28-01: Power-Up Type Definitions and State Machine
   - ✅ 28-02: Power-Up Effect Functions (TDD)
   - ✅ 28-03: Power-Up UI Components (PowerUpButton + PowerUpActivationEffect)
   - ✅ 28-04: PowerUpBar Container & Inventory Persistence

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

## Performance Metrics

**v2.0 Progress:**
- Phase 26 complete: 9/9 plans (100%)
- Phase 27 complete: 6/6 plans (100%)
- Phase 28 in progress: 2/7 plans (29%)
- Total v2.0 plans complete: 17 of 70+ (24% overall)

## Accumulated Context

### v2.0 Decisions

**Phase 28-04 (PowerUpBar Container & Inventory Persistence, 2026-01-30):**
- Timestamp-based cooldown persistence: Store Date.now() in localStorage (not remaining seconds) for drift-free accuracy across tab switches/sleep
- resetCooldowns() for level transitions: Research recommendation for better UX - players start fresh each level without waiting
- All power-ups unlocked by default in v2.0: Focus on core gameplay, unlock gating deferred to future phase for progressive enhancement
- PowerUpBar fixed bottom-center: Above word input, below HUD overlays - persistent UI element with clear visual hierarchy
- Icons for instant recognition: snowflake (❄️) freeze, lightbulb (💡) hint, star (⭐) multiplier - universally understood symbols
- Cascade blocking toast feedback: "Wait for cascade to complete" message maintains UX flow when power-ups temporarily disabled
- localStorage key 'power-up-inventory': Dedicated key separate from game state for clean separation of concerns
- Container component pattern: PowerUpBar orchestrates 3 usePowerUpState hooks and integrates with usePowerUpEffects for clean architecture

**Phase 28-03 (Power-Up UI Components, 2026-01-30):**
- PowerUpButton neo-brutalist styling: bg-neo-purple, border-3, shadow-hard matches established design system
- CooldownIndicator integration: Radial progress display with icon shows remaining time visually (no text clutter)
- PowerUpActivationEffect 0.25s burst: Shake intensity 4 + particles intensity 2 balances impact feel with performance
- Color schemes per power-up: cyan/blue (freeze), yellow/gold (hint), purple/pink (multiplier) for instant recognition
- Zero animation for reduced motion: WCAG 2.1 compliant, respects prefers-reduced-motion for accessibility
- 28 tests total: 17 PowerUpButton + 11 PowerUpActivationEffect verify behavior, not implementation details

**Phase 28-02 (Power-Up Effect Functions, 2026-01-30):**
- DFS word-finding algorithm: 8-way adjacency search with backtracking finds all valid words on board for hint system
- Hint prioritization by length: Sort by descending length to give better hints (longer words = better player experience)
- Cascade blocking pattern: All effects return false during cascadeActive instead of throwing (graceful degradation, no race conditions)
- Pure functions exported: applyFreezeTime, applyHint, applyScoreMultiplier enable independent testing without hook overhead
- Time cap enforcement: Math.min(timeRemaining + 10, totalTime) prevents freeze time from exceeding level max (balance)

**Phase 28-01 (Power-Up Type Definitions and State Machine, 2026-01-30):**
- Timestamp-based cooldown using Date.now(): Prevents drift from setInterval accumulation, calculates remaining from elapsed time
- 60-second cooldown constant: Single value (COOLDOWN_DURATION) for all power-ups keeps system simple and balanced
- Effect duration differentiation: Instant (0s) for freezeTime/hint transitions immediately, duration (30s) for scoreMultiplier uses setTimeout
- useRef for timestamp storage: Avoids re-renders when updating activatedAt, state only changes for UI-relevant updates
- 100ms UI update interval: Smooth countdown display during cooldown (10 updates/second balances UX and performance)
- State machine lifecycle: ready -> activate() -> active -> cooldown (60s) -> ready with boolean rejection during cooldown
- TDD with 98% coverage: 16 tests verify state transitions, timestamp calculations, and edge cases (drift prevention, negative clamp)

**Phase 27-06 (Special Tile Integration, 2026-01-30):**
- Multiplier tiles inline processing: Processed in SUBMIT_WORD reducer like existing tiles (gold, ice, bomb) for consistency
- Locked tile grid-wide check: All locked tiles unlock when word contains same letter (not just adjacent) for intuitive mechanic
- Multiplier single use: Tiles convert to standard after use to prevent overpowered scoring and balance progression
- Processing order: Special tiles activate -> score calculated -> cascade triggers -> explosion fires -> animations
- 42 integration tests: Comprehensive coverage of frozen, locked, multiplier tiles plus full Phase 27 integration

**Phase 27-05 (Tile Removal and Refill Logic, 2026-01-30):**
- Explosion fires at REMOVING phase START: Before Framer Motion exit animation (visual sequence: flash -> scale -> fade)
- Input blocked during cascade: isCascading check in all interaction handlers prevents race conditions
- Explosion intensity from word length: 3-4=1, 5-6=2, 7-9=3, 10+=4 (scales with achievement magnitude)
- Explosion position as tile center: Average of all cleared tile positions (centered visual effect)
- lastSubmittedWord ref pattern: Coordinate state between submission handler and phase change effect

**Phase 27-04 (Special Tile Activation Mechanics, 2026-01-30):**
- Frozen tiles skip gravity during cascade: isFrozen=true stay in place (visual continuity - appear anchored)
- Locked tiles block spawning in their position: Can't spawn over locked tiles until unlocked (strategic layer)
- Multiplier stacking multiplicative: 2x * 2x = 4x, with gold 3x + multiplier 2x = 6x (high-score strategies)
- Pure function exports: checkFrozenThaw, checkLockedUnlock, applyMultiplier for unit testing without hook overhead
- 8-way adjacency for frozen thaw: Diagonals count (more forgiving UX, consistent with grid-based game expectations)

**Phase 27-02 (Framer Layout Animations, 2026-01-30):**
- AnimatePresence mode="popLayout": Allows exiting tiles to pop out while remaining tiles rearrange smoothly
- Spring physics stiffness 500 damping 30: Higher stiffness for snappy game-like movement with controlled bounce
- Animation timing 200ms: Fits within 250ms cascade phases with 50ms buffer for safety
- LayoutId using tile.id: Stable identifier enables Framer Motion to track tiles across position changes

**Phase 27-01 (Cascade Loop State Machine, 2026-01-30):**
- 250ms per phase for smooth animations: Balances visibility with gameplay speed (750ms total)
- MVP limitation checkForMatches stub: Single cascade only, match detection deferred (BOARD-05)
- Safety limit 10 iterations: Prevents infinite loops, graceful failure mode
- Pure function exports: applyGravity, spawnNewTiles, checkForMatches enable independent testing/reuse
- Reduced motion support: 0ms phase transitions via matchMedia for WCAG 2.1 AA compliance

**Phase 26-09 (Gap Closure, 2026-01-30):**
- Replace ScorePopupFly with juice/ScorePopup: Quadratic bezier arc trajectory vs linear keyframes for natural parabolic motion
- Dynamic targetPosition calculation: Ensures arc trajectory accuracy across screen sizes and layouts
- Translation-first compliance: Replaced hardcoded "XP" with t('adventure.xp.label') in all 4 languages
- Gaming abbreviations vary by language: XP (en), נק' (he), EP (sv), 経験値 (ja) - respect cultural norms

**Phase 26-08 (Meta-Progression Integration, 2026-01-30):**
- Hooks integrated with temp-user-id: Auth wiring deferred to future phase, enables full testing now
- Upgrade multipliers applied to base values: (base × upgrade) × combo ensures impactful but balanced
- Score popup arc trajectory: Targets score counter position for visual continuity, falls back to fade
- Combo juice intensity scaling: Shake 2-8px and particles 10-50 based on tier (Nice/Great/Amazing/LEGENDARY)
- Level-up modal auto-dismisses: 3s timeout maintains game momentum, instant skip for reduced motion
- Integration test pattern: Mock hooks + verify state changes + test end-to-end flows (10 scenarios, 308 lines)

**Phase 26-07 (Adventure HUD Components, 2026-01-30):**
- Fixed positioning at top/bottom with semi-transparent backgrounds (70% opacity): Board remains focal point
- Radial SVG progress with depleting arc: Clockwise depletion as time progresses, space-efficient (24-48px)
- Visual hierarchy prioritizes timer and score: Timer > Score > Objectives > XP/Gold > Cooldowns
- Responsive design hides XP bar on small screens: Preserves critical info (level, gold, timer) on mobile
- Board-first design principle: HUD at edges only, no center overlap, gameplay never obstructed

**Phase 26-06 (Adaptive Particle System & Score Popup, 2026-01-30):**
- Three-tier particle budgets: low (30), medium (60), high (100) particles based on device
- Zero particles for reduced motion users: Accessibility first, WCAG 2.1 compliant
- Intensity scaling (1-4x): Single component handles all combo tiers without config duplication
- Arc trajectory with quadratic bezier: Natural parabolic motion for score popups (0.8s arc, 0.3s reduced motion fade)
- AdaptiveParticles is purely visual: No text rendering, separation from ComboTierBadge

**Phase 26-05 (Currency Display & Upgrade Shop, 2026-01-30):**
- usePrefersReducedMotion hook for accessibility: WCAG 2.1 compliance, reusable across animated components
- CurrencyDisplay with coin icon: Clear gold visualization, number formatting with commas
- Recent gain animation: Flies up and fades (0.8s), instant for reduced motion users
- UpgradeShop purchase validation: Checks affordability and max stacks, clear feedback
- Neo-brutalist card layout: Hard shadows, chunky borders, high contrast (yellow/lime/black)

**Phase 26-04 (Adventure XP UI Components, 2026-01-30):**
- useAdventureXp hook returns pending updates: Separates state from persistence, allows parent to batch/handle errors
- Cyan color theme for adventure mode: Differentiates from education yellow, creates distinct identity
- Confetti skipped for reduced motion: Accessibility compliance (WCAG 2.1 AA), prevents motion sickness
- Auto-close modal after 3 seconds: Smooth UX flow without explicit dismiss, keeps game momentum
- Framer Motion for animations: Declarative API with spring physics, zero duration when reduced motion enabled

**Phase 26-03 (Screen Shake, 2026-01-30):**
- Web Animations API over Framer Motion: Zero dependencies, better performance for simple shake
- Transform-only animations: GPU-accelerated, no layout thrashing (verified via grep check)
- Reduced motion flash alternative: Opacity flash maintains feedback without motion (WCAG compliant)
- Conservative parameter ranges: Intensity 2-8px, duration 100-300ms to prevent nausea/motion fatigue

**Phase 26-02 (Gold Currency, 2026-01-30):**
- Exponential gold growth (1.2x per level): Rewards progression without late-game inflation
- Exponential upgrade costs (1.5x per stack): Creates strategic choices, prevents easy max-out
- Max 5 stacks per upgrade: Clear ceiling prevents power creep, maintains balance
- Pure functions for currency logic: No side effects, easy to test and reason about

**Phase 26-01 (Adventure XP Utilities, 2026-01-30):**
- RuneScape XP formula: `floor(i + 300 * 2^(i/7)) / 4` for smooth exponential progression
- Max level 50: Manageable v2.0 scope, expandable in v2.1+
- Separate adventure XP from education XP: Different progression philosophies (excitement vs learning pace)
- Pure functions: No external state for easy testing and reusability across frontend/backend

**Roadmap Architecture (2026-01-30):**
- Start phase numbering at 26 (continues from v1.2 Phase 25)
- 10 phases derived from requirement categories (not arbitrary structure)
- Front-load technical risk: Board mechanics (Phase 27) before boss overhaul (Phase 30)
- Horizontal power-up progression: Enable strategies, not inflate numbers
- Invisible adaptive difficulty: Pre-game primary, mid-game subtle
- Particle budget enforcement: Max 50-100 particles, adaptive reduction
- Transform-first animations: GPU-accelerated only, no layout properties
- Boss battles excluded from adaptive difficulty: Fixed patterns for learning

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

**Phase 27 Balance Tuning Needed:**
- Multiplier tile frequency per level (gameplay testing required)
- Locked tile difficulty curve (early levels might be too hard)
- Cascade + special tiles performance on iPhone 11 (low-end device testing)

## Session Continuity

Last session: 2026-01-30
Stopped at: Completed 28-04-PLAN.md (PowerUpBar Container & Inventory Persistence)
Resume file: None

**Next action:** Continue Phase 28 - Plans 28-05 (HUD Integration) and 28-06 (Balance Tuning) remaining

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
*Last updated: 2026-01-30 (Phase 28 Plan 01 COMPLETE: Power-Up Type Definitions and State Machine)*
