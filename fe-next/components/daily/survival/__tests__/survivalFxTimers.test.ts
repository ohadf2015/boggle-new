import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSurvivalClues } from '../useSurvivalClues';
import { useWordHuntFx } from '../useWordHuntFx';
import type { SurvivalGameState } from '../useSurvivalGameLogic';

vi.mock('@/utils/haptics', () => ({ hapticClueRevealed: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/hooks/useGameRewards', () => ({ useGameRewards: () => ({ rewardId: 0, triggerReward: vi.fn() }) }));
vi.mock('@/hooks/useExperiment', () => {
  const trackExposure = () => {};
  return { useExperiment: () => ({ variant: 'clue-shake', trackExposure }) };
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useSurvivalClues clue-gain glow timer', () => {
  const render = () => renderHook(() => useSurvivalClues({ targetWord: 'APPLE', clueContainerRef: { current: null } }));

  it('Given a second clue gain inside the glow window, When the first glow would end, Then the glow keeps running', () => {
    const { result } = render();
    act(() => { result.current[1].triggerClueGainAnimation(1); });
    act(() => { vi.advanceTimersByTime(600); });
    act(() => { result.current[1].triggerClueGainAnimation(1); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current[0].isClueGaining).toBe(true);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current[0].isClueGaining).toBe(false);
  });

  it('Given a glow is running, When the board unmounts, Then no timer is left behind', () => {
    const { result, unmount } = render();
    act(() => { result.current[1].triggerClueGainAnimation(1); });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

function fxState(feedbackSeq: number): SurvivalGameState {
  return {
    feedbackSeq,
    feedbackType: 'invalid-word',
    lastScoreIncrement: 0,
    attempts: [],
    lifePoints: 100,
    eliminatedLetters: new Set<string>(),
    isClueGaining: false,
    hasWon: false,
    isGameOver: false,
    liveScore: 0,
  } as unknown as SurvivalGameState;
}

describe('useWordHuntFx clue shake timer', () => {
  it('Given two rejected words inside the shake window, When the first shake would end, Then the clues keep shaking', () => {
    const { result, rerender } = renderHook(({ s }) => useWordHuntFx(s, true), { initialProps: { s: fxState(0) } });
    rerender({ s: fxState(1) });
    expect(result.current.shakingClues).toBe(true);
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ s: fxState(2) });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.shakingClues).toBe(true);
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.shakingClues).toBe(false);
  });

  it('Given a shake is running, When the game unmounts, Then no timer is left behind', () => {
    const { rerender, unmount } = renderHook(({ s }) => useWordHuntFx(s, true), { initialProps: { s: fxState(0) } });
    rerender({ s: fxState(1) });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
