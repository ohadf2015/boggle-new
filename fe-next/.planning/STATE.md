# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Adventure mode must feel immersive and connected to its themed worlds
**Current focus:** Phase 18 - Education XP System (COMPLETE)

## Current Position

Phase: 24 of 25 (CrazyGames Portal Integration) — IN PROGRESS
Plan: 2/6 complete
Status: In progress
Last activity: 2026-01-26 — Completed 24-02-PLAN.md (Visual Consistency Fixes)

Progress: [██████████░░] 18/25 phases (72% milestone, v1.1 in progress)

## Performance Metrics

**Velocity (v1.0 baseline):**
- Total plans completed: 62
- Average duration: Not tracked in v1.0
- Total execution time: 4 days (2026-01-21 to 2026-01-25)

**By Phase (v1.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1-14 | 62 | Complete |

**v1.1 Progress:**
- Plans completed: 19 (Phase 15-18 complete)
- Current phase: 18 (Education XP System) — COMPLETE
- Next phase: 19 (Education Teacher Dashboard)

**Phase 15 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 15-01 | Chain Tile Calculation | 17min | Complete |
| 15-02 | Combo Tier Feedback | 13min | Complete |
| 15-03 | Chain Particle Effects | 17min | Complete |
| 15-04 | Chain Cascade Animation | 6min | Complete |
| 15-05 | Adventure Game Integration | 14min | Complete |

**Phase 15 Total:** 67 minutes, 83 tests added

**Phase 16 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 16-01 | Boss HP Tracking | 12min | Complete |
| 16-02 | Boss HP Bar UI | 11min | Complete |
| 16-03 | Boss Overlay Integration | 14min | Complete |
| 16-04 | PopQuiz Mechanic Verification | 9min | Complete |

**Phase 16 Total:** 46 minutes, 57 tests added

**Phase 17 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 17-01 | Mechanic Test Coverage | 3min | Complete |
| 17-02 | finalWord Mechanic Tests | 3min | Complete |
| 17-03 | scrambledReality Anagram Enhancement | 4min | Complete |
| 17-04 | Stub Mechanic Tests | 2min | Complete |
| 17-05 | Boss Integration Tests | 26min | Complete |

**Phase 17 Total:** 38 minutes, 230 tests added

**Phase 18 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 18-01 | Education XP Foundation | 5min | Complete |
| 18-02 | XP Hook and Translations | 6min | Complete |
| 18-03 | Progress UI Components | 11min | Complete |
| 18-04 | LevelUpCelebration Component | 6min | Complete |
| 18-05 | Practice XP Integration | 7min | Complete |

**Phase 18 Total:** 35 minutes, 114 tests added (15 new in 18-05)

**Phase 24 Plans:**
| Plan | Name | Duration | Status |
|------|------|----------|--------|
| 24-01 | Audio Lazy Loading | TBD | Complete |
| 24-02 | Visual Consistency Fixes | 5min | Complete |
| 24-03 | Asset Size Optimization | - | Pending |
| 24-04 | Auth Integration | - | Pending |
| 24-05 | Multiplayer Integration | - | Pending |
| 24-06 | Ads Integration | - | Pending |

**Phase 24 Progress:** 2/6 plans complete, 5 minutes

## Accumulated Context

### Decisions

Key decisions affecting v1.1 work (see PROJECT.md for full log):

- **v1.0**: Focus on Worlds 1-3 only → Ship polished subset before expanding (Good)
- **v1.0**: Skip boss battles for now → Core adventure loop more important (Good)
- **v1.0**: Combined parallax (gyro+gesture+ambient) → "Always alive" feel (Good)
- **v1.0**: Education as separate section → Distinct flow from main game (Good)
- **v1.1**: Research-informed phase ordering → Combo foundation before bosses/XP (prevents rework)
- **15-01**: Math.round for chain bonus → Handles floating point precision (0.1 * 1.5 issue) (2026-01-25)
- **15-01**: Chain tile structural sharing → Only clone affected rows, 25-57% memory reduction (2026-01-25)
- **15-02**: Tier thresholds 2/4/7/10 → Progressive feel, not linear (2026-01-25)
- **15-03**: Particle counts 4/12/20 for device tiers → Balance satisfaction with performance (2026-01-25)
- **15-04**: 50ms stagger for chain cascades → Slower than regular 30ms for visual emphasis (2026-01-25)
- **15-05**: useRef for grid position calculation → Enables accurate particle positioning (2026-01-25)
- **16-01**: 5-phase state machine (intro/active/enraged/victory/defeat) → Clear game flow stages (2026-01-25)
- **16-01**: Enraged at 25% HP → Industry standard, creates urgency without feeling unfair (2026-01-25)
- **16-01**: Combo multiplier 1 + (count * 0.1) → Linear scaling, predictable damage calculation (2026-01-25)
- **16-01**: useRef pattern for phase → Avoids closure issues in batched React state updates (2026-01-25)
- **16-02**: Spring physics for HP animation → Smooth, natural-feeling HP depletion enhances battle feedback (2026-01-25)
- **16-02**: Green → Red color transition → Universal color language (healthy → danger), better accessibility (2026-01-25)
- **16-02**: Hide HP bar during intro/victory/defeat → Cleaner UI, reduced visual clutter (2026-01-25)
- **16-03**: Boss damage formula (score/10 * combo * mechanic) → Scales word scores to HP pool, rewards strategic play (2026-01-25)
- **16-03**: BossOverlay compound component → Encapsulates all boss UI, reduces AdventureGame.tsx complexity (2026-01-25)
- **16-03**: Mechanic multiplier 2x when met → Rewards strategic play without making non-mechanic words useless (2026-01-25)
- **17-01**: Boss mechanic test isolation pattern → One test file per mechanic for targeted testing (2026-01-25)
- **17-03**: areAnagrams uses sorted letter comparison → Excludes same word (LISTEN vs LISTEN) (2026-01-25)
- **17-03**: scrambledReality fallback to unique letters >= 4 → When no anagram pair found (2026-01-25)
- **17-05**: jest.requireActual for hook integration tests → Bypass module mocks to test real hooks in same file (2026-01-25)
- **18-01**: Mastery messages before XP amounts → Research pitfall 1: extrinsic rewards undermine intrinsic motivation (2026-01-25)
- **18-01**: Math.round for streak bonus → Floating point precision (0.75 * 70 = 52.5) (2026-01-25)
- **18-01**: Migration 062 (not 059) → 059 already exists (adventure_level_attempts) (2026-01-25)
- **18-02**: pendingUpdate pattern → Hook tracks pending updates, database persistence deferred to Plan 05 (2026-01-25)
- **18-02**: useMemo for xpProgress → Derived state recalculates only when totalXp changes (2026-01-25)
- **18-02**: Streak update on every practice → Builds loss aversion for intrinsic motivation (2026-01-25)
- **18-04**: fireLevelUpConfetti preset → Consistent celebration effect using neo-brutalist palette (2026-01-25)
- **18-04**: useId for aria-labelledby → React 18 hook for guaranteed unique accessibility IDs (2026-01-25)
- **18-03**: Neo-yellow for XP progress fill → High visibility against neo-navy background (2026-01-25)
- **18-03**: Neo-orange for streak badge → Differentiate from XP progress bar (2026-01-25)
- **18-03**: Streak bonus thresholds 7/14/30 → +50%/+75%/+100% XP multipliers (2026-01-25)
- **18-05**: PracticeSessionProvider context → Wraps practice activities with XP state and persistence (2026-01-25)
- **18-05**: Fixed XP header during practice → Progress bar and streak visible without disrupting UI (2026-01-25)
- **18-05**: Optional xpSessionData prop → Practice components work with or without XP integration (2026-01-25)
- **24-02**: CSS isolation with 'all: initial' → Prevents parent frame styles from bleeding through iframe (2026-01-26)
- **24-02**: 100vh/100dvh fallback pattern → 100vh = parent height, 100dvh = iframe height (2026-01-26)
- **24-02**: Viewport hook delegation → Separate concerns, reusable outside provider (2026-01-26)

### Pending Todos

None.

### Blockers/Concerns

**Phase 15 (Chain Combos) — RESOLVED:**
- Chain tile logic verified — 15 tests passing, Math.round handles precision
- Integration tested — 83 tests total, no regressions
- RTL tested — Hebrew rendering verified for combo badges
- Multiplayer isolation — 854 backend tests passing, zero imports crossed

**Phase 16 (Boss Battles) — RESOLVED:**
- Boss HP tracking implemented — 21 tests passing, 5-phase state machine
- BossHPBar component — 18 tests, spring animations, enraged indicator
- Integration complete — BossOverlay compound component, damage wired
- popQuiz mechanic verified — 18 tests, all 4 requirement types working
- Playtesting still needed — Must validate with puzzle players before launch

**Phase 17 (Boss Expansion) — COMPLETE:**
- mirrorMatch mechanic tested — 44 tests, palindrome detection verified
- stellarForge mechanic tested — 52 tests, supernova letter Q/X/Z detection verified
- finalWord mechanic tested — 41 tests, phase cycling and delegation verified
- scrambledReality enhanced — 42 tests, areAnagrams + foundWords tracking + translations
- Stub mechanic tests — All 10 boss mechanics have dedicated test files
- Boss integration tests — 51 tests using real hooks for all 10 worlds

**Phase 18 (Education XP) — COMPLETE:**
- XP calculation foundation — educationXpManager.ts with 32 tests, 98.6% coverage
- Database schema — Migration 062 adds XP/level/streak columns
- useEducationXp hook — State management with 16 tests, pendingUpdate for persistence
- Translation keys — education.xp section in 4 languages (en, he, sv, ja)
- LevelUpCelebration component — 20 tests, confetti integration, accessible modal
- XpProgressBar component — 15 tests, animated level progress, RTL support
- StreakBonusIndicator component — 16 tests, bonus thresholds, badge/inline variants
- PracticeSessionProvider — 15 tests, wraps practice with XP context
- Practice integration complete — FlashcardReview and SoloPracticeBoard with XP display
- Supabase persistence — XP saved on session completion
- Total: 114 tests, full XP system functional

**Phase 20 (Analytics):**
- COPPA compliance — Legal review required before launch, anonymous student IDs only (research pitfall 4)
- Teacher co-design needed — Build dashboard with teachers, not for them (research pitfall 9)

**Phase 24 (CrazyGames Portal Integration) — IN PROGRESS:**
- Visual consistency verified — CSS isolation + viewport hook implemented (24-02 complete)
- Manual testing needed — Screenshot comparison for visual parity validation
- Next: Asset size optimization (24-03) — Target <20MB initial load for mobile homepage

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 24-02-PLAN.md (Visual Consistency Fixes) — 2/6 plans complete
Resume file: None

**Next action:** Continue Phase 24 with plan 24-03 (Asset Size Optimization)

---
*State initialized: 2026-01-22*
*Last updated: 2026-01-26 (Phase 24 plan 02 complete)*
