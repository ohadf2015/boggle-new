# Daily Word Hunt — Fun & Shareable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the daily word hunt fun to play and viral to share via cinematic win moments, emoji share cards, and a URL-encoded "Beat my score" challenge mechanic.

**Architecture:** Four independent layers — in-game juice (wiring existing animations), a new Framer Motion win cinematic, a redesigned results screen with inline emoji share card, and a score gauntlet encoded in share URLs. No new backend routes needed.

**Tech Stack:** React, Framer Motion (`m` from `framer-motion`), Tailwind CSS, existing `ScorePopupFly` + `SelectionSparkle` animations, `useShareHandlers` hook, `t()` for all strings.

---

## Context You Need

- Design system is **neo-brutalist**: `border-3 border-neo-black shadow-hard rounded-neo`
- ALL UI text must use `t('key')` — no hardcoded strings
- RTL: Hebrew (`?locale=he`) must work — use `rtl:` Tailwind prefix for directional styles
- Run `npm run lint && npm run test && npm run build` after every task
- Tests go in `__tests__/` folders next to source or as `*.test.tsx` siblings
- New components in `components/daily/results/` need an export added to `components/daily/results/index.ts`
- Domain is `lexiclash.live` (already in `useShareHandlers`)
- `ScorePopupFly` props: `popup: {id, value, x, y, word?, bonus?} | null`, `flyToTarget`, `showWord`, `onComplete`
- Framer Motion: always import `m` not `motion` — `import { m } from 'framer-motion'`

---

## Task 1: EmojiShareCard Component

**What it does:** Wordle-style inline card showing found words as emoji rows + puzzle info. Sits above the Share button on the results screen. Can be copy-pasted as plain text.

**Files:**
- Create: `fe-next/components/daily/results/EmojiShareCard.tsx`
- Create: `fe-next/components/daily/results/__tests__/EmojiShareCard.test.tsx`
- Modify: `fe-next/components/daily/results/index.ts` (add export)

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/results/__tests__/EmojiShareCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmojiShareCard } from '../EmojiShareCard';

const mockWords = [
  { word: 'CATCH', found: true },
  { word: 'LIGHT', found: true },
  { word: 'AT', found: true },
  { word: 'STONE', found: false },
];

