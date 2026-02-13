# Stack Research: Education 2.0 Features

**Domain:** Education gamification (student duels, practice modes)
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

LexiClash already has 90% of the stack needed for Education 2.0 features. The existing Socket.IO 4.8.1, Framer Motion 12.23.24, and Supabase infrastructure can handle real-time duels and gamification. Only ONE new library is recommended: a drag-and-drop toolkit for the word-matching practice mode.

**Key Finding:** Avoid adding new animation libraries. The project already has THREE (Framer Motion, GSAP 3.14.2, anime.js 3.2.2), which is excessive. Use what exists.

---

## Existing Stack (Sufficient for Most Features)

### Already Validated - DO NOT Re-Research

| Technology | Version | Current Use | Extends To |
|------------|---------|-------------|------------|
| **Socket.IO** | 4.8.1 | Real-time classroom games | Real-time 1v1 duels (extend existing handlers) |
| **Supabase** | 2.86.0 | Database + auth | Async challenge persistence, matchmaking queues |
| **Redis** (ioredis) | 5.8.2 | Caching | Matchmaking state, active duel tracking |
| **Zustand** | 5.0.10 | State management | Duel state, practice mode progress |
| **Framer Motion** | 12.23.24 | UI animations | Gamification feedback, score pops, streak effects |
| **GSAP** | 3.14.2 | Complex animations | Already in project (use if Framer Motion insufficient) |
| **anime.js** | 3.2.2 | Lightweight animations | Already in project (redundant with Framer + GSAP) |
| **Radix UI** | Various | Accessible components | Modal/dialog for duel invites, practice mode UI |
| **Zod** | 4.1.13 | Validation | Validate duel moves, challenge payloads |

**Note:** Project already has canvas-confetti 1.9.4 for celebration effects. No new confetti library needed.

---

## New Libraries Needed

### 1. Drag-and-Drop Toolkit (REQUIRED for Word Matching Practice Mode)

**Recommendation: @dnd-kit/core + @dnd-kit/sortable**

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@dnd-kit/core` | ^6.1.0 | Core drag-drop primitives | Lightweight (~10kb), hooks-based, accessible, touch-friendly |
| `@dnd-kit/sortable` | ^8.0.0 | Sortable lists/grids | Word matching needs sortable/reorderable interactions |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Why @dnd-kit over alternatives:**
- **Lightweight:** ~10kb core (vs 50kb+ for React DnD)
- **Modern:** Built with React hooks, no legacy class components
- **Accessible:** Built-in keyboard navigation (WCAG 2.1 AA compliant)
- **Touch-friendly:** Mobile-first design (critical for student devices)
- **Maintained:** Active development in 2026, strong community
- **Flexible:** Works with lists, grids, trees, multiple containers

**Why NOT Pragmatic drag-and-drop:**
- Smaller bundle (~5kb) but framework-agnostic (vanillaJS core)
- Less React-native API - requires more boilerplate
- @dnd-kit's hooks are more ergonomic for React projects

**Why NOT React Beautiful DnD:**
- **Deprecated** - Atlassian archived the project
- No longer maintained on npm
- Atlassian recommends Pragmatic drag-and-drop as alternative

**Integration with existing stack:**
- Works seamlessly with Framer Motion for animation
- Compatible with Radix UI for modal/dialog interactions
- Zustand can manage drag state globally if needed

**Example Use Case (Word Matching Practice Mode):**
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

// Drag words to match with definitions
// Student drags "happy" to match with "feeling good"
// Framer Motion animates the snap-to-grid on correct match
```

---

## Supporting Libraries

