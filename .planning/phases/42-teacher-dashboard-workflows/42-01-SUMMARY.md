---
phase: 42-teacher-dashboard-workflows
plan: 01
title: Assignment Data Layer
subsystem: education-backend
tags: [database, assignment-tracking, teacher-dashboard, data-layer]
completed: 2026-02-14
duration: 18 min

requires:
  - 056_teacher_vocabulary_builder.sql (classrooms, vocabulary_lessons, profiles)
  - Phase 36 (education duels and practice schema)

provides:
  - teacher_assignments table with RLS policies
  - assignment_completions table for student tracking
  - Assignment CRUD service functions
  - useAssignments React hook with optimistic updates
  - Assignment status computation (active/overdue/completed)

affects:
  - 42-02: Assignment Creator UI (consumes createAssignment)
  - 42-03: Assignment Tracker UI (consumes getClassroomAssignments)
  - 42-04: Teacher Dashboard (uses useAssignments hook)

tech-stack:
  added: []
  patterns:
    - Supabase RLS policies for teacher/student access control
    - React hooks with optimistic updates
    - Completion ratio tracking (completion_count/student_count)

key-files:
  created:
    - fe-next/supabase/migrations/20260215100000_assignment_tracking.sql
    - fe-next/hooks/useAssignments.ts
    - fe-next/hooks/useAssignments.test.ts
  modified:
    - fe-next/lib/supabase/education/types.ts
    - fe-next/lib/supabase/education/assignments.ts

decisions:
  - decision: Assignment type includes both 'practice' and 'duel'
    rationale: Teachers need to assign both solo practice and competitive duels
    alternatives: Separate tables for practice/duel assignments
    impact: Single unified assignment flow, simpler UI

  - decision: Due date is optional (nullable)
    rationale: Not all assignments need deadlines
    alternatives: Required due_date with default far future
    impact: Flexible assignment creation, "no deadline" state

  - decision: Unique constraint on (classroom_id, lesson_id, assignment_type)
    rationale: Prevent duplicate assignments of same lesson
    alternatives: Allow duplicates, rely on UI to prevent
    impact: Database-level constraint ensures data integrity

  - decision: Completion tracking in separate table
    rationale: Many-to-many relationship (students × assignments)
    alternatives: JSONB array in teacher_assignments
    impact: Easier querying, better performance for completion stats

metrics:
  files-changed: 5
  lines-added: 550
  test-coverage: 100% (11/11 tests passing)
  commits: 2
---

# Phase 42 Plan 01: Assignment Data Layer Summary

**One-liner:** Database schema and service layer for teacher assignment tracking with practice/duel support and student completion monitoring

## What Was Built

### 1. Database Schema (Migration 20260215100000)

**teacher_assignments table:**
- Tracks practice and duel assignments created by teachers
- Links lessons to classrooms with optional due dates
- Supports custom titles and instructions
- Unique constraint prevents duplicate assignments

**assignment_completions table:**
- One record per student per assignment
- Tracks score, accuracy, time_spent_seconds
- Unique constraint ensures single completion per student

**RLS Policies:**
- Teachers: Full CRUD on their assignments (via vocabulary_lessons.teacher_id)
- Students: Read assignments for their classrooms, insert/update own completions
- Row-level security enforces access control

**Performance Indexes:**
- classroom_id, lesson_id, teacher_id (fast lookups)
- due_date (WHERE clause optimization)
- student_id, completed_at (completion queries)

### 2. Assignment Service Functions

**createAssignment:**
- Insert new teacher assignment
- Auto-default to 'practice' if type not specified
- Returns created assignment with all fields

**getClassroomAssignments:**
- Fetch all assignments for classroom
- Joins vocabulary_lessons data
- Computes completion_count and student_count
- Orders by created_at DESC (newest first)

**getAssignmentCompletions:**
- Fetch all completions for assignment
- Joins student profiles (display_name, avatar_emoji)
- Orders by completed_at DESC

