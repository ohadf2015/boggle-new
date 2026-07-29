/**
 * awardGameEnd — maps a finished game to Play Games Services rewards.
 *
 * Called fire-and-forget from the central game-end path (`trackGameEnd`). The
 * underlying bridge (`utils/nativePGS.ts`) is a no-op off Android and never
 * throws, so this is safe to invoke unconditionally on every platform.
 *
 * Wires every achievement derivable from game-end (+ a little local state):
 *   - score    → High Score leaderboard (+ Daily Challenge for the daily mode)
 *   - win      → First Victory
 *   - words>0  → First Word (once) + Word Smith (incremental, by word count)
 *   - language → Polyglot (once 2+ distinct languages played)
 *   - daily    → Daily Devotee (incremental, +1 per completed daily)
 *   - streak≥7 → On a Roll (global play-streak from useWinStreak)
 */

import { submitLeaderboardScore, unlockAchievement, incrementAchievement } from '@/utils/nativePGS';
import { isAndroid } from '@/utils/platform';
import { PLAY_GAMES_LEADERBOARDS, PLAY_GAMES_ACHIEVEMENTS } from './playGamesIds';
import {
  hasAwardedFirstWord,
  markFirstWordAwarded,
  hasAwardedPolyglot,
  markPolyglotAwarded,
  hasAwardedOnARoll,
  markOnARollAwarded,
  getPlayStreak,
  recordLanguagePlayed,
} from './awardState';

/** Consecutive-day play streak that unlocks On a Roll. */
const ON_A_ROLL_DAYS = 7;

/** Modes whose score should also feed the Daily Challenge leaderboard. */
const DAILY_MODES = new Set(['daily-challenge']);

export interface AwardGameEndArgs {
  mode: string;
  score: number;
  wordCount?: number;
  isWinner?: boolean;
  language?: string;
}

export async function awardGameEnd({
  mode,
  score,
  wordCount = 0,
  isWinner,
  language,
}: AwardGameEndArgs): Promise<void> {
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

  if (wordCount > 0) {
    // First Word: mark awarded only once the native unlock actually succeeds,
    // so a not-yet-signed-in player retries on a later game instead of skipping.
    if (!hasAwardedFirstWord()) {
      tasks.push(
        unlockAchievement(PLAY_GAMES_ACHIEVEMENTS.firstWord).then((r) => {
          if (r.success) markFirstWordAwarded();
        }),
      );
    }
    // Word Smith: server accumulates these increments toward 500.
    tasks.push(incrementAchievement(PLAY_GAMES_ACHIEVEMENTS.wordSmith, wordCount));
  }

  if (language && !hasAwardedPolyglot()) {
    const distinct = recordLanguagePlayed(language);
    if (distinct >= 2) {
      tasks.push(
        unlockAchievement(PLAY_GAMES_ACHIEVEMENTS.polyglot).then((r) => {
          if (r.success) markPolyglotAwarded();
        }),
      );
    }
  }

  if (DAILY_MODES.has(mode)) {
    // Daily Devotee: awardGameEnd is only invoked on a completed game.
    tasks.push(incrementAchievement(PLAY_GAMES_ACHIEVEMENTS.dailyDevotee, 1));
  }

  if (!hasAwardedOnARoll() && getPlayStreak() >= ON_A_ROLL_DAYS) {
    tasks.push(
      unlockAchievement(PLAY_GAMES_ACHIEVEMENTS.onARoll).then((r) => {
        if (r.success) markOnARollAwarded();
      }),
    );
  }

  // allSettled: never reject, even though the bridge already swallows errors.
  await Promise.allSettled(tasks);
}
