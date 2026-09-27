# Feature: Daily Challenge Completed Card Transformation

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Transform the challenge cards on the Daily Challenge landing page (`DailyChallengeLanding.tsx`) to show satisfying, celebratory content when a player has completed a challenge. Instead of the current simple "Solved" badge, completed cards will transform into a mini celebration/summary view showing the player's score, a congratulatory message, and an encouraging "View Results" call-to-action.

## User Story

As a player returning to the daily challenge page
I want to see a satisfying summary of my completed challenges
So that I feel rewarded for my accomplishment and can easily access my full results

## Problem Statement

Currently, when a player completes a daily challenge (Word Hunt or Daily Buzz), the card only shows a small "Solved" badge. The card content remains the same as the unplayed state, which doesn't provide satisfying visual feedback for completion. Players deserve a more celebratory and informative experience.

## Solution Statement

Transform completed challenge cards to show:
1. A celebratory headline (e.g., "You Made It!" / "Challenge Complete!")
2. The player's score prominently displayed with visual flair
3. A satisfying visual transformation (different background, celebratory elements)
4. Clear "View Results" CTA that maintains engagement
5. Subtle confetti/sparkle animation on first view

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:** DailyChallengeLanding.tsx, CompactChallengeCard component, translations
**Dependencies:** Existing confettiUtils, framer-motion, existing score retrieval utilities

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/daily/DailyChallengeLanding.tsx` (lines 1-807)
  - **WHY:** Main component to modify - contains DailyChallengeLanding and CompactChallengeCard
  - **PATTERN:** Uses framer-motion for animations, Tailwind for styling, neo-brutalist design

- `components/daily/results/ResultDisplay.tsx` (lines 1-187)
  - **WHY:** Shows score display patterns and tier colors
  - **PATTERN:** getScoreStyles() function for score-based coloring

- `components/daily/StreakMilestoneCelebration.tsx` (lines 1-244)
  - **WHY:** Celebration pattern to mirror for completed state
  - **PATTERN:** Motion animations, confetti triggers, emoji use

- `utils/confettiUtils.ts` (lines 1-393)
  - **WHY:** Confetti utilities for celebration effects
  - **PATTERN:** fireConfetti(), NEO_BRUTALIST_COLORS

- `utils/dailyChallenge/storage.ts`
  - **WHY:** Contains hasPlayedToday() and getTodaysWordHuntResult()
  - **PATTERN:** Getting stored results with scores

- `translations/en.js` (lines 2414-2420)
  - **WHY:** Existing daily challenge translations
  - **PATTERN:** Translation key structure for daily namespace

### New Files to Create

None - this is an enhancement to existing files

### Files to Modify

- `components/daily/DailyChallengeLanding.tsx` - Add completed card transformation
- `translations/en.js` - Add new translation keys
- `translations/he.js` - Add Hebrew translations
- `translations/sv.js` - Add Swedish translations
- `translations/ja.js` - Add Japanese translations
- `translations/es.js` - Add Spanish translations
- `components/daily/__tests__/DailyChallengeLanding.solvedBadge.test.tsx` - Update/extend tests

### Patterns to Follow

**Score Tier Colors (from ResultDisplay.tsx):**
```typescript
function getScoreStyles(score: number) {
  if (score >= 800) return { color: 'text-neo-lime', glow: '...' };
  if (score >= 600) return { color: 'text-neo-yellow', glow: '...' };
  if (score >= 400) return { color: 'text-neo-orange', glow: '...' };
  return { color: 'text-neo-pink', glow: '...' };
}
```

**Neo-Brutalist Card Pattern (from existing CompactChallengeCard):**
```typescript
// Solid backgrounds, hard shadows, chunky borders
className="bg-slate-900/95 rounded-xl border-3 border-neo-black shadow-hard"
```

**Celebration Animation Pattern (from StreakMilestoneCelebration):**
```typescript
// Entry animation with spring
<motion.div
  initial={{ scale: 0, rotate: -10 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Data Retrieval Enhancement

**Goal:** Extend DailyChallengeLanding to retrieve stored scores for completed challenges

**Tasks:**
1. Import score retrieval utilities from dailyChallenge
2. Extend status state to include score data for completed challenges
3. Retrieve Word Hunt score from localStorage when status is 'done'
4. Retrieve Buzz score from API when status is 'done'

### Phase 2: UX Copy with UX Writer

**Goal:** Create satisfying, cute, and encouraging copy for completed card states

**UX Writer Output (to be translated):**
- **Headline options:** "You Made It!", "Challenge Complete!", "Nailed It!"
- **Score label:** "Your Score"
- **Encouragement:** "See your full results", "Check your ranking"
- **Streak tie-in (if applicable):** "Keep it going!"

### Phase 3: Card Transformation UI

**Goal:** Transform CompactChallengeCard appearance when status is 'done'

**Visual Changes:**
1. Replace preview area (grid/image) with score display
2. Add celebratory headline instead of tagline
3. Transform button to "VIEW RESULTS" with success styling
4. Add subtle success gradient/glow to card background
5. Optional: Add small confetti burst on first render

### Phase 4: Animation Polish

**Goal:** Add satisfying micro-animations to completed state

**Animations:**
1. Score number counter animation (AnimatedCounter pattern)
2. Subtle pulse on score display
3. One-time confetti burst when card first shows as completed
4. Smooth transition if status changes from 'new' to 'done'

### Phase 5: Testing & Validation

**Goal:** Ensure feature works correctly and doesn't break existing functionality

**Tests:**
1. Card transforms correctly when status is 'done'
2. Score is displayed correctly
3. Click navigates to results
4. Translations work for all 5 languages
5. Performance is acceptable (no jank)

---

## STEP-BY-STEP TASKS

### Task 1: ADD score retrieval to DailyChallengeLanding

- **IMPLEMENT:** Extend the status checking logic to also retrieve and store scores
- **FILE:** `components/daily/DailyChallengeLanding.tsx`
- **PATTERN:** Follow existing useEffect pattern for status checking (lines 81-171)
- **IMPORTS:** Add `getTodaysWordHuntResult` from `@/utils/dailyChallenge`

**Code changes:**
```typescript
// Add to interface
interface ChallengeStatus {
  wordHunt: 'new' | 'done';
  buzz: 'new' | 'done' | 'unavailable';
}

// Add new state for scores
interface CompletedScores {
  wordHunt: number | null;
  buzz: number | null;
}

// In component, add state:
const [completedScores, setCompletedScores] = useState<CompletedScores>({
  wordHunt: null,
  buzz: null,
});

// In checkWordHunt function, get score if played:
const checkWordHunt = () => {
  const wordHuntPlayed = hasPlayedToday(currentLanguage);
  setStatus(prev => ({ ...prev, wordHunt: wordHuntPlayed ? 'done' : 'new' }));

  if (wordHuntPlayed) {
    // Import and use getTodaysWordHuntResult
    const result = getTodaysWordHuntResult(currentLanguage);
    if (result?.result?.efficiencyScore) {
      setCompletedScores(prev => ({ ...prev, wordHunt: result.result.efficiencyScore }));
    }
  }

  setLoadingStatus(prev => ({ ...prev, wordHunt: false }));
};
```

- **VALIDATE:** `npm run test -- --testPathPattern="DailyChallengeLanding"`

### Task 2: ADD translation keys for completed card state

- **IMPLEMENT:** Add new translation keys for completed card UX copy
- **FILES:** All 5 translation files

**English (en.js):**
```javascript
// In daily section
"completedCard": {
  "headline": "You Made It!",
  "buzzHeadline": "Challenge Complete!",
  "yourScore": "Your Score",
  "seeResults": "See your ranking",
  "keepItGoing": "Keep it going!"
}
```

**Hebrew (he.js):**
```javascript
"completedCard": {
  "headline": "הצלחת!",
  "buzzHeadline": "אתגר הושלם!",
  "yourScore": "הציון שלך",
  "seeResults": "צפה בדירוג",
  "keepItGoing": "המשך כך!"
}
```

**Swedish (sv.js):**
```javascript
"completedCard": {
  "headline": "Du klarade det!",
  "buzzHeadline": "Utmaning klar!",
  "yourScore": "Din poäng",
  "seeResults": "Se din rankning",
  "keepItGoing": "Fortsätt så!"
}
```

**Japanese (ja.js):**
```javascript
"completedCard": {
  "headline": "クリア!",
  "buzzHeadline": "チャレンジ完了!",
  "yourScore": "あなたのスコア",
  "seeResults": "ランキングを見る",
  "keepItGoing": "この調子で!"
}
```

**Spanish (es.js):**
```javascript
"completedCard": {
  "headline": "¡Lo lograste!",
  "buzzHeadline": "¡Desafío completado!",
  "yourScore": "Tu puntuación",
  "seeResults": "Ver tu ranking",
  "keepItGoing": "¡Sigue así!"
}
```

- **VALIDATE:** `npm run lint`

### Task 3: CREATE CompletedCardContent sub-component

- **IMPLEMENT:** New sub-component for completed card content display
- **FILE:** `components/daily/DailyChallengeLanding.tsx` (add inside file)
- **PATTERN:** Follow existing component patterns in the file

```typescript
interface CompletedCardContentProps {
  score: number | null;
  challengeType: 'wordHunt' | 'buzz';
  isNewCompletion?: boolean; // For one-time animation
}

function CompletedCardContent({
  score,
  challengeType,
  isNewCompletion = false,
}: CompletedCardContentProps) {
  const { t } = useLanguage();
  const { enableComplexAnimations } = useDevicePerformance();
  const hasPlayedConfetti = useRef(false);

  // One-time confetti on first view (only if new completion)
  useEffect(() => {
    if (isNewCompletion && enableComplexAnimations && !hasPlayedConfetti.current) {
      hasPlayedConfetti.current = true;
      fireConfetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: NEO_BRUTALIST_COLORS,
      });
    }
  }, [isNewCompletion, enableComplexAnimations]);

  // Score tier styling
  const getScoreColor = (s: number) => {
    if (s >= 800) return 'text-neo-lime';
    if (s >= 600) return 'text-neo-yellow';
    if (s >= 400) return 'text-neo-orange';
    return 'text-neo-pink';
  };

  const headline = challengeType === 'buzz'
    ? t('daily.completedCard.buzzHeadline')
    : t('daily.completedCard.headline');

  return (
    <div className="flex flex-col items-center justify-center h-full py-2">
      {/* Celebratory emoji */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.4 }}
        className="text-3xl sm:text-4xl mb-1"
      >
        🎉
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-sm sm:text-base font-bold text-neo-lime mb-2"
      >
        {headline}
      </motion.div>

      {/* Score display */}
      {score !== null && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-center"
        >
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">
            {t('daily.completedCard.yourScore')}
          </div>
          <div className={cn(
            'text-3xl sm:text-4xl font-black',
            getScoreColor(score)
          )}>
            {score}
          </div>
        </motion.div>
      )}

      {/* Encouragement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[10px] text-slate-400 mt-2"
      >
        {t('daily.completedCard.seeResults')}
      </motion.div>
    </div>
  );
}
```

- **VALIDATE:** `npm run build`

### Task 4: UPDATE CompactChallengeCard to show completed content

- **IMPLEMENT:** Modify CompactChallengeCard to render CompletedCardContent when status is 'done'
- **FILE:** `components/daily/DailyChallengeLanding.tsx`
- **PATTERN:** Conditional rendering based on status prop

**Add new props to CompactChallengeCardProps:**
```typescript
interface CompactChallengeCardProps {
  // ... existing props
  /** Score for completed challenges */
  completedScore?: number | null;
  /** Challenge type for completed content */
  challengeType?: 'wordHunt' | 'buzz';
}
```

**Update preview area rendering (around line 716-735):**
```typescript
{/* Preview: Custom Grid, Image, Completed Content, or Icon */}
<div className="w-full h-32 sm:h-44 flex items-center justify-center mb-2 sm:mb-3">
  {status === 'done' && completedScore !== undefined ? (
    <CompletedCardContent
      score={completedScore}
      challengeType={challengeType || 'wordHunt'}
    />
  ) : customPreview === 'word-hunt-grid' ? (
    <WordHuntMiniGrid isHovered={isHovered} language={currentLanguage} />
  ) : imageElement ? (
    imageElement
  ) : (
    // ... existing icon fallback
  )}
</div>
```

**Update card background for completed state:**
```typescript
className={cn(
  'relative w-full bg-slate-900/95 rounded-xl border-3 border-neo-black p-3 sm:p-4',
  // ... existing classes
  status === 'done' && 'bg-linear-to-br from-slate-900 via-slate-800/90 to-slate-900',
)}
```

- **VALIDATE:** `npm run dev` and visually verify

### Task 5: PASS completedScore props from DailyChallengeLanding

- **IMPLEMENT:** Pass the retrieved scores to CompactChallengeCard components
- **FILE:** `components/daily/DailyChallengeLanding.tsx`

**Update Word Hunt card (around line 266-284):**
```typescript
<CompactChallengeCard
  icon={<Timer className="w-7 h-7 sm:w-10 sm:h-10" />}
  title={t('daily.wordHunt.title')}
  tagline={t('daily.wordHunt.desc')}
  color="orange"
  status={status.wordHunt}
  isLoadingStatus={loadingStatus.wordHunt}
  onPlay={onSelectWordHunt}
  timeMode="timed"
  timeModeLabel={t('daily.timed90Seconds')}
  customPreview="word-hunt-grid"
  currentLanguage={currentLanguage}
  completedScore={completedScores.wordHunt}
  challengeType="wordHunt"
  buttonText={
    status.wordHunt === 'done'
      ? t('daily.viewResults')
      : t('daily.play')
  }
  delay={0.2}
/>
```

**Update Daily Buzz card (around line 286-313):**
```typescript
<CompactChallengeCard
  // ... existing props
  completedScore={completedScores.buzz}
  challengeType="buzz"
  // ... rest of props
/>
```

- **VALIDATE:** `npm run test -- --testPathPattern="DailyChallengeLanding"`

### Task 6: ADD completed state styling to button

- **IMPLEMENT:** Style the VIEW RESULTS button differently for completed state
- **FILE:** `components/daily/DailyChallengeLanding.tsx`

**Update button section (around line 777-802):**
```typescript
{/* Play/Request Button with shine effect */}
{isUnavailable ? (
  // ... existing unavailable state
) : (
  <div
    className={cn(
      'relative w-full py-2 sm:py-2.5 text-xs sm:text-sm font-black uppercase rounded-lg overflow-hidden',
      status === 'done'
        ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm'
        : cn(styles.bg, 'text-neo-black border-2 border-neo-black shadow-hard-sm'),
      'transition-all'
    )}
  >
    {buttonText}
    {/* Shine sweep effect - only for non-completed */}
    {showEffects && status !== 'done' && (
      // ... existing shine effect
    )}
  </div>
)}
```

- **VALIDATE:** `npm run dev` and visually verify button styling

### Task 7: ADD Buzz score retrieval

- **IMPLEMENT:** Fetch Buzz score from API for completed challenges
- **FILE:** `components/daily/DailyChallengeLanding.tsx`

**Update checkBuzzStatus function (around line 93-163):**
```typescript
// After confirming buzzPlayed is true, fetch the score
if (buzzPlayed) {
  try {
    // Fetch player's result to get score
    const scoreParams = new URLSearchParams();
    if (user?.id) {
      scoreParams.set('player_id', user.id);
    } else {
      const fingerprint = getGuestFingerprint();
      if (fingerprint) {
        scoreParams.set('guest_fingerprint', fingerprint);
      }
    }

    const scoreResponse = await fetch(
      `/api/buzz/player-result/${today}/${currentLanguage}?${scoreParams.toString()}`
    );
    if (scoreResponse.ok) {
      const scoreData = await scoreResponse.json();
      if (scoreData.success && scoreData.data?.score) {
        setCompletedScores(prev => ({ ...prev, buzz: scoreData.data.score }));
      }
    }
  } catch (err) {
    console.error('Failed to fetch buzz score:', err);
  }
}
```

- **VALIDATE:** `npm run test`

### Task 8: UPDATE existing tests

- **IMPLEMENT:** Update tests to verify completed card transformation
- **FILE:** `components/daily/__tests__/DailyChallengeLanding.solvedBadge.test.tsx`

**Add new test cases:**
```typescript
describe('Completed Card Transformation', () => {
  test('should show score when challenge is completed', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    // Mock getTodaysWordHuntResult to return a score
    const dailyChallenge = require('@/utils/dailyChallenge');
    dailyChallenge.getTodaysWordHuntResult = jest.fn(() => ({
      result: { efficiencyScore: 750 }
    }));

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('750')).toBeInTheDocument();
    });
  });

  test('should show celebratory headline for completed challenge', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('You Made It!')).toBeInTheDocument();
    });
  });

  test('should show VIEW RESULTS button for completed challenge', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('VIEW RESULTS')).toBeInTheDocument();
    });
  });
});
```

- **VALIDATE:** `npm run test -- --testPathPattern="DailyChallengeLanding"`

### Task 9: ADD imports for confetti and score utilities

- **IMPLEMENT:** Add missing imports at top of DailyChallengeLanding.tsx
- **FILE:** `components/daily/DailyChallengeLanding.tsx`

```typescript
// Add to existing imports
import { fireConfetti, NEO_BRUTALIST_COLORS } from '@/utils/confettiUtils';
import { getTodaysWordHuntResult } from '@/utils/dailyChallenge';
```

- **VALIDATE:** `npm run build`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test CompletedCardContent renders correctly with different scores
- Test score color tier logic
- Test translation keys render correctly
- Test card transformation based on status

**Pattern:**
```typescript
test('should render score with correct tier color', () => {
  // Given
  const score = 850;

  // When
  render(<CompletedCardContent score={score} challengeType="wordHunt" />);

  // Then
  const scoreElement = screen.getByText('850');
  expect(scoreElement).toHaveClass('text-neo-lime');
});
```

### Integration Tests

**Scope and Requirements:**
- Test full card transformation flow
- Test navigation to results works
- Test confetti fires on first view (if enabled)

### Edge Cases

- Score is null (loading state or error)
- Score is 0 (failed challenge)
- Score at tier boundaries (399, 400, 599, 600, 799, 800)
- Buzz challenge unavailable but was previously completed
- Language change while card is shown

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build succeeds with no compilation errors

### Level 2: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test -- --testPathPattern="DailyChallengeLanding"
```

**Expected:** All tests pass

### Level 3: Lint Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 4: Full Test Suite

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test
```

**Expected:** All tests pass

### Level 5: Manual Validation

1. Start dev server: `npm run dev`
2. Navigate to `/en/daily`
3. Verify cards show normal state when not played
4. Play a Word Hunt challenge and complete it
5. Return to `/en/daily` - verify card shows:
   - "You Made It!" headline
   - Score prominently displayed
   - "VIEW RESULTS" button with gradient
   - Subtle celebration styling
6. Click card - verify navigation to results page
7. Repeat for Daily Buzz
8. Test RTL (Hebrew): Navigate to `/he/daily` and verify layout

---

## ACCEPTANCE CRITERIA

- [ ] Completed Word Hunt card shows celebratory headline
- [ ] Completed Word Hunt card displays player's score with tier-appropriate color
- [ ] Completed Daily Buzz card shows celebratory headline
- [ ] Completed Daily Buzz card displays player's score
- [ ] VIEW RESULTS button has distinct gradient styling for completed state
- [ ] Card click navigates to full results page
- [ ] All 5 languages have proper translations
- [ ] Animations are smooth and not jarring
- [ ] Confetti fires once on first view of completed card (if animations enabled)
- [ ] Cards still work correctly for uncompleted challenges
- [ ] All existing tests pass
- [ ] New tests cover completed state functionality
- [ ] RTL layout works correctly for Hebrew
- [ ] Performance is acceptable (no visible jank)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Rationale:**

- **Why transform the card content?** The current "Solved" badge is too subtle. Players deserve celebratory feedback that acknowledges their accomplishment.
- **Why show the score?** It provides immediate gratification and encourages players to view full results for more details.
- **Why different button styling?** Visual distinction helps players understand the card state at a glance.

**Alternatives Considered:**

1. **Modal celebration on completion** - Rejected because it's intrusive for return visits
2. **Full card replacement** - Rejected because we want to maintain card layout consistency
3. **Just enlarging the badge** - Rejected because it doesn't provide score information

**Trade-offs:**

- Added complexity in CompactChallengeCard props
- Need to fetch/store additional score data
- More translation keys to maintain

**Future Considerations:**

- Could add "Beat your score" functionality later
- Could show rank position in card
- Could add social sharing directly from card
