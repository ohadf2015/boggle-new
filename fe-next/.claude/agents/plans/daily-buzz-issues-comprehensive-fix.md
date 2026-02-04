# Feature: Daily Buzz Comprehensive Bug Fixes

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

This plan addresses multiple issues reported with the Daily Buzz feature:
1. **Political/inappropriate riddles** - Content moderation not filtering enough topics
2. **Wordle 4-letter vs 5-letter mismatch** - Frontend uses hardcoded 5-letter grid while answers can be 4 letters
3. **Missing backspace key on on-screen keyboard** - Keyboard layout doesn't include backspace
4. **Fill-the-blank wrong letters** - Riddles have incorrect letters causing confusion
5. **Image not displayed on trend main page** - Preview images not showing on DailyChallengeLanding
6. **Results page not scrollable** - BuzzResultsScreen may have scroll issues

## User Story

As a Daily Buzz player
I want the challenges to be family-friendly, correctly formatted, and the UI to work properly
So that I can enjoy playing without confusion or frustration

## Problem Statement

The Daily Buzz feature has multiple UX and content quality issues:
- AI-generated content sometimes includes political/inappropriate topics despite moderation
- Wordle challenge displays 5 letter boxes but accepts 4-letter answers for Hebrew
- On-screen keyboard lacks backspace key making corrections difficult
- Fill-the-blank challenges sometimes show wrong first letter hints
- Preview images don't render on the challenge selection landing page
- Results page content may overflow without scrolling ability

## Solution Statement

Address each issue systematically:
1. Enhance content moderation keywords and AI prompts
2. Make Wordle grid dynamically sized based on language configuration
3. Add backspace key to all keyboard layouts
4. Validate fill-the-blank prompts match answer letters
5. Ensure image URLs are properly passed to CompactChallengeCard
6. Verify and fix scrolling on BuzzResultsScreen

## Feature Metadata

**Feature Type:** Bug Fix
**Estimated Complexity:** Medium (multiple independent fixes)
**Primary Systems Affected:** Frontend components, backend content moderation
**Dependencies:** None

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `fe-next/components/buzz/challenges/WordleChallenge.tsx` (lines 22-23, 29-59)
  - **WHY:** Contains hardcoded WORD_LENGTH = 5 and keyboard layouts
  - **ISSUE:** Grid always renders 5 cells regardless of language-specific word length
  - **PATTERN:** Needs to use WORDLE_WORD_LENGTH from constants

- `fe-next/backend/services/buzz/constants.ts` (lines 37-43)
  - **WHY:** Defines WORDLE_WORD_LENGTH per language (he=4, en=5, etc.)
  - **PATTERN:** Should be used by frontend to determine grid size

- `fe-next/components/buzz/challenges/FillBlankChallenge.tsx` (lines 44-47)
  - **WHY:** First letter hint logic that may cause confusion
  - **ISSUE:** First letter is revealed from answer but prompt may show different letter

- `fe-next/backend/services/buzz/challengeValidator.ts` (lines 244-300)
  - **WHY:** normalizeBlankSizes function creates fill_blank prompts
  - **ISSUE:** May generate incorrect first letter patterns

- `fe-next/backend/services/buzz/contentModerationService.ts` (lines 56-127)
  - **WHY:** AI moderation prompt and filtering logic
  - **PATTERN:** Needs enhanced political/child-safety keywords

- `fe-next/backend/services/buzz/constants.ts` (lines 190-231)
  - **WHY:** POLITICAL_KEYWORDS_BY_LANGUAGE definitions
  - **PATTERN:** Needs more comprehensive keyword list

- `fe-next/components/daily/DailyChallengeLanding.tsx` (lines 139-156, 333-334)
  - **WHY:** Fetches and passes buzzPreview.imageUrl to card
  - **PATTERN:** Image should display if URL exists

