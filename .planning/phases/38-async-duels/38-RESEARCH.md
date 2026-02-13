# Phase 38: Async Duels - Research

**Researched:** 2026-02-13
**Domain:** Async turn-based duels, board state serialization, Socket.IO notification system, duel state management
**Confidence:** HIGH

## Summary

Phase 38 implements async (turn-based) duels where students challenge classmates to beat their score on a frozen board. Research reveals that most foundation is already in place from Phase 36: database schema exists (`student_duels`, `duel_turns`), Socket.IO `/duel` namespace is configured, and board generation logic is well-established. The core challenge is implementing the duel lifecycle state machine (pending → active → completed) with proper notification flow and board state serialization.

**Key findings:**
1. **Database schema complete**: Phase 36 migration created `student_duels` (tracks challenges, scores, board state) and `duel_turns` (tracks async turn submissions) with full RLS policies
2. **Board generation exists**: `backend/utils/gameUtils.ts` has `generateRandomTable()` and board verification logic — boards are already 2D arrays serializable to JSON
3. **Socket.IO namespace ready**: `/duel` namespace configured in `server/socketSetup.ts` with stub handlers for all lifecycle events (create, accept, decline, lobby management)
4. **XP economy balanced**: `educationXpManager.ts` defines duel XP values (win: 200 XP, loss: 120 XP) following Phase 36's anti-inflation rules
5. **Notification pattern established**: Socket.IO rooms pattern already used for real-time notifications (`duel:lobby:${classroomId}` for lobby updates, `duel:${duelId}` for game-specific events)

**Primary recommendation:** Build on existing foundation aggressively — use established patterns for board serialization (JSONB column), Socket.IO room-based notifications, XP award flow (similar to practice sessions), and state machine validation (like game lifecycle handlers).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Socket.IO | 4.8.1 | Real-time duel notifications | Existing WebSocket server with `/duel` namespace |
| Supabase Client | Latest | Duel CRUD operations | Current DB client with RLS policies |
| TypeScript | 5.9.3 | Type-safe duel operations | Existing codebase standard |
| Zod | Latest | Duel event validation | Existing handler validation pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | Latest | Duel challenge form validation | Existing form pattern |
| Radix UI | Latest | Duel lobby/history UI components | Existing component library |
| Framer Motion | Latest | Duel notification animations | Existing motion library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB board state | Separate board table | JSONB is simpler, board state is immutable per duel |
| Socket.IO rooms | Polling API | Socket.IO provides instant notifications, already configured |
| State machine validation | Client-only state | Server validation prevents cheating, matches existing pattern |

**Installation:**
```bash
# No new dependencies needed - using existing stack
npm install  # All dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
fe-next/
├── lib/supabase/education/
│   └── duels.ts                    # Duel CRUD operations (foundation stub exists)
├── backend/handlers/duel/
│   ├── index.ts                    # Socket.IO handler registry (stub exists)
│   ├── lifecycle.ts                # [NEW] Create, accept, decline, cancel handlers
│   ├── lobby.ts                    # [NEW] Lobby join/leave, opponent list
│   └── gameplay.ts                 # [NEW] Score submission, completion
├── components/education/duels/
│   ├── DuelLobby.tsx              # [NEW] Lobby view with pending invites, opponent list
│   ├── DuelChallengeModal.tsx     # [NEW] Create challenge modal
│   ├── DuelGameView.tsx           # [NEW] Play async duel on frozen board
│   ├── DuelHistory.tsx            # [NEW] Win/loss record, stats
│   └── DuelNotification.tsx       # [NEW] Toast notification for challenges
└── hooks/
    └── useDuelSocket.ts            # [NEW] Socket.IO connection to /duel namespace
```

### Pattern 1: Duel State Machine (Lifecycle Management)

