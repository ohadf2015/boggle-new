# Phase 36: Foundation & Refactoring - Research

**Researched:** 2026-02-13
**Domain:** TypeScript module refactoring, Supabase schema design, Socket.IO namespaces, XP economy balancing
**Confidence:** HIGH

## Summary

This phase establishes foundational architecture for Education 2.0 by addressing technical debt (splitting oversized files), extending database schema for new features (duels, practice), architecting Socket.IO namespace separation, and rebalancing the XP economy to prevent inflation.

**Key findings:**
1. **File splitting**: `lib/supabase/teacher.ts` (1260 lines) has clear functional boundaries: classrooms, lessons, progress, assignments, curriculum — can split into 6 modules under `lib/supabase/education/` with barrel export pattern
2. **Database tables**: Supabase migrations already established pattern (062, 063) with RLS policies, indexes, triggers — extend with 4 new tables for duels/practice
3. **Socket.IO namespaces**: Current architecture uses default namespace (`/`) for all real-time features — can extend with `/duel` namespace using same handler registration pattern but isolated room state
4. **XP economy**: Existing system has two separate configurations (global XP in `xpManager.ts`, education XP in `educationXpManager.ts`) — need unified spreadsheet model to prevent inflation from new sources

**Primary recommendation:** Follow existing codebase patterns aggressively — refactor uses barrel exports, migrations use numbered naming with RLS, Socket.IO uses handler registration pattern, XP uses separate config objects per domain.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type-safe refactoring | Existing codebase standard |
| Supabase Client | Latest | Database operations with RLS | Current DB client |
| Socket.IO | 4.8.1 | Real-time communication | Existing WebSocket server |
| Jest | Latest | Testing refactored modules | Current test framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Latest | Schema validation | Socket.IO handler data validation (existing pattern) |
| ioredis | Latest | Distributed state | If duel namespace needs cross-instance state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Barrel exports | Direct imports | Barrel exports maintain backward compatibility during migration |
| RLS policies | Application-level auth | RLS provides defense-in-depth, matches existing tables |
| Socket.IO namespaces | Separate servers | Namespaces multiplex over single connection, existing infrastructure |

**Installation:**
```bash
# No new dependencies needed - using existing stack
npm install  # All dependencies already present
```

## Architecture Patterns

### Recommended Project Structure (File Splitting)

**Current state:**
```
lib/supabase/
├── teacher.ts (1260 lines - PROBLEM)
├── analytics.ts
└── diagnostics.ts
```

**Target state:**
```
lib/supabase/
├── education/
│   ├── index.ts              # Barrel export (re-export all)
│   ├── classrooms.ts         # getClassrooms, createClassroom, updateClassroom, deleteClassroom
│   ├── lessons.ts            # getLessons, createLesson, updateLesson, deleteLesson
│   ├── progress.ts           # getStudentProgress, getClassProgress, updateProgress
│   ├── assignments.ts        # assignLesson, getStudentAssignedLessons
│   ├── duels.ts              # [NEW] Duel-related functions (foundation for Phase 38/39)
│   ├── practice.ts           # [NEW] Practice session functions (foundation for Phase 37)
│   ├── curriculum.ts         # getCurriculumWordLists, getCurriculumWordList, importCurriculumToLesson
│   └── types.ts              # Shared types (Classroom, VocabularyLesson, etc.)
├── analytics.ts
└── diagnostics.ts
```

**Import migration strategy:**
```typescript
// OLD (before refactor):
import { getClassrooms, createLesson } from '@/lib/supabase/teacher';

// NEW (after refactor):
import { getClassrooms, createLesson } from '@/lib/supabase/education';

// Components import from barrel export - single line change per file
```

### Pattern 1: Barrel Export Pattern (Backward Compatibility)

