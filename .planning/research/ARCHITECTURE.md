# Architecture Research — Education 2.0 Integration

**Domain:** Education platform enhancement (student duels, practice modes, gamification)
**Researched:** 2026-02-13
**Confidence:** HIGH

## System Overview

Education 2.0 builds on existing architecture, extending real-time multiplayer patterns to support async 1v1 duels and adding practice mode variations.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXISTING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Next.js App Router [locale]/                                       │
│    ├── /education/classroom-game (teacher-led multiplayer)          │
│    └── /education/practice (solo board with vocabulary targeting)   │
│                                                                      │
│  Socket.IO Handlers (23 handlers)                                   │
│    ├── classroomGameHandler.ts (room-based multiplayer)             │
│    ├── friendChallengeHandler.ts (1v1 async invites pattern)        │
│    └── vocabularyHandler.ts (word validation with lesson context)   │
│                                                                      │
│  Backend Modules (XP/Achievement/Game Management)                   │
│    ├── educationXpManager.ts (mastery-focused XP)                   │
│    ├── educationAchievementManager.ts (education achievements)      │
│    ├── classroomGameManager.ts (Redis-based game state)             │
│    └── xpManager.ts (core XP utilities)                             │
│                                                                      │
│  Data Layer (lib/supabase/)                                         │
│    └── teacher.ts (1260 lines — 22 exported functions)              │
│        ↓ NEEDS SPLITTING                                            │
│                                                                      │
│  Supabase Tables (education)                                        │
│    ├── classrooms (teacher-created, join_code)                      │
│    ├── classroom_memberships (student-classroom M:N)                │
│    ├── vocabulary_lessons (word lists with definitions)             │
│    ├── lesson_assignments (lesson → classroom with due dates)       │
│    └── student_lesson_progress (mastery tracking per word)          │
│                                                                      │
│  Components (21 education components)                               │
│    ├── ClassroomGameLobby.tsx (multiplayer lobby UI)                │
│    ├── SoloPracticeBoard.tsx (practice with vocabulary targeting)   │
│    ├── XpProgressBar.tsx (level-up visualization)                   │
│    └── AchievementUnlockModal.tsx (achievement celebration)         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      NEW ARCHITECTURE (Education 2.0)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NEW PAGES (Next.js App Router)                                     │
│    ├── /education/duels (student duel hub — browse/create/manage)   │
│    ├── /education/duel/[duelId] (active duel game + results)        │
│    └── /education/practice (EXTENDED modes: flashcards, timed)      │
│                                                                      │
│  NEW SOCKET.IO HANDLERS                                             │
│    └── duelHandler.ts (extends friendChallengeHandler pattern)      │
│        ├── createDuel (async challenge)                             │
│        ├── acceptDuel (opponent joins)                              │
│        ├── joinDuelGame (real-time 1v1 room)                        │
│        ├── duelWordSubmit (word validation in duel)                 │
│        └── completeDuelTurn (async turn submission)                 │
│                                                                      │
│  NEW BACKEND MODULES                                                │
│    ├── duelManager.ts (Redis + Supabase hybrid state)               │
│    │   ├── createDuel() → Supabase + Redis notification            │
│    │   ├── getDuel() → Fetch from Supabase + active state          │
│    │   ├── startDuelGame() → Redis room (like classroomGame)       │
│    │   └── completeDuel() → Persist results to Supabase            │
│    └── practiceModesManager.ts (practice session orchestration)     │
│        ├── createFlashcardSession() → Session state                 │
│        ├── submitFlashcardAnswer() → Accuracy tracking              │
│        └── completeSession() → XP calculation                       │
│                                                                      │
│  NEW SUPABASE TABLES                                                │
│    ├── student_duels (duel metadata, state, results)                │
│    │   ├── id, challenger_id, opponent_id, lesson_id               │
│    │   ├── duel_type: 'real_time' | 'async_turn_based'             │
│    │   ├── status: 'pending' | 'active' | 'completed'               │
│    │   ├── winner_id, scores, words_found                           │
│    │   └── expires_at (for async duels)                             │
│    ├── duel_turns (async turn-based moves)                          │
│    │   ├── duel_id, player_id, turn_number                          │
│    │   ├── words_found, score, submitted_at                         │
│    │   └── is_complete (turn finished)                              │
│    ├── practice_sessions (flashcard/timed practice tracking)        │
│    │   ├── id, student_id, lesson_id, mode                          │
│    │   ├── words_practiced, accuracy_per_word                       │
│    │   ├── xp_earned, mastery_bonus                                 │
│    │   └── completed_at                                             │
│    └── student_achievements_progress (granular achievement state)   │
│        ├── student_id, achievement_id                               │
│        ├── current_value, target_value                              │
│        ├── last_updated, unlocked_at                                │
│        └── metadata (achievement-specific tracking)                 │
│                                                                      │
│  NEW DATA LAYER (split lib/supabase/teacher.ts)                     │
│    ├── lib/supabase/education/classrooms.ts (8 functions)           │
│    ├── lib/supabase/education/lessons.ts (6 functions)              │
│    ├── lib/supabase/education/progress.ts (4 functions)             │
│    ├── lib/supabase/education/duels.ts (NEW — 6 functions)          │
│    └── lib/supabase/education/practice.ts (NEW — 4 functions)       │
│                                                                      │
│  NEW COMPONENTS                                                      │
│    ├── duel/DuelLobby.tsx (challenge creation + browse)             │
│    ├── duel/DuelGameBoard.tsx (1v1 game UI)                         │
│    ├── duel/DuelResults.tsx (winner/loser celebration)              │
│    ├── practice/FlashcardSession.tsx (flashcard mode UI)            │
│    ├── practice/TimedPractice.tsx (timed challenge mode)            │
│    ├── practice/PracticeModeSelector.tsx (mode picker)              │
│    ├── gamification/AchievementTracker.tsx (progress display)       │
│    ├── gamification/StreakCalendar.tsx (daily streak visual)        │
│    └── gamification/LeaderboardWidget.tsx (classroom rankings)      │
│                                                                      │
│  EXTENDED COMPONENTS (modified existing)                            │
│    ├── XpProgressBar.tsx (add streak multiplier display)            │
│    ├── AchievementUnlockModal.tsx (richer animation variants)       │
│    └── SoloPracticeBoard.tsx (integrate with practice sessions)     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Integration Points

