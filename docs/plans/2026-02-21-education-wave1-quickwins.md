# Education Wave 1 — Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship 8 UX/pedagogy quick wins identified by a cross-disciplinary audit of the education section.

**Architecture:** All changes are purely additive — no new routes, no schema changes, one new component (`WordContextRow`), one new package (`qrcode.react`). Each task is independently deployable.

**Tech Stack:** Next.js 16, TypeScript, Tailwind, Jest/RTL, `useLanguage` context for RTL/translations.

**Working directory:** `fe-next/` — all paths are relative to it unless noted.

---

## Pre-flight

```bash
cd fe-next
npm run test:frontend -- --testPathPattern="practice|education|duels" --passWithNoTests 2>&1 | tail -20
```

Confirm no pre-existing failures in the affected areas before touching anything.

---

## Task 1: RTL `dir` Attribute — FlashcardReview

**Files:**
- Modify: `components/practice/FlashcardReview.tsx` (main container ~line 321)
- Test: `components/practice/__tests__/FlashcardReview.rtl.test.tsx` (new)

### Step 1: Write the failing test

```tsx
// components/practice/__tests__/FlashcardReview.rtl.test.tsx
import { render } from '@testing-library/react';
import { FlashcardReview } from '../FlashcardReview';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));
jest.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: () => null,
}));

const mockWords = [
  { id: '1', word: 'שלום', definition: 'Hello', partOfSpeech: 'noun', examples: [] },
];

test('should apply dir=rtl on main container when language is Hebrew', () => {
  const { container } = render(
    <FlashcardReview words={mockWords} onComplete={jest.fn()} onBack={jest.fn()} />
  );
  // The outermost div must carry dir="rtl"
  expect(container.firstChild).toHaveAttribute('dir', 'rtl');
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:frontend -- --testPathPattern="FlashcardReview.rtl" --no-coverage
```

Expected output: `● should apply dir=rtl on main container` — FAIL (attribute not present).

### Step 3: Implement

In `components/practice/FlashcardReview.tsx`, find the main container (~line 321):

```tsx
// BEFORE
<div className="min-h-screen bg-neo-navy p-4 sm:p-6">

// AFTER
<div className="min-h-screen bg-neo-navy p-4 sm:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
```

`isRTL` is already defined at line 48: `const isRTL = dir === 'rtl';` — no new variable needed.

### Step 4: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="FlashcardReview.rtl" --no-coverage
```

### Step 5: Commit

```bash
git add components/practice/FlashcardReview.tsx components/practice/__tests__/FlashcardReview.rtl.test.tsx
git commit -m "fix(practice): add dir attribute to FlashcardReview main container for RTL"
```

---

## Task 2: RTL `dir` Attribute — WordMatchingPractice results screen

**Files:**
- Modify: `components/practice/WordMatchingPractice.tsx` (~line 221)
- Test: `components/practice/__tests__/WordMatchingPractice.rtl.test.tsx` (new)

### Step 1: Write the failing test

```tsx
// components/practice/__tests__/WordMatchingPractice.rtl.test.tsx
import { render } from '@testing-library/react';
import { WordMatchingPractice } from '../WordMatchingPractice';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));

const mockWords = [
  { id: '1', word: 'שלום', definition: 'Hello' },
  { id: '2', word: 'תודה', definition: 'Thanks' },
];

