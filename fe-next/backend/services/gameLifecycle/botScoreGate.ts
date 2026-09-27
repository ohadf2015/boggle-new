/**
 * Bot score gate — keeps every bot, in every mode, within a competitive range
 * of the best human. One gate, tuned per mode through BotScoreTuning; callers
 * pass the bot's LIVE score (game.playerScores), never a mirrored counter that
 * could go stale across rounds.
 */

import { getLeaderboard } from '../../modules/gameStateManager';
import {
  getBotScoringStart,
  getOrSeedBotVariance,
} from '../../modules/botRoundState';

export {
  markBotScoringStart,
  clearBotScoringStart,
  clearBotVariance,
} from '../../modules/botRoundState';

/** Score target ratios per difficulty — bots aim for this % of best human score */
const BOT_SCORE_TARGET: Record<string, number> = {
  easy: 0.75,    // Easy bots aim for ~75% of best human
  medium: 0.95,  // Medium bots aim for ~95%
  hard: 1.15,    // Hard bots aim for ~115% — can beat you
};

/**
 * Grace period (ms) during which bots score freely at the start of a round.
 * Before any human has scored, bots should look active immediately — an
 * absolute point-ceiling was too easy to hit on a single Blast word with tile
 * bonuses, which silently froze bots for the whole round.
 */
const BOT_FREE_SCORING_GRACE_MS = 25_000;

/** Fallback ceiling applied only AFTER the grace window if no human has scored. */
const BOT_POST_GRACE_CEILING: Record<string, number> = {
  easy: 400,
  medium: 650,
  hard: 900,
};

/** Minimum floor: bots always get at least this many points before capping kicks in. */
const MIN_BOT_SCORE: Record<string, number> = { easy: 80, medium: 150, hard: 250 };

/**
 * Per-mode tuning for the gate. Lets short, fast modes (Wheel Rush) run gentler
 * bots than the default calibration WITHOUT forking the gate. All multipliers
 * default to 1 and graceMs defaults to the module-wide grace window.
 */
export interface BotScoreTuning {
  /** Multiplier on the relative score target (<1 = bots aim lower vs best human). */
  targetMult?: number;
  /** Multiplier on the per-difficulty minimum-score floor. */
  floorMult?: number;
  /** Multiplier on the post-grace fallback ceiling. */
  ceilingMult?: number;
  /**
   * Absolute post-grace ceiling before any human has scored, replacing the
   * per-difficulty BOT_POST_GRACE_CEILING entirely (ceilingMult is ignored
   * when this is set). For a single lump bonus (e.g. a Word Hunt target-found
   * credit) that must stay flat across difficulties — mirrors the pre-refactor
   * BOT_SCORE_BUFFER=20 cap, which a per-difficulty multiplier can't express.
   */
  noHumanCeiling?: number;
  /** Override the free-scoring grace window (ms) before any human has scored. */
  graceMs?: number;
}

/** The best human (non-bot) player's live score in a game. */
export function getBestHumanScore(gameCode: string): number {
  let best = 0;
  for (const entry of getLeaderboard(gameCode)) {
    if (!entry.isBot && entry.score > best) best = entry.score;
  }
  return best;
}

/**
 * May this bot bank `pendingScore` on top of `currentBotScore`?
 * Before any human scores: free inside the grace window, then a loose ceiling.
 * After: a difficulty target relative to the best human (±10% memoized
 * variance), never below the difficulty floor.
 */
export function shouldBotScore(
  gameCode: string,
  botUsername: string,
  currentBotScore: number,
  pendingScore: number,
  botDifficulty: string = 'medium',
  tuning?: BotScoreTuning,
): boolean {
  const bestHuman = getBestHumanScore(gameCode);
  const projectedScore = currentBotScore + pendingScore;

  if (bestHuman === 0) {
    const graceMs = tuning?.graceMs ?? BOT_FREE_SCORING_GRACE_MS;
    const startedAt = getBotScoringStart(gameCode);
    if (!startedAt || Date.now() - startedAt <= graceMs) return true;
    if (tuning?.noHumanCeiling !== undefined) return projectedScore <= tuning.noHumanCeiling;
    const baseCeiling = BOT_POST_GRACE_CEILING[botDifficulty] ?? BOT_POST_GRACE_CEILING.medium;
    return projectedScore <= baseCeiling * (tuning?.ceilingMult ?? 1);
  }

  const baseTarget = BOT_SCORE_TARGET[botDifficulty] ?? BOT_SCORE_TARGET.medium;
  const variance = getOrSeedBotVariance(gameCode, botUsername);
  const scoreTarget = bestHuman * baseTarget * variance * (tuning?.targetMult ?? 1);
  const baseFloor = MIN_BOT_SCORE[botDifficulty] ?? MIN_BOT_SCORE.medium;
  const floor = baseFloor * (tuning?.floorMult ?? 1);
  return projectedScore <= Math.max(scoreTarget, floor);
}
