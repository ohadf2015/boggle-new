/**
 * Practice mode: when `disableLifeDrain` is true the survival timer must NOT
 * tick lifePoints down. Practice should be a no-pressure exploration so the
 * player can read the explanation overlay and try words at their own pace.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playWordAcceptedSound: vi.fn(), setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ fadeToTrack: vi.fn(), stopMusic: vi.fn(), TRACKS: {} }),
}));
vi.mock('@/hooks/useGameMusic', () => ({ useGameMusic: () => ({ resetUrgentMusic: vi.fn() }) }));
vi.mock('@/utils/gameLogger', () => ({
  logGameStart: vi.fn().mockResolvedValue('session-1'),
  logGameEnd: vi.fn(),
  formatWordsForLogging: vi.fn(() => ''),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

import { useSurvivalGameLogic } from '../useSurvivalGameLogic';

const baseProps = {
  grid: Array(3).fill(null).map(() => Array(3).fill('A')) as string[][],
  puzzleNumber: 1,
  language: 'en' as const,
  targetWord: 'TEST',
  onComplete: vi.fn(),
  t: (key: string) => key,
};

describe('useSurvivalGameLogic disableLifeDrain', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('drains life over time when disableLifeDrain is omitted', () => {
    const { result } = renderHook(() => useSurvivalGameLogic(baseProps));
    const start = result.current[0].lifePoints;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current[0].lifePoints).toBeLessThan(start);
  });

  it('keeps life at 100 when disableLifeDrain is true', () => {
    const { result } = renderHook(() =>
      useSurvivalGameLogic({ ...baseProps, disableLifeDrain: true })
    );
    const start = result.current[0].lifePoints;
    act(() => { vi.advanceTimersByTime(15000); });
    expect(result.current[0].lifePoints).toBe(start);
  });
});
