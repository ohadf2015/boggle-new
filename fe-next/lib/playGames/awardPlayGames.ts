/**
 * awardGameEnd — maps a finished game to Play Games Services rewards.
 *
 * Called fire-and-forget from the central game-end path (`trackGameEnd`). The
 * underlying bridge (`utils/nativePGS.ts`) is a no-op off Android and never
 * throws, so this is safe to invoke unconditionally on every platform.
 *
 * Currently wires the two events derivable from game-end alone:
 *   - score → High Score leaderboard (+ Daily Challenge for the daily mode)
 *   - win   → First Victory achievement
 *
 * TODO (need their own event sources, not game-end):
 *   firstWord (first valid word), wordSmith (incremental 500 words),
 *   polyglot (2+ languages), onARoll (7-day streak), dailyDevotee (incremental
 *   30 dailies). IDs + step counts live in `playGamesIds.ts`, helpers in the
 *   bridge — wire from the relevant event sites.
 */

import { submitLeaderboardScore, unlockAchievement } from '@/utils/nativePGS';
import { isAndroid } from '@/utils/platform';
import { PLAY_GAMES_LEADERBOARDS, PLAY_GAMES_ACHIEVEMENTS } from './playGamesIds';

/** Modes whose score should also feed the Daily Challenge leaderboard. */
const DAILY_MODES = new Set(['daily-challenge']);

export interface AwardGameEndArgs {
  mode: string;
  score: number;
  isWinner?: boolean;
}

export async function awardGameEnd({ mode, score, isWinner }: AwardGameEndArgs): Promise<void> {
  // Off Android the bridge is a no-op anyway — skip entirely so non-native
  // callers (web, unit tests) never even reach the lazy plugin import.
  if (!isAndroid()) return;

  const tasks: Array<Promise<unknown>> = [];

  if (score > 0) {
    tasks.push(submitLeaderboardScore(PLAY_GAMES_LEADERBOARDS.highScore, score));
    if (DAILY_MODES.has(mode)) {
      tasks.push(submitLeaderboardScore(PLAY_GAMES_LEADERBOARDS.dailyChallenge, score));
    }
  }

  if (isWinner) {
    tasks.push(unlockAchievement(PLAY_GAMES_ACHIEVEMENTS.firstVictory));
  }

  // allSettled: never reject, even though the bridge already swallows errors.
  await Promise.allSettled(tasks);
}