describe('EmojiShareCard', () => {
  it('renders puzzle number and score', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    expect(screen.getByText(/421/)).toBeInTheDocument();
    expect(screen.getByText(/847/)).toBeInTheDocument();
  });

  it('renders green squares for found words', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    // CATCH = 5 letters = 5 green squares
    const card = screen.getByTestId('emoji-share-card');
    expect(card).toHaveTextContent('🟩🟩🟩🟩🟩');
  });

  it('renders black squares for unfound words (hides word)', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    // STONE = 5 letters = 5 black squares
    const card = screen.getByTestId('emoji-share-card');
    expect(card).toHaveTextContent('⬛⬛⬛⬛⬛');
  });

  it('shows domain lexiclash.live', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    expect(screen.getByText(/lexiclash\.live/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="EmojiShareCard" --no-coverage
```
Expected: FAIL — `EmojiShareCard` not found.

**Step 3: Implement the component**

```tsx
// fe-next/components/daily/results/EmojiShareCard.tsx
'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import type { Language } from '@/types';

interface WordEntry {
  word: string;
  found: boolean;
}

export interface EmojiShareCardProps {
  puzzleNumber: number;
  score: number;
  solved: boolean;
  words: WordEntry[];
  language: Language;
}

function wordToEmoji(entry: WordEntry): string {
  const square = entry.found ? '🟩' : '⬛';
  return square.repeat(entry.word.length);
}

export const EmojiShareCard: React.FC<EmojiShareCardProps> = ({
  puzzleNumber,
  score,
  solved,
  words,
  language,
}) => {
  const emojiRows = useMemo(() => words.map(wordToEmoji), [words]);

  return (
    <m.div
      data-testid="emoji-share-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-slate-900 border-3 border-neo-black rounded-neo shadow-hard p-4 font-mono text-sm select-all"
    >
      {/* Puzzle header */}
      <div className="text-neo-lime font-black text-xs uppercase tracking-widest mb-3">
        Word Hunt #{puzzleNumber} {solved ? '✅' : '❌'}
      </div>

      {/* Emoji rows */}
      <div className="space-y-1 mb-3">
        {words.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-base leading-none">{emojiRows[i]}</span>
            {entry.found && (
              <span className="text-slate-400 text-xs uppercase tracking-wide">
                {entry.word}
              </span>
            )}
            {!entry.found && (
              <span className="text-slate-600 text-xs">????</span>
            )}
          </div>
        ))}
      </div>

      {/* Score + domain */}
      <div className="border-t border-slate-700/50 pt-2 mt-2">
        <div className="text-neo-white font-bold text-sm">{score} pts</div>
        <div className="text-slate-500 text-xs mt-0.5">lexiclash.live</div>
      </div>
    </m.div>
  );
};

export default EmojiShareCard;
```

**Step 4: Add export to index.ts**

In `fe-next/components/daily/results/index.ts`, add after the last export:

```ts
export { EmojiShareCard } from './EmojiShareCard';
export type { EmojiShareCardProps } from './EmojiShareCard';
```

**Step 5: Run tests to verify they pass**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="EmojiShareCard" --no-coverage
```
Expected: PASS (4 tests).

**Step 6: Commit**

```bash
cd fe-next && git add components/daily/results/EmojiShareCard.tsx components/daily/results/__tests__/EmojiShareCard.test.tsx components/daily/results/index.ts
git commit -m "feat(daily): add EmojiShareCard with Wordle-style emoji rows"
```

---

## Task 2: ScoreGauntletBanner Component

**What it does:** Banner shown on the daily challenge landing page when arriving via a challenge share link. Reads URL params `whChallenger`, `whChallengeScore`, `whChallengeEmoji`, `whChallengeDate` and displays "Beat [name]'s [score]" call to action.

**Files:**
- Create: `fe-next/components/daily/ScoreGauntletBanner.tsx`
- Create: `fe-next/components/daily/__tests__/ScoreGauntletBanner.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/ScoreGauntletBanner.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreGauntletBanner } from '../ScoreGauntletBanner';

describe('ScoreGauntletBanner', () => {
  it('renders challenger name and score', () => {
    render(
      <ScoreGauntletBanner
        challengerName="Ohad"
        challengerScore={847}
        challengerEmoji="🎯"
        t={(k) => k}
      />
    );
    expect(screen.getByText(/Ohad/)).toBeInTheDocument();
    expect(screen.getByText(/847/)).toBeInTheDocument();
  });

  it('shows challenger emoji', () => {
    render(
      <ScoreGauntletBanner
        challengerName="Ohad"
        challengerScore={847}
        challengerEmoji="🎯"
        t={(k) => k}
      />
    );
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('renders nothing when no challenge props', () => {
    const { container } = render(
      <ScoreGauntletBanner
        challengerName={null}
        challengerScore={null}
        challengerEmoji={null}
        t={(k) => k}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="ScoreGauntletBanner" --no-coverage
```
Expected: FAIL.

**Step 3: Implement**

```tsx
// fe-next/components/daily/ScoreGauntletBanner.tsx
'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Swords } from 'lucide-react';

export interface ScoreGauntletBannerProps {
  challengerName: string | null;
  challengerScore: number | null;
  challengerEmoji: string | null;
  t: (key: string) => string;
}

export const ScoreGauntletBanner: React.FC<ScoreGauntletBannerProps> = ({
  challengerName,
  challengerScore,
  challengerEmoji,
  t,
}) => {
  if (!challengerName || challengerScore === null) return null;

  return (
    <m.div
      data-testid="score-gauntlet-banner"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-neo-pink/20 to-neo-orange/20 border-3 border-neo-pink rounded-neo shadow-hard p-3 mb-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{challengerEmoji || '🎯'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-neo-pink font-black uppercase tracking-widest flex items-center gap-1">
            <Swords className="w-3 h-3" />
            {t('wordHunt.gauntlet.challenge')}
          </div>
          <div className="text-neo-white font-bold text-sm">
            {t('wordHunt.gauntlet.beatScore')
              .replace('{name}', challengerName)
              .replace('{score}', String(challengerScore))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-black text-neo-orange">{challengerScore}</div>
          <div className="text-xs text-slate-400">{t('wordHunt.gauntlet.pts')}</div>
        </div>
      </div>
    </m.div>
  );
};

export default ScoreGauntletBanner;
```

**Step 4: Run tests**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="ScoreGauntletBanner" --no-coverage
```
Expected: PASS.

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/ScoreGauntletBanner.tsx components/daily/__tests__/ScoreGauntletBanner.test.tsx
git commit -m "feat(daily): add ScoreGauntletBanner for challenge share links"
```

---

## Task 3: WinCinematic Component

**What it does:** A 2.5-second Framer Motion sequence that plays immediately after the game ends (win only). Shows score rolling up, puzzle stamp, and confetti. Auto-advances to the results screen. Has a "tap to skip" fallback.

**Files:**
- Create: `fe-next/components/daily/WinCinematic.tsx`
- Create: `fe-next/components/daily/__tests__/WinCinematic.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/WinCinematic.test.tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinCinematic } from '../WinCinematic';

jest.useFakeTimers();

describe('WinCinematic', () => {
  it('renders puzzle number', () => {
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/421/)).toBeInTheDocument();
  });

  it('calls onComplete after timeout', () => {
    const onComplete = jest.fn();
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    act(() => { jest.advanceTimersByTime(2600); });
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onComplete on tap/click', async () => {
    const onComplete = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <WinCinematic
        puzzleNumber={421}
        finalScore={847}
        onComplete={onComplete}
      />
    );
    await user.click(screen.getByTestId('win-cinematic'));
    expect(onComplete).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="WinCinematic" --no-coverage
```
Expected: FAIL.

**Step 3: Implement**

```tsx
// fe-next/components/daily/WinCinematic.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/utils/confettiUtils';

export interface WinCinematicProps {
  puzzleNumber: number;
  finalScore: number;
  onComplete: () => void;
}

export const WinCinematic: React.FC<WinCinematicProps> = ({
  puzzleNumber,
  finalScore,
  onComplete,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [showTap, setShowTap] = useState(false);

  // Roll score counter up
  useEffect(() => {
    let frame = 0;
    const total = 40;
    const interval = setInterval(() => {
      frame++;
      setDisplayScore(Math.round((frame / total) * finalScore));
      if (frame >= total) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [finalScore]);

  // Fire confetti once on mount
  useEffect(() => {
    const t = setTimeout(() => {
      fireConfetti({
        particleCount: 120,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#BFFF00', '#00FFFF', '#FF1493', '#FFE135', '#FF6B35'],
      });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Show "tap to continue" after 2s, auto-advance at 2.5s
  useEffect(() => {
    const tapTimer = setTimeout(() => setShowTap(true), 2000);
    const doneTimer = setTimeout(onComplete, 2500);
    return () => { clearTimeout(tapTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <m.div
      data-testid="win-cinematic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={onComplete}
    >
      {/* Puzzle stamp */}
      <m.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: -3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
        className="text-slate-500 text-sm font-black uppercase tracking-widest mb-4"
      >
        Word Hunt #{puzzleNumber}
      </m.div>

      {/* Score */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[8rem] font-black text-neo-lime leading-none tabular-nums"
      >
        {displayScore}
      </m.div>

      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 text-lg font-bold uppercase tracking-widest"
      >
        pts
      </m.div>

      {/* Tap to continue */}
      <AnimatePresence>
        {showTap && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-12 text-slate-500 text-sm uppercase tracking-widest"
          >
            tap to continue
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default WinCinematic;
```

**Step 4: Run tests**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="WinCinematic" --no-coverage
```
Expected: PASS.

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/WinCinematic.tsx components/daily/__tests__/WinCinematic.test.tsx
git commit -m "feat(daily): add WinCinematic 2.5s Framer Motion win reveal"
```

---

## Task 4: Wire In-Game Juice (ScorePopupFly)

**What it does:** `DailyChallengeGame` and `DailyWordHuntSurvival` currently don't show score popups when words are found. Wire `ScorePopupFly` to the word-found event so players see `+N` fly up on each word.

**Files:**
- Modify: `fe-next/components/daily/DailyChallengeGame.tsx`
- Create: `fe-next/components/daily/__tests__/DailyChallengeGame.scorePopup.test.tsx`

**Background:** `useWordSubmission` in `DailyChallengeGame` handles word submission. When a word is accepted it fires a callback. We need to capture the tap/click position + score delta and pass it to `ScorePopupFly`.

**Step 1: Read the word submission callback shape**

Open `fe-next/hooks/useWordSubmission.ts` and find the `onWordAccepted` or equivalent callback. Look for what score data is returned.

**Step 2: Write the failing test**

```tsx
// fe-next/components/daily/__tests__/DailyChallengeGame.scorePopup.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// This test confirms ScorePopupFly renders after a word is accepted
// (shallow integration — mock heavy deps)
jest.mock('@/components/animations/ScorePopupFly', () => ({
  ScorePopupFly: ({ popup }: { popup: { value: number } | null }) =>
    popup ? <div data-testid="score-popup">{popup.value}</div> : null,
}));

// Mock other heavy deps at the top of the file as needed
// Then: simulate word accepted → expect score-popup to appear
```

> **Note:** This test is intentionally lightweight. The key assertion is that `ScorePopupFly` receives a non-null `popup` after a word-accepted event. Fully mocking `DailyChallengeGame` is complex — focus on verifying the popup state logic in isolation if needed.

**Step 3: Add ScorePopupFly to DailyChallengeGame**

In `fe-next/components/daily/DailyChallengeGame.tsx`:

1. Add import at top:
```tsx
import { ScorePopupFly } from '@/components/animations/ScorePopupFly';
```

2. Add state near the other `useState` calls:
```tsx
const [scorePopup, setScorePopup] = useState<{
  id: number; value: number; x: number; y: number; word?: string;
} | null>(null);
```

3. Find where a word is accepted (look for `onWordFound`, `onAccepted`, or the result handler from `useWordSubmission`). Add a popup trigger there:
```tsx
// When word is accepted with `points` and `word` string:
setScorePopup({
  id: Date.now(),
  value: points,
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  word,
});
```

4. Add `ScorePopupFly` to the JSX (at the end, before closing tag):
```tsx
<ScorePopupFly
  popup={scorePopup}
  flyToTarget={false}
  showWord
  onComplete={() => setScorePopup(null)}
/>
```

**Step 4: Run lint + tests**

```bash
cd fe-next && npm run lint && npm run test:frontend -- --testPathPattern="DailyChallengeGame" --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/DailyChallengeGame.tsx components/daily/__tests__/DailyChallengeGame.scorePopup.test.tsx
git commit -m "feat(daily): wire ScorePopupFly to word-found events in game"
```

---

## Task 5: Add Challenge Share URL to useShareHandlers

**What it does:** Add a `handleChallengeShare()` function to the existing `useShareHandlers` hook that encodes the challenger's name, score, emoji, and date into the share URL as `whChallenger`, `whChallengeScore`, `whChallengeEmoji`, `whChallengeDate` params.

**Files:**
- Modify: `fe-next/components/daily/results/useShareHandlers.ts`
- Create: `fe-next/components/daily/results/__tests__/useShareHandlers.challenge.test.ts`

**Step 1: Write the failing test**

```tsx
// fe-next/components/daily/results/__tests__/useShareHandlers.challenge.test.ts
import { renderHook, act } from '@testing-library/react';
import { useShareHandlers } from '../useShareHandlers';

// Mock window.navigator.share
const mockShare = jest.fn();
Object.defineProperty(window, 'navigator', {
  value: { share: mockShare },
  writable: true,
});

const baseProps = {
  result: { solved: true, attemptsUsed: 3, targetWord: 'CATCH', streakDays: 5,
    efficiencyScore: 847, lifeRemaining: 3, wordsDiscovered: [] } as any,
  puzzleNumber: 421,
  puzzleDate: '2026-02-21',
  language: 'en' as const,
  displayName: 'Ohad',
  avatarEmoji: '🎯',
  stats: null,
  isAuthenticated: true,
  profile: null,
  guestPlayer: null,
  t: (k: string) => k,
};

describe('useShareHandlers - challenge share', () => {
  it('challenge URL contains whChallenger param', async () => {
    const { result } = renderHook(() => useShareHandlers(baseProps));

    // Capture what gets shared
    mockShare.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleChallengeShare();
    });

    expect(mockShare).toHaveBeenCalled();
    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.url).toContain('whChallenger=Ohad');
    expect(callArg.url).toContain('whChallengeScore=847');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="useShareHandlers.challenge" --no-coverage
```
Expected: FAIL — `handleChallengeShare` not found.

**Step 3: Add handleChallengeShare to useShareHandlers**

In `fe-next/components/daily/results/useShareHandlers.ts`, find the `shareUrl` useMemo. Add a `challengeUrl` memo and `handleChallengeShare` function:

```ts
// Challenge URL encodes the score gauntlet params
const challengeUrl = useMemo(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';
  const score = result.efficiencyScore || 0;
  const params = new URLSearchParams({
    whChallenger: displayName,
    whChallengeScore: String(score),
    whChallengeEmoji: avatarEmoji,
    whChallengeDate: puzzleDate,
  });
  return `${origin}/${language}/daily?${params.toString()}`;
}, [displayName, avatarEmoji, puzzleDate, language, result.efficiencyScore]);

const handleChallengeShare = useCallback(async () => {
  const score = result.efficiencyScore || 0;
  const text = t('wordHunt.gauntlet.shareText')
    .replace('{score}', String(score))
    .replace('{name}', displayName);

  if (navigator.share) {
    try {
      await navigator.share({ title: t('wordHunt.title'), text, url: challengeUrl });
    } catch {
      // User cancelled
    }
  } else {
    // Fallback: open share panel
    setShowSharePanel(true);
  }
}, [challengeUrl, displayName, result.efficiencyScore, t]);
```

Return `handleChallengeShare` and `challengeUrl` from the hook alongside existing returns.

**Step 4: Run tests**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="useShareHandlers" --no-coverage
```
Expected: PASS.

**Step 5: Commit**

```bash
cd fe-next && git add components/daily/results/useShareHandlers.ts components/daily/results/__tests__/useShareHandlers.challenge.test.ts
git commit -m "feat(daily): add challenge share URL with gauntlet params"
```

---

## Task 6: Wire EmojiShareCard + Challenge CTA into Results Screen

**What it does:** Add `EmojiShareCard` to `DailyWordHuntResults` (inline above ShareSection), change the Share button CTA copy to "Challenge Friends →" for winners.

**Files:**
- Modify: `fe-next/components/daily/DailyWordHuntResults.tsx`
- Modify: `fe-next/components/daily/results/ShareSection.tsx`

**Step 1: No new test needed** — `EmojiShareCard` is already tested. Add a smoke test verifying it renders in the results page:

```tsx
// In existing fe-next/components/daily/__tests__/DailyWordHuntResults.*.test.tsx
// Add: verify emoji-share-card data-testid is present when solved=true
```

**Step 2: Modify DailyWordHuntResults**

In `DailyWordHuntResults.tsx`, inside `renderResultsContent()`:

1. Import at top:
```tsx
import { EmojiShareCard } from './results';
```

2. Build `emojiWords` from `result.wordsDiscovered` (the array of discovered words) + any unfound words. The `wordsDiscovered` array has `{ word: string }` items. For "unfound" context we don't have the full word list — so show only found words:

```tsx
const emojiWords = useMemo(() => {
  if (!result.wordsDiscovered) return [];
  return result.wordsDiscovered.map(w => ({ word: w.word || '', found: true }));
}, [result.wordsDiscovered]);
```

3. Add `<EmojiShareCard>` just above `<ShareSection>` in `renderResultsContent`:

```tsx
{result.solved && emojiWords.length > 0 && (
  <EmojiShareCard
    puzzleNumber={puzzleNumber}
    score={result.efficiencyScore || 0}
    solved={result.solved}
    words={emojiWords}
    language={language}
  />
)}
```

**Step 3: Update ShareSection CTA copy for winners**

In `fe-next/components/daily/results/ShareSection.tsx`, the winner Share button text is currently `t('wordHunt.results.share')`. Change to:

```tsx
<Button onClick={onShare} className="...existing styles...">
  <Share2 className="mr-2 w-5 h-5" />
  {t('wordHunt.results.challengeFriends')}
</Button>
```

Add a `onChallengeShare` prop to `ShareSectionProps` and wire it as the `onClick` for winners:

```tsx
export interface ShareSectionProps {
  // ...existing
  onChallengeShare?: () => void; // new
}

// In the winner button:
<Button onClick={onChallengeShare || onShare} className="...">
  {t('wordHunt.results.challengeFriends')}
</Button>
```

**Step 4: Pass onChallengeShare from DailyWordHuntResults**

In `DailyWordHuntResults.tsx`, pass `onChallengeShare={shareHandlers.handleChallengeShare}` to `<ShareSection>`.

**Step 5: Run lint + tests**

```bash
cd fe-next && npm run lint && npm run test:frontend -- --testPathPattern="DailyWordHuntResults" --no-coverage
```

**Step 6: Commit**

```bash
cd fe-next && git add components/daily/DailyWordHuntResults.tsx components/daily/results/ShareSection.tsx
git commit -m "feat(daily): wire EmojiShareCard and Challenge CTA into results screen"
```

---

## Task 7: Wire WinCinematic to Results Transition

**What it does:** In `DailyWordHuntResults`, show `WinCinematic` for 2.5 seconds when `isNewCompletion && result.solved`, then replace it with the normal results UI.

**Files:**
- Modify: `fe-next/components/daily/DailyWordHuntResults.tsx`

**Step 1: Write the test**

In `fe-next/components/daily/__tests__/DailyWordHuntResults.submission.test.tsx` or a new file:

```tsx
// Verify that WinCinematic renders on new solved completion
jest.mock('../WinCinematic', () => ({
  WinCinematic: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="win-cinematic" onClick={onComplete} />
  ),
}));

