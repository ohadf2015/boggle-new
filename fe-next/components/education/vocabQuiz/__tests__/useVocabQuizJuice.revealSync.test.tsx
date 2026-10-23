import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { VocabQuizAnswerResult, VocabQuizReveal } from '@/shared/types/vocabQuiz';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));
vi.mock('@/utils/confettiUtils', () => ({ fireStreakConfetti: vi.fn(), fireVictoryConfetti: vi.fn() }));

import { useVocabQuizJuice, MASCOT_REACT_MS, type VocabQuizJuiceInput } from '../useVocabQuizJuice';

const answer = (over: Partial<VocabQuizAnswerResult> = {}): VocabQuizAnswerResult => ({
  index: 0, correct: true, choiceIndex: 1, points: 130, speedBonus: 0, streakBonus: 0, streak: 1, totalScore: 130, ...over,
});
const reveal = (over: Partial<VocabQuizReveal> = {}): VocabQuizReveal => ({
  gameCode: 'ABC123', index: 0, total: 5, answerIndex: 1, answer: 'fragile', word: 'brittle', distribution: [1, 1, 0, 0],
  standings: [], nextInMs: 3_000, isLast: false, ...over,
});
const base: VocabQuizJuiceInput = {
  surface: 'student', phase: 'question', paused: false, questionNumber: 1, totalQuestions: 5, secondsLeft: 20,
  myAnswer: null, myStreak: 0, reveal: null, myCorrectCount: 0,
};
const keys = () => playSound.mock.calls.map((c) => c[0] as string);

describe('useVocabQuizJuice — the verdict sound lands with the verdict sheet', () => {
  beforeEach(() => {
    playSound.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    [true, 'wordAccepted'],
    [false, 'wordRejected'],
  ])('correct=%s: silent while the question is open, then plays on the reveal frame', (correct, sound) => {
    const { rerender } = renderHook((p: VocabQuizJuiceInput) => useVocabQuizJuice(p), { initialProps: base });
    const answered = { ...base, myAnswer: answer({ correct, streak: correct ? 1 : 0 }), myStreak: correct ? 1 : 0 };
    rerender(answered);
    expect(keys()).not.toContain(sound);
    rerender({ ...answered, phase: 'reveal', reveal: reveal() });
    expect(keys().filter((k) => k === sound)).toHaveLength(1);
  });

  it('holds the streak stinger for the reveal too', () => {
    const { rerender } = renderHook((p: VocabQuizJuiceInput) => useVocabQuizJuice(p), { initialProps: { ...base, questionNumber: 3 } });
    const answered = { ...base, questionNumber: 3, myAnswer: answer({ index: 2, streak: 3 }), myStreak: 3 };
    rerender(answered);
    expect(keys()).not.toContain('streakBuild');
    rerender({ ...answered, phase: 'reveal', reveal: reveal({ index: 2 }) });
    expect(keys()).toContain('streakBuild');
  });

  it('the mascot reacts a beat after the sheet, inside the 300 ms to 1 s window', () => {
    expect(MASCOT_REACT_MS).toBeGreaterThanOrEqual(300);
    expect(MASCOT_REACT_MS).toBeLessThanOrEqual(1000);
    const answered = { ...base, myAnswer: answer({ correct: false, streak: 0 }) };
    const { result, rerender } = renderHook((p: VocabQuizJuiceInput) => useVocabQuizJuice(p), { initialProps: answered });
    rerender({ ...answered, phase: 'reveal', reveal: reveal() });
    expect(result.current.mascot).not.toBe('oops');
    act(() => {
      vi.advanceTimersByTime(MASCOT_REACT_MS);
    });
    expect(result.current.mascot).toBe('oops');
  });
});
