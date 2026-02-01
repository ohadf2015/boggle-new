# Roadmap: LexiClash

## Milestones

- ✅ **v1.0 Stabilization** - Phases 1-14 (shipped 2026-01-25)
- ✅ **v1.1 Adventure & Education Expansion** - Phases 15-21 (shipped 2026-01-29)
- ✅ **v1.2 Platform Integration** - Phases 24-25 (shipped 2026-01-26)
- 🚧 **v2.0 Adventure Overhaul** - Phases 26-35 (in progress)

## Phases

<details>
<summary>✅ v1.0 Stabilization (Phases 1-14) - SHIPPED 2026-01-25</summary>

**Milestone Goal:** Polish adventure mode with world theming, build teacher vocabulary system, stabilize for production.

### Phase 1: World 1 Parallax System
**Goal**: Deliver immersive parallax backgrounds for Desert Dunes (World 1)
**Plans**: 4 plans

### Phase 2: Desert Dunes Polish
**Goal**: Complete Desert Dunes with particles and board theming
**Plans**: 3 plans

### Phase 3: Arctic Aurora Full Experience
**Goal**: Complete World 2 Arctic Aurora with parallax, particles, and board theming
**Plans**: 3 plans

### Phase 4: Crystal Caves Complete
**Goal**: Complete World 3 Crystal Caves with full theming
**Plans**: 3 plans

### Phase 5: Core Game Juice
**Goal**: Add satisfying feedback animations for word interactions
**Plans**: 4 plans

### Phase 6: Level Entry Experience
**Goal**: Create polished level entry sequence with cascade and reveals
**Plans**: 3 plans

### Phase 7: Lexi Mascot Integration
**Goal**: Integrate Lexi reactions throughout gameplay
**Plans**: 3 plans

### Phase 8: AI Content Pipeline
**Goal**: Generate and optimize world backgrounds and assets
**Plans**: 4 plans

### Phase 9: Video Composition Infrastructure
**Goal**: Set up Remotion for level intro and transition videos
**Plans**: 3 plans

### Phase 10: Wikipedia Integration
**Goal**: Auto-promote high-scoring words from Wikipedia corpus
**Plans**: 3 plans

### Phase 11: Invalid Word Admin System
**Goal**: Build admin UI for word queue management
**Plans**: 3 plans

### Phase 12: Teacher Vocabulary Builder
**Goal**: Enable teachers to create vocabulary lessons
**Plans**: 4 plans

### Phase 13: Education Student Flow
**Goal**: Complete student classroom join and practice mode
**Plans**: 4 plans

### Phase 14: Education Mode Complete
**Goal**: Finalize education landing page and full flow
**Plans**: 6 plans

**v1.0 Stats:**
- 62 plans executed
- 183 commits
- 309,792 lines TypeScript
- 3,481/3,494 tests passing (99.6%)

</details>

<details>
<summary>✅ v1.1 Adventure & Education Expansion (Phases 15-21) - SHIPPED 2026-01-29</summary>

**Milestone Goal:** Expand adventure mode with boss battles and chain combos while enhancing education mode with analytics and gamification.

#### ✅ Phase 15: Chain Combo System — COMPLETE
**Goal**: Implement satisfying chain reactions with combo multipliers
**Depends on**: Nothing (foundation for other features)
**Requirements**: COMBO-01, COMBO-02, COMBO-03, COMBO-04, COMBO-05
**Success Criteria** (what must be TRUE):
  1. ✓ User can link chain tiles to trigger 1.5x combo multiplier on valid words
  2. ✓ User sees tiered visual feedback when building combos (Nice! → Great! → Amazing! → LEGENDARY!)
  3. ✓ User sees themed particle effects burst on combo completion
  4. ✓ User sees letter cascade animations during chain reactions
  5. ✓ Combo scoring integrates seamlessly with existing scoring engine without breaking multiplayer
**Plans**: 5 plans (67 min total, 83 tests added)
**Completed**: 2026-01-25

Plans:
- [x] 15-01-PLAN.md — Chain tile combo logic TDD (17min, 15 tests)
- [x] 15-02-PLAN.md — ComboTierBadge component with i18n (13min, 30 tests)
- [x] 15-03-PLAN.md — ChainParticleBurst with world theming (17min, 13 tests)
- [x] 15-04-PLAN.md — Cascade animation hook (6min, 16 tests)
- [x] 15-05-PLAN.md — Integration into AdventureGame (14min, 9 tests)

