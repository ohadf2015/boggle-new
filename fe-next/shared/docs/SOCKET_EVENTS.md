# Socket Event API Documentation

This document provides a comprehensive reference for all Socket.IO events used in LexiClash.

## Table of Contents

- [Connection Flow](#connection-flow)
- [Client → Server Events](#client--server-events)
- [Server → Client Events](#server--client-events)
- [Event Payloads](#event-payloads)
- [Error Handling](#error-handling)

---

## Connection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Connection Lifecycle                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. Client connects via Socket.IO                               │
│      └── Server initializes rate limiting                        │
│                                                                  │
│   2. Client emits 'createGame' or 'join'                         │
│      └── Server validates payload (Zod schema)                   │
│      └── Server emits 'joined' or 'error'                        │
│                                                                  │
│   3. Host emits 'startGame'                                      │
│      └── Server broadcasts 'startGame' to room                   │
│                                                                  │
│   4. Players emit 'submitWord' during gameplay                   │
│      └── Server emits 'wordAccepted' / 'wordRejected'            │
│                                                                  │
│   5. Timer expires                                               │
│      └── Server emits 'endGame'                                  │
│      └── Server runs validation                                  │
│      └── Server emits 'finalScores'                              │
│                                                                  │
│   6. Client disconnects                                          │
│      └── Server cleans up, notifies room                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Client → Server Events

### Game Lifecycle Events

#### `createGame`

Create a new game room.

```typescript
// Payload
interface CreateGamePayload {
  gameCode: string;          // 4-10 alphanumeric characters
  roomName?: string;         // Max 50 characters
  language?: Language;       // 'he' | 'en' | 'sv' | 'ja' | 'es' | 'fr' | 'de'
  hostUsername?: string;     // 1-30 characters
  playerId?: string | null;  // Max 64 characters
  avatar?: Avatar;           // { emoji: string, color: string }
  authUserId?: string | null;
  guestTokenHash?: string | null;
  isRanked?: boolean;
  profilePictureUrl?: string | null;
}

// Server Response
→ 'joined' | 'error'
```

#### `join`

Join an existing game room.

```typescript
interface JoinPayload {
  gameCode: string;          // 4-10 alphanumeric characters
  username: string;          // 1-30 characters
  playerId?: string | null;
  avatar?: Avatar;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  profilePictureUrl?: string | null;
}

// Server Response
→ 'joined' | 'error'
```

#### `startGame`

Start the game (host only).

```typescript
interface StartGamePayload {
  gameCode?: string;
  letterGrid: string[][];    // 2D array of letters
  timerSeconds?: number;     // 30-600 (default: 180)
  language?: Language;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  minWordLength?: number;    // 2-5 (default: 3)
}

// Server Response
→ 'startGame' (broadcast to room)
```

#### `resetGame`

Reset game for another round (host only).

```typescript
interface ResetGamePayload {
  gameCode?: string;
}

// Server Response
→ 'resetGame' (broadcast to room)
```

#### `closeRoom`

Close the game room and disconnect all players (host only).

```typescript
interface CloseRoomPayload {
  gameCode: string;
}

// Server Response
→ 'hostLeftRoomClosing' (broadcast to room)
```

#### `leaveRoom`

Leave the current game room.

```typescript
interface LeaveRoomPayload {
  gameCode: string;
  username: string;
}

// Server Response
→ 'playerLeft' (broadcast to room)
```

---

### Word Submission Events

#### `submitWord`

Submit a word during gameplay.

```typescript
interface SubmitWordPayload {
  gameCode?: string;
  username?: string;
  word: string;              // 1-50 characters
  path?: GridPosition[];     // Optional path on grid
  comboLevel?: number;       // 0-10
}

// Server Responses
→ 'wordAccepted'           // Valid word
→ 'wordRejected'           // Invalid word
→ 'wordAlreadyFound'       // Already submitted
→ 'wordNotOnBoard'         // Not traceable on grid
→ 'wordTooShort'           // Below minimum length
→ 'wordNeedsValidation'    // Needs community/AI validation
→ 'wordValidatingWithAI'   // AI validation in progress
```

#### `submitWordVote`

Vote on a word's validity during community validation.

```typescript
interface SubmitWordVotePayload {
  gameCode?: string;
  word: string;
  voteType?: 'valid' | 'invalid';
  isValid?: boolean;
  language?: Language;
  submittedBy?: string;
  isBot?: boolean;
}

// Server Response
→ 'voteRecorded'
```

#### `submitPeerValidationVote`

Vote during peer validation phase.

```typescript
interface SubmitPeerValidationVotePayload {
  gameCode?: string;
  word: string;
  isValid: boolean;
}

// Server Response
→ 'peerVoteRecorded'
```

---

### Bot Management Events

#### `addBot`

Add an AI bot to the game (host only).

```typescript
interface AddBotPayload {
  gameCode?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Server Response
→ 'botAdded' | 'updateUsers'
```

#### `removeBot`

Remove an AI bot from the game (host only).

```typescript
interface RemoveBotPayload {
  gameCode?: string;
  botId?: string;
  botUsername?: string;
  username?: string;
}

// Server Response
→ 'botRemoved' | 'updateUsers'
```

---

### Tournament Events

#### `createTournament`

Create a multi-round tournament.

```typescript
interface CreateTournamentPayload {
  gameCode?: string;
  name: string;              // 1-100 characters
  totalRounds?: number;      // 2-10 (default: 3)
  settings?: {
    timerSeconds?: number;
    difficulty?: DifficultyLevel;
    minWordLength?: number;
  };
}

// Server Response
→ 'tournamentCreated'
```

#### `startTournamentRound`

Start the next tournament round.

```typescript
// No payload required
// Server Response
→ 'tournamentRoundStarting' | 'startGame'
```

#### `cancelTournament`

Cancel the current tournament.

```typescript
// No payload required
// Server Response
→ 'tournamentCancelled'
```

---

### Presence Events

#### `heartbeat`

Keep connection alive and update activity.

```typescript
interface HeartbeatPayload {
  gameCode?: string;
  username?: string;
  timestamp?: number;
}
```

#### `presenceUpdate`

Update presence status.

```typescript
interface PresenceUpdatePayload {
  gameCode?: string;
  username?: string;
  status?: 'active' | 'idle' | 'afk';
  isWindowFocused?: boolean;
  lastActivityAt?: number;
}

// Server Response
→ 'playerPresenceUpdate' (broadcast)
```

#### `windowFocusChange`

Notify when window focus changes.

```typescript
interface WindowFocusChangePayload {
  gameCode?: string;
  isFocused: boolean;
}
```

---

### Host Action Events

#### `kickPlayer`

Remove a player from the game.

```typescript
interface KickPlayerPayload {
  gameCode: string;
  username: string;
}

// Server Response
→ 'playerLeft' (broadcast)
```

#### `transferHost`

Transfer host privileges to another player.

```typescript
interface TransferHostPayload {
  gameCode: string;
  newHostUsername: string;
}

// Server Response
→ 'hostTransferred' (broadcast)
```

#### `updateGameSettings`

Update game configuration.

```typescript
interface UpdateGameSettingsPayload {
  gameCode: string;
  settings: {
    timerSeconds?: number;
    difficulty?: DifficultyLevel;
    minWordLength?: number;
    language?: Language;
  };
}
```

---

### Chat Events

#### `sendChatMessage`

Send a chat message to the room.

```typescript
interface ChatMessagePayload {
  gameCode?: string;
  username?: string;
  message: string;           // 1-500 characters
}

// Server Response
→ 'chatMessage' (broadcast)
```

---

### Other Events

#### `reconnect`

Attempt to reconnect to an existing game.

```typescript
interface ReconnectPayload {
  gameCode: string;
  username: string;
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

// Server Response
→ 'joined' | 'playerReconnected' | 'error'
```

#### `getActiveRooms`

Get list of joinable rooms.

```typescript
// No payload required
// Server Response
→ 'activeRooms'
```

#### `getWordsForBoard`

Get embedded words for board generation.

```typescript
interface GetWordsForBoardPayload {
  language: Language;
  boardSize?: {
    rows: number;
    cols: number;
  };
}

// Server Response
→ 'wordsForBoard'
```

---

## Server → Client Events

### Connection Events

| Event | Description | Payload |
|-------|-------------|---------|
| `joined` | Successfully joined game | `{ gameCode, users, gameState, ... }` |
| `error` | Error occurred | `{ message: string, code?: string }` |
| `rateLimited` | Rate limit exceeded | (no payload) |
| `warning` | Warning message | `{ message: string }` |
| `serverShutdown` | Server shutting down | `{ reason: string }` |

### Game State Events

| Event | Description | Payload |
|-------|-------------|---------|
| `updateUsers` | Player list updated | `{ users: Record<string, User> }` |
| `startGame` | Game started | `{ letterGrid, timerSeconds, ... }` |
| `endGame` | Game ended | `{ reason: string }` |
| `resetGame` | Game reset | (no payload) |
| `timeUpdate` | Timer sync | `{ remainingTime: number }` |
| `shufflingGridUpdate` | Pre-game grid shuffle | `{ gridState: LetterGrid }` |

### Word Response Events

| Event | Description | Payload |
|-------|-------------|---------|
| `wordAccepted` | Word was valid | `{ word, score, comboLevel, ... }` |
| `wordRejected` | Word was invalid | `{ word, reason }` |
| `wordAlreadyFound` | Already submitted | `{ word }` |
| `wordNotOnBoard` | Not on grid | `{ word }` |
| `wordTooShort` | Below min length | `{ word, minLength }` |
| `wordNeedsValidation` | Pending validation | `{ word }` |
| `wordValidatingWithAI` | AI checking | `{ word }` |
| `wordBecameValid` | AI approved | `{ word, score }` |
| `validationComplete` | All words validated | `{ scores: PlayerScore[] }` |

### Score Events

| Event | Description | Payload |
|-------|-------------|---------|
| `updateLeaderboard` | Live leaderboard | `{ leaderboard: LeaderboardEntry[] }` |
| `leaderboardUpdate` | Alias for updateLeaderboard | (same) |
| `validatedScores` | Scores after validation | `{ scores: PlayerScore[] }` |
| `finalScores` | Final game scores | `{ scores: PlayerScore[], ... }` |

### Achievement & XP Events

| Event | Description | Payload |
|-------|-------------|---------|
| `liveAchievementUnlocked` | Achievement during game | `{ key, icon }` |
| `achievementUnlocked` | Achievement after game | `{ achievements: string[] }` |
| `xpGained` | XP earned | `{ totalXp, breakdown }` |
| `levelUp` | Level increased | `{ oldLevel, newLevel, newTitles }` |

### Presence Events

| Event | Description | Payload |
|-------|-------------|---------|
| `playerPresenceUpdate` | Status changed | `{ username, status }` |
| `playerDisconnected` | Player lost connection | `{ username }` |
| `playerReconnected` | Player reconnected | `{ username }` |
| `playerConnectionStatusChanged` | Connection status | `{ username, status }` |
| `playerLeft` | Player left game | `{ username }` |
| `playerJoinedLate` | Late join (game in progress) | `{ username, avatar }` |
| `playerFoundWord` | Player found word (live) | `{ username, word }` |

### Tournament Events

| Event | Description | Payload |
|-------|-------------|---------|
| `tournamentCreated` | Tournament started | `{ id, name, totalRounds }` |
| `tournamentRoundStarting` | Round beginning | `{ round, totalRounds }` |
| `tournamentRoundCompleted` | Round finished | `{ round, standings }` |
| `tournamentComplete` | Tournament ended | `{ winner, standings }` |
| `tournamentCancelled` | Tournament cancelled | (no payload) |

---

## Event Payloads

### Common Types

```typescript
type Language = 'he' | 'en' | 'sv' | 'ja' | 'es' | 'fr' | 'de';
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
type PresenceStatus = 'active' | 'idle' | 'afk';
type LetterGrid = string[][];

interface Avatar {
  emoji: string;
  color: string;             // Hex color (#RRGGBB)
  profilePictureUrl?: string | null;
}

interface GridPosition {
  row: number;
  col: number;
  letter?: string;
}

interface User {
  username: string;
  avatar: Avatar;
  isHost: boolean;
  isBot?: boolean;
  presence?: PresenceStatus;
  disconnected?: boolean;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  avatar: Avatar;
  isHost: boolean;
  wordsFound: number;
}

interface PlayerScore {
  username: string;
  score: number;
  totalScore: number;
  wordCount: number;
  allWords: WordDetail[];
  achievements: string[];
  avatar: Avatar;
  isBot: boolean;
}

interface WordDetail {
  word: string;
  score: number;
  validated: boolean;
  inDictionary: boolean;
  validationSource: 'dictionary' | 'community' | 'ai' | 'cached' | 'none';
  isUnique: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
}
```

---

## Error Handling

### Error Event Format

```typescript
interface ErrorPayload {
  message: string;           // Human-readable message
  code?: string;             // Error code for programmatic handling
  details?: {                // Additional error details
    field?: string;          // Field that caused error
    [key: string]: any;
  };
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `GAME_NOT_FOUND` | Game code doesn't exist |
| `GAME_ALREADY_EXISTS` | Game code already in use |
| `GAME_FULL` | Max players reached |
| `GAME_IN_PROGRESS` | Cannot join active game |
| `NOT_HOST` | Action requires host privileges |
| `INVALID_PAYLOAD` | Validation failed |
| `RATE_LIMITED` | Too many requests |
| `AUTH_REQUIRED` | Authentication needed |
| `INTERNAL_ERROR` | Server error |

### Validation Errors

All payloads are validated using Zod schemas. Invalid payloads result in:

```typescript
{
  message: "Invalid request: gameCode: Game code must be alphanumeric",
  code: "VALIDATION_INVALID_PAYLOAD",
  details: {
    gameCode: "Game code must be alphanumeric"
  }
}
```

---

## Rate Limiting

Socket events are rate limited per connection:
- **150 messages** per 10 seconds per socket
- **500 messages** per 10 seconds per IP
- Exceeding limits triggers 60-second block

Rate limit exceeded triggers:
```typescript
socket.emit('rateLimited')
```

---

## Best Practices

1. **Always handle errors**: Listen for 'error' event
2. **Use acknowledgements**: For critical operations, use callback-style acks
3. **Implement reconnection**: Handle 'disconnect' and attempt reconnection
4. **Validate client-side**: Validate before emitting to reduce server load
5. **Debounce rapid events**: Especially for typing/presence updates

```typescript
// Example: Proper error handling
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
  if (error.code === 'GAME_NOT_FOUND') {
    // Handle specific error
    router.push('/');
  }
});

// Example: Reconnection handling
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, attempt manual reconnect
    socket.connect();
  }
});
```
