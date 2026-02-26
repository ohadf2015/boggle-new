# Daily Word Hunt UX Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-route users to Word Hunt, make results screenshot-worthy with playful+celebratory animations, demote Daily Buzz to secondary action.

**Architecture:** Modify `DailyChallengeRouter` to smart-route based on play status. Restructure `DailyChallengeLanding` hierarchy. Enhance results components with staggered spring animations, count-up scores, and confetti peaks. All changes are frontend-only — no API changes.

**Tech Stack:** Next.js App Router, Framer Motion (springs, AnimatePresence), Tailwind CSS, existing neo-brutalist design system.

---

## Task 1: Smart Routing in DailyChallengeRouter

**Files:**
- Modify: `fe-next/components/daily/DailyChallengeRouter.tsx`

**Step 1: Write failing test**

Create `fe-next/components/daily/__tests__/DailyChallengeRouter.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';

// Mock dependencies
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

jest.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: jest.fn(),
}));

// Mock child components to avoid deep rendering
jest.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: (props: any) => <div data-testid="landing" />,
}));
jest.mock('../../buzz/BuzzHistoryList', () => () => null);
jest.mock('../../Header', () => () => <header />);
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import DailyChallengeRouter from '../DailyChallengeRouter';

describe('DailyChallengeRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to word-hunt when user has not played today', async () => {
    (getWordHuntStatusToday as jest.Mock).mockReturnValue(null);
    render(<DailyChallengeRouter />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/en/daily/word-hunt');
    });
  });

  it('shows landing when user has already played today', async () => {
    (getWordHuntStatusToday as jest.Mock).mockReturnValue({ solved: true });
    render(<DailyChallengeRouter />);
    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test — expect FAIL** (current router doesn't redirect)

Run: `cd fe-next && npx jest components/daily/__tests__/DailyChallengeRouter.test.tsx --no-coverage`

**Step 3: Implement smart routing**

Modify `fe-next/components/daily/DailyChallengeRouter.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import BuzzHistoryList from '../buzz/BuzzHistoryList';
import Header from '../Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import { PageLoader } from '@/components/ui/PageLoader';
import type { Language } from '@/types';

/**
 * DailyChallengeRouter — Smart gateway for daily challenges.
 * Not played today → auto-redirect to /daily/word-hunt
 * Already played → show landing with results + Buzz secondary
 */