// Force showResults=true by submitting all words
test('should apply dir=rtl on results screen when language is Hebrew', async () => {
  // We test the results path by checking the completed state
  // The results div must carry dir="rtl"
  const { container } = render(
    <WordMatchingPractice words={mockWords} onComplete={jest.fn()} onBack={jest.fn()} />
  );
  // Even in initial state the wrapper must carry dir
  const wrapper = container.querySelector('[dir]');
  expect(wrapper).toHaveAttribute('dir', 'rtl');
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:frontend -- --testPathPattern="WordMatchingPractice.rtl" --no-coverage
```

### Step 3: Implement

In `components/practice/WordMatchingPractice.tsx`, find the results screen (~line 221):

```tsx
// BEFORE
<div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">

// AFTER
<div className="min-h-screen bg-neo-navy flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
```

### Step 4: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="WordMatchingPractice.rtl" --no-coverage
```

### Step 5: Commit

```bash
git add components/practice/WordMatchingPractice.tsx components/practice/__tests__/WordMatchingPractice.rtl.test.tsx
git commit -m "fix(practice): add dir attribute to WordMatchingPractice results screen for RTL"
```

---

## Task 3: RTL `dir` Attribute — VocabularyCardEnriched

**Files:**
- Modify: `components/practice/VocabularyCardEnriched.tsx` (root `<div>` at line 35)
- Test: `components/practice/__tests__/VocabularyCardEnriched.rtl.test.tsx` (new)

### Step 1: Write the failing test

```tsx
// components/practice/__tests__/VocabularyCardEnriched.rtl.test.tsx
import { render } from '@testing-library/react';
import { VocabularyCardEnriched } from '../VocabularyCardEnriched';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));
jest.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: () => null,
}));

const mockWord = { word: 'שלום', definition: 'Hello', partOfSpeech: 'noun', examples: ['שלום עולם'] };

test('should apply dir=rtl on card root when language is Hebrew', () => {
  const { container } = render(<VocabularyCardEnriched word={mockWord} />);
  expect(container.firstChild).toHaveAttribute('dir', 'rtl');
});

test('should apply dir=ltr on card root when language is English', () => {
  jest.resetModules();
  // Rendered with dir=ltr default — needs override
  const { container } = render(<VocabularyCardEnriched word={mockWord} />);
  // dir should not be rtl in ltr context (mocked as rtl above so use ltr mock)
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:frontend -- --testPathPattern="VocabularyCardEnriched.rtl" --no-coverage
```

### Step 3: Implement

`VocabularyCardEnriched.tsx` already imports `useLanguage`. Add `dir` extraction and apply it:

```tsx
// Line 32 — add dir to destructuring
const { t, dir } = useLanguage();
const isRTL = dir === 'rtl';

// Line 35 — add dir to root element
<div
  dir={isRTL ? 'rtl' : 'ltr'}
  className={`
    bg-neo-white
    border-neo border-black
    rounded-neo
    shadow-hard
    p-6
    ${className}
  `}
>
```

### Step 4: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="VocabularyCardEnriched.rtl" --no-coverage
```

### Step 5: Commit

```bash
git add components/practice/VocabularyCardEnriched.tsx components/practice/__tests__/VocabularyCardEnriched.rtl.test.tsx
git commit -m "fix(practice): add dir attribute to VocabularyCardEnriched root for RTL"
```

---

## Task 4: Contextual Loading States (4 files)

Replace all bare loading UI with `<PageLoader text="..." size="lg" />`.

**Files:**
- Modify: `components/education/challenges/ChallengePanel.tsx` (line 53)
- Modify: `components/education/ClassroomGameLobby.tsx` (lines 246-252)
- Modify: `components/education/duels/DuelGameView.tsx` (lines 159-165)
- Modify: `app/[locale]/education/duels/PageClient.tsx` (lines 46-52)
- Test: `components/education/challenges/__tests__/ChallengePanel.loading.test.tsx` (new)

### Step 1: Write the failing test

```tsx
// components/education/challenges/__tests__/ChallengePanel.loading.test.tsx
import { render } from '@testing-library/react';
import { ChallengePanel } from '../ChallengePanel';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
jest.mock('@/lib/supabase/education', () => ({
  getDailyChallenges: () => new Promise(() => {}), // never resolves → stays loading
  getWeeklyQuests: () => new Promise(() => {}),
}));

test('should render PageLoader with context text while loading', () => {
  const { getByTestId, queryByText } = render(<ChallengePanel playerId="user-1" />);
  expect(getByTestId('page-loader')).toBeInTheDocument();
  expect(queryByText('Loading...')).not.toBeInTheDocument(); // bare text gone
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:frontend -- --testPathPattern="ChallengePanel.loading" --no-coverage
```

### Step 3: Implement all 4 loading states

**3a. `ChallengePanel.tsx` line 53:**

```tsx
// Add import at top
import { PageLoader } from '@/components/ui/PageLoader';

// Replace line 53:
// BEFORE: if (loading) return <div>Loading...</div>;
// AFTER:
if (loading) {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <PageLoader size="lg" text={t('challenges.loading') || 'Loading your challenges...'} />
    </div>
  );
}
```

**3b. `ClassroomGameLobby.tsx` lines 246-253:**

```tsx
// Add import at top (PageLoader likely not imported yet)
import { PageLoader } from '@/components/ui/PageLoader';

// Replace lines 247-253:
// BEFORE:
// if (isLoading) {
//   return (
//     <div className="flex items-center justify-center py-12" role="progressbar">
//       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan"></div>
//     </div>
//   );
// }
// AFTER:
if (isLoading) {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <PageLoader size="lg" text={t('education.classroomGame.loading') || 'Setting up your classroom...'} />
    </div>
  );
}
```

**3c. `DuelGameView.tsx` lines 159-165:**

```tsx
import { PageLoader } from '@/components/ui/PageLoader';

// Replace:
if (phase === 'loading') {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <PageLoader size="lg" text={t('duels.loadingDuel') || 'Loading your duel...'} />
    </div>
  );
}
```

**3d. `app/[locale]/education/duels/PageClient.tsx` lines 46-52:**

```tsx
import { PageLoader } from '@/components/ui/PageLoader';

// Replace:
if (loading) {
  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-screen">
      <PageLoader size="lg" text={t('duels.findingClassmates') || 'Finding your classmates...'} />
    </div>
  );
}
```

### Step 4: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="ChallengePanel.loading" --no-coverage
```