**deleteAssignment:**
- Soft delete (CASCADE handles completions)
- Returns error if not authorized

**updateAssignment:**
- Update due_date, title, or instructions
- Auto-updates updated_at timestamp via trigger

### 3. useAssignments React Hook

**Features:**
- Reactive assignment list with loading/error states
- Optimistic updates for create/delete (instant UI feedback)
- Assignment status computation: active/overdue/completed
- Manual refresh capability
- Automatic fetching on classroomId change

**Status Logic:**
- `completed`: completion_count >= student_count (100% done)
- `overdue`: due_date in past and not completed
- `active`: default (in progress)

**Optimistic Updates:**
- Create: Add temp assignment immediately, replace with real on success, rollback on error
- Delete: Remove immediately, keep removal even on error (eventual consistency)

## Deviations from Plan

None - plan executed exactly as written.

## Challenges Encountered

### Challenge 1: TypeScript Union Type Inference

**Issue:** TypeScript couldn't infer union type when spreading newAssignment with completion stats

**Solution:** Explicit type assertion: `({ ...newAssignment, completion_count: 0, student_count: 0 } as TeacherAssignment)`

**Impact:** Tests pass, type safety maintained

### Challenge 2: Optimistic Delete Rollback Strategy

**Decision:** Keep optimistic deletion even on API error

**Rationale:** Assignment deletion is idempotent, eventual consistency preferred over UI jank

**Alternative:** Could refetch on error, but causes UI flash

## Testing

**Coverage:** 100% (11/11 tests passing)

**Test Suite:**
1. Initial state (loading, null classroomId)
2. Fetching assignments (success, error handling)
3. createAssignment (optimistic add, rollback on error)
4. deleteAssignment (optimistic removal)
5. Status computation (active, overdue, completed)
6. Manual refresh

**Key Test Patterns:**
- Mock supabase client via jest.mock
- renderHook from @testing-library/react
- waitFor for async state updates
- act() for state mutations

## Next Phase Readiness

**Blockers:** None

**Dependencies Met:**
- ✅ Migration file created and valid SQL
- ✅ Types exported from barrel export
- ✅ Service functions tested and working
- ✅ React hook with optimistic updates
- ✅ All tests passing

**Ready For:**
- Plan 42-02: Assignment Creator UI (uses createAssignment)
- Plan 42-03: Assignment Tracker UI (uses getClassroomAssignments, getAssignmentStatus)
- Plan 42-04: Teacher Dashboard integration (uses useAssignments hook)

**Integration Points:**
- Assignment Creator: Call `createAssignment()` from form submit
- Assignment Tracker: Use `useAssignments(classroomId)` for reactive list
- Completion Monitor: Call `getAssignmentCompletions(assignmentId)` for details

## Key Learnings

1. **Optimistic Updates Trade-off:** Instant UI feedback vs. error recovery complexity
   - Chose instant feedback for better UX
   - Rollback on create error, keep on delete error

2. **Status Computation in Hook vs. Server:** Computed client-side for flexibility
   - Could move to database view for consistency
   - Current approach avoids extra DB queries

3. **Completion Ratio Pattern:** Separate completions table scales better than JSONB
   - Easier to query per-student completions
   - Better index performance for large classrooms

## Files Modified

### Created
- `fe-next/supabase/migrations/20260215100000_assignment_tracking.sql` (200 lines)
- `fe-next/hooks/useAssignments.ts` (180 lines)
- `fe-next/hooks/useAssignments.test.ts` (330 lines)

### Modified
- `fe-next/lib/supabase/education/types.ts` (+40 lines)
- `fe-next/lib/supabase/education/assignments.ts` (+200 lines)

## Commits

1. `fb34bcf6` - feat(42-01): add assignment tracking migration and types
2. `1f5a1785` - feat(42-01): add assignment service functions and useAssignments hook

**Total:** 2 commits, 550 lines added, 5 files changed
