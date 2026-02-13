# Phase 37: Practice Modes - Research

**Researched:** 2026-02-13
**Domain:** Interactive vocabulary practice with React drag-and-drop, timed challenges, and real-time feedback
**Confidence:** HIGH

## Summary

Phase 37 implements three diverse practice modes for vocabulary learning: word matching (drag-and-drop pairing), spelling challenge (progressive difficulty with hints), and timed blitz (60-second speed round with combos). The standard approach uses modern React patterns with dnd-kit for accessible drag-and-drop, custom timers using hooks, and real-time XP calculation.

Key technical decisions:
- **dnd-kit** is the modern standard for React drag-and-drop (react-beautiful-dnd is deprecated)
- Custom timer hooks over heavy libraries (existing CircularTimer pattern in codebase)
- XP values already configured in educationXpManager.ts (Phase 36)
- Database schema ready with practice_sessions table and RLS policies
- Accessibility requires keyboard alternatives to drag operations (WCAG 2.5.7)

**Primary recommendation:** Build on existing codebase patterns (FlashcardReview, CircularTimer, ComboDisplay) and use dnd-kit for drag-and-drop with mandatory keyboard alternatives.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.x | Drag-and-drop foundation | Modern, accessible, actively maintained; react-beautiful-dnd deprecated |
| @dnd-kit/sortable | 8.x | Sortable lists/grids | Official dnd-kit extension for matching pairs |
| @dnd-kit/utilities | 3.x | Pointer sensor helpers | Touch/mouse/keyboard sensor support |
| framer-motion | Already in codebase | Feedback animations | Existing pattern for success/error states |
| react (hooks) | 18.x (in use) | Timer state management | useState + useEffect for countdown timers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Already in codebase | Icons for feedback | Check/X/Clock icons for instant feedback |
| zod | Already in codebase | Input validation | Spelling challenge word validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dnd-kit | react-beautiful-dnd | react-beautiful-dnd deprecated (2022), no maintenance |
| dnd-kit | Native HTML drag-and-drop | Poor mobile support, inconsistent across browsers |
| Custom timer | react-countdown-circle-timer | Over-engineered; codebase already has CircularTimer |
| Custom timer | react-timer-hook | Adds dependency; useEffect pattern simpler |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
components/
├── practice/
│   ├── PracticeModeSelector.tsx       # Mode selection UI
│   ├── WordMatchingPractice.tsx       # Drag-and-drop pairs
│   ├── SpellingChallengePractice.tsx  # Type correct word
│   ├── TimedBlitzPractice.tsx         # 60s speed round
│   ├── PracticeTimer.tsx              # Shared countdown component
│   ├── PracticeResults.tsx            # XP + stats display
│   ├── hooks/
│   │   ├── usePracticeSession.ts      # Session tracking + XP calc
│   │   ├── useMatchingGame.ts         # Word matching state
│   │   ├── useSpellingGame.ts         # Spelling challenge state
│   │   └── useBlitzGame.ts            # Timed blitz state
│   └── __tests__/                     # Test files
lib/supabase/education/
├── practice.ts                         # DB operations (already stubbed)
backend/modules/
└── educationXpManager.ts              # XP calculation (already implemented)
```

### Pattern 1: Accessible Drag-and-Drop with dnd-kit
**What:** Touch/mouse/keyboard drag-and-drop for word matching
**When to use:** Word matching mode (pairing words with definitions)
**Example:**
```typescript
// Source: https://docs.dndkit.com/
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function WordMatchingPractice({ words, definitions }) {
  const [items, setItems] = useState(words);

  // CRITICAL: Multi-input support (touch, mouse, keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items}>
        {items.map(id => <DraggableItem key={id} id={id} />)}
      </SortableContext>
    </DndContext>
  );
}
```

### Pattern 2: Timer with Urgency States
**What:** Countdown timer with color/animation changes as time runs low
**When to use:** Timed blitz mode (60s round)
**Example:**
```typescript
// Source: Existing codebase pattern from CircularTimer.tsx
function PracticeTimer({ totalTime, onTimeUp }) {
  const [remainingTime, setRemainingTime] = useState(totalTime);

  useEffect(() => {
    if (remainingTime <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setRemainingTime(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime, onTimeUp]);

  // Urgency thresholds (from CircularTimer pattern)
  const isLowTime = remainingTime <= 20;
  const isVeryLowTime = remainingTime <= 10 && remainingTime > 0;

  return (
    <div className={cn(
      "timer-display",
      isVeryLowTime && "timer-critical",
      isLowTime && "timer-warning"
    )}>
      {remainingTime}s
    </div>
  );
}
```

### Pattern 3: Combo System with Visual Feedback
**What:** Track consecutive correct answers with multiplier display
**When to use:** Timed blitz mode, spelling challenge streak
**Example:**
```typescript
// Source: Existing codebase pattern from blast/types.ts and ComboDisplay.tsx
function useComboTracker(onComboChange?: (combo: number) => void) {
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const incrementCombo = useCallback(() => {
    setCombo(prev => {
      const newCombo = prev + 1;
      setMaxCombo(current => Math.max(current, newCombo));
      onComboChange?.(newCombo);
      return newCombo;
    });
  }, [onComboChange]);

  const resetCombo = useCallback(() => {
    setCombo(0);
  }, []);

  return { combo, maxCombo, incrementCombo, resetCombo };
}

// Usage with XP calculation
const comboBonus = combo * EDUCATION_XP_CONFIG.BLITZ_COMBO_BONUS; // 3 XP per combo level
```

### Pattern 4: Practice Session Lifecycle
**What:** Create session → track progress → calculate XP → save to DB
**When to use:** All practice modes
**Example:**
```typescript
// Source: Backend educationXpManager.ts + practice.ts stub
function usePracticeSession(mode: 'matching' | 'spelling' | 'blitz') {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState({
    wordsAttempted: 0,
    wordsCorrect: 0,
    score: 0,
  });

  const startSession = async (lessonId: string) => {
    // Create practice_sessions record
    const session = await createPracticeSession({
      studentId: user.id,
      lessonId,
      mode,
    });
    setSessionId(session.id);
  };

  const completeSession = async () => {
    if (!sessionId) return;

    // Calculate XP based on mode-specific data
    const xpResult = calculatePracticeXp({
      type: mode,
      sessionData: {
        pairsMatched: sessionData.wordsCorrect,
        totalPairs: sessionData.wordsAttempted,
        // ... mode-specific fields
      },
    });

    // Save session with XP
    await updatePracticeSession(sessionId, {
      score: sessionData.score,
      accuracy: sessionData.wordsCorrect / sessionData.wordsAttempted,
      wordsAttempted: sessionData.wordsAttempted,
      wordsCorrect: sessionData.wordsCorrect,
      xpAwarded: xpResult.totalXp,
      completedAt: new Date().toISOString(),
    });

    return xpResult;
  };

  return { startSession, completeSession, sessionData, setSessionData };
}
```

### Anti-Patterns to Avoid
- **Over-animation on drag**: Excessive transforms/shadows slow mobile performance
- **No keyboard alternative**: WCAG 2.5.7 violation; must provide button/click alternative
- **Synchronous XP calculation**: Use async to prevent UI blocking on save
- **Hardcoded time values**: Use constants for timer durations (testability)
- **Missing reduced motion**: Check `prefers-reduced-motion` for accessibility

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop from scratch | Custom mouse/touch handlers | dnd-kit | Mobile edge cases, accessibility, keyboard support |
| Touch gesture detection | Raw touchstart/touchmove | dnd-kit PointerSensor | Unified pointer events, browser quirks handled |
| Timer with pause/resume | Custom setInterval logic | useState + useEffect + useRef | Cleanup, memory leaks, re-render optimization |
| XP calculation formulas | Inline math in components | educationXpManager.ts | Already implemented, tested, centralized |
| Spell checking | Levenshtein distance logic | Existing dictionary validation | Word list already in vocabulary_lessons |
| Input debouncing | Custom setTimeout | useDebouncedCallback hook | Cleanup, stale closures avoided |

**Key insight:** dnd-kit solves the hardest cross-platform drag-and-drop problems (iOS touch delays, Android pointer events, keyboard navigation). Building this manually means debugging browser quirks for months.

## Common Pitfalls

### Pitfall 1: iOS Touch Delay in Drag-and-Drop
**What goes wrong:** 300ms touch delay on iOS makes dragging feel laggy
**Why it happens:** iOS waits for double-tap before firing touch events
**How to avoid:** Use dnd-kit's PointerSensor (not TouchSensor) and set CSS `touch-action: none`
**Warning signs:** User reports "drag is slow on iPhone" or "sometimes drag doesn't start"
**Code fix:**
```css
.draggable-item {
  touch-action: none; /* Prevent iOS touch delay */
}
```

### Pitfall 2: Timer Drift with setInterval
**What goes wrong:** Timer shows 61-62 seconds instead of exactly 60
**Why it happens:** setInterval doesn't account for execution time; drift compounds
**How to avoid:** Calculate remaining time from start timestamp, not by decrementing
**Warning signs:** Timer occasionally shows wrong values, doesn't sync with server
**Code fix:**
```typescript
// BAD: Drift accumulates
setInterval(() => setTime(t => t - 1), 1000);

// GOOD: Calculate from start time
const startTime = Date.now();
setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  setTime(totalTime - elapsed);
}, 100); // Poll more frequently for accuracy
```

### Pitfall 3: Forgetting Keyboard Accessibility (WCAG Violation)
**What goes wrong:** Users can't complete word matching without mouse/touch
**Why it happens:** Drag-and-drop often forgets keyboard users
**How to avoid:** dnd-kit's KeyboardSensor with sortableKeyboardCoordinates
**Warning signs:** Accessibility audit fails, keyboard-only users can't progress
**Code fix:**
```typescript
// CRITICAL: Include KeyboardSensor for WCAG 2.1.1 compliance
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates, // Arrow keys to navigate
  })
);
```

### Pitfall 4: XP Calculation Inconsistency
**What goes wrong:** Different XP amounts for same performance across modes
**Why it happens:** Inline calculations drift from educationXpManager.ts config
**How to avoid:** Always import and use EDUCATION_XP_CONFIG constants
**Warning signs:** Bug reports "I got 50 XP yesterday, only 45 today for same score"
**Code fix:**
```typescript
// BAD: Magic numbers
const xp = correctAnswers * 15 + (accuracy > 0.9 ? 40 : 0);