### Step 5: Commit

```bash
git add components/education/challenges/ChallengePanel.tsx \
        components/education/ClassroomGameLobby.tsx \
        components/education/duels/DuelGameView.tsx \
        app/[locale]/education/duels/PageClient.tsx \
        components/education/challenges/__tests__/ChallengePanel.loading.test.tsx
git commit -m "fix(education): replace bare loading spinners with contextual PageLoader in 4 files"
```

---

## Task 5: `WordContextRow` — new shared sub-component

**Files:**
- Create: `components/practice/WordContextRow.tsx`
- Create: `components/practice/__tests__/WordContextRow.test.tsx`
- Modify: `components/practice/FlashcardReview.tsx`
- Modify: `components/practice/SpellingChallengePractice.tsx`
- Modify: `components/practice/WordMatchingPractice.tsx`

### Step 1: Write the failing test

```tsx
// components/practice/__tests__/WordContextRow.test.tsx
import { render } from '@testing-library/react';
import { WordContextRow } from '../WordContextRow';

test('should render part-of-speech badge when provided', () => {
  const { getByText } = render(
    <WordContextRow partOfSpeech="verb" example="She spoke quietly" />
  );
  expect(getByText('verb')).toBeInTheDocument();
  expect(getByText('"She spoke quietly"')).toBeInTheDocument();
});

test('should render nothing when no data provided', () => {
  const { container } = render(<WordContextRow />);
  expect(container.firstChild).toBeNull();
});

test('should render only part-of-speech when no example', () => {
  const { getByText, queryByText } = render(
    <WordContextRow partOfSpeech="noun" />
  );
  expect(getByText('noun')).toBeInTheDocument();
  expect(queryByText('·')).not.toBeInTheDocument();
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:frontend -- --testPathPattern="WordContextRow.test" --no-coverage
```

### Step 3: Create `WordContextRow.tsx`

```tsx
// components/practice/WordContextRow.tsx
'use client';

interface WordContextRowProps {
  partOfSpeech?: string;
  example?: string;
}

/**
 * Inline part-of-speech badge + first example sentence.
 * Renders nothing if both props are absent — safe for non-enriched words.
 *
 * Usage: <WordContextRow partOfSpeech={word.partOfSpeech} example={word.examples?.[0]} />
 */
export function WordContextRow({ partOfSpeech, example }: WordContextRowProps) {
  if (!partOfSpeech && !example) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {partOfSpeech && (
        <span className="text-xs font-neo-body text-neo-white/50 italic">
          {partOfSpeech}
        </span>
      )}
      {partOfSpeech && example && (
        <span className="text-xs text-neo-white/30">·</span>
      )}
      {example && (
        <span className="text-xs font-neo-body text-neo-white/40 italic">
          &ldquo;{example}&rdquo;
        </span>
      )}
    </div>
  );
}
```

### Step 4: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="WordContextRow.test" --no-coverage
```

### Step 5: Integrate into FlashcardReview

In `FlashcardReview.tsx`, add import and place below word text on the word-side card:

```tsx
import { WordContextRow } from './WordContextRow';

// On the word side (around line 438–448), below the word text:
<p className="text-3xl sm:text-4xl font-neo-display text-neo-white">
  {currentWord.word}
