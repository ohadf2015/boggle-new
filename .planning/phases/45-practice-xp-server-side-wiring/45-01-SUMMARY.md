---
phase: 45-practice-xp-server-side-wiring
plan: 01
subsystem: education-practice-xp
tags: [rpc, xp-award, idempotency, practice-sessions]
status: complete
completed: 2026-02-14

dependency-graph:
  requires:
    - "062_education_xp_tracking.sql (student_lesson_progress table + update_student_level trigger)"
    - "practice_sessions table (from 056_teacher_vocabulary_builder)"
  provides:
    - "award_education_xp RPC function (atomic XP award)"
    - "Practice PATCH handler XP wiring (E2E Flow #5 complete)"
  affects:
    - "student_lesson_progress.total_xp (now updated on practice completion)"
    - "student_lesson_progress.current_level (auto-recalculated via trigger)"

tech-stack:
  added:
    - "PostgreSQL RPC function (award_education_xp)"
  patterns:
    - "Idempotency guard (completed_at check prevents double-awarding)"
    - "Graceful degradation (RPC failure doesn't break session save)"
    - "Snake_case params for RPC (PostgreSQL convention)"
    - "Backward-compatible function signature (p_lesson_id defaults to NULL for duel handlers)"

key-files:
  created:
    - "fe-next/supabase/migrations/20260215200000_award_education_xp.sql"
    - "fe-next/backend/__tests__/api/education/practice/route.test.ts"
  modified:
    - "fe-next/app/api/education/practice/route.ts"

decisions:
  - "RPC signature: award_education_xp(p_student_id UUID, p_xp_amount INTEGER, p_lesson_id UUID DEFAULT NULL) for backward compatibility with existing duel handler calls"
  - "Idempotency guard checks completed_at in ownership query to prevent double-awarding on retry"
  - "RPC errors logged but do not fail request (graceful degradation - session saved, XP can be backfilled)"
  - "Test file placed in backend/__tests__/api/ (Node environment, no browser globals) instead of app/api/__tests__/ (frontend config)"

metrics:
  duration: 575s (9 min 35 sec)
  tasks: 2
  commits: 2
  files-changed: 3
  tests-added: 4
---

# Phase 45 Plan 01: Practice XP Server-Side Wiring Summary

**Server-side XP award for practice sessions via Supabase RPC, completing E2E Flow #5 (Practice Session: Select → Play → Track → XP Award)**

## One-Liner

Created `award_education_xp` RPC function with backward-compatible signature (p_lesson_id defaults to NULL) and wired into practice PATCH handler with idempotency guard and graceful RPC failure handling.

## What Was Built

### Migration: award_education_xp RPC Function
- **File:** `fe-next/supabase/migrations/20260215200000_award_education_xp.sql`
- **Signature:** `award_education_xp(p_student_id UUID, p_xp_amount INTEGER, p_lesson_id UUID DEFAULT NULL)`
- **CRITICAL Design:** `p_lesson_id` defaults to NULL for backward compatibility with existing duel handler calls (realtime.ts:325, gameplay.ts:293, disconnection.ts:282) which pass only `p_student_id` + `p_xp_amount`
- **When p_lesson_id IS NOT NULL:** UPSERT into `student_lesson_progress` (student_id, lesson_id, total_xp, total_practice_sessions, last_practice_date) with ON CONFLICT DO UPDATE
- **When p_lesson_id IS NULL:** Skip student_lesson_progress update (duel XP tracked separately)
- **Trigger:** `update_student_level()` (from migration 062) fires automatically on `total_xp` UPDATE to recalculate `current_level`
- **Security:** SECURITY DEFINER allows students to update their own XP via RLS bypass

### Practice PATCH Handler XP Wiring
- **File:** `fe-next/app/api/education/practice/route.ts`
- **Idempotency Guard:** Ownership check now selects `completed_at` along with `id, student_id`. If `completed_at` is truthy, return existing session early (200) to prevent double-awarding on retry.
- **Session Update:** Changed `.select()` to `.select('*')` to ensure `lesson_id` is available in returned session object
- **XP Award Block:** After successful session update:
  - **Guard:** Only if `completed` is true (from request body) AND `session.xp_awarded > 0`
  - **RPC Call:** `supabase.rpc('award_education_xp', { p_student_id, p_xp_amount, p_lesson_id })` with snake_case params
  - **Error Handling:** Log RPC errors with `logger.error()` but do NOT fail the request (session already saved)
  - **Success Logging:** `logger.info('EDUCATION', 'Awarded ${xp} XP...')`