// GOOD: Use centralized config
import { EDUCATION_XP_CONFIG } from '@/backend/modules/educationXpManager';
const xp = correctAnswers * EDUCATION_XP_CONFIG.MATCHING_PAIR_CORRECT +
  (accuracy > 0.9 ? EDUCATION_XP_CONFIG.MATCHING_ACCURACY_BONUS[90] : 0);
```

### Pitfall 5: Not Handling Empty Vocabulary Lists
**What goes wrong:** Practice mode crashes when lesson has 0 words
**Why it happens:** Assuming vocabulary_lessons.words is always non-empty array
**How to avoid:** Validate word count before starting session, show empty state
**Warning signs:** Sentry error "Cannot read property 'word' of undefined"
**Code fix:**
```typescript
// GOOD: Validate before rendering
if (!lesson.words || lesson.words.length === 0) {
  return <EmptyState message={t('practice.noWords')} />;
}
```

## Code Examples

Verified patterns from codebase and official sources:

### Word Matching Pair Component (dnd-kit)
```typescript
// Source: https://docs.dndkit.com/api-documentation/sortable/usesortable
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DraggableWordPair({ id, word, definition, onMatch }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "word-pair-card border-neo shadow-hard-sm",
        isDragging && "cursor-grabbing"
      )}
    >
      <div className="word font-neo-display">{word}</div>
      <div className="definition font-neo-body">{definition}</div>
    </div>
  );
}
```

### Spelling Challenge Input with Validation
```typescript
// Source: Existing codebase patterns + react-hook-form
function SpellingInput({ correctWord, onSubmit }) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const handleSubmit = () => {
    const isCorrect = input.trim().toLowerCase() === correctWord.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // Instant feedback animation
    setTimeout(() => {
      onSubmit(isCorrect);
      setInput('');
      setFeedback(null);
    }, 1000);
  };

  return (
    <div className="spelling-input-container">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className={cn(
          "neo-input",
          feedback === 'correct' && "border-green-500 bg-green-50",
          feedback === 'incorrect' && "border-red-500 bg-red-50 animate-shake"
        )}
        autoComplete="off"
        autoFocus
      />
      {feedback === 'correct' && <Check className="text-green-500 animate-scale-in" />}
      {feedback === 'incorrect' && <X className="text-red-500 animate-shake" />}
    </div>
  );
}
```

### Blitz Timer with Combo Display
```typescript
// Source: Existing CircularTimer.tsx + ComboDisplay.tsx patterns
function BlitzGameTimer({ onTimeUp, onCombo }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const { combo, incrementCombo, resetCombo } = useComboTracker(onCombo);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  return (
    <div className="blitz-timer-container">
      <CircularTimer remainingTime={timeLeft} totalTime={60} size="lg" />
      {combo > 1 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="combo-badge"
        >
          {combo}x Combo!
        </motion.div>
      )}
    </div>
  );
}
```

### Practice Session XP Results Display
```typescript
// Source: Backend educationXpManager.ts mastery message pattern
function PracticeResults({ sessionData, xpResult, onContinue }) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="practice-results-card"
    >
      {/* Mastery message BEFORE XP (research finding) */}
      <h2 className="mastery-message font-neo-display">
        {xpResult.masteryMessage}
      </h2>

      <div className="xp-display">
        <span className="xp-amount text-neo-yellow">{xpResult.totalXp} XP</span>
      </div>

      <div className="stats-grid">
        <Stat label={t('practice.accuracy')} value={`${sessionData.accuracy}%`} />
        <Stat label={t('practice.wordsCorrect')} value={sessionData.wordsCorrect} />
      </div>

      {/* XP breakdown (collapsed by default) */}
      <details className="xp-breakdown">
        <summary>{t('practice.xpBreakdown')}</summary>
        {Object.entries(xpResult.breakdown).map(([key, value]) => (
          <div key={key}>{key}: {value} XP</div>
        ))}
      </details>

      <Button onClick={onContinue}>{t('practice.continue')}</Button>
    </motion.div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | dnd-kit | 2022 (deprecation) | Must use dnd-kit; rbd unmaintained |
