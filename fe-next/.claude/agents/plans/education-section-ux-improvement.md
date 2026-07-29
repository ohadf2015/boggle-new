# Feature: Education Section UX Improvement

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Comprehensive UX improvement of the education section (student learning flow) to simplify navigation, polish visual design, and reduce clicks needed to start practicing vocabulary. The current implementation has 4 practice modes (flashcards, solo board, word list, warmup) with inconsistent UX patterns, confusing navigation, and basic visual design that doesn't match the rest of the app's Neo-Brutalist polish.

## User Story

As a student using the education section
I want a simple, intuitive way to practice my vocabulary
So that I can focus on learning without getting confused by the interface

## Problem Statement

The education section has several UX issues identified:

1. **Navigation is confusing:**
   - Students land on StudentDashboard → click lesson → PracticeModeSelector → choose mode → actual practice
   - Too many screens between "I want to practice" and actually practicing
   - No clear breadcrumb trail or back button consistency
   - Students may not understand the difference between practice modes

2. **Visual design is basic:**
   - Practice mode cards lack the Neo-Brutalist polish seen elsewhere
   - Flashcard swipe stack has minimal visual feedback
   - Results screens are plain compared to multiplayer results
   - XP progress bar and streak indicators are functional but not engaging

3. **Too many clicks to practice:**
   - From lesson list → click lesson → see mode selector → pick mode → start practicing (4 clicks)
   - Mode selector adds cognitive load without clear value proposition
   - Default mode (flashcards) should be one-click accessible

4. **Flashcards UX issues:**
   - "Tap to reveal" → "Swipe left/right" workflow is non-obvious
   - No onboarding or gesture hints
   - Swipe mode requires clicking toggle button to switch from classic mode
   - Keyboard hints appear at bottom but are easy to miss

5. **Inconsistent patterns:**
   - FlashcardReview has enrichment loading, other modes don't
   - XP display differs between modes
   - Results screens vary in what they show

## Solution Statement

Create a streamlined education experience with:

1. **Quick Start Flow:** One-click practice from lesson card (default to flashcards, expandable for other modes)
2. **Unified Practice Header:** Consistent XP/streak/progress display across all modes
3. **Enhanced Flashcard UX:** Better gesture onboarding, visual feedback, and smooth transitions
4. **Polished Visual Design:** Neo-Brutalist treatment for all education components
5. **Simplified Navigation:** Clear breadcrumbs, consistent back behavior, reduced screen count

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** High
**Primary Systems Affected:** `components/practice/`, `components/student/`, `components/education/`, `app/[locale]/student/lessons/[id]/PageClient.tsx`
**Dependencies:** Existing practice components, XP system, framer-motion

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/student/StudentLessonView.tsx` (full file)
  - **WHY:** Main lesson list component with primary action buttons
  - **PATTERN:** Lesson cards with status-based CTAs, should add quick practice dropdown

- `app/[locale]/student/lessons/[id]/PageClient.tsx` (full file)
  - **WHY:** Entry point for lesson practice, currently shows PracticeModeSelector
  - **PATTERN:** Could bypass mode selector for default mode with option to expand

- `components/practice/PracticeModeSelector.tsx` (full file)
  - **WHY:** Mode selection screen that adds extra navigation step
  - **PATTERN:** Could become inline accordion or be skipped entirely

- `components/practice/FlashcardReview.tsx` (full file)
  - **WHY:** Main flashcard practice component with classic/swipe toggle
  - **PATTERN:** Should default to swipe mode, add gesture onboarding

- `components/practice/FlashcardSwipeStack.tsx` (full file)
  - **WHY:** Swipeable card stack component
  - **PATTERN:** Needs better visual feedback and gesture hints

- `components/practice/VocabularyCardEnriched.tsx` (full file)
  - **WHY:** Card design for enriched vocabulary display
  - **PATTERN:** Good Neo-Brutalist styling, should be consistent across modes

- `components/practice/WordListPreview.tsx` (full file)
  - **WHY:** Word list review mode
  - **PATTERN:** Expandable cards, needs visual polish

- `components/practice/WarmupRound.tsx` (full file)
  - **WHY:** Practice mode with embedded board game
  - **PATTERN:** Good hints panel, results screen needs polish

- `components/education/XpProgressBar.tsx` (full file if exists)
  - **WHY:** XP display component for practice sessions
  - **PATTERN:** Should be more visually engaging

- `components/education/StreakBonusIndicator.tsx` (full file if exists)
  - **WHY:** Streak display component
  - **PATTERN:** Should be consistent across all practice modes

- `components/education/LevelUpCelebration.tsx` (full file if exists)
  - **WHY:** Level up animation/modal
  - **PATTERN:** Should be polished and satisfying

- `components/views/ResultsPage.tsx` (lines 1-200)
  - **WHY:** Multiplayer results page for reference on polished results design
  - **PATTERN:** Good celebration animations and stats display

- `tailwind.config.js` (lines 49-210)
  - **WHY:** Neo-Brutalist design tokens
  - **PATTERN:** shadow-hard-*, rounded-neo, neo-* colors

### New Files to Create

1. `components/practice/QuickPracticeButton.tsx` - One-click practice with dropdown for mode selection
2. `components/practice/PracticeHeader.tsx` - Unified header for all practice modes with XP/streak/progress
3. `components/practice/FlashcardOnboarding.tsx` - First-time gesture tutorial overlay
4. `components/practice/PracticeResultsCard.tsx` - Unified polished results display
5. `components/practice/__tests__/QuickPracticeButton.test.tsx` - Tests for quick practice
6. `components/practice/__tests__/PracticeHeader.test.tsx` - Tests for practice header

### Patterns to Follow

**Quick Practice Button Pattern:**

```tsx
// ✅ GOOD: One-click practice with expandable modes
<div className="relative">
  <Button
    onClick={() => startPractice('flashcard')}
    className="bg-neo-cyan text-neo-black font-neo-display shadow-hard"
  >
    <Layers className="w-5 h-5 mr-2" />
    {t('student.lessons.practice')}
  </Button>

  {/* Dropdown for other modes */}
  <Button
    variant="ghost"
    size="sm"
    onClick={toggleModeMenu}
    className="ml-1"
  >
    <ChevronDown className="w-4 h-4" />
  </Button>

  {showModeMenu && (
    <div className="absolute top-full right-0 mt-2 bg-neo-navy border-neo rounded-neo shadow-hard-lg">
      {/* Mode options */}
    </div>
  )}
