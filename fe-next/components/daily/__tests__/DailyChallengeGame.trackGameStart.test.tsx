/**
 * Funnel parity: DailyChallengeGame must emit `trackGameStart('daily-challenge')`
 * once on mount to match the existing `trackGameEnd('daily-challenge', ...)` emission.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

vi.mock('framer-motion', () => {
  // Cache one component per motion tag. Returning a fresh arrow component on
  // every Proxy access gives React a new component type each render, which
  // forces an unmount/remount of the whole subtree — ref callbacks fire with
  // null then the node again, and state-mirroring refs (GridComponent's
  // setGridNode) loop into "Maximum update depth exceeded".
  const cache = new Map<string | symbol, React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>>();
  const motion = new Proxy({}, {
    get: (_target, tag) => {
      let Component = cache.get(tag);
      if (!Component) {
        Component = function MotionTag({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
          const { initial, animate, exit, whileHover, whileTap, transition, variants, ...rest } = props as Record<string, unknown>;
          return <div {...rest}>{children}</div>;
        };
        cache.set(tag, Component);
      }
      return Component;
    },
  });
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: React.PropsWithChildren) => <>{children}</>,
    domAnimation: {},
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/contexts/MusicContext', () => ({ useMusic: () => ({ stopMusic: vi.fn() }) }));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ awardComboMilestone: vi.fn().mockResolvedValue(0) }),
}));
vi.mock('@/hooks/useGameMusic', () => ({ useGameMusic: vi.fn() }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false }),
}));
vi.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => false }));
vi.mock('@/components/ui/InteractiveMascot', () => ({ InteractiveMascot: () => null }));
vi.mock('@/components/game/FloatingCoinAnimation', () => ({ __esModule: true, default: () => null }));

import DailyChallengeGame from '../DailyChallengeGame';
import type { LetterGrid } from '@/types';

const grid: LetterGrid = [
  ['C', 'A', 'T'],
  ['O', 'R', 'E'],
  ['D', 'O', 'G'],
];

beforeEach(() => {
  trackGameStart.mockClear();
  trackGameEnd.mockClear();
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }) as unknown as typeof fetch;
});

describe('DailyChallengeGame trackGameStart', () => {
  it("emits trackGameStart('daily-challenge') once on mount", () => {
    render(
      <DailyChallengeGame
        grid={grid}
        puzzleNumber={42}
        language="en"
        duration={180}
        onComplete={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('daily-challenge', expect.objectContaining({ puzzleNumber: 42 }));
  });
});
