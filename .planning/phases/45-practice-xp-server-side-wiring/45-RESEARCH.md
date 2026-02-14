# Phase 45: Practice XP Server-Side Wiring - Research

**Researched:** 2026-02-14
**Domain:** Next.js API Routes + Supabase RPC Functions + Education XP System
**Confidence:** HIGH

## Summary

Phase 45 wires the missing server-side XP award for practice sessions, closing the last integration gap from the v2.0 milestone audit. The practice API PATCH handler currently writes `xp_awarded` to the `practice_sessions` table but does NOT persist XP to `student_lesson_progress.total_xp` via the authoritative server-side function.

**Current state:** Practice sessions calculate XP client-side (via `educationXpManager.calculatePracticeXp()`) and write to `practice_sessions.xp_awarded`, but this value never updates the student's permanent XP total.

**Missing piece:** A Supabase RPC function `award_education_xp(p_student_id, p_xp_amount)` that increments `student_lesson_progress.total_xp` and triggers level recalculation.

**Primary recommendation:** Create the `award_education_xp` RPC function in a new migration, then import and call it from the practice API PATCH handler after session completion. Pattern already exists in duel handlers (realtime.ts, gameplay.ts, disconnection.ts).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js API Routes | 16.0.7 | REST endpoints | Built-in framework feature |
| Supabase Client | Latest | Database + RPC | Project-wide database layer |
| Zod | Latest | Request validation | Already used in practice route |
| PostgreSQL | Latest | Database + functions | Supabase backend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | Latest | RPC execution | Call database functions |
| ioredis | Latest | Caching | Optional (not needed here) |

### Installation
Already installed - no new dependencies needed.

## Architecture Patterns

### Recommended Project Structure
```
fe-next/
├── app/api/education/practice/
│   └── route.ts                     # PATCH handler (add RPC call)
├── backend/modules/
│   └── educationXpManager.ts        # Already has calculatePracticeXp()
├── supabase/migrations/
│   └── 068_award_education_xp.sql   # NEW: RPC function
└── lib/supabase/education/
    └── practice.ts                   # Already has completePracticeSession()
```

### Pattern 1: Supabase RPC Function for XP Award

**What:** PostgreSQL function that atomically updates student_lesson_progress.total_xp and triggers level recalculation

**When to use:** Any server-side XP award operation

**Example:**
```sql
-- Source: Similar pattern in duel handlers (realtime.ts:325)
CREATE OR REPLACE FUNCTION award_education_xp(
  p_student_id UUID,
  p_lesson_id UUID,
  p_xp_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert student_lesson_progress row
  INSERT INTO student_lesson_progress (
    student_id,
    lesson_id,
    total_xp,
    total_practice_sessions,
    last_practice_date
  )
  VALUES (
    p_student_id,
    p_lesson_id,
    p_xp_amount,
    1,
    CURRENT_DATE
  )
  ON CONFLICT (student_id, lesson_id) DO UPDATE
  SET
    total_xp = student_lesson_progress.total_xp + p_xp_amount,
    total_practice_sessions = student_lesson_progress.total_practice_sessions + 1,
    last_practice_date = CURRENT_DATE;

  -- Trigger update_student_level() runs automatically via BEFORE UPDATE trigger
END;
$$;

GRANT EXECUTE ON FUNCTION award_education_xp(UUID, UUID, INTEGER) TO authenticated;
```

**Key design decisions:**
- SECURITY DEFINER allows function to bypass RLS (students can update their own XP)
- UPSERT handles first-time students and existing progress rows
- Trigger automatically recalculates `current_level` from `total_xp` (migration 062)
- Also updates streak tracking fields (last_practice_date for streak calculation)

### Pattern 2: API Route RPC Call

**What:** Call Supabase RPC function after updating practice_sessions table

**When to use:** PATCH handler for session completion

