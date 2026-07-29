/**
 * Adventure Sharing — build shareable progress snapshots.
 */

import type { LevelCompletion, AdventureShareData, MasteryTier } from '@/types/adventure';
import { LEVELS_PER_WORLD } from './constants';

/** Build share data from player state */
export function buildAdventureShareData(
  completions: LevelCompletion[],
  bestStreak: number,
  masteryTiers: MasteryTier[],
): AdventureShareData {
  // Count worlds where all 7 levels are completed
  const worldLevelCounts: Record<number, number> = {};
  for (const c of completions) {
    worldLevelCounts[c.world] = (worldLevelCounts[c.world] || 0) + 1;
  }
  const worldsCompleted = Object.values(worldLevelCounts).filter(
    count => count >= LEVELS_PER_WORLD
  ).length;

  const totalStars = completions.reduce((sum, c) => sum + c.stars, 0);
  const maxStars = 10 * LEVELS_PER_WORLD * 3; // 10 worlds × 7 levels × 3 stars

  // Boss levels are level 7 of each world
  const bossesDefeated = completions.filter(c => c.level === 7).length;

  return {
    worldsCompleted,
    totalStars,
    maxStars,
    bossesDefeated,
    bestStreak,
    masteryTiers: masteryTiers.length > 0 ? [...masteryTiers] : [],
  };
}

/** Format share data as plain text for social sharing */
export function formatShareText(data: AdventureShareData): string {
  const lines: string[] = [
    `⭐ ${data.totalStars}/${data.maxStars} Stars`,
    `🌍 ${data.worldsCompleted}/10 Worlds`,
    `👹 ${data.bossesDefeated} Bosses Defeated`,
  ];
  if (data.bestStreak > 0) {
    lines.push(`🔥 ${data.bestStreak}-Day Streak`);
  }
  lines.push('', '🎮 LexiClash Adventure Mode');
  return lines.join('\n');
}