#### ✅ Phase 16: Boss Battle Foundation — COMPLETE
**Goal**: Enable end-of-world boss battles with phase transitions
**Depends on**: Phase 15 (uses combo scoring for damage calculations)
**Requirements**: BOSS-01, BOSS-02, BOSS-03 (BOSS-04, BOSS-05, BOSS-13 deferred to Phase 17/18)
**Success Criteria** (what must be TRUE):
  1. ✓ User can battle end-of-world bosses with clear phase transitions (intro → active → enraged → victory/defeat)
  2. ✓ User sees boss HP bar with phase indicators updating in real-time during battle
  3. ✓ User experiences popQuiz mechanic (random word requirements each turn)
  4. ✓ Combo scoring from Phase 15 integrates with boss damage calculations
**Plans**: 4 plans in 3 waves (57 tests added)
**Completed**: 2026-01-25

Plans:
- [x] 16-01-PLAN.md — Boss HP tracking hook (TDD) with phase state machine (21 tests)
- [x] 16-02-PLAN.md — BossHPBar component with real-time updates (18 tests)
- [x] 16-03-PLAN.md — Integration into AdventureGame (8 tests)
- [x] 16-04-PLAN.md — popQuiz mechanic verification and tests (18 tests)

**Scope Note**: BOSS-04 (hiveMind/sticky tiles), BOSS-05 (synonymShift), and BOSS-13 (adaptive difficulty) deferred to Phase 17/18 per research analysis.

#### ✅ Phase 17: Boss Mechanic Expansion — COMPLETE
**Goal**: Complete remaining boss mechanics for variety
**Depends on**: Phase 16 (extends boss state machine)
**Requirements**: BOSS-06, BOSS-07, BOSS-08, BOSS-09, BOSS-10, BOSS-11, BOSS-12
**Success Criteria** (what must be TRUE):
  1. ✓ User sees bonus damage for long words in idiom boss battle (idiomIslands MVP stub, 6+ letters)
  2. ✓ User sees combo multiplier for long words in compound boss battle (compoundMerge MVP stub, 5+ letters)
  3. ✓ User can solve anagrams for critical hits with pair detection (anagramScramble mechanic)
  4. ✓ User sees palindrome words deal bonus damage (palindromeMirror mechanic, 3x multiplier)
  5. ✓ User deals bonus damage with rare-letter words Q/X/Z (neologismNebula mechanic, 2.5x multiplier)
  6. ✓ User sees bonus for long words in multilingual boss battle (polyglotPeaks MVP stub, 6+ letters)
  7. ✓ Final boss combines all mechanics cycling through 9 phases (allMechanics)
**Scope Note**: BOSS-06, BOSS-07, BOSS-11 use length-based stubs for MVP. Data-driven implementations (idiom lists, compound detection, multilingual lookup) deferred to Phase 24.
**Plans**: 5 plans in 3 waves (320 tests added)
**Completed**: 2026-01-25

Plans:
- [x] 17-01-PLAN.md — Verify mirrorMatch and stellarForge mechanics with TDD tests (96 tests)
- [x] 17-02-PLAN.md — Verify finalWord multi-phase mechanic with TDD tests (41 tests)
- [x] 17-03-PLAN.md — Enhance scrambledReality with anagram pair detection + translations (42 tests)
- [x] 17-04-PLAN.md — Test stub mechanics (idiom, assembly, babel) with documentation (83 tests)
- [x] 17-05-PLAN.md — E2E integration tests for all 10 boss battles (51 tests)

#### ✅ Phase 18: Education XP System — COMPLETE
**Goal**: Enable student progression through XP and leveling
**Depends on**: Phase 15 (uses combo scoring for XP calculations)
**Requirements**: GAMIFY-01, GAMIFY-02, GAMIFY-03, GAMIFY-08
**Success Criteria** (what must be TRUE):
  1. ✓ Student earns XP from practice activities (flashcards, solo board, lesson completion)
  2. ✓ Student sees XP progress bar updating in real-time toward next level
  3. ✓ Student levels up with visual celebration when XP threshold reached
  4. ✓ Student earns streak bonuses for consecutive practice days
  5. ✓ XP accumulation emphasizes mastery ("You learned 50 new words!") over points
**Plans**: 5 plans in 4 waves (35 min total, 114 tests added)
**Completed**: 2026-01-25

