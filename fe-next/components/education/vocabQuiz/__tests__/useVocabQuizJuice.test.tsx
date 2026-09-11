/**
 * Live Vocab Quiz — the payoff hook (RED first).
 *
 * The quiz had real scoring and no payoff: no chime, no buzz, no stinger, no
 * confetti. This hook is where those fire, and every one of them is a latch —
 * "fire once, on this transition" — which is precisely the shape that goes
 * wrong silently. So the transitions are asserted here rather than trusted:
 *
 * - a tick under five seconds, once per whole second, and NOT replayed when the
 *   teacher extends time and the same question re-broadcasts (Class 2);
 * - one chime per answer, not one per render;
 * - the streak stingers at three and five;
 * - confetti for a perfect round, once.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { VocabQuizAnswerResult, VocabQuizReveal } from '@/shared/types/vocabQuiz';

const playSound = vi.fn();
const fireStreakConfetti = vi.fn();
const fireVictoryConfetti = vi.fn();

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireStreakConfetti: (...args: unknown[]) => fireStreakConfetti(...args),
  fireVictoryConfetti: (...args: unknown[]) => fireVictoryConfetti(...args),
}));

import { useVocabQuizJuice, type VocabQuizJuiceInput } from '../useVocabQuizJuice';

const answer = (over: Partial<VocabQuizAnswerResult> = {}): VocabQuizAnswerResult => ({
  index: 0,
  correct: true,
  choiceIndex: 1,
  points: 130,
  speedBonus: 30,
  streakBonus: 0,
  streak: 1,
  totalScore: 130,
  ...over,
});

const reveal = (over: Partial<VocabQuizReveal> = {}): VocabQuizReveal => ({
  gameCode: 'ABC123',
  index: 0,
  total: 5,
  answerIndex: 1,
  answer: 'fragile',
  word: 'brittle',
  distribution: [0, 2, 0, 0],
  standings: [
    { username: 'a', score: 1, streak: 1, bestStreak: 1, correctCount: 1 },
    { username: 'b', score: 1, streak: 1, bestStreak: 1, correctCount: 1 },
  ],
  nextInMs: 3_000,
  isLast: false,
  ...over,
});

const base: VocabQuizJuiceInput = {
  surface: 'student',
  phase: 'question',
  paused: false,
  questionNumber: 1,
  totalQuestions: 5,
  secondsLeft: 20,
  myAnswer: null,
  myStreak: 0,
  reveal: null,
  myCorrectCount: 0,
};

const keysPlayed = () => playSound.mock.calls.map((c) => c[0] as string);

beforeEach(() => {
  playSound.mockClear();
  fireStreakConfetti.mockClear();
  fireVictoryConfetti.mockClear();
});

describe('useVocabQuizJuice — the last five seconds', () => {
  it('stays silent above five seconds', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({ ...base, secondsLeft: 8 });
    rerender({ ...base, secondsLeft: 6 });
    expect(keysPlayed()).toHaveLength(0);
  });

  it('ticks once per whole second from five down to one', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    for (const secondsLeft of [5, 5, 4, 4, 3, 2, 1]) rerender({ ...base, secondsLeft });
    // Five renders sat on a second already ticked — five distinct seconds, five ticks.
    expect(keysPlayed()).toEqual(['tileSelect', 'tileSelect', 'tileSelect', 'tileSelect', 'tileSelect']);
  });

  it('does not tick while the teacher has the round paused', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({ ...base, paused: true, secondsLeft: 3 });
    expect(keysPlayed()).toHaveLength(0);
  });

  it('replays the ticks for the NEXT question, but not for the same one re-broadcast', () => {
    // `emitQuestion` fires again on resume and on extend-time with the same
    // index. Latching on the question number — not on the event — is what keeps
    // the 5-4-3-2-1 from stuttering (Class 2).
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({ ...base, secondsLeft: 3 });
    rerender({ ...base, secondsLeft: 12 }); // teacher extended time
    rerender({ ...base, secondsLeft: 3 }); // same question, same second — silent
    expect(keysPlayed()).toHaveLength(1);

    rerender({ ...base, questionNumber: 2, secondsLeft: 3 });
    expect(keysPlayed()).toHaveLength(2);
  });
});

describe('useVocabQuizJuice — right and wrong', () => {
  it('chimes once when the server says correct, however many times it re-renders', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    const scored = { ...base, phase: 'reveal' as const, myAnswer: answer(), myStreak: 1, reveal: reveal() };
    rerender(scored);
    rerender(scored);
    expect(keysPlayed().filter((k) => k === 'wordAccepted')).toHaveLength(1);
  });

  it('buzzes a wrong answer', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({
      ...base,
      phase: 'reveal',
      myAnswer: answer({ correct: false, points: 0, speedBonus: 0, streak: 0 }),
      myStreak: 0,
      reveal: reveal({ distribution: [1, 1, 0, 0] }),
    });
    expect(keysPlayed()).toContain('wordRejected');
  });
});

describe('useVocabQuizJuice — streak stingers', () => {
  it('fires the build stinger at three in a row', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({
      ...base,
      questionNumber: 3,
      phase: 'reveal',
      myAnswer: answer({ index: 2, streak: 3 }),
      myStreak: 3,
      reveal: reveal({ index: 2 }),
    });
    expect(keysPlayed()).toContain('streakBuild');
    expect(fireStreakConfetti).not.toHaveBeenCalled();
  });

  it('fires the fire stinger and a burst at five in a row', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({
      ...base,
      questionNumber: 5,
      phase: 'reveal',
      myAnswer: answer({ index: 4, streak: 5 }),
      myStreak: 5,
      reveal: reveal({ index: 4 }),
    });
    expect(keysPlayed()).toContain('streakFire');
    expect(fireStreakConfetti).toHaveBeenCalledTimes(1);
  });
});

describe('useVocabQuizJuice — class sweep', () => {
  it('reports a sweep and cheers when the whole class got it', () => {
    const { result, rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({ ...base, phase: 'reveal', myAnswer: answer(), myStreak: 1, reveal: reveal() });
    expect(result.current.sweep).toBe(true);
    expect(keysPlayed()).toContain('mascotCheer');
  });

  it('reports no sweep when a distractor took a vote', () => {
    const { result, rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({
      ...base,
      phase: 'reveal',
      myAnswer: answer(),
      myStreak: 1,
      reveal: reveal({ distribution: [1, 1, 0, 0] }),
    });
    expect(result.current.sweep).toBe(false);
  });
});

describe('useVocabQuizJuice — the finish', () => {
  it('throws confetti once for a perfect round', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    const ended = { ...base, phase: 'ended' as const, myCorrectCount: 5, totalQuestions: 5 };
    rerender(ended);
    rerender(ended);
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
    expect(keysPlayed()).toContain('confettiRain');
  });

  it('stays quiet when the round was not perfect', () => {
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: base,
    });
    rerender({ ...base, phase: 'ended', myCorrectCount: 4, totalQuestions: 5 });
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
  });
});

describe('useVocabQuizJuice — the projector', () => {
  it('never plays the private right/wrong feedback on the host surface', () => {
    // The projector has no "my answer"; a chime there would be a lie about the
    // room. It keeps the class-wide beats only.
    const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
      initialProps: { ...base, surface: 'host' as const },
    });
    rerender({
      ...base,
      surface: 'host',
      phase: 'reveal',
      myAnswer: answer(),
      myStreak: 1,
      reveal: reveal(),
    });
    expect(keysPlayed()).not.toContain('wordAccepted');
    expect(keysPlayed()).toContain('mascotCheer');
  });
});

describe('useVocabQuizJuice — the mute setting', () => {
  it('plays nothing except through the shared player, which is where mute lives', () => {
    // The quiz owns no audio of its own: `playSound` returns early when SFX are
    // muted, when audio was never unlocked, or when the tab is hidden
    // (contexts/SoundEffectsContext). Routing everything through it IS the mute
    // contract — a single `new Audio()` here would play over a silenced
    // classroom of thirty phones and no behavioural test would notice.
    //
    // So the assertion is the negative one: drive the loudest beat the quiz has
    // (a five-streak stinger plus a class-wide sweep) and prove the Audio
    // constructor was never reached.
    const AudioSpy = vi.fn();
    const realAudio = (globalThis as { Audio?: unknown }).Audio;
    (globalThis as { Audio?: unknown }).Audio = AudioSpy;
    try {
      const { rerender } = renderHook((props: VocabQuizJuiceInput) => useVocabQuizJuice(props), {
        initialProps: base,
      });
      rerender({
        ...base,
        phase: 'reveal',
        myAnswer: answer({ streak: 5, correct: true }),
        myStreak: 5,
        reveal: reveal(),
      });

      expect(keysPlayed()).toEqual(expect.arrayContaining(['wordAccepted', 'streakFire', 'mascotCheer']));
      expect(AudioSpy).not.toHaveBeenCalled();
    } finally {
      (globalThis as { Audio?: unknown }).Audio = realAudio;
    }
  });
});
