# Requirements: LexiClash v1.1

**Defined:** 2026-01-25
**Core Value:** Adventure mode must feel immersive and connected to its themed worlds

## v1.1 Requirements

Requirements for Adventure & Education Expansion milestone. Each maps to roadmap phases.

### Boss Battles

- [ ] **BOSS-01**: User can battle end-of-world bosses with phase transitions (intro → phase1 → phase2 → enraged → victory/defeat)
- [ ] **BOSS-02**: User sees boss HP bar with phase indicators during battle
- [ ] **BOSS-03**: Boss mechanic popQuiz — random word requirements each turn
- [ ] **BOSS-04**: Boss mechanic hiveMind — sticky tiles that persist between turns
- [ ] **BOSS-05**: Boss mechanic synonymShift — bonus damage for synonym pairs
- [ ] **BOSS-06**: Boss mechanic idiomIslands — complete idiom phrases for bonus
- [ ] **BOSS-07**: Boss mechanic compoundMerge — merge compound words for combo
- [ ] **BOSS-08**: Boss mechanic anagramScramble — solve anagrams for critical hits
- [ ] **BOSS-09**: Boss mechanic palindromeMirror — palindrome words deal double damage
- [ ] **BOSS-10**: Boss mechanic neologismNebula — rare words grant power-ups
- [ ] **BOSS-11**: Boss mechanic polyglotPeaks — multilingual hints for bonus
- [ ] **BOSS-12**: Boss mechanic allMechanics — final boss combining all mechanics
- [ ] **BOSS-13**: Boss difficulty adapts based on player's average performance (80% completion target)

### Chain Combos

- [ ] **COMBO-01**: User can link chain tiles for 1.5x combo multiplier
- [ ] **COMBO-02**: User sees combo meter with tiered visual feedback (Nice! → Great! → Amazing! → LEGENDARY!)
- [ ] **COMBO-03**: User sees themed particle effects on combo completion
- [ ] **COMBO-04**: User sees letter cascade animations during chain reactions
- [ ] **COMBO-05**: Combo scoring integrates with existing scoring engine

### Education Gamification

- [x] **GAMIFY-01**: Student earns XP from practice activities (flashcards, solo board, lesson completion)
- [x] **GAMIFY-02**: Student sees XP progress bar toward next level
- [x] **GAMIFY-03**: Student levels up based on XP accumulation
- [x] **GAMIFY-04**: Student sees classroom leaderboard (top students by XP, classroom-scoped)
- [x] **GAMIFY-05**: Student can earn 15-20 meaningful achievements (Bronze/Silver/Gold/Platinum tiers)
- [x] **GAMIFY-06**: Student sees achievement unlock modal when earning badge
- [x] **GAMIFY-07**: Student can view earned achievement badges in profile
- [x] **GAMIFY-08**: Student earns streak bonuses for consecutive practice days

### Student Analytics

- [x] **ANALYTICS-01**: Teacher can view analytics dashboard with student progress
- [x] **ANALYTICS-02**: Teacher can see individual student progress metrics
- [x] **ANALYTICS-03**: Teacher can view lesson effectiveness charts
- [x] **ANALYTICS-04**: Teacher can see vocabulary mastery heatmap by student
- [x] **ANALYTICS-05**: Teacher sees real-time progress updates during class sessions

### Lesson Delivery

- [ ] **LESSON-01**: Student sees rich vocabulary explanations (definitions, pronunciation, usage)
- [ ] **LESSON-02**: Student sees contextual examples from Daily Buzz trending content
- [ ] **LESSON-03**: Student can practice with swipe-based flashcard review

### World Theming (Worlds 4-5)

- [ ] **WORLD-01**: World 4 Idiom Archipelago has parallax backgrounds (3-5 layers, tropical islands)
- [ ] **WORLD-02**: World 4 Idiom Archipelago has themed particles (palm fronds, seashells, waves)
- [ ] **WORLD-03**: World 4 Idiom Archipelago has board decorations (tiki borders, island accents)
- [ ] **WORLD-04**: World 4 has AI-generated background assets (WebP, <200KB)
- [ ] **WORLD-05**: World 5 Compound Canyon has parallax backgrounds (3-5 layers, desert cliffs)
- [ ] **WORLD-06**: World 5 Compound Canyon has themed particles (dust, tumbleweeds, heat shimmer)
- [ ] **WORLD-07**: World 5 Compound Canyon has board decorations (canyon rock borders, desert accents)
- [ ] **WORLD-08**: World 5 has AI-generated background assets (WebP, <200KB)

### Tech Debt

- [ ] **DEBT-01**: Entry sequence timing optimized from 2.38s to 2s target
- [ ] **DEBT-02**: Video MP4 rendering pipeline functional (Remotion render script)
- [ ] **DEBT-03**: Bug fixes for BUG-004 through BUG-008 resolved
- [ ] **DEBT-04**: Lexi stuck detection implemented (30s inactivity triggers help)

## Future Requirements