Plans:
- [x] 18-01-PLAN.md — Database migration + educationXpManager (TDD, 5min, 32 tests)
- [x] 18-02-PLAN.md — useEducationXp hook + translations (all 4 languages, 6min, 16 tests)
- [x] 18-03-PLAN.md — XpProgressBar + StreakBonusIndicator components (11min, 31 tests)
- [x] 18-04-PLAN.md — LevelUpCelebration modal with confetti (6min, 20 tests)
- [x] 18-05-PLAN.md — Practice flow integration (flashcard + board pages, 7min, 15 tests)

#### ✅ Phase 19: Achievement System — COMPLETE
**Goal**: Reward genuine student milestones with meaningful badges
**Depends on**: Phase 18 (achievements unlock based on XP milestones)
**Requirements**: GAMIFY-04, GAMIFY-05, GAMIFY-06, GAMIFY-07
**Success Criteria** (what must be TRUE):
  1. ✓ Student sees classroom leaderboard with top students by XP (classroom-scoped for privacy)
  2. ✓ Student can earn 15-20 meaningful achievement badges (Bronze/Silver/Gold/Platinum tiers)
  3. ✓ Student sees achievement unlock modal with celebration animation when earning badge
  4. ✓ Student can view earned achievement badges in profile with completion progress
  5. ✓ Achievements celebrate genuine milestones ("First Boss Defeated") not trivial actions
**Plans**: 5 plans in 3 waves (123 tests)
**Completed**: 2026-01-29

Plans:
- [x] 19-01-PLAN.md — Database schema + achievementManager TDD (Wave 1, 23 tests)
- [x] 19-02-PLAN.md — Classroom leaderboard hook + component (Wave 1, 24 tests)
- [x] 19-03-PLAN.md — Achievement unlock modal + hook (Wave 2, 30 tests)
- [x] 19-04-PLAN.md — Profile badge grid + progress cards (Wave 2, 33 tests)
- [x] 19-05-PLAN.md — Integration into student dashboard/profile (Wave 3, 22 tests)

#### ✅ Phase 20: Student Analytics Dashboard — COMPLETE
**Goal**: Give teachers actionable insights into student progress
**Depends on**: Phase 18 (consumes XP and practice session data)
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05
**Success Criteria** (what must be TRUE):
  1. ✓ Teacher can view analytics dashboard with 3-5 key metrics (students needing help, class average, common mistakes)
  2. ✓ Teacher can see individual student progress metrics (vocabulary mastery, accuracy over time, skill progression)
  3. ✓ Teacher can view lesson effectiveness charts showing which lessons drive learning outcomes
  4. ✓ Teacher can see vocabulary mastery heatmap by student identifying knowledge gaps
  5. ✓ Teacher sees real-time progress updates during active class sessions
**Plans**: 6 plans in 3 waves (144 tests added)
**Completed**: 2026-01-29

Plans:
- [x] 20-01-PLAN.md — Analytics foundation TDD (queries + hook) (Wave 1, 14 tests)
- [x] 20-02-PLAN.md — MetricCard + AnalyticsDashboard components (Wave 2, 30 tests)
- [x] 20-03-PLAN.md — StudentProgressTable with sorting (Wave 2, 17 tests)
- [x] 20-04-PLAN.md — LessonEffectivenessChart (Recharts bar chart) (Wave 2, 14 tests)
- [x] 20-05-PLAN.md — VocabularyHeatmap (student × word grid) (Wave 3, 20 tests)
- [x] 20-06-PLAN.md — Real-Time Progress + Analytics Page Integration (Wave 3, 49 tests)

#### ✅ Phase 21: Rich Lesson Delivery — COMPLETE
**Goal**: Enhance student learning with rich vocabulary content
**Depends on**: Nothing (parallel to other education features)
**Requirements**: LESSON-01, LESSON-02, LESSON-03
**Success Criteria** (what must be TRUE):
  1. ✓ Student sees rich vocabulary explanations (definitions, pronunciation, usage examples)
  2. ✓ Student sees contextual examples from Daily Buzz trending content making words relevant
  3. ✓ Student can practice with swipe-based flashcard review for active recall
**Plans**: 6 plans in 3 waves (78 tests added)
**Completed**: 2026-01-29

Plans:
- [x] 21-01-PLAN.md — Text-to-Speech Service (Wave 1, 30 tests)
- [x] 21-02-PLAN.md — Enriched Vocabulary Card (Wave 1, 15 tests)
- [x] 21-03-PLAN.md — Swipe Gesture Hook (Wave 1, 32 tests)
- [x] 21-04-PLAN.md — Flashcard Swipe Stack (Wave 2, 10 tests)
- [x] 21-05-PLAN.md — Daily Buzz Context Service (Wave 1, 27 tests)
- [x] 21-06-PLAN.md — FlashcardReview Integration (Wave 3, 10 tests)