**What:** Server-authoritative state machine for duel lifecycle validation
**When to use:** All duel state transitions (pending → active → completed)
**Example:**
```typescript
// backend/handlers/duel/lifecycle.ts
import { z } from 'zod';

const VALID_TRANSITIONS = {
  pending: ['active', 'cancelled', 'expired', 'declined'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
  declined: []
} as const;

async function acceptDuel(duelId: string, userId: string) {
  // 1. Fetch duel
  const { data: duel } = await supabase
    .from('student_duels')
    .select('*')
    .eq('id', duelId)
    .single();

  // 2. Validate state transition
  if (duel.status !== 'pending') {
    throw new Error('Duel not in pending state');
  }

  if (duel.opponent_id !== userId) {
    throw new Error('Only opponent can accept');
  }

  // 3. Generate frozen board
  const board = generateRandomTable(4, 4, null, null, lesson.language);

  // 4. Update duel state
  const { data: updated } = await supabase
    .from('student_duels')
    .update({
      status: 'active',
      board_state: board,
      started_at: new Date().toISOString()
    })
    .eq('id', duelId)
    .select()
    .single();

  // 5. Notify both players via Socket.IO
  io.to(`duel:${duelId}`).emit('duel:accepted', {
    duelId,
    boardState: board,
    startedAt: updated.started_at
  });

  return updated;
}
```
**Source:** Existing game lifecycle pattern in `backend/handlers/gameLifecycleHandler.ts`

### Pattern 2: Board State Serialization (Frozen Board)