### Socket.IO Room Pattern (Reuse Existing)

**Existing pattern (classroomGameHandler):**
- Teacher creates game → `classroom_game:{gameCode}` Redis key
- Broadcast to `classroom:{classroomId}` Socket.IO room
- Students join room, receive real-time updates
- Redis TTL cleans up expired games

**New pattern (duelHandler):**
```typescript
// Async duel creation (like friend challenge)
socket.on('createDuel', async (data) => {
  // 1. Create in Supabase (persistent)
  await createDuel({ challengerId, opponentId, lessonId, duelType });

  // 2. Notify opponent via Socket.IO
  broadcastToUser(io, opponentId, 'duelInviteReceived', { duelId, challenger });
});

// Real-time duel start (like classroom game)
socket.on('startDuelGame', async (data) => {
  // 1. Create Redis game state (TTL 1 hour)
  await redis.setex(`duel_game:${duelId}`, 3600, JSON.stringify(gameState));

  // 2. Both players join Socket.IO room
  socket.join(`duel:${duelId}`);
  io.to(`duel:${duelId}`).emit('duelGameStarted', { grid, players });

  // 3. Real-time word submissions
  socket.on('duelWordSubmit', async (word) => {
    // Validate, update Redis state, broadcast to room
  });
});

// Async turn-based (new hybrid pattern)
socket.on('submitDuelTurn', async (data) => {
  // 1. Persist turn to Supabase
  await insertDuelTurn({ duelId, playerId, words, score });

  // 2. Notify opponent if online (Socket.IO)
  broadcastToUser(io, opponentId, 'duelTurnCompleted', { turn });

  // 3. Check if duel complete
  if (bothTurnsComplete) {
    await completeDuel(duelId);
    io.to(`duel:${duelId}`).emit('duelComplete', { winner, results });
  }
});
```

### Supabase Data Flow (Hybrid Persistence)

**Real-time duels:** Redis (active state) → Supabase (final results)
**Async duels:** Supabase only (turn-by-turn persistence)
**Practice sessions:** Supabase only (no real-time component)

