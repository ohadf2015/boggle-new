# Root Cause Analysis: Word Hunt Yellow Letter Removal When Green Found

**Date:** 2026-01-19
**Issue:** Yellow letters should be removed from wrong location display when found in correct position
**Severity:** Low (Potential UX misunderstanding or edge case)
**Status:** Analysis Complete - Working As Designed

## Issue Summary

**User Description:**
> "when right letter has been found in word hunt (for example t) the letter t should be removed if it was in the wrong location letters array (unless there are 2 t letters in the word and only one has been found)"

**Interpreted Request:**
When a letter that was previously shown as "wrong location" (yellow) is later found in the correct position (green), that letter should be removed from the "wrong location" display - UNLESS the target word contains multiple instances of that letter and not all have been found yet.

**Expected Behavior:**
1. Target: "CASTLE" (T appears once at position 3)
2. Guess 1: "TXXXXX" → T at position 0 is yellow (exists in word, wrong position)
3. T appears in "Wrong spot:" indicator
4. Guess 2: "CASTLE" → T at position 3 is green (correct position)
5. **Expected:** T is REMOVED from "Wrong spot:" indicator

**Duplicate Letter Handling:**
1. Target: "APPLE" (P appears twice at positions 1 and 2)
2. Guess 1: "PXXXX" → P at position 0 is yellow
3. P appears in "Wrong spot:" indicator
4. Guess 2: "XPXXX" → P at position 1 is green (found ONE P)
5. **Expected:** P STAYS in "Wrong spot:" (still one P to find)
6. Guess 3: "XPPXX" → P at positions 1 and 2 are green (found BOTH Ps)
7. **Expected:** P is REMOVED from "Wrong spot:" indicator

## Reproduction

**Can Reproduce:** Yes - Implementation matches expected behavior

**Verification Steps:**
1. All 3 tests in `SurvivalClueBoxes.yellowRemoval.test.tsx` pass
2. All 10 tests in `useSurvivalClues.test.ts` pass
3. Code analysis confirms correct implementation

**Test Results:**
```bash
npm run test:frontend -- --testPathPattern="yellowRemoval"
# PASS - 3/3 tests

npm run test:frontend -- --testPathPattern="useSurvivalClues"
# PASS - 10/10 tests
```

## Analysis

### Related Files

**1. Display Logic - HintBoxes Component:**
- `components/daily/survival/SurvivalClueBoxes.tsx` (lines 235-287)
- `persistedLetters` useMemo handles yellow letter removal
- Three-pass algorithm:
  1. Collect all green and yellow letters from attempts
  2. Count green occurrences of each letter
  3. Remove yellow letters where greenCount >= targetCount

**2. State Management - useSurvivalClues Hook:**
- `components/daily/survival/useSurvivalClues.ts` (lines 60-112)
- `updateCluesFromFeedback()` manages `knownLetters` Set
- Lines 103-108 remove letters from knownLetters when all greens found

**3. Feedback Generation:**
- `utils/wordHuntFeedback.ts` - generates green/yellow/gray feedback

### Code Flow

```
User Submits Word
    ↓
getLetterFeedback() → LetterFeedback[] (green/yellow/gray)
    ↓
handleTargetAttempt() → dispatch(ADD_ATTEMPT)
    ↓
updateCluesFromFeedback(feedback, allAttempts)
    ├─ Updates accumulatedClues (green positions only)
    └─ Updates knownLetters (lines 79-111)
        ├─ Line 82-90: Count greens from ALL attempts
        ├─ Line 92-101: Add yellow letters if targetCount > greenCount
        └─ Line 103-108: REMOVE letters where greenCount >= targetCount
    ↓
SurvivalClueBoxes re-renders
    ├─ HintBoxes uses persistedLetters (lines 238-287)
    │   └─ Removes yellow when greenCount >= targetCount
    └─ KnownLettersDisplay uses knownLetters Set
```

### Key Implementation (useSurvivalClues.ts lines 103-108)

```typescript
allGreenCounts.forEach((greenCount, letter) => {
  const targetCount = targetLetterCounts.get(letter) || 0;
  if (greenCount >= targetCount) {
    updated.delete(letter);  // Remove from knownLetters
  }
});
```

### Key Implementation (SurvivalClueBoxes.tsx lines 267-284)

```typescript
// Third pass: remove yellow letters where all occurrences are now found as green
const positionsToRemove: number[] = [];
result.forEach((entry, position) => {
  if (entry.type === 'yellow') {
    const letter = entry.letter;
    const targetCount = targetLetterCounts.get(letter) || 0;
    const greenCount = greenLetterCounts.get(letter) || 0;
    // If all occurrences of this letter are accounted for by green clues, remove yellow
    if (greenCount >= targetCount) {
      positionsToRemove.push(position);
    }
  }
});
positionsToRemove.forEach(pos => result.delete(pos));
```

## Root Cause Finding

**FINDING: The implementation is CORRECT and matches the expected behavior.**

The yellow letter removal logic is working as the user described:
1. ✅ Yellow letters are removed when all occurrences are found as green
2. ✅ Yellow letters STAY when not all occurrences are found (duplicate handling)
3. ✅ Tests explicitly verify this behavior

### Verified Test Cases

