import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBotSimulation } from '../useBotSimulation';

// A single deterministic "hard" bot (base interval 1800ms). Math.random pinned to
// 0 below removes the +random jitter AND makes word selection deterministic, so
// the only variable under test is the calm pacing multiplier (1.6×).
const bots = [{ id: 'b1', name: 'Bot', difficulty: 'hard' }] as never;
const availableWords = { easy: ['cat'], medium: ['plane'], hard: ['planets', 'gardens'] };

describe('useBotSimulation — calm pacing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('racing bots (no calm) score within the base 1800ms interval', () => {
    const { result } = renderHook(() =>
      useBotSimulation({ mode: 'solo-bots', bots, isPaused: false, isGameOver: false, availableWords }),
    );
    act(() => {
      result.current.initializeBotUsedWords(bots);
    });
    act(() => {
      vi.advanceTimersByTime(1850);
    });
    expect(result.current.botScores['b1'] ?? 0).toBeGreaterThan(0);
  });

  it('calm bots have NOT scored yet at 1800ms — their think-time is stretched', () => {
    const { result } = renderHook(() =>
      useBotSimulation({ mode: 'solo-bots', bots, isPaused: false, isGameOver: false, availableWords, calmPacing: true }),
    );
    act(() => {
      result.current.initializeBotUsedWords(bots);
    });
    act(() => {
      vi.advanceTimersByTime(1850);
    });
    // Stretched interval = round(1800 * 1.6) = 2880ms, so no word yet at 1850ms.
    expect(result.current.botScores['b1'] ?? 0).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1100); // now past 2880ms
    });
    expect(result.current.botScores['b1'] ?? 0).toBeGreaterThan(0);
  });
});