```
┌──────────────────────────────────────────────────────────────┐
│                      DUEL DATA FLOW                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CREATE DUEL (async)                                       │
│     ├─ Socket: createDuel event                              │
│     ├─ Backend: duelManager.createDuel()                     │
│     ├─ Supabase: INSERT student_duels (status='pending')     │
│     └─ Socket.IO: Notify opponent (if online)                │
│                                                               │
│  2a. ACCEPT REAL-TIME DUEL                                    │
│     ├─ Socket: acceptDuel + startDuelGame                    │
│     ├─ Supabase: UPDATE student_duels (status='active')      │
│     ├─ Redis: setex duel_game:{id} (TTL 1 hour)             │
│     ├─ Socket.IO: Both join room duel:{id}                   │
│     └─ Real-time gameplay (like classroom game)              │
│         ├─ Word submissions → Redis state update             │
│         ├─ Broadcast scores to room                          │
│         └─ On game end:                                       │
│             ├─ Persist results to Supabase                   │
│             ├─ Award XP (educationXpManager)                 │
│             └─ Check achievements (educationAchievementMgr)  │
│                                                               │
│  2b. ACCEPT ASYNC DUEL (turn-based)                           │
│     ├─ Socket: acceptDuel event                              │
│     ├─ Supabase: UPDATE student_duels (status='active')      │
│     ├─ Player 1 takes turn (solo board)                      │
│     ├─ Socket: submitDuelTurn                                │
│     ├─ Supabase: INSERT duel_turns (turn 1)                  │
│     ├─ Notify Player 2 (Socket.IO if online)                 │
│     ├─ Player 2 takes turn                                   │
│     ├─ Supabase: INSERT duel_turns (turn 2)                  │
│     └─ Backend: Compare scores, declare winner               │
│         ├─ Supabase: UPDATE student_duels (completed)        │
│         ├─ Award XP to both                                  │
│         └─ Emit duelComplete to both players                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   PRACTICE SESSION FLOW                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. START PRACTICE SESSION                                    │
│     ├─ Frontend: Select mode (flashcards/timed/solo)         │
│     ├─ API: POST /api/education/practice/start               │
│     ├─ Supabase: INSERT practice_sessions (in_progress)      │
│     └─ Return sessionId                                       │
│                                                               │
│  2. PRACTICE GAMEPLAY (client-side state)                     │
│     ├─ Flashcards: Card flips, answer tracking               │
│     ├─ Timed: Board with countdown, word submissions         │
│     └─ Solo: SoloPracticeBoard component                     │
│                                                               │
│  3. COMPLETE SESSION                                          │
│     ├─ Frontend: onComplete callback                         │
│     ├─ API: POST /api/education/practice/complete            │
│     │   {                                                     │
│     │     sessionId,                                          │
│     │     wordsPracticed: ['word1', 'word2'],                │
│     │     accuracyPerWord: { word1: 0.8, word2: 1.0 },       │
│     │     completedAt                                         │
│     │   }                                                     │
│     ├─ Backend: practiceModesManager.completeSession()       │
│     │   ├─ Calculate XP (educationXpManager)                 │
│     │   │   ├─ Base XP per word practiced                    │
│     │   │   ├─ Accuracy bonus (>90% → extra XP)             │
│     │   │   └─ Streak multiplier (daily practice)           │
│     │   ├─ Update student_lesson_progress (mastery)          │
│     │   ├─ Supabase: UPDATE practice_sessions                │
│     │   └─ Check achievements (first perfect session, etc)   │
│     └─ Return: { xpEarned, masteryMessage, achievements }    │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  GAMIFICATION DATA FLOW                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ACHIEVEMENT TRACKING (event-driven)                          │
│     ├─ Backend event: Practice session complete              │
│     ├─ educationAchievementManager.checkAchievements()       │
│     ├─ Query student_achievements_progress                   │
│     ├─ Increment progress (e.g., sessions_completed: 5/10)   │
│     ├─ If threshold met:                                     │
│     │   ├─ Supabase: UPDATE (unlocked_at = NOW())            │
│     │   ├─ Award bonus XP                                    │
│     │   └─ Socket.IO: Emit achievementUnlocked               │
│     └─ Frontend: AchievementUnlockModal displays             │
│                                                               │
│  STREAK TRACKING (daily practice)                            │
│     ├─ On any practice/duel completion:                      │
│     │   └─ Check last_practice_date in profiles              │
│     ├─ If consecutive day:                                   │
│     │   ├─ Increment streak_count                            │
│     │   ├─ Apply streak multiplier to XP                     │
│     │   └─ Update last_practice_date                         │
│     └─ If streak broken (>1 day gap):                        │
│         ├─ Reset streak_count to 1                           │
│         └─ Display loss aversion message                     │
│                                                               │
│  LEADERBOARDS (cached queries)                               │
│     ├─ Classroom: student_lesson_progress aggregated         │
│     ├─ Global: profiles.education_xp sorted                  │
│     ├─ Redis cache (5 min TTL)                               │
│     └─ Invalidate on XP change events                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## New Components Needed

### Duel System

| Component | Responsibility | Location | Integrates With |
|-----------|---------------|----------|-----------------|
| `DuelLobby.tsx` | Browse pending duels, create challenges, view history | `components/education/duel/` | `lib/supabase/education/duels.ts`, Socket.IO for real-time notifications |
| `DuelGameBoard.tsx` | 1v1 real-time game UI (grid, opponent scores, timer) | `components/education/duel/` | `InGameContext`, `duelHandler.ts` Socket.IO events |
| `DuelResults.tsx` | Win/loss screen with XP gains, rematch option | `components/education/duel/` | `XpProgressBar`, `AchievementUnlockModal` |
| `DuelInviteCard.tsx` | Pending duel invitation UI (accept/decline) | `components/education/duel/` | Socket.IO `duelInviteReceived` event |
| `DuelHistoryList.tsx` | Past duels with win/loss records | `components/education/duel/` | `lib/supabase/education/duels.ts` |
| `DuelTurnView.tsx` | Async turn-based duel UI (play turn, wait for opponent) | `components/education/duel/` | `SoloPracticeBoard`, `duel_turns` table |

### Practice Modes

| Component | Responsibility | Location | Integrates With |
|-----------|---------------|----------|-----------------|
| `PracticeModeSelector.tsx` | Mode picker (flashcards, timed, solo board) | `components/practice/` | Route to mode-specific components |
| `FlashcardSession.tsx` | Flashcard flip UI, definition matching, accuracy tracking | `components/practice/` | `PracticeSessionProvider`, `practice_sessions` table |
| `TimedPractice.tsx` | Countdown timer + word hunt, pressure mode | `components/practice/` | `SoloPracticeBoard`, timer utilities |
| `PracticeResults.tsx` | Session summary (XP, accuracy, words mastered) | `components/practice/` | `XpProgressBar`, session data |
| `PracticeSessionProvider.tsx` | Context managing active practice session state | `components/practice/` | ALREADY EXISTS (extend for new modes) |

### Gamification Widgets

| Component | Responsibility | Location | Integrates With |
|-----------|---------------|----------|-----------------|
| `AchievementTracker.tsx` | Mini widget showing progress toward next achievement | `components/gamification/` | `student_achievements_progress` table |
| `StreakCalendar.tsx` | Visual calendar showing practice streak, loss aversion | `components/gamification/` | `profiles.streak_count`, `last_practice_date` |
| `LeaderboardWidget.tsx` | Compact classroom/global leaderboard | `components/gamification/` | `ClassroomLeaderboard` (already exists, extract widget) |
| `XpBarWithStreak.tsx` | XpProgressBar + streak multiplier indicator | `components/gamification/` | Extends `XpProgressBar.tsx` |
| `MasteryBadge.tsx` | Lesson mastery percentage visual (circular progress) | `components/gamification/` | `student_lesson_progress.words_mastered` |

## Modified Components (Existing → Enhanced)

| Component | Current State | Changes Needed | Risk |
|-----------|--------------|----------------|------|
| `XpProgressBar.tsx` | Shows level + XP progress | Add streak multiplier display, animated fill | LOW (additive only) |
| `AchievementUnlockModal.tsx` | Generic unlock modal | Add variant animations (bronze/silver/gold), richer descriptions | LOW (extend props) |
| `SoloPracticeBoard.tsx` | Vocabulary-targeted word hunt | Integrate with `practice_sessions` table, emit practice events | MEDIUM (data flow changes) |
| `ClassroomLeaderboard.tsx` | Classroom-only rankings | Extract widget variant, add global mode | LOW (refactor into two variants) |
| `EducationHeader.tsx` | Breadcrumbs + title | Add XP/streak display in header | LOW (UI addition) |
| `PracticeSessionProvider.tsx` | Context for practice state | Extend for flashcard/timed modes, add XP tracking | MEDIUM (state shape changes) |

## New Supabase Tables

### `student_duels`
```sql
CREATE TABLE student_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Players
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Context
  lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,

  -- Duel configuration
  duel_type TEXT NOT NULL CHECK (duel_type IN ('real_time', 'async_turn_based')),
  difficulty TEXT DEFAULT 'MEDIUM',
  time_limit_seconds INTEGER DEFAULT 180, -- 3 minutes for real-time

  -- State
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'expired', 'declined')),

  -- Results (populated on completion)
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  challenger_score INTEGER,
  opponent_score INTEGER,
  challenger_words_found TEXT[],
  opponent_words_found TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'), -- Auto-expire pending duels

  -- Redis game state reference (for active real-time duels)
  redis_game_key TEXT, -- e.g., "duel_game:uuid"

  -- Indexes
  CHECK (challenger_id != opponent_id) -- Can't duel yourself
);

