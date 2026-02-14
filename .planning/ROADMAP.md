# Roadmap: LexiClash v2.0 Education 2.0

## Overview

Transform the education section into an engaging, competitive learning platform with student duels as the centerpiece, diverse practice modes, polished UI across all dashboards, and improved teacher workflows. This roadmap delivers 10 phases (36-45) spanning foundation refactoring, feature development (duels, practice modes, gamification), UI overhauls for both student and teacher experiences, comprehensive design polish, and gap closure.

## Milestones

- ✅ **v1.0 Foundation & Game Modes** - Phases 1-35 (shipped ~87% complete, pre-GSD)
- 🚧 **v2.0 Education 2.0** - Phases 36-45 (in progress)

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
**Plans**: 7 plans

Plans:
- [x] 40-01-PLAN.md — DB migration: leaderboard snapshots + duel/practice achievement definitions + types
- [x] 40-02-PLAN.md — Leaderboard enhancement: weekly/monthly scopes, rank deltas, streak badges, full list
- [x] 40-03-PLAN.md — Daily/weekly challenges: backend CRUD + challenge UI cards + ChallengePanel
- [x] 40-04-PLAN.md — Progression milestones + achievement grid: milestone tracker, celebration, achievement categories
- [x] 40-05-PLAN.md — Translations (4 languages) + human verification
- [x] 40-06-PLAN.md — Gap closure: wire leaderboard, challenges, milestones into student dashboard
- [x] 40-07-PLAN.md — Gap closure: student achievements page + profile navigation link

### Phase 41: Student Dashboard Overhaul
**Goal**: Students interact with engaging dashboard featuring activity feed, duel invites, streak calendar, quick-play buttons, profile pages, and classroom activity
**Depends on**: Phase 38, Phase 40
**Requirements**: UIPOL-01, SOC-01, SOC-03
**Success Criteria** (what must be TRUE):
  1. Student dashboard displays engaging layout with activity feed, duel invites widget, streak calendar, quick-play buttons, and progress visualization
  2. Student profile page shows stats, badges, recent activity, XP level, and duel record
  3. Classroom activity feed shows recent duels, achievements unlocked, and milestones reached by classmates
**Plans**: 4 plans

Plans:
- [x] 41-01-PLAN.md — QuickPlayPanel + StreakCalendar widgets for student dashboard
- [x] 41-02-PLAN.md — Classroom activity feed (useClassroomActivity hook + ActivityFeed component)
- [x] 41-03-PLAN.md — Student profile enhancement with duel record and recent activity
- [x] 41-04-PLAN.md — Translations (4 languages) for all new dashboard/profile UI text

### Phase 42: Teacher Dashboard & Workflows
**Goal**: Teachers experience improved workflows for lesson creation, assignment tracking, and classroom monitoring with better UX
**Depends on**: Phase 37, Phase 38
**Requirements**: UIPOL-02, TEACH-01, TEACH-02, TEACH-03
**Success Criteria** (what must be TRUE):
  1. Teacher dashboard displays faster navigation, better analytics layout, assignment tracking panel, and student duel monitoring
  2. Teacher can create lessons faster using bulk word import improvements, template lessons, and streamlined word editor
  3. Teacher can assign practice modes and duels to students with specific activities, due dates, and completion tracking
  4. Teacher can view assignment dashboard showing per-student completion rates, scores, and struggling areas
**Plans**: 5 plans

Plans:
- [x] 42-01-PLAN.md — Assignment data layer: DB migration, types, CRUD functions, useAssignments hook
- [x] 42-02-PLAN.md — Lesson creation enhancements: TemplateLessonSelector + BulkImportEnhanced
- [x] 42-03-PLAN.md — Assignment UI: AssignmentCreator + AssignmentTrackingPanel + CompletionTracker
- [x] 42-04-PLAN.md — Dashboard integration: DuelMonitoringPanel + wire assignments/templates into dashboard
- [x] 42-05-PLAN.md — Translations (4 languages) for all new teacher workflow UI text