</details>

<details>
<summary>✅ v1.2 Platform Integration (Phases 24-25) - SHIPPED 2026-01-26</summary>

**Milestone Goal:** Enable game distribution through CrazyGames portal and native mobile apps.

#### ✅ Phase 24: CrazyGames Portal Integration — COMPLETE
**Goal**: Complete CrazyGames SDK integration for portal distribution
**Depends on**: Nothing (independent platform work)
**Requirements**: CG-01 through CG-10 (from CONTEXT.md)
**Success Criteria** (what must be TRUE):
  1. ✓ Initial download size <50MB (currently 131MB public folder, 57MB music alone)
  2. ✓ Game looks identical when embedded in CrazyGames iframe vs standalone
  3. ✓ External OAuth hidden, CrazyGames SDK authentication used instead
  4. ✓ Multiplayer invite system uses CrazyGames SDK inviteLink/showInviteButton
  5. ✓ Gameplay lifecycle events (start/stop/happytime) fire correctly for metrics
  6. ✓ QR code functionality works with CrazyGames invite links
  7. ✓ Landscape mode on desktop displays without scrollbars
  8. ✓ Mobile responsive behavior preserved in iframe embedding
**Plans**: 7 plans in 4 waves
**Completed**: 2026-01-26

Plans:
- [x] 24-01-PLAN.md — Lazy audio loading (Wave 1)
- [x] 24-02-PLAN.md — Visual consistency & viewport fixes (Wave 1)
- [x] 24-03-PLAN.md — SDK lifecycle event integration (Wave 2)
- [x] 24-04-PLAN.md — Multiplayer invite system integration (Wave 2)
- [x] 24-05-PLAN.md — Testing & verification (Wave 3)
- [x] 24-06-PLAN.md — Enhanced SDK Integration (Wave 3)
- [x] 24-07-PLAN.md — Gap closure: build fix & OAuth hiding (Wave 4)

#### ✅ Phase 25: Capacitor Native Apps Integration — COMPLETE
**Goal**: Integrate Capacitor to create native iOS and Android apps from the Next.js webapp with minimal code maintenance overhead
**Depends on**: Nothing (independent platform work)
**Requirements**: Native app distribution via App Store and Google Play, consistent UI across platforms
**Success Criteria** (what must be TRUE):
  1. ✓ Native apps load production webapp in WebView (server.url approach)
  2. ✓ All webapp features work including SSR, Server Components, and Socket.IO multiplayer
  3. ✓ Safe areas display correctly on notched devices (iPhone X+, Android cutouts)
  4. ✓ Native haptics enhance user feedback on iOS and Android
  5. ✓ Offline fallback screen appears when server unreachable
  6. ✓ Build scripts generate iOS and Android app bundles
  7. ✓ UI looks consistent across desktop, mobile web, and native apps
**Plans**: 6 plans in 3 waves
**Completed**: 2026-01-26

Plans:
- [x] 25-01-PLAN.md — Capacitor core setup (packages, config, platforms) (Wave 1)
- [x] 25-02-PLAN.md — Platform detection & native hooks (Wave 1)
- [x] 25-03-PLAN.md — Safe area integration & offline fallback (Wave 2)
- [x] 25-04-PLAN.md — Build scripts & app store preparation (Wave 3)
- [x] 25-05-PLAN.md — Wire orphaned native integrations (Wave 1, gap closure)
- [x] 25-06-PLAN.md — Generic haptics abstraction layer (Wave 1, gap closure)

</details>

### 🚧 v2.0 Adventure Overhaul (Phases 26-35)

**Milestone Goal:** Transform Adventure Mode from static word-finding into a visually spectacular, feature-rich experience with dynamic board mechanics, power systems, meta-progression, and cinematic boss battles.

