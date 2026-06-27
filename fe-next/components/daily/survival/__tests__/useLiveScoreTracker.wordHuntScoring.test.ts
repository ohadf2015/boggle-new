import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveScoreTracker } from '../useLiveScoreTracker';
import type { WordDiscovery, TargetAttempt } from '../types';

function makeWord(word: string): WordDiscovery {
  return { word, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 };
}

function makeAttempt(word: string, isDiscovery = false): TargetAttempt {
  return { word, feedback: [], timestamp: Date.now(), isDiscovery };
}

describe('useLiveScoreTracker — Season-2 projected score', () => {
  it('projects breakdown total during gameplay (fresh game = 800)', () => {
    const { result } = renderHook(() =>
      useLiveScoreTracker({
        lifePoints: 100,
        clueTokens: 0,
        discoveredWords: [],
        attempts: [],
        hasWon: false,
        isGameOver: false,
      }),
    );

    // speed 400 + accuracy 400 + exploration 0 = 800
    expect(result.current[0].currentScore).toBe(800);
  });

  it('adds 10 per discovered word (exploration bonus)', () => {
    const { result, rerender } = renderHook(
      ({ words }: { words: WordDiscovery[] }) =>
        useLiveScoreTracker({
          lifePoints: 100,
          clueTokens: 0,
          discoveredWords: words,
          attempts: [],
          hasWon: false,
          isGameOver: false,
        }),
      { initialProps: { words: [] as WordDiscovery[] } },
    );

    expect(result.current[0].currentScore).toBe(800);

    rerender({ words: [makeWord('CAT')] });
    expect(result.current[0].currentScore).toBe(810);

    rerender({ words: [makeWord('CAT'), makeWord('HOUSE')] });
    expect(result.current[0].currentScore).toBe(820);
  });

  it('subtracts 40 per extra target attempt (accuracy penalty)', () => {
    const { result, rerender } = renderHook(
      ({ attempts }: { attempts: TargetAttempt[] }) =>
        useLiveScoreTracker({
          lifePoints: 100,
          clueTokens: 0,
          discoveredWords: [],
          attempts,
          hasWon: false,
          isGameOver: false,
        }),
      { initialProps: { attempts: [] as TargetAttempt[] } },
    );

    expect(result.current[0].currentScore).toBe(800);

    // 1 target attempt → accuracy still 400 (first guess is free)
    rerender({ attempts: [makeAttempt('WRONG')] });
    expect(result.current[0].currentScore).toBe(800);

    // 2 attempts → accuracy 360
    rerender({ attempts: [makeAttempt('WRONG'), makeAttempt('WRONG2')] });
    expect(result.current[0].currentScore).toBe(760);
  });

  it('ignores discovery attempts for accuracy calc', () => {
    const { result } = renderHook(() =>
      useLiveScoreTracker({
        lifePoints: 100,
        clueTokens: 0,
        discoveredWords: [],
        attempts: [
          makeAttempt('CAT', true),
          makeAttempt('DOG', true),
          makeAttempt('WRONG', false),
        ],
        hasWon: false,
        isGameOver: false,
      }),
    );

    // Only the 1 non-discovery counts; accuracy stays 400
    expect(result.current[0].currentScore).toBe(800);
  });

  it('life loss reduces speed (4 pts per life)', () => {
    const { result, rerender } = renderHook(
      ({ life }: { life: number }) =>
        useLiveScoreTracker({
          lifePoints: life,
          clueTokens: 0,
          discoveredWords: [],
          attempts: [],
          hasWon: false,
          isGameOver: false,
        }),
      { initialProps: { life: 100 } },
    );

    expect(result.current[0].currentScore).toBe(800);

    rerender({ life: 90 });
    expect(result.current[0].currentScore).toBe(760);

    rerender({ life: 0 });
    expect(result.current[0].currentScore).toBe(400);
  });

  it('drops to 0 on game over if player lost (isGameOver && !hasWon)', () => {
    const { result } = renderHook(() =>
      useLiveScoreTracker({
        lifePoints: 0,
        clueTokens: 0,
        discoveredWords: [makeWord('HOUSE'), makeWord('CAT')],
        attempts: [makeAttempt('X'), makeAttempt('Y')],
        hasWon: false,
        isGameOver: true,
      }),
    );

    expect(result.current[0].currentScore).toBe(0);
    expect(result.current[0].isScoreAnimating).toBe(false);
  });

  it('uses real breakdown on game over if player won', () => {
    const { result } = renderHook(() =>
      useLiveScoreTracker({
        lifePoints: 80,
        clueTokens: 0,
        discoveredWords: [makeWord('HOUSE'), makeWord('CAT')],
        attempts: [makeAttempt('ANSWER')],
        hasWon: true,
        isGameOver: true,
      }),
    );

    // Won on 1 guess → exploration floored to the 200 ceiling (fast clean solve
    // is no longer punished for few words): speed 320 + accuracy 400 + 200 = 920
    expect(result.current[0].currentScore).toBe(920);
  });

  it('resetScore clears accumulated state', () => {
    const { result, rerender } = renderHook(
      ({ words }: { words: WordDiscovery[] }) =>
        useLiveScoreTracker({
          lifePoints: 100,
          clueTokens: 0,
          discoveredWords: words,
          attempts: [],
          hasWon: false,
          isGameOver: false,
        }),
      { initialProps: { words: [makeWord('HOUSE')] } },
    );

    rerender({ words: [makeWord('HOUSE'), makeWord('CAT')] });
    expect(result.current[0].currentScore).toBe(820);

    act(() => {
      result.current[1].resetScore();
    });
    expect(result.current[0].currentScore).toBe(0);
  });
});
