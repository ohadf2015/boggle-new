/**
 * Live Vocab Quiz — the payoff hook.
 *
 * The quiz already had the mechanics of a game — a speed bonus, a streak worth
 * up to fifty a question — and none of the feedback. This is the layer that
 * makes the scoring audible: a tick tightening under five seconds, a chime or a
 * buzz the instant the server judges you, a stinger at three and five in a row,
 * a burst when the whole class sweeps a question, and confetti for a clean
 * sheet.
 *
 * Everything here is a LATCH — "once, on this transition" — which is the
 * failure mode this file is built around. Two specific traps, both Class 2 in
 * .claude/rules/60-recurring-pitfalls.md:
 *
 * 1. `emitQuestion` re-broadcasts the SAME question on `resumeGame` and
 *    `extendTime`. Latching on the event would stutter the 5-4-3-2-1; the
 *    latches key off the question number instead, and reset when it changes.
 * 2. A reveal re-renders many times over its three seconds. Every class-wide
 *    beat keys off the reveal's `index`, not its object identity.
 *
 * The mute setting is respected for free: `playSound` returns early when SFX
 * are muted or audio was never unlocked, and both confetti helpers no-op under
 * `prefers-reduced-motion`.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireStreakConfetti, fireVictoryConfetti } from '@/utils/confettiUtils';
import type { VocabQuizAnswerResult, VocabQuizReveal } from '@/shared/types/vocabQuiz';
import { isClassSweep, isPerfectRound, mascotStateFor, streakStinger, tickRate } from './vocabQuizJuice';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';

export interface VocabQuizJuiceInput {
  /** The phone hears its own answer; the projector only hears the room. */
  surface: 'student' | 'host';
  phase: 'idle' | 'question' | 'reveal' | 'ended';
  paused: boolean;
  /** 1-based. The reset key for every per-question latch. */
  questionNumber: number;
  totalQuestions: number;
  secondsLeft: number;
  myAnswer: VocabQuizAnswerResult | null;
  myStreak: number;
  reveal: VocabQuizReveal | null;
  /** How many this student has got right so far — decides the perfect round. */
  myCorrectCount: number;
}

export interface VocabQuizJuiceResult {
  /** True for the reveal in which every student answered and every one was right. */
  sweep: boolean;
  /** Which face the student's mascot is wearing right now. */
  mascot: ExtendedMascotVariant;
  /** True while the clock is inside the ticking window — drives the bar's pulse. */
  ticking: boolean;
}

/** Sounds are additive over a classroom of thirty phones; keep them low. */
const TICK_VOLUME = 0.16;

export function useVocabQuizJuice(input: VocabQuizJuiceInput): VocabQuizJuiceResult {
  const { surface, phase, paused, questionNumber, totalQuestions, secondsLeft, myAnswer, myStreak, reveal } = input;
  const { playSound } = useSoundEffects();

  const [sweep, setSweep] = useState(false);

  // Per-question latches. All three reset together, keyed on the question
  // number, so a re-broadcast of the same question replays nothing.
  const latchedQuestionRef = useRef<number>(-1);
  const tickedSecondRef = useRef<number>(Number.POSITIVE_INFINITY);
  const scoredAnswerRef = useRef<number | null>(null);
  const stingerStreakRef = useRef<number>(-1);

  // Round-level latches.
  const sweptRevealRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  if (latchedQuestionRef.current !== questionNumber) {
    latchedQuestionRef.current = questionNumber;
    tickedSecondRef.current = Number.POSITIVE_INFINITY;
    scoredAnswerRef.current = null;
    stingerStreakRef.current = -1;
  }

  const ticking = phase === 'question' && !paused && secondsLeft <= 5 && secondsLeft > 0;

  // ---- The last five seconds -------------------------------------------------
  useEffect(() => {
    if (!ticking) return;
    const whole = Math.ceil(secondsLeft);
    if (whole >= tickedSecondRef.current) return;
    tickedSecondRef.current = whole;
    playSound('tileSelect', { volume: TICK_VOLUME, rate: tickRate(whole), requiresGameActive: false });
    // `questionNumber` belongs in the deps even though it is not read here: the
    // latch it resets lives in a ref, so without it a new question that happens
    // to mount on the same second as the last one runs no effect at all and
    // swallows its first tick.
  }, [ticking, secondsLeft, questionNumber, playSound]);

  // ---- This student's own verdict -------------------------------------------
  useEffect(() => {
    if (surface !== 'student') return;
    if (!myAnswer) return;
    if (scoredAnswerRef.current === myAnswer.index) return;
    scoredAnswerRef.current = myAnswer.index;

    if (myAnswer.correct) {
      // A fast answer is worth a brighter chime: the speed bonus is already in
      // the number, this makes it audible before the number lands.
      const bright = myAnswer.speedBonus >= 25;
      playSound('wordAccepted', { volume: 0.5, rate: bright ? 1.12 : 1, requiresGameActive: false });
    } else {
      playSound('wordRejected', { volume: 0.45, requiresGameActive: false });
    }
  }, [surface, myAnswer, playSound]);

  // ---- Streak stingers -------------------------------------------------------
  useEffect(() => {
    if (surface !== 'student') return;
    if (!myAnswer || !myAnswer.correct) return;
    const streak = myAnswer.streak;
    if (stingerStreakRef.current === streak) return;
    const stinger = streakStinger(streak);
    if (stinger === 'none') return;
    stingerStreakRef.current = streak;

    if (stinger === 'build') {
      playSound('streakBuild', { volume: 0.55, requiresGameActive: false });
      return;
    }
    playSound('streakFire', { volume: 0.65, requiresGameActive: false });
    fireStreakConfetti();
  }, [surface, myAnswer, playSound]);

  // ---- The class-wide sweep --------------------------------------------------
  useEffect(() => {
    if (phase !== 'reveal' || !reveal) {
      setSweep(false);
      return;
    }
    const swept = isClassSweep(reveal);
    setSweep(swept);
    if (!swept) return;
    if (sweptRevealRef.current === reveal.index) return;
    sweptRevealRef.current = reveal.index;
    // The one beat both surfaces share: the whole room got it, and the whole
    // room should hear the same thing.
    playSound('mascotCheer', { volume: 0.6, requiresGameActive: false });
  }, [phase, reveal, playSound]);

  // ---- The finish ------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'ended') {
      finishedRef.current = false;
      return;
    }
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (surface !== 'student') return;
    if (!isPerfectRound({ correctCount: input.myCorrectCount, totalQuestions })) return;
    playSound('confettiRain', { volume: 0.7, requiresGameActive: false });
    fireVictoryConfetti();
  }, [phase, surface, input.myCorrectCount, totalQuestions, playSound]);

  const mascot = useMemo(
    () =>
      mascotStateFor({
        phase,
        answered: myAnswer !== null,
        correct: phase === 'reveal' && myAnswer ? myAnswer.correct : null,
        streak: myStreak,
      }),
    [phase, myAnswer, myStreak]
  );

  return { sweep, mascot, ticking };
}

export default useVocabQuizJuice;