- `fe-next/components/buzz/BuzzResultsScreen.tsx` (lines 172-178)
  - **WHY:** Main container with overflow-y-auto class
  - **PATTERN:** Should allow scrolling of results

### New Files to Create

None - all fixes are modifications to existing files

---

## IMPLEMENTATION PLAN

### Phase 1: Wordle Dynamic Word Length (High Priority)

**Problem:** WordleChallenge.tsx has hardcoded `WORD_LENGTH = 5` but Hebrew uses 4-letter words.

**Root Cause:** The frontend component doesn't import or use the language-specific `WORDLE_WORD_LENGTH` from constants.

**Tasks:**

1. Import WORDLE_WORD_LENGTH in WordleChallenge.tsx
2. Accept language prop or derive from useLanguage
3. Use dynamic word length for grid rendering and validation
4. Update all references to WORD_LENGTH constant

### Phase 2: Add Backspace Key to Keyboards (High Priority)

**Problem:** On-screen keyboards don't have a backspace key, making corrections difficult.

**Root Cause:** KEYBOARD_LAYOUTS in WordleChallenge.tsx don't include 'BACKSPACE' key.

**Tasks:**

1. Add 'BACKSPACE' key to each keyboard layout's last row
2. Update keyboard rendering to handle 'BACKSPACE' key styling (wider, with icon)
3. Ensure backspace functionality works (already implemented in handleKeyPress)

### Phase 3: Content Moderation Enhancement (High Priority)

**Problem:** Political and inappropriate content sometimes gets through AI moderation.

**Root Cause:**
- POLITICAL_KEYWORDS_BY_LANGUAGE may be incomplete
- AI moderation prompt may need strengthening
- Fail-open policy allows content through on errors

**Tasks:**

1. Expand POLITICAL_KEYWORDS_BY_LANGUAGE with more terms
2. Add "riddle" category to content that should be family-friendly
3. Strengthen AI moderation prompt to be more conservative
4. Consider fail-closed for moderation errors (reject instead of approve)

### Phase 4: Fill-the-Blank Letter Validation (Medium Priority)

**Problem:** Fill-the-blank challenges sometimes show wrong letters in the prompt.

**Root Cause:** normalizeBlankSizes function creates prompts with first letter hint, but the logic may not correctly handle all cases.

**Tasks:**

1. Review normalizeBlankSizes logic in challengeValidator.ts
2. Add validation that prompt's first letter matches answer's first letter
3. Add logging for mismatches to identify patterns
4. Consider removing first letter hint if it causes confusion (frontend already handles this)

### Phase 5: Image Display on Landing Page (Medium Priority)

**Problem:** Preview images don't display on DailyChallengeLanding.

**Root Cause Investigation:**
- CompactChallengeCard receives `previewImageUrl` prop (line 333)
- Component renders image if `showImage = previewImageUrl && !imageError` (line 533)
- Need to verify:
  1. API returns imageUrl in response
  2. buzzPreview state is set correctly
  3. imageError state isn't being triggered
  4. Image src is valid

**Tasks:**

1. Add console logging to trace imageUrl flow
2. Verify API response includes imageUrl field
3. Check if CORS or image loading errors occur
4. Test with known-good image URL

### Phase 6: Results Page Scrollability (Low Priority)

**Problem:** Results page may not be scrollable when content overflows.

**Root Cause Investigation:**
- BuzzResultsScreen has `overflow-y-auto` class (line 177)
- Has `page-content-safe` and `scrollable-area` classes
- May be parent container constraints

**Tasks:**

1. Test results page with many challenges to verify scroll behavior
2. Check parent components for overflow constraints
3. Ensure min-h-0 is set for flex children to allow scrolling

---

## STEP-BY-STEP TASKS

### Task 1: UPDATE `fe-next/components/buzz/challenges/WordleChallenge.tsx`

**Fix Wordle dynamic word length and add backspace key**