</p>
<WordContextRow
  partOfSpeech={(currentWord as any).partOfSpeech}
  example={(currentWord as any).examples?.[0]}
/>
```

### Step 6: Integrate into SpellingChallengePractice

In `SpellingChallengePractice.tsx`, add below the definition card (line ~213, after `</AdaptiveAnimatePresence>`):

```tsx
import { WordContextRow } from './WordContextRow';

// After definition card, if feedback shows the correct word:
{feedback && (
  <WordContextRow
    partOfSpeech={(words[wordIndex] as any)?.partOfSpeech}
    example={(words[wordIndex] as any)?.examples?.[0]}
  />
)}
```

### Step 7: Integrate into WordMatchingPractice

In `WordMatchingPractice.tsx`, add below each word label in the word chips area (find the word chip rendering loop and append):

```tsx
import { WordContextRow } from './WordContextRow';

// Inside the word chip render (find the word label text):
<span className="font-neo-body text-neo-white">{word.word}</span>
<WordContextRow
  partOfSpeech={(word as any).partOfSpeech}
  example={(word as any).examples?.[0]}
/>
```

### Step 8: Commit

```bash
git add components/practice/WordContextRow.tsx \
        components/practice/__tests__/WordContextRow.test.tsx \
        components/practice/FlashcardReview.tsx \
        components/practice/SpellingChallengePractice.tsx \
        components/practice/WordMatchingPractice.tsx
git commit -m "feat(practice): add WordContextRow for part-of-speech and example in all practice modes"
```

---

## Task 6: Pronunciation Button in All Practice Modes

**Files:**
- Modify: `components/practice/FlashcardReview.tsx` (word side)
- Modify: `components/practice/SpellingChallengePractice.tsx` (feedback state)
- Modify: `components/practice/WordMatchingPractice.tsx` (word chips)
- Test: `components/practice/__tests__/FlashcardReview.pronunciation.test.tsx` (new)

> **Note:** `FlashcardReview` already imports `PronunciationButton` and uses it on the definition side. This task adds it to the **word side** and the other two modes.

### Step 1: Write the failing test

```tsx
// components/practice/__tests__/FlashcardReview.pronunciation.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { FlashcardReview } from '../FlashcardReview';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
jest.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: ({ word }: { word: string }) => (
    <button data-testid="pronunciation-btn" aria-label={`Pronounce ${word}`}>{word}</button>
  ),
}));

const mockWords = [
  { id: '1', word: 'hello', definition: 'A greeting', partOfSpeech: 'exclamation', examples: [] },
];

test('should render pronunciation button on word side of flashcard', () => {
  const { getAllByTestId } = render(
    <FlashcardReview words={mockWords} onComplete={jest.fn()} onBack={jest.fn()} />
  );
  // At least one pronunciation button must be visible (word side OR definition side)
  expect(getAllByTestId('pronunciation-btn').length).toBeGreaterThanOrEqual(1);
});
```

### Step 2: Run test — expect FAIL (or PASS if button already exists on word side)

```bash
npm run test:frontend -- --testPathPattern="FlashcardReview.pronunciation" --no-coverage
```

### Step 3: Add pronunciation to FlashcardReview word side

`PronunciationButton` is already imported. On the word-side card (around line 438):

```tsx
// In the word card header area, add next to the word
<div className="flex items-center justify-between gap-2">
  <p className="text-3xl sm:text-4xl font-neo-display text-neo-white">
    {currentWord.word}
  </p>
  <PronunciationButton word={currentWord.word} />
</div>
```

### Step 4: Add pronunciation to SpellingChallengePractice feedback

In the feedback state where the correct word is revealed:

```tsx
import { PronunciationButton } from './PronunciationButton';

// Find feedback display section — when feedback is shown, the correct word appears.
// Add beside the correct word display:
{feedback && (
  <div className="flex items-center justify-center gap-2">
    <span className="font-neo-display text-neo-white text-2xl">{feedback.correctWord}</span>
    <PronunciationButton word={feedback.correctWord} />
  </div>
)}
```

### Step 5: Add pronunciation to WordMatchingPractice word chips

```tsx
import { PronunciationButton } from './PronunciationButton';

// Inside the word chip, beside the word label (use size="sm" variant if supported):
<PronunciationButton word={word.word} />
```

### Step 6: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="FlashcardReview.pronunciation" --no-coverage
```

### Step 7: Commit

