# Root Cause Analysis: Yellow Letter Persistence Bug

**Date:** 2026-01-18
**Issue:** Yellow letters in Daily Challenge Word Hunt disappear from boxes after feedback overlay dismisses
**Severity:** Medium
**Status:** Analysis Complete - Implementation Ready

## Issue Summary

**Description:**
In the Daily Challenge Word Hunt, when a player guesses a word and gets yellow feedback (correct letter, wrong position), the yellow letters should persist in the clue boxes after the feedback overlay dismisses. Instead, the yellow letters disappear and the boxes revert to showing "?".

**Expected Behavior:**
After guessing a word with yellow letters, once the feedback overlay dismisses:
1. Yellow letters should remain visible in their guessed positions
2. They should persist until a green letter (correct position) is found at that position
3. Newer yellow guesses at the same position should replace older ones

**Actual Behavior:**
Yellow letters disappear from the clue boxes after the feedback overlay dismisses, showing "?" instead.

**Impact:**
- Affected users: All players using the Daily Challenge Word Hunt feature
- Affected features: Clue box display, player guidance during gameplay
- Severity: Medium - gameplay is still functional but visual feedback is lost

## Reproduction

**Can Reproduce:** Needs manual verification (unit tests pass)

**Reproduction Steps:**
1. Start a Daily Challenge Word Hunt game
2. Guess a word that contains a letter in the target word but in the wrong position
3. Observe the feedback overlay showing yellow for that letter
4. Wait for the feedback overlay to dismiss (automatic after ~2 seconds)
5. Observe: The yellow letter should persist but may show "?" instead

**Environment:**
- Mode: LOCAL / PRODUCTION
- Browser: All browsers
- Platform: Both portrait and landscape modes

## Analysis

### Related Files:

**Core Components:**
- `components/daily/survival/SurvivalClueBoxes.tsx:177-287` - HintBoxes component with `persistedLetters` logic
- `components/daily/survival/SurvivalLandscapeLayout.tsx:351-448` - LandscapeClueBoxes component (similar logic)
- `components/daily/survival/useSurvivalClues.ts:60-112` - Clue state management hook
- `components/daily/survival/useSurvivalGameLogic.ts:346-394` - Game logic handling attempts

**State Management:**
- `components/daily/survival/survivalGameReducer.ts:171-185` - ADD_ATTEMPT and SET_FEEDBACK_OVERLAY actions

**Tests:**
- `__tests__/SurvivalClueBoxes.yellowPersistence.test.tsx` - All tests PASS
- `__tests__/LandscapeClueBoxes.yellowPersistence.test.tsx` - All tests PASS
- `__tests__/useSurvivalClues.test.ts` - All tests PASS

### Architecture Understanding:

**Two Sources of Yellow Letter Display:**

1. **`accumulatedClues` (Map<position, AccumulatedClue>):**
   - Managed by `useSurvivalClues` hook
   - **Only stores GREEN letters** (not yellow)
   - Yellow letters go to `knownLetters` set instead (non-positional)

2. **`persistedLetters` (computed in HintBoxes/LandscapeClueBoxes):**
   - Computed via `useMemo` from `attempts` array
   - Extracts yellow and green feedback from all attempts
   - Priority: newer attempt overwrites older at same position
   - Green always wins over yellow at same position

**Display Priority in HintBoxes (line 238-263):**
1. Green from `accumulatedClues`
2. Shop revealed letters
3. Hint revealed letters (from progressive hints)
4. **`persistedLetter`** (yellow/green from attempts) <- This should show yellow
5. Unknown ("?")

### Code Flow:

```
handleTargetAttempt()
  ├─ dispatch ADD_ATTEMPT (adds to state.attempts)
  ├─ clueActions.updateCluesFromFeedback() (only adds GREEN to accumulatedClues)
  ├─ dispatch SET_FEEDBACK_OVERLAY (show: true, feedback)
  └─ setTimeout → dispatch SET_FEEDBACK_OVERLAY (show: false)

SurvivalClueBoxes receives:
  ├─ attempts (from state.attempts)
  ├─ showFeedbackOverlay (from state)
  ├─ latestAttemptFeedback (from state)
  └─ accumulatedClues (from clueState)

When showFeedbackOverlay changes from true → false:
  └─ AnimatePresence mode="wait" switches from FeedbackOverlay to HintBoxes
      └─ HintBoxes computes persistedLetters from attempts
          └─ Should display yellow letters at their positions
```

### Unit Tests Analysis:

All unit tests pass, including:
- `should show yellow letter in box after feedback overlay dismisses when no better clue exists` ✓
- `should persist most recent yellow/green letter at each position` ✓
- `should show yellow box with correct styling for persisted yellow letters` ✓

**This indicates the LOGIC is correct** - the issue may be with AnimatePresence transitions or a race condition not captured in unit tests.

## Root Cause

