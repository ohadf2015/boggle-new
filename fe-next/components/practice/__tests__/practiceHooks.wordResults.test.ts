// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useBlitzGame } from '../hooks/useBlitzGame';
import { useSpellingGame } from '../hooks/useSpellingGame';
import { useMatchingGame } from '../hooks/useMatchingGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const WORDS: VocabularyWord[] = [
  { word: 'cat', definition: 'a small pet', canIntegrate: true },
  { word: 'elephant', definition: 'a large animal', canIntegrate: true },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('useBlitzGame wordResults', () => {
  it('Given a right and a wrong answer, When submitted, Then each is a recall entry for the word asked, in order', () => {
    const { result } = renderHook(() => useBlitzGame(WORDS));
    act(() => result.current.startGame());
    const first = result.current.currentWord!.word;
    act(() => { result.current.submitAnswer(first); });
    const second = result.current.currentWord!.word;
    act(() => { result.current.submitAnswer('zzz'); });
    expect(result.current.wordResults).toEqual([
      { word: first, correct: true, kind: 'recall' },
      { word: second, correct: false, kind: 'recall' },
    ]);
  });
});

describe('useSpellingGame wordResults', () => {
  it('Given a right then a wrong spelling, When submitted, Then each is a spell entry in answer order', () => {
    const { result } = renderHook(() => useSpellingGame(WORDS, { manualAdvanceOnWrong: true }));
    act(() => { result.current.submitAnswer('cat'); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { result.current.submitAnswer('elefant'); });
    expect(result.current.wordResults).toEqual([
      { word: 'cat', correct: true, kind: 'spell' },
      { word: 'elephant', correct: false, kind: 'spell' },
    ]);
  });

  it('Given answers, When the game resets, Then the answers are cleared', () => {
    const { result } = renderHook(() => useSpellingGame(WORDS));
    act(() => { result.current.submitAnswer('dog'); });
    act(() => result.current.resetGame());
    expect(result.current.wordResults).toEqual([]);
  });
});

describe('useMatchingGame wordResults', () => {
  it('Given one word dropped wrong before matching, When all are matched, Then only that word is incorrect', () => {
    const { result } = renderHook(() => useMatchingGame(WORDS));
    act(() => { result.current.checkMatch('cat', 'a large animal'); });
    act(() => { result.current.checkMatch('cat', 'a small pet'); });
    act(() => { result.current.checkMatch('cat', 'a large animal'); });
    act(() => { result.current.checkMatch('elephant', 'a large animal'); });
    expect(result.current.isComplete).toBe(true);
    expect(result.current.wordResults).toEqual([
      { word: 'cat', correct: false, kind: 'recognise' },
      { word: 'elephant', correct: true, kind: 'recognise' },
    ]);
  });

  it('Given a wrong drop, When the game resets, Then the word starts clean', () => {
    const { result } = renderHook(() => useMatchingGame(WORDS));
    act(() => { result.current.checkMatch('cat', 'a large animal'); });
    act(() => result.current.resetGame());
    expect(result.current.wordResults.every((r) => r.correct)).toBe(true);
  });
});
