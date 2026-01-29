---
phase: 21
plan: 06
subsystem: education-platform
tags: [flashcards, TTS, swipe-gestures, daily-buzz, enrichment]
requires: [21-01-TTS, 21-02-EnrichedCards, 21-04-SwipeStack, 21-05-BuzzContext]
provides: [enhanced-flashcard-review, mode-toggle-ui, enrichment-integration]
affects: [student-lesson-practice]
key-files:
  created: []
  modified:
    - components/practice/FlashcardReview.tsx
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions:
  - key: websocket-enrichment
    choice: "Client-side enrichment via WebSocket on FlashcardReview mount"
    rationale: "Enables real-time Daily Buzz context integration without blocking render, graceful degradation on failure"
  - key: mode-toggle-placement
    choice: "Mode toggle buttons in header (visible only when enrichedWords available)"
    rationale: "Clean UX: classic mode for basic review, swipe mode unlocks after enrichment completes"
  - key: auto-pronounce-placement
    choice: "Checkbox below progress bar in classic mode"
    rationale: "Accessible position, doesn't clutter header, easy to toggle during practice"
  - key: manual-pronunciation-button
    choice: "PronunciationButton on definition side of classic flashcard"
    rationale: "Provides manual pronunciation option even when auto-pronounce disabled"
  - key: task-4-skip
    choice: "Skip practice page changes - already properly configured"
    rationale: "PageClient.tsx already wraps FlashcardReview in PracticeSessionProvider, enrichment happens internally"
tech-stack:
  added: []
  patterns:
    - "WebSocket event listeners in useEffect with cleanup"
    - "Conditional rendering based on reviewMode state"
    - "Loading state UI during async enrichment"
duration: 10min
completed: 2026-01-29
---

# Phase 21 Plan 06: Enhanced Flashcard Review Summary

**One-liner:** Integrated TTS, swipe gestures, and Daily Buzz enrichment into FlashcardReview with mode toggle UI

## What Was Built

### Core Integration
1. **Mode Toggle UI**
   - Classic mode: Traditional tap-to-flip flashcards
   - Swipe mode: FlashcardSwipeStack with gesture controls
   - Toggle buttons (MousePointer2 / Layers icons) in header
   - Mode toggle only visible after vocabulary enrichment completes

2. **Vocabulary Enrichment Integration**
   - WebSocket-based enrichment on component mount
   - Converts VocabularyWord → EnrichedVocabularyWord format
   - Enriches with Daily Buzz contextual examples
   - Loading state (Loader2 spinner) during enrichment
   - Graceful degradation: classic mode works without enrichment

3. **TTS Pronunciation Integration**
   - useSpeechSynthesis hook integrated
   - Auto-pronounce checkbox option (below progress bar)
   - Auto-pronounce triggers when flipping to answer side
   - PronunciationButton on definition side for manual pronunciation
   - Fallback to IPA pronunciation when TTS unavailable

4. **Translation Keys**
   - Added classicMode, swipeMode, autoPronounce, enrichingContent
   - Translations in 4 languages (en, he, sv, ja)

### User Flow
1. Student selects flashcard practice mode
2. FlashcardReview mounts → emits `enrichVocabulary` WebSocket event
3. Loading spinner shows while enrichment in progress
4. After enrichment: mode toggle buttons appear
5. Classic mode: tap-to-flip with auto-pronounce option
6. Swipe mode: gesture-based review with enriched cards
7. Both modes integrate with XP system (results screen shows XP earned)

## Implementation Details

### FlashcardReview Enhancements
```typescript
// State management
const [reviewMode, setReviewMode] = useState<ReviewMode>('classic');
const [enrichedWords, setEnrichedWords] = useState<EnrichedVocabularyWord[]>([]);
const [isEnriching, setIsEnriching] = useState(false);
const [autoPronounce, setAutoPronounce] = useState(false);

// WebSocket enrichment
useEffect(() => {
  socket.emit('enrichVocabulary', { words: wordsToEnrich, language });
  socket.on('vocabularyEnriched', handleEnriched);
  return () => socket.off('vocabularyEnriched', handleEnriched);
}, [words, language]);

// Auto-pronounce on flip
const handleFlip = useCallback(() => {
  setIsFlipped((prev) => {
    const nextFlipped = !prev;
    if (nextFlipped && autoPronounce && currentWord) {
      speak(currentWord.word);
    }
    return nextFlipped;
  });
}, [autoPronounce, currentWord, speak]);
```

