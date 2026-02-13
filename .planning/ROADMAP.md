# Roadmap: LexiClash v2.0 Education 2.0

## Overview

Transform the education section into an engaging, competitive learning platform with student duels as the centerpiece, diverse practice modes, polished UI across all dashboards, and improved teacher workflows. This roadmap delivers 8 phases (36-43) spanning foundation refactoring, feature development (duels, practice modes, gamification), UI overhauls for both student and teacher experiences, and comprehensive design polish.

## Milestones

- ✅ **v1.0 Foundation & Game Modes** - Phases 1-35 (shipped ~87% complete, pre-GSD)
- 🚧 **v2.0 Education 2.0** - Phases 36-43 (in progress)

## Phases

### Phase 36: Foundation & Refactoring
**Goal**: Establish architectural foundations for feature development by refactoring oversized files, creating database schema, designing Socket.IO namespace separation, and rebalancing XP economy
**Depends on**: Nothing (first phase of this milestone)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. lib/supabase/teacher.ts (1260 lines) is split into modular files under lib/supabase/education/ with all imports updated and tests passing
  2. New Supabase tables exist with RLS policies (student_duels, duel_turns, practice_sessions, student_achievements_progress)
  3. Socket.IO namespace architecture documented with /duel and /classroom separation preventing room state pollution
  4. XP economy spreadsheet exists modeling all sources (existing + new duels/practice/challenges) with balanced rates preventing inflation
**Plans**: 5 plans

Plans:
- [x] 36-01-PLAN.md — Create education module structure (extract teacher.ts into modular files)
- [x] 36-02-PLAN.md — Migrate all imports from teacher to education, delete teacher.ts
- [x] 36-03-PLAN.md — Supabase migration for duels, practice, achievement progress tables
- [x] 36-04-PLAN.md — Socket.IO /duel namespace with handler stubs
- [x] 36-05-PLAN.md — XP economy model + config values for new activities

### Phase 37: Practice Modes
**Goal**: Students can practice vocabulary through 3 diverse modes (word matching, spelling challenge, timed blitz) with session tracking and XP rewards
**Depends on**: Phase 36
**Requirements**: PRAC-01, PRAC-02, PRAC-03, PRAC-04
**Success Criteria** (what must be TRUE):
  1. Student can practice word matching by dragging/tapping to pair words with definitions and receives instant feedback with scoring
  2. Student can practice spelling challenge by viewing definition and typing correct word with progressive difficulty and hints
  3. Student can play timed blitz (60s speed round) cycling through vocabulary with combo multipliers
  4. Student can select practice mode from mode selector UI showing all available modes with descriptions and progress per mode
  5. Practice sessions are tracked in database and award XP based on performance
**Plans**: 6 plans

Plans:
- [ ] 37-01-PLAN.md — Foundation: install dnd-kit, practice DB operations, XP calculations, API route update, shared hook
- [ ] 37-02-PLAN.md — Word Matching mode (TDD): useMatchingGame hook + drag-and-drop component
- [ ] 37-03-PLAN.md — Spelling Challenge mode (TDD): useSpellingGame hook + progressive difficulty component
- [ ] 37-04-PLAN.md — Timed Blitz mode (TDD): useBlitzGame hook + 60s timer component with combo
- [ ] 37-05-PLAN.md — Integration: update mode selector, page routing, barrel exports
- [ ] 37-06-PLAN.md — Translations (4 languages) + human verification

### Phase 38: Async Duels
**Goal**: Students can challenge classmates to turn-based duels (play board, send score to beat) and view duel history with win/loss records
**Depends on**: Phase 36
**Requirements**: DUEL-01, DUEL-02, DUEL-04, DUEL-05, SOC-02
**Success Criteria** (what must be TRUE):
  1. Student can create async duel challenge by playing a board, freezing state, and sending challenge to classmate with score to beat
  2. Student can accept and play async duel challenge on same frozen board, compare scores, and see winner determination
  3. Student can browse duel lobby showing pending invites, available opponents, and quick-match option within classroom
  4. Student can view duel history with win/loss record, streaks, and per-opponent stats
  5. Student can challenge specific classmate to duel directly from their profile or classroom roster
**Plans**: 8 plans

Plans:
- [x] 38-01-PLAN.md — Duel types + DB CRUD operations (TDD)
- [x] 38-02-PLAN.md — Duel lifecycle handlers: create, accept, decline, cancel (TDD)
- [x] 38-03-PLAN.md — Duel gameplay handlers: score submission, completion, XP award (TDD)
- [x] 38-04-PLAN.md — useDuelSocket hook + lobby handler + registry wiring
- [x] 38-05-PLAN.md — Duel Lobby + Challenge Modal + Notification UI
- [x] 38-06-PLAN.md — Duel Game View + History UI
- [x] 38-07-PLAN.md — Profile challenge button (SOC-02) + route integration
- [x] 38-08-PLAN.md — Translations (4 languages) + human verification