#### ✅ Phase 26: Meta-Progression Foundation — COMPLETE
**Goal**: Players see persistent progression and feel rewarded across all adventure levels
**Depends on**: Nothing (foundation for other systems)
**Requirements**: META-01, META-02, META-03, META-04, META-05, META-06, JUICE-01, JUICE-02, JUICE-03, JUICE-04, JUICE-05, UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. ✓ User earns XP from adventure level completion and sees progress bar advance toward next level
  2. ✓ User levels up with celebration animation when reaching XP threshold
  3. ✓ User earns gold currency from levels and can spend it on permanent stat upgrades (+10% time, +5% score)
  4. ✓ User sees persistent player level displayed across all worlds
  5. ✓ User sees satisfying feedback: screen shake on combos, particle effects with adaptive budget, score popups with arc trajectory
  6. ✓ User sees streamlined HUD with clear visual hierarchy (timer, score, objectives, cooldown indicators)
**Plans**: 9 plans in 3 waves (including 1 gap closure plan)
**Completed**: 2026-01-30

Plans:
- [x] 26-01-PLAN.md — Adventure XP utilities (TDD, Wave 1)
- [x] 26-02-PLAN.md — Gold currency system (TDD, Wave 1)
- [x] 26-03-PLAN.md — Screen shake hook (TDD, Wave 1)
- [x] 26-04-PLAN.md — XP progress bar + level up modal (Wave 2)
- [x] 26-05-PLAN.md — Currency display + upgrade shop (Wave 2)
- [x] 26-06-PLAN.md — Adaptive particles + score popups (Wave 2)
- [x] 26-07-PLAN.md — Adventure HUD integration (Wave 3)
- [x] 26-08-PLAN.md — AdventureGame integration + verification (Wave 3)
- [x] 26-09-PLAN.md — Gap closure: Score popup arc trajectory + XP translation (Wave 1)

#### ✅ Phase 27: Dynamic Board Mechanics — COMPLETE
**Goal**: Board feels alive with Candy Crush-style cascades and smooth animations
**Depends on**: Phase 26 (uses meta-progression for unlock gating)
**Requirements**: BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05, BOARD-06
**Success Criteria** (what must be TRUE):
  1. ✓ User sees tiles cascade when words removed (collapse → fall → refill in 0.25s steps)
  2. ✓ User sees smooth tile movement with quadratic/elastic easing at 60fps on mobile (iPhone 12 baseline)
  3. ✓ User sees explosion effects for multi-tile clearing
  4. ✓ User sees special tile types (frozen, locked, multiplier) with distinct visuals
  5. ✓ Cascades trigger automatically when words removed without player action
**Plans**: 7 plans in 5 waves (including gap closure)
**Completed**: 2026-01-30

Plans:
- [x] 27-01-PLAN.md — Cascade loop state machine (TDD, Wave 1)
- [x] 27-02-PLAN.md — Framer Motion layout animations (Wave 2)
- [x] 27-03-PLAN.md — Explosion effects for multi-tile clearing (Wave 2)
- [x] 27-04-PLAN.md — Special tile activation logic (TDD, Wave 2)
- [x] 27-05-PLAN.md — Tile removal and refill logic (Wave 3)
- [x] 27-06-PLAN.md — Special tile integration + full verification (Wave 4)
- [x] 27-07-PLAN.md — Gap closure: Locked/multiplier tile CSS styling (Wave 5)

#### ✅ Phase 28: Power-Up System — COMPLETE
**Goal**: Players have strategic mid-game options that feel rewarding without being mandatory
**Depends on**: Phase 26 (meta-progression unlocks power-ups), Phase 27 (power-ups affect board state)
**Requirements**: POWER-01, POWER-02, POWER-03, POWER-04, POWER-05, POWER-06, POWER-07
**Success Criteria** (what must be TRUE):
  1. ✓ User can activate "Freeze Time" (extends timer 10s), "Hint" (reveals valid word), "Score Multiplier" (2x for 30s)
  2. ✓ User sees power-up cooldown timers (60s between uses) with radial progress visualization
  3. ✓ User sees activation animations (0.25s burst effect) when triggering power-ups
  4. ✓ Power-ups inventory persists across levels
  5. ✓ Every level is beatable without power-ups (skill-based balance verified in testing)
**Plans**: 8 plans in 5 waves (including 2 gap closure plans)
**Completed**: 2026-01-30

Plans:
- [x] 28-01-PLAN.md — Power-up types + usePowerUpState hook (TDD, Wave 1)
- [x] 28-02-PLAN.md — Power-up effect functions (TDD, Wave 2)
- [x] 28-03-PLAN.md — PowerUpButton + PowerUpActivationEffect components (Wave 2)
- [x] 28-04-PLAN.md — PowerUpBar container + usePowerUpInventory persistence (Wave 3)
- [x] 28-05-PLAN.md — AdventureGame integration with all effects (Wave 4)
- [x] 28-06-PLAN.md — Skill balance verification + human verification (Wave 5)
- [x] 28-07-PLAN.md — Wire Freeze Time Effect (Gap closure, Wave 1)
- [x] 28-08-PLAN.md — Wire Power-Up Inventory Persistence (Gap closure, Wave 1)