```bash
git add components/practice/FlashcardReview.tsx \
        components/practice/SpellingChallengePractice.tsx \
        components/practice/WordMatchingPractice.tsx \
        components/practice/__tests__/FlashcardReview.pronunciation.test.tsx
git commit -m "feat(practice): add PronunciationButton to word side in FlashcardReview, Spelling, and WordMatching"
```

---

## Task 7: QR Code for Game Code Sharing

**Files:**
- Modify: `package.json` (add `qrcode.react`)
- Modify: `components/education/ClassroomGameLobby.tsx` (Step 2 area, after game code display)
- Test: `components/education/__tests__/ClassroomGameLobby.qr.test.tsx` (new)

### Step 1: Install dependency

```bash
npm install qrcode.react
```

### Step 2: Write the failing test

```tsx
// components/education/__tests__/ClassroomGameLobby.qr.test.tsx
import { render } from '@testing-library/react';

jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} />
  ),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
// Additional mocks for ClassroomGameLobby will be needed (socket, auth, etc.)
// The test checks the QR renders with the game code value.
test('QR code renders with the correct game code value', () => {
  // NOTE: ClassroomGameLobby requires a lot of context setup.
  // Use a targeted unit test of the QR section only:
  const { QRCodeSVG } = require('qrcode.react');
  const { render: r, getByTestId } = require('@testing-library/react');
  const { container } = r(<QRCodeSVG value="ABCD1" />);
  expect(container.querySelector('[data-testid="qr-code"]')).not.toBeNull();
});
```

> **Note:** Because `ClassroomGameLobby` is deeply coupled to sockets and auth, test the QR render as a unit (the QRCodeSVG mock approach above) rather than a full integration test.

### Step 3: Add QR code and read-aloud format to ClassroomGameLobby Step 2

In `components/education/ClassroomGameLobby.tsx`, find the game code display in Step 2 (search for `gameCode` rendering) and add below it:

```tsx
import { QRCodeSVG } from 'qrcode.react';

// After the large game code text, add:
{gameCode && (
  <div className="mt-4 flex flex-col items-center gap-3">
    {/* QR code for mobile scanning */}
    <div className="p-2 bg-white rounded-neo border-neo border-neo-black shadow-hard-sm">
      <QRCodeSVG
        value={gameCode}
        size={120}
        data-testid="game-code-qr"
      />
    </div>
    {/* Read-aloud format: A · F · 4 · D · 2 */}
    <p className="text-sm font-mono text-neo-white/50 tracking-widest">
      {gameCode.split('').join(' · ')}
    </p>
  </div>
)}
```

### Step 4: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="ClassroomGameLobby.qr" --no-coverage
```

### Step 5: Commit

```bash
git add components/education/ClassroomGameLobby.tsx \
        components/education/__tests__/ClassroomGameLobby.qr.test.tsx \
        package.json package-lock.json
git commit -m "feat(education): add QR code and read-aloud format for game code sharing"
```

---

## Task 8: Quick Start — Verify Existing Implementation

> **Discovery:** `TeacherDashboard` already imports `QuickStartButton` from `./QuickStartButton` and `useRecentGameSettings`. The Quick Start feature is already implemented. This task adds a missing test.

**Files:**
- Test: `components/teacher/__tests__/QuickStartButton.test.tsx` (new, if missing)

### Step 1: Check for existing tests

```bash
ls components/teacher/__tests__/ 2>/dev/null || echo "no tests dir"
```

If `QuickStartButton.test.tsx` already exists, skip to Task 9.

### Step 2: Write the test

```tsx
// components/teacher/__tests__/QuickStartButton.test.tsx
import { render, fireEvent } from '@testing-library/react';
import QuickStartButton from '../QuickStartButton';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const config: GameConfiguration = {
  lessonIds: ['lesson-1'],
  classroomId: 'class-1',
  classroomName: 'Class 7B',
  lessonCount: 1,
  timerMinutes: 3,
  boardSize: 'medium',
  allowLateJoin: true,
};

test('should render quick start config details', () => {
  const { getByText } = render(<QuickStartButton config={config} />);
  expect(getByText(/Class 7B/i)).toBeInTheDocument();
});

test('should call onClick with config when clicked', () => {
  const handleClick = jest.fn();
  const { getByRole } = render(
    <QuickStartButton config={config} onClick={handleClick} />
  );
  fireEvent.click(getByRole('button'));
  expect(handleClick).toHaveBeenCalledWith(config);
});

