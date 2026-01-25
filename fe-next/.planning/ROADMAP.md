# Roadmap: LexiClash

## Milestones

- ✅ **v1.0 Stabilization** - Phases 1-14 (shipped 2026-01-25)
- 🚧 **v1.1 Adventure & Education Expansion** - Phases 15-23 (in progress)

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

### 🚧 v1.1 Adventure & Education Expansion (In Progress)

**Milestone Goal:** Expand adventure mode with Worlds 4-5, boss battles, and chain combos while enhancing education mode with analytics and gamification.

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

#### Phase 16: Boss Battle Foundation
**Goal**: Enable end-of-world boss battles with phase transitions
**Depends on**: Phase 15 (uses combo scoring for damage calculations)
**Requirements**: BOSS-01, BOSS-02, BOSS-03 (BOSS-04, BOSS-05, BOSS-13 deferred to Phase 17/18)
**Success Criteria** (what must be TRUE):
  1. User can battle end-of-world bosses with clear phase transitions (intro → active → enraged → victory/defeat)
  2. User sees boss HP bar with phase indicators updating in real-time during battle
  3. User experiences popQuiz mechanic (random word requirements each turn)
  4. Combo scoring from Phase 15 integrates with boss damage calculations
**Plans**: 4 plans in 3 waves

Plans:
- [ ] 16-01-PLAN.md — Boss HP tracking hook (TDD) with phase state machine
- [ ] 16-02-PLAN.md — BossHPBar component with real-time updates
- [ ] 16-03-PLAN.md — Integration into AdventureGame
- [ ] 16-04-PLAN.md — popQuiz mechanic verification and tests

**Scope Note**: BOSS-04 (hiveMind/sticky tiles), BOSS-05 (synonymShift), and BOSS-13 (adaptive difficulty) deferred to Phase 17/18 per research analysis.

#### Phase 17: Boss Mechanic Expansion
**Goal**: Complete remaining boss mechanics for variety
**Depends on**: Phase 16 (extends boss state machine)
**Requirements**: BOSS-06, BOSS-07, BOSS-08, BOSS-09, BOSS-10, BOSS-11, BOSS-12
**Success Criteria** (what must be TRUE):
  1. User can complete idiom phrases for bonus damage (idiomIslands mechanic)
  2. User can merge compound words for combo multiplier (compoundMerge mechanic)
  3. User can solve anagrams for critical hits (anagramScramble mechanic)
  4. User sees palindrome words deal double damage (palindromeMirror mechanic)
  5. User earns power-ups from rare words (neologismNebula mechanic)
  6. User receives multilingual hints for bonus (polyglotPeaks mechanic)
  7. Final boss combines all mechanics for ultimate challenge (allMechanics)
**Plans**: TBD

Plans:
- [ ] 17-01: TBD during plan-phase

#### Phase 18: Education XP System
**Goal**: Enable student progression through XP and leveling
**Depends on**: Phase 15 (uses combo scoring for XP calculations)
**Requirements**: GAMIFY-01, GAMIFY-02, GAMIFY-03, GAMIFY-08
**Success Criteria** (what must be TRUE):
  1. Student earns XP from practice activities (flashcards, solo board, lesson completion)
  2. Student sees XP progress bar updating in real-time toward next level
  3. Student levels up with visual celebration when XP threshold reached
  4. Student earns streak bonuses for consecutive practice days
  5. XP accumulation emphasizes mastery ("You learned 50 new words!") over points
**Plans**: TBD

Plans:
- [ ] 18-01: TBD during plan-phase

#### Phase 19: Achievement System
**Goal**: Reward genuine student milestones with meaningful badges
**Depends on**: Phase 18 (achievements unlock based on XP milestones)
**Requirements**: GAMIFY-04, GAMIFY-05, GAMIFY-06, GAMIFY-07
**Success Criteria** (what must be TRUE):
  1. Student sees classroom leaderboard with top students by XP (classroom-scoped for privacy)
  2. Student can earn 15-20 meaningful achievement badges (Bronze/Silver/Gold/Platinum tiers)
  3. Student sees achievement unlock modal with celebration animation when earning badge
  4. Student can view earned achievement badges in profile with completion progress
  5. Achievements celebrate genuine milestones ("First Boss Defeated") not trivial actions
**Plans**: TBD

Plans:
- [ ] 19-01: TBD during plan-phase

