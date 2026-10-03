import { renderHook, act } from '@testing-library/react';
import { useSpellingGame } from '../hooks/useSpellingGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const words: VocabularyWord[] = [
  { word: 'cat', definition: 'A small pet animal', canIntegrate: true },
  { word: 'dog', definition: 'A loyal pet', canIntegrate: true },
];

describe('useSpellingGame - manual advance on a wrong answer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Given manualAdvanceOnWrong, When the answer is wrong, Then the word waits for the student', () => {
    const { result } = renderHook(() => useSpellingGame(words, { manualAdvanceOnWrong: true }));
    act(() => { result.current.submitAnswer('nope'); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.wordIndex).toBe(0);
    act(() => result.current.advance());
    expect(result.current.wordIndex).toBe(1);
  });

  it('Given manualAdvanceOnWrong, When the answer is right, Then it still auto-advances', () => {
    const { result } = renderHook(() => useSpellingGame(words, { manualAdvanceOnWrong: true }));
    act(() => { result.current.submitAnswer('cat'); });
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current.wordIndex).toBe(1);
  });

  it('When the last word is advanced past, Then the round completes', () => {
    const { result } = renderHook(() => useSpellingGame(words, { manualAdvanceOnWrong: true }));
    act(() => { result.current.submitAnswer('cat'); });
    act(() => { vi.advanceTimersByTime(1100); });
    act(() => { result.current.submitAnswer('nope'); });
    act(() => result.current.advance());
    expect(result.current.isComplete).toBe(true);
  });

  it('keeps the old timed advance when the option is off', () => {
    const { result } = renderHook(() => useSpellingGame(words));
    act(() => { result.current.submitAnswer('nope'); });
    act(() => { vi.advanceTimersByTime(2100); });
    expect(result.current.wordIndex).toBe(1);
  });
});
