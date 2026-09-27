/**
 * Word Hunt Multiplayer Constants
 * Constants for word-hunt mode in multiplayer games
 */

export const HUNT_LIFE_DRAIN_RATE = 1.2;

/** Accelerating drain phases */
export const HUNT_DRAIN_PHASE_1_RATE = 0.8;
export const HUNT_DRAIN_PHASE_1_DURATION = 30;
export const HUNT_DRAIN_PHASE_2_RATE = 1.2;
export const HUNT_DRAIN_PHASE_2_DURATION = 30;
export const HUNT_DRAIN_PHASE_3_RATE = 2.0;

/** Get drain rate based on elapsed seconds since game start */
export function getDrainRate(elapsedSeconds: number): number {
  if (elapsedSeconds < HUNT_DRAIN_PHASE_1_DURATION) {
    return HUNT_DRAIN_PHASE_1_RATE;
  }
  if (elapsedSeconds < HUNT_DRAIN_PHASE_1_DURATION + HUNT_DRAIN_PHASE_2_DURATION) {
    return HUNT_DRAIN_PHASE_2_RATE;
  }
  return HUNT_DRAIN_PHASE_3_RATE;
}
export const HUNT_INITIAL_LIFE = 100;
export const HUNT_FIRST_FINDER_BONUS = 20;
/** Decreasing bonuses for 1st, 2nd, 3rd, and subsequent finders */
export const HUNT_SUBSEQUENT_FINDER_BONUSES = [20, 12, 8, 5];
export const HUNT_WRONG_GUESS_PENALTY = 10;
/** Score awarded per letter when a non-target board word is found in word-hunt mode */
export const BOARD_WORD_SCORE_PER_LETTER = 2;
// Target words are 5-7 letters: long enough to be a fun reveal and to leave
// room for clue-farming, short enough to stay common/recognizable.
export const HUNT_TARGET_MIN_LENGTH = 5;
export const HUNT_TARGET_MAX_LENGTH = 7;
export const HUNT_LIFE_DRAIN_INTERVAL_MS = 1000;

/** Minimum seconds before discovery clues start being revealed */
export const HUNT_CLUE_DELAY_MS = 15_000;
/** Minimum interval between clue broadcasts per player (ms) */
export const HUNT_CLUE_THROTTLE_MS = 5_000;

/** Life restored per word length */
export const HUNT_LIFE_RESTORE: Record<number, number> = {
  3: 5,
  4: 8,
  5: 12,
  6: 18,
  7: 24,
  8: 30,
};

/** Get life restored for a word of given length */
export function getHuntLifeBonus(wordLength: number): number {
  if (wordLength >= 8) return HUNT_LIFE_RESTORE[8];
  return HUNT_LIFE_RESTORE[wordLength] || 2;
}