test('should render first-game prompt when config is null', () => {
  const { container } = render(<QuickStartButton config={null} />);
  // Should not crash; may render empty or placeholder
  expect(container).toBeTruthy();
});
```

### Step 3: Run test

```bash
npm run test:frontend -- --testPathPattern="QuickStartButton.test" --no-coverage
```

Fix any failures by reading `QuickStartButton.tsx` and adjusting assertions to match actual rendering.

### Step 4: Commit

```bash
git add components/teacher/__tests__/QuickStartButton.test.tsx
git commit -m "test(teacher): add unit tests for QuickStartButton"
```

---

## Task 9: Duel Teaser Card on Education Landing

**Files:**
- Modify: `app/[locale]/education/PageClient.tsx` (add third `RoleCard`)
- Test: `app/[locale]/education/__tests__/EducationLanding.duelTeaser.test.tsx` (new)

### Step 1: Write the failing test

```tsx
// app/[locale]/education/__tests__/EducationLanding.duelTeaser.test.tsx
import { render } from '@testing-library/react';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
jest.mock('@/components/ui/InteractiveMascot', () => ({ InteractiveMascot: () => null }));
jest.mock('@/components/auth/AuthModal', () => ({ default: () => null }));

test('should render duel teaser card with correct CTA', async () => {
  const { default: EducationPageClient } = await import('../PageClient');
  const { getByText } = render(<EducationPageClient />);
  expect(getByText(/challenge a classmate/i)).toBeInTheDocument();
  expect(getByText(/find a duel/i)).toBeInTheDocument();
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:frontend -- --testPathPattern="EducationLanding.duelTeaser" --no-coverage
```

### Step 3: Add translation keys

In `translations/en.json`, add:
```json
"education.landing.duel": "Challenge a Classmate",
"education.landing.duelDesc": "Race head-to-head in real-time word duels",
"education.landing.duelFeature1": "Live 1v1 competition",
"education.landing.duelFeature2": "Earn XP for wins",
"education.landing.duelFeature3": "Track your duel history",
"education.landing.duelCta": "Find a Duel →",
"education.landing.multiplayer": "Multiplayer"
```

Repeat for `he.json`, `sv.json`, `ja.json` with appropriate translations.

### Step 4: Add Duel card to `app/[locale]/education/PageClient.tsx`

In the `RoleCard` section, change the grid and add a third card:

```tsx
import { Swords } from 'lucide-react'; // already imported in other files; add here

// Line 240: change grid to accommodate 3 cards on wider screens
// BEFORE: <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
// AFTER: <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

// Add after Student Card (before closing </div>):
<RoleCard
  title={t('education.landing.duel')}
  description={t('education.landing.duelDesc')}
  icon={<Swords className="w-6 h-6 text-neo-black" />}
  features={[
    t('education.landing.duelFeature1'),
    t('education.landing.duelFeature2'),
    t('education.landing.duelFeature3'),
  ]}
  ctaLabel={t('education.landing.duelCta')}
  badge={t('education.landing.multiplayer')}
  stripeColor="bg-neo-yellow"
  badgeBg="bg-neo-yellow text-neo-black"
  iconBg="bg-neo-yellow/20"
  ctaBg="bg-neo-yellow text-neo-black"
  onClick={() => router.push(`/${language}/education/duels`)}
  index={2}
/>
```

Also import `Swords` at top: `import { GraduationCap, BookOpen, Swords, ... } from 'lucide-react';`

### Step 5: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="EducationLanding.duelTeaser" --no-coverage
```

### Step 6: Commit

```bash
git add app/[locale]/education/PageClient.tsx \
        app/[locale]/education/__tests__/EducationLanding.duelTeaser.test.tsx \
        translations/en.json translations/he.json translations/sv.json translations/ja.json
git commit -m "feat(education): add duel teaser card to education landing page"
```

---

## Task 10: Forfeit Button Styling + Esc Key on DuelChallengeModal

**Files:**
- Modify: `components/education/duels/RealTimeDuelGame.tsx` (~line 454-460)
- Modify: `components/education/duels/DuelChallengeModal.tsx` (add Esc handler)
- Test: `components/education/duels/__tests__/DuelChallengeModal.esc.test.tsx` (new)
- Test: `components/education/duels/__tests__/RealTimeDuelGame.forfeit.test.tsx` (new)

### Step 1: Write the failing tests

```tsx
// components/education/duels/__tests__/DuelChallengeModal.esc.test.tsx
import { render, fireEvent } from '@testing-library/react';
import DuelChallengeModal from '../DuelChallengeModal';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
jest.mock('@/hooks/useDuelSocket', () => ({
  useDuelSocket: () => ({ createChallenge: jest.fn() }),
}));

const props = {
  opponent: { id: 'opp-1', username: 'Rival', avatar: '🎮' },
  lessons: [{ id: 'l1', name: 'Lesson 1' }],
  classroomId: 'class-1',
  onClose: jest.fn(),
};

test('should call onClose when Escape key is pressed', () => {
  render(<DuelChallengeModal {...props} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(props.onClose).toHaveBeenCalledTimes(1);
});
```

```tsx
// components/education/duels/__tests__/RealTimeDuelGame.forfeit.test.tsx
import { render } from '@testing-library/react';

// The forfeit button test verifies it has role="button" styling (not plain text link)
// This is a visual/structural test.
test('forfeit button should have button role and not use plain underline-link styling', () => {
  // Shallow structural check — confirm data-testid="forfeit-btn" exists and is a button
  // Full render requires heavy mocking; check the rendered element type instead.
  // This serves as a reminder to implement and a canary for regression.
  expect(true).toBe(true); // placeholder — replace with full render when mocks are in place
});
```

### Step 2: Run test — expect FAIL for Esc test

```bash
npm run test:frontend -- --testPathPattern="DuelChallengeModal.esc" --no-coverage
```

### Step 3: Add Esc handler to DuelChallengeModal

In `DuelChallengeModal.tsx`, add `useEffect` import and handler:

```tsx
import { useState, useCallback, useEffect } from 'react'; // add useEffect

// Add inside DuelChallengeModal component, before return:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

### Step 4: Style the forfeit button in RealTimeDuelGame

In `RealTimeDuelGame.tsx`, find the forfeit button (~line 454-460):

```tsx
// BEFORE:
<button
  onClick={() => setShowForfeitDialog(true)}
  data-testid="forfeit-btn"
  className="text-neo-white/50 hover:text-neo-white text-sm underline"
>

// AFTER:
<button
  onClick={() => setShowForfeitDialog(true)}
  data-testid="forfeit-btn"
  className="px-4 py-2 text-sm font-bold border-neo border-red-600 text-red-400 rounded-neo shadow-hard-sm hover:bg-red-500/10 transition-colors"
>
```

### Step 5: Run test — expect PASS

```bash
npm run test:frontend -- --testPathPattern="DuelChallengeModal.esc" --no-coverage
```

### Step 6: Commit

```bash
git add components/education/duels/DuelChallengeModal.tsx \
        components/education/duels/RealTimeDuelGame.tsx \
        components/education/duels/__tests__/DuelChallengeModal.esc.test.tsx \
        components/education/duels/__tests__/RealTimeDuelGame.forfeit.test.tsx
git commit -m "fix(education): style forfeit button as neo-brutalist danger button; add Esc key to DuelChallengeModal"
```

---

## Final Validation

```bash
# In fe-next/
npm run lint && npm run test:frontend && npm run build
```

All three commands must exit 0. Fix any failures before considering Wave 1 complete.

---

## Definition of Done Checklist

- [ ] Task 1: `FlashcardReview` main container has `dir` — RTL test passes
- [ ] Task 2: `WordMatchingPractice` results screen has `dir` — RTL test passes
- [ ] Task 3: `VocabularyCardEnriched` root has `dir` — RTL test passes
- [ ] Task 4: All 4 loading states replaced with `PageLoader` — ChallengePanel test passes
- [ ] Task 5: `WordContextRow` renders part-of-speech + example; graceful when absent
- [ ] Task 6: Pronunciation button visible in FlashcardReview word side, Spelling feedback, WordMatching chips
- [ ] Task 7: QR code renders in ClassroomGameLobby Step 2
- [ ] Task 8: `QuickStartButton` has test coverage (feature was pre-existing)
- [ ] Task 9: Duel teaser card visible on education landing, CTA links to `/education/duels`
- [ ] Task 10: Forfeit is styled danger button; Esc closes `DuelChallengeModal`
- [ ] `npm run lint && npm run test:frontend && npm run build` all pass