it('shows WinCinematic when isNewCompletion and solved', () => {
  // Render DailyWordHuntResults with isNewCompletion=true, result.solved=true
  // Assert data-testid="win-cinematic" is present
});
```

**Step 2: Modify DailyWordHuntResults**

1. Import at top:
```tsx
import { WinCinematic } from './WinCinematic';
```

2. Add state:
```tsx
const [showCinematic, setShowCinematic] = useState(isNewCompletion && result.solved);
```

3. In JSX, wrap the main content with a conditional. **Before** the `<m.div key="word-hunt-results">` return, add:

```tsx
if (showCinematic) {
  return (
    <WinCinematic
      puzzleNumber={puzzleNumber}
      finalScore={result.efficiencyScore || 0}
      onComplete={() => setShowCinematic(false)}
    />
  );
}
```

**Step 3: Run tests**

```bash
cd fe-next && npm run test:frontend -- --testPathPattern="DailyWordHuntResults" --no-coverage
```

**Step 4: Commit**

```bash
cd fe-next && git add components/daily/DailyWordHuntResults.tsx
git commit -m "feat(daily): show WinCinematic before results on new completion"
```

---

## Task 8: Wire ScoreGauntletBanner to Landing Page

**What it does:** `DailyChallengeLanding` reads `whChallenger`, `whChallengeScore`, `whChallengeEmoji` from `useSearchParams()` and shows `ScoreGauntletBanner` above the Word Hunt quest card.

**Files:**
- Modify: `fe-next/components/daily/DailyChallengeLanding.tsx`

**Step 1: Write the test**

```tsx
// fe-next/components/daily/__tests__/DailyChallengeLanding.gauntlet.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('whChallenger=Ohad&whChallengeScore=847&whChallengeEmoji=🎯'),
  usePathname: () => '/en/daily',
}));

