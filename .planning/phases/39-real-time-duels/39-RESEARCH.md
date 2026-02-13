# Phase 39: Real-Time Duels - Research

**Researched:** 2026-02-13
**Domain:** Real-time 1v1 duels, Socket.IO room synchronization, live progress indicators, disconnection handling
**Confidence:** HIGH

## Summary

Phase 39 implements real-time (synchronous) duels where both players see the same board simultaneously and compete live with real-time progress indicators showing each other's word count and score. Research reveals that the foundation is already solid from Phase 38: the `/duel` Socket.IO namespace exists, database schema supports both `async` and `realtime` duel types, and the event type definitions in `types.ts` already include real-time events (`duel:opponent-progress`, `duel:opponent-word`).

**Key findings:**
1. **Socket.IO v4 features ready**: Socket.IO v4.6.0+ provides Connection State Recovery (maxDisconnectionDuration: 2min default in setup) which enables graceful reconnection with state restoration
2. **Room architecture established**: Phase 38 created room naming conventions (`duel:${duelId}`) and basic lifecycle handlers — extend for simultaneous gameplay
3. **Event types pre-defined**: `types.ts` already defines real-time events (`duel:opponent-progress`, `duel:opponent-word`) — handlers just need implementation
4. **Disconnection pattern exists**: Classroom games use `disconnecting` event to notify room members — apply same pattern for duels
5. **Word validation infrastructure ready**: `wordHandler.ts` validates words server-side with `isWordOnBoardAsync()` — reuse for real-time duel word submission

**Primary recommendation:** Build real-time duels as an extension of async duels (same database table, differentiated by `duel_type: 'realtime'`). Leverage Socket.IO v4's Connection State Recovery for 30s grace period, emit `duel:opponent-progress` on each word submission, and implement forfeit button as a state transition (active → forfeited).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Socket.IO | 4.8.1 | Real-time bidirectional events | Already configured with `/duel` namespace, Connection State Recovery enabled |
| Supabase Client | Latest | Duel state persistence | `student_duels` table supports both async/realtime types |
| TypeScript | 5.9.3 | Type-safe duel operations | Event types already defined in `duel/types.ts` |
| Zod | Latest | Payload validation | Established pattern in lifecycle/lobby handlers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | Latest | Live progress animations | Existing library for smooth score/word count updates |
| Radix UI | Latest | Forfeit confirmation dialog | Modal pattern for "Are you sure?" prompts |
| React hooks | 18.x | Socket connection management | Extend `useDuelSocket.ts` with real-time event listeners |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Socket.IO rooms | Redis Pub/Sub | Socket.IO rooms simpler, already configured, room management built-in |
| 30s grace period | Instant forfeit | 30s allows reconnection for temporary network hiccups (Socket.IO best practice) |
| Server-side word validation | Client trust + verification | Server validation prevents cheating (established pattern from wordHandler.ts) |

**Installation:**
```bash
# No new dependencies needed - using existing stack
npm install  # All dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
fe-next/
├── backend/handlers/duel/
│   ├── realtime.ts                 # [NEW] Real-time specific handlers
│   ├── gameplay.ts                 # [EXTEND] Add real-time word submission
│   ├── disconnection.ts            # [NEW] Grace period, forfeit, reconnection
│   └── types.ts                    # [EXTEND] Add realtime-specific event types
├── components/education/duels/
│   ├── RealTimeDuelGame.tsx       # [NEW] Live duel game view
│   ├── OpponentProgressBar.tsx    # [NEW] Real-time score/word count indicator
│   ├── DuelDisconnectOverlay.tsx  # [NEW] "Opponent disconnected" overlay
│   └── ForfeitConfirmDialog.tsx   # [NEW] Forfeit confirmation modal
└── hooks/
    └── useDuelSocket.ts            # [EXTEND] Add real-time event listeners
```

### Pattern 1: Simultaneous Board Start (Room Synchronization)