| TouchSensor for mobile | PointerSensor | 2021 (unified events) | Better iOS touch handling |
| Custom timer libs | useState + useEffect | 2023+ (hooks maturity) | Less dependencies, more control |
| XP after session | Real-time XP preview | Phase 36 (2026) | Instant gratification, mastery focus |
| Separate mode UIs | Shared practice components | Current (Phase 37) | Code reuse, consistent UX |

**Deprecated/outdated:**
- react-beautiful-dnd: Deprecated 2022, use dnd-kit instead
- TouchSensor in dnd-kit: Use PointerSensor for unified touch/mouse handling
- Inline XP calculations: Use educationXpManager.ts (centralized as of Phase 36)

## Open Questions

1. **Progressive difficulty in spelling challenge**
   - What we know: XP config has SPELLING_STREAK_BONUS for consecutive correct
   - What's unclear: How to order words by difficulty (word length? frequency?)
   - Recommendation: Start with word length (5+ letters = harder), iterate based on analytics

2. **Hint system for spelling challenge**
   - What we know: Requirement says "hints" but no spec on hint type/frequency
   - What's unclear: First letter hint? Definition repeat? Skip option?
   - Recommendation: Progressive hints (1st letter free, full word skip costs combo)

3. **Matching mode layout (drag zones vs shuffle)**
   - What we know: Need to pair words with definitions
   - What's unclear: Two columns (words | definitions)? Or shuffled grid?
   - Recommendation: Two-column layout (clearer mental model, easier drag zones)