// Mock heavy deps (useAuth, useLanguage, etc.)
// Then render DailyChallengeLanding and assert gauntlet banner appears

it('shows gauntlet banner when challenge params present', () => {
  // render(...);
  expect(screen.getByText(/Ohad/)).toBeInTheDocument();
  expect(screen.getByText(/847/)).toBeInTheDocument();
});
```

**Step 2: Modify DailyChallengeLanding**

1. Import at top:
```tsx
import { useSearchParams } from 'next/navigation';
import { ScoreGauntletBanner } from './ScoreGauntletBanner';
```

2. Add inside the component (after `const { t }` line):
```tsx
const searchParams = useSearchParams();
const challengerName = searchParams?.get('whChallenger') || null;
const challengerScore = searchParams?.get('whChallengeScore')
  ? Number(searchParams.get('whChallengeScore'))
  : null;
const challengerEmoji = searchParams?.get('whChallengeEmoji') || null;
```

3. In JSX, add `<ScoreGauntletBanner>` near the top of the content area (before the quest cards):
```tsx
<ScoreGauntletBanner
  challengerName={challengerName}
  challengerScore={challengerScore}
  challengerEmoji={challengerEmoji}
  t={t}
/>
```

**Step 3: Run lint + tests**

```bash
cd fe-next && npm run lint && npm run test:frontend -- --testPathPattern="DailyChallengeLanding" --no-coverage
```

**Step 4: Commit**

```bash
cd fe-next && git add components/daily/DailyChallengeLanding.tsx
git commit -m "feat(daily): show ScoreGauntletBanner when arriving via challenge link"
```

---

## Task 9: Add Translations

**What it does:** Add all new `t()` keys to all 4 translation files. Keys used: `wordHunt.gauntlet.challenge`, `wordHunt.gauntlet.beatScore`, `wordHunt.gauntlet.pts`, `wordHunt.gauntlet.shareText`, `wordHunt.results.challengeFriends`.

**Files:**
- Modify: `fe-next/translations/en.js`
- Modify: `fe-next/translations/he.js`
- Modify: `fe-next/translations/sv.js`
- Modify: `fe-next/translations/ja.js`
- Modify: `fe-next/translations/es.js`

**Step 1: Run the translation report to see missing keys**

```bash
cd fe-next && node scripts/translation-report.json 2>/dev/null || echo "check script name"
```

**Step 2: Add to en.js**

Find the `"wordHunt"` object (around line 3173) and inside `"results"`, add:
```js
"challengeFriends": "Challenge Friends →",
```

Then add a new `"gauntlet"` object inside `"wordHunt"`:
```js
"gauntlet": {
  "challenge": "Challenge",
  "beatScore": "Beat {name}'s {score}",
  "pts": "pts",
  "shareText": "I scored {score} in today's LexiClash Word Hunt 🎯 Think you can beat me?"
},
```

**Step 3: Add to he.js (Hebrew/RTL)**

```js
"gauntlet": {
  "challenge": "אתגר",
  "beatScore": "תנסה לשבור את השיא של {name}: {score}",
  "pts": "נק'",
  "shareText": "השגתי {score} נקודות בציד המילים של LexiClash 🎯 אתה יכול לעשות יותר?"
},
"challengeFriends": "אתגר חברים →",
```

**Step 4: Add to sv.js (Swedish)**

```js
"gauntlet": {
  "challenge": "Utmaning",
  "beatScore": "Slå {name}s {score}",
  "pts": "p",
  "shareText": "Jag fick {score} poäng i dagens LexiClash Word Hunt 🎯 Kan du slå mig?"
},
"challengeFriends": "Utmana vänner →",
```

**Step 5: Add to ja.js (Japanese)**

```js
"gauntlet": {
  "challenge": "チャレンジ",
  "beatScore": "{name}のスコア{score}を超えろ",
  "pts": "pt",
  "shareText": "LexiClashのワードハントで{score}点を取りました🎯あなたは超えられますか？"
},
"challengeFriends": "友達に挑戦 →",
```

**Step 6: Add to es.js (Spanish)**

```js
"gauntlet": {
  "challenge": "Desafío",
  "beatScore": "Supera el récord de {name}: {score}",
  "pts": "pts",
  "shareText": "Logré {score} puntos en el Word Hunt de LexiClash 🎯 ¿Puedes superarme?"
},
"challengeFriends": "Desafiar amigos →",
```

**Step 7: Run lint + full test suite**

```bash
cd fe-next && npm run lint && npm run test && npm run build
```

All should pass (fix any failures before proceeding).

**Step 8: Commit**

```bash
cd fe-next && git add translations/en.js translations/he.js translations/sv.js translations/ja.js translations/es.js
git commit -m "feat(daily): add gauntlet and challenge translations for all 5 languages"
```

---

## Final Verification

```bash
cd fe-next && npm run lint && npm run test && npm run build
```

Then test manually:
1. Play word hunt → words found show `+N` popup ✓
2. Win → WinCinematic plays for 2.5s then auto-advances ✓
3. Results show emoji grid above share button ✓
4. Click "Challenge Friends →" → share opens with gauntlet URL ✓
5. Open gauntlet URL → landing shows "Beat [name]'s [score]" banner ✓
6. Test with `?locale=he` — banner and buttons render RTL correctly ✓