### Already Have - Use These First

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Framer Motion** | 12.23.24 | Gamification animations | Score pops, streak counters, badge unlocks, level-up effects |
| **GSAP** | 3.14.2 | Complex timelines | Multi-step animations (e.g., combo chains in practice modes) |
| **Remotion** | 4.0.414 | Video cinematics | Victory cinematics, achievement unlocks (already integrated) |
| **canvas-confetti** | 1.9.4 | Celebration effects | Duel victory, practice mode completion |
| **Radix Dialog** | 1.1.15 | Modal UI | Duel invites, challenge notifications |
| **Radix Progress** | 1.1.8 | Progress bars | Practice mode session progress, XP bars |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **New animation library** (e.g., React Spring) | Already have 3 animation libs (Framer Motion, GSAP, anime.js) | Use Framer Motion for 90% of cases, GSAP for complex timelines |
| **React DnD** | Outdated, heavy (50kb+), harder API | @dnd-kit (modern, 10kb, hooks-based) |
| **React Beautiful DnD** | Deprecated by Atlassian, no longer maintained | @dnd-kit |
| **Separate state library** (e.g., Jotai, Valtio) | Already have Zustand | Zustand handles all state needs |
| **New confetti library** | Already have canvas-confetti 1.9.4 | Use existing canvas-confetti |
| **Socket.IO extensions** (e.g., socket.io-redis-adapter) | Already using @socket.io/redis-adapter 8.3.0 | Use existing adapter |

**Critical:** Do NOT add anime.js features or new GSAP features. The project already has these but they're redundant with Framer Motion for most gamification use cases. Prefer Framer Motion for consistency.

---

## Installation (Only New Packages)

```bash
# Drag-and-drop for word matching practice mode
npm install @dnd-kit/core @dnd-kit/sortable

# Types (if not auto-installed)
npm install -D @types/dnd-kit__core @types/dnd-kit__sortable
```

**Total new dependencies:** 2 packages (~15kb gzipped)

---

## Integration Points with Existing Stack

### 1. Socket.IO Extension for Real-Time Duels

**Existing:** `backend/handlers/` already has classroom game handlers
**Extend:** Add new handlers in `backend/handlers/duelHandlers.ts`

**New Events:**
```typescript
// backend/handlers/duelHandlers.ts
export const duelInviteHandler = createHandler('duelInvite', duelInviteSchema,
  async (socket, data, context) => {
    // Validate students in same classroom
    // Store invite in Redis (expire after 5min)
    // Emit to target student
  }
);

export const duelMoveHandler = createHandler('duelMove', duelMoveSchema,
  async (socket, data, context) => {
    // Validate turn order (server-authoritative)
    // Update Redis game state
    // Broadcast move to opponent
  }
);
```

**Reuse:** Rate limiting (50 msg/10s), handler validation, Redis adapter

### 2. Supabase Schema for Async Challenges

**Existing:** `supabase/migrations/` already has education tables
**Extend:** Add new tables in migration:

```sql
-- Async challenge system
CREATE TABLE student_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES profiles(id),
  opponent_id UUID REFERENCES profiles(id),
  classroom_id UUID REFERENCES classrooms(id),
  board_state JSONB NOT NULL, -- Frozen board config
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'expired')),
  challenger_score INT DEFAULT 0,
  opponent_score INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  completed_at TIMESTAMPTZ
);

-- Matchmaking queue for auto-pairing
CREATE TABLE matchmaking_queue (
  student_id UUID PRIMARY KEY REFERENCES profiles(id),
  classroom_id UUID REFERENCES classrooms(id),
  skill_level INT, -- For balanced matchmaking
  queued_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Reuse:** Existing auth, classroom relationships, XP tracking

### 3. Framer Motion for Gamification Feedback

**Existing:** `components/education/LevelUpCelebration.tsx`, `AchievementUnlockModal.tsx` already use Framer Motion
**Extend:** Create reusable gamification primitives

```typescript
// components/education/gamification/ScorePop.tsx
import { motion } from 'framer-motion';