### Conditional Rendering
- Loading state: Shows spinner during enrichment
- Swipe mode: Renders FlashcardSwipeStack when `reviewMode === 'swipe' && enrichedWords.length > 0`
- Classic mode: Existing tap-to-flip UI with TTS enhancements

## Testing

### Verification Passed
✅ Lint: No errors
✅ Build: Production build successful
✅ Translations: All 4 languages complete (en, he, sv, ja)
✅ Type safety: No TypeScript errors

### Manual Testing Required
- [ ] Verify WebSocket enrichment works (enrichVocabulary event)
- [ ] Test mode toggle (classic ↔ swipe)
- [ ] Test auto-pronounce checkbox functionality
- [ ] Test manual pronunciation button on definition side
- [ ] Test loading spinner during enrichment
- [ ] Verify Hebrew TTS limitation (IPA fallback shown)
- [ ] Test graceful degradation when Daily Buzz unavailable

## Deviations from Plan

### Task 4 Skipped
**Task:** Update Practice Page
**Status:** Skipped
**Reason:** Practice page (PageClient.tsx) already properly configured
- Already wraps FlashcardReview in PracticeSessionProvider
- Error boundaries exist via layout structure
- FlashcardReview enrichment happens internally on mount
- No changes needed to practice page integration

## Next Phase Readiness

### Dependencies Satisfied
✅ 21-01: TTS service (useSpeechSynthesis hook)
✅ 21-02: Enriched vocabulary card component
✅ 21-04: Swipeable flashcard stack
✅ 21-05: Daily Buzz context service

### Integration Points
- FlashcardReview now supports both classic and swipe modes
- TTS pronunciation integrated with auto-pronounce option
- Vocabulary enrichment via WebSocket (vocabularyEnrichmentHandler)
- Works within existing PracticeSessionProvider (XP integration)

### Known Limitations
1. **Hebrew TTS**: Most browsers lack Hebrew voices → IPA fallback shown
2. **Browser Compatibility**: Safari iOS requires user gesture for first speech
3. **Voice Quality**: Android voices robotic, iOS natural (rate 0.9 helps)
4. **Enrichment Timeout**: No timeout handling (assumes fast Daily Buzz response)

### Recommendations for Future Work
1. Add timeout handling for enrichment (fallback to basic mode after 5s)
2. Cache enriched words to avoid re-enriching on revisit
3. Add progress indicator during enrichment (% loaded)
4. Consider pre-enriching vocabulary when lesson assigned (background job)
5. Add enrichment retry logic if WebSocket fails
6. Consider server-side enrichment during lesson creation (faster UX)

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 1540b424 | Add translation keys for mode toggle and enrichment | translations/*.js |
| 5020b68f | Add mode toggle UI to FlashcardReview | FlashcardReview.tsx |
| 86351f10 | Integrate vocabulary enrichment | FlashcardReview.tsx |
| 03dc926e | Integrate TTS pronunciation | FlashcardReview.tsx |
| c06be3a5 | Task 4 skipped - practice page already configured | (empty commit) |

## Phase 21 Progress

**Plans completed:** 6/6
**Phase status:** COMPLETE

All Rich Lesson Delivery components integrated:
- ✅ 21-01: Text-to-Speech Service
- ✅ 21-02: Enriched Vocabulary Card
- ✅ 21-03: Swipe Gesture Hook
- ✅ 21-04: Swipeable Flashcard Stack
- ✅ 21-05: Daily Buzz Context Service
- ✅ 21-06: Lesson Assignment UI (Final Integration)

**Phase 21 complete!** Rich lesson delivery now includes TTS pronunciation, Daily Buzz-enriched examples, and swipeable flashcard review.