**What:** Store board as JSONB for exact replay on opponent's turn
**When to use:** Creating challenges, loading duel game view
**Example:**
```typescript
// Board generation (challenger turn)
const board: LetterGrid = generateRandomTable(4, 4, null, null, lesson.language);

// Store in database
await supabase
  .from('student_duels')
  .insert({
    challenger_id: userId,
    opponent_id: opponentId,
    lesson_id: lessonId,
    classroom_id: classroomId,
    duel_type: 'async',
    status: 'pending',
    board_state: board,  // JSON serialization happens automatically
    challenger_score: 0,
    opponent_score: 0
  });

// Retrieve and play (opponent turn)
const { data: duel } = await supabase
  .from('student_duels')
  .select('*')
  .eq('id', duelId)
  .single();

const frozenBoard: LetterGrid = duel.board_state;  // Exact same board
```
**Source:** [boardgame.io serialization pattern](https://boardgame.io/documentation/) - requires JSON-serializable state
**Why it works:** `LetterGrid` is `string[][]` (already JSON-compatible), JSONB preserves exact board state

### Pattern 3: Socket.IO Room-Based Notifications

**What:** Use rooms for targeted notifications (lobby updates, challenge delivery)
**When to use:** Real-time duel events (challenge received, duel accepted, score submitted)
**Example:**
```typescript
// Lobby room pattern (already established in Phase 36)
socket.on('duel:join-lobby', ({ classroomId }) => {
  const lobbyRoom = `duel:lobby:${classroomId}`;
  socket.join(lobbyRoom);

  // Broadcast to lobby: "User X is available"
  io.to(lobbyRoom).emit('duel:lobby-update', {
    availableOpponents: getOnlineStudents(classroomId)
  });
});

// Challenge notification pattern
socket.on('duel:create', async ({ opponentId, lessonId }) => {
  const duel = await createDuel({ challengerId: userId, opponentId, lessonId });

  // Notify specific opponent
  const opponentSocket = getSocketByUserId(opponentId);
  if (opponentSocket) {
    io.to(opponentSocket.id).emit('duel:challenge-received', {
      duelId: duel.id,
      challengerName: profile.display_name,
      lessonName: lesson.name
    });
  }
});
```
**Source:** [Socket.IO room notifications](https://novu.co/blog/build-a-real-time-notification-system-with-socket-io-and-reactjsbuild-a-real-time-notification-system-with-socket-io-and-reactjs/) - real-time notification system pattern
**Why it works:** Rooms provide efficient targeted broadcasting, already configured in `/duel` namespace

### Pattern 4: XP Award Flow (Duel Completion)

**What:** Award XP after both players submit scores, prevent double-awarding
**When to use:** Duel completion event (both turns submitted)
**Example:**
```typescript
async function completeDuel(duelId: string) {
  const { data: duel } = await supabase
    .from('student_duels')
    .select('*')
    .eq('id', duelId)
    .single();

  // Determine winner
  const winnerId = duel.challenger_score > duel.opponent_score
    ? duel.challenger_id
    : duel.opponent_id;

  // Update duel with winner
  await supabase
    .from('student_duels')
    .update({
      status: 'completed',
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
      xp_awarded: true  // Prevent double-award
    })
    .eq('id', duelId);

  // Award XP to both players
  const winXp = EDUCATION_XP_CONFIG.DUEL_WIN_ASYNC;
  const lossXp = EDUCATION_XP_CONFIG.DUEL_LOSS_ASYNC;

  await Promise.all([
    awardXp(winnerId, winXp),
    awardXp(loserId, lossXp)
  ]);

  // Notify both players
  io.to(`duel:${duelId}`).emit('duel:completed', {
    winnerId,
    winnerScore: Math.max(duel.challenger_score, duel.opponent_score),
    loserScore: Math.min(duel.challenger_score, duel.opponent_score),
    xpAwarded: { winner: winXp, loser: lossXp }
  });
}
```
**Source:** Existing practice session XP flow in `lib/supabase/education/practice.ts`
**Why it works:** `xp_awarded` flag prevents race conditions, XP values already defined in Phase 36

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Opponent online status | Custom presence tracking | Socket.IO room membership | Rooms track connected sockets automatically, already configured |
| Board validation | Custom path-finding | `isWordOnBoard()` from `gameUtils.ts` | Existing function validates word paths on grid |
| Duel history pagination | Manual offset/limit logic | Supabase `.range()` | Built-in pagination with RLS enforcement |
| Challenge expiration | Cron job cleanup | Supabase triggers | Database-level expiration (24h default in `expires_at` column) |
| Score tampering prevention | Client-side validation only | Server-side word validation + score calculation | Backend validates words against dictionary, calculates score server-side |

**Key insight:** The game already has robust word validation (`wordValidatorPool.ts`), board generation (`gameUtils.ts`), and Socket.IO infrastructure — reuse these instead of rebuilding.

## Common Pitfalls

### Pitfall 1: Client-Side Score Trust

**What goes wrong:** Trusting client-submitted scores opens door to cheating
**Why it happens:** Async duels don't have real-time validation like multiplayer games
**How to avoid:**
- Store `words_found` array in `duel_turns` table
- Server validates each word against dictionary + board
- Server calculates final score (never trust client)
```typescript
// BAD: Trust client score
await supabase
  .from('student_duels')
  .update({ challenger_score: clientSubmittedScore });

// GOOD: Validate and calculate server-side
const validatedWords = await validateWordsAgainstBoard(wordsFound, boardState, lessonId);
const serverScore = calculateScore(validatedWords);
await supabase
  .from('student_duels')
  .update({ challenger_score: serverScore });
```
**Warning signs:** Unusually high scores, impossible word combinations, mismatched word count

### Pitfall 2: Race Condition on Completion

**What goes wrong:** Both players submit scores simultaneously, XP awarded twice
**Why it happens:** Async nature of turn submission
**How to avoid:**
- Use `xp_awarded` boolean flag (already in schema)
- Database transaction for status update + XP award
- Check flag before awarding XP
```typescript
// BAD: No race condition protection
if (duel.status === 'active' && bothPlayersSubmitted) {
  await awardXp(winnerId, winXp);
  await awardXp(loserId, lossXp);
}

// GOOD: Atomic flag check + update
const { data: duel } = await supabase
  .from('student_duels')
  .update({ xp_awarded: true })
  .eq('id', duelId)
  .eq('xp_awarded', false)  // Only update if not already awarded
  .select()
  .single();

if (duel) {  // Update succeeded, award XP
  await awardXp(winnerId, winXp);
  await awardXp(loserId, lossXp);
}
```
**Warning signs:** Duplicate XP entries in logs, inflated student XP totals

### Pitfall 3: Stale Socket Connections

**What goes wrong:** Student appears "online" in lobby but actually disconnected
**Why it happens:** Socket.IO disconnect events sometimes delayed
**How to avoid:**
- Implement heartbeat mechanism (Socket.IO built-in)
- Remove from lobby on disconnect event
- Show "last seen" timestamp instead of binary online/offline
```typescript
// BAD: No disconnect handling
socket.on('duel:join-lobby', ({ classroomId }) => {
  socket.join(`duel:lobby:${classroomId}`);
  // User stuck in lobby forever if they disconnect
});

// GOOD: Clean up on disconnect
socket.on('duel:join-lobby', ({ classroomId }) => {
  const lobbyRoom = `duel:lobby:${classroomId}`;
  socket.join(lobbyRoom);

  socket.on('disconnect', () => {
    socket.leave(lobbyRoom);
    io.to(lobbyRoom).emit('duel:lobby-update', {
      availableOpponents: getOnlineStudents(classroomId)
    });
  });
});
```
**Warning signs:** Students can't find opponents who are actually offline, lobby never empties

### Pitfall 4: Board State Desync

**What goes wrong:** Opponent plays different board than challenger
**Why it happens:** Board re-generation instead of loading frozen state
**How to avoid:**
- Always load `board_state` from database
- Never regenerate board on opponent turn
- Verify board hash matches (optional extra security)
```typescript
// BAD: Generate new board
const board = generateRandomTable(4, 4, null, null, language);

// GOOD: Load frozen board
const { data: duel } = await supabase
  .from('student_duels')
  .select('board_state')
  .eq('id', duelId)
  .single();

const frozenBoard = duel.board_state;  // Exact same board challenger played
```
**Warning signs:** Opponents report different available words, score disparities that don't make sense

## Code Examples

Verified patterns from official sources:

### Duel Lifecycle Handler (Socket.IO)
```typescript
// backend/handlers/duel/lifecycle.ts
import { z } from 'zod';
import { Namespace, Socket } from 'socket.io';
import { createClient } from '@supabase/supabase-js';

const createDuelSchema = z.object({
  opponentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  classroomId: z.string().uuid()
});

export function registerLifecycleHandlers(namespace: Namespace, socket: Socket) {
  socket.on('duel:create', async (data) => {
    try {
      const validated = createDuelSchema.parse(data);

      // 1. Generate frozen board
      const board = generateRandomTable(4, 4, null, null, 'en');

      // 2. Create duel record
      const { data: duel } = await supabase
        .from('student_duels')
        .insert({
          challenger_id: socket.data.userId,
          opponent_id: validated.opponentId,
          lesson_id: validated.lessonId,
          classroom_id: validated.classroomId,
          duel_type: 'async',
          status: 'pending',
          board_state: board,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        })
        .select()
        .single();

      // 3. Emit to creator
      socket.emit('duel:created', { duelId: duel.id });

      // 4. Notify opponent
      const opponentSocket = getSocketByUserId(validated.opponentId);
      if (opponentSocket) {
        namespace.to(opponentSocket.id).emit('duel:challenge-received', {
          duelId: duel.id,
          challengerName: socket.data.displayName
        });
      }
    } catch (error) {
      socket.emit('duel:error', { message: error.message });
    }
  });
}
```
**Source:** Existing Socket.IO handler pattern from `backend/handlers/gameLifecycleHandler.ts`

### Duel Lobby Component (React)
```typescript
// components/education/duels/DuelLobby.tsx
'use client';

import { useEffect, useState } from 'react';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { Users, Swords } from 'lucide-react';

interface OpponentInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export function DuelLobby({ classroomId }: { classroomId: string }) {
  const { socket, isConnected } = useDuelSocket();
  const [opponents, setOpponents] = useState<OpponentInfo[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join classroom lobby
    socket.emit('duel:join-lobby', { classroomId });

    // Listen for lobby updates
    socket.on('duel:lobby-update', ({ availableOpponents }) => {
      setOpponents(availableOpponents);
    });

    // Listen for incoming challenges
    socket.on('duel:challenge-received', (challenge) => {
      setPendingChallenges(prev => [...prev, challenge]);
    });

    return () => {
      socket.emit('duel:leave-lobby', { classroomId });
    };
  }, [socket, isConnected, classroomId]);

  const handleChallenge = (opponentId: string) => {
    socket?.emit('duel:create', {
      opponentId,
      lessonId: selectedLessonId,
      classroomId
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending Challenges Section */}
      {pendingChallenges.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Pending Challenges</h2>
          {pendingChallenges.map(challenge => (
            <DuelChallengeCard key={challenge.duelId} {...challenge} />
          ))}
        </section>
      )}

      {/* Available Opponents Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          <Users className="inline mr-2" />
          Available Opponents
        </h2>
        <div className="grid gap-4">
          {opponents.map(opponent => (
            <button
              key={opponent.userId}
              onClick={() => handleChallenge(opponent.userId)}
              className="flex items-center justify-between p-4 bg-neo-navy border-neo rounded-neo shadow-hard-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neo-yellow" />
                <span>{opponent.displayName}</span>
              </div>
              <Swords className="text-neo-orange" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
```
**Source:** Similar lobby pattern in `components/education/ClassroomGameLobby.tsx`

### Duel History Query (Supabase)
```typescript
// lib/supabase/education/duels.ts
export async function getDuelHistory(
  studentId: string,
  limit: number = 20
): Promise<{ data: DuelHistoryEntry[]; error: Error | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_duels')
    .select(`
      id,
      duel_type,
      status,
      challenger_score,
      opponent_score,
      winner_id,
      created_at,
      completed_at,
      challenger:profiles!challenger_id(display_name, avatar_url),
      opponent:profiles!opponent_id(display_name, avatar_url)
    `)
    .or(`challenger_id.eq.${studentId},opponent_id.eq.${studentId}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error };
  }

  // Calculate win/loss record
  const history = data.map(duel => ({
    ...duel,
    isWin: duel.winner_id === studentId,
    opponentInfo: duel.challenger_id === studentId ? duel.opponent : duel.challenger
  }));

  return { data: history, error: null };
}
```
**Source:** Similar pattern in `lib/supabase/education/progress.ts` for student progress queries

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiplayer real-time only | Async + Real-time duels | Phase 38/39 (2026) | Enables participation without time coordination |
| Regenerate board each game | Frozen board state (JSONB) | Phase 38 (2026) | Fair competition, exact replay |
| Polling for notifications | Socket.IO room-based push | Phase 36 (2026) | Instant challenge delivery |
| Client-calculated scores | Server-validated words + scores | Phase 38 (2026) | Prevents score tampering |

**Deprecated/outdated:**
- Client-only duel validation (never was standard, but tempting shortcut)
- Binary online/offline status (use Socket.IO room membership instead)
- Separate duel XP economy (unified in `educationXpManager.ts`)

## Open Questions

Things that couldn't be fully resolved:

1. **Quick-match algorithm**
   - What we know: Lobby shows all available opponents, student can challenge anyone
   - What's unclear: If quick-match is added, should it prioritize skill level (XP-based matchmaking) or random pairing?
   - Recommendation: Start with random pairing (simpler), add ELO-style matchmaking in Phase 40+ if needed

2. **Duel timeout handling**
   - What we know: `expires_at` column exists for pending challenges (24h default)
   - What's unclear: Should active duels have a timeout? (e.g., opponent accepts but never plays)
   - Recommendation: Start without active duel timeout, add 7-day timeout in Phase 40+ if students report abandoned duels

3. **Rematch flow**
   - What we know: Duel history can link to previous opponents
   - What's unclear: Should "Rematch" button create new challenge with same lesson, or allow lesson selection?
   - Recommendation: Same lesson for consistency (reduces decision fatigue), add lesson picker in Phase 40+ if requested

## Sources

### Primary (HIGH confidence)
- Existing database schema: `fe-next/supabase/migrations/20260213000000_education_duels_practice.sql`
- Existing Socket.IO setup: `fe-next/server/socketSetup.ts` (duel namespace configured)
- Existing board generation: `fe-next/backend/utils/gameUtils.ts` (`generateRandomTable()`)
- Existing XP config: `fe-next/backend/modules/educationXpManager.ts` (duel XP values defined)
- Existing practice pattern: `fe-next/lib/supabase/education/practice.ts` (session lifecycle)

### Secondary (MEDIUM confidence)
- [Socket.IO real-time notifications](https://novu.co/blog/build-a-real-time-notification-system-with-socket-io-and-reactjsbuild-a-real-time-notification-system-with-socket-io-and-reactjs/) - notification system architecture
- [boardgame.io state serialization](https://boardgame.io/documentation/) - JSON-serializable game state pattern
- [GameDev.net FSM for turn-based games](https://www.gamedev.net/blogs/entry/2274204-finite-state-machine-for-turn-based-games/) - state machine pattern

### Tertiary (LOW confidence)
- [Turn-based game async architecture guide](https://apis.shephertz.com/app42-dev/ebook-turn-based-games.php) - general async game principles (not framework-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in codebase, no new dependencies
- Architecture: HIGH - patterns match existing game lifecycle, practice sessions, Socket.IO handlers
- Pitfalls: HIGH - derived from existing codebase issues (score validation, race conditions in multiplayer)

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable technology stack, patterns unlikely to change)

---

**Ready for planning:** All foundation verified, patterns identified, pitfalls documented. Planner can proceed with PLAN.md creation.
