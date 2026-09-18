# Live In-Game Juice + Leaderboard Integration Guide

## Overview

This directory contains components for adding real-time leaderboard updates and in-game celebration effects (juice) to classroom games. The features reuse four shared motion primitives:

- `LeaderboardRowReorder` - Layout-animated rank swaps
- `BoundedConfettiBurst` - Mobile-safe confetti bursts
- `useModeSting` - Mode-specific sound effects
- `PopPressButton` - Neo-brutalist button component

## Components

### LiveClassroomLeaderboard.tsx

Displays a live-updating leaderboard during gameplay with animated rank transitions.

**Props:**
- `players` - Array of `ClassroomLeaderboardEntry` objects, sorted by rank
- `gameMode` - Current game mode ('classic', 'word-hunt', 'blast', 'wheel-rush', 'vocab-quiz')
- `isPlaying` - Whether a round is actively in progress
- `visibility` - Leaderboard visibility mode ('full', 'top3', 'top5', 'personal_only', 'hidden')
- `currentStudentId` - Optional ID to highlight the current player
- `className` - Additional CSS classes

**Example Usage:**
```tsx
<LiveClassroomLeaderboard
  players={formattedPlayerList}
  gameMode="word-hunt"
  isPlaying={gameInProgress}
  visibility="full"
  currentStudentId={currentUserId}
/>
```

### useClassroomGameJuice Hook

Manages in-game celebration effects by listening to Socket.IO events.

**Events Listened To:**
- `correct_answer` - Player answered correctly, triggers sound + confetti
- `score_update` - Score changed, triggers sound
- `round_end` - Round ended, plays celebration sound

**Example Usage:**
```tsx
const {
  recentScorerIds,
  comboPlayers,
  shouldShowConfetti,
  getComboLevel,
} = useClassroomGameJuice({
  socket,
  gameMode: 'classic',
  isPlaying: true,
});
```

## Integration Points

### 1. Teacher's In-Game View (HostView / HostInGameView)

The teacher's projector view should mount the leaderboard during gameplay:

```tsx
import { LiveClassroomLeaderboard } from '@/components/education/classroom-game/LiveClassroomLeaderboard';

// In the game phase rendering:
{gamePhase === 'playing' && (
  <div className="leaderboard-panel">
    <LiveClassroomLeaderboard
      players={playerData}
      gameMode={gameMode}
      isPlaying={true}
      visibility="full"
    />
  </div>
)}
```

### 2. Server-Side Socket Events

The backend game handler needs to emit these events on the game room:

```typescript
// When a student answers correctly:
io.to(roomId).emit('correct_answer', {
  studentId: playerId,
  studentName: playerName,
  points: pointsAwarded,
  comboLevel: currentComboLevel,
  gameMode: gameMode,
});

// When the round ends:
io.to(roomId).emit('round_end', {
  finalScores: playerScores,
});
```

### 3. Student View Integration

For student views, a compact leaderboard can show:

```tsx
<LiveClassroomLeaderboard
  players={playerData}
  gameMode={gameMode}
  isPlaying={true}
  visibility="personal_only"  // Only show self + neighbors
  currentStudentId={studentId}
/>
```

## Data Flow

```
Socket Event (correct_answer)
    ↓
useClassroomGameJuice Hook
    ├── playModeSound() - Mode-specific audio cue
    ├── playCoinCascadeSound() - Combo celebration
    ├── Update state: recentScorerIds
    └── Auto-clear after 800ms
    
LiveClassroomLeaderboard Component
    ├── Listen to playerScores changes
    ├── LeaderboardRowReorder animates rank swaps
    ├── BoundedConfettiBurst wraps score rows
    └── Respects mobile-web constraints (Class 5)
```

## Type Definitions

### ClassroomLeaderboardEntry
```typescript
interface ClassroomLeaderboardEntry {
  id: string;          // Unique student ID
  name: string;        // Display name
  score: number;       // Current score
  wordCount: number;   // Words found / correct answers
  avatar?: any | null; // Avatar config
  rank: number;        // Current rank (1 = first)
}
```

### InGameJuiceEventPayload
```typescript
interface InGameJuiceEventPayload {
  studentId: string;
  studentName: string;
  points: number;
  isCombo?: boolean;
  comboLevel?: number;
  gameMode: ClassroomGameMode;
}
```

## Localization

The component uses these translation keys (with fallbacks):

- `tvBroadcast.leaderboard` → "Leaderboard"
- `multiplayer.noPlayers` → "No players yet"

To add native translations, update `/translations/[locale].js` for all 6 locales:
- en.js, he.js, sv.js, ja.js, es.js, ru.js

## Testing

Run tests with:
```bash
npm run test:frontend -- components/education/classroom-game/__tests__/
```

Tests cover:
- ✓ Leaderboard rendering and rank reordering
- ✓ Confetti triggering and auto-clearing
- ✓ Sound effects on score changes
- ✓ Combo level tracking
- ✓ Mobile-web confetti blocking

## Constraints (from .claude/rules/60-recurring-pitfalls.md)

**Class 5 - Mobile-web flash from native-only gates:**
- ✓ BoundedConfettiBurst skips full-screen confetti on mobile web
- ✓ Dark-only surfaces use `bg-neo-navy` hardcoded (no theme-responsive pair)
- ✓ No entrance opacity tweens on large mobile layers

**Class 3 - Asymmetric paths:**
- ✓ Both teacher and student views use the same leaderboard component
- ✓ Socket event handlers carry full player data atomically

**Class 4 - Silent failure:**
- ✓ Console errors logged if socket events fail
- ✓ Graceful degradation if confetti is blocked

## Future Enhancements

- [ ] Animate score pop-ups inline with leaderboard entries
- [ ] Add "momentum ticker" showing recent scoring trends
- [ ] Integrate team battle indicators (team colors, team scores)
- [ ] Add sound mute/volume control in settings
- [ ] Support for accessibility-mode reduced animations
