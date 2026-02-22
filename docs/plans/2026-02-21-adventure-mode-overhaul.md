# Adventure Mode Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve adventure mode by fixing the bottom UI visibility, adding a side quests system (mid-level flash challenges + persistent chapter quests), making boss battles feel dramatic and interactive, and fixing Remotion cinematics on mobile portrait screens.

**Architecture:** Four parallel tracks (A–D) with no shared state dependencies — each agent owns their domain. Track E is the integration pass that wires everything together in `AdventureGame.tsx`. All new hooks/components follow the existing neo-brutalist design system.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Remotion (`@remotion/player`), Jest + React Testing Library, Lucide icons

**Design doc:** `docs/plans/2026-02-21-adventure-mode-overhaul-design.md`

---

## TRACK A — Frontend Developer: Bottom UI & GameLayout

> **Context:** The `GameLayout` sidebar is constrained to `max-h-[20vh]` (~140px on mobile), cutting off objectives and hints. The `GameSidebar` already has a horizontal mobile layout that just needs room to breathe.

---

### Task A1: Fix GameLayout mobile sidebar height

**Files:**
- Modify: `fe-next/components/adventure/ui/GameLayout.tsx`
- Test: `fe-next/components/adventure/ui/__tests__/GameLayout.test.tsx`

**Step 1: Write the failing test**

```tsx
// fe-next/components/adventure/ui/__tests__/GameLayout.test.tsx
import { render } from '@testing-library/react';
import { GameLayout } from '../GameLayout';

describe('GameLayout', () => {
  it('gives sidebar a fixed 96px height on mobile (not max-h-[20vh])', () => {
    const { container } = render(
      <GameLayout
        header={<div>header</div>}
        gridArea={<div>grid</div>}
        sidebar={<div data-testid="sidebar">sidebar</div>}
      />
    );
    const sidebarWrapper = container.querySelector('[class*="flex-shrink-0"]');
    // Should have h-24 (96px) class not max-h-[20vh]
    expect(sidebarWrapper?.className).toContain('h-24');
    expect(sidebarWrapper?.className).not.toContain('max-h-[20vh]');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npx jest GameLayout.test --no-coverage
```
Expected: FAIL — `expect(received).toContain('h-24')` fails

**Step 3: Edit `GameLayout.tsx`**

Find the sidebar wrapper div (around line 63). Change:
```tsx
// BEFORE
'max-h-[20vh] lg:max-h-none',
'lg:h-full lg:w-64 xl:w-72',
'overflow-hidden lg:overflow-y-auto',

// AFTER
'h-24 lg:h-full lg:w-64 xl:w-72',
'overflow-hidden lg:overflow-y-auto',
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npx jest GameLayout.test --no-coverage
```
Expected: PASS

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/ui/GameLayout.tsx components/adventure/ui/__tests__/GameLayout.test.tsx
git commit -m "fix(adventure): increase mobile sidebar height from max-h-[20vh] to h-24"
```

---

### Task A2: Add compact horizontal chip variant to GameSidebar

**Files:**
- Modify: `fe-next/components/adventure/ui/GameSidebar.tsx`
- Test: `fe-next/components/adventure/ui/__tests__/GameSidebar.test.tsx`

**Step 1: Write failing test**

```tsx
// fe-next/components/adventure/ui/__tests__/GameSidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { GameSidebar } from '../GameSidebar';
import type { LevelObjective } from '@/types/adventure';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const objectives: LevelObjective[] = [
  { type: 'wordCount', target: 10, current: 3, isPrimary: true },
  { type: 'scoreTarget', target: 500, current: 120 },
];