**Example:**
```typescript
// Source: backend/handlers/duel/realtime.ts:325
import { createClient } from '@/utils/supabase/server';

// In PATCH handler, after practice_sessions update:
const { data: session, error } = await supabase
  .from('practice_sessions')
  .update({
    // ... existing fields
    xp_awarded: updateData.xpAwarded,
    completed_at: new Date().toISOString(),
  })
  .eq('id', sessionId)
  .select()
  .single();

if (error) {
  return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
}

// NEW: Award XP to student_lesson_progress
if (session.completed_at && updateData.xpAwarded) {
  const { error: xpError } = await supabase.rpc('award_education_xp', {
    p_student_id: session.student_id,
    p_lesson_id: session.lesson_id,
    p_xp_amount: updateData.xpAwarded,
  });

  if (xpError) {
    logger.error('Failed to award education XP:', xpError);
    // Don't fail the request - session already saved
  }
}

return NextResponse.json({ session });
```

**Key design decisions:**
- RPC call happens AFTER practice_sessions update (session saved even if XP fails)
- Only call when session is completed (`completed_at` set)
- Only call when XP amount is provided (`xpAwarded > 0`)
- Log XP errors but don't fail the request (graceful degradation)
- Use snake_case for RPC parameters (PostgreSQL convention)

### Pattern 3: Idempotency Guard

**What:** Prevent double-awarding XP if PATCH called multiple times

**When to use:** Session completion endpoints

**Example:**
```typescript
// Check if session already completed
const { data: existing } = await supabase
  .from('practice_sessions')
  .select('completed_at, xp_awarded')
  .eq('id', sessionId)
  .single();

if (existing?.completed_at) {
  // Already completed - return existing session without awarding XP again
  return NextResponse.json({ session: existing });
}

// Proceed with completion + XP award...
```

### Anti-Patterns to Avoid

- **Client-side XP only:** XP calculated but not persisted server-side (current bug)
- **Direct table updates:** Updating student_lesson_progress.total_xp without trigger (breaks level calculation)
- **Missing error handling:** RPC failure breaks entire request (should degrade gracefully)
- **No idempotency:** Double-awarding XP on retry (guard with completed_at check)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XP calculation | New XP formula | educationXpManager.calculatePracticeXp() | Already implemented with mastery bonuses |
| Level calculation | Manual level formula | Trigger update_student_level() | Already exists in migration 062 |
| Session tracking | Custom session logic | practice_sessions table | Already exists with all fields |
| RPC execution | Raw SQL | supabase.rpc() | Type-safe, handles auth |

**Key insight:** All infrastructure already exists. This phase is pure wiring, not new logic.

## Common Pitfalls

### Pitfall 1: Case Mismatch in RPC Parameters

**What goes wrong:** PostgreSQL RPC functions expect snake_case parameters, but TypeScript uses camelCase

**Why it happens:** JavaScript/TypeScript conventions vs database conventions

**How to avoid:**
```typescript
// WRONG: camelCase
await supabase.rpc('award_education_xp', {
  studentId: user.id,  // Won't match p_student_id parameter
  xpAmount: 100,
});

// CORRECT: snake_case
await supabase.rpc('award_education_xp', {
  p_student_id: user.id,
  p_lesson_id: lessonId,
  p_xp_amount: 100,
});
```

**Warning signs:** RPC call returns "function does not exist" error despite function being created

### Pitfall 2: Missing Lesson ID Context

**What goes wrong:** Practice sessions table has lesson_id, but it might not be selected in the PATCH handler query

**Why it happens:** API route currently only selects minimal fields

**How to avoid:**
```typescript
// Ensure lesson_id is selected when fetching session
const { data: session } = await supabase
  .from('practice_sessions')
  .select('*')  // Or explicitly list: id, student_id, lesson_id, ...
  .eq('id', sessionId)
  .single();

// Then use in RPC call
await supabase.rpc('award_education_xp', {
  p_student_id: session.student_id,
  p_lesson_id: session.lesson_id,  // Available from select
  p_xp_amount: updateData.xpAwarded,
});
```

**Warning signs:** TypeScript error "Property 'lesson_id' does not exist on type ..." or runtime null reference

### Pitfall 3: RPC Failure Breaking Session Save

**What goes wrong:** If RPC call fails, entire request returns 500 and session update is lost