Deferred to v1.2+ milestones.

### Advanced Features

- **ADV-01**: Worlds 6-10 full theming (after 4-5 proven)
- **ADV-02**: Audio theming per world (world-specific sound loops)
- **ADV-03**: Haptic feedback for combos and boss hits
- **ADV-04**: Social leaderboards (school-wide, requires privacy review)
- **ADV-05**: Video celebrations for boss victories

### Education Expansion

- **EDU-01**: Parent progress reports
- **EDU-02**: Curriculum alignment mapping
- **EDU-03**: Custom achievement creation by teachers
- **EDU-04**: Class average benchmarking

## Out of Scope

Explicitly excluded from v1.1 milestone.

| Feature | Reason |
|---------|--------|
| Multiplayer adventure mode | Scope creep, single-player polish first |
| 3D effects or environments | Not aligned with Neo-Brutalist style, performance concerns |
| Per-level custom mechanics | Cognitive load, tutorial fatigue |
| Procedurally generated levels | Quality control, hand-crafted preferred |
| Lengthy unskippable cutscenes | Accessibility violation, player frustration |
| Complex AI boss behavior | Start with rule-based, defer adaptive AI |
| Mobile app (native) | Web-first strategy |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOSS-01 | Phase 16 | Pending |
| BOSS-02 | Phase 16 | Pending |
| BOSS-03 | Phase 16 | Pending |
| BOSS-04 | Phase 16 | Pending |
| BOSS-05 | Phase 16 | Pending |
| BOSS-06 | Phase 17 | Pending |
| BOSS-07 | Phase 17 | Pending |
| BOSS-08 | Phase 17 | Pending |
| BOSS-09 | Phase 17 | Pending |
| BOSS-10 | Phase 17 | Pending |
| BOSS-11 | Phase 17 | Pending |
| BOSS-12 | Phase 17 | Pending |
| BOSS-13 | Phase 16 | Pending |
| COMBO-01 | Phase 15 | Pending |
| COMBO-02 | Phase 15 | Pending |
| COMBO-03 | Phase 15 | Pending |
| COMBO-04 | Phase 15 | Pending |
| COMBO-05 | Phase 15 | Pending |
| GAMIFY-01 | Phase 18 | Complete |
| GAMIFY-02 | Phase 18 | Complete |
| GAMIFY-03 | Phase 18 | Complete |
| GAMIFY-04 | Phase 19 | Complete |
| GAMIFY-05 | Phase 19 | Complete |
| GAMIFY-06 | Phase 19 | Complete |
| GAMIFY-07 | Phase 19 | Complete |
| GAMIFY-08 | Phase 18 | Complete |
| ANALYTICS-01 | Phase 20 | Complete |
| ANALYTICS-02 | Phase 20 | Complete |
| ANALYTICS-03 | Phase 20 | Complete |
| ANALYTICS-04 | Phase 20 | Complete |
| ANALYTICS-05 | Phase 20 | Complete |
| LESSON-01 | Phase 21 | Pending |
| LESSON-02 | Phase 21 | Pending |
| LESSON-03 | Phase 21 | Pending |
| WORLD-01 | Phase 22 | Pending |
| WORLD-02 | Phase 22 | Pending |
| WORLD-03 | Phase 22 | Pending |
| WORLD-04 | Phase 22 | Pending |
| WORLD-05 | Phase 22 | Pending |
| WORLD-06 | Phase 22 | Pending |
| WORLD-07 | Phase 22 | Pending |
| WORLD-08 | Phase 22 | Pending |
| DEBT-01 | Phase 23 | Pending |
| DEBT-02 | Phase 23 | Pending |
| DEBT-03 | Phase 23 | Pending |
| DEBT-04 | Phase 23 | Pending |

**Coverage:**
- v1.1 requirements: 44 total
- Mapped to phases: 44 (100% coverage ✓)
- Unmapped: 0

**Phase assignment breakdown:**
- Phase 15 (Chain Combo System): 5 requirements (COMBO-01 to COMBO-05)
- Phase 16 (Boss Battle Foundation): 6 requirements (BOSS-01 to BOSS-05, BOSS-13)
- Phase 17 (Boss Mechanic Expansion): 7 requirements (BOSS-06 to BOSS-12)
- Phase 18 (Education XP System): 4 requirements (GAMIFY-01 to GAMIFY-03, GAMIFY-08)
- Phase 19 (Achievement System): 4 requirements (GAMIFY-04 to GAMIFY-07)
- Phase 20 (Student Analytics Dashboard): 5 requirements (ANALYTICS-01 to ANALYTICS-05)
- Phase 21 (Rich Lesson Delivery): 3 requirements (LESSON-01 to LESSON-03)
- Phase 22 (World Theming Expansion): 8 requirements (WORLD-01 to WORLD-08)
- Phase 23 (Tech Debt Cleanup): 4 requirements (DEBT-01 to DEBT-04)

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-29 after Phase 20 completion (ANALYTICS-01 to ANALYTICS-05 complete)*
