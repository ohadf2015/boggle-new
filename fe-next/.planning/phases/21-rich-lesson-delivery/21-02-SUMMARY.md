---
phase: 21-rich-lesson-delivery
plan: 02
subsystem: education
tags: [react, tts, web-speech-api, i18n, neo-brutalist, accessibility]

# Dependency graph
requires:
  - phase: 21-01
    provides: "TTS service for pronunciation"
provides:
  - "Enriched vocabulary card component with pronunciation"
  - "PronunciationButton with TTS integration"
  - "Vocabulary type definitions (EnrichedVocabularyWord)"
affects: [21-04, 21-05, 21-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Enriched card pattern with collapsible sections"
    - "TTS integration via custom React hook"

key-files:
  created:
    - types/vocabulary.ts
    - hooks/useSpeechSynthesis.ts
    - components/practice/PronunciationButton.tsx
    - components/practice/VocabularyCardEnriched.tsx
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js

key-decisions:
  - "education.lesson namespace for practice component translations"
  - "Compact mode for reduced content in constrained layouts"
  - "IPA fallback tooltip when TTS voice unavailable"
  - "Neo-yellow background for contextual examples to differentiate from regular examples"

patterns-established:
  - "useSpeechSynthesis hook pattern: wraps service with React state for loading indicators"
  - "Enriched card layout: header with pronunciation, definition, examples, contextual examples"

# Metrics
duration: 15min
completed: 2026-01-29
---

# Phase 21 Plan 02: Enriched Vocabulary Card Summary

**Neo-Brutalist vocabulary card with TTS pronunciation, definition display, and usage examples across 4 languages**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-29T22:08:34Z
- **Completed:** 2026-01-29T22:23:43Z
- **Tasks:** 4 (1 types, 1 button, 1 card, 1 translations)
- **Files modified:** 8

## Accomplishments
- VocabularyCardEnriched displays word, definition, and examples with Neo-Brutalist design
- PronunciationButton triggers TTS with speaker icon and loading state
- IPA pronunciation fallback when voice unavailable
- RTL support via LanguageContext
- Compact mode for flexible layouts

## Task Commits

Each task was committed atomically:

1. **Task 1: Vocabulary Types** - `fe18239` (feat: EnrichedVocabularyWord, VocabularyExample)
2. **Task 2: PronunciationButton** + **Task 4: Translations** - `e2c5321` (feat: component + 4 languages)
3. **Task 3: VocabularyCardEnriched** - `22f594c` (feat: full card with sections)

## Files Created/Modified
- `types/vocabulary.ts` - EnrichedVocabularyWord interface with definition, pronunciation, examples
- `hooks/useSpeechSynthesis.ts` - React hook wrapping speakWord service with loading state
- `components/practice/PronunciationButton.tsx` - Speaker button with Neo-Brutalist styling, TTS integration
- `components/practice/VocabularyCardEnriched.tsx` - Full enriched card with collapsible sections
- `translations/{en,he,sv,ja}.js` - Added education.lesson.{definition,examples,contextualExamples,pronounce,speaking,pronunciationFallback}

## Decisions Made

1. **education.lesson namespace** - Practice components use `education.lesson` not `teacher.lesson` for translation keys
2. **Compact mode toggle** - Enables flexible layouts (full detail vs. summary view)
3. **IPA fallback pattern** - Tooltip appears when TTS voice unavailable (3s auto-dismiss)
4. **Contextual examples styling** - Neo-yellow background with neo-yellow border differentiates from regular examples
5. **Part of speech indicator** - Optional field shown when available (italic, muted)

## Deviations from Plan

None - plan executed exactly as written. Translation namespace adjustment was part of normal execution flow.

## Issues Encountered

**Translation namespace confusion** - Initial implementation used `lesson.*` keys but component needed `education.lesson.*` namespace. Resolved by:
- Adding keys under `education.lesson` in all 4 translation files
- Updating component to use `education.lesson.pronounce` etc.
- Translation checker passed after namespace correction

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- VocabularyCardEnriched ready for integration into practice modes (21-04)
- PronunciationButton can be reused in other vocabulary contexts
- Type definitions support enriched vocabulary from OpenAI service (21-01)
- Translation keys in place for lesson delivery UI

---
*Phase: 21-rich-lesson-delivery*
*Completed: 2026-01-29*
