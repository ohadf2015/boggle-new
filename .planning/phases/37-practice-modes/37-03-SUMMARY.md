---
phase: 37-practice-modes
plan: 03
subsystem: education
tags: [tdd, hooks, practice-modes, spelling, hebrew-normalization]

# Dependency graph
requires:
  - phase: 37-01
    provides: Practice foundation (XP calculations, session management, practice.ts API)
provides:
  - useSpellingGame hook for spelling challenge state management
  - Hebrew normalization fix for niqqud/diacritics removal
affects: [37-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Progressive difficulty via word length sorting
    - Hint system with first letter free, subsequent hints reset streak
    - Auto-advance with different delays for correct (1s) vs incorrect (2s)

key-files:
  created:
    - fe-next/components/practice/hooks/useSpellingGame.ts
    - fe-next/components/practice/__tests__/useSpellingGame.test.ts
  modified:
    - fe-next/lib/supabase/education/types.ts (Hebrew normalization fix)
    - fe-next/translations/en.js (added missing keys from 37-02, 37-04)

key-decisions:
  - "First letter hint is always free (doesn't count toward hints used)"
  - "Hints beyond first reset current streak to 0"
  - "Auto-advance timing: 1s for correct answers, 2s for incorrect (gives time to see feedback)"
  - "Case-insensitive comparison with Hebrew normalization via sanitizeWord"

patterns-established:
  - "TDD approach: RED (tests) → GREEN (implementation) → REFACTOR (lint/types)"
  - "Hebrew word comparison must sanitize niqqud before normalizing final letters"

# Metrics
duration: 7min
completed: 2026-02-13
---

# Phase 37 Plan 03: Spelling Challenge Hook Summary

**Spelling challenge game hook with progressive difficulty, hint system, and Hebrew normalization fix**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-13T12:54:29Z
- **Completed:** 2026-02-13T13:01:26Z
- **Tasks:** 1 (TDD cycle: RED → GREEN → REFACTOR)
- **Files modified:** 4

## Accomplishments

- useSpellingGame hook with progressive difficulty (sorts by word length)
- Hint system: first letter free, additional hints reset streak
- Streak tracking with max streak
- Auto-advance after answers (1s correct, 2s incorrect)
- Case-insensitive comparison with Hebrew normalization
- Accuracy calculation and completion detection
- **Bug fix:** Hebrew normalization now removes niqqud (vowel points) for proper comparison

## Task Commits

Each TDD phase was committed atomically:

1. **RED: Failing tests** - `34b0ec3d` (test)
   - Tests for progressive difficulty
   - Tests for hint system
   - Tests for streak tracking
   - Tests for Hebrew normalization with diacritics
   - Tests for accuracy calculation

2. **GREEN: Implementation** - `5965f0f7` (feat)
   - useSpellingGame hook implementation
   - Hebrew normalization bug fix (sanitize before normalize)
   - Missing translation keys from 37-02, 37-04

## Files Created/Modified

- `fe-next/components/practice/hooks/useSpellingGame.ts` - Spelling game state management hook
- `fe-next/components/practice/__tests__/useSpellingGame.test.ts` - Comprehensive hook tests (18 tests, all passing)
- `fe-next/lib/supabase/education/types.ts` - Fixed normalizeForStorage to sanitize Hebrew
- `fe-next/translations/en.js` - Added missing keys (matching, combo, submit, timesUp, typeAnswer)

## Decisions Made

**First letter hint is free:**
- Rationale: Provides a starting point without penalizing streak, encourages engagement
- Implementation: hintIndex starts at 1, hintsUsed counter only increments on additional hints

**Auto-advance timing:**
- Correct answers: 1 second delay (quick positive reinforcement)
- Incorrect answers: 2 second delay (more time to see correct word)
- Rationale: Different delays optimize for learning - correct answers move quickly, incorrect answers allow absorption

**Hebrew normalization requires sanitization:**
- Issue: normalizeHebrewWord only handled final letter forms, not niqqud (vowel points)
- Fix: normalizeForStorage now calls sanitizeWord first to remove niqqud
- Impact: Enables proper comparison of Hebrew words with/without diacritics

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hebrew normalization missing niqqud removal**
- **Found during:** GREEN phase - Hebrew test failing
- **Issue:** normalizeForStorage called normalizeHebrewWord which only handles final letter forms, not niqqud. Words with vowel points ('שָׁלוֹם') didn't match normalized input ('שלום')
- **Fix:** Updated normalizeForStorage to call sanitizeWord('he') before normalizeHebrewWord. This removes niqqud (U+0591-U+05C7 range) and other invisible Unicode chars
- **Files modified:** fe-next/lib/supabase/education/types.ts
- **Verification:** Hebrew normalization test passes - word with diacritics matches plain text
- **Committed in:** 5965f0f7 (feat commit)

**2. [Rule 3 - Blocking] Missing translation keys from other plans**
- **Found during:** Commit attempt - pre-commit hook failing
- **Issue:** Translation checker found missing keys: matching.title, matching.words, matching.definitions (from 37-02), combo, submit, timesUp, typeAnswer (from 37-04)
- **Fix:** Added all 7 missing keys to en.js translations
- **Files modified:** fe-next/translations/en.js
- **Verification:** Pre-commit hook passes, translations valid
- **Committed in:** 5965f0f7 (feat commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Hebrew normalization bug was critical for correctness. Translation keys were blocking commits. Both fixes necessary for plan completion.

## Issues Encountered

None - TDD cycle proceeded smoothly after fixing TypeScript type assertions in tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useSpellingGame hook complete and tested
- Ready for SpellingChallengePractice component implementation (separate plan)
- Hebrew normalization fix benefits all practice modes using vocabulary words
- Translation keys added for all practice modes (matching, spelling, blitz)

---
*Phase: 37-practice-modes*
*Completed: 2026-02-13*
