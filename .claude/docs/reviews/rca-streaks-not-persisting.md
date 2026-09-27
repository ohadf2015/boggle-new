# Root Cause Analysis: Streaks Not Persisting for Players

**Date:** 2026-01-19
**Issue:** Streaks not persisting for players
**Severity:** High (affects user engagement and retention)
**Status:** In Progress - Requires User Clarification

## Issue Summary

**Description:**
All streak types (Win Streaks, Daily Streaks, Login Streaks) are reported to not increment for players.

**Expected Behavior:**
- Win Streaks: Should increment when player wins (beats all bots) in solo-bots or challenge mode
- Daily Streaks: Should increment when player completes Word Hunt daily challenge (authenticated users only)
- Login Streaks: Should increment when player logs in on consecutive days (authenticated users only)

**Actual Behavior:**
Streaks reportedly do not increment.

**Impact:**
- Affected users: Potentially all players
- Affected features: Win streaks, Daily streaks, Login streaks
- Severity: High - Streaks are a key retention mechanism

## Streak System Architecture

The codebase has **three independent streak systems**:

| Streak Type | Storage | Trigger | Authentication Required |
|-------------|---------|---------|------------------------|
| **Win Streaks** | localStorage only | `recordWin()` when `isWinner && mode !== 'practice'` | No |
| **Daily Streaks** | localStorage + Supabase | `updateDailyStreak()` when completing Word Hunt | Yes |
| **Login Streaks** | Supabase only | `recordLogin()` socket event | Yes |

### Key Files

- **Win Streaks:** `/fe-next/hooks/useWinStreak.ts`
- **Win Streak Tracking:** `/fe-next/components/singleplayer/results/hooks/useWinStreakTracking.ts`
- **Daily Streaks:** `/fe-next/utils/dailyChallenge/streaks.ts`
- **Login Streaks:** `/fe-next/backend/modules/engagementManager.ts`

## Analysis

### Potential Cause 1: Win Condition Not Met

**Win Streaks** only increment when `isWinner === true`.

```typescript
// useResultsData.ts:106
const isWinner = playerRank === 1;
```

`isWinner` is `true` only when the player has the **highest score** among all participants (including bots). If the player doesn't beat all bots, the streak won't increment.

**Likelihood:** Medium - User may not be winning games

### Potential Cause 2: Authentication State

**Daily Streaks** and **Login Streaks** require authentication:

```typescript
// storage.ts:153
if (isAuthenticated) {
  return updateDailyStreak(today);
}
// Return empty streak for anonymous users
return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
```

**Likelihood:** High - Anonymous users won't see streaks increment

### Potential Cause 3: Timezone Date Comparison Issue (Win Streaks)

Win streaks use **local timezone** for date comparison:

```typescript
// useWinStreak.ts:49-53
const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); // LOCAL timezone
  return isSameDay(date, yesterday);
};
```

But `lastWinDate` is stored as UTC ISO string: `new Date().toISOString()`

When parsing:
- `new Date("2024-01-01T23:00:00.000Z")` in UTC+5 = Jan 2 locally
- This could cause date mismatch across timezones

**Likelihood:** Low-Medium - Only affects edge cases around midnight

### Potential Cause 4: Streak Broken Detection

On initial load, if streak is detected as "broken", it's reset to 0:

```typescript
// useWinStreak.ts:201-208
useEffect(() => {
  const data = getStoredStreakData();
  if (data.streakBroken) {
    saveStreakData({ currentStreak: 0 }); // Saves 0!
    data.currentStreak = 0;
  }
  setStreakData(data);
  setIsLoaded(true);
}, []);
```

If the date comparison in `isYesterday` fails (returns false when it should be true), the streak will be incorrectly marked as broken.

**Likelihood:** Medium - Depends on timezone and time of play

### Potential Cause 5: Practice Mode

Win streaks are **not tracked** in practice mode:

```typescript
// useWinStreakTracking.ts:58
if (mode === 'practice') return;
```

**Likelihood:** Medium - User may be playing practice mode

### Potential Cause 6: Socket Event Not Triggered

Login streaks depend on the `engagement:recordLogin` socket event being emitted. If the client doesn't send this event, login streaks won't update.

**Likelihood:** Unknown - Need to verify socket event flow

## Reproduction Attempts

**Unable to fully reproduce** without more information about:
1. Which specific streak type(s) are affected
2. What game mode the user is playing
3. Whether the user is authenticated
4. The user's timezone
5. When the streak should have incremented vs when it was checked

## Questions for Clarification