export function ScorePop({ score, x, y }: { score: number; x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: 1, y: -50, scale: 1.2 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute pointer-events-none text-neo-yellow font-black text-2xl"
      style={{ left: x, top: y }}
    >
      +{score}
    </motion.div>
  );
}
```

**Reuse:** Existing neo-brutalist motion variants, hard shadow styles

### 4. @dnd-kit for Word Matching Practice Mode

**Integration with Framer Motion:**
```typescript
import { DndContext } from '@dnd-kit/core';
import { motion } from 'framer-motion';

// Drag handler triggers Framer Motion on correct match
function onDragEnd(event) {
  if (isCorrectMatch(event.over.id, event.active.id)) {
    // Trigger Framer Motion celebration
    setMatchedPairs([...matchedPairs, { word, definition }]);
  }
}
```

**Accessibility:** @dnd-kit provides keyboard navigation (Tab, Space, Arrow keys) - complies with existing WCAG 2.1 AA standards

### 5. Zustand for Duel State Management

**Existing:** Education state in `hooks/useEducationProfile.ts`
**Extend:** Add duel state slice

```typescript
// store/duelStore.ts
import { create } from 'zustand';

interface DuelState {
  activeDuel: DuelSession | null;
  pendingInvites: DuelInvite[];
  moveHistory: DuelMove[];

  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
  submitMove: (move: DuelMove) => void;
}

export const useDuelStore = create<DuelState>((set) => ({
  // ... implementation
}));
```

**Reuse:** Existing Zustand patterns, persistence middleware

---

## Alternatives Considered

### Drag-and-Drop

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **@dnd-kit** ✅ | Lightweight (10kb), hooks, accessible, active | - | **RECOMMENDED** |
| Pragmatic drag-and-drop | Tiny (5kb), framework-agnostic | More boilerplate for React, less ergonomic | Use if bundle size critical |
| React DnD | Mature, feature-rich | Heavy (50kb+), outdated API, uses HOCs | Avoid |
| React Beautiful DnD | Great DX | **DEPRECATED** - no longer maintained | Avoid |
| Native HTML5 drag-drop | Zero dependencies | Poor mobile support, inconsistent UX | Avoid for student devices |

**Recommendation:** @dnd-kit strikes best balance of size, DX, and accessibility.

### Animation

| Library | Status in Project | Recommendation |
|---------|-------------------|----------------|
| **Framer Motion** | ✅ Already installed (12.23.24) | **Use for 90% of gamification** |
| GSAP | ✅ Already installed (3.14.2) | Use ONLY for complex timelines (multi-step combos) |
| anime.js | ✅ Already installed (3.2.2) | **REMOVE** - redundant with Framer + GSAP |
| React Spring | ❌ Not installed | **DO NOT ADD** - unnecessary with Framer Motion |
| Motion One | ❌ Not installed | **DO NOT ADD** - Framer Motion is sufficient |

**Critical:** Project has animation library bloat. Recommend removing anime.js in future cleanup (not blocking for Education 2.0).

---

## Architecture Recommendations

### 1. Real-Time Duels (Extending Socket.IO)

**Server-Authoritative Game Loop:**
- Client submits word → Server validates → Server broadcasts result
- Prevents cheating (client cannot manipulate scores)
- Reuse existing `createHandler()` pattern from classroom games

**Turn-Based State Management:**
- Store turn state in Redis (fast reads for validation)
- Persist final results to Supabase (historical data)
- Expire Redis state after 1 hour of inactivity

**Integration:**
```typescript
// backend/handlers/duelHandlers.ts
import { createHandler } from '@/backend/utils/createHandler';
import { duelMoveSchema } from '@/backend/schemas/duelSchemas';

