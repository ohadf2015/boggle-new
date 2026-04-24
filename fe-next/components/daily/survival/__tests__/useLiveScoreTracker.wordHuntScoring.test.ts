import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveScoreTracker } from '../useLiveScoreTracker';
import type { WordDiscovery } from '../types';

function makeWord(word: string): WordDiscovery {
  return { word, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 };
}

describe('useLiveScoreTracker — word-hunt scoring', () => {
  it('sums per-word scores using canonical calculateWordScore lengths', () => {
    const { result, rerender } = renderHook(
      ({ words }: { words: WordDiscovery[] }) =>
        useLiveScoreTracker({
          lifePoints: 100,
          clueTokens: 0,
          discoveredWords: words,
          attempts: [],
        }),
      { initialProps: { words: [] as WordDiscovery[] } },
    );

    expect(result.current[0].currentScore).toBe(0);

    rerender({ words: [makeWord('CAT')] });
    expect(result.current[0].currentScore).toBe(10);

    rerender({ words: [makeWord('CAT'), makeWord('HOUSE')] });
    expect(result.current[0].currentScore).toBe(60);

    rerender({
      words: [makeWord('CAT'), makeWord('HOUSE'), makeWord('TESTING')],
    });
    expect(result.current[0].currentScore).toBe(260);
  });

  it('ignores lifePoints/clueTokens/attempts when computing score', () => {
    const { result, rerender } = renderHook(
      ({
        life,
        tokens,
        attempts,
      }: {
        life: number;
        tokens: number;
        attempts: number;
      }) =>
        useLiveScoreTracker({
          lifePoints: life,
          clueTokens: tokens,
          discoveredWords: [makeWord('HOUSE')],
          attempts: Array.from({ length: attempts }, (_, i) => ({
            word: `W${i}`,
            timestamp: 0,
            isCorrect: false,
          })) as never,
        }),
      { initialProps: { life: 100, tokens: 0, attempts: 0 } },
    );

    const base = result.current[0].currentScore;
    expect(base).toBe(50);

    rerender({ life: 10, tokens: 5, attempts: 9 });
    expect(result.current[0].currentScore).toBe(base);
  });

  it('sets final score without animation on game over', () => {
    const { result } = renderHook(() =>
      useLiveScoreTracker({
        lifePoints: 0,
        clueTokens: 0,
        discoveredWords: [makeWord('HOUSE'), makeWord('CAT')],
        attempts: [],
        isGameOver: true,
      }),
    );

    expect(result.current[0].currentScore).toBe(60);
    expect(result.current[0].isScoreAnimating).toBe(false);
  });

  it('resetScore clears accumulated state', () => {
    const { result, rerender } = renderHook(
      ({ words }: { words: WordDiscovery[] }) =>
        useLiveScoreTracker({
          lifePoints: 100,
          clueTokens: 0,
          discoveredWords: words,
          attempts: [],
        }),
      { initialProps: { words: [makeWord('HOUSE')] } },
    );

    rerender({ words: [makeWord('HOUSE'), makeWord('CAT')] });
    expect(result.current[0].currentScore).toBe(60);

    act(() => {
      result.current[1].resetScore();
    });
    expect(result.current[0].currentScore).toBe(0);
  });
});