CREATE INDEX idx_student_duels_challenger ON student_duels(challenger_id, status);
CREATE INDEX idx_student_duels_opponent ON student_duels(opponent_id, status);
CREATE INDEX idx_student_duels_classroom ON student_duels(classroom_id, status);
CREATE INDEX idx_student_duels_expires_at ON student_duels(expires_at) WHERE status = 'pending';

-- RLS
ALTER TABLE student_duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own duels"
  ON student_duels FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create duels"
  ON student_duels FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Opponents can accept duels"
  ON student_duels FOR UPDATE
  USING (auth.uid() = opponent_id AND status = 'pending');
```

### `duel_turns` (async turn-based only)
```sql
CREATE TABLE duel_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  duel_id UUID NOT NULL REFERENCES student_duels(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  turn_number INTEGER NOT NULL CHECK (turn_number IN (1, 2)), -- Only 2 turns max

  -- Turn results
  words_found TEXT[] NOT NULL,
  vocabulary_words_found TEXT[], -- Subset of words_found
  score INTEGER NOT NULL,
  grid_used JSONB NOT NULL, -- The grid they played on

  -- Timing
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  time_taken_seconds INTEGER, -- How long they took

  UNIQUE(duel_id, turn_number) -- One turn per player
);

CREATE INDEX idx_duel_turns_duel_id ON duel_turns(duel_id);
CREATE INDEX idx_duel_turns_player ON duel_turns(player_id);