1. **Which streak type is affected?**
   - Win streaks (after winning games)?
   - Daily streaks (after completing Word Hunt)?
   - Login streaks (when logging in)?

2. **What is the user's authentication status?**
   - Are they signed in with an account?
   - Or playing as anonymous/guest?

3. **For win streaks: Is the player actually winning?**
   - Beating all bots to get rank #1?
   - What game mode (solo-bots, challenge, practice)?

4. **What is the observed behavior?**
   - Streak stays at 0?
   - Streak stays at 1 (never increments past 1)?
   - Streak resets to 1 after each game?

5. **When does the issue occur?**
   - Immediately after winning?
   - After refreshing the page?
   - After closing and reopening the browser?

## Proposed Investigation Steps

### Step 1: Verify Win Condition
- Add console logging in `useWinStreakTracking` to confirm:
  - `isWinner` value
  - `mode` value
  - Whether `recordWin()` is being called

### Step 2: Verify localStorage State
- Check browser DevTools → Application → Local Storage
- Look for keys:
  - `lexiclash_win_streak`
  - `lexiclash_streak_date`
  - `lexiclash_best_streak`
  - `lexiclash_daily_streak`

### Step 3: Verify Date Comparison Logic
- Add logging to `isYesterday` function to see:
  - What `lastDate` is being compared
  - What `yesterday` is calculated as
  - Whether comparison returns true/false

### Step 4: Test Authentication Flow
- Verify `isAuthenticated` state in `DailyChallenge` component
- Check if `saveWordHuntResult` is called with correct auth state

## Fix Options (Once Root Cause Confirmed)

### Option 1: Fix Timezone Handling (if timezone is the issue)

**Approach:** Standardize all date comparisons to UTC

```typescript
// Use UTC for all comparisons
const isSameDayUTC = (date1: Date, date2: Date): boolean => {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
};

const isYesterdayUTC = (date: Date): boolean => {
  const today = new Date();
  const yesterday = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 1
  ));
  return isSameDayUTC(date, yesterday);
};
```

**Pros:** Consistent behavior across timezones
**Cons:** Requires careful testing, may change behavior for existing users
**Risk:** Medium

### Option 2: Add Debug Logging (Investigation)

**Approach:** Add comprehensive logging to streak functions

**Pros:** Helps identify exact failure point
**Cons:** Temporary solution, doesn't fix root cause
**Risk:** Low

### Option 3: Refactor to Unified Streak System

**Approach:** Create a single streak management system with consistent date handling

**Pros:** Eliminates inconsistencies between three systems
**Cons:** Significant refactoring effort
**Risk:** High

## Recommended Next Step

Before implementing any fix, we need to **clarify the exact reproduction scenario** with the user:

1. Authentication status
2. Game mode being played
3. Whether player is actually winning
4. Specific localStorage state before/after

## Testing Strategy

Once root cause is identified:

1. **Unit tests:** Verify date comparison logic with various timezones
2. **Integration tests:** Verify streak increment flow end-to-end
3. **Manual testing:** Test in different timezones/scenarios
4. **Regression tests:** Ensure existing streak users aren't affected

## Prevention Measures

1. **Add monitoring:** Log streak operations to detect anomalies
2. **Add tests:** Cover timezone edge cases in date comparison
3. **Standardize:** Use consistent date handling across all streak systems
4. **Documentation:** Document expected behavior for each streak type

## Next Steps

1. Await user clarification on specific scenario
2. Reproduce the issue locally
3. Add debug logging to narrow down root cause
4. Implement targeted fix
5. Test fix thoroughly
6. Deploy and monitor

## UPDATE: Root Cause Identified

Based on the symptom "always shows 1, never shows more than 1", the root cause is:

### Primary Cause: Non-Consecutive Wins

