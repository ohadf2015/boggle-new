---
phase: 38-async-duels
plan: 01
subsystem: database
tags: [typescript, supabase, tdd, types, crud, duels]
requires: [36-03]
provides: [duel-types, duel-crud, declined-status]
affects: [38-02, 38-03, 38-04]
tech-stack:
  added: []
  patterns: [server-side-supabase-client, tdd-red-green-refactor, mocked-supabase-tests]
key-files:
  created:
    - fe-next/lib/supabase/education/duels.ts
    - fe-next/lib/supabase/education/__tests__/duels.test.ts
    - fe-next/supabase/migrations/20260214000000_add_declined_status.sql
  modified: []
decisions:
  - id: 38-01-declined-status
    title: Separate declined status from cancelled
    rationale: Declined is opponent-initiated rejection, cancelled is challenger-initiated cancellation. Different semantics require different status values.
    impact: All duel status transitions must handle declined state
  - id: 38-01-server-side-client
    title: Use server-side Supabase client for CRUD operations
    rationale: Following practice.ts pattern - server-side operations avoid RLS complexity and provide consistent error handling
    impact: All duel CRUD operations use await createClient() from @/utils/supabase/server
  - id: 38-01-computed-iswin
    title: Compute isWin field in getDuelHistory
    rationale: Client-side computation avoids complex SQL and makes history entries immediately usable in UI
    impact: DuelHistoryEntry type includes isWin boolean computed from winner_id
metrics:
  duration: 259 seconds
  completed: 2026-02-13
---

# Phase 38 Plan 01: Duel Types and CRUD Operations Summary

**One-liner:** TypeScript types and Supabase CRUD operations for student_duels and duel_turns tables, with TDD and 'declined' status support

## What Was Built

Implemented the data foundation for async duels:

1. **Migration:** Added 'declined' status to student_duels table constraint
2. **Types:** 6 TypeScript interfaces (DuelRow, DuelTurnRow, CreateDuelData, DuelHistoryEntry, DuelStatsResult, DuelStatus/DuelType)
3. **CRUD Operations:** 8 functions for duel lifecycle management
4. **Tests:** 20 comprehensive test cases following TDD (RED-GREEN-REFACTOR)

All subsequent duel plans (38-02 through 38-06) depend on these types and operations.

## Key Exports

### Types

```typescript
export type DuelStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'expired' | 'declined';
export type DuelType = 'async' | 'realtime';
export interface DuelRow { ... }  // Matches student_duels table
export interface DuelTurnRow { ... }  // Matches duel_turns table
export interface CreateDuelData { challengerId, opponentId, classroomId, lessonId, boardState, expiresAt? }
export interface DuelHistoryEntry extends DuelRow { challenger, opponent, isWin }
export interface DuelStatsResult { wins, losses, draws, winStreak, currentStreak, opponentStats }
```

### Functions

```typescript
createDuel(data: CreateDuelData)  // Insert new duel (status='pending', expires_at default 24h)
getDuelById(duelId: string)  // Fetch with challenger/opponent profiles
updateDuelStatus(duelId: string, status: DuelStatus, updates?: Partial<DuelRow>)  // Status transitions + optional fields
getDuelHistory(studentId: string, limit?: number)  // Completed duels with isWin computed
getDuelStats(studentId: string)  // Win/loss/draw counts, streaks, per-opponent stats
submitDuelTurn(duelId: string, playerId: string, score: number, wordsFound: string[])  // Insert duel turn
getPendingDuelsForStudent(studentId: string)  // Duels where student is opponent and status='pending'
getActiveDuelsForStudent(studentId: string)  // Duels where student is participant and status='active'
```

## Technical Decisions

### 1. Declined Status Semantics

**Challenge:** Original schema didn't distinguish opponent rejection from challenger cancellation.

**Solution:** Added 'declined' status to student_duels CHECK constraint.

**Why:** Declined (opponent-initiated) has different UX/notification implications than cancelled (challenger-initiated). Duel:decline handler in Plan 38-02 needs this distinct status.

**Impact:** All duel status transitions must handle declined state in validation logic.

### 2. Server-Side Supabase Client Pattern

**Challenge:** Consistent pattern for database operations across education modules.

**Solution:** Followed practice.ts pattern - `import { createClient } from '@/utils/supabase/server'` in all CRUD functions.