export default function DailyChallengeRouter() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [showBuzzHistory, setShowBuzzHistory] = useState(false);
  const [routeDecision, setRouteDecision] = useState<'loading' | 'landing' | 'redirecting'>('loading');

  // Smart routing: check if user has played today
  useEffect(() => {
    const status = getWordHuntStatusToday(language as Language);
    if (!status) {
      // Not played → redirect to word hunt
      setRouteDecision('redirecting');
      router.replace(`/${language}/daily/word-hunt`);
    } else {
      // Already played → show landing
      setRouteDecision('landing');
    }
  }, [language, router]);

  const handleSelectWordHunt = () => {
    router.push(`/${language}/daily/word-hunt`);
  };

  const handleSelectBuzz = () => {
    router.push(`/${language}/daily/buzz`);
  };

  const handleShowBuzzHistory = () => {
    setShowBuzzHistory(true);
  };

  const handleSelectPastBuzz = (date: string) => {
    setShowBuzzHistory(false);
    router.push(`/${language}/daily/buzz?date=${date}`);
  };

  // Show loader while deciding route
  if (routeDecision === 'loading' || routeDecision === 'redirecting') {
    return (
      <div className="flex-1 flex flex-col bg-neo-navy">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <PageLoader size="lg" text={t('daily.loading')} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neo-navy">
      <Header />

      <DailyChallengeLanding
        onSelectWordHunt={handleSelectWordHunt}
        onSelectBuzz={handleSelectBuzz}
        onShowBuzzHistory={handleShowBuzzHistory}
        currentLanguage={language as Language}
      />

      <AnimatePresence>
        {showBuzzHistory && (
          <BuzzHistoryList
            language={language as Language}
            onSelectDate={handleSelectPastBuzz}
            onClose={() => setShowBuzzHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 4: Run test — expect PASS**

Run: `cd fe-next && npx jest components/daily/__tests__/DailyChallengeRouter.test.tsx --no-coverage`

**Step 5: Commit**

```bash
git add fe-next/components/daily/DailyChallengeRouter.tsx fe-next/components/daily/__tests__/DailyChallengeRouter.test.tsx
git commit -m "feat(daily): smart routing — auto-redirect to word hunt if not played"
```

---

## Task 2: Landing Hierarchy — Word Hunt Hero + Buzz Secondary

**Files:**
- Modify: `fe-next/components/daily/DailyChallengeLanding.tsx:273-401`
- Modify: `fe-next/components/daily/landing/QuestCard.tsx:14-35` (add `variant` prop)

**Step 1: Add `variant` prop to QuestCard**

In `QuestCard.tsx`, add to `QuestCardProps` interface:

```tsx
variant?: 'primary' | 'secondary';
```

Default to `'primary'`. When `variant === 'secondary'`, apply reduced sizing:

```tsx
// In the main container div, add conditional classes:
className={cn(
  'relative w-full bg-slate-900/95 rounded-xl border-3 border-neo-black',
  'shadow-hard overflow-hidden cursor-pointer',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime',
  'transition-shadow duration-200 group',
  variant === 'secondary' ? 'flex flex-row items-center gap-3 p-3' : 'flex flex-col gap-4 p-5',
  // ... existing conditional classes
)}
```

For secondary variant: horizontal layout, smaller icon (w-8 h-8), smaller title (text-lg), hide tagline details, smaller CTA button.

**Step 2: Restructure DailyChallengeLanding render**

When `status.wordHunt === 'won' || status.wordHunt === 'lost'`:
- Show Word Hunt results summary at top (score, rank) — tappable to navigate to full results
- Show "Continue your missions" divider
- Show Buzz quest card with `variant="secondary"`

When `status.wordHunt === 'new'`:
- This case shouldn't render often (smart routing redirects), but as fallback show current layout

**Step 3: Run lint + existing tests**

Run: `cd fe-next && npm run lint && npx jest components/daily/ --no-coverage`

**Step 4: Commit**

```bash
git add fe-next/components/daily/DailyChallengeLanding.tsx fe-next/components/daily/landing/QuestCard.tsx
git commit -m "feat(daily): restructure landing — word hunt hero, buzz secondary"
```

---

## Task 3: Animated Score Count-Up Hook

**Files:**
- Create: `fe-next/hooks/useCountUp.ts`
- Create: `fe-next/hooks/__tests__/useCountUp.test.ts`

**Step 1: Write failing test**

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

describe('useCountUp', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('counts up from 0 to target value', () => {
    const { result } = renderHook(() => useCountUp({ target: 750, duration: 1000 }));
    expect(result.current).toBe(0);

    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current).toBe(750);
  });

  it('returns 0 when not started', () => {
    const { result } = renderHook(() => useCountUp({ target: 500, duration: 1000, startDelay: 5000 }));
    expect(result.current).toBe(0);
  });
});
```

**Step 2: Run test — expect FAIL**

Run: `cd fe-next && npx jest hooks/__tests__/useCountUp.test.ts --no-coverage`

**Step 3: Implement**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  target: number;
  duration?: number;
  startDelay?: number;
  easing?: (t: number) => number;
}

// Ease-out cubic for satisfying deceleration
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp({
  target,
  duration = 1200,
  startDelay = 0,
  easing = easeOutCubic,
}: UseCountUpOptions): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        setValue(Math.round(easedProgress * target));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, startDelay, easing]);

  return value;
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add fe-next/hooks/useCountUp.ts fe-next/hooks/__tests__/useCountUp.test.ts
git commit -m "feat: add useCountUp hook for animated number reveals"
```

---

## Task 4: Enhanced ResultDisplay — Slam-In Score + Letter Pop-In

**Files:**
- Modify: `fe-next/components/daily/results/ResultDisplay.tsx`

**Step 1: Write test for animated score**

Add to existing test file or create `fe-next/components/daily/results/__tests__/ResultDisplay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ResultDisplay } from '../ResultDisplay';

// Mock framer-motion to render immediately
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

jest.mock('@/hooks/useCountUp', () => ({
  useCountUp: ({ target }: { target: number }) => target,
}));

const mockT = (key: string) => key;

describe('ResultDisplay', () => {
  it('renders score with count-up for solved puzzle', () => {
    render(
      <ResultDisplay
        solved={true}
        attemptsUsed={3}
        targetWord="HELLO"
        streakDays={5}
        language="en"
        puzzleNumber={42}
        countdown="12:34:56"
        lifeRemaining={60}
        wordsDiscovered={8}
        t={mockT}
      />
    );
    expect(screen.getByTestId('score-hero')).toBeInTheDocument();
  });

  it('renders target word letters individually for animation', () => {
    render(
      <ResultDisplay
        solved={true}
        attemptsUsed={2}
        targetWord="CAT"
        streakDays={0}
        language="en"
        puzzleNumber={1}
        countdown="11:22:33"
        lifeRemaining={80}
        wordsDiscovered={5}
        t={mockT}
      />
    );
    // Each letter rendered as individual span for pop-in
    expect(screen.getByTestId('letter-C')).toBeInTheDocument();
    expect(screen.getByTestId('letter-A')).toBeInTheDocument();
    expect(screen.getByTestId('letter-T')).toBeInTheDocument();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Enhance ResultDisplay**

Key changes to `ResultDisplay.tsx`:

1. Import `useCountUp` hook
2. Replace static `{scoreBreakdown.total}` with animated count-up:
   ```tsx
   const animatedScore = useCountUp({ target: scoreBreakdown.total, duration: 1500, startDelay: 200 });
   ```
3. Add `data-testid="score-hero"` to the main score container
4. Render target word letters individually with staggered pop-in:
   ```tsx
   <div className="flex gap-1 justify-center md:justify-start">
     {displayedTargetWord.split('').map((letter, i) => (
       <motion.span
         key={i}
         data-testid={`letter-${letter}`}
         initial={{ scale: 0, rotate: -15 }}
         animate={{ scale: 1, rotate: 0 }}
         transition={{
           type: 'spring',
           stiffness: 400,
           damping: 15,
           delay: 0.4 + i * 0.08,
         }}
         className="inline-block text-2xl sm:text-3xl md:text-4xl font-black text-neo-lime"
       >
         {letter}
       </motion.span>
     ))}
   </div>
   ```
5. Add slam-in animation to score number:
   ```tsx
   <motion.div
     data-testid="score-hero"
     initial={{ scale: 0.3, opacity: 0, rotate: -5 }}
     animate={{ scale: 1, opacity: 1, rotate: 0 }}
     transition={{ type: 'spring', stiffness: 350, damping: 20 }}
     className={`text-[5rem] sm:text-[6rem] lg:text-[7rem] font-black ${styles.color} leading-none tracking-tight`}
   >
     {animatedScore}
   </motion.div>
   ```
6. Add neo-brutalist "stamp" for puzzle number:
   ```tsx
   <div className="absolute -top-2 -end-2 bg-neo-pink px-3 py-1 border-3 border-neo-black rounded-neo shadow-hard-sm -rotate-6 text-xs font-black text-white uppercase">
     #{puzzleNumber}
   </div>
   ```

**Step 4: Run test — expect PASS**

Run: `cd fe-next && npx jest components/daily/results/__tests__/ResultDisplay.test.tsx --no-coverage`

**Step 5: Commit**

```bash
git add fe-next/components/daily/results/ResultDisplay.tsx fe-next/components/daily/results/__tests__/ResultDisplay.test.tsx
git commit -m "feat(results): slam-in score with count-up + letter-by-letter target word pop-in"
```

---

## Task 5: Animated Performance Bars with Bounce + Count-Up

**Files:**
- Modify: `fe-next/components/daily/results/PerformanceSection.tsx`

**Step 1: Enhance bar animation**

Replace existing bar `motion.div` with bounce-spring fill + count-up numbers:

```tsx
// For each bar, use useCountUp for the value number
const speedCount = useCountUp({ target: breakdown.speed, duration: 800, startDelay: 400 });
const accuracyCount = useCountUp({ target: breakdown.accuracy, duration: 800, startDelay: 500 });
const explorationCount = useCountUp({ target: breakdown.exploration, duration: 800, startDelay: 600 });

// Replace bar fill animation with bounce spring:
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${(bar.value / bar.max) * 100}%` }}
  transition={{
    type: 'spring',
    stiffness: 120,
    damping: 14,
    delay: 0.4 + index * 0.1,
  }}
  className={`h-full rounded-full ${bar.color}`}
/>
```

Replace static `{bar.value}` display with animated count value.

**Step 2: Run lint + tests**

Run: `cd fe-next && npm run lint && npx jest components/daily/results/ --no-coverage`

**Step 3: Commit**

```bash
git add fe-next/components/daily/results/PerformanceSection.tsx
git commit -m "feat(results): bouncy performance bars with animated count-up numbers"
```

---

## Task 6: Enhanced RankBadge — Dramatic Reveal with Wobble

**Files:**
- Modify: `fe-next/components/daily/results/RankBadge.tsx`

**Step 1: Enhance animation**

Replace current simple spring with dramatic two-phase reveal:

```tsx
<motion.div
  initial={{ scale: 0, rotate: -15, y: 20 }}
  animate={{ scale: 1, rotate: 0, y: 0 }}
  transition={{
    type: 'spring',
    stiffness: 300,
    damping: 12,
    delay: 0.6,
  }}
  className="flex justify-center"
>
  <motion.div
    animate={{ rotate: [0, -3, 3, -2, 0] }}
    transition={{ delay: 1.2, duration: 0.5, ease: 'easeInOut' }}
    className="inline-block px-5 py-3 bg-amber-400 rounded-neo border-3 border-neo-black shadow-hard"
  >
    <div className="flex items-center gap-2">
      <Trophy className="w-6 h-6 text-neo-black" />
      <div>
        <span className="font-black text-neo-black text-base block">
          #{stats.yourStats.rank}
        </span>
        <span className="text-[10px] text-neo-black/60 font-bold">
          {t('wordHunt.results.outOf').replace('{total}', String(stats.totalPlayers))}
        </span>
      </div>
    </div>
  </motion.div>
</motion.div>
```

Add percentile calculation:

```tsx
const percentile = stats.totalPlayers > 0
  ? Math.round((1 - (stats.yourStats.rank - 1) / stats.totalPlayers) * 100)
  : 0;
```

Display as: `Top {percentile}%` below the badge.

**Step 2: Run tests**

Run: `cd fe-next && npx jest components/daily/results/ --no-coverage`

**Step 3: Commit**

```bash
git add fe-next/components/daily/results/RankBadge.tsx
git commit -m "feat(results): dramatic rank badge reveal with wobble + percentile display"
```

---

## Task 7: Screenshot Hint in ShareSection

**Files:**
- Modify: `fe-next/components/daily/results/ShareSection.tsx`
- Add translation key for screenshot hint

**Step 1: Add screenshot hint text**

Above the share buttons, add a subtle hint:

```tsx
{/* Screenshot hint */}
<div className="text-center mb-2">
  <span className="text-[11px] text-slate-500 font-medium">
    {t('wordHunt.results.screenshotHint')}
  </span>
</div>
```

**Step 2: Add translation key**

In all 4 translation files under `fe-next/translations/`, add:
- `en`: `"wordHunt.results.screenshotHint": "Screenshot & share your score!"`
- `he`: `"wordHunt.results.screenshotHint": "צלמו מסך ושתפו את הציון!"`
- `sv`: `"wordHunt.results.screenshotHint": "Skärmdumpa och dela din poäng!"`
- `ja`: `"wordHunt.results.screenshotHint": "スクリーンショットでスコアをシェア!"`

**Step 3: Run lint + tests**

Run: `cd fe-next && npm run lint && npx jest components/daily/results/ --no-coverage`

**Step 4: Commit**

```bash
git add fe-next/components/daily/results/ShareSection.tsx fe-next/translations/
git commit -m "feat(results): add screenshot share hint + translations"
```

---

## Task 8: Staggered Entrance Choreography in DailyWordHuntResults

**Files:**
- Modify: `fe-next/components/daily/DailyWordHuntResults.tsx:258-409`

**Step 1: Add stagger delays to results content**

Wrap each section in the `renderResultsContent()` with increasing entrance delays. The components already have individual `motion.div` wrappers — update their `delay` values to create the staggered sequence:

1. ResultDisplay: delay 0 (immediate slam-in, internally manages its own stagger)
2. PerformanceSection: delay 0.3
3. RankBadge: delay 0.5
4. EmojiShareCard: delay 0.6
5. ShareSection: delay 0.7

Also add a confetti burst triggered after the rank badge appears (for solved puzzles):

```tsx
useEffect(() => {
  if (isNewCompletion && result.solved) {
    // Fire confetti after rank badge reveal
    const timer = setTimeout(() => {
      fireConfetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#BFFF00', '#00FFFF', '#FF1493', '#FFE135'],
      });
    }, 1200);
    return () => clearTimeout(timer);
  }
}, [isNewCompletion, result.solved]);
```

**Step 2: Run full test suite**

Run: `cd fe-next && npm run lint && npm run test && npm run build`

**Step 3: Commit**

```bash
git add fe-next/components/daily/DailyWordHuntResults.tsx
git commit -m "feat(results): staggered entrance choreography with confetti on rank reveal"
```

---

## Task 9: Verify Results Display After Completion

**Files:**
- Verify: `fe-next/components/daily/DailyChallenge.tsx:779-791`

**Step 1: Test the completed → results transition**

Write integration-style test verifying the phase transition renders results:

```tsx
// In DailyChallenge test file
it('renders DailyWordHuntResults immediately on completed phase', () => {
  // Mock puzzle initialization to go straight to completed
  // Verify DailyWordHuntResults renders without blank frame
  // Verify AnimatePresence mode="wait" doesn't cause delay
});
```

**Step 2: Verify no blank frame**

The existing `AnimatePresence mode="wait"` could cause a brief blank between game exit and results entrance. Check that the `exit` animation on the game view and `initial` on results view are quick enough (< 200ms total).

If there's a visible gap, change the game→results transition to:
```tsx
// In DailyChallenge.tsx, for completed phase:
<motion.div
  key="results"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.15 }}  // Fast fade-in, no spring delay
>
```

**Step 3: Commit if changes needed**

```bash
git add fe-next/components/daily/DailyChallenge.tsx
git commit -m "fix(daily): ensure no blank frame between game and results"
```

---

## Task 10: Final Validation

**Step 1: Full lint + test + build**

Run: `cd fe-next && npm run lint && npm run test && npm run build`

**Step 2: Visual smoke test checklist**

- [ ] Navigate to `/en/daily` as new user → auto-redirects to word hunt
- [ ] Complete word hunt → results show with staggered animations
- [ ] Score counts up from 0 with deceleration
- [ ] Target word letters pop in one-by-one
- [ ] Performance bars bounce-fill with count-up numbers
- [ ] Rank badge slams in with wobble after bars
- [ ] Confetti fires on rank badge reveal (solved only)
- [ ] "Screenshot & share!" hint visible above share buttons
- [ ] Navigate back to `/daily` → sees results hero + Buzz secondary
- [ ] Buzz card is smaller/compact, clearly secondary
- [ ] RTL Hebrew rendering works correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final validation pass for daily word hunt UX overhaul"
```
