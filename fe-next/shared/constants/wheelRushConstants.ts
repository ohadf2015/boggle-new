/**
 * Wheel Rush Multiplayer Constants
 * Shared tuning knobs for wheel-rush MP mode.
 */

/** Default round duration in seconds. 60s = fast 1-minute rounds (design intent). Host can still override via timerSeconds. */
export const WHEEL_RUSH_DURATION_SEC = 60;

/**
 * First-Finder bonus (flat points) awarded to the very first player in the room
 * to submit a given word. Parallel-discovery model: the word stays open and
 * claimable for everyone else at base score — the bonus is the only competitive
 * edge for finding it first, replacing the old lock/steal mechanic.
 */
export const WHEEL_RUSH_FIRST_FINDER_BONUS = 5;

/** Fog-of-war: opponent words shown as count-only for this many ms after round start */
export const WHEEL_RUSH_FOG_MS = 10_000;

/** Min word length accepted (matches daily wheel) */
export const WHEEL_RUSH_MIN_WORD_LEN = 3;

/** Pangram bonus — uses all 7 letters */
export const WHEEL_RUSH_PANGRAM_BONUS = 50;

/**
 * Score multiplier applied when a player re-submits a word they already
 * claimed. Re-typing a found word used to score nothing (rejected as
 * "duplicate") — a dead end that felt punishing. It now still pays out,
 * just at a fraction of the base value, so replaying a word is never a
 * wasted submission.
 */
export const WHEEL_RUSH_REPEAT_SCORE_FACTOR = 0.25;

/**
 * ── Bot difficulty balancing (Wheel Rush MP) ──
 *
 * Players reported bots that "predict words instantly" and dominate the round.
 * Two knobs soften them into human-plausible opponents:
 *
 * 1. Artificial thinking delay — bots wait a random interval between moves
 *    instead of firing on the classic sub-second cadence.
 * 2. Per-turn success rate — on each turn a bot only *sometimes* lands a valid
 *    word; otherwise it "misses" (skips the turn) or downgrades to a shorter,
 *    lower-scoring word. Modelled after a real player's hit rate.
 */

/**
 * Min/max artificial "thinking" delay (ms) a bot waits before each move.
 * Bumped up again (was 3–7s) — players still found bots too relentless at
 * that cadence for a 60s round.
 */
export const WHEEL_RUSH_BOT_THINK_MIN_MS = 4_000;
export const WHEEL_RUSH_BOT_THINK_MAX_MS = 9_500;

/**
 * Per-turn probability a bot successfully lands its intended (best available)
 * word. On a miss it either skips the turn or picks a shorter word. Lowered
 * another notch across the board (was 50/65/80%) — bots still dominated
 * rounds at the old rates.
 */
export const WHEEL_RUSH_BOT_SUCCESS_RATE: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 0.35,
  medium: 0.5,
  hard: 0.65,
};

/**
 * When a bot "misses", the chance it skips the turn entirely (finds nothing)
 * vs. downgrading to a shorter word from its remaining pool. Raised so a
 * miss more often means nothing at all, not just a smaller word.
 */
export const WHEEL_RUSH_BOT_SKIP_ON_MISS = 0.6;