-- RLS
ALTER TABLE duel_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view turns in their duels"
  ON duel_turns FOR SELECT
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM student_duels
      WHERE id = duel_id
      AND (challenger_id = auth.uid() OR opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own turns"
  ON duel_turns FOR INSERT
  WITH CHECK (player_id = auth.uid());
```

### `practice_sessions`
```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,

  -- Practice mode
  mode TEXT NOT NULL CHECK (mode IN ('flashcards', 'timed', 'solo_board', 'mixed')),
  difficulty TEXT DEFAULT 'MEDIUM',

  -- Practice data
  words_practiced TEXT[] NOT NULL DEFAULT '{}',
  accuracy_per_word JSONB DEFAULT '{}', -- { "word": 0.8, ... }
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,

  -- XP and rewards
  xp_earned INTEGER DEFAULT 0,
  mastery_bonus_xp INTEGER DEFAULT 0,
  streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
  mastery_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE INDEX idx_practice_sessions_student ON practice_sessions(student_id, completed_at DESC);
CREATE INDEX idx_practice_sessions_lesson ON practice_sessions(lesson_id);

-- RLS
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practice sessions"
  ON practice_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can create practice sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = student_id);
```

### `student_achievements_progress` (extends existing achievements)
```sql
CREATE TABLE student_achievements_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL, -- e.g., "first_perfect_flashcard", "10_duels_won"

  -- Progress tracking
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Achievement-specific data
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ,

  UNIQUE(student_id, achievement_id)
);

CREATE INDEX idx_student_achievements_student ON student_achievements_progress(student_id);
CREATE INDEX idx_student_achievements_unlocked ON student_achievements_progress(student_id, unlocked_at DESC);

-- RLS
ALTER TABLE student_achievements_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievement progress"
  ON student_achievements_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can update achievement progress"
  ON student_achievements_progress FOR ALL
  USING (true); -- Backend has service role key
```

### Profile extensions (add columns to existing `profiles` table)
```sql
-- Daily practice streak
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_practice_date DATE;

-- Education-specific XP (separate from main game XP)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level INTEGER DEFAULT 1;

-- Duel stats
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duels_won INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duels_lost INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duels_total INTEGER DEFAULT 0;
```

## Socket.IO Event Extensions

### New Events (duelHandler.ts)

**Client → Server:**
```typescript
// Duel lifecycle
socket.emit('createDuel', {
  opponentId: string;
  lessonId: string;
  duelType: 'real_time' | 'async_turn_based';
  difficulty?: DifficultyLevel;
});

socket.emit('acceptDuel', { duelId: string });
socket.emit('declineDuel', { duelId: string });
socket.emit('cancelDuel', { duelId: string }); // Challenger cancels pending

// Real-time gameplay
socket.emit('startDuelGame', { duelId: string }); // Both players ready
socket.emit('duelWordSubmit', { duelId: string; word: string });
socket.emit('duelGameEnd', { duelId: string }); // Timer expired or quit

// Async gameplay
socket.emit('submitDuelTurn', {
  duelId: string;
  words: string[];
  score: number;
  grid: LetterGrid;
  timeTaken: number;
});
```

**Server → Client:**
```typescript
// Notifications
socket.on('duelInviteReceived', {
  duelId: string;
  challenger: { id, username, avatar };
  lesson: { id, name };
  duelType: 'real_time' | 'async_turn_based';
});

socket.on('duelAccepted', { duelId, opponent });
socket.on('duelDeclined', { duelId, opponent });

// Real-time game updates
socket.on('duelGameStarted', {
  duelId: string;
  grid: LetterGrid;
  players: PlayerInfo[];
  timeLimit: number;
});

socket.on('duelWordValidated', {
  playerId: string;
  word: string;
  score: number;
  totalScore: number;
});

socket.on('duelGameComplete', {
  winnerId: string;
  scores: { [playerId]: number };
  results: DuelResults;
});

// Async turn updates
socket.on('duelTurnCompleted', {
  duelId: string;
  turnNumber: 1 | 2;
  playerId: string;
  score: number;
});