**Why:**
- Avoids RLS complexity (functions run with service role permissions)
- Consistent error handling pattern
- Matches existing practice.ts implementation

**Impact:** All duel CRUD operations are server-side only (not client components).

### 3. Computed isWin Field in History

**Challenge:** Duel history needs to display "you won" vs "you lost" based on winner_id matching studentId.

**Solution:** getDuelHistory computes `isWin: duel.winner_id === studentId` for each entry.

**Why:**
- Avoids complex SQL CASE statements
- Makes DuelHistoryEntry immediately usable in UI components
- Client can render "Victory" or "Defeat" without additional logic

**Impact:** DuelHistoryEntry type includes isWin boolean field.

### 4. Win Streak Calculation Logic

**Challenge:** Need to compute both current streak (recent wins) and max streak (best run).

**Solution:** Process duels in chronological order, track tempStreak that resets on loss/draw.

**Why:**
- Current streak = tempStreak at end (most recent duels)
- Max streak = highest tempStreak value during iteration
- Handles draws correctly (reset streak but don't count as loss)

**Impact:** getDuelStats correctly computes streaks for leaderboards and achievements.

## Test Coverage

20 test cases covering:

- **createDuel:** Default values, custom expiresAt, error handling
- **getDuelById:** Profile joins, not found errors
- **updateDuelStatus:** Status only, status + fields, errors
- **getDuelHistory:** isWin computation, limit parameter, errors
- **getDuelStats:** Win/loss/draw counts, current streak, max streak, per-opponent stats, empty state
- **submitDuelTurn:** Insert turn, error handling
- **getPendingDuelsForStudent:** Opponent-only filter
- **getActiveDuelsForStudent:** Challenger or opponent filter

All tests use mocked Supabase client following practice.test.ts pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

### Created

1. **fe-next/supabase/migrations/20260214000000_add_declined_status.sql**
   - Drops existing student_duels_status_check constraint
   - Recreates with 'declined' added to valid statuses
   - Updates column comment to document declined semantics

2. **fe-next/lib/supabase/education/duels.ts** (464 lines)
   - 6 TypeScript types exported
   - 8 CRUD functions with server-side Supabase client
   - Error handling with logger integration
   - Business logic for streak calculation and history processing

3. **fe-next/lib/supabase/education/__tests__/duels.test.ts** (534 lines)
   - Jest mock for @/utils/supabase/server
   - 20 test cases organized by function
   - Mock Supabase client with chained query builder
   - Tests for happy paths, edge cases, and error conditions

## Next Phase Readiness

**Ready for:** Phase 38-02 (Duel WebSocket Handlers)

**Provides:**
- DuelRow, DuelTurnRow types for handler payloads
- createDuel, updateDuelStatus, getDuelById for handler logic
- 'declined' status for duel:decline handler

**Blocks:**
- Plan 38-02: Duel create/accept/decline/cancel handlers need these CRUD operations
- Plan 38-03: ClassroomGameLobby needs getPendingDuelsForStudent, getActiveDuelsForStudent
- Plan 38-04: DuelGame component needs getDuelById, submitDuelTurn
- Plan 38-05: XP calculation needs getDuelStats for achievements

**No blockers** - all dependencies satisfied.

## Lessons Learned

1. **TDD discipline pays off:** Writing tests first (RED) caught edge cases like missing opponent_id in getDuelStats logic.

2. **Mock patterns matter:** Using `mockSupabase.order.mockResolvedValue()` for query chains (not single()) required understanding Jest mock chaining.

3. **Streak logic is tricky:** Processing duels chronologically (reverse order from DB) required careful iteration to get current vs max streak correct.

4. **Type safety wins:** DuelHistoryEntry extending DuelRow with isWin field caught missing property errors at compile time.

## Performance Notes

- **Duration:** 259 seconds (4.3 minutes)
- **Test execution:** 20 tests in 322ms (all passing)
- **Lint:** No warnings/errors
- **Migration:** Simple ALTER TABLE (fast operation)

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| ce80fbf8 | chore | Add declined status to student_duels table |
| b00024eb | feat | Implement duel types and CRUD operations (464 lines + 534 test lines) |

## Tags

`#types` `#crud` `#tdd` `#supabase` `#duels` `#database` `#migration`
