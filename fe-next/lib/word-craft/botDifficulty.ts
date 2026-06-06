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
}

const TUNING: Record<BotDifficulty, BotTuning> = {
  // Short words only (no bingos), large pool skewed low → frequently sub-optimal.
  easy: { maxLength: 4, skillVariance: 5 },
  // The previous global default — moderate, occasionally sharp.
  medium: { maxLength: 5, skillVariance: 2.5 },
  // Full length (bingo-capable), near-optimal selection.
  hard: { maxLength: 7, skillVariance: 0.5 },
};

export function botTuning(difficulty: BotDifficulty): BotTuning {
  return TUNING[difficulty] ?? TUNING[DEFAULT_BOT_DIFFICULTY];
}

export function isBotDifficulty(value: unknown): value is BotDifficulty {
  return typeof value === 'string' && (BOT_DIFFICULTIES as readonly string[]).includes(value);
}
