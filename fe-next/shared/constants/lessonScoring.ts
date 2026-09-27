/**
 * What a teacher's lesson word is worth on top of its ordinary word score.
 *
 * `fromLesson` was computed on the server, stored on every WordDetail and sent
 * to the client long before this constant existed — and it paid nothing. A
 * classroom playing its teacher's vocabulary scored identically to a classroom
 * playing a random board, so the one mechanic tying the game to the lesson was
 * decorative.
 *
 * FLAT, deliberately — not a percentage of the word score:
 *
 *  - Speed-neutral. `calculateWordScore` already multiplies in the player's
 *    combo level, and combo is a streak/speed axis. A percentage bonus would
 *    compound with it, so the student who taps fastest would collect the largest
 *    vocabulary reward. Time pressure may exist in a mode; it must not be the
 *    axis that decides who learned the words.
 *  - Length-neutral. A percentage pays far more for `photosynthesis` than for
 *    `cell`, which steers a class toward the long words and away from the short
 *    ones. The teacher put every word on the list for the same reason, so every
 *    word on the list pays the same.
 *  - Legible. A student can hold "teacher words are worth five more" in their
 *    head mid-round. `+25%, rounded up, of a combo-scaled base` is not a rule
 *    anyone plays to.
 *
 * Magnitude: an ordinary word scores `length - 1` before combo, so a 4-letter
 * word is 3 points. +5 more than doubles a typical find — big enough that
 * hunting the teacher's words is visibly the winning strategy, small enough that
 * one lucky find does not erase a round. For reference it sits above the golden
 * letter bonus (+25%, usually 1-2) and below the special-word bounty (+10).
 *
 * The server is the only thing that computes this; the client displays the
 * `lessonBonus` it is sent. Two sides computing the "same" number independently
 * always drift, and this repo already tracks one such divergence.
 */
export const LESSON_WORD_BONUS = 5;

/**
 * Points to add for a single accepted word.
 *
 * Trivial today, and named anyway: it is the one place the rule lives, so a
 * future change (per-difficulty, teacher-configurable, decaying on repeat
 * exposure) has an obvious home and a test seam instead of a magic `+ 5`
 * inlined at the two call sites that must agree.
 */
export function lessonWordBonus(fromLesson: boolean): number {
  return fromLesson ? LESSON_WORD_BONUS : 0;
}
