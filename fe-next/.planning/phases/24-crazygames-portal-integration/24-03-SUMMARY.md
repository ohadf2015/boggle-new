---
phase: 24
plan: 03
subsystem: platform-integration
tags: [crazygames-sdk, lifecycle-tracking, analytics]
status: complete
completed: 2026-01-26

# Dependency Graph
requires:
  - 24-01 # CrazyGames SDK integration
  - 24-02 # Visual consistency fixes
provides:
  - Accurate gameplay lifecycle tracking for CrazyGames
  - Initial download size measurement (gameplayStart marks end of loading)
  - Ad timing infrastructure (ads only during gameplayStop)
affects:
  - 24-04 # Multiplayer invites (uses lifecycle for game state)
  - 24-05 # Ad integration (relies on accurate gameplayStop timing)

# Tech Stack
tech-stack:
  added: []
  patterns:
    - Visibility API for tab pause/resume detection
    - Throttled event triggers (happytime max once per 30s)
    - Dev mode logging for lifecycle debugging

# File Tracking
key-files:
  created: []
  modified:
    - hooks/useCrazyGamesLifecycle.ts # Enhanced with visibility handling, throttling
    - components/views/ResultsPage.tsx # Added gameplayStop on results load
    - components/game/InGameScreen.tsx # Already had lifecycle (verified)
    - components/singleplayer/game/hooks/useSinglePlayerCore.ts # Already had lifecycle (verified)

# Decisions
decisions:
  - id: throttled-happytime
    decision: "Throttle happytime to max once per 30 seconds"
    rationale: "CrazyGames SDK recommendation to avoid spamming happiness events"
    alternatives: ["No throttle", "Per-achievement throttle"]
    impact: "Prevents excessive happytime calls while still celebrating major wins"

  - id: visibility-api-pause
    decision: "Use Visibility API to pause gameplay when tab hidden"
    rationale: "CrazyGames requires gameplayStop when player not actively playing. Tab switch = not playing."
    alternatives: ["No pause on visibility", "Manual tracking"]
    impact: "Accurate gameplay time measurement, better ad timing"

  - id: dev-logging
    decision: "Add dev mode console logging for lifecycle events"
    rationale: "Makes debugging lifecycle issues easier during QA and development"
    alternatives: ["No logging", "Always log"]
    impact: "Helps verify correct lifecycle behavior in CrazyGames QA tool"

# Metrics
duration: 176 # seconds (2m 56s)
metrics:
  tasks_completed: 2/2
  commits: 2
  files_modified: 2
  lines_added: 66
  lines_removed: 2
---

# Phase 24 Plan 03: CrazyGames Lifecycle Integration Summary

**One-liner:** Lifecycle hook with visibility-based pause, throttled happytime, and results-page gameplayStop integration

## What Was Built

Integrated CrazyGames SDK gameplay lifecycle events throughout the application to accurately track when players are actively playing.

**Purpose:** CrazyGames uses `gameplayStart()` / `gameplayStop()` to measure initial download size (assets loaded before first `gameplayStart`). Accurate lifecycle tracking also enables proper ad timing - ads should only show during `gameplayStop` periods.

### Core Components

1. **Enhanced useCrazyGamesLifecycle Hook** (`hooks/useCrazyGamesLifecycle.ts`)
   - Added `isPlaying` state tracking to prevent duplicate calls
   - Implemented Visibility API handling (pause on tab hidden, resume on visible)
   - Throttled `happytime()` to max once per 30 seconds (CrazyGames recommendation)
   - Dev mode logging for debugging lifecycle events
   - Automatic cleanup on component unmount

2. **ResultsPage Integration** (`components/views/ResultsPage.tsx`)
   - Calls `gameplayStop()` when results page loads
   - Triggers `happytime()` for winners (throttled)
   - Ensures results state correctly reports to CrazyGames SDK

3. **Verified Existing Integrations**
   - InGameScreen: Already calls `startGameplay()` when round starts, `stopGameplay()` when round ends ✅
   - useSinglePlayerCore: Already calls `startGameplay()` when timer starts, `stopGameplay()` on game over ✅
   - MultiplayerFlow: Lobby phase (not gameplay) - no lifecycle calls needed ✅

## Technical Implementation

### Lifecycle State Machine

```
IDLE (not started)
  ↓ isGameActive=true
START → gameplayStart() → PLAYING
  ↓ Tab hidden (Visibility API)
  gameplayStop() → PAUSED
  ↓ Tab visible + isGameActive=true
  gameplayStart() → PLAYING
  ↓ isGameOver=true
STOP → gameplayStop() → ENDED
  ↓ unmount
  gameplayStop() (cleanup)
```