**Why it happens:** Not handling RPC errors gracefully

**How to avoid:**
```typescript
// WRONG: Throws on RPC error
await supabase.rpc('award_education_xp', { ... });

// CORRECT: Graceful degradation
const { error: xpError } = await supabase.rpc('award_education_xp', { ... });
if (xpError) {
  logger.error('Failed to award XP (session saved):', xpError);
  // Continue - session already saved, XP can be backfilled
}
```

**Warning signs:** Practice sessions show completed_at but student XP never increases

### Pitfall 4: Double-Awarding XP on Retry

**What goes wrong:** Client retries PATCH request, XP awarded twice

**Why it happens:** No idempotency check for already-completed sessions

**How to avoid:**
```typescript
// Check if already completed before awarding XP
const { data: existing } = await supabase
  .from('practice_sessions')
  .select('completed_at')
  .eq('id', sessionId)
  .single();

if (existing?.completed_at) {
  // Already completed - skip XP award
  return NextResponse.json({ session: existing });
}

// Proceed with completion...
```

**Warning signs:** Student XP jumps by 2x expected amount, duplicate practice_sessions entries

## Code Examples

Verified patterns from official sources:

### RPC Function Creation (SQL)

```sql
-- Source: Pattern from duel handlers (realtime.ts, gameplay.ts)
-- File: fe-next/supabase/migrations/068_award_education_xp.sql

-- ============================================
-- AWARD EDUCATION XP FUNCTION
-- ============================================
-- Atomically awards XP to student_lesson_progress and updates streak/level
-- Used by: Practice API (route.ts), future duel integration

CREATE OR REPLACE FUNCTION award_education_xp(
  p_student_id UUID,
  p_lesson_id UUID,
  p_xp_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert student_lesson_progress
  INSERT INTO student_lesson_progress (
    student_id,
    lesson_id,
    total_xp,
    total_practice_sessions,
    last_practice_date
  )
  VALUES (
    p_student_id,
    p_lesson_id,
    p_xp_amount,
    1,
    CURRENT_DATE
  )
  ON CONFLICT (student_id, lesson_id) DO UPDATE
  SET
    total_xp = student_lesson_progress.total_xp + p_xp_amount,
    total_practice_sessions = student_lesson_progress.total_practice_sessions + 1,
    last_practice_date = CURRENT_DATE;

  -- update_student_level() trigger runs automatically on total_xp update
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION award_education_xp(UUID, UUID, INTEGER) TO authenticated;

-- Documentation
COMMENT ON FUNCTION award_education_xp IS 'Awards XP to student for a lesson, updates streak and triggers level recalculation';
```

### API Route Integration (TypeScript)

```typescript
// Source: app/api/education/practice/route.ts PATCH handler (lines 259-329)
// Additions marked with // NEW

import { createClient } from '@/utils/supabase/server';
import logger from '@/utils/logger';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  // ... auth check, validation, ownership check (existing code)

  const { sessionId, completed, ...updateData } = parseResult.data;

  // Build update object
  const updateObj: Record<string, unknown> = {};
  if (updateData.xpAwarded !== undefined) updateObj.xp_awarded = updateData.xpAwarded;
  if (updateData.wordsAttempted !== undefined) updateObj.words_attempted = updateData.wordsAttempted;
  if (updateData.wordsCorrect !== undefined) updateObj.words_correct = updateData.wordsCorrect;
  if (updateData.accuracy !== undefined) updateObj.accuracy = updateData.accuracy;
  if (completed) updateObj.completed_at = new Date().toISOString();

  // Update practice_sessions table
  const { data: session, error } = await supabase
    .from('practice_sessions')
    .update(updateObj)
    .eq('id', sessionId)
    .select('*')  // NEW: Select all fields (need lesson_id for XP award)
    .single();

  if (error) {
    logger.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }

  // NEW: Award XP to student_lesson_progress
  if (session.completed_at && session.xp_awarded && session.xp_awarded > 0) {
    const { error: xpError } = await supabase.rpc('award_education_xp', {
      p_student_id: session.student_id,
      p_lesson_id: session.lesson_id,
      p_xp_amount: session.xp_awarded,
    });

    if (xpError) {
      logger.error('Failed to award education XP:', xpError);
      // Don't fail request - session saved, XP can be backfilled
    } else {
      logger.info(
        'EDUCATION',
        `Awarded ${session.xp_awarded} XP to student ${session.student_id} for lesson ${session.lesson_id}`
      );
    }
  }

  return NextResponse.json({ session });
}
```

