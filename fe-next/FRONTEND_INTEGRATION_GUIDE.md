# Frontend Integration Guide - Late Joiner & Spectator Feature

## Components Created ✅

1. **LateJoinerWelcome.tsx** - Welcome dialog for mid-game joiners
2. **LateJoinerBadge.tsx** - Visual badge indicator

## Integration Steps

### Step 1: Update Multiplayer Page (`app/[locale]/multiplayer/page.tsx`)

Add these state variables and socket handlers:

```typescript
// Add to existing state
const [isSpectator, setIsSpectator] = useState(false);
const [isLateJoiner, setIsLateJoiner] = useState(false);
const [showLateJoinerWelcome, setShowLateJoinerWelcome] = useState(false);
const [spectators, setSpectators] = useState<GameUser[]>([]);

// Add socket event handlers (inside setupSocketListeners or similar)

// Handle joining as spectator
socket.on('joinedAsSpectator', (data) => {
  setIsSpectator(true);
  setGameCode(data.gameCode);
  setRoomName(data.roomName);
  setGameLanguage(data.language);

  toast.info(t('spectator.youAreSpectating'));
});

// Handle spectator list updates
socket.on('spectatorList', (data) => {
  setSpectators(data.spectators || []);
});

// Handle spectator upgrade to player
socket.on('spectatorUpgraded', (data) => {
  if (data.success && data.username === username) {
    setIsSpectator(false);
    setIsActive(true);
    setUsers(data.users);

    // Show welcome dialog if joining mid-game
    if (data.lateJoin) {
      setIsLateJoiner(true);
      setShowLateJoinerWelcome(true);
    }

    toast.success(t('spectator.upgraded'));
  }
});

// Update existing 'startGame' handler to detect late join
socket.on('startGame', (data) => {
  // ... existing code ...

  // Check if this is a late join
  if (data.lateJoin) {
    setIsLateJoiner(true);
    setShowLateJoinerWelcome(true);
  }

  // ... rest of existing code ...
});

// Function to request upgrade from spectator to player
const handleUpgradeToPlayer = () => {
  if (!socket || !gameCode) return;
  socket.emit('upgradeToPlayer', { gameCode });
};
```

### Step 2: Update WaitingScreen Component

Add spectator UI to `components/game/WaitingScreen.tsx`:

```typescript
// Add to WaitingScreenProps interface
interface WaitingScreenProps {
  // ... existing props ...
  isSpectator?: boolean;
  spectators?: GameUser[];
  onUpgradeToPlayer?: () => void;
  playerCount?: number;
  maxPlayers?: number;
}

// Inside WaitingScreen component, add spectator banner
const WaitingScreen: React.FC<WaitingScreenProps> = ({
  // ... existing props ...
  isSpectator = false,
  spectators = [],
  onUpgradeToPlayer,
  playerCount = 0,
  maxPlayers = 8,
}) => {
  const { t } = useLanguage();

  // Calculate if slots are available
  const slotsAvailable = maxPlayers - playerCount;
  const canJoinGame = isSpectator && slotsAvailable > 0;

  // Add spectator banner at the top of the component (after room code)
  return (
    <div className="...">
      {/* Spectator Banner */}
      {isSpectator && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-orange border-3 border-neo-black rounded-neo p-4 shadow-hard mb-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-bold text-neo-black mb-1">
                {t('spectator.watching')}
              </div>
              <div className="text-xs text-neo-black/70">
                {t('spectator.roomFull', { current: playerCount, max: maxPlayers })}
              </div>
              {slotsAvailable > 0 && (
                <div className="text-xs text-neo-black/70 mt-1">
                  {slotsAvailable === 1
                    ? t('spectator.slotAvailable', { count: slotsAvailable })
                    : t('spectator.slotsAvailable', { count: slotsAvailable })
                  }
                </div>
              )}
            </div>
            <Button
              onClick={onUpgradeToPlayer}
              disabled={!canJoinGame}
              className={`${
                canJoinGame
                  ? 'bg-neo-yellow hover:bg-neo-yellow/90'
                  : 'bg-gray-400 cursor-not-allowed'
              } border-3 border-neo-black`}
            >
              {t('spectator.joinGame')}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Show spectators list if any */}
      {spectators.length > 0 && !isSpectator && (
        <div className="bg-neo-cream/50 border-3 border-neo-black rounded-neo p-3 mb-4">
          <div className="text-xs font-bold text-neo-black/70 mb-2">
            👀 {spectators.length} Spectator{spectators.length !== 1 ? 's' : ''} Watching
          </div>
          <div className="flex flex-wrap gap-2">
            {spectators.map((spec, idx) => (
              <div key={idx} className="text-xs text-neo-black/60">
                {spec.username}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ... rest of existing WaitingScreen code ... */}
    </div>
  );
};
```

### Step 3: Integrate Components in Multiplayer Page

Add these components to your render:

```typescript
// In your multiplayer page component
import LateJoinerWelcome from '@/components/LateJoinerWelcome';
import LateJoinerBadge from '@/components/game/LateJoinerBadge';

// In the return/render section
return (
  <div>
    {/* Late Joiner Welcome Dialog */}
    {showLateJoinerWelcome && (
      <LateJoinerWelcome
        isOpen={showLateJoinerWelcome}
        onClose={() => setShowLateJoinerWelcome(false)}
        timeRemaining={remainingTime || 0}
        topPlayers={leaderboard.slice(0, 3).map(entry => ({
          username: entry.username,
          score: entry.score
        }))}
      />
    )}

    {/* Update WaitingScreen to include spectator props */}
    {gameState === 'waiting' && (
      <WaitingScreen
        gameCode={gameCode}
        gameLanguage={gameLanguage}
        playersReady={users}
        username={username}
        isHost={isHost}
        isSpectator={isSpectator}
        spectators={spectators}
        onUpgradeToPlayer={handleUpgradeToPlayer}
        playerCount={Object.keys(users).length}
        maxPlayers={8} // or get from constants
        shufflingGrid={shufflingGrid}
        highlightedCells={highlightedCells}
        showQR={showQR}
        setShowQR={setShowQR}
        onExitRoom={handleExitRoom}
        gameSettings={isHost ? <GameSettings /> : null}
      />
    )}

    {/* Add Late Joiner Badge in player list or next to username */}
    {isLateJoiner && <LateJoinerBadge autoHideAfterMs={30000} />}

    {/* ... rest of your component ... */}
  </div>
);
```

### Step 4: Update Player Leaderboard to Show Badge

In your leaderboard component (or wherever you show the current player's name):

```typescript
// Example in InGameScreen or Leaderboard component
{leaderboard.map((entry, index) => (
  <div key={entry.username} className="flex items-center gap-2">
    <span>{entry.username}</span>

    {/* Show late joiner badge next to username */}
    {entry.username === username && isLateJoiner && (
      <LateJoinerBadge
        autoHideAfterMs={30000}
        onFirstWord={() => setIsLateJoiner(false)}
      />
    )}

    <span>{entry.score}</span>
  </div>
))}
```

### Step 5: Hide Badge on First Word Submission

In your word submission handler:

```typescript
// In your submitWord or handleWordSubmit function
const handleWordSubmit = (word: string) => {
  // ... existing submission logic ...

  // Hide late joiner badge on first word
  if (isLateJoiner) {
    setIsLateJoiner(false);
    // or call the badge hide method
    if ((window as any).__hideLateJoinerBadge) {
      (window as any).__hideLateJoinerBadge();
    }
  }
};
```

## Quick Copy-Paste Integration

### For `app/[locale]/multiplayer/page.tsx`:

1. **Add imports:**
```typescript
import LateJoinerWelcome from '@/components/LateJoinerWelcome';
import LateJoinerBadge from '@/components/game/LateJoinerBadge';
```

2. **Add state:**
```typescript
const [isSpectator, setIsSpectator] = useState(false);
const [isLateJoiner, setIsLateJoiner] = useState(false);
const [showLateJoinerWelcome, setShowLateJoinerWelcome] = useState(false);
const [spectators, setSpectators] = useState<GameUser[]>([]);
```

3. **Add socket handlers** (find your socket setup and add these):
```typescript
socket.on('joinedAsSpectator', (data) => {
  setIsSpectator(true);
  setGameCode(data.gameCode);
  setRoomName(data.roomName);
  toast.info(t('spectator.youAreSpectating'));
});

socket.on('spectatorList', (data) => {
  setSpectators(data.spectators || []);
});

socket.on('spectatorUpgraded', (data) => {
  if (data.success && data.username === username) {
    setIsSpectator(false);
    setIsActive(true);
    if (data.lateJoin) {
      setIsLateJoiner(true);
      setShowLateJoinerWelcome(true);
    }
    toast.success(t('spectator.upgraded'));
  }
});
```

4. **Add upgrade function:**
```typescript
const handleUpgradeToPlayer = () => {
  if (!socket || !gameCode) return;
  socket.emit('upgradeToPlayer', { gameCode });
};
```

5. **Update your startGame handler:**
```typescript
// In existing startGame socket handler
if (data.lateJoin) {
  setIsLateJoiner(true);
  setShowLateJoinerWelcome(true);
}
```

## Testing Checklist

- [ ] Player joins full room → becomes spectator
- [ ] Spectator sees "Join Game" button
- [ ] Player leaves → "Join Game" button enables
- [ ] Spectator clicks → becomes active player
- [ ] Late joiner sees welcome dialog
- [ ] Late joiner badge appears
- [ ] Badge auto-hides after 30 seconds
- [ ] Badge hides on first word submission
- [ ] Spectator list shows to active players
- [ ] Translations work in all 4 languages

## File Locations

```
✅ fe-next/components/LateJoinerWelcome.tsx
✅ fe-next/components/game/LateJoinerBadge.tsx
⚠️  fe-next/app/[locale]/multiplayer/page.tsx (needs updates)
⚠️  fe-next/components/game/WaitingScreen.tsx (needs updates)
```

---

**Status:** Backend complete, frontend components created, integration code provided above.