#### ✅ Phase 29: Adaptive Difficulty System — COMPLETE
**Goal**: All skill levels stay in flow state through invisible difficulty adjustments
**Depends on**: Phase 27 (board mechanics), Phase 28 (power-ups)
**Requirements**: DIFF-02, DIFF-03, DIFF-04, DIFF-05 (DIFF-01 removed per CONTEXT.md - system is invisible, no player selection)
**Success Criteria** (what must be TRUE):
  1. ✓ System selects pre-game difficulty based on performance (3-state: easy/normal/hard, invisible)
  2. ✓ System provides gradual unlock hints after 3 failures on same level
  3. ✓ Difficulty adjustments are invisible to user (no obvious rubber-banding)
  4. ✓ Boss fights have fixed difficulty (learnable patterns, excluded from adaptive scaling)
**Plans**: 8 plans in 4 waves
**Completed**: 2026-01-31

Plans:
- [x] 29-01-PLAN.md — Performance tracker utilities TDD (Wave 1)
- [x] 29-02-PLAN.md — Tier assigner logic TDD (Wave 1)
- [x] 29-03-PLAN.md — Hint escalation system TDD (Wave 1)
- [x] 29-04-PLAN.md — Config adjuster + barrel exports + boss verification (Wave 2)
- [x] 29-05-PLAN.md — useAdaptiveDifficulty hook + translations + ProgressionContext wiring (Wave 2)
- [x] 29-06-PLAN.md — Power-up cooldown multiplier support (Wave 3)
- [x] 29-07-PLAN.md — AdventureGame integration + hint UI rendering (Wave 3)
- [x] 29-08-PLAN.md — Human verification (Wave 4)

#### ✅ Phase 30: Boss Battle Overhaul — COMPLETE
**Goal**: Boss battles feel like epic cinematic fights, not just harder puzzles
**Depends on**: Phase 27 (board mechanics), Phase 28 (power-ups), Phase 29 (difficulty)
**Requirements**: BOSS-01, BOSS-02, BOSS-03, BOSS-04, BOSS-05, BOSS-06, BOSS-07, BOSS-08
**Success Criteria** (what must be TRUE):
  1. ✓ User battles bosses with 5-phase state machine (intro → phase1 → phase2 → enraged → victory/defeat)
  2. ✓ User sees segmented HP bar with phase indicators showing boss progression
  3. ✓ User sees telegraphed boss attacks (2s visual warning before activation)
  4. ✓ User sees 5-10s cinematic intro (skippable after 2s) when entering boss battle
  5. ✓ Bosses have 2-3 unique abilities per boss registered in extensible ability system
  6. ✓ User sees unique graphics per boss (Image MCP + rembg pipeline)
  7. ✓ Boss entrance and defeat have cinematic sequences
**Plans**: 8 plans in 7 waves (300+ tests)
**Completed**: 2026-01-31

Plans:
- [x] 30-01-PLAN.md — XState 5-phase state machine (TDD, Wave 1)
- [x] 30-02-PLAN.md — Segmented HP bar redesign (Wave 2)
- [x] 30-03-PLAN.md — Attack telegraph system (Wave 2)
- [x] 30-04-PLAN.md — Boss ability system foundation (TDD, Wave 3)
- [x] 30-05-PLAN.md — Boss abilities for 10 bosses (Wave 4)
- [x] 30-06-PLAN.md — Boss graphics pipeline (Wave 5)
- [x] 30-07-PLAN.md — Cinematic system (Wave 6)
- [x] 30-08-PLAN.md — Integration & human verification (Wave 7)

#### ✅ Phase 31: Skill Tree & Progression Depth — COMPLETE
**Goal**: Long-term progression provides meaningful horizontal choices, not just bigger numbers
**Depends on**: Phase 26 (meta-progression), Phase 28 (unlocks power-up slots)
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06, ACHIEVE-01, ACHIEVE-02, ACHIEVE-03, ACHIEVE-04
**Success Criteria** (what must be TRUE):
  1. ✓ User can unlock skills in branching tree (3 paths: Power, Strategy, Utility)
  2. ✓ User earns skill points on level up and sees skill tree visualization with locked/unlocked states
  3. ✓ Skills provide horizontal progression (enable strategies, not just +10% stats)
  4. ✓ User unlocks power-up slots and advanced power-ups via skill progression
  5. ✓ User earns achievements for gameplay milestones with unlock modal celebration
  6. ✓ User can view earned achievements in profile with completion progress (Bronze/Silver/Gold/Platinum tiers)
  7. ✓ User notices combo damage increase after unlocking combo_amplifier skill