### Test Pattern (Jest)

```typescript
// Source: backend/handlers/duel/__tests__/realtime.test.ts:522
// Pattern: Mock supabase.rpc and verify call

import { createClient } from '@/utils/supabase/server';

jest.mock('@/utils/supabase/server');

describe('PATCH /api/education/practice', () => {
  it('should award XP when session is completed', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'student-123' } } }) },
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'session-456',
                  student_id: 'student-123',
                  lesson_id: 'lesson-789',
                  xp_awarded: 120,
                  completed_at: '2026-02-14T12:00:00Z',
                },
                error: null,
              }),
            })),
          })),
        })),
      })),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const response = await PATCH(new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({
        sessionId: 'session-456',
        xpAwarded: 120,
        completed: true,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('award_education_xp', {
      p_student_id: 'student-123',
      p_lesson_id: 'lesson-789',
      p_xp_amount: 120,
    });
  });

  it('should not award XP if session not completed', async () => {
    // ... setup mocks with completed_at: null

    const response = await PATCH(/* ... */);

    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side XP only | Server-side XP via RPC | Phase 38 (duels) | Duels have authoritative XP |
| Direct table updates | Trigger-based level calc | Migration 062 | Automatic level updates |
| Manual streak tracking | Function-based streak | Migration 062 | Consistent streak logic |

**Deprecated/outdated:**
- Calculating XP client-side without server persistence (Phase 37 implementation) — needs Phase 45 wiring
- Using separate XP and level update queries — use trigger automatically

## Open Questions

1. **Should we backfill XP for existing completed practice sessions?**
   - What we know: practice_sessions table has xp_awarded for completed sessions, but student_lesson_progress.total_xp was never updated
   - What's unclear: Whether to run one-time migration to backfill or start fresh
   - Recommendation: Start fresh (Phase 45 is forward-looking), document as known limitation

2. **Should the RPC function also update streak logic?**
   - What we know: student_lesson_progress has current_streak, longest_streak, last_practice_date columns
   - What's unclear: Whether award_education_xp should calculate streaks or leave to separate function
   - Recommendation: Include basic streak update (last_practice_date) in award_education_xp for simplicity, but don't implement full streak calculation (can be separate Phase 46+ enhancement)

3. **Should we add integration tests for the E2E flow?**
   - What we know: E2E Flow #5 currently broken at XP award step
   - What's unclear: Whether to add API integration test or just unit test the RPC call
   - Recommendation: Add API integration test to verify full flow (session update → XP award → level recalculation)

## Sources

### Primary (HIGH confidence)
- educationXpManager.ts (lines 1-445) — XP calculation logic, practice mode configs
- app/api/education/practice/route.ts (lines 259-329) — PATCH handler implementation
- backend/handlers/duel/realtime.ts (lines 314-365) — Existing RPC call pattern
- supabase/migrations/062_education_xp_tracking.sql — student_lesson_progress schema, trigger
- supabase/migrations/056_teacher_vocabulary_builder.sql (lines 122-142) — student_lesson_progress table

### Secondary (MEDIUM confidence)
- .planning/v2.0-MILESTONE-AUDIT.md (lines 170-177) — Gap description, fix recommendation
- .planning/phases/37-practice-modes/37-VERIFICATION.md — Practice modes implementation status

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Next.js API routes + Supabase patterns already in use
- Architecture: HIGH - RPC pattern verified in duel handlers (realtime.ts, gameplay.ts)
- Pitfalls: HIGH - Common issues documented from duel implementation

**Research date:** 2026-02-14
**Valid until:** 60 days (stable backend patterns, no fast-moving dependencies)
