# Root Cause Analysis: Daily Word Hunt - Different Length Word Yellow Letter Display

**Date:** 2026-01-18
**Issue:** Yellow letters from shorter/longer words don't appear in hint boxes
**Severity:** Medium (UX/Feature gap - not a bug in existing logic)
**Status:** In Progress

## Issue Summary

**User Description:**
> "daily challenge word hunt still not working well. example for the bug: select the word cat on the board. the letter t is right but should be on the second space. right now it only shows the letter in the section below the boxes that says wrong place letters but it doesnt show in the boxes (at least until that letter is found in the right place)"

**Expected Behavior (User's Expectation):**
When guessing "CAT" where "T" exists in the target word but at a different position:
1. "T" should appear in the hint boxes (somewhere)
2. "T" should persist until replaced by a green clue

**Actual Behavior:**
When guessing "CAT" against a 5-letter target:
1. "T" appears in "Wrong spot" section below the boxes ✅
2. "T" does NOT appear in the hint boxes ❌

## Reproduction

**Can Reproduce:** Yes

**Reproduction Steps:**
1. Start a Daily Word Hunt game with 5-letter target (e.g., "TIGER")
2. Guess a shorter word like "CAT" (3 letters) that contains "T"
3. Observe feedback overlay shows "T" with yellow coloring
4. After overlay dismisses:
   - ✅ "T" appears in "Wrong spot" section below boxes
   - ❌ "T" does NOT appear in any hint box

**Why This Happens:**
When guessed word length ≠ target word length:
- Only `handleWordDiscovery()` is called
- `handleTargetAttempt()` is **NOT** called
- Therefore, no entry is added to `attempts` array
- `persistedLetters` logic iterates over `attempts` (which is empty for different-length words)
- Yellow letters only go to `knownLetters` (displayed in "Wrong spot" section)

## Analysis

### Related Files

**Word Submission Flow:**
- `components/daily/survival/useSurvivalGameLogic.ts`
  - Lines 469-490: Word submission handler
  - Key logic at lines 487-489: Different-length words ONLY call `handleWordDiscovery`

**Clue Boxes Display:**
- `components/daily/survival/SurvivalClueBoxes.tsx`
  - Lines 188-209: `persistedLetters` useMemo iterates over `attempts`
  - Only shows letters from words that were processed as target attempts

**Known Letters Management:**
- `components/daily/survival/useSurvivalClues.ts`
  - Lines 156-195: `updateKnownLettersFromDiscovery()` adds letters to `knownLetters`
  - This is what populates the "Wrong spot" section

### Code Flow - Current Behavior

```
User submits "CAT" (3 letters) against 5-letter target
   ↓
useSurvivalGameLogic.handleWordSubmit()
   ↓
normalizedWord.length (3) !== normalizedTarget.length (5)
   ↓
ONLY handleWordDiscovery() is called (line 488)
   ↓
handleWordDiscovery() calls:
  - validateWordInDictionary()
  - clueActions.updateCluesFromDiscovery() - adds GREEN clues if positions match
  - clueActions.updateKnownLettersFromDiscovery() - adds letters to knownLetters
   ↓
NO handleTargetAttempt() → NO entry in attempts array
   ↓
SurvivalClueBoxes renders HintBoxes
   ↓
persistedLetters useMemo iterates over attempts (EMPTY for different-length words)
   ↓
Yellow letters NOT shown in boxes (no attempts to process)
   ↓
knownLetters shows "T" in "Wrong spot" section ✅
```

### Key Code: Word Length Check

```typescript
// useSurvivalGameLogic.ts lines 469-490
if (normalizedWord === normalizedTarget) {
  // Exact match - handle as target attempt
  handleTargetAttemptRef.current?.(displayWord, targetWord.toUpperCase());
} else if (normalizedWord.length === normalizedTarget.length) {
  // Same length - can be a target attempt
  handleWordDiscoveryRef.current?.(displayWord);
  handleTargetAttemptRef.current?.(displayWord, targetWord.toUpperCase());
} else {
  // Different length - ONLY word discovery
  handleWordDiscoveryRef.current?.(displayWord);  // ← No target attempt!
}
```

### Why Yellow Letters Don't Show in Boxes

The `persistedLetters` logic in `HintBoxes` only processes entries from `attempts`:

```typescript
// SurvivalClueBoxes.tsx lines 188-209
const persistedLetters = React.useMemo(() => {
  const result = new Map<number, { letter: string; type: 'green' | 'yellow' }>();

  for (const attempt of attempts) {  // ← Only processes attempts array
    for (const fb of attempt.feedback) {
      // ... stores yellow/green letters at their positions
    }
  }

  return result;
}, [attempts]);
```

Since different-length words don't create entries in `attempts`, their yellow letters never appear in boxes.

## Root Cause

**ROOT CAUSE:** Yellow letters from different-length word discoveries are intentionally NOT processed as target attempts, so they don't populate the `attempts` array used for box display.

**This is a DESIGN DECISION, not a bug:**
1. Only same-length words can be "guesses" at the target
2. Different-length words are treated as "word discoveries" for points
3. Word discoveries only contribute to `knownLetters` (the "Wrong spot" section)

**The user's expectation differs from the current design.**

## Design Decision Analysis

### Current Design (Intentional)

**Pros:**
- Clear separation between "target guesses" (same length) and "word discoveries" (any length)
- Yellow letters at specific positions only make sense for same-length guesses
- For a 3-letter word against a 5-letter target, which box should show the yellow letter?

**Cons:**
- Users expect ALL yellow letters to appear in boxes
- Inconsistent experience between same-length and different-length words

### Why This Design Makes Sense

When guessing "CAT" against "TIGER":
- "T" at position 2 in "CAT" is yellow (exists in target but wrong position)
- But which of the 5 target boxes should show "T"?
  - Position 0? Position 1? Position 2? Position 3? Position 4?
  - We only know "T" is somewhere in "TIGER", not WHERE

**There's no meaningful position to display the yellow "T" in the target boxes.**

## Fix Strategy

### Option 1: Keep Current Behavior (RECOMMENDED)

**Approach:** Clarify the design to users
- The "Wrong spot" section already shows yellow letters from any word
- Same-length guesses show yellow letters in boxes at guessed positions
- Different-length discoveries show letters in "Wrong spot" section only

**Pros:**
- No code changes needed
- Current logic is correct for the design
- Position-based yellow display only makes sense for same-length words

**Cons:**
- User expectation mismatch (may need UX communication)

### Option 2: Add Yellow Letters to All Boxes (Not Recommended)

**Approach:** When a letter is found (yellow) in a different-length word, add it to ALL positions where it COULD be

**Implementation:**
```typescript
// In useSurvivalClues.ts updateKnownLettersFromDiscovery:
// For each yellow letter found, mark all possible target positions as potential yellows
```

**Pros:**
- Meets user's expectation

**Cons:**
- Confusing UX: "T" would appear in ALL 5 boxes as yellow
- Doesn't provide useful position information
- Overwhelming visual noise

### Option 3: Show "Floating" Yellow Letters Near Boxes

**Approach:** Add a visual indicator that shows yellow letters without specific positions

**Implementation:**
- Modify `HintBoxes` to show a "floating" indicator of letters found
- Could appear above or beside the boxes
- Different from position-specific yellow highlights

**Pros:**
- Shows yellow letters prominently
- Doesn't imply position information

**Cons:**
- UI complexity
- Might duplicate "Wrong spot" section functionality

### Recommended Fix: Option 1 (Keep Current)

The current behavior is **correct for the game design**:
1. Same-length words → Yellow letters persist at guessed positions (makes sense)
2. Different-length words → Letters go to "Wrong spot" section (can't map to positions)

**The "Wrong spot" section already fulfills the purpose** of showing which letters the user has found.

## Testing Strategy

**Current Tests Pass:**
- `SurvivalClueBoxes.yellowPersistence.test.tsx` - 7/7 pass
- Tests cover same-length guess scenarios correctly

**If Design Changes:**
Would need new tests for different-length word scenarios if Option 2 or 3 is implemented.

## Validation

**To Verify Current Behavior:**
1. Start Daily Word Hunt with 5-letter target
2. Guess 3-letter word containing target letters
3. Confirm letters appear in "Wrong spot" section
4. Confirm boxes show "?" (not yellow letters)

## Impact Assessment

**Current Impact:**
- Users may be confused by different display for same vs. different length words
- No data loss or incorrect game state
- Severity: Medium (UX expectation mismatch)

**If We Change to Option 2:**
- Would need significant UI changes
- Tests would need updates
- Could be confusing (same letter in multiple boxes)

## Prevention Measures

1. **UX Communication:** Consider adding tooltip/hint explaining that same-length guesses show positional feedback in boxes
2. **Documentation:** Update game instructions to clarify the difference
3. **Test Coverage:** Add explicit tests for different-length word discovery behavior

## Next Steps

1. **Clarify with Product:** Is the current behavior acceptable, or do we need Option 2/3?
2. **If Keeping Current:**
   - Consider adding UX hints to explain the feature
   - Document the design decision
3. **If Changing:**
   - Implement Option 2 or 3
   - Update tests
   - QA thoroughly

---

## Fix Applied

**Date:** 2026-01-18

### Changes Made

**1. Added `isDiscovery` field to `TargetAttempt` type (`types.ts`)**
- Discovery attempts from different-length words are marked with `isDiscovery: true`
- These attempts don't count toward the "tries left" counter

**2. Created `handleDiscoveryFeedback` function (`useSurvivalGameLogic.ts`)**
- Computes letter feedback for different-length words
- Creates `TargetAttempt` entries with `isDiscovery: true`
- Shows feedback overlay with yellow/green letters
- Does NOT apply wrong-guess penalty
- Does NOT count toward max attempts

**3. Modified `handleWordSubmit` (`useSurvivalGameLogic.ts`)**
- Now calls `handleDiscoveryFeedback` for different-length words
- Different-length words get feedback displayed, not just "wrong spot" section

**4. Updated tries counter in `SurvivalClueBoxes.tsx`**
- Filters out `isDiscovery` attempts when counting tries remaining
- `attempts.filter(a => !a.isDiscovery).length`

**5. Updated tries counter in `SurvivalLandscapeLayout.tsx`**
- Same filter applied for landscape mode consistency

**6. Updated max attempts check in `useSurvivalGameLogic.ts`**
- Only counts non-discovery attempts for game over check

### Files Modified
- `components/daily/survival/types.ts` - Added `isDiscovery?: boolean`
- `components/daily/survival/useSurvivalGameLogic.ts` - New function, modified submission flow
- `components/daily/survival/SurvivalClueBoxes.tsx` - Updated tries counter, used TargetAttempt type
- `components/daily/survival/SurvivalLandscapeLayout.tsx` - Updated tries counter

### Tests Added
- 4 new tests in `SurvivalClueBoxes.yellowPersistence.test.tsx`:
  - `should show yellow letter from shorter word discovery in boxes`
  - `should NOT count discovery attempts toward tries remaining`
  - `should count only non-discovery attempts toward tries remaining`
  - `should replace yellow from discovery with green from target attempt`

### Verification
- ✅ All 11 yellow persistence tests pass
- ✅ All 2063 tests pass
- ✅ Lint passes
- ✅ Build succeeds

---

**RCA Status:** RESOLVED

**Conclusion:** The fix now shows yellow/green letters from ANY word discovery in the hint boxes at their guessed positions. Discovery attempts (different-length words) don't count toward the "tries left" counter and don't apply wrong-guess penalties. When a subsequent guess or discovery reveals a green letter at a position, it replaces any yellow letter at that position.