### Visibility Handling Pattern

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Tab hidden - pause gameplay
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        gameplayStop();
      }
    } else {
      // Tab visible - resume gameplay (only if game still active)
      if (!isPlayingRef.current && isGameActive && !isGameOver) {
        isPlayingRef.current = true;
        gameplayStart();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [isGameActive, isGameOver, gameplayStart, gameplayStop]);
```

### Throttled Happytime

```typescript
const triggerHappyTimeInternal = useCallback(() => {
  const now = Date.now();
  const timeSinceLastHappyTime = now - lastHappyTimeRef.current;
  const HAPPYTIME_THROTTLE_MS = 30000; // 30 seconds

  if (!hasTriggeredHappyTimeRef.current || timeSinceLastHappyTime >= HAPPYTIME_THROTTLE_MS) {
    hasTriggeredHappyTimeRef.current = true;
    lastHappyTimeRef.current = now;
    happyTime();
    onHappyTime?.();
  }
}, [happyTime, onHappyTime]);
```

## Integration Points

### When gameplayStart() is Called
1. **InGameScreen**: When round timer starts (multiplayer)
2. **useSinglePlayerCore**: When game timer starts (singleplayer/adventure)
3. **Visibility change**: When tab becomes visible (if game was paused and still active)

### When gameplayStop() is Called
1. **InGameScreen**: When round ends or timer reaches 0
2. **useSinglePlayerCore**: When game over (timer ends or practice finished)
3. **ResultsPage**: When results screen mounts
4. **Visibility change**: When tab becomes hidden
5. **Component unmount**: Cleanup if game was active

### When happytime() is Called
1. **Winner**: When player wins a game (ResultsPage)
2. **Score threshold**: Default 100 points (configurable)
3. **Combo threshold**: Default 5x combo (configurable)
4. **Words threshold**: Default 10 words (configurable)
5. **Throttled**: Max once per 30 seconds to avoid spam

## Deviations from Plan

None - plan executed exactly as written.

## Testing Performed

- ✅ `npm run build` passed (no type errors)
- ✅ `npm run lint` passed for all modified files
- ✅ Verified existing integrations still work (InGameScreen, useSinglePlayerCore)
- ✅ Confirmed no duplicate lifecycle calls with state tracking

## Manual Testing Needed

1. **Visibility Change Handling**
   - Start a game
   - Switch to another tab (should call `gameplayStop`)
   - Switch back (should call `gameplayStart`)
   - Check browser console for lifecycle logs (dev mode)

2. **Results Page Integration**
   - Complete a game
   - Verify `gameplayStop` called when results load
   - Win a game - verify `happytime` called

3. **CrazyGames QA Tool**
   - Enable CrazyGames SDK with `NEXT_PUBLIC_CRAZYGAMES_ENABLED=true`
   - Use CrazyGames QA tool to verify:
     - `gameplayStart` called when gameplay begins
     - `gameplayStop` called when gameplay ends
     - No duplicate calls
     - Visibility changes handled correctly

4. **Initial Download Size Measurement**
   - CrazyGames measures initial download size as assets loaded before first `gameplayStart`
   - Verify `gameplayStart` is called at the correct time (when gameplay actually starts, not during loading/lobby)

## Next Phase Readiness

**Ready for 24-04 (Multiplayer Invites)** ✅
- Lifecycle tracking provides game state for invite system
- `isPlaying` state available for invite UI logic
- `happytime` can be triggered on successful invite join

**Ready for 24-05 (Ad Integration)** ✅
- `gameplayStop` periods correctly identified for ad timing
- Midgame ad infrastructure already in hook (`showMidgameAd`)
- Visibility handling ensures ads don't interrupt active gameplay

**Ready for 24-06 (Testing & Polish)** ✅
- Dev mode logging available for QA verification
- Lifecycle state exposed via hook return values
- All integration points documented

## Performance Impact

- **Minimal runtime overhead**: Visibility listener is passive, refs used instead of state
- **No re-render cascades**: State changes only affect lifecycle tracking, not UI
- **Efficient throttling**: Timestamp-based throttling prevents excessive happytime calls

## Known Limitations

1. **Visibility API browser support**: All modern browsers supported, but could fallback gracefully if needed
2. **Background tab throttling**: Browser may throttle timers in background tabs (not an issue since we pause gameplay)
3. **Multiple windows**: Visibility API tracks current tab only (expected behavior)

## Lessons Learned

1. **Existing integrations worked well**: InGameScreen and useSinglePlayerCore already had correct lifecycle calls
2. **Throttling is essential**: Without throttling, rapid wins could spam happytime events
3. **Dev logging crucial**: Makes QA verification much easier with CrazyGames tools
4. **Visibility API is perfect for this**: Clean, standards-based way to detect tab switches

## Related Documentation

- CrazyGames SDK Docs: https://docs.crazygames.com/sdk/html5/#gameplay
- Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- Plan: `.planning/phases/24-crazygames-portal-integration/24-03-PLAN.md`
- Research: `.planning/phases/24-crazygames-portal-integration/24-RESEARCH.md`
