/**
 * WordWheelChallenge — effects-canvas sizing regression.
 *
 * `canvasSize` seeds at 400×600 and was measured in a `useEffect([])` that ran
 * while the component was still in its `loading` early-return branch — that
 * branch renders a DIFFERENT div, so `containerRef.current` was null and the
 * measurement silently no-opped. Nothing re-measured afterwards (the only other
 * trigger was `window.resize`), so the Pixi effects canvas stayed 400×600
 * pinned to the top-left of the stage. Every bubble/particle spawned at wheel
 * coordinates fell outside it — the effects were invisible.
 *
 * Measured on 2026-08-06: stage 1440×813, effects canvas still 400×600.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- next/dynamic: expose the props the lazy effects canvas receives ---
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = (props: { width?: number; height?: number }) =>
      props.width === undefined ? null : (
        <div data-testid="effects-canvas" data-w={props.width} data-h={props.height} />
      );
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-15',
  getPuzzleNumber: () => 42,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => 'test-fp' }));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: false, isPlaceholderCooldown: false }),
}));

vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-game" />,
}));
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tabbed-daily-leaderboard" />,
}));

import WordWheelChallenge from '../WordWheelChallenge';

let roCallbacks: Array<() => void> = [];
const fireResize = () => act(() => { roCallbacks.forEach(cb => cb()); });
let stageSize = { width: 1000, height: 800 };

beforeEach(() => {
  roCallbacks = [];
  stageSize = { width: 1000, height: 800 };
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    width: stageSize.width, height: stageSize.height, top: 0, left: 0,
    right: stageSize.width, bottom: stageSize.height, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect));
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) { roCallbacks.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

const startGame = async () => {
  // framer's `m.button` is proxied to a plain div by the mock above, so query
  // by its label rather than by role.
  const play = await waitFor(() => screen.getByText('daily.play'));
  act(() => { play.click(); });
};

describe('WordWheelChallenge — effects canvas tracks the stage size', () => {
  it('GIVEN the stage mounts after the loading branch THEN the effects canvas gets the measured size', async () => {
    render(<WordWheelChallenge />);
    await startGame();

    const canvas = await waitFor(() => screen.getByTestId('effects-canvas'));
    expect(canvas.getAttribute('data-w')).toBe('1000');
    expect(canvas.getAttribute('data-h')).toBe('800');
  });

  it('GIVEN the stage resizes THEN the effects canvas follows', async () => {
    render(<WordWheelChallenge />);
    await startGame();
    await waitFor(() => screen.getByTestId('effects-canvas'));

    stageSize = { width: 390, height: 844 };
    fireResize();

    await waitFor(() => {
      const canvas = screen.getByTestId('effects-canvas');
      expect(canvas.getAttribute('data-w')).toBe('390');
      expect(canvas.getAttribute('data-h')).toBe('844');
    });
  });
});
