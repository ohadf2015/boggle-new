/**
 * Live Vocab Quiz — the payoff rules.
 *
 * Every celebration the quiz can throw is decided here as a pure function of
 * state the server already sent: when the flame grows, when a stinger fires,
 * whether the whole class just swept a question, which face the mascot wears.
 *
 * Kept pure and separate from the hook on purpose. A celebration that only
 * exists inside a `useEffect` is a celebration nobody can test, and "did the
 * five-streak fire twice" is exactly the kind of question that gets answered by
 * watching a screen and guessing. It is also the Class 2 shape from
 * .claude/rules/60-recurring-pitfalls.md — latches living next to the thing
 * they gate — so the latching stays in one hook and the RULES stay here.
 */

import type { VocabQuizReveal } from '@/shared/types/vocabQuiz';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';

/** Which stinger a freshly-reached streak length earns. */
export type StreakStinger = 'none' | 'build' | 'fire';

/** The first "you're on a run" beat. */
export const STREAK_BUILD_AT = 3;
/** The "the class should look up" beat, and every multiple of it after. */
export const STREAK_FIRE_AT = 5;

/**
 * Sound the streak, not the score.
 *
 * Three in a row gets a rising build; five — and ten, and fifteen — gets the
 * full fire stinger. Four gets nothing, deliberately: a stinger on every
 * correct answer is not a streak reward, it is a click track.
 */
export function streakStinger(streak: number): StreakStinger {
  if (!Number.isFinite(streak) || streak < STREAK_BUILD_AT) return 'none';
  if (streak % STREAK_FIRE_AT === 0) return 'fire';
  if (streak === STREAK_BUILD_AT) return 'build';
  return 'none';
}

/** Flame growth, 0 (no flame) to 1 (as big as the header allows). */
const FLAME_FULL_AT = 12;

/**
 * How big the streak flame is drawn, 0–1.
 *
 * Capped so a twenty-question run cannot push the score out of the header on a
 * 390px phone — the flame is a reward, not a layout hazard.
 */
export function flameScale(streak: number): number {
  if (!Number.isFinite(streak) || streak < 2) return 0;
  const capped = Math.min(streak, FLAME_FULL_AT);
  return (capped - 1) / (FLAME_FULL_AT - 1);
}

/**
 * Did the entire class get this one?
 *
 * Every student in the room answered, AND every answer was the right one. A
 * room where two of three answered correctly is not a sweep however good it
 * looks — the moment is "all of us", and claiming it for a partial room is the
 * quickest way to make the celebration worthless.
 *
 * Derived on the client from the reveal both surfaces already receive, rather
 * than as a second server flag: two independent computations of the same fact
 * drift (Class 3).
 */
export function isClassSweep(reveal: Pick<VocabQuizReveal, 'distribution' | 'answerIndex' | 'standings'>): boolean {
  const players = reveal.standings.length;
  if (players === 0) return false;
  const votes = reveal.distribution.reduce((a, b) => a + b, 0);
  if (votes === 0 || votes !== players) return false;
  return (reveal.distribution[reveal.answerIndex] ?? 0) === votes;
}

/**
 * Playback rate for the last-five-seconds tick.
 *
 * The tick does not get louder, it gets tighter — pitch carries urgency without
 * becoming the loudest thing in a classroom of thirty phones.
 */
export function tickRate(secondsLeft: number): number {
  const s = Math.max(1, Math.min(5, Math.round(secondsLeft)));
  return 1 + (5 - s) * 0.15;
}

/** A clean sheet: every question in the round answered correctly. */
export function isPerfectRound({
  correctCount,
  totalQuestions,
}: {
  correctCount: number;
  totalQuestions: number;
}): boolean {
  if (!totalQuestions || totalQuestions <= 0) return false;
  return correctCount >= totalQuestions;
}

export interface MascotStateInput {
  phase: 'idle' | 'question' | 'reveal' | 'ended';
  /** Has this student locked an answer in for the current question? */
  answered: boolean;
  /** Null until the server has judged it. */
  correct: boolean | null;
  streak: number;
}

/**
 * Which face Lexi is wearing in the student's header.
 *
 * Reads top-down by importance: the round being over beats everything, then a
 * big streak beats a plain cheer, then right/wrong, then whether the student is
 * still deciding. A mascot that only reacts to right/wrong is a status icon; one
 * that escalates with the run is a character watching you play.
 */
export function mascotStateFor({ phase, answered, correct, streak }: MascotStateInput): ExtendedMascotVariant {
  if (phase === 'ended') return 'trophy';

  if (correct === true) {
    if (streak >= STREAK_FIRE_AT) return 'mindblown';
    if (streak >= STREAK_BUILD_AT) return 'onfire';
    return 'celebration';
  }

  if (correct === false) return 'oops';
  if (phase === 'reveal') return 'thinking';
  return answered ? 'spectating' : 'thinking';
}

/** What the whole class did, as three numbers the wall can hold. */
export interface ClassFinaleStats {
  players: number;
  /** Correct answers across the room. */
  correct: number;
  /** Answers the room could have got right: players × questions asked. */
  attempts: number;
  /** `correct / attempts`, rounded to a whole percent. */
  accuracy: number;
  /** The longest run anyone reached — not the one they happened to end on. */
  topStreak: number;
}

/**
 * The class's own scoreboard for the finale.
 *
 * A quiz that ends on a ranked list rewards the three children who were already
 * winning. These three numbers belong to everybody in the room, which is the
 * difference between "who won" and "how we did" — and the second is the one a
 * teacher reads out loud.
 *
 * Derived from the standings the server already sorted, so the wall can never
 * disagree with the phones (Class 3 in .claude/rules/60-recurring-pitfalls.md).
 */
export function classFinaleStats(
  standings: ReadonlyArray<{ correctCount: number; bestStreak: number }>,
  totalQuestions: number
): ClassFinaleStats {
  const players = standings.length;
  const correct = standings.reduce((sum, p) => sum + (p.correctCount || 0), 0);
  const questions = Number.isFinite(totalQuestions) && totalQuestions > 0 ? totalQuestions : 0;
  const attempts = players * questions;
  const topStreak = standings.reduce((best, p) => Math.max(best, p.bestStreak || 0), 0);
  return {
    players,
    correct,
    attempts,
    // A round that asked nothing, or a room nobody joined, reports 0 rather
    // than NaN — a percent sign next to "NaN" on a projector is the loudest
    // possible bug (Class 4: the silent divide that prints).
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    topStreak,
  };
}