</div>
```

**Unified Practice Header Pattern:**

```tsx
// ✅ GOOD: Consistent header across all practice modes
<div className="sticky top-0 z-50 bg-neo-navy/95 backdrop-blur-xs border-b border-neo-black/30">
  <div className="max-w-2xl mx-auto px-4 py-3">
    <div className="flex items-center justify-between">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-neo-display text-neo-white">{lessonName}</h1>
          <p className="text-xs text-neo-white/60">{modeLabel}</p>
        </div>
      </div>

      {/* XP and streak */}
      <div className="flex items-center gap-4">
        <XpProgressBar totalXp={totalXp} size="sm" />
        {streak > 0 && <StreakBonusIndicator streak={streak} size="sm" />}
      </div>
    </div>

    {/* Progress bar */}
    <div className="mt-2 h-1.5 bg-neo-black/30 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-neo-cyan"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
      />
    </div>
  </div>
</div>
```

**Flashcard Gesture Onboarding Pattern:**

```tsx
// ✅ GOOD: First-time user gesture tutorial
<AnimatePresence>
  {showOnboarding && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-neo-black/80 flex items-center justify-center z-50"
    >
      <div className="text-center p-6">
        <motion.div
          animate={{ x: [0, 50, 0, -50, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Hand className="w-16 h-16 text-neo-cyan" />
        </motion.div>
        <h2 className="text-2xl font-neo-display text-neo-white mt-4">
          {t('education.flashcard.swipeHint')}
        </h2>
        <p className="text-neo-white/70 mt-2">
          {t('education.flashcard.swipeExplain')}
        </p>
        <Button onClick={dismissOnboarding} className="mt-6">
          {t('common.gotIt')}
        </Button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**Polished Results Card Pattern:**

```tsx
// ✅ GOOD: Celebration-worthy results display
<Card className="border-neo-thick border-neo-black shadow-hard-lg bg-linear-to-br from-neo-navy to-neo-navy/80 overflow-hidden">
  {/* Top celebration gradient */}
  <div className="h-2 bg-linear-to-r from-neo-pink via-neo-cyan to-neo-yellow" />

  <CardContent className="p-8 text-center">
    {/* Animated trophy */}
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <Trophy className="w-20 h-20 mx-auto text-neo-yellow" />
    </motion.div>

    {/* Score display */}
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className="text-6xl font-neo-display text-neo-cyan mt-4">{percentage}%</p>
      <p className="text-neo-white/70">{correct}/{total} correct</p>
    </motion.div>

    {/* XP earned (if applicable) */}
    {xpEarned > 0 && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-neo-yellow/20 rounded-neo border-neo border-neo-yellow"
      >
        <Star className="w-5 h-5 text-neo-yellow" />
        <span className="font-neo-display text-neo-yellow">+{xpEarned} XP</span>
      </motion.div>
    )}
  </CardContent>
</Card>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Quick Practice Flow

Reduce clicks by adding one-click practice from lesson cards and making flashcards the default mode.

**Tasks:**
- Create QuickPracticeButton component with dropdown for alternate modes
- Update StudentLessonView to use QuickPracticeButton
- Modify PageClient.tsx to skip mode selector when coming from quick practice
- Add URL parameter for direct mode access (e.g., ?mode=flashcard)

**Order:** Foundation for simplified UX.

### Phase 2: Unified Practice Header

Create consistent header component used across all practice modes.

**Tasks:**
- Create PracticeHeader component with XP/streak/progress
- Integrate into FlashcardReview
- Integrate into SoloPracticeBoard
- Integrate into WarmupRound
- Integrate into WordListPreview

**Order:** Depends on Phase 1 for navigation context.

### Phase 3: Enhanced Flashcard UX

Improve flashcard experience with better onboarding and visual feedback.

**Tasks:**
- Create FlashcardOnboarding overlay for first-time users
- Default to swipe mode instead of classic
- Enhance SwipeFeedbackOverlay with clearer visual cues
- Add haptic feedback hints (CSS animation)
- Improve keyboard hints visibility

**Order:** Can run parallel to Phase 2.

### Phase 4: Visual Polish

Apply Neo-Brutalist polish to all education components.

**Tasks:**
- Create PracticeResultsCard with celebration animations
- Update FlashcardSwipeStack card styling
- Polish PracticeModeSelector if still used (as fallback)
- Add gradient accents and decorative elements
- Ensure RTL support

**Order:** After functional improvements (Phases 1-3).

### Phase 5: Testing & Validation

Ensure all functionality works and tests pass.

**Tasks:**
- Add tests for QuickPracticeButton
- Add tests for PracticeHeader
- Update existing practice component tests
- Manual testing across modes
- RTL testing

**Order:** After all implementation.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `components/practice/QuickPracticeButton.tsx`

- **IMPLEMENT:** Button with one-click flashcard practice + dropdown for other modes
  - Primary button starts flashcards immediately
  - Small dropdown arrow shows menu with all 4 modes
  - Each mode option shows icon, name, and session count
  - Uses DropdownMenu from Radix UI or simple popup
  - Pass lessonId and selected mode to parent via callback
- **PATTERN:** Reference StudentLessonView.tsx button styling
- **IMPORTS:** Button, DropdownMenu, Layers, Grid3X3, List, Zap icons
- **GOTCHA:** Handle keyboard navigation in dropdown
- **VALIDATE:** `npm run lint`

### Task 2: CREATE `components/practice/__tests__/QuickPracticeButton.test.tsx`

- **IMPLEMENT:** Tests for QuickPracticeButton
  - Test primary click calls onPractice with 'flashcard'
  - Test dropdown shows all 4 mode options
  - Test clicking mode option calls onPractice with correct type
  - Test keyboard accessibility
- **PATTERN:** Reference existing component tests
- **VALIDATE:** `npm run test -- --testPathPattern=QuickPracticeButton`

### Task 3: UPDATE `components/student/StudentLessonView.tsx`

- **IMPLEMENT:** Replace single action button with QuickPracticeButton
  - Import QuickPracticeButton
  - Replace current Button with QuickPracticeButton
  - Handle onPractice callback to navigate with mode parameter
  - Keep status-based styling (assigned vs started vs completed)
- **PATTERN:** Current button patterns, add mode query param
- **IMPORTS:** QuickPracticeButton
- **GOTCHA:** Don't break existing navigation flow
- **VALIDATE:** `npm run test -- --testPathPattern=StudentLessonView`

### Task 4: UPDATE `app/[locale]/student/lessons/[id]/PageClient.tsx`

- **IMPLEMENT:** Support direct mode access via URL parameter
  - Read `mode` query parameter from URL
  - If mode is specified and valid, skip PracticeModeSelector
  - If no mode specified, show PracticeModeSelector (backward compatible)
  - Pass mode to PracticeContent for immediate start
- **PATTERN:** useSearchParams for reading query params
- **IMPORTS:** useSearchParams from next/navigation
- **GOTCHA:** Validate mode parameter against valid PracticeType values
- **VALIDATE:** `npm run lint`

### Task 5: CREATE `components/practice/PracticeHeader.tsx`

- **IMPLEMENT:** Unified sticky header for all practice modes
  - Back button with proper navigation
  - Lesson name and current mode label
  - XP progress bar (compact size)
  - Streak indicator if active
  - Progress bar showing completion percentage
  - Sticky positioning with backdrop blur
- **PATTERN:** Reference XpProgressBar, StreakBonusIndicator
- **IMPORTS:** Button, ArrowLeft, XpProgressBar, StreakBonusIndicator, motion
- **GOTCHA:** Ensure proper z-index for sticky positioning
- **VALIDATE:** `npm run lint`

### Task 6: CREATE `components/practice/__tests__/PracticeHeader.test.tsx`

- **IMPLEMENT:** Tests for PracticeHeader
  - Test renders lesson name and mode
  - Test XP progress displays
  - Test streak shows when > 0
  - Test progress bar shows correct percentage
  - Test back button calls onBack
- **PATTERN:** Reference existing component tests
- **VALIDATE:** `npm run test -- --testPathPattern=PracticeHeader`

### Task 7: UPDATE `components/practice/FlashcardReview.tsx`

- **IMPLEMENT:** Integrate PracticeHeader, default to swipe mode
  - Import and use PracticeHeader instead of custom header
  - Change default reviewMode from 'classic' to 'swipe'
  - Remove redundant XP header code (now in PracticeHeader)
  - Keep mode toggle buttons for switching
  - Add first-time onboarding check (localStorage flag)
- **PATTERN:** Current structure, simplify header
- **IMPORTS:** PracticeHeader
- **GOTCHA:** Don't break XP context integration
- **VALIDATE:** `npm run test -- --testPathPattern=FlashcardReview`

### Task 8: CREATE `components/practice/FlashcardOnboarding.tsx`

- **IMPLEMENT:** First-time gesture tutorial overlay
  - Full-screen overlay with semi-transparent background
  - Animated hand icon showing swipe gesture
  - Text explaining swipe left/right meaning
  - "Got it" button to dismiss
  - Check localStorage for 'flashcard-onboarding-complete' flag
  - Set flag when dismissed
- **PATTERN:** Reference gesture onboarding in mobile apps
- **IMPORTS:** motion from framer-motion, localStorage utils
- **GOTCHA:** RTL: flip swipe direction hints for Hebrew
- **VALIDATE:** `npm run lint`

### Task 9: UPDATE `components/practice/FlashcardSwipeStack.tsx`

- **IMPLEMENT:** Show onboarding for first-time users
  - Import FlashcardOnboarding
  - Check localStorage flag on mount
  - Show FlashcardOnboarding overlay if first time
  - Pass dismiss callback to set localStorage flag
  - Enhance swipe feedback colors (bolder green/red)
- **PATTERN:** Current component structure
- **IMPORTS:** FlashcardOnboarding
- **GOTCHA:** Don't show onboarding if words array is empty
- **VALIDATE:** `npm run lint`

### Task 10: UPDATE `components/practice/SwipeFeedbackOverlay.tsx`

- **IMPLEMENT:** Enhance visual feedback
  - Bolder colors for Got It (green) and Don't Know (red)
  - Larger icons with scale animation
  - Add subtle glow effect at threshold
  - Text labels below icons ("Got It!" / "Don't Know")
- **PATTERN:** Current overlay, enhance visibility
- **IMPORTS:** Check, X icons, motion
- **GOTCHA:** RTL direction consideration
- **VALIDATE:** `npm run lint`

### Task 11: CREATE `components/practice/PracticeResultsCard.tsx`

- **IMPLEMENT:** Polished results display component
  - Gradient top accent bar (pink → cyan → yellow)
  - Animated trophy icon entrance
  - Large percentage display with count
  - XP earned callout with star icon
  - Mastery message if provided
  - Action buttons (Try Again, Back)
  - Staggered entrance animations
- **PATTERN:** Reference ResultsPage.tsx for celebration animations
- **IMPORTS:** motion, Trophy, Star, Button, Card
- **GOTCHA:** Handle 0% score gracefully (encouragement message)
- **VALIDATE:** `npm run lint`

### Task 12: UPDATE `components/practice/FlashcardReview.tsx` results screen

- **IMPLEMENT:** Replace basic results with PracticeResultsCard
  - Import PracticeResultsCard
  - Replace current results JSX with PracticeResultsCard
  - Pass correct/total/percentage/xpEarned/masteryMessage
  - Handle onRestart and onBack callbacks
- **PATTERN:** Current results data, new component
- **IMPORTS:** PracticeResultsCard
- **GOTCHA:** Ensure XP session data still displays
- **VALIDATE:** `npm run lint`

### Task 13: UPDATE `components/practice/WarmupRound.tsx`

- **IMPLEMENT:** Integrate PracticeHeader and PracticeResultsCard
  - Replace custom header with PracticeHeader
  - Replace completion screen with PracticeResultsCard
  - Pass vocabulary words found count as success metric
  - Calculate percentage from vocabulary found / total
- **PATTERN:** Current structure, component replacement
- **IMPORTS:** PracticeHeader, PracticeResultsCard
- **GOTCHA:** Different metrics than flashcard (words vs cards)
- **VALIDATE:** `npm run lint`

### Task 14: UPDATE `components/practice/WordListPreview.tsx`

- **IMPLEMENT:** Integrate PracticeHeader, polish cards
  - Replace custom header with PracticeHeader
  - Enhance word cards with Neo-Brutalist styling
  - Add subtle hover animations
  - Improve expand/collapse transitions
- **PATTERN:** Current structure, enhanced styling
- **IMPORTS:** PracticeHeader, motion
- **GOTCHA:** This is a review mode, not scored, handle no results
- **VALIDATE:** `npm run lint`

### Task 15: UPDATE `components/practice/index.ts`

- **IMPLEMENT:** Export new components
  - Add exports for QuickPracticeButton
  - Add exports for PracticeHeader
  - Add exports for PracticeResultsCard
  - Add exports for FlashcardOnboarding
- **PATTERN:** Barrel export pattern
- **VALIDATE:** `npm run lint`

### Task 16: ADD translation keys for new UI text

- **IMPLEMENT:** Add missing translation keys to all 4 language files
  - `education.flashcard.swipeHint`: "Swipe to answer"
  - `education.flashcard.swipeExplain`: "Swipe right for 'Got It', left for 'Don't Know'"
  - `education.practice.quickPractice`: "Practice"
  - `education.practice.moreOptions`: "More practice options"
  - `education.practice.encouragement0`: "Keep trying! Practice makes progress."
  - `education.practice.encouragement50`: "Good effort! Keep practicing."
  - `education.practice.encouragement80`: "Great job! Almost there."
  - `education.practice.encouragement100`: "Perfect! You've mastered these words."
- **PATTERN:** Reference existing education translations
- **FILES:** translations/en.js, translations/he.js, translations/sv.js, translations/ja.js
- **GOTCHA:** Ensure proper RTL phrasing for Hebrew
- **VALIDATE:** Check translations load in dev

### Task 17: RUN full test suite

- **IMPLEMENT:** Ensure all tests pass
- **VALIDATE:** `npm run test`

### Task 18: RUN build verification

- **IMPLEMENT:** Ensure build succeeds
- **VALIDATE:** `npm run build`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test QuickPracticeButton renders and handles clicks
- Test PracticeHeader displays all elements correctly
- Test PracticeResultsCard animations and content
- Test FlashcardOnboarding shows/hides based on localStorage

**Pattern:**

```tsx
describe('QuickPracticeButton', () => {
  it('calls onPractice with flashcard when primary button clicked', () => {
    const onPractice = jest.fn();
    render(<QuickPracticeButton onPractice={onPractice} lessonId="test" />);

    fireEvent.click(screen.getByRole('button', { name: /practice/i }));
    expect(onPractice).toHaveBeenCalledWith('flashcard');
  });

  it('shows dropdown with all modes when arrow clicked', () => {
    render(<QuickPracticeButton onPractice={jest.fn()} lessonId="test" />);

    fireEvent.click(screen.getByLabelText(/more options/i));
    expect(screen.getByText(/flashcards/i)).toBeInTheDocument();
    expect(screen.getByText(/solo board/i)).toBeInTheDocument();
    expect(screen.getByText(/word list/i)).toBeInTheDocument();
    expect(screen.getByText(/warmup/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

**Scope and Requirements:**

- Test navigation from lesson list to practice mode
- Test URL parameter handling for direct mode access
- Test PracticeHeader integration in each mode
- Test results flow through to PracticeResultsCard

### Edge Cases

- Empty word list (0 words)
- First-time user (show onboarding)
- Returning user (skip onboarding)
- 0% score (show encouragement)
- 100% score (show celebration)
- RTL layout (Hebrew)
- No XP context (graceful degradation)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx tsc --noEmit
```

**Expected:** No TypeScript errors

### Level 2: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Practice Component Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test -- --testPathPattern="practice|Flashcard|QuickPractice|PracticeHeader"
```

**Expected:** All tests pass

### Level 4: Full Test Suite

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test
```

**Expected:** All tests pass

### Level 5: Build Verification

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build completes successfully

### Level 6: Manual Validation

1. Start dev server: `npm run dev`
2. Navigate to `/en/student` (login if needed)
3. Verify lesson cards show QuickPractice button with dropdown arrow
4. Click primary Practice button → should go directly to flashcards
5. Click dropdown → should show all 4 mode options
6. Verify flashcard mode defaults to swipe (not classic)
7. First-time: verify onboarding overlay appears
8. Complete flashcard session → verify polished results card
9. Test warmup mode → verify consistent header and results
10. Test in Hebrew for RTL support
11. Verify XP and streak display in header across modes

---

## ACCEPTANCE CRITERIA

- [ ] One-click practice from lesson cards (flashcard default)
- [ ] Dropdown available for other practice modes
- [ ] Direct URL access with ?mode=flashcard/solo_board/word_list/warmup
- [ ] Unified PracticeHeader across all modes
- [ ] XP and streak display consistent across modes
- [ ] Flashcard defaults to swipe mode
- [ ] First-time onboarding shows swipe gestures
- [ ] Polished results card with animations
- [ ] All existing tests pass
- [ ] Build succeeds without errors
- [ ] RTL (Hebrew) layout works correctly
- [ ] Translation keys added for new UI text

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Rationale:**

- **Why one-click flashcards?** Flashcards are the most common practice mode and reducing friction increases engagement. Students can still access other modes via dropdown.
- **Why default to swipe?** Swipe mode is more engaging and matches modern mobile app expectations. Classic tap mode is still available for those who prefer it.
- **Why unified header?** Consistency reduces cognitive load and creates familiarity across modes. XP display in header provides constant motivation.
- **Why gesture onboarding?** Swipe gestures aren't intuitive for everyone. A brief tutorial prevents confusion and improves first-time experience.

**Alternatives Considered:**

1. **Remove mode selector entirely** - Rejected because some students may prefer specific modes for different learning scenarios
2. **Auto-detect best mode** - Rejected as too complex and potentially confusing
3. **Gamify mode selection** - Rejected as adding more complexity, not simplification

**Trade-offs:**

- Slight increase in code complexity for dropdown component
- localStorage dependency for onboarding state
- Need to maintain consistency across 4 different practice modes

**Future Considerations:**

- Add spaced repetition algorithm to prioritize words needing review
- Add progress tracking across modes (not just per-session)
- Add achievements for practice milestones
- Consider combining modes into a single adaptive experience

**Known Limitations:**

- Onboarding only shows once (can add reset in settings if needed)
- URL parameter approach requires JavaScript (no server-side routing)
- XP integration depends on PracticeSessionProvider context