socket.on('duelComplete', {
  duelId: string;
  winnerId: string;
  results: DuelResults;
  xpAwarded: number;
});
```

### Extended Events (practice modes)

**No Socket.IO needed** — practice is client-side + API routes:
- `POST /api/education/practice/start` → Create session
- `POST /api/education/practice/complete` → Submit results, calculate XP
- `GET /api/education/practice/history` → Past sessions

## File Organization

### Current Structure Issues

**lib/supabase/teacher.ts (1260 lines, 22 functions)** — TOO LARGE, needs splitting:

```
lib/supabase/teacher.ts (CURRENT - delete after migration)
  ↓ SPLIT INTO ↓

lib/supabase/education/
  ├── classrooms.ts (8 functions)
  │   ├── getClassrooms()
  │   ├── getClassroom()
  │   ├── createClassroom()
  │   ├── updateClassroom()
  │   ├── deleteClassroom()
  │   ├── joinClassroom()
  │   ├── getStudentClassroom()
  │   └── getClassroomStudents()
  │
  ├── lessons.ts (6 functions)
  │   ├── getLessons()
  │   ├── getLesson()
  │   ├── createLesson()
  │   ├── updateLesson()
  │   ├── deleteLesson()
  │   └── importCurriculumToLesson()
  │
  ├── progress.ts (4 functions)
  │   ├── getStudentProgress()
  │   ├── getClassProgress()
  │   ├── updateProgress()
  │   └── getClassroomLeaderboard()
  │
  ├── assignments.ts (4 functions)
  │   ├── assignLesson()
  │   ├── getStudentAssignedLessons()
  │   ├── getCurriculumWordLists()
  │   └── getCurriculumWordList()
  │
  ├── duels.ts (NEW - 6 functions)
  │   ├── createDuel()
  │   ├── getDuel()
  │   ├── getPendingDuels()
  │   ├── getDuelHistory()
  │   ├── acceptDuel()
  │   └── completeDuel()
  │
  └── practice.ts (NEW - 4 functions)
      ├── createPracticeSession()
      ├── completePracticeSession()
      ├── getPracticeSessions()
      └── calculateSessionXp()
```

### New File Structure

```
fe-next/
├── app/
│   └── [locale]/
│       └── education/
│           ├── duels/
│           │   ├── page.tsx (duel hub)
│           │   └── PageClient.tsx
│           ├── duel/[duelId]/
│           │   ├── page.tsx (active duel)
│           │   └── PageClient.tsx
│           └── practice/
│               ├── page.tsx (EXISTING - extend with mode selector)
│               └── modes/
│                   ├── flashcards/page.tsx
│                   ├── timed/page.tsx
│                   └── solo/page.tsx
│
├── components/
│   ├── education/
│   │   ├── duel/ (NEW)
│   │   │   ├── DuelLobby.tsx
│   │   │   ├── DuelGameBoard.tsx
│   │   │   ├── DuelResults.tsx
│   │   │   ├── DuelInviteCard.tsx
│   │   │   ├── DuelHistoryList.tsx
│   │   │   └── DuelTurnView.tsx
│   │   ├── gamification/ (NEW)
│   │   │   ├── AchievementTracker.tsx
│   │   │   ├── StreakCalendar.tsx
│   │   │   ├── LeaderboardWidget.tsx
│   │   │   ├── XpBarWithStreak.tsx
│   │   │   └── MasteryBadge.tsx
│   │   └── (existing components...)
│   │
│   └── practice/ (NEW directory)
│       ├── PracticeModeSelector.tsx
│       ├── FlashcardSession.tsx
│       ├── TimedPractice.tsx
│       ├── PracticeResults.tsx
│       ├── SoloPracticeBoard.tsx (MOVE from components/)
│       └── PracticeSessionProvider.tsx (MOVE from education/)
│
├── backend/
│   ├── handlers/
│   │   └── duelHandler.ts (NEW - ~300 lines)
│   │
│   └── modules/
│       ├── duelManager.ts (NEW - ~400 lines)
│       │   ├── createDuel()
│       │   ├── startDuelGame() → Redis room creation
│       │   ├── handleDuelWordSubmit()
│       │   ├── completeDuel() → Persist to Supabase
│       │   └── expirePendingDuels() (cron job)
│       │
│       └── practiceModesManager.ts (NEW - ~200 lines)
│           ├── createSession()
│           ├── completeSession()
│           └── calculatePracticeXp()
│
├── lib/supabase/
│   └── education/ (NEW directory - split from teacher.ts)
│       ├── classrooms.ts (~200 lines)
│       ├── lessons.ts (~250 lines)
│       ├── progress.ts (~150 lines)
│       ├── assignments.ts (~200 lines)
│       ├── duels.ts (NEW ~250 lines)
│       └── practice.ts (NEW ~150 lines)
│
├── hooks/
│   └── education/ (NEW directory)
│       ├── useDuelState.ts (Socket.IO integration)
│       ├── usePracticeSession.ts (session state management)
│       └── useStreakTracking.ts (daily practice tracking)
│
└── supabase/migrations/
    └── 057_education_2_duels_and_practice.sql (NEW)