Win streaks track **winning days**, not playing days. The streak only increments when:
1. User WINS (beats all bots, rank #1)
2. User won YESTERDAY (consecutive days of winning)

The typical failure pattern:
1. Day N: User wins → streak = 1
2. Day N+1: User plays but **doesn't win** (rank #2+) → no `recordWin()` called
3. Day N+2: User opens app → streak detected as broken (gap > 1 day since last **WIN**)
4. Day N+2: User wins → streak = 1 (starts fresh)

### Code Flow Analysis

```typescript
// useWinStreak.ts:238-244
if (currentData.isStreakActive && !currentData.streakBroken) {
  // Continuing streak - ONLY happens if last WIN was today or yesterday
  newStreak = currentData.currentStreak + 1;
} else {
  // Starting new streak - happens if gap > 1 day since last WIN
  newStreak = 1;
}
```

### Diagnostic Logging Added

Added debug logging to `useWinStreak.ts` that will appear in browser console (development mode only):
- `[WinStreak] getStoredStreakData date check` - Shows date comparison details
- `[WinStreak] recordWin called` - Shows current state when win is recorded
- `[WinStreak] Continuing streak` or `[WinStreak] Starting new streak` - Shows decision

### Recommended Actions

1. **For immediate diagnosis**: Run the app in development mode, open browser console, and observe the `[WinStreak]` logs when playing games.

2. **Potential UX improvement**: Consider adding a visual indicator that explains:
   - "Win streaks track consecutive days of WINNING, not just playing"
   - "You need to beat all bots to continue your streak"

3. **Alternative feature consideration**: If the desired behavior is to track "play streaks" (consecutive days of playing), that would require a different implementation.

### Verification Steps

To verify this is the correct root cause:
1. Run `npm run dev`
2. Open browser DevTools → Console
3. Play and WIN a game (beat all bots)
4. Check console for `[WinStreak] Continuing streak: X → Y` (if previous win was yesterday)
5. Or `[WinStreak] Starting new streak` (if gap > 1 day or first win)

---

## UPDATE 2: Enhanced Diagnostic Logging (2026-01-19)

### Additional Investigation Performed

Based on user feedback that more investigation was needed, additional diagnostic logging has been added:

#### 1. Raw localStorage State Logging

Added `debugLogLocalStorage()` function in `useWinStreak.ts` that logs:
- All streak-related localStorage keys and their raw values
- Current time in both ISO and local string formats
- Called at key points: `getStoredStreakData()` entry and after `saveStreakData()`

#### 2. Player Rank Logging

Added logging in `useResultsData.ts` to show:
- Player's score vs all bot scores
- Complete sorted participant list with ranks
- Whether player is winner (`isWinner` value)

Console output example:
```
[ResultsData] Player rank calculation {
  playerScore: 45,
  botScores: [{name: 'Easy Bot', score: 32}, ...],
  allParticipantsSorted: [{rank: 1, name: 'You', score: 45, isPlayer: true}, ...],
  playerRank: 1,
  isWinner: true
}
```

#### 3. Full Logging Flow

When a user wins, the console will now show:
1. `[ResultsData] Player rank calculation` - Shows if player actually won
2. `[WinStreak] getStoredStreakData called - Raw localStorage state` - Shows stored data
3. `[WinStreak] getStoredStreakData date check` - Shows date comparison
4. `[WinStreakTracking] Recording win` - Shows tracking hook state
5. `[WinStreak] recordWin called` - Shows recordWin() entry point
6. `[WinStreak] Continuing streak: X → Y` OR `[WinStreak] Starting new streak` - Shows decision
7. `[WinStreak] After saveStreakData in recordWin` - Shows saved data
8. `[WinStreakTracking] Calculated new streak` - Shows final display value

### Date Logic Verified

Created comprehensive unit tests in `/fe-next/hooks/__tests__/useWinStreak.date-logic.test.ts`:
- 14 tests covering `isSameDay()` and `isYesterday()` functions
- Tests for month boundaries, year boundaries, late night/early morning edge cases
- All 14 tests PASS ✅

### Code Analysis Summary

After deep code analysis, the streak logic appears correct:

1. **Initial load**: `getStoredStreakData()` reads localStorage, computes `isStreakActive` and `streakBroken`
2. **Win detection**: `useWinStreakTracking` only calls `recordWin()` when `isWinner === true`
3. **Streak continuation**: `recordWin()` continues streak if `isStreakActive && !streakBroken`
4. **Race condition protected**: `isLoaded` flag prevents premature win recording

### Remaining Hypotheses

1. **User not actually winning**: Player must beat ALL bots (rank #1) to record a win
2. **Skip days without realizing**: User might think they're playing daily but missing days
3. **Browser localStorage issues**: Private browsing mode, cleared storage, multiple devices
4. **Multiple same-day wins**: Streak only increments once per day, not per win

### How to Verify Root Cause

**For developers/testers:**
1. Run `npm run dev`
2. Open browser DevTools → Console
3. Filter by `[WinStreak]` or `[ResultsData]`
4. Play a game and observe the full log trail
5. Verify:
   - Is `isWinner: true`?
   - Is `isStreakActive: true`?
   - Does `Continuing streak` message appear?

**For production diagnosis:**
Consider temporarily enabling these logs in production (with user opt-in) to capture real user scenarios.

---

**RCA Status:** Enhanced Diagnostics Added - Awaiting Real-World Verification