**What:** Central index.ts re-exports all functions from sub-modules
**When to use:** Splitting large files while minimizing import changes
**Example:**
```typescript
// lib/supabase/education/index.ts
export * from './classrooms';
export * from './lessons';
export * from './progress';
export * from './assignments';
export * from './duels';
export * from './practice';
export * from './curriculum';
export * from './types';

// Consumers import from barrel:
import { getClassrooms, createLesson, updateProgress } from '@/lib/supabase/education';
```
**Source:** [TypeScript module splitting best practices](https://www.webdevtutor.net/blog/typescript-split-module-into-multiple-files)

### Pattern 2: Supabase Migration with RLS

**What:** Numbered migrations with RLS policies, indexes, and documentation comments
**When to use:** Adding new tables to Supabase schema
**Example:**
```sql
-- Migration: 064_student_duels.sql
-- Description: Tables for async and real-time student duels
-- Dependencies: 056_teacher_vocabulary_builder.sql (classrooms, lessons)

-- ============================================
-- STUDENT DUELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    duel_type VARCHAR(20) NOT NULL CHECK (duel_type IN ('async', 'realtime')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    board_state JSONB NOT NULL,
    challenger_score INTEGER,
    opponent_score INTEGER,
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE student_duels ENABLE ROW LEVEL SECURITY;

-- Students can read duels they're involved in
CREATE POLICY "student_duels_read_own"
    ON student_duels FOR SELECT
    TO authenticated
    USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

-- Students can read duels of classmates (for lobby)
CREATE POLICY "student_duels_read_classmates"
    ON student_duels FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm1
            JOIN classroom_memberships cm2 ON cm1.classroom_id = cm2.classroom_id
            WHERE cm1.student_id = auth.uid()
            AND cm2.student_id IN (student_duels.challenger_id, student_duels.opponent_id)
        )
    );

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_student_duels_challenger
    ON student_duels(challenger_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_duels_opponent
    ON student_duels(opponent_id, status, created_at DESC);
```
**Source:** Existing migrations 062_education_xp_tracking.sql, 063_education_achievements.sql

### Pattern 3: Socket.IO Namespace Separation

**What:** Create separate namespaces for feature domains with independent middleware
**When to use:** Isolating authorization levels or preventing room state pollution
**Example:**
```typescript
// server/socketSetup.ts
import { Server as SocketIOServer } from 'socket.io';
import { registerAllHandlers } from '../backend/handlers';
import { registerDuelHandlers } from '../backend/handlers/duel';

export function createSocketServer(httpServer, corsOrigin) {
  const io = new SocketIOServer(httpServer, { cors: { origin: corsOrigin } });

  // Default namespace (/) - existing game handlers
  io.on('connection', (socket) => {
    registerAllHandlers(io, socket);
  });

  // Duel namespace (/duel) - isolated duel handlers
  const duelNamespace = io.of('/duel');
  duelNamespace.use((socket, next) => {
    // Duel-specific middleware (auth, classroom validation)
    next();
  });
  duelNamespace.on('connection', (socket) => {
    registerDuelHandlers(duelNamespace, socket);
  });

  return io;
}
```
**Source:** [Socket.IO Namespaces documentation](https://socket.io/docs/v4/namespaces/)

### Anti-Patterns to Avoid

- **Don't separate types prematurely:** Keep types in same file as implementation for small, internal modules. Only split types.ts for shared domain models ([source](https://greenonsoftware.com/articles/thoughts/concerns-about-separating-types-from-implementation/))
- **Don't use dynamic namespaces without validation:** Static namespaces have routing priority, avoid regex patterns unless multi-tenant architecture requires it
- **Don't duplicate XP configs:** Consolidate XP sources in single spreadsheet model to spot inflation before implementation
- **Don't skip RLS policies:** Always enable RLS on new tables — defense-in-depth matches existing security posture

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Socket.IO room management | Custom room state manager | Built-in `socket.join(room)`, `socket.to(room).emit()` | Handles disconnection cleanup, memory leaks |
| XP level calculation | Linear progression | Existing `getLevelFromXp()` with segmented curve | Already tuned for retention (1.4 exp early, 1.55 exp late) |
| RLS policy testing | Manual SQL injection tests | Supabase `get_advisors` tool | Detects missing RLS policies automatically |
| Module re-export coordination | Manual exports list | TypeScript `export * from './module'` | Auto-updates when modules add exports |

**Key insight:** This codebase has 35 shipped phases of patterns — follow existing conventions over "better" alternatives. Consistency > perfection.

## Common Pitfalls

### Pitfall 1: Import Path Updates Miss Edge Cases

**What goes wrong:** Refactoring updates obvious imports but misses dynamic imports, type-only imports, or test mocks
**Why it happens:** Search-and-replace focuses on main imports, overlooks type imports and test files
**How to avoid:**
1. Search for ALL import variations: `import.*teacher`, `from.*teacher`, `type.*teacher`
2. Check test files: `__tests__/**/*.test.ts`, `**/*.test.tsx`
3. Run TypeScript compiler: `npm run build` catches missing imports
4. Run all tests: `npm run test` catches runtime import errors

**Warning signs:**
- Build passes but tests fail with "Cannot find module"
- Type errors in files not directly importing refactored module

### Pitfall 2: Namespace Room Collisions

**What goes wrong:** Two namespaces use same room names, causing message leakage
**Why it happens:** Default namespace (`/`) and custom namespaces (`/duel`) share global room registry
**How to avoid:**
1. Use namespace prefixes for room names: `duel:${duelId}` vs `classroom:${classroomId}`
2. Document room naming conventions in namespace handler comments
3. Never use `io.emit()` (broadcasts to ALL namespaces) — use `namespace.emit()` or `socket.to(room).emit()`

**Warning signs:**
- Client receives events from wrong feature
- Room member counts don't match expected participants

### Pitfall 3: XP Inflation from Overlapping Rewards

**What goes wrong:** New activities (duels, practice) award XP for actions already rewarded (finding words, lesson completion)
**Why it happens:** XP configs live in separate files without unified view of total earn rate
**How to avoid:**
1. Create spreadsheet model of ALL XP sources (existing + new)
2. Calculate XP/hour for typical student behavior across all modes
3. Target consistency: Practice should earn similar XP/hour to flashcards
4. Cap total XP/day if needed (prevent grinding exploits)

**Warning signs:**
- New mode earns 2x+ XP rate of existing modes
- Students level up faster in v2.0 than v1.0 for same playtime

### Pitfall 4: RLS Policy Gaps in Multi-Table Joins

**What goes wrong:** `student_duels` RLS checks challenger_id, but `duel_turns` doesn't check duel ownership
**Why it happens:** Each table RLS policy evaluated independently — doesn't inherit parent table checks
**How to avoid:**
1. Every child table (duel_turns) must join to parent (student_duels) in RLS policy
2. Use `EXISTS (SELECT 1 FROM parent WHERE ...)` pattern consistently
3. Run `mcp__supabase__get_advisors` after migration to detect policy gaps

**Warning signs:**
- Supabase advisor tool reports "table without RLS policy"
- Students can query duel_turns directly without duel ownership check

## Code Examples

Verified patterns from official sources:

### Example 1: Function Extraction with Type Preservation

```typescript
// lib/supabase/education/classrooms.ts
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { Classroom, ClassroomWithMembers } from './types';

/**
 * Get all classrooms for a teacher
 * Extracted from teacher.ts (lines 112-165)
 */
export async function getClassrooms(
  teacherId: string
): Promise<{ data: ClassroomWithMembers[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // Get classrooms with member count
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (classroomsError) {
      logger.error('Error fetching classrooms:', classroomsError);
      return { data: [], error: { message: classroomsError.message } };
    }

    // ... rest of implementation (unchanged)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassrooms:', error);
    return { data: [], error: { message: error } };
  }
}
```

### Example 2: Test Migration for Split Module

```typescript
// lib/supabase/__tests__/classrooms.test.ts (NEW)
import { getClassrooms } from '../education/classrooms';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('getClassrooms', () => {
  it('should fetch classrooms for teacher', async () => {
    // GIVEN
    const mockData = [{ id: '1', name: 'Class A', member_count: 5 }];
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });
    (supabase.from as jest.Mock) = mockFrom;

    // WHEN
    const result = await getClassrooms('teacher-123');

    // THEN
    expect(result.data).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('classrooms');
  });
});
```
**Source:** Existing test pattern from `lib/supabase/__tests__/joinClassroom.test.ts`

### Example 3: Socket.IO Handler Registration for New Namespace

```typescript
// backend/handlers/duel/index.ts (NEW)
import type { Namespace, Socket } from 'socket.io';

/**
 * Register all duel-specific event handlers
 * Pattern matches existing registerAllHandlers in handlers/index.ts
 */
export function registerDuelHandlers(namespace: Namespace, socket: Socket): void {
  // Duel lifecycle events
  socket.on('duel:create', (data) => {
    // Handler implementation
  });

  socket.on('duel:accept', (data) => {
    // Handler implementation
  });

  socket.on('duel:submit-score', (data) => {
    // Handler implementation
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    // Leave duel rooms
  });
}
```
**Source:** Existing pattern from `backend/handlers/index.ts` (registerAllHandlers)

### Example 4: XP Economy Spreadsheet Model (Conceptual)

```
Activity                    | XP/Session | Sessions/Day | Total XP/Day | Notes
----------------------------|------------|--------------|--------------|------------------
Flashcards (20 cards, 90%)  | 250        | 2            | 500          | Existing (educationXpManager.ts)
Solo Board (10 vocab)       | 215        | 2            | 430          | Existing (educationXpManager.ts)
Lesson Completion           | 300        | 0.5          | 150          | Existing (educationXpManager.ts)
Async Duel (win)            | ???        | 1            | ???          | NEW - need to set
Real-time Duel (win)        | ???        | 1            | ???          | NEW - need to set
Word Matching Practice      | ???        | 1            | ???          | NEW (Phase 37)
Spelling Challenge          | ???        | 1            | ???          | NEW (Phase 37)
Timed Blitz                 | ???        | 1            | ???          | NEW (Phase 37)
Daily Challenge Completion  | ???        | 1            | ???          | NEW (Phase 40)
----------------------------|------------|--------------|--------------|------------------
Target Total XP/Day:        |            |              | ~1200-1500   | Level up every 3-4 days (early levels)
```

**Balancing constraints:**
- Async duel should reward similar XP to flashcards (competitive practice = flashcard practice)
- Real-time duel slightly higher (synchronous time commitment)
- Practice modes match flashcard XP rate (avoid mode favoritism)
- Daily challenges add +20% max to prevent grind requirement

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct table SELECT in RLS | RPC function lookup | Migration 056 | Prevents classroom enumeration attacks |
| Single XP config | Separate configs per domain | Phase 18 (062) | Education XP independent from global XP |
| Monolithic handler file | Handler registry pattern | Pre-v1.0 refactor | Modular handler registration |
| Manual level calculation | Segmented curve (1.4-1.55 exp) | Phase 26 | Improved mid-game retention |

**Deprecated/outdated:**
- `lib/supabase/teacher.ts` as single source: Split into `lib/supabase/education/` modules (this phase)
- Default namespace only: Extend with `/duel` namespace for feature isolation (this phase)

## Open Questions

Things that couldn't be fully resolved:

1. **Should duels/practice share student_lesson_progress or use separate tables?**
   - What we know: Current `student_lesson_progress` tracks XP, streaks, words_mastered per lesson
   - What's unclear: Duels might need separate progress (duel wins/losses) vs unified (all XP in one place)
   - Recommendation: Start with unified progress (simple), create separate `student_duel_stats` if duel leaderboards need different aggregation

2. **How to handle XP awards for activities that overlap?**
   - What we know: Async duel plays a board (solo board also awards XP), finding vocabulary words during duel
   - What's unclear: Award XP twice (duel completion + word discovery) or single XP for context?
   - Recommendation: Award XP once per activity type — duel awards "duel XP", don't double-count word discovery. Make explicit in spreadsheet.

3. **Should `/duel` namespace use Redis adapter for horizontal scaling?**
   - What we know: Existing default namespace doesn't use Redis adapter (single server)
   - What's unclear: Duels might need multi-server support if classroom sizes grow
   - Recommendation: Start without Redis adapter (YAGNI), add in Phase 39 if real-time duels need scaling

## Sources

### Primary (HIGH confidence)
- [Socket.IO Namespaces](https://socket.io/docs/v4/namespaces/) - Official documentation for namespace architecture
- Existing codebase migrations: `062_education_xp_tracking.sql`, `063_education_achievements.sql` - RLS patterns
- Existing handlers: `backend/handlers/index.ts` - Handler registration pattern
- Existing XP managers: `backend/modules/xpManager.ts`, `backend/modules/educationXpManager.ts` - XP calculation patterns
- Existing tests: `lib/supabase/__tests__/joinClassroom.test.ts` - Test mocking patterns

### Secondary (MEDIUM confidence)
- [TypeScript module splitting](https://www.webdevtutor.net/blog/typescript-split-module-into-multiple-files) - Barrel export pattern
- [TypeScript best practices 2026](https://www.bacancytechnology.com/blog/typescript-best-practices) - Module organization
- [Socket.IO best practices](https://www.tutorialspoint.com/socket.io/socket.io_namespaces.htm) - Namespace vs rooms guidance

### Tertiary (LOW confidence)
- WebSearch results on "Socket.IO namespaces best practices" - General namespace guidance (verify with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, versions verified in package.json
- Architecture: HIGH - Patterns extracted from existing codebase (migrations 062/063, handlers/index.ts, test files)
- Pitfalls: MEDIUM - Based on common refactoring issues + RLS security patterns, not project-specific failures

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable technologies, established patterns)