```

## Build Order (Dependency-Aware)

### Phase 1: Data Layer Foundation (Backend First)
**Why first:** All features depend on these tables and functions.

1. **Database migration** (`057_education_2_duels_and_practice.sql`)
   - Create `student_duels`, `duel_turns`, `practice_sessions`, `student_achievements_progress`
   - Extend `profiles` with streak/education_xp/duel_stats
   - Add RLS policies
   - ⏱️ 1-2 hours

2. **Split lib/supabase/teacher.ts** into modular files
   - Create `lib/supabase/education/` directory
   - Migrate existing functions to `classrooms.ts`, `lessons.ts`, `progress.ts`, `assignments.ts`
   - Update imports across codebase (search for `from '@/lib/supabase/teacher'`)
   - ⏱️ 3-4 hours (lots of import updates)

3. **Create new data layer modules**
   - `lib/supabase/education/duels.ts` (6 functions)
   - `lib/supabase/education/practice.ts` (4 functions)
   - ⏱️ 2-3 hours

**Validation checkpoint:** Can query new tables, existing education features still work.

### Phase 2: Practice Modes (No Socket.IO, Simpler)
**Why second:** Self-contained, no real-time complexity.

4. **Backend modules for practice**
   - `backend/modules/practiceModesManager.ts`
   - XP calculation logic (integrate with `educationXpManager.ts`)
   - ⏱️ 2-3 hours

5. **API routes for practice**
   - `POST /api/education/practice/start`
   - `POST /api/education/practice/complete`
   - `GET /api/education/practice/history`
   - ⏱️ 1-2 hours

6. **Practice UI components**
   - `PracticeModeSelector.tsx`
   - `FlashcardSession.tsx`
   - `TimedPractice.tsx`
   - `PracticeResults.tsx`
   - ⏱️ 6-8 hours

7. **Practice pages**
   - Extend `/education/practice` with mode selector
   - Create mode-specific sub-routes (optional)
   - ⏱️ 2-3 hours

**Validation checkpoint:** Students can complete practice sessions, earn XP, track accuracy.

### Phase 3: Duel System (Complex, Socket.IO Integration)
**Why third:** Builds on practice patterns, adds real-time complexity.

8. **Backend duel manager**
   - `backend/modules/duelManager.ts` (Redis + Supabase hybrid)
   - ⏱️ 4-5 hours

9. **Socket.IO duel handler**
   - `backend/handlers/duelHandler.ts`
   - Extend `backend/handlers/index.ts` to register duel handlers
   - ⏱️ 3-4 hours

10. **Duel UI components**
    - `DuelLobby.tsx` (browse/create)
    - `DuelInviteCard.tsx` (notifications)
    - `DuelGameBoard.tsx` (real-time 1v1)
    - `DuelTurnView.tsx` (async turn-based)
    - `DuelResults.tsx`
    - ⏱️ 8-10 hours

11. **Duel pages**
    - `/education/duels` (hub)
    - `/education/duel/[duelId]` (active game)
    - ⏱️ 3-4 hours

12. **Hooks for duel state**
    - `hooks/education/useDuelState.ts` (Socket.IO integration)
    - ⏱️ 2-3 hours

**Validation checkpoint:** Students can create duels, play real-time + async, see results.

### Phase 4: Gamification Enhancements (Polish)
**Why last:** Visual polish, depends on XP/achievement data from previous phases.

13. **Achievement system extensions**
    - Extend `educationAchievementManager.ts` with new achievements
    - Achievement definitions (first duel win, 10-day streak, etc.)
    - ⏱️ 2-3 hours

14. **Streak tracking logic**
    - `hooks/education/useStreakTracking.ts`
    - Daily check on practice completion
    - ⏱️ 1-2 hours

15. **Gamification widgets**
    - `AchievementTracker.tsx`
    - `StreakCalendar.tsx`
    - `LeaderboardWidget.tsx`
    - `XpBarWithStreak.tsx`
    - `MasteryBadge.tsx`
    - ⏱️ 6-8 hours

16. **UI polish pass**
    - Integrate widgets into existing pages
    - Header XP/streak display
    - Celebration animations
    - ⏱️ 3-4 hours

**Validation checkpoint:** Full gamification loop working, achievements unlocking, streaks visible.

### Total Estimated Time
- Phase 1 (Data): 6-9 hours
- Phase 2 (Practice): 11-16 hours
- Phase 3 (Duels): 20-26 hours
- Phase 4 (Gamification): 12-17 hours

**Grand total: 49-68 hours (6-8.5 working days)**

## Architecture Patterns to Follow

### 1. Socket.IO Room Pattern (Proven)
**Reuse from `classroomGameHandler.ts`:**
- Create Redis state with TTL
- Players join Socket.IO room
- Broadcast state changes to room
- Persist results to Supabase on completion

### 2. Async Challenge Pattern (Proven)
**Reuse from `friendChallengeHandler.ts`:**
- Create challenge in Supabase (persistent invite)
- Notify recipient via Socket.IO (if online)
- Accept/decline updates Supabase
- Start game flow after acceptance

### 3. XP Calculation Consistency
**Pattern from `educationXpManager.ts`:**
- Base XP per action
- Accuracy/mastery bonuses
- Streak multipliers
- Achievement bonus XP
- **CRITICAL:** Mastery message BEFORE XP amount (UX research finding)

### 4. Component Composition
**Pattern from existing education components:**
- Small, focused components (< 300 lines)
- Use `LanguageContext` for all text (`t('key')`)
- Radix UI for accessibility
- Neo-brutalist design system (hard shadows, chunky borders)

### 5. Data Flow: Client → API → Backend → Supabase
```
Component (UI)
  ↓ API route (/api/education/*)
  ↓ Backend module (*Manager.ts)
  ↓ Supabase (lib/supabase/education/*)
  ↓ Database (tables)
```

## Anti-Patterns to Avoid

### 1. ❌ Monolithic Data Layer Files
**Problem:** `teacher.ts` is 1260 lines, hard to navigate.
**Solution:** Split into domain-focused modules (classrooms, lessons, duels, practice).

### 2. ❌ Direct Supabase Calls from Components
**Problem:** Business logic in UI, hard to test.
**Solution:** Always go through API routes and backend modules.

### 3. ❌ Mixing Real-Time and Persistent State
**Problem:** Redis and Supabase out of sync.
**Solution:**
- Redis = active game state (TTL)
- Supabase = persistent results
- Clear boundary: game ends → persist to Supabase → delete Redis

### 4. ❌ Hardcoded UI Text
**Problem:** Non-translatable strings.
**Solution:** ALL text through `t('key')`, add to 4 translation files.

### 5. ❌ Overly Nested Components
**Problem:** Props drilling, hard to test.
**Solution:** Use React Context for shared state (see `PracticeSessionProvider.tsx`).

### 6. ❌ Ignoring RTL for Hebrew
**Problem:** UI breaks in Hebrew mode.
**Solution:** Test with `?locale=he`, use Tailwind RTL-aware utilities, shadows auto-flip.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Socket.IO duel room conflicts with classroom games | LOW | HIGH | Use separate room namespaces (`duel:{id}` vs `classroom:{id}`) |
| lib/supabase/teacher.ts split breaks existing code | MEDIUM | HIGH | Comprehensive search/replace, thorough testing after migration |
| Async duel turns don't complete (one player abandons) | MEDIUM | MEDIUM | Expiration logic (48 hours), cleanup cron job |
| XP calculation diverges between practice/duels | LOW | MEDIUM | Centralize in `educationXpManager.ts`, shared constants |
| Real-time duel performance (lag, sync issues) | MEDIUM | MEDIUM | Reuse proven `classroomGameManager.ts` patterns, Redis TTL |
| Achievement progress tracking inconsistent | MEDIUM | LOW | Event-driven updates, idempotent increment logic |
| Translation key proliferation (100+ new keys) | HIGH | LOW | Namespace keys (`duel.*`, `practice.*`, `gamification.*`) |

## Sources

**Codebase Analysis (PRIMARY):**
- `fe-next/backend/handlers/classroomGameHandler.ts` - Real-time multiplayer room pattern (lines 1-80)
- `fe-next/backend/handlers/friendChallengeHandler.ts` - Async challenge invite pattern (lines 1-100)
- `fe-next/backend/modules/classroomGameManager.ts` - Redis-based game state management (lines 1-100)
- `fe-next/backend/modules/educationXpManager.ts` - Mastery-focused XP calculation (lines 1-50)
- `fe-next/lib/supabase/teacher.ts` - Existing data layer (1260 lines, 22 functions) — needs splitting
- `fe-next/supabase/migrations/056_teacher_vocabulary_builder.sql` - Existing education schema (lines 1-150)
- `fe-next/components/practice/SoloPracticeBoard.tsx` - Practice board pattern (lines 1-50)
- `fe-next/components/education/` - 21 existing education components
- `fe-next/backend/handlers/index.ts` - Handler registration pattern (lines 1-80)

**Architecture Patterns (VERIFIED):**
- Socket.IO room-based multiplayer: Used in classroom games, proven stable
- Redis TTL for temporary game state: Prevents memory leaks, auto-cleanup
- Supabase RLS for multi-tenant data: Already securing classroom/student data
- React Context for session state: `PracticeSessionProvider.tsx` pattern
- API route → Backend module → Supabase: Standard data flow

**Confidence:** HIGH — All patterns derived from existing, production-tested code in the same codebase.
