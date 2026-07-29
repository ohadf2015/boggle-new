/**
 * Funnel parity: survival must emit `trackGameStart('survival')` once on mount
 * to pair with the existing `trackGameEnd('survival', ...)` emission.
 * Survival can remount on extra-life continuation — dedup via ref.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

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

import { useSurvivalGameLogic } from '../useSurvivalGameLogic';

const baseProps = {
  grid: Array(3).fill(null).map(() => Array(3).fill('A')) as string[][],
  puzzleNumber: 1,
  language: 'en' as const,
  targetWord: 'TEST',
  onComplete: vi.fn(),
  t: (key: string) => key,
};

describe('useSurvivalGameLogic trackGameStart', () => {
  beforeEach(() => { trackGameStart.mockClear(); });

  it("emits trackGameStart('survival') once on mount", () => {
    renderHook(() => useSurvivalGameLogic(baseProps));
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('survival', expect.objectContaining({ puzzleNumber: 1, language: 'en' }));
  });

  it('does not re-emit on re-render', () => {
    const { rerender } = renderHook(() => useSurvivalGameLogic(baseProps));
    rerender();
    rerender();
    expect(trackGameStart).toHaveBeenCalledTimes(1);
  });
});
