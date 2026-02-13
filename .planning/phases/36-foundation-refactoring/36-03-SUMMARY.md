---
phase: 36-foundation-refactoring
plan: 03
subsystem: database
tags: [supabase, postgresql, rls, schema, migrations]

# Dependency graph
requires:
  - phase: 056_teacher_vocabulary_builder
    provides: classrooms, vocabulary_lessons, profiles tables
provides:
  - student_duels table for async/realtime duel tracking
  - duel_turns table for turn-based gameplay
  - practice_sessions table for solo practice modes
  - student_achievements_progress table for incremental progress tracking
  - 16 RLS policies for secure student/teacher access
  - 11 performance indexes for common query patterns
affects: [37-practice-modes, 38-async-duels, 39-realtime-duels]

# Tech tracking
tech-stack:
  added: []
  patterns: [RLS policies with classroom join, profiles FK instead of auth.users]

key-files:
  created: [fe-next/supabase/migrations/20260213000000_education_duels_practice.sql]
  modified: []

key-decisions:
  - "References profiles(id) instead of auth.users(id) following blast_results pattern"
  - "duel_turns RLS joins to student_duels to verify player participation (not just player_id check)"
  - "practice_sessions supports NULL classroom_id for personal practice outside classroom context"
  - "student_achievements_progress tracks incremental progress before unlock (separate from student_achievements)"

patterns-established:
  - "Classroom-scoped student data with RLS enforcing classroom membership"
  - "Teacher access via classroom.teacher_id join pattern"
  - "Classmate visibility via classroom_memberships join"

# Metrics
duration: 17min
completed: 2026-02-13
---

# Phase 36 Plan 03: Database Schema for Duels and Practice

**Single migration establishing 4 tables (duels, turns, practice, achievement progress) with RLS and indexes for Phases 37-39**

## Performance

- **Duration:** 17 min
- **Started:** 2026-02-13T10:32:35Z
- **Completed:** 2026-02-13T10:49:38Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Database schema foundation for duels (async + realtime) and practice modes
- 4 tables with proper foreign keys, constraints, and cascading deletes
- 16 RLS policies ensuring students access own data, see classmates, teachers see classroom students
- 11 performance indexes optimizing common queries (by student, by classroom, by status)
- Auto-updating timestamp trigger for achievement progress

## Task Commits

1. **Task 1: Create migration with 4 tables, RLS, and indexes** - `fd464f80` (feat)

**Plan metadata:** Not yet committed (will be committed after SUMMARY creation)

## Files Created/Modified
- `fe-next/supabase/migrations/20260213000000_education_duels_practice.sql` - Database schema with 4 tables, RLS policies, indexes, and triggers

## Decisions Made

**1. Foreign key references to profiles(id) instead of auth.users(id)**
- Rationale: Follows existing pattern from blast_results table (migration 056)
- Consistency with codebase patterns

**2. duel_turns RLS policy joins to student_duels table**
- Rationale: Prevents unauthorized turn creation by verifying player is actually part of the duel
- Research pitfall 4 identified this as critical security requirement

**3. practice_sessions allows NULL classroom_id**
- Rationale: Enables personal practice outside classroom context (students can practice any lesson)
- ON DELETE SET NULL preserves session history even if classroom deleted

**4. student_achievements_progress as separate table from student_achievements**
- Rationale: Tracks incremental progress toward next tier (Bronze → Silver → Gold → Platinum)
- student_achievements stores unlocked achievements, this table tracks "X/100 words toward Silver"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Database foundation complete for Phase 37 (Practice Modes)
- Ready for Phase 38 (Async Duels) backend implementation
- Ready for Phase 39 (Real-Time Duels) WebSocket handlers
- All tables have RLS enabled preventing unauthorized data access
- Performance indexes in place for common query patterns

**Blockers:** None

**Concerns:** None - migration follows established patterns and includes comprehensive RLS policies

---
*Phase: 36-foundation-refactoring*
*Completed: 2026-02-13*