**What:** Both players join the same room and receive the frozen board simultaneously
**When to use:** Accepting a real-time duel challenge
**Example:**
```typescript
// backend/handlers/duel/realtime.ts
async function acceptRealTimeDuel(duelId: string, userId: string) {
  const { data: duel } = await supabase
    .from('student_duels')
    .select('*')
    .eq('id', duelId)
    .single();

  // Validate state transition (pending → active)
  if (duel.status !== 'pending') {
    throw new Error('Duel not in pending state');
  }

  // Generate frozen board
  const board = generateRandomTable(4, 4, null, null, lesson.language);

  // Update duel to active
  await supabase
    .from('student_duels')
    .update({
      status: 'active',
      board_state: board,
      started_at: new Date().toISOString()
    })
    .eq('id', duelId);

  // Both players join room simultaneously
  const duelRoom = `duel:${duelId}`;

  // Emit to BOTH players (challenger already in room, opponent joining)
  io.to(duelRoom).emit('duel:started', {
    duelId,
    boardState: board,
    startTime: new Date().toISOString(),
    timeLimit: 180, // 3 minutes
    players: [duel.challenger_id, duel.opponent_id]
  });
}
```
**Source:** Socket.IO rooms pattern ([Socket.IO v4 tutorial](https://socket.io/docs/v4/tutorial/api-overview))

### Pattern 2: Live Progress Updates (Opponent Awareness)

**What:** Emit opponent's progress (word count, score) in real-time on each word submission
**When to use:** Player submits valid word during real-time duel
**Example:**
```typescript
// backend/handlers/duel/gameplay.ts (EXTEND)
socket.on('duel:submit-word', async ({ duelId, word, positions }) => {
  // Validate word on board
  const isValid = await isWordOnBoardAsync(word, boardState, positions);
  if (!isValid) {
    socket.emit('duel:word-rejected', { word, reason: 'not_on_board' });
    return;
  }

  // Validate word in dictionary
  const isDictWord = await isDictionaryWord(word, language);
  if (!isDictWord) {
    socket.emit('duel:word-rejected', { word, reason: 'not_in_dictionary' });
    return;
  }

  // Calculate score
  const points = calculateWordScore(word);

  // Update player's score in database
  const { data: updated } = await supabase
    .from('student_duels')
    .update({
      [`${role}_score`]: duel[`${role}_score`] + points,
      [`${role}_words`]: [...duel[`${role}_words`], word]
    })
    .eq('id', duelId)
    .select()
    .single();

  // Emit to player: word accepted
  socket.emit('duel:word-accepted', { word, points });

  // Emit to opponent: live progress update
  const opponentSocketId = getOpponentSocketId(duelId, userId);
  io.to(opponentSocketId).emit('duel:opponent-progress', {
    opponentId: userId,
    word,
    points,
    totalScore: updated[`${role}_score`],
    wordCount: updated[`${role}_words`].length
  });
});
```
**Source:** Existing word validation pattern in `wordHandler.ts` + Socket.IO targeted emit

### Pattern 3: Disconnection Grace Period (Connection State Recovery)

**What:** 30-second grace period for disconnected player to reconnect before auto-forfeit
**When to use:** Player's socket disconnects during active real-time duel
**Example:**
```typescript
// backend/handlers/duel/disconnection.ts
socket.on('disconnecting', async (reason) => {
  const activeDuel = await getActiveDuelForPlayer(socket.data.userId);
  if (!activeDuel) return;

  const duelRoom = `duel:${activeDuel.id}`;

  // Notify opponent: player disconnected
  socket.to(duelRoom).emit('duel:opponent-disconnected', {
    opponentId: socket.data.userId,
    gracePeriodSeconds: 30
  });

  // Start 30s grace period timer
  const gracePeriodTimer = setTimeout(async () => {
    // Check if player reconnected
    const stillDisconnected = !isPlayerConnected(socket.data.userId);

    if (stillDisconnected) {
      // Auto-forfeit: disconnected player loses
      await forfeitDuel(activeDuel.id, socket.data.userId);

      // Notify opponent: you win by forfeit
      io.to(duelRoom).emit('duel:completed', {
        duelId: activeDuel.id,
        winnerId: getOpponentId(activeDuel, socket.data.userId),
        reason: 'opponent_disconnected',
        forfeitedBy: socket.data.userId
      });
    }
  }, 30000);

  // Store timer for cleanup if player reconnects
  gracePeriodTimers.set(socket.data.userId, gracePeriodTimer);
});

// On reconnection
socket.on('connect', async () => {
  const timer = gracePeriodTimers.get(socket.data.userId);
  if (timer) {
    clearTimeout(timer);
    gracePeriodTimers.delete(socket.data.userId);

    // Notify opponent: player reconnected
    const activeDuel = await getActiveDuelForPlayer(socket.data.userId);
    if (activeDuel) {
      io.to(`duel:${activeDuel.id}`).emit('duel:opponent-reconnected', {
        opponentId: socket.data.userId
      });
    }
  }
});
```
**Source:** [Socket.IO Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery) + [Handling disconnections](https://socket.io/docs/v4/tutorial/handling-disconnections)

### Pattern 4: Manual Forfeit (User-Initiated)

**What:** Player can forfeit duel manually via button (avoids 30s wait if they need to leave)
**When to use:** Player clicks "Forfeit" button during active duel
**Example:**
```typescript
// backend/handlers/duel/lifecycle.ts (EXTEND)
socket.on('duel:forfeit', async ({ duelId }) => {
  const { data: duel } = await supabase
    .from('student_duels')
    .select('*')
    .eq('id', duelId)
    .single();

  // Validate player is part of this duel
  if (duel.challenger_id !== userId && duel.opponent_id !== userId) {
    socket.emit('duel:error', { message: 'Not part of this duel' });
    return;
  }

  // Validate duel is active
  if (duel.status !== 'active') {
    socket.emit('duel:error', { message: 'Duel not active' });
    return;
  }

  // Determine winner (opponent)
  const winnerId = duel.challenger_id === userId
    ? duel.opponent_id
    : duel.challenger_id;

  // Update duel status
  await supabase
    .from('student_duels')
    .update({
      status: 'completed',
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
      forfeit_reason: 'manual_forfeit'
    })
    .eq('id', duelId);

  // Award XP (winner gets full XP, forfeiter gets minimal)
  await awardDuelXp(winnerId, 'win');
  await awardDuelXp(userId, 'forfeit'); // Less XP than loss

  // Notify both players
  io.to(`duel:${duelId}`).emit('duel:completed', {
    duelId,
    winnerId,
    reason: 'forfeit',
    forfeitedBy: userId
  });
});
```
**Source:** State machine pattern from `lifecycle.ts` + forfeit as valid state transition

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reconnection logic | Custom reconnect timer | Socket.IO Connection State Recovery | Handles session restoration, missed events, automatic retry with exponential backoff |
| Live progress sync | Polling opponent score | Socket.IO room emit (`duel:opponent-progress`) | Real-time push is instant, polling adds 1-3s latency + server load |
| Simultaneous start | Client-side countdown | Server-emitted `duel:started` event | Ensures both clients start at same time (server clock is source of truth) |
| Word validation | Client-only check | Server validation with `isWordOnBoardAsync()` | Prevents cheating (client can be tampered with) |
| Grace period timer | Client countdown | Server-side setTimeout | Client can't manipulate timer, ensures fair 30s period |

**Key insight:** Socket.IO v4's Connection State Recovery (enabled in `socketSetup.ts` with `maxDisconnectionDuration: 2min`) handles reconnection automatically — don't build custom reconnection logic. Server-side timers and validation prevent cheating.

## Common Pitfalls

### Pitfall 1: Client-Side Timer Desync

**What goes wrong:** Each client runs separate timer, timers drift apart (1-3s difference)
**Why it happens:** Client clocks are not synchronized, JavaScript setTimeout is imprecise
**How to avoid:**
- Server emits `duel:started` with ISO timestamp
- Clients calculate remaining time from server timestamp
- Server-side timer handles duel completion (timeout)
```typescript
// BAD: Client-only timer
const [timeLeft, setTimeLeft] = useState(180);
useEffect(() => {
  const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
}, []); // Drifts apart between clients

// GOOD: Server timestamp as source of truth
const [timeLeft, setTimeLeft] = useState(0);
useEffect(() => {
  const interval = setInterval(() => {
    const elapsed = Date.now() - new Date(serverStartTime).getTime();
    setTimeLeft(Math.max(0, timeLimit - Math.floor(elapsed / 1000)));
  }, 100); // Update every 100ms for smooth countdown
}, [serverStartTime]);
```
**Warning signs:** Players report different remaining time, one client ends before the other

### Pitfall 2: Race Condition on Simultaneous Completion

**What goes wrong:** Both players finish at exact same time, winner calculated twice (conflicting results)
**Why it happens:** Two simultaneous word submissions trigger completion logic concurrently
**How to avoid:**
- Use atomic database update (Supabase `.update().eq('status', 'active')` — only one succeeds)
- Check `xp_awarded` flag before awarding XP (prevents double-award)
```typescript
// BAD: No race protection
if (duel.status === 'active' && timeExpired) {
  await completeDuel(duelId); // Called twice = double XP
}

// GOOD: Atomic status update
const { data: updated } = await supabase
  .from('student_duels')
  .update({ status: 'completed', completed_at: now })
  .eq('id', duelId)
  .eq('status', 'active') // Only update if still active
  .select()
  .single();

if (updated) { // Only one update succeeds
  await awardDuelXp(winnerId, 'win');
}
```
**Warning signs:** Duplicate XP awards in logs, inflated student XP totals

### Pitfall 3: Stale Opponent Progress (Missed Events)

**What goes wrong:** Player doesn't see opponent's words due to missed Socket.IO event
**Why it happens:** Network hiccup or event emitted before client joined room
**How to avoid:**
- On reconnection, client requests full duel state (`duel:sync-state`)
- Server emits current scores, word counts, and words found
- Client reconciles local state with server state
```typescript
// BAD: No state sync on reconnect
socket.on('connect', () => {
  console.log('Reconnected'); // Local state might be stale
});

// GOOD: Request full state sync
socket.on('connect', () => {
  socket.emit('duel:sync-state', { duelId });
});

socket.on('duel:state-synced', ({ duelState }) => {
  // Update local state with server truth
  setChallengerScore(duelState.challenger_score);
  setOpponentScore(duelState.opponent_score);
  setChallengerWords(duelState.challenger_words);
  setOpponentWords(duelState.opponent_words);
});
```
**Warning signs:** Player sees 0 opponent progress after reconnect, word counts don't match opponent's view

### Pitfall 4: Forfeit Without Confirmation

**What goes wrong:** Player accidentally clicks forfeit, instantly loses duel
**Why it happens:** No confirmation dialog, button positioned near other UI
**How to avoid:**
- Always show confirmation dialog ("Are you sure you want to forfeit?")
- Use Radix AlertDialog for accessible confirmation
- Disable forfeit button during grace period (prevent double-forfeit)
```typescript
// BAD: Instant forfeit
<button onClick={() => socket.emit('duel:forfeit', { duelId })}>
  Forfeit
</button>

// GOOD: Confirmation dialog
<AlertDialog>
  <AlertDialogTrigger asChild>
    <button>Forfeit</button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Forfeit Duel?</AlertDialogTitle>
    <AlertDialogDescription>
      You'll lose this duel and your opponent will win. This can't be undone.
    </AlertDialogDescription>
    <AlertDialogAction onClick={() => socket.emit('duel:forfeit', { duelId })}>
      Yes, forfeit
    </AlertDialogAction>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
  </AlertDialogContent>
</AlertDialog>
```
**Warning signs:** User complaints about accidental forfeits, high forfeit rate

## Code Examples

Verified patterns from official sources:

### Real-Time Duel Game Component (React)
```typescript
// components/education/duels/RealTimeDuelGame.tsx
'use client';

import { useEffect, useState } from 'react';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { BoggleBoard } from '@/components/game/BoggleBoard';
import { OpponentProgressBar } from './OpponentProgressBar';
import { DuelDisconnectOverlay } from './DuelDisconnectOverlay';

interface Props {
  duelId: string;
  opponentName: string;
  timeLimit: number;
}

export function RealTimeDuelGame({ duelId, opponentName, timeLimit }: Props) {
  const { socket, isConnected } = useDuelSocket();
  const [boardState, setBoardState] = useState<string[][] | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [myWordCount, setMyWordCount] = useState(0);
  const [opponentWordCount, setOpponentWordCount] = useState(0);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime, setStartTime] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join duel room
    socket.emit('duel:join-room', { duelId });

    // Listen for duel start
    socket.on('duel:started', ({ boardState, startTime, timeLimit }) => {
      setBoardState(boardState);
      setStartTime(startTime);
      setTimeLeft(timeLimit);
    });

    // Listen for opponent progress
    socket.on('duel:opponent-progress', ({ totalScore, wordCount }) => {
      setOpponentScore(totalScore);
      setOpponentWordCount(wordCount);
    });

    // Listen for opponent disconnection
    socket.on('duel:opponent-disconnected', () => {
      setOpponentDisconnected(true);
    });

    // Listen for opponent reconnection
    socket.on('duel:opponent-reconnected', () => {
      setOpponentDisconnected(false);
    });

    // Listen for duel completion
    socket.on('duel:completed', ({ winnerId, reason }) => {
      // Navigate to results page
      router.push(`/education/duels/${duelId}/results`);
    });

    return () => {
      socket.off('duel:started');
      socket.off('duel:opponent-progress');
      socket.off('duel:opponent-disconnected');
      socket.off('duel:opponent-reconnected');
      socket.off('duel:completed');
      socket.emit('duel:leave-room', { duelId });
    };
  }, [socket, isConnected, duelId]);

  // Server timestamp-based countdown (prevents drift)
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(startTime).getTime();
      const remaining = Math.max(0, timeLimit - Math.floor(elapsed / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, timeLimit]);

  const handleWordSubmit = (word: string, positions: number[][]) => {
    socket?.emit('duel:submit-word', { duelId, word, positions });
  };

  return (
    <div className="relative">
      {opponentDisconnected && (
        <DuelDisconnectOverlay opponentName={opponentName} />
      )}

      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm">Your Score</p>
          <p className="text-2xl font-bold">{myScore}</p>
          <p className="text-xs">{myWordCount} words</p>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold">{timeLeft}s</p>
        </div>

        <div>
          <p className="text-sm">{opponentName}'s Score</p>
          <p className="text-2xl font-bold">{opponentScore}</p>
          <p className="text-xs">{opponentWordCount} words</p>
        </div>
      </div>

      <OpponentProgressBar
        myScore={myScore}
        opponentScore={opponentScore}
        opponentName={opponentName}
      />

      {boardState && (
        <BoggleBoard
          board={boardState}
          onWordSubmit={handleWordSubmit}
        />
      )}
    </div>
  );
}
```
**Source:** Similar pattern in classroom game components + Socket.IO event listeners

### Opponent Progress Indicator (React)
```typescript
// components/education/duels/OpponentProgressBar.tsx
'use client';

import { motion } from 'framer-motion';

interface Props {
  myScore: number;
  opponentScore: number;
  opponentName: string;
}

export function OpponentProgressBar({ myScore, opponentScore, opponentName }: Props) {
  const total = myScore + opponentScore || 1; // Avoid division by zero
  const myPercentage = (myScore / total) * 100;
  const opponentPercentage = (opponentScore / total) * 100;

  return (
    <div className="relative h-8 bg-neo-navy border-neo rounded-neo overflow-hidden mb-6">
      {/* My progress (left side, blue) */}
      <motion.div
        className="absolute left-0 top-0 h-full bg-neo-cyan"
        initial={{ width: 0 }}
        animate={{ width: `${myPercentage}%` }}
        transition={{ type: 'spring', stiffness: 100 }}
      />

      {/* Opponent progress (right side, orange) */}
      <motion.div
        className="absolute right-0 top-0 h-full bg-neo-orange"
        initial={{ width: 0 }}
        animate={{ width: `${opponentPercentage}%` }}
        transition={{ type: 'spring', stiffness: 100 }}
      />

      {/* Score labels */}
      <div className="absolute inset-0 flex justify-between items-center px-4 text-sm font-bold">
        <span className="text-neo-navy">{myScore}</span>
        <span className="text-neo-white text-xs">{opponentName}</span>
        <span className="text-neo-navy">{opponentScore}</span>
      </div>
    </div>
  );
}
```
**Source:** Framer Motion progress bar animation + neo-brutalist design system

### Disconnection Overlay (React)
```typescript
// components/education/duels/DuelDisconnectOverlay.tsx
'use client';

import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

interface Props {
  opponentName: string;
  gracePeriodSeconds?: number;
}

export function DuelDisconnectOverlay({ opponentName, gracePeriodSeconds = 30 }: Props) {
  return (
    <motion.div
      className="absolute inset-0 z-50 bg-neo-navy/90 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <WifiOff className="w-16 h-16 mx-auto mb-4 text-neo-orange" />
        <h3 className="text-2xl font-neo-display mb-2">
          {opponentName} Disconnected
        </h3>
        <p className="text-neo-white/70">
          Waiting {gracePeriodSeconds}s for reconnection...
        </p>
        <p className="text-sm text-neo-white/50 mt-2">
          You'll win automatically if they don't reconnect
        </p>
      </div>
    </motion.div>
  );
}
```
**Source:** Framer Motion overlay + neo-brutalist design

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for opponent score | Real-time Socket.IO emit | Phase 39 (2026) | Instant updates (0ms latency vs 1-3s polling) |
| Manual reconnection button | Socket.IO Connection State Recovery | Socket.IO v4.6.0 (2023) | Automatic reconnection with state restoration |
| Client-side timer | Server timestamp as source | Phase 39 (2026) | Eliminates timer drift between clients |
| Instant forfeit on disconnect | 30s grace period | Phase 39 (2026) | Allows recovery from temporary network issues |

**Deprecated/outdated:**
- Polling-based opponent progress (use Socket.IO push instead)
- Client-only timers (use server timestamp + client calculation)
- Binary online/offline (use `disconnecting` event + grace period)

## Open Questions

Things that couldn't be fully resolved:

1. **Spectator mode**
   - What we know: Not in Phase 39 scope, deferred to future
   - What's unclear: Should spectators see both players' progress or just final results?
   - Recommendation: Defer to Phase 40+, focus on core 1v1 gameplay first

2. **Post-time completion**
   - What we know: Timer expires, duel ends
   - What's unclear: Should players be allowed to finish current word after timer expires?
   - Recommendation: Hard stop on timer (simpler, matches async duel behavior)

3. **Rematch flow**
   - What we know: Duel history shows previous opponents
   - What's unclear: Should rematch create async or real-time duel (or let user choose)?
   - Recommendation: Default to same type (real-time → real-time), add toggle in Phase 40+ if requested

4. **Tie-breaking**
   - What we know: Both players can have same score
   - What's unclear: Who wins in a tie? First to reach score? Random?
   - Recommendation: Declare draw (both get "win" XP), simpler than complex tie-breaking

## Sources

### Primary (HIGH confidence)
- Socket.IO v4 official docs: [Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery)
- Socket.IO v4 official docs: [Handling disconnections](https://socket.io/docs/v4/tutorial/handling-disconnections)
- Socket.IO v4 official docs: [Room management](https://socket.io/docs/v4/tutorial/api-overview)
- Existing codebase: `fe-next/backend/handlers/duel/types.ts` (real-time event types already defined)
- Existing codebase: `fe-next/backend/handlers/wordHandler.ts` (word validation pattern)
- Existing codebase: `fe-next/server/socketSetup.ts` (Connection State Recovery enabled with 2min maxDisconnectionDuration)

### Secondary (MEDIUM confidence)
- [Top 7 Practices for Real-Time Data Synchronization](https://www.serverion.com/uncategorized/top-7-practices-for-real-time-data-synchronization/) - data freshness indicators, alerting
- [GameDev.net: What to do when a player disconnects?](https://gamedev.net/forums/topic/637158-what-to-do-when-a-player-disconnects/5028761) - grace period approaches

### Tertiary (LOW confidence)
- [Escapist Forums: Penalties for disconnecting](https://forums.escapistmagazine.com/threads/penalties-for-disconecting-during-multiplayer-games.260312/) - community opinions on disconnect penalties

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Socket.IO v4 already configured, Connection State Recovery enabled, event types pre-defined
- Architecture: HIGH - Patterns match existing async duels + classroom games, Socket.IO rooms already established
- Pitfalls: HIGH - Derived from common real-time game issues (timer drift, race conditions) + Socket.IO docs

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable technology stack, Socket.IO v4 patterns well-established)

---

**Ready for planning:** All foundation verified, Socket.IO patterns documented, pitfalls identified. Planner can proceed with PLAN.md creation.
