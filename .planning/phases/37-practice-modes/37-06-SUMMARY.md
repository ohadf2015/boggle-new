---
phase: 37
plan: 06
subsystem: education-practice-translations
tags: [translations, i18n, localization, practice-modes]
requires: [37-05]
provides: [practice-mode-translations, full-i18n]
affects: []
tech-stack:
  added: []
  patterns: [flat-translation-keys]
key-files:
  created: []
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
    - components/practice/PracticeModeSelector.tsx
    - components/practice/PracticeHeader.tsx
    - components/practice/QuickPracticeButton.tsx
    - components/practice/WordMatchingPractice.tsx
    - components/practice/SpellingChallengePractice.tsx
duration: 12 min
status: awaiting-verification
---

## Summary

Added ~30 translation keys for all 3 new practice modes (Word Matching, Spelling Challenge, Timed Blitz) across all 4 languages (English, Hebrew, Swedish, Japanese).

## Changes

### Translations Added (per language)
- Mode selector labels: matching, matchingDesc, spelling, spellingDesc, blitz, blitzDesc
- Word Matching: matchPairs, pairsMatched, dragToMatch, tapToSelect, correctMatch, wrongMatch, matchingWords, matchingDefinitions
- Spelling Challenge: spellTheWord, typeTheWord, correctSpelling, incorrectSpelling, difficulty.easy/medium/hard
- Timed Blitz: blitzTitle, getReady, go, timesUp, wordsFound, maxCombo, blitzScore
- Shared: needsMoreWords, sessionComplete, hint, combo, submit, typeAnswer, typeWord, correct, incorrect, correctAnswer, streak

### Code Fixes
- Aligned translation key patterns from nested (`matching.title`) to flat (`matching`) to match existing convention
- Updated PracticeModeSelector, PracticeHeader, QuickPracticeButton, WordMatchingPractice, SpellingChallengePractice

## Verification
- 136/136 practice tests passing
- TypeScript clean
- Translation check: 0 missing keys used in code
- Build error pre-existing (server.ts/next/headers issue, unrelated)

## Checkpoint
Human verification checkpoint pending — manual testing of all 3 modes in multiple languages required.