- **IMPLEMENT:**
  1. Remove hardcoded `WORD_LENGTH = 5`
  2. Import `WORDLE_WORD_LENGTH` from shared constants or define locally
  3. Calculate word length based on `language` prop from `useLanguage()`
  4. Add 'BACKSPACE' key to all keyboard layouts
  5. Update keyboard key rendering to show backspace icon
- **PATTERN:** Use `WORDLE_WORD_LENGTH[language] || 5` pattern
- **IMPORTS:**
  ```typescript
  // Add to existing imports or define locally
  const WORDLE_WORD_LENGTH: Record<string, number> = {
    en: 5,
    he: 4,
    sv: 5,
    ja: 4,
    es: 5,
  };
  ```
- **GOTCHA:**
  - The answer from props may be validated against different length than grid shows
  - Hebrew keyboard is RTL - backspace position may need adjustment
  - Japanese may need different handling (characters vs letters)
- **VALIDATE:**
  ```bash
  npm run test:frontend -- --testPathPattern="WordleChallenge" --watchAll=false
  ```

**Specific Changes:**

**Line 22-23: Remove hardcoded constant**
```typescript
// REMOVE:
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

// ADD:
const MAX_ATTEMPTS = 6;

// Word length varies by language
const WORDLE_WORD_LENGTH: Record<string, number> = {
  en: 5,
  he: 4,
  sv: 5,
  ja: 4,
  es: 5,
};
```

**Lines 29-58: Add BACKSPACE to keyboard layouts**
```typescript
const KEYBOARD_LAYOUTS: Record<string, string[][]> = {
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],  // Added BACKSPACE
  ],
  he: [
    ['ק', 'ר', 'א', 'ט', 'ו', 'נ', 'מ', 'פ'],
    ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל'],
    ['ENTER', 'ז', 'ס', 'ב', 'ה', 'צ', 'ת', 'BACKSPACE'],  // Added BACKSPACE
  ],
  sv: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Å'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],  // Added BACKSPACE
  ],
  ja: [
    ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と'],
    ['ENTER', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'BACKSPACE'],  // Added BACKSPACE
  ],
  es: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],  // Added BACKSPACE
  ],
};
```

**Inside component: Use dynamic word length**
```typescript
// After const { t, language } = useLanguage();
const wordLength = WORDLE_WORD_LENGTH[language] || 5;

// Replace all WORD_LENGTH references with wordLength
```

**Update renderKey function to handle BACKSPACE:**
```typescript
const renderKey = (key: string) => {
  const state = keyboardStates[key] || 'empty';
  const isWide = key === 'ENTER' || key === 'BACKSPACE';

  // ... existing styles ...

  return (
    <motion.button
      key={key}
      data-testid={`key-${key}`}
      data-state={state}
      whileTap={{ scale: 0.95 }}
      onClick={() => handleKeyPress(key)}
      disabled={gameStatus !== 'playing'}
      className={`${isWide ? 'px-2 sm:px-3' : 'w-8 sm:w-10'} h-12 sm:h-14 flex items-center justify-center text-xs sm:text-sm font-bold rounded-md border-2 transition-colors disabled:opacity-50 ${stateStyles[state]}`}
    >
      {key === 'BACKSPACE' ? '⌫' : key}
    </motion.button>
  );
};
```

### Task 2: UPDATE `fe-next/backend/services/buzz/constants.ts`

**Expand political keywords for better filtering**

- **IMPLEMENT:** Add more political keywords to POLITICAL_KEYWORDS_BY_LANGUAGE
- **PATTERN:** Add common political terms, current events figures, controversial topics
- **GOTCHA:** Be careful not to over-filter legitimate trending topics
- **VALIDATE:**
  ```bash
  npm run test:backend -- --testPathPattern="contentModeration" --watchAll=false
  ```

