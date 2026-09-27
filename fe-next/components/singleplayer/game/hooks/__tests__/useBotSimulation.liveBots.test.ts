import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBotSimulation } from '../useBotSimulation';

// Regression: the in-game race read BotOpponent.score, which is 0 at creation
// and never mutated — the simulation keeps live scores in its own state — so
// the bot sat at 0 all game and looked idle even while it was scoring.
const bots = [{ id: 'b1', name: 'WordBot', difficulty: 'hard', score: 0, wordsFound: [] }] as never;
const availableWords = { easy: ['cat'], medium: ['plane'], hard: ['planets'] };

describe('useBotSimulation — liveBots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('given a bot that finds a word, liveBots carries its live score', () => {
    const { result } = renderHook(() =>
      useBotSimulation({ mode: 'solo-bots', bots, isPaused: false, isGameOver: false, availableWords }),
    );
    act(() => { result.current.initializeBotUsedWords(bots); });
    expect(result.current.liveBots[0].score).toBe(0);

    act(() => { vi.advanceTimersByTime(1850); });

    expect(result.current.liveBots[0].score).toBe(result.current.botScores.b1);
    expect(result.current.liveBots[0].score).toBeGreaterThan(0);
    expect(result.current.liveBots[0].name).toBe('WordBot');
  });
});