4. **Blitz mode word cycling strategy**
   - What we know: 60s speed round, cycles through vocabulary
   - What's unclear: Show word or definition first? Both at once?
   - Recommendation: Show definition → type word (consistent with spelling mode)

## Sources

### Primary (HIGH confidence)
- [dnd-kit Documentation](https://docs.dndkit.com/) - Official API reference for drag-and-drop
- [Puck: Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Library comparison
- [dnd-kit vs react-beautiful-dnd Discussion](https://github.com/clauderic/dnd-kit/discussions/481) - Migration guide
- [WCAG 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) - Accessibility requirements
- [WCAG 2.1.1: Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html) - Keyboard navigation standards
- Existing codebase patterns:
  - `fe-next/components/CircularTimer.tsx` - Timer with urgency states
  - `fe-next/components/practice/FlashcardReview.tsx` - Card flip + results pattern
  - `fe-next/backend/modules/educationXpManager.ts` - XP calculation formulas
  - `fe-next/components/blast/types.ts` - Combo system constants
  - `fe-next/supabase/migrations/20260213000000_education_duels_practice.sql` - Database schema

### Secondary (MEDIUM confidence)
- [Croct: Best React Countdown Timer Libraries of 2026](https://blog.croct.com/post/best-react-countdown-timer-libraries) - Timer library comparison
- [Game Developer: The Design of Combos and Chains](https://www.gamedeveloper.com/design/the-design-of-combos-and-chains) - Combo system design
- [ScienceDirect: Digital game-based language learning for vocabulary development](https://www.sciencedirect.com/science/article/pii/S2666557324000028) - Educational game research

### Tertiary (LOW confidence)
- [ReactScript: 10 Best Drag And Drop Components For React (2026)](https://reactscript.com/best-drag-drop/) - Broader library survey
- [Board Game Design Course: Combos and Chaining](https://boardgamedesigncourse.com/making-your-players-feel-smart-by-using-combos-and-chaining/) - Game design theory

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dnd-kit is industry standard, react-beautiful-dnd deprecated
- Architecture: HIGH - Patterns verified in existing codebase (CircularTimer, FlashcardReview)
- Pitfalls: HIGH - iOS touch delay and timer drift are documented browser issues
- XP integration: HIGH - educationXpManager.ts already implemented with all values
- Accessibility: HIGH - WCAG 2.5.7 and 2.1.1 are official standards

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - stable ecosystem, no breaking changes expected)