**Add to POLITICAL_KEYWORDS_BY_LANGUAGE.en:**
```typescript
en: [
  // ... existing keywords ...
  // Add more comprehensive list:
  'government', 'legislation', 'lawmaker', 'senator', 'representative',
  'democrat', 'republican', 'politics', 'partisan',
  'ministry', 'minister', 'cabinet', 'supreme court', 'justice',
  'controversial', 'debate', 'partisan', 'bipartisan',
  'activist', 'advocacy', 'lobby', 'lobbyist',
  // Current figures (update as needed)
  'netanyahu', 'putin', 'zelensky', 'xi jinping',
  // Sensitive topics
  'abortion', 'roe', 'wade', 'gun', 'firearms', 'amendment',
  'immigration', 'migrant', 'border', 'deportation',
  'climate', 'global warming', // Can be political depending on context
],
```

### Task 3: UPDATE `fe-next/backend/services/buzz/contentModerationService.ts`

**Strengthen AI moderation prompt**

- **IMPLEMENT:** Update buildModerationPrompt to be more conservative
- **PATTERN:** Add explicit "when in doubt, reject" guidance
- **GOTCHA:** Don't be so strict that nothing passes
- **VALIDATE:** Test with known problematic trends

**Update the prompt at line 56-127:**
- Add more explicit examples of what to reject
- Emphasize "for children ages 6+" multiple times
- Add section for "riddles should be educational and fun, not controversial"

### Task 4: UPDATE `fe-next/backend/services/buzz/challengeValidator.ts`

**Add first letter validation for fill_blank**

- **IMPLEMENT:** Validate that prompt's revealed letter matches answer's first letter
- **PATTERN:** Add validation step in normalizeBlankSizes
- **GOTCHA:** Some prompts may intentionally not show first letter (when alternatives exist)
- **VALIDATE:**
  ```bash
  npm run test:backend -- --testPathPattern="challengeValidator" --watchAll=false
  ```

**In normalizeBlankSizes function, add validation:**
```typescript
// After creating blanksWithFirstLetter, validate:
const promptFirstLetter = normalizedPrompt.match(/\b([A-Z])\s+_/)?.[1];
if (promptFirstLetter && promptFirstLetter !== firstLetter) {
  console.warn(`[BUZZ] First letter mismatch: prompt shows "${promptFirstLetter}" but answer starts with "${firstLetter}"`);
  // Option 1: Fix it
  normalizedPrompt = normalizedPrompt.replace(
    new RegExp(`\\b${escapeRegex(promptFirstLetter)}(\\s+_)`, 'i'),
    `${firstLetter}$1`
  );
}
```

### Task 5: VERIFY Image Display on DailyChallengeLanding

**Debug why images don't show on landing page**

- **IMPLEMENT:** Add console.log to trace imageUrl through the flow
- **PATTERN:** Check API response, state setting, prop passing
- **GOTCHA:** May be CORS, image size, or error handling issue
- **VALIDATE:** Manual testing with browser dev tools

**Debug steps:**
1. In `checkBuzzStatus` (line 141), log the response:
   ```typescript
   console.log('[DEBUG] Buzz API response:', buzzData);
   ```
2. After setBuzzPreview (line 145-149), log the state
3. In CompactChallengeCard, log received props
4. Check browser Network tab for image requests

### Task 6: VERIFY BuzzResultsScreen Scrollability

**Ensure results page scrolls properly**

- **IMPLEMENT:** Test with 7+ challenges and verify scroll works
- **PATTERN:** Check flex container hierarchy for proper overflow handling
- **GOTCHA:** May need `min-h-0` on parent flex items
- **VALIDATE:** Manual testing

**Current classes on container (line 177):**
```
flex-1 min-h-0 flex flex-col items-center justify-start p-4 page-content-safe overflow-y-auto overscroll-contain scrollable-area relative
```

This looks correct. If still not scrolling:
1. Check parent BuzzChallenge component for height constraints
2. Add `max-h-screen` or `h-screen` to enforce height limit
3. Ensure `page-content-safe` doesn't set `overflow: hidden`

---

## TESTING STRATEGY

### Unit Tests