describe('GameSidebar mobile layout', () => {
  it('renders objectives with progress visible in compact bar', () => {
    render(
      <GameSidebar
        objectives={objectives}
        hasHintsAvailable={true}
        onHintClick={jest.fn()}
        showAutoHint={false}
        currentHint={null}
        hintLevel="none"
      />
    );
    // Both objectives should be visible
    expect(screen.getByTestId('objective-wordCount')).toBeInTheDocument();
    expect(screen.getByTestId('objective-scoreTarget')).toBeInTheDocument();
  });

  it('shows progress fraction for each objective', () => {
    render(
      <GameSidebar
        objectives={objectives}
        hasHintsAvailable={false}
        onHintClick={jest.fn()}
        showAutoHint={false}
        currentHint={null}
        hintLevel="none"
      />
    );
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd fe-next && npx jest GameSidebar.test --no-coverage
```
Expected: FAIL — `getByTestId('objective-wordCount')` not found (AdventureObjectives not rendering data-testid in this context)

**Step 3: Update mobile layout in `GameSidebar.tsx`**

The mobile section (the `div` with `className="lg:hidden flex flex-row gap-2 p-2"`) already exists but wraps `AdventureObjectives` in a box. Replace it with a compact scrollable chip row:

```tsx
{/* Mobile: Horizontal scrollable chip bar */}
<div className="lg:hidden flex flex-row items-center gap-2 p-2 h-full overflow-x-auto scrollbar-hide">
  {objectives.map((obj) => {
    const current = obj.current ?? 0;
    const pct = Math.min((current / obj.target) * 100, 100);
    const Icon = OBJECTIVE_ICONS[obj.type];
    return (
      <div
        key={obj.type}
        data-testid={`objective-${obj.type}`}
        className={cn(
          'flex-shrink-0 flex items-center gap-1.5 px-2 py-1',
          'rounded-neo border-2 min-w-[80px]',
          'transition-all duration-300',
          obj.isComplete
            ? 'bg-neo-lime/20 border-neo-lime'
            : obj.isPrimary
              ? 'bg-neo-yellow/10 border-neo-yellow/40'
              : 'bg-neo-black/40 border-neo-white/10'
        )}
      >
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', obj.isComplete ? 'text-neo-lime' : OBJECTIVE_COLORS[obj.type])} />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className={cn('text-[10px] font-mono font-black tabular-nums', obj.isComplete ? 'text-neo-lime' : 'text-neo-white/80')}>
            {current}/{obj.target}
          </span>
          <div className="h-1 bg-neo-black/50 rounded-full overflow-hidden">
            <div
              data-testid={`progress-bar-${obj.type}`}
              className={cn('h-full rounded-full transition-all duration-500', obj.isComplete ? 'bg-neo-lime' : 'bg-neo-yellow')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {obj.isComplete && <Check className="w-3 h-3 text-neo-lime flex-shrink-0" strokeWidth={3} />}
      </div>
    );
  })}

  {/* Divider */}
  <div className="flex-shrink-0 w-px h-8 bg-neo-white/10" />

  {/* Hint chip */}
  <button
    onClick={onHintClick}
    disabled={!hasHintsAvailable}
    className={cn(
      'flex-shrink-0 flex items-center gap-1 px-2 py-1',
      'rounded-neo border-2 h-full',
      hasHintsAvailable
        ? 'bg-neo-yellow text-neo-black border-neo-black'
        : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
    )}
  >
    <Lightbulb className="w-3.5 h-3.5" />
    <span className="text-[10px] font-bold">{t('adventure.game.hint')}</span>
  </button>
</div>
```

You also need to add `OBJECTIVE_ICONS`, `OBJECTIVE_COLORS`, and `Check` imports from `AdventureObjectives` (copy the maps or import them from a shared constants file). Add to imports:
```tsx
import { Check, FileText, Target, Star, Snowflake, Clock, Gem, Swords, Heart, Zap, Shield, Lightbulb } from 'lucide-react';
import type { ObjectiveType } from '@/types/adventure';

const OBJECTIVE_ICONS: Record<ObjectiveType, React.ComponentType<{ className?: string }>> = {
  wordCount: FileText, scoreTarget: Target, longWords: Star, clearIce: Snowflake,
  timeBonus: Clock, collectGems: Gem, defeatBoss: Swords, surviveBattle: Heart,
  mechanicTrigger: Zap, noDamage: Shield,
};

const OBJECTIVE_COLORS: Record<ObjectiveType, string> = {
  wordCount: 'text-neo-cyan', scoreTarget: 'text-neo-yellow', longWords: 'text-neo-purple',
  clearIce: 'text-neo-cyan', timeBonus: 'text-neo-lime', collectGems: 'text-neo-pink',
  defeatBoss: 'text-neo-red', surviveBattle: 'text-neo-pink', mechanicTrigger: 'text-neo-orange', noDamage: 'text-neo-lime',
};
```

**Step 4: Run test to verify it passes**

```bash
cd fe-next && npx jest GameSidebar.test --no-coverage
```
Expected: PASS

**Step 5: Run lint**

```bash
cd fe-next && npm run lint -- --fix
```

**Step 6: Commit**

```bash
cd fe-next && git add components/adventure/ui/GameSidebar.tsx components/adventure/ui/__tests__/GameSidebar.test.tsx
git commit -m "feat(adventure): redesign mobile bottom bar as horizontal scrollable objective chips"
```

---

## TRACK B — UX Researcher: Side Quests System

> **Context:** No side quests system exists yet. We're building two tiers: ephemeral mid-level Flash Challenges and persistent Chapter Quests shown on the level select screen.

---

### Task B1: Add quest types to `types/adventure.ts`

**Files:**
- Modify: `fe-next/types/adventure.ts`
- Test: no test needed for types (type-only addition)

**Step 1: Append to `fe-next/types/adventure.ts`** (after the existing exports)

```typescript
// ==============================================
// QUEST TYPES
// ==============================================

/** Type of flash challenge (mid-level ephemeral) */
export type FlashChallengeType =
  | 'longWord'      // Find a word of N+ letters
  | 'comboStreak'   // Build N consecutive valid words
  | 'specificLetter' // Use the letter X in a word
  | 'fastWord';     // Find any word in N seconds

/** A mid-level flash challenge */
export interface FlashChallenge {
  id: string;
  type: FlashChallengeType;
  /** i18n description key, e.g. 'adventure.quests.flash.longWord' */
  descriptionKey: string;
  /** Param used in description (e.g. minLength=6, letter='Q') */
  param: string | number;
  /** Duration player has to complete it (seconds) */
  durationSeconds: number;
  /** Coin reward on completion */
  rewardCoins: number;
  /** Score bonus on completion */
  rewardScore: number;
}

/** Type of chapter quest (persistent, cross-level) */
export type ChapterQuestType =
  | 'wordCountChapter'     // Find N total words in a chapter
  | 'defeatBossNoHint'     // Beat a boss without using hints
  | 'fullComboLevels'      // Complete N levels with a combo streak
  | 'perfectLevels'        // Complete N levels with 3 stars
  | 'longWordCount';       // Find N words of 6+ letters in a chapter

/** Reward for completing a chapter quest */
export interface QuestReward {
  coins: number;
  xp: number;
  /** Optional cosmetic badge key */
  badge?: string;
}

/** A persistent chapter-spanning quest */
export interface ChapterQuest {
  id: string;
  chapterNumber: number; // group of 5 levels (chapter = Math.ceil(level / 5))
  worldId: number;
  type: ChapterQuestType;
  /** i18n title key */
  titleKey: string;
  /** i18n description key */
  descriptionKey: string;
  target: number;
  reward: QuestReward;
}

/** Runtime progress for a chapter quest */
export interface ChapterQuestProgress {
  questId: string;
  current: number;
  isComplete: boolean;
  rewardClaimed: boolean;
}
```

**Step 2: Commit**

```bash
cd fe-next && git add types/adventure.ts
git commit -m "feat(adventure): add FlashChallenge and ChapterQuest types"
```

---

### Task B2: Flash challenge config

**Files:**
- Create: `fe-next/lib/adventure/flashChallengeConfig.ts`
- Test: `fe-next/lib/adventure/__tests__/flashChallengeConfig.test.ts`

**Step 1: Write failing test**

```typescript
// fe-next/lib/adventure/__tests__/flashChallengeConfig.test.ts
import { getFlashChallengeForWorld, FLASH_CHALLENGES } from '../flashChallengeConfig';

describe('flashChallengeConfig', () => {
  it('returns a challenge for each world 1-10', () => {
    for (let w = 1; w <= 10; w++) {
      const challenges = getFlashChallengeForWorld(w);
      expect(challenges.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each challenge has required fields', () => {
    for (const c of FLASH_CHALLENGES) {
      expect(c.id).toBeTruthy();
      expect(c.durationSeconds).toBeGreaterThan(0);
      expect(c.rewardCoins).toBeGreaterThan(0);
      expect(c.descriptionKey).toMatch(/^adventure\.quests\.flash\./);
    }
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest flashChallengeConfig.test --no-coverage
```
Expected: FAIL — module not found

**Step 3: Create `fe-next/lib/adventure/flashChallengeConfig.ts`**

```typescript
import type { FlashChallenge } from '@/types/adventure';

export const FLASH_CHALLENGES: FlashChallenge[] = [
  {
    id: 'flash-long-word-6',
    type: 'longWord',
    descriptionKey: 'adventure.quests.flash.longWord',
    param: 6,
    durationSeconds: 30,
    rewardCoins: 50,
    rewardScore: 100,
  },
  {
    id: 'flash-combo-3',
    type: 'comboStreak',
    descriptionKey: 'adventure.quests.flash.comboStreak',
    param: 3,
    durationSeconds: 30,
    rewardCoins: 40,
    rewardScore: 80,
  },
  {
    id: 'flash-letter-q',
    type: 'specificLetter',
    descriptionKey: 'adventure.quests.flash.specificLetter',
    param: 'Q',
    durationSeconds: 30,
    rewardCoins: 60,
    rewardScore: 120,
  },
  {
    id: 'flash-fast-word',
    type: 'fastWord',
    descriptionKey: 'adventure.quests.flash.fastWord',
    param: 10,
    durationSeconds: 10,
    rewardCoins: 30,
    rewardScore: 60,
  },
  {
    id: 'flash-long-word-7',
    type: 'longWord',
    descriptionKey: 'adventure.quests.flash.longWord',
    param: 7,
    durationSeconds: 30,
    rewardCoins: 70,
    rewardScore: 150,
  },
];

/** Returns 1-2 challenges appropriate for a given world (harder in later worlds) */
export function getFlashChallengeForWorld(worldId: number): FlashChallenge[] {
  if (worldId <= 3) return [FLASH_CHALLENGES[0], FLASH_CHALLENGES[3]]; // easy worlds
  if (worldId <= 6) return [FLASH_CHALLENGES[1], FLASH_CHALLENGES[3]]; // mid worlds
  return [FLASH_CHALLENGES[4], FLASH_CHALLENGES[2]]; // late worlds
}
```

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest flashChallengeConfig.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add lib/adventure/flashChallengeConfig.ts lib/adventure/__tests__/flashChallengeConfig.test.ts
git commit -m "feat(adventure): add flash challenge config with world-appropriate selection"
```

---

### Task B3: `useFlashChallenge` hook

**Files:**
- Create: `fe-next/hooks/useFlashChallenge.ts`
- Test: `fe-next/hooks/__tests__/useFlashChallenge.test.ts`

**Step 1: Write failing test**

```typescript
// fe-next/hooks/__tests__/useFlashChallenge.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFlashChallenge } from '../useFlashChallenge';

jest.useFakeTimers();

describe('useFlashChallenge', () => {
  it('does not trigger before 30% of timer has elapsed', () => {
    const { result } = renderHook(() =>
      useFlashChallenge({ worldId: 1, totalTimeSeconds: 100, timeRemaining: 75, wordsFound: [], isPlaying: true })
    );
    expect(result.current.activeChallenge).toBeNull();
  });

  it('triggers a challenge when 30% time has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ timeRemaining }) =>
        useFlashChallenge({ worldId: 1, totalTimeSeconds: 100, timeRemaining, wordsFound: [], isPlaying: true }),
      { initialProps: { timeRemaining: 75 } }
    );
    rerender({ timeRemaining: 69 }); // 31% elapsed
    expect(result.current.activeChallenge).not.toBeNull();
  });

  it('marks complete when long word condition met', () => {
    const { result, rerender } = renderHook(
      ({ timeRemaining, wordsFound }) =>
        useFlashChallenge({ worldId: 1, totalTimeSeconds: 100, timeRemaining, wordsFound, isPlaying: true }),
      { initialProps: { timeRemaining: 69, wordsFound: [] } }
    );
    // Active challenge should now be set
    expect(result.current.activeChallenge).not.toBeNull();
    // Submit a 6-letter word
    rerender({ timeRemaining: 65, wordsFound: ['castle'] });
    expect(result.current.isComplete).toBe(true);
  });

  it('dismisses after durationSeconds', () => {
    const { result, rerender } = renderHook(
      ({ timeRemaining }) =>
        useFlashChallenge({ worldId: 1, totalTimeSeconds: 100, timeRemaining, wordsFound: [], isPlaying: true }),
      { initialProps: { timeRemaining: 69 } }
    );
    expect(result.current.activeChallenge).not.toBeNull();
    act(() => jest.advanceTimersByTime(31_000));
    rerender({ timeRemaining: 38 });
    expect(result.current.activeChallenge).toBeNull();
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest useFlashChallenge.test --no-coverage
```

**Step 3: Create `fe-next/hooks/useFlashChallenge.ts`**

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getFlashChallengeForWorld } from '@/lib/adventure/flashChallengeConfig';
import type { FlashChallenge } from '@/types/adventure';

interface UseFlashChallengeProps {
  worldId: number;
  totalTimeSeconds: number;
  timeRemaining: number;
  wordsFound: string[];
  isPlaying: boolean;
}

interface UseFlashChallengeReturn {
  activeChallenge: FlashChallenge | null;
  isComplete: boolean;
  /** Call this to dismiss the challenge (on timeout or completion) */
  dismiss: () => void;
}

/** Trigger threshold: challenge fires when this % of time has elapsed */
const TRIGGER_THRESHOLD = 0.30;

export function useFlashChallenge({
  worldId,
  totalTimeSeconds,
  timeRemaining,
  wordsFound,
  isPlaying,
}: UseFlashChallengeProps): UseFlashChallengeReturn {
  const [activeChallenge, setActiveChallenge] = useState<FlashChallenge | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const hasTriggeredRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setActiveChallenge(null);
    setIsComplete(false);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Trigger challenge at 30% elapsed
  useEffect(() => {
    if (!isPlaying || hasTriggeredRef.current) return;
    const elapsed = totalTimeSeconds - timeRemaining;
    const elapsedPct = elapsed / totalTimeSeconds;
    if (elapsedPct < TRIGGER_THRESHOLD) return;

    hasTriggeredRef.current = true;
    const candidates = getFlashChallengeForWorld(worldId);
    const challenge = candidates[Math.floor(Math.random() * candidates.length)];
    setActiveChallenge(challenge);

    // Auto-dismiss after durationSeconds
    dismissTimerRef.current = setTimeout(() => {
      dismiss();
    }, challenge.durationSeconds * 1000);
  }, [isPlaying, timeRemaining, totalTimeSeconds, worldId, dismiss]);

  // Check completion based on wordsFound
  useEffect(() => {
    if (!activeChallenge || isComplete) return;

    let met = false;
    if (activeChallenge.type === 'longWord') {
      met = wordsFound.some((w) => w.length >= (activeChallenge.param as number));
    } else if (activeChallenge.type === 'specificLetter') {
      const letter = (activeChallenge.param as string).toLowerCase();
      met = wordsFound.some((w) => w.toLowerCase().includes(letter));
    }

    if (met) {
      setIsComplete(true);
      // Keep visible for 2s after completion, then dismiss
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(dismiss, 2000);
    }
  }, [wordsFound, activeChallenge, isComplete, dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return { activeChallenge, isComplete, dismiss };
}
```

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest useFlashChallenge.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add hooks/useFlashChallenge.ts hooks/__tests__/useFlashChallenge.test.ts
git commit -m "feat(adventure): add useFlashChallenge hook with trigger, completion, and timeout logic"
```

---

### Task B4: FlashChallengeToast component

**Files:**
- Create: `fe-next/components/adventure/FlashChallengeToast.tsx`
- Test: `fe-next/components/adventure/__tests__/FlashChallengeToast.test.tsx`

**Step 1: Write failing test**

```tsx
// fe-next/components/adventure/__tests__/FlashChallengeToast.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashChallengeToast } from '../FlashChallengeToast';
import type { FlashChallenge } from '@/types/adventure';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) =>
      p ? `${k}:${JSON.stringify(p)}` : k,
    language: 'en',
  }),
}));

const challenge: FlashChallenge = {
  id: 'flash-long-word-6',
  type: 'longWord',
  descriptionKey: 'adventure.quests.flash.longWord',
  param: 6,
  durationSeconds: 30,
  rewardCoins: 50,
  rewardScore: 100,
};

describe('FlashChallengeToast', () => {
  it('renders when challenge is active', () => {
    render(<FlashChallengeToast challenge={challenge} isComplete={false} onDismiss={jest.fn()} />);
    expect(screen.getByTestId('flash-challenge-toast')).toBeInTheDocument();
    expect(screen.getByTestId('flash-reward-coins')).toHaveTextContent('50');
  });

  it('shows completion state', () => {
    render(<FlashChallengeToast challenge={challenge} isComplete={true} onDismiss={jest.fn()} />);
    expect(screen.getByTestId('flash-complete-badge')).toBeInTheDocument();
  });

  it('calls onDismiss when close button clicked', () => {
    const onDismiss = jest.fn();
    render(<FlashChallengeToast challenge={challenge} isComplete={false} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('flash-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest FlashChallengeToast.test --no-coverage
```

**Step 3: Create `fe-next/components/adventure/FlashChallengeToast.tsx`**

```tsx
'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, X, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FlashChallenge } from '@/types/adventure';

interface FlashChallengeToastProps {
  challenge: FlashChallenge;
  isComplete: boolean;
  onDismiss: () => void;
  className?: string;
}

export const FlashChallengeToast = memo(function FlashChallengeToast({
  challenge,
  isComplete,
  onDismiss,
  className,
}: FlashChallengeToastProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      data-testid="flash-challenge-toast"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
        'w-[min(340px,calc(100vw-2rem))]',
        'pointer-events-auto',
        className
      )}
    >
      <div className={cn(
        'rounded-neo border-3 shadow-hard',
        'p-3 flex items-center gap-3',
        isComplete
          ? 'bg-neo-lime/20 border-neo-lime'
          : 'bg-neo-navy/95 border-neo-yellow'
      )}>
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center',
          isComplete ? 'bg-neo-lime' : 'bg-neo-yellow'
        )}>
          {isComplete
            ? <CheckCircle className="w-5 h-5 text-neo-black" />
            : <Zap className="w-5 h-5 text-neo-black" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-bold uppercase tracking-wide', isComplete ? 'text-neo-lime' : 'text-neo-yellow')}>
            {isComplete ? t('adventure.quests.flash.complete') : t('adventure.quests.flash.title')}
          </p>
          <p className="text-sm font-neo-body text-neo-white leading-snug">
            {t(challenge.descriptionKey, { param: challenge.param })}
          </p>
          {/* Reward */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-neo-white/60">{t('adventure.quests.flash.reward')}</span>
            <div className="flex items-center gap-1" data-testid="flash-reward-coins">
              <Coins className="w-3 h-3 text-neo-yellow" />
              <span className="text-xs font-black text-neo-yellow">{challenge.rewardCoins}</span>
            </div>
          </div>
        </div>

        {/* Complete badge or dismiss */}
        {isComplete ? (
          <motion.div
            data-testid="flash-complete-badge"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="flex-shrink-0 px-2 py-1 bg-neo-lime rounded-neo border-2 border-neo-black"
          >
            <span className="text-xs font-black text-neo-black uppercase">
              {t('adventure.quests.flash.done')}
            </span>
          </motion.div>
        ) : (
          <button
            data-testid="flash-dismiss-btn"
            onClick={onDismiss}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-neo hover:bg-neo-white/10"
            aria-label={t('common.dismiss')}
          >
            <X className="w-4 h-4 text-neo-white/60" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default FlashChallengeToast;
```

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest FlashChallengeToast.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/FlashChallengeToast.tsx components/adventure/__tests__/FlashChallengeToast.test.tsx
git commit -m "feat(adventure): add FlashChallengeToast slide-up component"
```

---

### Task B5: Chapter quest config + hook

**Files:**
- Create: `fe-next/lib/adventure/questConfig.ts`
- Create: `fe-next/hooks/useChapterQuests.ts`
- Test: `fe-next/hooks/__tests__/useChapterQuests.test.ts`

**Step 1: Create `fe-next/lib/adventure/questConfig.ts`**

```typescript
import type { ChapterQuest } from '@/types/adventure';

/** 3 quests per chapter. Chapter = Math.ceil(level / 5). World 1 = chapters 1. */
export const CHAPTER_QUESTS: ChapterQuest[] = [
  // World 1, Chapter 1 (levels 1-5)
  {
    id: 'w1-c1-words',
    chapterNumber: 1, worldId: 1, type: 'wordCountChapter',
    titleKey: 'adventure.quests.chapter.wordCount.title',
    descriptionKey: 'adventure.quests.chapter.wordCount.desc',
    target: 40, reward: { coins: 100, xp: 50 },
  },
  {
    id: 'w1-c1-perfect',
    chapterNumber: 1, worldId: 1, type: 'perfectLevels',
    titleKey: 'adventure.quests.chapter.perfectLevels.title',
    descriptionKey: 'adventure.quests.chapter.perfectLevels.desc',
    target: 2, reward: { coins: 150, xp: 75, badge: 'perfectionist' },
  },
  {
    id: 'w1-c1-longwords',
    chapterNumber: 1, worldId: 1, type: 'longWordCount',
    titleKey: 'adventure.quests.chapter.longWords.title',
    descriptionKey: 'adventure.quests.chapter.longWords.desc',
    target: 5, reward: { coins: 80, xp: 40 },
  },
  // World 1, Chapter 2 (boss chapter — level 6-7)
  {
    id: 'w1-c2-boss-nohint',
    chapterNumber: 2, worldId: 1, type: 'defeatBossNoHint',
    titleKey: 'adventure.quests.chapter.bossNoHint.title',
    descriptionKey: 'adventure.quests.chapter.bossNoHint.desc',
    target: 1, reward: { coins: 200, xp: 100, badge: 'no-hints' },
  },
];

export function getQuestsForChapter(worldId: number, chapterNumber: number): ChapterQuest[] {
  return CHAPTER_QUESTS.filter(
    (q) => q.worldId === worldId && q.chapterNumber === chapterNumber
  );
}

export function getChapterNumber(levelNumber: number): number {
  return Math.ceil(levelNumber / 5);
}
```

**Step 2: Write failing test for `useChapterQuests`**

```typescript
// fe-next/hooks/__tests__/useChapterQuests.test.ts
import { renderHook, act } from '@testing-library/react';
import { useChapterQuests } from '../useChapterQuests';

describe('useChapterQuests', () => {
  it('returns quests for a given world and chapter', () => {
    const { result } = renderHook(() =>
      useChapterQuests({ worldId: 1, chapterNumber: 1 })
    );
    expect(result.current.quests.length).toBeGreaterThan(0);
  });

  it('records word count progress', () => {
    const { result } = renderHook(() =>
      useChapterQuests({ worldId: 1, chapterNumber: 1 })
    );
    act(() => { result.current.recordWordsFound(10); });
    const wordQuest = result.current.progress.find((p) => p.questId === 'w1-c1-words');
    expect(wordQuest?.current).toBe(10);
  });

  it('marks quest complete when target reached', () => {
    const { result } = renderHook(() =>
      useChapterQuests({ worldId: 1, chapterNumber: 1 })
    );
    act(() => { result.current.recordWordsFound(40); });
    const wordQuest = result.current.progress.find((p) => p.questId === 'w1-c1-words');
    expect(wordQuest?.isComplete).toBe(true);
  });
});
```

**Step 3: Run to verify it fails**

```bash
cd fe-next && npx jest useChapterQuests.test --no-coverage
```

**Step 4: Create `fe-next/hooks/useChapterQuests.ts`**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { getQuestsForChapter } from '@/lib/adventure/questConfig';
import type { ChapterQuest, ChapterQuestProgress } from '@/types/adventure';

interface UseChapterQuestsProps {
  worldId: number;
  chapterNumber: number;
}

interface UseChapterQuestsReturn {
  quests: ChapterQuest[];
  progress: ChapterQuestProgress[];
  recordWordsFound: (count: number) => void;
  recordLevelPerfect: () => void;
  recordBossDefeatedNoHint: () => void;
  recordLongWord: () => void;
}

export function useChapterQuests({ worldId, chapterNumber }: UseChapterQuestsProps): UseChapterQuestsReturn {
  const quests = getQuestsForChapter(worldId, chapterNumber);

  const [progress, setProgress] = useState<ChapterQuestProgress[]>(() =>
    quests.map((q) => ({ questId: q.id, current: 0, isComplete: false, rewardClaimed: false }))
  );

  const updateProgress = useCallback((questId: string, delta: number) => {
    setProgress((prev) =>
      prev.map((p) => {
        if (p.questId !== questId) return p;
        const quest = quests.find((q) => q.id === questId);
        if (!quest || p.isComplete) return p;
        const next = Math.min(p.current + delta, quest.target);
        return { ...p, current: next, isComplete: next >= quest.target };
      })
    );
  }, [quests]);

  const recordWordsFound = useCallback((count: number) => {
    const q = quests.find((q) => q.type === 'wordCountChapter');
    if (q) updateProgress(q.id, count);
  }, [quests, updateProgress]);

  const recordLevelPerfect = useCallback(() => {
    const q = quests.find((q) => q.type === 'perfectLevels');
    if (q) updateProgress(q.id, 1);
  }, [quests, updateProgress]);

  const recordBossDefeatedNoHint = useCallback(() => {
    const q = quests.find((q) => q.type === 'defeatBossNoHint');
    if (q) updateProgress(q.id, 1);
  }, [quests, updateProgress]);

  const recordLongWord = useCallback(() => {
    const q = quests.find((q) => q.type === 'longWordCount');
    if (q) updateProgress(q.id, 1);
  }, [quests, updateProgress]);

  return { quests, progress, recordWordsFound, recordLevelPerfect, recordBossDefeatedNoHint, recordLongWord };
}
```

**Step 5: Run to verify it passes**

```bash
cd fe-next && npx jest useChapterQuests.test --no-coverage
```

**Step 6: Commit**

```bash
cd fe-next && git add lib/adventure/questConfig.ts hooks/useChapterQuests.ts hooks/__tests__/useChapterQuests.test.ts
git commit -m "feat(adventure): add chapter quest config and useChapterQuests hook"
```

---

### Task B6: ChapterQuestPanel component

**Files:**
- Create: `fe-next/components/adventure/quests/ChapterQuestPanel.tsx`
- Test: `fe-next/components/adventure/quests/__tests__/ChapterQuestPanel.test.tsx`

**Step 1: Write failing test**

```tsx
// fe-next/components/adventure/quests/__tests__/ChapterQuestPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { ChapterQuestPanel } from '../ChapterQuestPanel';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('ChapterQuestPanel', () => {
  const quests = [
    { id: 'w1-c1-words', chapterNumber: 1, worldId: 1, type: 'wordCountChapter' as const,
      titleKey: 'adventure.quests.chapter.wordCount.title',
      descriptionKey: 'adventure.quests.chapter.wordCount.desc',
      target: 40, reward: { coins: 100, xp: 50 } },
  ];
  const progress = [{ questId: 'w1-c1-words', current: 15, isComplete: false, rewardClaimed: false }];

  it('renders quest panel with title', () => {
    render(<ChapterQuestPanel quests={quests} progress={progress} />);
    expect(screen.getByTestId('chapter-quest-panel')).toBeInTheDocument();
    expect(screen.getByTestId('quest-w1-c1-words')).toBeInTheDocument();
  });

  it('shows progress fraction', () => {
    render(<ChapterQuestPanel quests={quests} progress={progress} />);
    expect(screen.getByText('15/40')).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest ChapterQuestPanel.test --no-coverage
```

**Step 3: Create `fe-next/components/adventure/quests/ChapterQuestPanel.tsx`**

```tsx
'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Scroll, Coins, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChapterQuest, ChapterQuestProgress } from '@/types/adventure';

interface ChapterQuestPanelProps {
  quests: ChapterQuest[];
  progress: ChapterQuestProgress[];
  className?: string;
}

export const ChapterQuestPanel = memo(function ChapterQuestPanel({
  quests,
  progress,
  className,
}: ChapterQuestPanelProps) {
  const { t } = useLanguage();

  const getProgress = (questId: string) =>
    progress.find((p) => p.questId === questId) ?? { questId, current: 0, isComplete: false, rewardClaimed: false };

  return (
    <div
      data-testid="chapter-quest-panel"
      className={cn(
        'rounded-neo border-3 border-neo-black shadow-hard',
        'bg-neo-navy/90 backdrop-blur-sm',
        'p-3',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-neo bg-neo-purple/20 border-2 border-neo-purple/40 flex items-center justify-center">
          <Scroll className="w-4 h-4 text-neo-purple" />
        </div>
        <h3 className="text-sm font-black text-neo-white uppercase tracking-wide">
          {t('adventure.quests.chapter.title')}
        </h3>
      </div>

      {/* Quest list */}
      <div className="flex flex-col gap-2">
        {quests.map((quest, i) => {
          const p = getProgress(quest.id);
          const pct = Math.min((p.current / quest.target) * 100, 100);

          return (
            <motion.div
              key={quest.id}
              data-testid={`quest-${quest.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'flex items-center gap-2 p-2 rounded-neo border-2',
                p.isComplete
                  ? 'bg-neo-lime/10 border-neo-lime/60'
                  : 'bg-neo-black/30 border-neo-white/10'
              )}
            >
              {/* Status dot */}
              <div className={cn(
                'flex-shrink-0 w-5 h-5 rounded-full border-2 border-neo-black flex items-center justify-center',
                p.isComplete ? 'bg-neo-lime' : 'bg-neo-black/40'
              )}>
                {p.isComplete && <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-bold truncate', p.isComplete ? 'text-neo-lime' : 'text-neo-white')}>
                  {t(quest.titleKey)}
                </p>
                {/* Progress bar + fraction */}
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-neo-black/50 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', p.isComplete ? 'bg-neo-lime' : 'bg-neo-purple')}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <span className={cn('text-[10px] font-mono font-black tabular-nums flex-shrink-0', p.isComplete ? 'text-neo-lime' : 'text-neo-white/70')}>
                    {p.current}/{quest.target}
                  </span>
                </div>
              </div>

              {/* Reward */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <Coins className="w-3 h-3 text-neo-yellow" />
                <span className="text-[10px] font-black text-neo-yellow">{quest.reward.coins}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export default ChapterQuestPanel;
```

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest ChapterQuestPanel.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/quests/ChapterQuestPanel.tsx components/adventure/quests/__tests__/ChapterQuestPanel.test.tsx
git commit -m "feat(adventure): add ChapterQuestPanel component for level select screen"
```

---

### Task B7: Add translations for quest strings

**Files:**
- Modify: `fe-next/translations/en.js`
- Modify: `fe-next/translations/he.js`
- Modify: `fe-next/translations/sv.js`
- Modify: `fe-next/translations/ja.js`

**Step 1: Add to `translations/en.js`** inside the `adventure` section:

```js
quests: {
  flash: {
    title: 'Flash Challenge!',
    complete: 'Challenge Complete!',
    reward: 'Reward:',
    done: 'Done!',
    longWord: 'Find a {param}+ letter word',
    comboStreak: 'Build a {param}-word combo streak',
    specificLetter: 'Use the letter {param} in a word',
    fastWord: 'Find any word in {param} seconds',
  },
  chapter: {
    title: 'Chapter Quests',
    wordCount: {
      title: 'Word Hunter',
      desc: 'Find {target} words in this chapter',
    },
    perfectLevels: {
      title: 'Perfectionist',
      desc: 'Complete {target} levels with 3 stars',
    },
    longWords: {
      title: 'Wordsmith',
      desc: 'Find {target} words with 6+ letters',
    },
    bossNoHint: {
      title: 'No Mercy',
      desc: 'Defeat the boss without using hints',
    },
  },
},
```

**Step 2: Add equivalent entries to `he.js`, `sv.js`, `ja.js`**

For Hebrew (`he.js`):
```js
quests: {
  flash: {
    title: 'אתגר מהיר!',
    complete: 'האתגר הושלם!',
    reward: 'פרס:',
    done: 'הסתיים!',
    longWord: 'מצא מילה עם {param}+ אותיות',
    comboStreak: 'בנה קומבו של {param} מילים',
    specificLetter: 'השתמש באות {param} במילה',
    fastWord: 'מצא מילה תוך {param} שניות',
  },
  chapter: {
    title: 'משימות פרק',
    wordCount: { title: 'צייד מילים', desc: 'מצא {target} מילים בפרק זה' },
    perfectLevels: { title: 'פרפקציוניסט', desc: 'השלם {target} שלבים עם 3 כוכבים' },
    longWords: { title: 'מילוני', desc: 'מצא {target} מילים עם 6+ אותיות' },
    bossNoHint: { title: 'ללא רחמים', desc: 'נצח את הבוס ללא שימוש ברמזים' },
  },
},
```

For Swedish (`sv.js`):
```js
quests: {
  flash: {
    title: 'Blixutmaning!',
    complete: 'Utmaning klar!',
    reward: 'Belöning:',
    done: 'Klar!',
    longWord: 'Hitta ett ord med {param}+ bokstäver',
    comboStreak: 'Bygg en {param}-ords kombostreak',
    specificLetter: 'Använd bokstaven {param} i ett ord',
    fastWord: 'Hitta vilket ord som helst på {param} sekunder',
  },
  chapter: {
    title: 'Kapiteluppdrag',
    wordCount: { title: 'Ordjägare', desc: 'Hitta {target} ord i det här kapitlet' },
    perfectLevels: { title: 'Perfektionist', desc: 'Slutför {target} nivåer med 3 stjärnor' },
    longWords: { title: 'Ordkonstnär', desc: 'Hitta {target} ord med 6+ bokstäver' },
    bossNoHint: { title: 'Ingen nåd', desc: 'Besegra bossen utan ledtrådar' },
  },
},
```

For Japanese (`ja.js`):
```js
quests: {
  flash: {
    title: 'フラッシュチャレンジ！',
    complete: 'チャレンジ完了！',
    reward: '報酬：',
    done: '完了！',
    longWord: '{param}文字以上の単語を見つけよう',
    comboStreak: '{param}語のコンボを作ろう',
    specificLetter: '{param}を含む単語を使おう',
    fastWord: '{param}秒以内に単語を見つけよう',
  },
  chapter: {
    title: 'チャプタークエスト',
    wordCount: { title: 'ワードハンター', desc: 'このチャプターで{target}語見つけよう' },
    perfectLevels: { title: 'パーフェクトプレイヤー', desc: '{target}ステージを3スターでクリア' },
    longWords: { title: '言語の達人', desc: '6文字以上の単語を{target}語見つけよう' },
    bossNoHint: { title: '容赦なし', desc: 'ヒントなしでボスを倒そう' },
  },
},
```

**Step 3: Commit**

```bash
cd fe-next && git add translations/en.js translations/he.js translations/sv.js translations/ja.js
git commit -m "feat(i18n): add quest translations for all 4 languages"
```

---

## TRACK C — Game Designer: Boss HP, Dialogue & Battle Feel

> **Context:** `BossHPBar.tsx` is a simple animated bar. `BossDialogue.tsx` is fixed-positioned at `top-28` and can overlap. We need segmented HP, hit reactions, bigger dialogue, and typewriter text.

---

### Task C1: Segmented HP bar with hit reactions

**Files:**
- Modify: `fe-next/components/adventure/BossHPBar.tsx`
- Test: `fe-next/components/adventure/__tests__/BossHPBar.test.tsx`

**Step 1: Write failing test**

```tsx
// fe-next/components/adventure/__tests__/BossHPBar.test.tsx
import { render, screen } from '@testing-library/react';
import BossHPBar from '../BossHPBar';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const healthState = {
  currentHP: 75,
  maxHP: 100,
  phase: 'normal' as const,
  isActive: true,
};

describe('BossHPBar', () => {
  it('renders 4 segment dividers', () => {
    render(<BossHPBar healthState={healthState} bossName="boss.name" />);
    const segments = screen.getAllByTestId(/^hp-segment-/);
    expect(segments).toHaveLength(4);
  });

  it('shows damage number when lastDamage is set', () => {
    render(<BossHPBar healthState={healthState} bossName="boss.name" lastDamage={24} />);
    expect(screen.getByTestId('damage-number')).toHaveTextContent('-24');
  });

  it('shows ENRAGED badge at ≤25% HP', () => {
    render(<BossHPBar healthState={{ ...healthState, currentHP: 20, phase: 'enraged' }} bossName="boss.name" />);
    expect(screen.getByText('adventure.bosses.enraged')).toBeInTheDocument();
  });

  it('returns null when not active', () => {
    const { container } = render(<BossHPBar healthState={{ ...healthState, isActive: false }} bossName="boss.name" />);
    expect(container.firstChild).toBeNull();
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest BossHPBar.test --no-coverage
```
Expected: FAIL — `getAllByTestId(/^hp-segment-/)` finds 0 elements

**Step 3: Rewrite `BossHPBar.tsx`**

Replace the entire file content with:

```tsx
/**
 * BossHPBar Component
 *
 * Segmented boss health bar with hit reactions, damage numbers, and enrage effects.
 * 4 segments (each = 25% HP), spring-animated fill, white flash on damage.
 */

'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { BossHealthState } from '../../types/boss';

// ==============================================
// TYPES
// ==============================================

interface BossHPBarProps {
  healthState: BossHealthState;
  bossName: string;
  /** Damage dealt in the last hit — triggers flash + float number */
  lastDamage?: number;
}

// ==============================================
// CONSTANTS
// ==============================================

const SEGMENT_COUNT = 4;
const SEGMENT_WIDTH = 100 / SEGMENT_COUNT; // 25% each

// ==============================================
// COMPONENT
// ==============================================

const BossHPBar = memo(function BossHPBar({ healthState, bossName, lastDamage }: BossHPBarProps) {
  const { t } = useLanguage();
  const [isFlashing, setIsFlashing] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const prevDamageRef = useRef<number | undefined>(undefined);

  // Trigger flash + shake on each new damage hit
  useEffect(() => {
    if (lastDamage !== undefined && lastDamage !== prevDamageRef.current) {
      prevDamageRef.current = lastDamage;
      if (lastDamage > 0) {
        setIsFlashing(true);
        setShakeKey((k) => k + 1);
        setTimeout(() => setIsFlashing(false), 150);
      }
    }
  }, [lastDamage]);

  if (!healthState.isActive) return null;

  const { currentHP, maxHP, phase } = healthState;
  const hpPct = Math.max(0, Math.min((currentHP / maxHP) * 100, 100));
  const isEnraged = phase === 'enraged';
  const barColor = isEnraged ? 'bg-neo-red' : 'bg-lime-500';

  return (
    <div
      className="w-full max-w-2xl mx-auto px-4 py-2"
      role="status"
      aria-label={`${t(bossName)} health: ${Math.round(hpPct)}%`}
      aria-live="polite"
    >
      {/* Boss name row */}
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="font-neo-display text-base font-bold text-neo-white">
          {t(bossName)}
        </h2>
        <AnimatePresence>
          {isEnraged && (
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="px-2 py-0.5 bg-neo-red border-2 border-neo-black rounded-neo shadow-hard-sm"
            >
              <span className="font-neo-display text-xs font-bold text-neo-white uppercase">
                {t('adventure.bosses.enraged')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HP Bar container with shake animation on hit */}
      <motion.div
        key={shakeKey}
        animate={shakeKey > 0
          ? { x: [0, -6, 6, -4, 4, 0] }
          : { x: 0 }
        }
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        {/* Outer track */}
        <div
          className="relative w-full h-7 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard overflow-hidden"
          aria-hidden="true"
        >
          {/* HP fill */}
          <motion.div
            className={`absolute inset-y-0 left-0 ${barColor} transition-colors duration-300 ${isEnraged ? 'animate-pulse' : ''}`}
            animate={{ width: `${hpPct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          />

          {/* White flash overlay on hit */}
          <AnimatePresence>
            {isFlashing && (
              <motion.div
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Segment dividers */}
          {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
            <div
              key={i}
              data-testid={`hp-segment-${i}`}
              className="absolute top-0 bottom-0 w-0.5 bg-neo-black/50 z-10"
              style={{ left: `${(i + 1) * SEGMENT_WIDTH}%` }}
            />
          ))}

          {/* HP text */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span className="font-neo-display text-xs font-bold text-neo-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {currentHP} / {maxHP}
            </span>
          </div>
        </div>

        {/* Floating damage number */}
        <AnimatePresence>
          {lastDamage !== undefined && lastDamage > 0 && (
            <motion.div
              key={lastDamage}
              data-testid="damage-number"
              initial={{ opacity: 1, y: 0, x: '-50%' }}
              animate={{ opacity: 0, y: -32 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute top-0 left-1/2 font-neo-display font-black text-neo-red text-lg pointer-events-none z-30"
              style={{ transform: 'translateX(-50%)' }}
            >
              -{lastDamage}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

BossHPBar.displayName = 'BossHPBar';
export default BossHPBar;
```

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest BossHPBar.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/BossHPBar.tsx components/adventure/__tests__/BossHPBar.test.tsx
git commit -m "feat(adventure): redesign BossHPBar with segments, hit reactions, and floating damage numbers"
```

---

### Task C2: BossDialogue overhaul — reposition, bigger, typewriter

**Files:**
- Modify: `fe-next/components/adventure/BossDialogue.tsx`
- Test: `fe-next/components/adventure/__tests__/BossDialogue.test.tsx`

**Step 1: Write failing test**

```tsx
// fe-next/components/adventure/__tests__/BossDialogue.test.tsx
import { render, screen, act } from '@testing-library/react';
import BossDialogue from '../BossDialogue';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
jest.useFakeTimers();

const boss = {
  id: 'msGrammar',
  displayName: 'adventure.bosses.msGrammar.name',
  imagePath: '/images/bosses/boss-ms-grammar.webp',
};

describe('BossDialogue', () => {
  it('renders speech bubble when visible', () => {
    render(<BossDialogue boss={boss} currentTaunt="Hello!" isVisible={true} />);
    expect(screen.getByTestId('boss-speech-bubble')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<BossDialogue boss={boss} currentTaunt="Hello!" isVisible={false} />);
    expect(screen.queryByTestId('boss-speech-bubble')).not.toBeInTheDocument();
  });

  it('uses a 48px avatar (larger than original 32px)', () => {
    render(<BossDialogue boss={boss} currentTaunt="Hello!" isVisible={true} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '48');
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest BossDialogue.test --no-coverage
```
Expected: FAIL — avatar width is 32, not 48

**Step 3: Update `BossDialogue.tsx`**

Key changes from the existing file:
1. `AVATAR_SIZE`: 32 → 48
2. Remove `fixed` positioning — dialogue is now `relative` (rendered inside a container below the HP bar)
3. `max-w-xs` → `max-w-sm`
4. Add typewriter effect for text
5. Make bubble have a speech-tail pointing up

Replace the file with:

```tsx
/**
 * BossDialogue Component
 *
 * Boss speech bubble rendered inline below BossHPBar.
 * Typewriter text effect, 48px avatar, larger bubble.
 */

'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BossDialogueProps } from '@/types/boss';

const AVATAR_SIZE = 48;
const CHAR_DELAY_MS = 45;

const BossDialogue = memo<BossDialogueProps>(
  ({ boss, currentTaunt, isVisible }) => {
    const { t } = useLanguage();
    const translatedTaunt = t(currentTaunt) || currentTaunt;
    const translatedName = t(boss.displayName) || boss.displayName;

    // Typewriter effect
    const [displayed, setDisplayed] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      if (!isVisible) { setDisplayed(''); return; }
      setDisplayed('');
      let i = 0;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        i++;
        setDisplayed(translatedTaunt.slice(0, i));
        if (i >= translatedTaunt.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, CHAR_DELAY_MS);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [translatedTaunt, isVisible]);

    return (
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key="boss-dialogue"
            data-testid="boss-dialogue"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className="w-full px-4 pb-2"
          >
            {/* Speech bubble */}
            <div
              data-testid="boss-speech-bubble"
              className={cn(
                'relative bg-neo-navy/95 border-neo border-neo-white/30',
                'rounded-neo shadow-hard',
                'p-3 flex items-start gap-3',
                'max-w-sm mx-auto'
              )}
            >
              {/* Speech bubble tail pointing up */}
              <div className="absolute -top-2 left-6 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-neo-white/30" />
              <div className="absolute -top-1.5 left-6 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-neo-navy" />

              {/* Boss avatar */}
              <Image
                src={boss.imagePath}
                alt={translatedName}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                className="rounded-full border-2 border-neo-yellow flex-shrink-0 object-cover ring-2 ring-neo-yellow/30"
              />

              {/* Name + typewriter text */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-neo-yellow uppercase tracking-wide truncate">
                  {translatedName}
                </span>
                <p className="text-base font-neo-body text-neo-white leading-snug min-h-[1.5rem]">
                  {displayed}
                  {/* Blinking cursor while typing */}
                  {displayed.length < translatedTaunt.length && (
                    <span className="inline-block w-0.5 h-4 bg-neo-white/70 ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

BossDialogue.displayName = 'BossDialogue';
export default BossDialogue;
```

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest BossDialogue.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/BossDialogue.tsx components/adventure/__tests__/BossDialogue.test.tsx
git commit -m "feat(adventure): redesign BossDialogue with typewriter effect, 48px avatar, inline positioning"
```

---

### Task C3: Wire boss hit reactions to AdventureEffectsLayer

**Files:**
- Modify: `fe-next/components/adventure/effects/AdventureEffectsLayer.tsx`
- Test: `fe-next/components/adventure/effects/__tests__/AdventureEffectsLayer.test.tsx` (update existing)

**Step 1: Find the `AdventureEffectsLayer.tsx` file and read its props interface**

```bash
head -80 fe-next/components/adventure/effects/AdventureEffectsLayer.tsx
```

**Step 2: Add `showEdgeVignetteFlash` prop** to `AdventureEffectsLayerProps` interface:

```typescript
/** Whether to show a brief red edge vignette flash (boss counter) */
showEdgeVignetteFlash?: boolean;
```

**Step 3: Add the vignette flash effect inside the component** (after the existing effects, before the final closing tag):

```tsx
{/* Edge vignette flash — boss counter effect */}
<AnimatePresence>
  {showEdgeVignetteFlash && (
    <motion.div
      data-testid="edge-vignette-flash"
      key="vignette-flash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 pointer-events-none z-30"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.35) 100%)',
      }}
    />
  )}
</AnimatePresence>
```

**Step 4: Write test**

```tsx
// Check existing test file path, then add:
it('renders edge vignette flash when showEdgeVignetteFlash is true', () => {
  render(<AdventureEffectsLayer {...baseProps} showEdgeVignetteFlash={true} />);
  expect(screen.getByTestId('edge-vignette-flash')).toBeInTheDocument();
});
```

**Step 5: Run lint + test**

```bash
cd fe-next && npm run lint -- --fix && npx jest AdventureEffectsLayer --no-coverage
```

**Step 6: Commit**

```bash
cd fe-next && git add components/adventure/effects/AdventureEffectsLayer.tsx
git commit -m "feat(adventure): add edge vignette flash to AdventureEffectsLayer for boss counters"
```

---

## TRACK D — Animator: Remotion Mobile Cinematics

> **Context:** `CinematicPlayer` renders at `100vw/100vh`. On portrait mobile, the 1280×720 landscape composition gets letterboxed incorrectly. Shared Remotion primitives use hardcoded font sizes.

---

### Task D1: Fix CinematicPlayer aspect-ratio scaling for portrait mobile

**Files:**
- Modify: `fe-next/components/adventure/boss/cinematics/CinematicPlayer.tsx`
- Test: `fe-next/components/adventure/boss/cinematics/__tests__/CinematicPlayer.test.tsx`

**Step 1: Write failing test**

```tsx
// fe-next/components/adventure/boss/cinematics/__tests__/CinematicPlayer.test.tsx
// (Add to existing test file or create new)
import { render, screen } from '@testing-library/react';
import { CinematicPlayer } from '../CinematicPlayer';

jest.mock('@remotion/player', () => ({
  Player: ({ style }: { style: React.CSSProperties }) => (
    <div data-testid="remotion-player" style={style} />
  ),
}));
jest.mock('@/hooks/useCinematic', () => ({
  useCinematic: () => ({ canSkip: false, progress: 0, skip: jest.fn(), handleFrameUpdate: jest.fn() }),
  SKIP_DELAY_MS: 2000,
  DEFAULT_FPS: 30,
  secondsToFrames: (s: number) => s * 30,
}));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => false }));

describe('CinematicPlayer portrait mobile', () => {
  beforeEach(() => {
    // Simulate portrait mobile: 390×844
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
  });

  it('renders player with width constrained to viewport width on portrait', () => {
    render(
      <CinematicPlayer
        composition={() => <div />}
        durationSeconds={5}
        onComplete={jest.fn()}
      />
    );
    const player = screen.getByTestId('remotion-player');
    // Width should be 390 (100vw), height should be 390*(720/1280) = ~219
    const style = player.style;
    expect(parseInt(style.width as string)).toBe(390);
    expect(parseInt(style.height as string)).toBeLessThan(300); // significantly less than 844
  });
});
```

**Step 2: Run to verify it fails**

```bash
cd fe-next && npx jest CinematicPlayer.test --no-coverage
```
Expected: FAIL — height is 844, not ~219

**Step 3: Update `CinematicPlayer.tsx`**

Replace the Player style section (around line 228-244) with:

```tsx
// Calculate responsive dimensions for portrait mobile
const isPortraitMobile =
  typeof window !== 'undefined' &&
  window.innerWidth < window.innerHeight &&
  window.innerWidth < 768;

const playerWidth = typeof window !== 'undefined' ? window.innerWidth : width;
const playerHeight = isPortraitMobile
  ? Math.round(playerWidth * (720 / 1280))  // maintain 16:9
  : typeof window !== 'undefined' ? window.innerHeight : height;

// ...

// Replace the style prop on <Player>:
style={
  fullscreen
    ? {
        width: playerWidth,
        height: playerHeight,
        maxWidth: '100%',
        maxHeight: '100%',
      }
    : { width, height, maxWidth: '100%', maxHeight: '100%' }
}
```

Also wrap the fullscreen container:
```tsx
// Replace: 'fixed inset-0 z-50 bg-black flex items-center justify-center'
// With: a flex container that always centers
const containerClasses = fullscreen
  ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
  : 'relative';
```

This is already correct — the container centers the video with `items-center justify-center` and `bg-black` provides the black bars above/below on portrait.

**Step 4: Run to verify it passes**

```bash
cd fe-next && npx jest CinematicPlayer.test --no-coverage
```

**Step 5: Commit**

```bash
cd fe-next && git add components/adventure/boss/cinematics/CinematicPlayer.tsx
git commit -m "fix(cinematics): letterbox Remotion player on portrait mobile to maintain 16:9 aspect ratio"
```

---

### Task D2: Responsive font sizes in TitleReveal and shared primitives

**Files:**
- Modify: `fe-next/lib/remotion/primitives/TitleReveal.tsx`
- Modify: `fe-next/lib/remotion/primitives/ParticleLayer.tsx`
- Modify: `fe-next/lib/remotion/primitives/SparkleField.tsx`

**Step 1: Read `TitleReveal.tsx`**

```bash
cat fe-next/lib/remotion/primitives/TitleReveal.tsx
```

**Step 2: In `TitleReveal.tsx`**, add `useVideoConfig` import and replace hardcoded font sizes:

```tsx
import { useVideoConfig } from 'remotion';

// Inside component:
const { width } = useVideoConfig();
// Replace any hardcoded fontSize numbers with:
// titleSize = width * 0.07  (7% of composition width)
// subtitleSize = width * 0.04
```

**Step 3: In `ParticleLayer.tsx`**, scale particle count by composition width:

```tsx
import { useVideoConfig } from 'remotion';

const { width } = useVideoConfig();
// Adjust COUNT if it's hardcoded:
const effectiveCount = Math.round(count * Math.min(1, width / 1280));
```

**Step 4: In `SparkleField.tsx`**, same treatment as ParticleLayer.

**Step 5: Run lint + tests**

```bash
cd fe-next && npm run lint -- --fix
cd fe-next && npx jest --testPathPattern="(TitleReveal|ParticleLayer|SparkleField)" --no-coverage
```

**Step 6: Commit**

```bash
cd fe-next && git add lib/remotion/primitives/TitleReveal.tsx lib/remotion/primitives/ParticleLayer.tsx lib/remotion/primitives/SparkleField.tsx
git commit -m "fix(cinematics): scale remotion primitive font sizes and particle counts relative to composition width"
```

---

### Task D3: Safe area inset for skip button

**Files:**
- Modify: `fe-next/components/adventure/boss/cinematics/CinematicPlayer.tsx`

**Step 1: Update skip button div** (around line 290):

```tsx
// BEFORE:
<motion.div className="absolute bottom-8 right-8">

// AFTER:
<motion.div
  className="absolute right-4"
  style={{ bottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
>
```

**Step 2: Run lint + build**

```bash
cd fe-next && npm run lint -- --fix && npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
cd fe-next && git add components/adventure/boss/cinematics/CinematicPlayer.tsx
git commit -m "fix(cinematics): add safe-area-inset-bottom to skip button for notched devices"
```

---

## TRACK E — Integration: Wire Everything into AdventureGame

> **Run after all tracks A–D are merged.** This track wires the new hooks and components into `AdventureGame.tsx` and `LevelGrid.tsx`.

---

### Task E1: Wire FlashChallenge into AdventureGame

**Files:**
- Modify: `fe-next/components/adventure/AdventureGame.tsx`

**Step 1: Add import**

```tsx
import { useFlashChallenge } from '@/hooks/useFlashChallenge';
import { FlashChallengeToast } from './FlashChallengeToast';
import { AnimatePresence } from 'framer-motion';
```

**Step 2: Add hook after `useAdventureHints`**

```tsx
const {
  activeChallenge,
  isComplete: isChallengeComplete,
  dismiss: dismissChallenge,
} = useFlashChallenge({
  worldId: levelConfig.world,
  totalTimeSeconds: adjustedLevelConfig.timerSeconds,
  timeRemaining,
  wordsFound: gameState.wordsFound,
  isPlaying: isPlaying && entryPhase === 'playing' && !isPaused,
});
```

**Step 3: Add `FlashChallengeToast` inside overlays** (before the closing `</>` in `overlays={}`)

```tsx
{/* Flash Challenge Toast */}
<AnimatePresence>
  {activeChallenge && !showLevelComplete && (
    <FlashChallengeToast
      challenge={activeChallenge}
      isComplete={isChallengeComplete}
      onDismiss={dismissChallenge}
    />
  )}
</AnimatePresence>
```

**Step 4: Pass `lastDamage` to `BossHPBar` via `BossOverlay`**

Find where `dealBossDamage` is called in `handleWordSubmit`. Capture the returned damage in state:

```tsx
const [lastBossDamage, setLastBossDamage] = useState<number | undefined>(undefined);

// In handleWordSubmit, after dealBossDamage call:
const damage = dealBossDamage(baseDamage, gameState.comboCount, mechanicMultiplier, skillEffects.comboMultiplierBonus);
setLastBossDamage(damage);
// Clear after 1s so float animation can replay
setTimeout(() => setLastBossDamage(undefined), 1000);
```

Then pass `lastBossDamage` to `BossOverlay` (which passes it to `BossHPBar`).

**Step 5: Wire edge vignette flash for bad words**

Add `showEdgeVignetteFlash` state:

```tsx
const [showEdgeVignetteFlash, setShowEdgeVignetteFlash] = useState(false);
```

In `handleWordSubmit` where bad words are handled (around `triggerBossTaunt('onBadWord')`):

```tsx
if (isBossActive) {
  triggerBossTaunt('onBadWord');
  setShowEdgeVignetteFlash(true);
  setTimeout(() => setShowEdgeVignetteFlash(false), 350);
}
```

Pass to `AdventureEffectsLayer`:

```tsx
<AdventureEffectsLayer
  ...
  showEdgeVignetteFlash={showEdgeVignetteFlash}
/>
```

**Step 6: Run full test suite + lint + build**

```bash
cd fe-next && npm run lint && npm run test && npm run build
```

Fix any failures before committing.

**Step 7: Commit**

```bash
cd fe-next && git add components/adventure/AdventureGame.tsx
git commit -m "feat(adventure): integrate FlashChallengeToast, boss damage numbers, and edge vignette flash"
```

---

### Task E2: Wire ChapterQuestPanel into LevelGrid

**Files:**
- Modify: `fe-next/components/adventure/LevelGrid.tsx`

**Step 1: Read `LevelGrid.tsx`** to understand its current structure:

```bash
head -60 fe-next/components/adventure/LevelGrid.tsx
```

**Step 2: Add imports**

```tsx
import { ChapterQuestPanel } from './quests/ChapterQuestPanel';
import { useChapterQuests } from '@/hooks/useChapterQuests';
import { getChapterNumber } from '@/lib/adventure/questConfig';
```

**Step 3: Add hook** (pass the current world + chapter from props or derive from selected level):

```tsx
const currentChapter = getChapterNumber(selectedLevel ?? 1);
const { quests, progress } = useChapterQuests({
  worldId: currentWorld,
  chapterNumber: currentChapter,
});
```

**Step 4: Render `ChapterQuestPanel`** above or below the level grid cards:

```tsx
{quests.length > 0 && (
  <div className="mt-4">
    <ChapterQuestPanel quests={quests} progress={progress} />
  </div>
)}
```

**Step 5: Run lint + test + build**

```bash
cd fe-next && npm run lint && npm run test && npm run build
```

**Step 6: Commit**

```bash
cd fe-next && git add components/adventure/LevelGrid.tsx
git commit -m "feat(adventure): add ChapterQuestPanel to level select screen"
```

---

### Task E3: Final smoke test + RTL check

**Step 1: Start dev server**

```bash
cd fe-next && npm run dev
```

**Step 2: Manual checks — visit `http://localhost:3000/en/adventure`**

- [ ] Level select shows chapter quest panel with progress bars
- [ ] Enter a non-boss level — bottom bar shows objective chips horizontally
- [ ] Objective chips show progress fraction and fill on word find
- [ ] At ~30% time elapsed, flash challenge toast slides up from bottom
- [ ] Flash challenge completes when condition met → shows "Done!" badge
- [ ] Enter boss level — HP bar has 4 visible segment dividers
- [ ] Find valid word → HP bar shakes + damage number floats up
- [ ] Boss dialogue renders below HP bar, not overlapping
- [ ] Boss dialogue text types in character by character
- [ ] Wrong word → red edge vignette flash on screen edges
- [ ] Trigger boss defeat cinematic → video centered with black bars on portrait mobile (use Chrome DevTools mobile emulation)

**Step 3: RTL check — `http://localhost:3000/he/adventure`**

- [ ] Objective chips render correctly in RTL
- [ ] FlashChallengeToast text is right-aligned
- [ ] Boss dialogue name and text render RTL

**Step 4: Final commit**

```bash
cd fe-next && git add -A
git commit -m "chore(adventure): final integration smoke test complete"
```

---

## Execution Summary

| Track | Domain | Tasks | Can run in parallel |
|-------|--------|-------|---------------------|
| A | Bottom UI | A1–A2 | Yes |
| B | Side Quests | B1–B7 | Yes |
| C | Boss Feel | C1–C3 | Yes |
| D | Cinematics | D1–D3 | Yes |
| E | Integration | E1–E3 | After A–D |

**Run order:** A+B+C+D in parallel → E sequentially.
