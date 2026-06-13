/**
 * WordCraft bot difficulty.
 *
 * The bot's raw engine (`findBestBotMove`) exhaustively searches every legal
 * placement, so left unchecked it is brutally strong — it always finds the
 * highest-scoring word and plays 7-tile bingos. We tame it with two existing
 * knobs rather than a separate handicap system:
 *
 *  - `maxLength`     — caps the word length the bot will even consider. Below 7
 *                      it can never play a bingo (the single biggest swing).
 *  - `skillVariance` — widens the pool of distinct words it picks from and skews
 *                      selection toward the weaker end, so it plays human-like
 *                      sub-optimal moves instead of the strict best.
 *  - `selectionSkew` — how hard, within that pool, the pick is pressed toward the
 *                      WEAKEST word. 1 = the legacy sqrt bias; higher = easier.
 *                      Lets us soften easy further without shrinking maxLength
 *                      (dropping to 3 would make the bot pass too often and look
 *                      dead rather than beatable).
 *  - `captureAggression` — multiplies the capture (cell-steal) bonus when the
 *                      bot ranks candidate words. In Conquest the winner holds
 *                      the most squares, so a bot that hunts the player's cells
 *                      is the single most punishing thing about it — more than
 *                      raw word score. Easy zeroes this so the bot only grows
 *                      its OWN ground; it still captures incidentally (the
 *                      mechanic always resolves), it just never seeks steals.
 *  - `turnSkipChance` — probability the bot voluntarily passes a turn instead of
 *                      playing. This is the ONE knob a player actually feels in
 *                      Conquest: territory accrues roughly in proportion to tiles
 *                      placed, so capping word length or widening the word pool
 *                      barely dents the bot's claim rate — but a bot that skips
 *                      a third of its turns hands the player free ground to seize.
 *                      Easy skips often, hard never skips.
 *
 * Default is EASY: the repeated user complaint is "the bot is too good", so the
 * out-of-the-box opponent must be comfortably beatable by a casual solo player.
 */
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];

export const DEFAULT_BOT_DIFFICULTY: BotDifficulty = 'easy';

export interface BotTuning {
  maxLength: number;
  skillVariance: number;
  selectionSkew: number;
  /** 0–1 multiplier on the bot's steal-seeking bonus. 1 = full thief, 0 = never seeks steals. */
  captureAggression: number;
  /** 0–1 probability the bot voluntarily passes its turn (hands the player free ground). */
  turnSkipChance: number;
}

const TUNING: Record<BotDifficulty, BotTuning> = {
  // Short words only (no bingos), wide pool pressed hard toward the weakest word,
  // never hunts steals, and skips ~1 turn in 3 → grows its own ground slowly with
  // weak words and regularly gifts the player a free turn. Easily beatable.
  easy: { maxLength: 4, skillVariance: 6, selectionSkew: 4, captureAggression: 0, turnSkipChance: 0.35 },
  // Moderate, occasionally sharp; chases some steals; rarely skips.
  medium: { maxLength: 5, skillVariance: 2.5, selectionSkew: 1.5, captureAggression: 0.5, turnSkipChance: 0.1 },
  // Full length (bingo-capable), near-optimal selection, full-on thief, never skips.
  hard: { maxLength: 7, skillVariance: 0.5, selectionSkew: 0.5, captureAggression: 1, turnSkipChance: 0 },
};

export function botTuning(difficulty: BotDifficulty): BotTuning {
  return TUNING[difficulty] ?? TUNING[DEFAULT_BOT_DIFFICULTY];
}

/**
 * Whether the bot should voluntarily skip (pass) this turn, given its tuning.
 * Pure + RNG-injectable so the cadence is testable without poking at the
 * effect's `Math.random`. A skip is the single most legible difficulty signal
 * in a territory game — see {@link BotTuning.turnSkipChance}.
 */
export function shouldBotSkipTurn(tuning: BotTuning, rng: () => number = Math.random): boolean {
  if (tuning.turnSkipChance <= 0) return false;
  return rng() < tuning.turnSkipChance;
}

export function isBotDifficulty(value: unknown): value is BotDifficulty {
  return typeof value === 'string' && (BOT_DIFFICULTIES as readonly string[]).includes(value);
}