**WordleChallenge.test.tsx - Add tests for:**
- Dynamic word length based on language
- Backspace key renders in keyboard
- 4-letter grid for Hebrew
- 5-letter grid for English

**Example test:**
```typescript
describe('WordleChallenge', () => {
  it('renders 4-letter grid for Hebrew', () => {
    // Mock useLanguage to return 'he'
    const { getAllByTestId } = render(
      <WordleChallenge
        challenge={{ prompt: 'Test', answer: 'מילה' }}
        onAnswer={jest.fn()}
        showHint={false}
      />
    );
    const cells = getAllByTestId(/wordle-cell-0-/);
    expect(cells).toHaveLength(4);
  });

  it('renders backspace key in keyboard', () => {
    const { getByTestId } = render(...);
    expect(getByTestId('key-BACKSPACE')).toBeInTheDocument();
  });
});
```

### Integration Tests

- Test full Buzz flow with Hebrew language
- Verify content moderation rejects known political topics

### Edge Cases

- Hebrew 4-letter words with final forms (ם, ן, ך, ף, ץ)
- Japanese character handling
- Very long trending topics in prompts
- Image loading failures

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation
```bash
cd fe-next && npm run type-check
```
**Expected:** No type errors

### Level 2: Linting
```bash
cd fe-next && npm run lint
```
**Expected:** No lint errors

### Level 3: Unit Tests
```bash
cd fe-next && npm run test:frontend -- --testPathPattern="WordleChallenge|FillBlank|BuzzResults" --watchAll=false
```
**Expected:** All tests pass

### Level 4: Backend Tests
```bash
cd fe-next && npm run test:backend -- --testPathPattern="buzz" --watchAll=false
```
**Expected:** All tests pass

### Level 5: Full Build
```bash
cd fe-next && npm run build
```
**Expected:** Build succeeds

### Level 6: Manual Validation

1. **Wordle Test:**
   - Set browser to Hebrew (`?locale=he`)
   - Play Daily Buzz with Wordle challenge
   - Verify 4-letter grid displays
   - Verify backspace key works

2. **Content Test:**
   - Generate new buzz challenges
   - Verify no political/inappropriate content

3. **Image Test:**
   - Check DailyChallengeLanding page
   - Verify Buzz card shows preview image

4. **Results Test:**
   - Complete a Buzz challenge with 7 challenges
   - Verify results page scrolls

---

## ACCEPTANCE CRITERIA

- [ ] Wordle displays correct number of letter boxes based on language (4 for Hebrew, 5 for English)
- [ ] On-screen keyboard includes backspace key on all layouts
- [ ] Backspace key has visual icon (⌫) and works correctly
- [ ] Content moderation filters political/inappropriate content more effectively
- [ ] Fill-the-blank prompts show correct first letter matching the answer
- [ ] Preview images display on DailyChallengeLanding page
- [ ] BuzzResultsScreen content is scrollable when overflowing
- [ ] All existing tests continue to pass
- [ ] Build succeeds without errors

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms all issues resolved
- [ ] Acceptance criteria all met

---

## NOTES

### Design Rationale

- **Dynamic word length:** Using language configuration ensures consistency between backend validation and frontend display
- **Backspace on keyboard:** Essential for mobile users who can't use physical keyboard
- **Conservative moderation:** Children's game should err on side of caution
- **First letter validation:** Prevents confusing UX where hint doesn't match

### Priority Order

1. **Wordle + Backspace** (High) - Affects gameplay usability
2. **Content Moderation** (High) - Affects content appropriateness
3. **Fill-blank validation** (Medium) - Affects UX clarity
4. **Image display** (Medium) - Affects visual appeal
5. **Scroll fix** (Low) - May already work, needs verification

### Known Limitations

- Content moderation will never be 100% perfect with AI
- Some edge cases in Hebrew final letters may need special handling
- Image generation is behind feature flag, may not be enabled for all users