### Primary Hypothesis: AnimatePresence Transition Issue

The `AnimatePresence mode="wait"` in `SurvivalClueBoxes.tsx:80` may have timing issues:

```tsx
<AnimatePresence mode="wait">
  {showFeedbackOverlay && latestAttemptFeedback ? (
    <FeedbackOverlay feedback={latestAttemptFeedback} />
  ) : (
    <HintBoxes attempts={attempts} ... />
  )}
</AnimatePresence>
```

**Known Framer Motion Issues:**
- [Issue #2023](https://github.com/framer/motion/issues/2023): "AnimatePresence doesn't update with the latest state if the state changes fast"
- [Issue #2554](https://github.com/framer/motion/issues/2554): "AnimatePresence gets stuck when state changes quickly"

**Current Version:** framer-motion ^12.23.24

### Secondary Hypothesis: Component Key Remounting

Line 50 in SurvivalClueBoxes.tsx:
```tsx
<motion.div
  key={`clue-container-${attempts.length}`}
  ...
>
```

This key changes when `attempts.length` changes, which could cause the entire container to remount. While this shouldn't lose data (attempts is still passed correctly), it could interfere with AnimatePresence exit animations.

### Tertiary Hypothesis: Landscape Mode Missing Props

The `SurvivalLandscapeLayout` doesn't have a feedback overlay - it always shows `LandscapeClueBoxes`. This is **by design** but means:
- Landscape mode should **always** show persisted yellow letters correctly
- If the bug also occurs in landscape mode, it points to a different issue

## Fix Strategy

### Recommended Fix: Option 1 - Stabilize AnimatePresence Transition

**Approach:**
1. Remove the dynamic key from the container: `key={`clue-container-${attempts.length}`}`
2. Ensure AnimatePresence children have stable keys
3. Consider using `mode="sync"` instead of `mode="wait"` for more reliable transitions

**Pros:**
- Minimal code change
- Addresses the most likely cause
- Maintains animation intent

**Cons:**
- May affect visual animation timing slightly

**Risk:** Low

### Alternative Fix: Option 2 - Lift persistedLetters Computation

**Approach:**
Move `persistedLetters` computation from HintBoxes to the parent SurvivalClueBoxes, passing it as a prop. This ensures the computation happens before AnimatePresence transitions.

**Pros:**
- Computation is stable regardless of child component lifecycle
- Cleaner separation of concerns

**Cons:**
- More code changes required
- May not address the actual issue if it's AnimatePresence-related

**Risk:** Medium

### Fix Implementation Steps:

1. **Step 1:** Remove dynamic key from container
   - File: `components/daily/survival/SurvivalClueBoxes.tsx:50`
   - Change: Remove `key={`clue-container-${attempts.length}`}` or make it stable

2. **Step 2:** Consider AnimatePresence mode change
   - File: `components/daily/survival/SurvivalClueBoxes.tsx:80`
   - Change: Try `mode="sync"` instead of `mode="wait"` if issues persist

3. **Step 3:** Add integration test
   - Create test that simulates actual transition timing
   - Verify yellow letters persist through AnimatePresence transitions

**Files to Modify:**
- `components/daily/survival/SurvivalClueBoxes.tsx` - Remove dynamic key, possibly change AnimatePresence mode

**Testing Strategy:**
- Unit tests: Existing tests already pass
- Integration tests: Add test for transition timing
- Manual testing: Verify in both portrait and landscape modes
- Edge cases: Rapid guessing, multiple yellow letters

**Validation:**
- How to verify fix works: Manual testing in Daily Challenge mode
- How to verify no regressions: Run full test suite

## Impact

**Current Impact:**
- Users affected: All Daily Challenge players
- Features affected: Visual feedback during gameplay
- Data impact: No data corruption

**Potential Side Effects:**
- Removing dynamic key could affect entrance animations (need to verify)
- Changing AnimatePresence mode could affect exit animation timing

## Prevention

**How to Prevent:**
- [ ] Add integration test for AnimatePresence transitions with state changes
- [ ] Consider using simpler animation approach for critical UI feedback
- [ ] Monitor framer-motion updates for related bug fixes
- [ ] Add visual regression testing for clue box states

## Next Steps

1. Implement fix using: `/bug_fix:implement-fix` with this RCA
2. Manual testing in Daily Challenge mode
3. Update tests to catch transition edge cases
4. Close issue

---

**RCA Status:** Implementation Ready

## References

- [Framer Motion AnimatePresence Bug #2023](https://github.com/framer/motion/issues/2023)
- [Framer Motion AnimatePresence Bug #2554](https://github.com/framer/motion/issues/2554)
- [Medium: Understanding AnimatePresence](https://medium.com/javascript-decoded-in-plain-english/understanding-animatepresence-in-framer-motion-attributes-usage-and-a-common-bug-914538b9f1d3)
