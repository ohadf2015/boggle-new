# Root Cause Analysis: Japanese 2-Letter Words Rejected

**Date:** 2026-01-18
**Issue:** [BUZZ] Word length invalid: ゆれ (2 letters) - Japanese 2-letter words rejected across all game modes
**Severity:** Medium
**Status:** ✅ FIXED

## Issue Summary

**Description:**
Japanese 2-letter words (like "ゆれ" - meaning "shaking/trembling") are being rejected with the error message "[BUZZ] Word length invalid" even though they are valid Japanese words in the dictionary.

**Expected Behavior:**
Japanese 2-letter words should be accepted across all game modes since:
1. The Japanese dictionary (`backend/japanese_words.txt`) contains valid 2-letter words like "ゆれ"
2. Japanese kanji compounds are typically 2-4 characters (shorter than Western words)
3. The game already has language-specific word length configurations that set `min: 2` for Japanese

**Actual Behavior:**
The Daily Buzz Challenge Generator (`buzzGenerator.ts`) hardcodes a minimum of 3 letters for ALL languages, ignoring the language-specific minimum word lengths used elsewhere in the codebase.

**Impact:**
- Affected users: All Japanese language players using Daily Buzz
- Affected features: Daily Buzz Challenge Generator
- Severity: Medium - Breaks Japanese language support for Buzz challenges

## Reproduction

**Can Reproduce:** Yes

**Reproduction Steps:**
1. Generate a Daily Buzz challenge for Japanese language
2. The AI generates a 2-letter Japanese word answer (e.g., "ゆれ")
3. The `validateChallenges()` function rejects it with console warning
4. Challenge is filtered out due to "invalid word length"

**Environment:**
- Mode: LOCAL and PRODUCTION
- Data: Any 2-letter Japanese word answer from AI

## Analysis

**Related Files:**
| File | Role | Current Behavior |
|------|------|------------------|
| `backend/services/buzzGenerator.ts:1467` | Challenge validation | Hardcoded `length < 3` check |
| `backend/services/buzzGenerator.ts:1536` | Single challenge validation | Same hardcoded `length < 3` |
| `utils/dailyChallenge/wikipediaWordProcessor.ts` | Wikipedia word validation | **Correct**: Uses `MIN_WORD_LENGTH[ja] = 2` |
| `app/api/admin/daily-word/bulk-generate/route.ts` | Daily word generation | **Correct**: Uses `ja: { min: 2, max: 4 }` |
| `shared/constants/gameConstants.ts` | Game constants | `MIN_WORD_LENGTH = 2` global |
| `components/singleplayer/presetConfig.ts` | Single player presets | **Correct**: `minWordLength: 2` with comments for Japanese |

**Code Flow:**
```
AI generates challenge with 2-letter Japanese answer
    ↓
validateChallenges() called
    ↓
Line 1467: if (answer.length < 3 || answer.length > 15)
    ↓
Returns false → Challenge rejected
    ↓
Console: "[BUZZ] Word length invalid: ゆれ (2 letters)"
```

## Root Cause

**Root Cause:**
The `buzzGenerator.ts` file has TWO hardcoded word length validations (lines 1467 and 1536) that enforce a minimum of 3 letters regardless of language. These validations do NOT use the language-specific minimum word lengths defined elsewhere in the codebase.

**Why it Happened:**
1. The Buzz Challenge Generator was developed independently without referencing existing language-specific constants
2. The hardcoded `3-15` range is appropriate for Western languages but not for Japanese
3. No language parameter is passed to the validation functions, preventing language-specific logic

## Fix Strategy

**Recommended Fix:**
Add language-aware minimum word length validation to `buzzGenerator.ts`

**Implementation Steps:**

### Step 1: Add Language-Specific Word Length Constants
Add a constant at the top of `buzzGenerator.ts`:
```typescript
// Minimum word length by language (Japanese kanji compounds are shorter)
const MIN_ANSWER_LENGTH: Record<string, number> = {
  en: 3,
  he: 3,
  sv: 3,
  ja: 2,  // Japanese kanji compounds are typically 2-4 characters
  es: 3,
};

const MAX_ANSWER_LENGTH = 15;
```

