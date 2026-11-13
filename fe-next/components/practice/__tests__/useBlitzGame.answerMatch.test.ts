import { renderHook, act } from '@testing-library/react';
import { useBlitzGame } from '../hooks/useBlitzGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const hebrew: VocabularyWord[] = [{ word: 'שלום', definition: 'ברכה', canIntegrate: true }];
const english: VocabularyWord[] = [{ word: 'apple', definition: 'A red fruit', canIntegrate: true }];

describe('useBlitzGame answer matching', () => {
  it('accepts a Hebrew answer typed with niqqud, like Spelling does', () => {
    const { result } = renderHook(() => useBlitzGame(hebrew));
    act(() => result.current.startGame());

    let res: { correct: boolean } = { correct: false };
    act(() => { res = result.current.submitAnswer('שָׁלוֹם'); });

    expect(res.correct).toBe(true);
  });

  it('returns the expected word on a miss so the drill can show it', () => {
    const { result } = renderHook(() => useBlitzGame(english));
    act(() => result.current.startGame());

    let res: { correct: boolean; answer?: string } = { correct: true };
    act(() => { res = result.current.submitAnswer('pear'); });

    expect(res).toEqual({ correct: false, answer: 'apple' });
  });

  it.each([
    ['кот', 'пёс'],
    ['ねこ', 'いぬ'],
  ])('still rejects a wrong non-Latin answer (%s vs %s)', (word, typed) => {
    const { result } = renderHook(() => useBlitzGame([{ word, definition: 'x', canIntegrate: true }]));
    act(() => result.current.startGame());

    let res: { correct: boolean } = { correct: true };
    act(() => { res = result.current.submitAnswer(typed); });

    expect(res.correct).toBe(false);
  });
});
