import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, isAuthenticated: false }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playWordAcceptedSound: vi.fn(), setGameActive: vi.fn() }) }));
vi.mock('@/contexts/MusicContext', () => ({ useMusic: () => ({ fadeToTrack: vi.fn(), stopMusic: vi.fn(), TRACKS: {} }) }));
vi.mock('@/hooks/useGameMusic', () => ({ useGameMusic: () => ({ resetUrgentMusic: vi.fn() }) }));
vi.mock('@/utils/gameLogger', () => ({ logGameStart: vi.fn().mockResolvedValue('s'), logGameEnd: vi.fn(), formatWordsForLogging: vi.fn(() => '') }));
vi.mock('@/utils/growthTracking', () => ({ trackGameStart: vi.fn(), trackGameEnd: vi.fn() }));
vi.mock('@/utils/trainingProgressStorage', () => ({ isNewDailyPlayer: () => false, incrementDailyChallengesCompleted: vi.fn() }));

import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import { LIFE_DRAIN_RATE } from '../constants';

const props = {
  grid: Array(3).fill(null).map(() => Array(3).fill('A')) as string[][],
  puzzleNumber: 1,
  language: 'en' as const,
  targetWord: 'TEST',
  onComplete: vi.fn(),
  t: (key: string) => key,
};

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useSurvivalGameLogic life drain clock', () => {
  beforeEach(() => { vi.useFakeTimers(); setHidden(false); });
  afterEach(() => { vi.useRealTimers(); setHidden(false); });

  it('given the quit dialog is open, when time passes, then no life drains', () => {
    const { result } = renderHook(() => useSurvivalGameLogic(props));
    act(() => result.current[1].setShowQuitConfirm(true));
    const start = result.current[0].lifePoints;
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current[0].lifePoints).toBe(start);
  });

  it('given the quit dialog was open for a while, when it closes, then the paused time is not charged', () => {
    const { result } = renderHook(() => useSurvivalGameLogic(props));
    act(() => result.current[1].setShowQuitConfirm(true));
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => result.current[1].setShowQuitConfirm(false));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current[0].lifePoints).toBeCloseTo(100 - LIFE_DRAIN_RATE, 5);
  });

  it('given a throttled timer that fires late, when it ticks, then drain follows elapsed wall time', () => {
    const { result } = renderHook(() => useSurvivalGameLogic(props));
    act(() => { vi.setSystemTime(Date.now() + 1500); vi.advanceTimersByTime(1000); });
    expect(result.current[0].lifePoints).toBeCloseTo(100 - LIFE_DRAIN_RATE * 2.5, 5);
  });

  it('given the tab is hidden, when time passes, then no life drains', () => {
    const { result } = renderHook(() => useSurvivalGameLogic(props));
    act(() => setHidden(true));
    act(() => { vi.advanceTimersByTime(20_000); });
    act(() => setHidden(false));
    expect(result.current[0].lifePoints).toBe(100);
  });
});
