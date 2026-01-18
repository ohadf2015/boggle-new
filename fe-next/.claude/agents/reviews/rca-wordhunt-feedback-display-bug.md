# Root Cause Analysis: Word Hunt Feedback Display Bug

**Date:** 2026-01-18
**Issue:** Letters not displaying in feedback boxes - only green letters shown
**Severity:** High
**Status:** Investigation In Progress

## Issue Summary

**Description:**
In the Daily Challenge Word Hunt feature, when a player submits a word and receives Wordle-style feedback:
- Letters in the WRONG location (yellow) are NOT being displayed in the feedback boxes
- Letters that are NOT in the word (gray) are also NOT displayed
- Only letters in the CORRECT location (green) are showing

**Expected Behavior:**
After submitting a word, the feedback overlay should show ALL letters with their respective colors:
- Green: Correct letter in correct position
- Yellow: Correct letter but wrong position
- Gray: Letter not in the target word

Then, when the overlay dismisses and returns to the hint boxes (? boxes), yellow letters should persist in their positions.

**Actual Behavior:**
According to user report: "letters are not displayed there at all" and "only after it is green (right location)"

## Reproduction

**Can Reproduce:** Unclear - Tests pass, issue may be environment-specific

**Environment:**
- Mode: Production (user-reported)
- Feature: Daily Challenge Word Hunt (Survival Mode)

**Expected Reproduction Steps:**
1. Start a Daily Challenge Word Hunt game
2. Submit a word that is the same length as the target word
3. Word should contain some letters from target in wrong positions (yellow)
4. Observe the feedback overlay - letters should be displayed with colors
5. After overlay dismisses, yellow letters should persist in hint boxes

## Analysis

### Related Files Investigated

**Core Feedback Logic:**
- `utils/wordHuntFeedback.ts` - `getLetterFeedback()` function
  - Two-pass algorithm: green first, then yellow
  - Returns `LetterFeedback[]` with letter, position, feedback type
  - **Status:** Tests pass - logic is correct

**Feedback Display Component:**
- `components/daily/survival/SurvivalClueBoxes.tsx`
  - `FeedbackOverlay` (lines 120-166): Displays feedback with colors
  - `HintBoxes` (lines 176-286): Shows persisted letters from attempts
  - **Status:** Tests pass - component renders correctly with test data

**Game State Management:**
- `components/daily/survival/useSurvivalGameLogic.ts`
  - Line 356: Generates feedback via `getLetterFeedback()`
  - Line 363: Dispatches `ADD_ATTEMPT` to add attempt to state
  - Line 372: Dispatches `SET_FEEDBACK_OVERLAY` to show overlay

- `components/daily/survival/survivalGameReducer.ts`
  - Lines 172-176: `ADD_ATTEMPT` action adds attempt to array
  - Lines 178-185: `SET_FEEDBACK_OVERLAY` sets feedback and show flag

**Clue Accumulation:**
- `components/daily/survival/useSurvivalClues.ts`
  - Lines 60-76: `updateCluesFromFeedback()` - **ONLY stores GREEN letters** in `accumulatedClues`
  - Yellow letters go to `knownLetters` set (displayed separately below boxes)
  - **Note:** This is BY DESIGN - `accumulatedClues` is for confirmed positions

**Hint System:**
- `components/daily/survival/useSurvivalHints.ts`
  - Manages `currentHint` which provides the hint string (e.g., `'_ _ _ _ _'`)

### Data Flow

```
1. User submits word
   ↓
2. handleWordSubmit() in useSurvivalGameLogic
   ↓
3. handleTargetAttempt() called
   ↓
4. getLetterFeedback(word, target, language) → LetterFeedback[]
   ↓
5. dispatch(ADD_ATTEMPT) - adds to state.attempts
   ↓
6. dispatch(SET_FEEDBACK_OVERLAY, { show: true, feedback })
   ↓
7. SurvivalClueBoxes receives:
   - showFeedbackOverlay: true
   - latestAttemptFeedback: LetterFeedback[]
   - attempts: TargetAttempt[]
   ↓
8. FeedbackOverlay renders feedback.map(letterFb => letterFb.letter)
   ↓
9. After timeout, SET_FEEDBACK_OVERLAY { show: false }
   ↓
10. HintBoxes renders with persistedLetters from attempts
```

### Test Coverage