### Phase 39: Real-Time Duels
**Goal**: Students can compete in real-time 1v1 duels where both players see same board simultaneously with live progress indicators
**Depends on**: Phase 38
**Requirements**: DUEL-03
**Success Criteria** (what must be TRUE):
  1. Student can start real-time 1v1 duel and both players see same board simultaneously
  2. Live progress indicators show opponent's word count and score in real-time
  3. Disconnection handling works (30s grace period, reconnection, forfeit button)
  4. Duel completes with winner determination and results saved to history
**Plans**: 5 plans

Plans:
- [x] 39-01-PLAN.md — Real-time handlers: word submission, opponent progress, server timer (TDD)
- [x] 39-02-PLAN.md — Disconnection grace period, reconnection, forfeit handlers (TDD)
- [x] 39-03-PLAN.md — Wire registry + lifecycle, extend useDuelSocket hook
- [x] 39-04-PLAN.md — RealTimeDuelGame UI + OpponentProgressBar + DisconnectOverlay + ForfeitDialog
- [x] 39-05-PLAN.md — Lobby integration (duel type selector) + translations (4 languages)

### Phase 40: Gamification Enhancements
**Goal**: Students experience richer progression with visual milestones, competitive leaderboards, daily/weekly challenges, and expanded achievements
**Depends on**: Phase 37, Phase 38, Phase 39
**Requirements**: GAMF-01, GAMF-02, GAMF-03, GAMF-04
**Success Criteria** (what must be TRUE):
  1. Student sees progression milestones with visual rewards (milestone badges, animated celebrations, enhanced progress indicators beyond basic XP bar)
  2. Student can view competitive classroom leaderboards with weekly/monthly boards, tiers, rank change indicators, and streak badges
  3. Student receives daily and weekly challenges (time-limited goals like "Master 5 words today" or "Win 3 duels this week") with bonus XP/coin rewards
  4. Student can unlock new achievement categories for duels and practice (e.g., "Win 10 duels", "Perfect spelling streak", "Blitz master") with 4 tiers each
**Plans**: TBD

Plans:
- [ ] 40-01: [TBD during planning]

### Phase 41: Student Dashboard Overhaul
**Goal**: Students interact with engaging dashboard featuring activity feed, duel invites, streak calendar, quick-play buttons, profile pages, and classroom activity
**Depends on**: Phase 38, Phase 40
**Requirements**: UIPOL-01, SOC-01, SOC-03
**Success Criteria** (what must be TRUE):
  1. Student dashboard displays engaging layout with activity feed, duel invites widget, streak calendar, quick-play buttons, and progress visualization
  2. Student profile page shows stats, badges, recent activity, XP level, and duel record
  3. Classroom activity feed shows recent duels, achievements unlocked, and milestones reached by classmates
**Plans**: TBD

Plans:
- [ ] 41-01: [TBD during planning]

### Phase 42: Teacher Dashboard & Workflows
**Goal**: Teachers experience improved workflows for lesson creation, assignment tracking, and classroom monitoring with better UX
**Depends on**: Phase 37, Phase 38
**Requirements**: UIPOL-02, TEACH-01, TEACH-02, TEACH-03
**Success Criteria** (what must be TRUE):
  1. Teacher dashboard displays faster navigation, better analytics layout, assignment tracking panel, and student duel monitoring
  2. Teacher can create lessons faster using bulk word import improvements, template lessons, and streamlined word editor
  3. Teacher can assign practice modes and duels to students with specific activities, due dates, and completion tracking
  4. Teacher can view assignment dashboard showing per-student completion rates, scores, and struggling areas
**Plans**: TBD

Plans:
- [ ] 42-01: [TBD during planning]

### Phase 43: Practice Experience & Design Polish
**Goal**: Practice experience delivers polished feedback animations and all education pages follow neo-brutalist design system consistently
**Depends on**: Phase 37, Phase 41, Phase 42
**Requirements**: UIPOL-03, UIPOL-04
**Success Criteria** (what must be TRUE):
  1. Practice sessions display better feedback animations, progress indicators, smooth mode transitions, and comprehensive session completion summaries
  2. All education pages follow neo-brutalist design system (hard shadows, chunky borders, Fredoka/Rubik typography, proper color palette)
  3. Neo-brutalist consistency audit completed with design violations fixed across student and teacher dashboards
**Plans**: TBD

Plans:
- [ ] 43-01: [TBD during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 36. Foundation & Refactoring | v2.0 | 5/5 | Complete | 2026-02-13 |
| 37. Practice Modes | v2.0 | 6/6 | Complete | 2026-02-13 |
| 38. Async Duels | v2.0 | 8/8 | Complete | 2026-02-13 |
| 39. Real-Time Duels | v2.0 | 5/5 | Complete | 2026-02-13 |
| 40. Gamification Enhancements | v2.0 | 0/0 | Not started | - |
| 41. Student Dashboard Overhaul | v2.0 | 0/0 | Not started | - |
| 42. Teacher Dashboard & Workflows | v2.0 | 0/0 | Not started | - |
| 43. Practice Experience & Design Polish | v2.0 | 0/0 | Not started | - |

---
*Last updated: 2026-02-13 — Phase 39 complete (5/5 plans, goal verified)*
