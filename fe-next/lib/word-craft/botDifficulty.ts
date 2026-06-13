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
 *                      raw word score. Easy turns this down so the bot mostly
 *                      grows its OWN ground instead of robbing yours; it still
 *                      captures incidentally (the mechanic always resolves), it
 *                      just no longer goes out of its way to.
 *
 * Default is EASY: the literal user complaint was "the bot is too good", so the
 * out-of-the-box opponent must be beatable by a casual solo player.
 */
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];

export const DEFAULT_BOT_DIFFICULTY: BotDifficulty = 'easy';

export interface BotTuning {
  maxLength: number;
  skillVariance: number;
  selectionSkew: number;
  /** 0–1 multiplier on the bot's steal-seeking bonus. 1 = full thief. */
  captureAggression: number;
}

const TUNING: Record<BotDifficulty, BotTuning> = {
  // Short words only (no bingos), wide pool pressed hard toward the weakest word,
  // and barely any cell-hunting → grows its own ground with weak words and rarely
  // robs the player. Comfortably beatable by a casual player.
  easy: { maxLength: 4, skillVariance: 6, selectionSkew: 4, captureAggression: 0.25 },
  // Moderate, occasionally sharp; chases some steals.
  medium: { maxLength: 5, skillVariance: 2.5, selectionSkew: 1.5, captureAggression: 0.7 },
  // Full length (bingo-capable), near-optimal selection, full-on thief.
  hard: { maxLength: 7, skillVariance: 0.5, selectionSkew: 0.5, captureAggression: 1 },
};

export function botTuning(difficulty: BotDifficulty): BotTuning {
  return TUNING[difficulty] ?? TUNING[DEFAULT_BOT_DIFFICULTY];
}

export function isBotDifficulty(value: unknown): value is BotDifficulty {
  return typeof value === 'string' && (BOT_DIFFICULTIES as readonly string[]).includes(value);
}