**All relevant tests PASS:**
- `SurvivalClueBoxes.yellowPersistence.test.tsx` - 7 tests pass
- `SurvivalClueBoxes.transition.test.tsx` - 3 tests pass
- `LandscapeClueBoxes.yellowPersistence.test.tsx` - 5 tests pass
- `wordHuntFeedback.test.ts` - 27 tests pass

### Hypotheses

**Hypothesis 1: Data is not reaching component (LIKELY)**
- The `latestAttemptFeedback` prop may be null/undefined when overlay renders
- Timing issue between dispatch and render
- State update not propagating correctly

**Hypothesis 2: Feedback array has empty letters (POSSIBLE)**
- `getLetterFeedback()` might return feedback with empty letter strings
- Word normalization might be stripping characters

**Hypothesis 3: CSS/Display issue (LESS LIKELY)**
- Text color same as background
- Font rendering issue
- Z-index causing letters to be hidden

**Hypothesis 4: Environment-specific issue (POSSIBLE)**
- Works in tests but fails in browser
- Animation library (framer-motion) interference
- React state batching issue

**Hypothesis 5: Language-specific issue (POSSIBLE)**
- If playing in Hebrew (RTL), normalization might cause issues
- Special character handling might strip letters

## Recommended Next Steps

1. **Add Console Logging** (Immediate):
   - Log `feedback` in `handleTargetAttempt` before dispatch
   - Log `latestAttemptFeedback` in `FeedbackOverlay` component
   - Verify data structure is correct

2. **Browser Developer Tools** (If logging fails):
   - React DevTools: Inspect `SurvivalClueBoxes` props
   - Check if `showFeedbackOverlay` is true when expected
   - Verify `latestAttemptFeedback` array contents

3. **Animation Investigation**:
   - Check if framer-motion animation is causing flash/hidden content
   - Test with `skipAnimations: true` forced

4. **Language Testing**:
   - Test in English specifically
   - Test in Hebrew specifically
   - Compare behavior

## Potential Fix Areas

If root cause is confirmed as timing/state issue:
```javascript
// In useSurvivalGameLogic.ts, ensure feedback is set synchronously
dispatch({ type: 'ADD_ATTEMPT', payload: { attempt: newAttempt } });
// Immediately after ADD_ATTEMPT, set feedback
dispatch({ type: 'SET_FEEDBACK_OVERLAY', payload: { show: true, feedback } });
```

If root cause is CSS/display:
- Check `text-white` class is applied correctly
- Verify `letterFb.letter` is not empty string

## Prevention

Once fix is implemented:
- [ ] Add E2E test for yellow letter display
- [ ] Add visual regression test for feedback overlay
- [ ] Add logging for production debugging

---

**RCA Status:** RESOLVED

## Root Cause

**The landscape mode layout (`SurvivalLandscapeLayout.tsx`) was missing the feedback overlay functionality entirely.**

The portrait mode correctly uses `SurvivalClueBoxes` which has:
- `showFeedbackOverlay` prop
- `latestAttemptFeedback` prop
- `knownLetters` prop
- Complete `FeedbackOverlay` component for displaying letter feedback

However, the landscape mode used `LandscapeClueBoxes` which:
- ❌ Did NOT receive `showFeedbackOverlay` prop
- ❌ Did NOT receive `latestAttemptFeedback` prop
- ❌ Did NOT receive `knownLetters` prop
- ❌ Did NOT have any feedback overlay rendering logic

**The bug only manifested in landscape mode** on mobile devices. Users in landscape mode would not see any letter feedback after guessing, only the persisted hint boxes.

## Fix Applied

1. **Added missing props to `SurvivalLandscapeLayoutProps`**:
   - `latestAttemptFeedback: LetterFeedback[] | null`
   - `showFeedbackOverlay: boolean`
   - `knownLetters: Set<string>`
   - `skipAnimations?: boolean`

2. **Updated `LandscapeClueBoxes` component** to include:
   - Feedback overlay with `AnimatePresence` for smooth transitions
   - Letter feedback rendering with proper colors (green/yellow/gray)
   - Known letters indicator below the boxes

3. **Updated `DailyWordHuntSurvival.tsx`** to pass the missing props to landscape layout

## Files Changed

- `components/daily/survival/SurvivalLandscapeLayout.tsx` - Added feedback overlay to landscape mode
- `components/daily/DailyWordHuntSurvival.tsx` - Pass missing props to landscape layout

## Verification

- All 42 related tests pass
- Build succeeds
- Lint passes
