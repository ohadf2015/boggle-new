# Phase 21: Rich Lesson Delivery - Research

## Overview

This phase enhances student learning with rich vocabulary content including pronunciation, contextual examples from Daily Buzz, and interactive swipe-based flashcard review.

## Requirements

- **LESSON-01**: Student sees rich vocabulary explanations (definitions, pronunciation, usage examples)
- **LESSON-02**: Student sees contextual examples from Daily Buzz trending content
- **LESSON-03**: Student can practice with swipe-based flashcard review for active recall

## Standard Stack

| Concern | Solution | Rationale |
|---------|----------|-----------|
| Text-to-Speech | Web Speech API | Browser-native, no external dependencies, good English support |
| Swipe Gestures | Framer Motion | Already in project, excellent drag/gesture support |
| Card Animations | Framer Motion | Consistent with existing animation patterns |
| State Management | React hooks | Local state sufficient for review flow |

## Technical Patterns

### 1. Text-to-Speech (Web Speech API)

```typescript
// Basic TTS usage
const utterance = new SpeechSynthesisUtterance('hello');
utterance.lang = 'en-US';
utterance.rate = 0.9; // Slightly slower for learning
speechSynthesis.speak(utterance);

// Voice selection (prefer local voices)
const voices = speechSynthesis.getVoices();
const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService);
```

**Key considerations:**
- Voices load asynchronously - listen for `voiceschanged` event
- Hebrew/Japanese voices may not be available on all systems
- Provide IPA fallback when voice not available
- Cancel previous utterance before starting new one

### 2. Swipe Gesture Detection (Framer Motion)

```typescript
import { motion, useMotionValue, useTransform } from 'framer-motion';

function SwipeCard({ onSwipe }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-50, 50]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 150) {
      onSwipe('right'); // Got It
    } else if (info.offset.x < -150) {
      onSwipe('left'); // Don't Know
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, opacity }}
    >
      {/* Card content */}
    </motion.div>
  );
}
```

**Key considerations:**
- Threshold: 150px minimum swipe distance
- Rotation: -50deg to +50deg based on drag position
- Snap back with spring physics when insufficient swipe
- Keyboard shortcuts (ArrowLeft/ArrowRight) for accessibility

### 3. Daily Buzz Context Matching

```typescript
// Fuzzy word matching for context examples
function findContextualExamples(word: string, buzzContext: string): string[] {
  const sentences = buzzContext.split(/[.!?]+/);
  const normalizedWord = normalizeWord(word);

  return sentences.filter(sentence => {
    const words = sentence.toLowerCase().split(/\s+/);
    return words.some(w => normalizeWord(w) === normalizedWord);
  });
}

// Handle word variations (plural, -ing, -ed)
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/ing$|ed$|s$|ies$/, '');
}
```

**Key considerations:**
- BuzzChallenge has `trending_context` field with news snippet
- Use fuzzy matching to find word in context sentences
- Handle morphological variants (plural, tense)
- Limit to 3 contextual examples maximum

### 4. Enriched Vocabulary Structure

```typescript
interface EnrichedVocabularyWord {
  word: string;
  language: 'en' | 'he' | 'sv' | 'ja' | 'es';
  definition: string;
  partOfSpeech?: string;
  pronunciation?: string;  // IPA
  audioUrl?: string;       // Pre-recorded audio if available
  examples: VocabularyExample[];
  contextualExamples?: VocabularyExample[];  // From Daily Buzz
  relatedWords?: string[];
  difficulty?: number;
}

interface VocabularyExample {
  sentence: string;
  translation?: string;
  source?: string;  // e.g., "Daily Buzz: AI Technology"
}
```

## UI Design (Neo-Brutalist)

### Card Stack Visual
- Show 2-3 cards stacked with visual depth
- Top card interactive, others peeking behind
- Scale: 1.0, 0.95, 0.90 for stack effect
- Offset: 0px, 8px, 16px vertical

### Swipe Feedback
- Green glow + "Got It" badge on right swipe
- Red glow + "Don't Know" badge on left swipe
- Badge appears at ~30% threshold, full opacity at 100%
- Neo-Brutalist styling: `shadow-hard`, `border-neo`, rotation

### Mode Toggle
- Neo-Brutalist toggle buttons
- Classic mode: Tap-to-flip (existing behavior)
- Swipe mode: Drag-based review
- Active state: Pressed shadow, filled color

## Accessibility

- Keyboard shortcuts: ArrowLeft/ArrowRight for swipe
- Space bar to flip card
- Screen reader announcements for card content
- Auto-pronounce toggle for TTS
- IPA fallback when TTS not available
- RTL support for Hebrew (shadows auto-flip)

## Pitfalls to Avoid

1. **TTS Voice Loading**: Voices may not be immediately available - handle async loading
2. **Hebrew TTS**: Limited browser support - always provide IPA fallback
3. **Swipe on Mobile**: Ensure gesture doesn't conflict with page scroll
4. **Context Matching**: Over-matching common words - limit examples, filter by relevance
5. **Performance**: Batch enrichment requests, don't enrich one word at a time

## Dependencies

- Framer Motion 12.x (already installed)
- Web Speech API (browser native)
- Existing Daily Buzz infrastructure (`backend/services/buzz/`)

## Files to Create/Modify

### Wave 1 (Parallel)
- `lib/speech/textToSpeech.ts` - TTS service
- `hooks/useSpeechSynthesis.ts` - React hook for TTS
- `hooks/useSwipeGesture.ts` - Swipe gesture detection
- `components/practice/VocabularyCardEnriched.tsx` - Enriched card UI
- `components/practice/PronunciationButton.tsx` - TTS button
- `lib/services/dailyBuzzContextService.ts` - Daily Buzz context matching
- `types/vocabulary.ts` - Type definitions

### Wave 2 (Depends on Wave 1)
- `components/practice/FlashcardSwipeStack.tsx` - Swipe stack component
- `components/practice/SwipeFeedbackOverlay.tsx` - Swipe direction feedback

### Wave 3 (Depends on Wave 2)
- `components/practice/FlashcardReview.tsx` - Enhanced with mode toggle
- `app/[locale]/student/lessons/[id]/practice/page.tsx` - Integration

## Success Criteria

1. Student sees word definition, pronunciation, and examples on vocabulary card
2. TTS pronounces word when button clicked (English works reliably)
3. Contextual examples from Daily Buzz appear when word matches trending content
4. Swipe right = "Got It", swipe left = "Don't Know" with visual feedback
5. Mode toggle allows switching between classic and swipe review
6. Keyboard shortcuts provide accessible alternative to swipe
7. RTL layout works correctly for Hebrew
8. Graceful degradation when TTS or enrichment unavailable