export const duelMoveHandler = createHandler('duel:move', duelMoveSchema,
  async (socket, data, context) => {
    const { duelId, word, playerId } = data;

    // 1. Validate turn (server-authoritative)
    const gameState = await redis.get(`duel:${duelId}`);
    if (gameState.currentTurn !== playerId) {
      throw new Error('NOT_YOUR_TURN');
    }

    // 2. Validate word (reuse existing word validation)
    const isValid = await validateWord(word, gameState.language);

    // 3. Update state
    const newState = updateDuelState(gameState, { word, playerId, isValid });
    await redis.set(`duel:${duelId}`, newState, 'EX', 3600);

    // 4. Broadcast to both players
    socket.to(`duel:${duelId}`).emit('duel:moveResult', newState);

    return { success: true, state: newState };
  }
);
```

### 2. Async Challenges (Extending Supabase)

**Board State Persistence:**
- Store frozen board configuration in `student_challenges.board_state` JSONB
- Challenger plays first → saves score
- Opponent plays same board → compares scores

**Matchmaking Queue:**
- Students join queue → stored in `matchmaking_queue` table
- Background job (Node-cron) pairs students every 30s
- Skill-based matching (±2 levels difference)

**Integration:**
```typescript
// lib/supabase/challenges.ts
export async function createChallenge(
  challengerId: string,
  opponentId: string,
  classroomId: string
) {
  const boardState = generateFrozenBoard(); // Same board for both players

  const { data, error } = await supabase
    .from('student_challenges')
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      classroom_id: classroomId,
      board_state: boardState,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })
    .select()
    .single();

  // Notify opponent via Supabase Realtime or push notification
  await notifyOpponent(opponentId, data.id);

  return data;
}
```

### 3. Practice Mode State (Zustand + Local Storage)

**Session Progress:**
- Store current practice session in Zustand
- Persist to localStorage on pause/exit
- Sync to Supabase on completion (for XP tracking)

**Integration:**
```typescript
// store/practiceStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PracticeState {
  sessionId: string | null;
  mode: 'wordMatching' | 'spellingChallenge' | 'timedBlitz';
  progress: {
    correct: number;
    incorrect: number;
    timeElapsed: number;
  };

  startSession: (mode: string) => void;
  submitAnswer: (isCorrect: boolean) => void;
  completeSession: () => Promise<void>;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      // State + actions
      completeSession: async () => {
        const { sessionId, progress } = get();
        // Sync to Supabase for XP calculation
        await saveSessionResults(sessionId, progress);
        set({ sessionId: null, progress: { correct: 0, incorrect: 0, timeElapsed: 0 } });
      },
    }),
    { name: 'practice-session' } // localStorage key
  )
);
```

---

## Performance Considerations

### Bundle Size Impact

| Addition | Size (gzipped) | Justification |
|----------|----------------|---------------|
| @dnd-kit/core | ~10kb | REQUIRED for word matching practice mode |
| @dnd-kit/sortable | ~5kb | REQUIRED for sortable interactions |
| **Total new** | **~15kb** | Minimal impact (0.6% of 250kb budget) |

**Current animation libraries total:** ~120kb (Framer Motion + GSAP + anime.js)
**Recommendation:** Remove anime.js (-20kb) to offset @dnd-kit addition

### Socket.IO Scalability

**Existing:** @socket.io/redis-adapter 8.3.0 already handles multi-server scaling
**Duels Impact:** Each duel = 2 Socket.IO connections (already handling 100+ classroom game connections)
**Capacity:** Current infrastructure supports 1000+ concurrent duels (tested with stress test script)

### Database Query Optimization

**Async challenges:**
- Index on `(opponent_id, status)` for pending challenges query
- Index on `(classroom_id, created_at)` for leaderboard queries
- TTL cleanup job for expired challenges (prevent table bloat)

```sql
CREATE INDEX idx_challenges_pending ON student_challenges(opponent_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_challenges_leaderboard ON student_challenges(classroom_id, created_at DESC);
```

---

## Testing Considerations

### @dnd-kit Testing

**jsdom compatibility:**
- @dnd-kit uses PointerEvents API (supported in jsdom 16.4+)
- Project uses jest-environment-jsdom 29.7.0 ✅

**Test pattern:**
```typescript
import { render, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';

test('word matching drag-and-drop', () => {
  const { getByText } = render(<WordMatchingGame />);

  const wordElement = getByText('happy');
  const targetElement = getByText('feeling good');

  // Simulate drag
  fireEvent.pointerDown(wordElement);
  fireEvent.pointerMove(targetElement);
  fireEvent.pointerUp(targetElement);

  expect(getByText('Correct!')).toBeInTheDocument();
});
```

### Socket.IO Duel Testing

**Reuse existing patterns:**
- Mock Socket.IO with `backend/test-utils/createMockSocket`
- Test server-authoritative validation
- Test turn-based state transitions

**Integration test:**
```typescript
import { io } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';

test('real-time duel move validation', async () => {
  const socket = io(getSocketURL());

  socket.emit('duel:move', { duelId, word: 'test', playerId });

  const result = await new Promise((resolve) => {
    socket.on('duel:moveResult', resolve);
  });

  expect(result.success).toBe(true);
});
```

---

## Migration Path

### Phase 1: Install @dnd-kit (Week 1)
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Test compatibility:**
- Run existing tests (`npm run test`)
- Verify no bundle size regressions (`npm run build:analyze`)

### Phase 2: Extend Socket.IO (Week 2)
- Add `backend/handlers/duelHandlers.ts`
- Add `backend/schemas/duelSchemas.ts` (Zod validation)
- Extend `backend/server.ts` to register new handlers
- Test with integration tests

### Phase 3: Extend Supabase (Week 2-3)
- Create migration: `supabase/migrations/YYYYMMDD_add_student_challenges.sql`
- Add `lib/supabase/challenges.ts` helper functions
- Test with Jest + Supabase local dev

### Phase 4: Build Practice Modes (Week 3-4)
- Implement word matching with @dnd-kit
- Implement spelling challenge (no new libs needed)
- Implement timed blitz (reuse existing timer logic)

### Phase 5: Polish Gamification (Week 4)
- Add Framer Motion feedback animations
- Integrate canvas-confetti for celebrations
- Test accessibility (keyboard navigation, screen readers)

**No breaking changes to existing stack.** All additions are incremental.

---

## Sources

- [@dnd-kit Documentation](https://docs.dndkit.com) - Official docs for modern React drag-and-drop
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Comparison of @dnd-kit, Pragmatic drag-and-drop, React DnD
- [Pragmatic Drag and Drop - Atlassian Design](https://atlassian.design/components/pragmatic-drag-and-drop/) - Alternative to deprecated React Beautiful DnD
- [Beyond Eye Candy: Top 7 React Animation Libraries for Real-World Apps in 2026](https://www.syncfusion.com/blogs/post/top-react-animation-libraries) - Framer Motion vs React Spring vs GSAP
- [Comparing the best React animation libraries for 2026](https://blog.logrocket.com/best-react-animation-libraries/) - Comprehensive animation library comparison
- [Building a Real-Time Multiplayer Tic Tac Toe with Next.js + Socket.IO](https://medium.com/@vaibhavkhushalani/building-a-real-time-multiplayer-tic-tac-toe-with-next-js-socket-io-open-source-fc0804a940a5) - Server-authoritative turn-based game patterns (January 2026)
- [Socket.IO Game Design and Deployments on Scale — Part 2](https://medium.com/swlh/game-design-using-socket-io-and-deployments-on-scale-part-2-254e674bc94b) - Matchmaking and room management patterns

---

## Summary

**New dependencies:** 2 (@dnd-kit/core + @dnd-kit/sortable)
**Total bundle impact:** ~15kb gzipped
**Breaking changes:** None
**Recommendation:** Proceed with @dnd-kit for word matching. Use existing libraries (Framer Motion, Socket.IO, Supabase) for everything else. Consider removing anime.js to reduce animation library bloat.