**Plans**: 9 plans (01-08 + gap closure)
**Completed**: 2026-02-01

Plans:
- [x] 31-01-PLAN.md — Types, Store, Utilities foundation (TDD, Wave 1)
- [x] 31-02-PLAN.md — useSkillTreeStore Zustand persistence (TDD, Wave 1)
- [x] 31-03-PLAN.md — useSkillPoints skill point awarding (TDD, Wave 1)
- [x] 31-04-PLAN.md — SkillTreeView, SkillNode, SkillPath components (Wave 2)
- [x] 31-05-PLAN.md — SkillUnlockModal celebration (Wave 2)
- [x] 31-06-PLAN.md — Achievement utilities tests (TDD, Wave 2)
- [x] 31-07-PLAN.md — Achievement UI components tests (Wave 3)
- [x] 31-08-PLAN.md — Skill effects utilities (TDD, Wave 3)
- [x] 31-09-PLAN.md — Integration (Wave 4) + Gap closure (combo_amplifier wiring)

#### Phase 32: Visual Polish & Effects
**Goal**: Every action feels spectacular with layered particle effects and celebrations
**Depends on**: Phase 26 (particle budget), Phase 27 (board animations), Phase 30 (boss battles)
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06
**Success Criteria** (what must be TRUE):
  1. User sees confetti effects on level victory
  2. User sees fireworks on boss defeat
  3. User sees 10+ combo full-screen celebration effects
  4. User sees layered particle effects (background, mid-ground, foreground)
  5. Particle system enforces budget (max 50-100 on screen, adaptive reduction on low-end devices)
  6. All effects respect reduced-motion accessibility preference
**Plans**: 6 plans in 4 waves

Plans:
- [ ] 32-01-PLAN.md — Layered particle system + Z-index constants (TDD, Wave 1)
- [ ] 32-02-PLAN.md — Boss defeat fireworks + combo milestone hook (TDD, Wave 1)
- [ ] 32-03-PLAN.md — Combo milestone overlay + translations (Wave 1)
- [ ] 32-04-PLAN.md — Victory/Defeat Remotion cinematics (Wave 2)
- [ ] 32-05-PLAN.md — AdventureGame integration + wiring (Wave 3)
- [ ] 32-06-PLAN.md — Human verification (Wave 4)

#### Phase 33: Cinematic System
**Goal**: Key moments feel like movie scenes with professional cinematics
**Depends on**: Phase 30 (boss battles), Phase 32 (visual polish)
**Requirements**: CINE-01, CINE-02, CINE-03, CINE-04, CINE-05
**Success Criteria** (what must be TRUE):
  1. User sees boss entrance cutscene (5-10s, Remotion-based) before battle starts
  2. User sees victory celebration sequence with particle effects and music
  3. User sees defeat sequence providing encouragement
  4. All cinematics are skippable after 2s (accessibility requirement)
  5. Cinematics use Remotion + Lottie + Skia for effects
**Plans**: TBD

Plans:
- [ ] 33-01: TBD during plan-phase

#### Phase 34: Dynamic Difficulty Tuning (AI Director)
**Goal**: Game invisibly adapts to keep players in flow state without feeling artificial
**Depends on**: Phase 29 (basic difficulty), Phase 30 (boss battles excluded)
**Requirements**: DDA-01, DDA-02, DDA-03, DDA-04, DDA-05
**Success Criteria** (what must be TRUE):
  1. System tracks performance metrics (words per minute, success rate, combo length)
  2. AI Director adjusts intensity based on player flow state (invisible adjustments)
  3. Mid-game adjustments are invisible (gradual, not sudden rubber-banding)
  4. Analytics track difficulty effectiveness showing player engagement metrics
  5. System excludes boss fights from adaptive scaling (fixed difficulty for pattern learning)
**Plans**: TBD

Plans:
- [ ] 34-01: TBD during plan-phase