### Tests
- **File:** `fe-next/backend/__tests__/api/education/practice/route.test.ts`
- **Test Environment:** Node (not jsdom) to support Next.js Request/Response APIs
- **Test Cases (4):**
  1. **XP award on completion:** Verifies `award_education_xp` RPC called with correct snake_case params when session completed with xpAwarded > 0
  2. **No XP when not completed:** Verifies RPC NOT called when `completed` flag is false or missing
  3. **Idempotency guard:** Verifies early return with existing session when `completed_at` already set (no double-awarding)
  4. **Graceful RPC failure:** Verifies request still returns 200 with session data even when RPC fails (session saved despite XP error)

## Implementation Notes

### Key Pitfalls Avoided
1. **Case mismatch in RPC params:** Used snake_case (`p_student_id`, `p_lesson_id`, `p_xp_amount`) for PostgreSQL convention
2. **Missing lesson_id:** Changed session update query from `.select()` to `.select('*')` to include `lesson_id` in response
3. **RPC failure breaking session save:** Used `const { error: xpError } = await ...` pattern and logged error without throwing
4. **Double-awarding on retry:** Added idempotency guard checking `completed_at` before processing

### Deviations from Plan
None - plan executed exactly as written.

## Testing

### Test Execution
```bash
cd fe-next/backend
npx jest __tests__/api/education/practice/route.test.ts --no-coverage
```

**Result:** ✅ 4/4 tests passed

### Verification Commands
```bash
# Lint check
npx eslint backend/__tests__/api/education/practice/route.test.ts
# ✅ No errors

# Build check
npm run build
# ✅ TypeScript compilation passed
```

## Commits

| Task | Commit | Message | Files |
|------|--------|---------|-------|
| 1 | 8cfbd2c1 | feat(45-01): create award_education_xp RPC + wire practice PATCH handler | migration, route.ts |
| 2 | 3d7b9708 | test(45-01): add tests for practice PATCH handler XP wiring | route.test.ts |

## Self-Check

Verifying created files and commits:

**Files:**
```bash
ls -la fe-next/supabase/migrations/20260215200000_award_education_xp.sql
# ✅ FOUND

ls -la fe-next/backend/__tests__/api/education/practice/route.test.ts
# ✅ FOUND
```

**Commits:**
```bash
git log --oneline --all | grep -E "(8cfbd2c1|3d7b9708)"
# ✅ FOUND: 8cfbd2c1 feat(45-01): create award_education_xp RPC + wire practice PATCH handler
# ✅ FOUND: 3d7b9708 test(45-01): add tests for practice PATCH handler XP wiring
```

## Self-Check: PASSED

All files exist and all commits are present in git history.

## Impact

### Before This Plan
- Practice sessions calculated XP client-side and wrote to `practice_sessions.xp_awarded`
- XP value never persisted to `student_lesson_progress.total_xp`
- Student levels never increased from practice sessions
- **E2E Flow #5 broken at XP award step**

### After This Plan
- Practice session completion triggers server-side XP award via `award_education_xp` RPC
- XP persists to `student_lesson_progress.total_xp` via atomic UPSERT
- Trigger automatically recalculates `student_lesson_progress.current_level`
- Idempotency guard prevents double-awarding on retry
- Graceful degradation ensures session saves even if XP fails
- **E2E Flow #5 complete:** Select lesson → Play practice session → Track progress → Award XP → Level up

## Next Steps

1. **Apply migration:** Run `npm run db:migrate` or apply via Supabase dashboard (requires service key)
2. **Verify E2E flow:** Complete a practice session in development and verify:
   - `practice_sessions.xp_awarded` is set
   - `student_lesson_progress.total_xp` increases
   - `student_lesson_progress.current_level` recalculates
3. **Optional backfill:** If needed, write one-time script to backfill XP for existing completed practice sessions

## Dependencies

**Requires:**
- Migration 062 (`education_xp_tracking.sql`) — student_lesson_progress table + update_student_level trigger
- Migration 056 (`teacher_vocabulary_builder.sql`) — practice_sessions table

**Provides:**
- `award_education_xp` RPC function
- Server-side XP award for practice sessions

**Affects:**
- No breaking changes to existing duel handlers (backward-compatible signature with `p_lesson_id DEFAULT NULL`)
