/**
 * First games (gentleStart): the life bar holds still until the first word is found, and a
 * swipe that is not a word, or not on the board, costs no life. New players quit after a few
 * rejected words with no word found; the penalty and the drain were punishing them for not
 * yet knowing the board.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const verdict = vi.hoisted(() => ({ value: 'invalid' as 'valid' | 'invalid' | 'unknown' }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playWordAcceptedSound: vi.fn(), playWordRejectedSound: vi.fn(), setGameActive: vi.fn() }),
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
vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: vi.fn(),
  recordNotInDictionary: vi.fn(),
  clearRejectedWords: vi.fn(),
}));
vi.mock('@/lib/dictionary/checkWordRemote', () => ({
  resolveWordVerdict: vi.fn(async () => verdict.value),
}));

import { useSurvivalGameLogic } from '../useSurvivalGameLogic';

const baseProps = {
  grid: [
    ['C', 'A', 'T', 'S'],
    ['A', 'A', 'A', 'A'],
    ['A', 'A', 'A', 'A'],
    ['A', 'A', 'A', 'A'],
  ] as string[][],
  puzzleNumber: 1,
  language: 'en' as const,
  targetWord: 'TEST',
  onComplete: vi.fn(),
  t: (key: string) => key,
};

async function submit(result: { current: ReturnType<typeof useSurvivalGameLogic> }, word: string) {
  await act(async () => {
    result.current[1].handleWordSubmit(word);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useSurvivalGameLogic gentleStart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    verdict.value = 'invalid';
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Given a first game, When no word is found yet, Then the life bar holds at full', () => {
    const { result } = renderHook(() => useSurvivalGameLogic({ ...baseProps, gentleStart: true }));
    act(() => { vi.advanceTimersByTime(20000); });
    expect(result.current[0].lifePoints).toBe(100);
  });

  it('Given a first game, When the first word is found, Then the life bar starts to drain', async () => {
    verdict.value = 'valid';
    const { result } = renderHook(() => useSurvivalGameLogic({ ...baseProps, gentleStart: true }));
    await submit(result, 'CAT');
    expect(result.current[0].discoveredWords).toHaveLength(1);
    const afterWord = result.current[0].lifePoints;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current[0].lifePoints).toBeLessThan(afterWord);
  });

  it('Given a first game, When the swipe is not a word, Then it costs no life', async () => {
    const { result } = renderHook(() => useSurvivalGameLogic({ ...baseProps, gentleStart: true }));
    await submit(result, 'AAA');
    expect(result.current[0].feedbackType).toBe('not-in-dictionary');
    expect(result.current[0].feedbackMessage).toBe('wordHunt.feedback.notInDictionaryFree');
    expect(result.current[0].lifePoints).toBe(100);
  });

  it('Given a first game, When the word is not on the board, Then it costs no life', async () => {
    const { result } = renderHook(() => useSurvivalGameLogic({ ...baseProps, gentleStart: true }));
    await submit(result, 'XYZ');
    expect(result.current[0].feedbackType).toBe('not-on-board');
    expect(result.current[0].lifePoints).toBe(100);
  });

  it('Given a regular game, When the swipe is not a word, Then it still costs life', async () => {
    const { result } = renderHook(() => useSurvivalGameLogic({ ...baseProps, disableLifeDrain: true }));
    await submit(result, 'AAA');
    expect(result.current[0].lifePoints).toBe(96);
  });
});