#### Phase 35: World Expansion & Tech Debt Cleanup
**Goal**: Complete v1.1 carryover work and deliver Worlds 4-5 theming
**Depends on**: Phase 32 (visual pipeline proven)
**Requirements**: WORLD-01, WORLD-02, WORLD-03, WORLD-04, WORLD-05, WORLD-06, WORLD-07, WORLD-08, DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. User sees World 4 Idiom Archipelago with parallax backgrounds (3-5 layers, tropical islands)
  2. User sees World 4 with themed particles (palm fronds, seashells, waves) and board decorations (tiki borders)
  3. User sees World 5 Compound Canyon with parallax backgrounds (3-5 layers, desert cliffs)
  4. User sees World 5 with themed particles (dust, tumbleweeds, heat shimmer) and board decorations (canyon rock borders)
  5. All World 4-5 AI-generated assets optimized (WebP, <200KB) following established pipeline
  6. Entry sequence timing optimized from 2.38s to 2s target (380ms reduction)
  7. Video MP4 rendering pipeline functional (Remotion render script produces playable MP4s)
  8. Bug fixes for BUG-004 through BUG-008 resolved and Lexi stuck detection implemented (30s inactivity triggers help)
**Plans**: TBD

Plans:
- [ ] 35-01: TBD during plan-phase

## Progress

**Execution Order:**
Phases execute in numeric order: 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 35

**Dependencies:**
- Phase 27 (Board Mechanics) depends on Phase 26 (Meta-progression foundation)
- Phase 28 (Power-Ups) depends on Phase 26 (unlocks) + Phase 27 (board state)
- Phase 29 (Adaptive Difficulty) depends on Phase 27 + Phase 28
- Phase 30 (Boss Overhaul) depends on Phase 27 + Phase 28 + Phase 29
- Phase 31 (Skill Tree) depends on Phase 26 (meta) + Phase 28 (power-up unlocks)
- Phase 32 (Visual Polish) depends on Phase 26 (particle budget) + Phase 27 (animations) + Phase 30 (bosses)
- Phase 33 (Cinematics) depends on Phase 30 (bosses) + Phase 32 (visual effects)
- Phase 34 (AI Director) depends on Phase 29 (basic difficulty) + Phase 30 (boss exclusion)
- Phase 35 (World Expansion) depends on Phase 32 (visual pipeline)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 15. Chain Combo System | v1.1 | 5/5 | ✅ Complete | 2026-01-25 |
| 16. Boss Battle Foundation | v1.1 | 4/4 | ✅ Complete | 2026-01-25 |
| 17. Boss Mechanic Expansion | v1.1 | 5/5 | ✅ Complete | 2026-01-25 |
| 18. Education XP System | v1.1 | 5/5 | ✅ Complete | 2026-01-25 |
| 19. Achievement System | v1.1 | 5/5 | ✅ Complete | 2026-01-29 |
| 20. Student Analytics Dashboard | v1.1 | 6/6 | ✅ Complete | 2026-01-29 |
| 21. Rich Lesson Delivery | v1.1 | 6/6 | ✅ Complete | 2026-01-29 |
| 24. CrazyGames Portal Integration | v1.2 | 7/7 | ✅ Complete | 2026-01-26 |
| 25. Capacitor Native Apps | v1.2 | 6/6 | ✅ Complete | 2026-01-26 |
| 26. Meta-Progression Foundation | v2.0 | 9/9 | ✅ Complete | 2026-01-30 |
| 27. Dynamic Board Mechanics | v2.0 | 7/7 | ✅ Complete | 2026-01-30 |
| 28. Power-Up System | v2.0 | 8/8 | ✅ Complete | 2026-01-30 |
| 29. Adaptive Difficulty System | v2.0 | 8/8 | ✅ Complete | 2026-01-31 |
| 30. Boss Battle Overhaul | v2.0 | 8/8 | ✅ Complete | 2026-01-31 |
| 31. Skill Tree & Progression Depth | v2.0 | 9/9 | ✅ Complete | 2026-02-01 |
| 32. Visual Polish & Effects | v2.0 | 0/TBD | Not started | - |
| 33. Cinematic System | v2.0 | 0/TBD | Not started | - |
| 34. Dynamic Difficulty Tuning | v2.0 | 0/TBD | Not started | - |
| 35. World Expansion & Tech Debt | v2.0 | 0/TBD | Not started | - |

---

*Roadmap created: 2026-01-25 for v1.1 milestone*
*Last updated: 2026-01-31 after Phase 30 planning complete (Boss Battle Overhaul - 8 plans in 7 waves)*