### Step 2: Update `validateChallenges` Function (lines 1450-1509)
Modify the validation to accept a language parameter and use language-specific minimum:
```typescript
function validateChallenges(
  challenges: BuzzChallenge[],
  language: string  // Add language parameter
): BuzzChallenge[] {
  const minLength = MIN_ANSWER_LENGTH[language] || 3;

  const validatedChallenges = challenges.filter((challenge) => {
    // ... existing brand/proper noun check ...

    if (challenge.type === 'wordle_guess') {
      // Wordle stays at exactly 5 letters
    } else {
      // Use language-specific minimum
      if (answer.length < minLength || answer.length > MAX_ANSWER_LENGTH) {
        console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters, min ${minLength} for ${language})`);
        return false;
      }
    }
    // ... rest of validation ...
  });
}
```

### Step 3: Update `validateSingleChallenge` Function (lines 1516-1552)
Apply the same language-aware logic to single challenge validation.

### Step 4: Update All Callers
Ensure all calls to validation functions pass the language parameter.

**Files to Modify:**
- `backend/services/buzzGenerator.ts` (lines 1467, 1536) - Add language-specific minimum
- Update function signatures to accept language parameter
- Update all callers to pass language

**Testing Strategy:**
- Unit tests: Add tests for Japanese 2-letter word acceptance in Buzz validation
- Integration tests: Verify Buzz generation accepts Japanese 2-letter answers
- Edge cases:
  - Test 2-letter Japanese words (ゆれ, 花火, etc.)
  - Ensure 2-letter English words still rejected
  - Ensure Wordle validation unchanged (exactly 5 letters)

**Validation:**
- How to verify fix works: Generate Japanese Buzz challenge, confirm 2-letter answers accepted
- Regression testing: Run existing Buzz tests for other languages

## Impact

**Current Impact:**
- Users affected: Japanese language players using Daily Buzz
- Features affected: Daily Buzz Challenge Generator only
- Data impact: No data corruption - challenges are filtered out before saving

**Other Game Modes Status:**
| Game Mode | Status | Evidence |
|-----------|--------|----------|
| Single Player | ✅ OK | `presetConfig.ts` uses `minWordLength: 2` with Japanese comments |
| Multiplayer | ✅ OK | Server uses `game.minWordLength || 2` |
| Daily Word Hunt | ✅ OK | Uses `minWordLength: 2` |
| Daily Challenge | ✅ OK | Uses language-specific `MIN_WORD_LENGTH[ja] = 2` |
| **Daily Buzz** | ❌ BUG | Hardcoded `< 3` check |

**Potential Side Effects:**
- None expected if fix is scoped correctly
- Wordle validation must remain at exactly 5 letters

## Prevention

**How to Prevent:**
- [ ] Add test: Japanese 2-letter word acceptance in Buzz
- [ ] Update code review checklist: Language-specific logic for word length
- [ ] Update docs: Document MIN_ANSWER_LENGTH constant usage
- [ ] Consider refactoring: Extract shared language config to single location

## Next Steps

1. Implement fix using: `/bug_fix:implement-fix rca-japanese-2-letter-words-rejected`
2. Add unit tests for Japanese Buzz validation
3. Validate fix in staging
4. Update prevention measures
5. Close issue

---

**RCA Status:** ✅ FIXED (2026-01-18)

## Implementation Summary

**Changes Made:**

1. **Added language-specific constants** (`backend/services/buzzGenerator.ts`):
   ```typescript
   const MIN_ANSWER_LENGTH: Record<string, number> = {
     en: 3,
     he: 3,
     sv: 3,
     ja: 2,  // Japanese kanji compounds are shorter
     es: 3,
   };
   const MAX_ANSWER_LENGTH = 15;
   ```

2. **Updated `validateChallenges()`** - Now accepts language parameter and uses language-specific minimum

3. **Updated `validateSingleChallenge()`** - Same language-aware validation

4. **Added tests** for Japanese 2-letter word validation:
   - `should accept 2-letter Japanese answers (kanji compounds)` ✅
   - `should still reject 2-letter English answers` ✅

**Verification:**
- All 705 backend tests pass
- Build passes
- Lint passes

## Appendix: Affected Code Locations

### Location 1: `backend/services/buzzGenerator.ts:1467`
```typescript
// Check word length for non-wordle challenges (3-15 letters)
if (answer.length < 3 || answer.length > 15) {
  console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters)`);
  return false;
}
```

### Location 2: `backend/services/buzzGenerator.ts:1536`
```typescript
// Check word length for non-wordle challenges (3-15 letters)
if (answer.length < 3 || answer.length > 15) {
  console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters)`);
  return false;
}
```

### Existing Correct Pattern (for reference): `utils/dailyChallenge/wikipediaWordProcessor.ts`
```typescript
const MIN_WORD_LENGTH: Record<Language, number> = {
  en: 4,
  he: 4,
  sv: 4,
  ja: 2, // Japanese kanji compounds are typically 2-4 characters
  es: 4,
  fr: 4,
  de: 4
};
```
