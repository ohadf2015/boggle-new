import { getXpProgress } from '@/backend/modules/xpManager';
import type { XpGainedData, LevelUpData } from '@/types/components';

interface StreakLike {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

export interface ImprovementSummaryInput {
  xp: XpGainedData | null;
  levelUp: LevelUpData | null;
  streak: StreakLike | null;
}

export interface ImprovementSummary {
  /** XP earned THIS game (server-authoritative). 0 when no xp event (e.g. guest). */
  xpEarned: number;
  /** Current level, only present when xp data exists. */
  level?: number;
  /** Progress within the current level, 0–100; only present with xp data. */
  levelProgressPct?: number;
  /** True when this game crossed at least one level boundary. */
  leveledUp: boolean;
  /** First newly-unlocked title, if any. */
  newTitle?: string;
  /** Current win streak when meaningful (>= 2), else undefined. */
  streak?: number;
  bestStreak?: number;
}

/**
 * Build the results "Your Progress" model from ONLY server-authoritative signals
 * (XP, level-up, win streak). Deliberately ignores localStorage game history:
 * that history tags mode as single|multiplayer|daily, so cross-mode score scales
 * make any "personal best for this mode" claim meaningless.
 *
 * Honest fallbacks: never invents XP, never shows a lone streak of 1, and returns
 * `null` when there is nothing reliable to display (so the panel renders nothing
 * rather than an empty shell).
 *
 * Pure.
 */
export function selectImprovementSummary(
  input: ImprovementSummaryInput,
): ImprovementSummary | null {
  const { xp, levelUp, streak } = input;

  const xpEarned = xp ? Math.max(0, Math.round(xp.xpEarned)) : 0;
  const meaningfulStreak = streak && streak.currentStreak >= 2 ? streak.currentStreak : undefined;

  // Nothing reliable to show → render nothing.
  if (!xp && meaningfulStreak === undefined) return null;

  const summary: ImprovementSummary = {
    xpEarned,
    leveledUp: !!levelUp && levelUp.levelsGained > 0,
  };

  if (xp) {
    const progress = getXpProgress(xp.newTotalXp);
    summary.level = xp.newLevel;
    summary.levelProgressPct = progress.progressPercent;
  }

  if (summary.leveledUp && levelUp && levelUp.newTitles.length > 0) {
    summary.newTitle = levelUp.newTitles[0];
  }

  if (meaningfulStreak !== undefined && streak) {
    summary.streak = meaningfulStreak;
    summary.bestStreak = streak.bestStreak;
  }

  return summary;
}