**Test 1:** `should remove yellow letter from clue box when letter is found in correct position`
- Target: APPLE (2 P's)
- Guess 1: PXXXX → yellow P
- Guess 2: XPPXX → green P at positions 1 and 2
- Result: Yellow P at position 0 is REMOVED ✅

**Test 2:** `should keep yellow letter when not all occurrences are found as green`
- Target: APPLE (2 P's)
- Guess 1: PXXXX → yellow P
- Guess 2: XPXXX → green P at position 1 only
- Result: Yellow P STAYS because one P still missing ✅

**Test 3:** `should remove yellow letter when single occurrence is found as green`
- Target: APPLE (1 A)
- Guess 1: XAXXX → yellow A
- Guess 2: AXXXX → green A at position 0
- Result: Yellow A is REMOVED ✅

## Potential User Confusion Sources

If the user is experiencing issues, possible causes:

### 1. Visual Timing
The feedback overlay shows for 3 seconds. The user might be looking at the overlay (which shows the raw feedback) and not noticing the state change in the HintBoxes after it dismisses.

### 2. Landscape Mode
Previous RCA found landscape mode had inconsistencies. Verify landscape layout also implements yellow removal correctly.

### 3. Different Counting Methods
The code counts greens from ALL attempts (including duplicates from guessing same position multiple times). This is technically correct but could lead to unexpected behavior if user guesses the same green position multiple times.

### 4. State Not Updated
If the user sees stale state, it could be a React re-render issue or the state update not happening correctly.

## Recommendations

### If User Confirms Issue Still Exists:

1. **Request Reproduction Video:**
   - What device/orientation?
   - What language (English/Hebrew)?
   - Exact sequence of guesses and target word?

2. **Check Production Deployment:**
   - Verify latest code is deployed
   - Check for console errors

3. **Add Debug Logging:**
   ```typescript
   // Temporarily add to updateCluesFromFeedback
   console.log('Yellow removal check:', {
     letter,
     targetCount: targetLetterCounts.get(letter),
     greenCount: allGreenCounts.get(letter),
     willRemove: greenCount >= targetCount
   });
   ```

### If This Is a Feature Request:

The current implementation appears to be working correctly. If the user wants different behavior, clarify what specific scenario is not working.

## Test Coverage

**Existing Tests Verify Correct Behavior:**

| Test File | Tests | Status |
|-----------|-------|--------|
| SurvivalClueBoxes.yellowRemoval.test.tsx | 3 | ✅ PASS |
| useSurvivalClues.test.ts | 10 | ✅ PASS |
| SurvivalClueBoxes.yellowPersistence.test.tsx | 7 | ✅ PASS |

## Prevention Measures

1. ✅ Extensive test coverage already exists
2. ✅ Tests explicitly verify the described behavior
3. ✅ Both display logic and state logic are tested

## Next Steps

1. **Clarify with User:**
   - Ask for specific reproduction steps
   - Request video showing the issue
   - Determine if this is a bug or misunderstanding

2. **If Bug Confirmed:**
   - Add more detailed logging
   - Create reproducible test case
   - Fix the specific edge case

3. **If Working As Designed:**
   - Mark issue as resolved
   - Consider adding user-facing documentation about how yellow letters work

---

**RCA Status:** Bug Found and Fixed

**Root Cause:** Stale closure bug in `updateKnownLettersFromDiscovery`. When discovering words on the board, the function read `accumulatedClues` from state closure, which was stale because React batches state updates. This caused letters to be incorrectly re-added to `knownLetters` after being removed.

**The Bug Flow:**
1. User guesses TASTE against STYLE → T and S added to knownLetters (yellow)
2. User discovers word "STY" on board → should add green clues AND remove T,S from knownLetters
3. `updateCluesFromDiscovery("STY")` runs → adds S,T,Y as green, removes T,S from knownLetters
4. `updateKnownLettersFromDiscovery("STY")` runs → reads STALE accumulatedClues (no greens yet), RE-ADDS T,S to knownLetters
5. Final state: T,S still in knownLetters (BUG!)

**The Fix:**
Combined all logic into `updateCluesFromDiscovery` which now handles:
1. Adding green clues for position matches
2. Adding known letters (yellow-equivalent) for letters that exist but wrong position
3. Cleaning up knownLetters when all occurrences are found as green

The function computes fresh green counts INTERNALLY (combining `accumulatedClues` state + `newGreensFromWord`) to avoid stale closure issues.

**Files Changed:**
- `components/daily/survival/useSurvivalClues.ts` - Fixed `updateCluesFromDiscovery` to handle all knownLetters updates with fresh data
- `components/daily/survival/useSurvivalGameLogic.ts` - Removed redundant call to `updateKnownLettersFromDiscovery`

**Test Added:**
- "should remove letter from knownLetters when discovery reveals all greens for that letter" - reproduces exact STYLE/TASTE/STY scenario

## Files Referenced

- `components/daily/survival/SurvivalClueBoxes.tsx` (lines 235-287)
- `components/daily/survival/useSurvivalClues.ts` (lines 60-112)
- `components/daily/survival/__tests__/SurvivalClueBoxes.yellowRemoval.test.tsx`
- `components/daily/survival/__tests__/useSurvivalClues.test.ts`
- `utils/wordHuntFeedback.ts`