#### Phase 20: Student Analytics Dashboard
**Goal**: Give teachers actionable insights into student progress
**Depends on**: Phase 18 (consumes XP and practice session data)
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05
**Success Criteria** (what must be TRUE):
  1. Teacher can view analytics dashboard with 3-5 key metrics (students needing help, class average, common mistakes)
  2. Teacher can see individual student progress metrics (vocabulary mastery, accuracy over time, skill progression)
  3. Teacher can view lesson effectiveness charts showing which lessons drive learning outcomes
  4. Teacher can see vocabulary mastery heatmap by student identifying knowledge gaps
  5. Teacher sees real-time progress updates during active class sessions
**Plans**: TBD

Plans:
- [ ] 20-01: TBD during plan-phase

#### Phase 21: Rich Lesson Delivery
**Goal**: Enhance student learning with rich vocabulary content
**Depends on**: Nothing (parallel to other education features)
**Requirements**: LESSON-01, LESSON-02, LESSON-03
**Success Criteria** (what must be TRUE):
  1. Student sees rich vocabulary explanations (definitions, pronunciation, usage examples)
  2. Student sees contextual examples from Daily Buzz trending content making words relevant
  3. Student can practice with swipe-based flashcard review for active recall
**Plans**: TBD

Plans:
- [ ] 21-01: TBD during plan-phase

#### Phase 22: World Theming Expansion
**Goal**: Deliver immersive theming for Worlds 4-5
**Depends on**: Nothing (parallel to gameplay features)
**Requirements**: WORLD-01, WORLD-02, WORLD-03, WORLD-04, WORLD-05, WORLD-06, WORLD-07, WORLD-08
**Success Criteria** (what must be TRUE):
  1. User sees World 4 Idiom Archipelago with parallax backgrounds (3-5 layers, tropical islands)
  2. User sees World 4 with themed particles (palm fronds, seashells, waves)
  3. User sees World 4 with board decorations (tiki borders, island accents)
  4. User sees World 5 Compound Canyon with parallax backgrounds (3-5 layers, desert cliffs)
  5. User sees World 5 with themed particles (dust, tumbleweeds, heat shimmer)
  6. User sees World 5 with board decorations (canyon rock borders, desert accents)
  7. All World 4-5 AI-generated assets optimized (WebP, <200KB) following established pipeline
**Plans**: TBD

Plans:
- [ ] 22-01: TBD during plan-phase

#### Phase 23: Tech Debt Cleanup
**Goal**: Resolve accumulated technical debt and polish
**Depends on**: Nothing (parallel cleanup work)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. Entry sequence timing optimized from 2.38s to 2s target (380ms reduction)
  2. Video MP4 rendering pipeline functional (Remotion render script produces playable MP4s)
  3. Bug fixes for BUG-004 through BUG-008 resolved and verified
  4. Lexi stuck detection implemented (30s inactivity triggers contextual help)
**Plans**: TBD

Plans:
- [ ] 23-01: TBD during plan-phase

## Progress

**Execution Order:**
Phases execute in numeric order: 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23

**Dependencies:**
- Phase 16 (Boss Foundation) depends on Phase 15 (Combo scoring)
- Phase 17 (Boss Expansion) depends on Phase 16 (State machine proven)
- Phase 18 (XP System) depends on Phase 15 (Combo scoring for XP calculations)
- Phase 19 (Achievements) depends on Phase 18 (XP milestones)
- Phase 20 (Analytics) depends on Phase 18 (XP data to analyze)
- Phases 21, 22, 23 are parallel (no dependencies)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 15. Chain Combo System | v1.1 | 5/5 | ✅ Complete | 2026-01-25 |
| 16. Boss Battle Foundation | v1.1 | 0/TBD | Not started | - |
| 17. Boss Mechanic Expansion | v1.1 | 0/TBD | Not started | - |
| 18. Education XP System | v1.1 | 0/TBD | Not started | - |
| 19. Achievement System | v1.1 | 0/TBD | Not started | - |
| 20. Student Analytics Dashboard | v1.1 | 0/TBD | Not started | - |
| 21. Rich Lesson Delivery | v1.1 | 0/TBD | Not started | - |
| 22. World Theming Expansion | v1.1 | 0/TBD | Not started | - |
| 23. Tech Debt Cleanup | v1.1 | 0/TBD | Not started | - |

---

*Roadmap created: 2026-01-25 for v1.1 milestone*
*Last updated: 2026-01-25 after Phase 15 completion*