### Phase 43: Practice Experience & Design Polish
**Goal**: Practice experience delivers polished feedback animations and all education pages follow neo-brutalist design system consistently
**Depends on**: Phase 37, Phase 41, Phase 42
**Requirements**: UIPOL-03, UIPOL-04
**Success Criteria** (what must be TRUE):
  1. Practice sessions display better feedback animations, progress indicators, smooth mode transitions, and comprehensive session completion summaries
  2. All education pages follow neo-brutalist design system (hard shadows, chunky borders, Fredoka/Rubik typography, proper color palette)
  3. Neo-brutalist consistency audit completed with design violations fixed across student and teacher dashboards
**Plans**: 4 plans

Plans:
- [x] 43-01-PLAN.md — Practice feedback animations + AdaptiveMotion migration + session summary enhancement + PracticeModeSelector design fix
- [x] 43-02-PLAN.md — Neo-brutalist consistency audit + design violation fixes across education, student, teacher components
- [x] 43-03-PLAN.md — Translations (4 languages) for new practice polish UI text
- [x] 43-04-PLAN.md — Gap closure: AdaptiveMotion migration for 6 remaining practice components + border-neo fix in AchievementUnlockModal

### Phase 44: Milestone Gap Closure & Tech Debt
**Goal**: Close the one partial requirement (SOC-02) and clean up accumulated tech debt before milestone completion
**Depends on**: Phase 38, Phase 41
**Requirements**: SOC-02
**Gap Closure**: Closes gaps from v2.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. Student can challenge specific classmate from their profile page or the classroom roster (ChallengeButton wired)
  2. Duel PageClient.tsx uses real API fetches instead of mock classroom/lesson data
  3. No unused exported functions in duel data layer (getActiveDuelsForStudent removed or used)
  4. Phase 37 has a VERIFICATION.md confirming all success criteria were met
**Plans**: 1 plan

Plans:
- [x] 44-01-PLAN.md — Wire ChallengeButton to profile + duel lobby classmates tab + remove unused export + Phase 37 verification

### Phase 45: Practice XP Server-Side Wiring
**Goal**: Wire server-side XP award for practice sessions so XP is persisted authoritatively via educationXpManager, completing E2E Flow #5
**Depends on**: Phase 37
**Requirements**: PRAC-01, PRAC-02, PRAC-03, PRAC-04 (completing server-side XP for all practice modes)
**Gap Closure**: Closes integration gap from v2.0 milestone audit (practice API → educationXpManager)
**Success Criteria** (what must be TRUE):
  1. Practice API PATCH handler calls educationXpManager.awardEducationXp() after session completion
  2. XP from practice sessions is persisted to student_progress.total_xp via server-side function
  3. E2E Flow #5 (Practice Session: Select → Play → Track → XP Award) completes 9/9 steps
**Plans**: 1 plan

Plans:
- [ ] 45-01-PLAN.md — Wire educationXpManager into practice API PATCH handler + verify E2E flow

## Progress

**Execution Order:**
Phases execute in numeric order: 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44 → 45

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 36. Foundation & Refactoring | v2.0 | 5/5 | Complete | 2026-02-13 |
| 37. Practice Modes | v2.0 | 6/6 | Complete | 2026-02-13 |
| 38. Async Duels | v2.0 | 8/8 | Complete | 2026-02-13 |
| 39. Real-Time Duels | v2.0 | 5/5 | Complete | 2026-02-13 |
| 40. Gamification Enhancements | v2.0 | 7/7 | Complete | 2026-02-14 |
| 41. Student Dashboard Overhaul | v2.0 | 4/4 | Complete | 2026-02-14 |
| 42. Teacher Dashboard & Workflows | v2.0 | 5/5 | Complete | 2026-02-14 |
| 43. Practice Experience & Design Polish | v2.0 | 4/4 | Complete | 2026-02-14 |
| 44. Milestone Gap Closure & Tech Debt | v2.0 | 1/1 | Complete | 2026-02-14 |
| 45. Practice XP Server-Side Wiring | v2.0 | 0/1 | Not Started | - |

---
*Last updated: 2026-02-14 — Phase 45 added (gap closure from second audit)*
