import logger from '@/utils/logger';
import { POINT_COLORS } from '../../utils/consts';
import type { GameAchievement, WordObject } from './types';

// Lifetime/career achievement keys that should NOT be shown in game results
// These are cumulative achievements that don't apply to a single round
export const LIFETIME_ACHIEVEMENT_KEYS = new Set([
  'VETERAN',
  'CENTURION',
  'WORD_COLLECTOR',
  'WORD_HOARDER',
  'CHAMPION',
  'LEGEND',
  'POINT_MASTER',
  'POINT_KING',
  'DEDICATION',
  'LOYAL_PLAYER',
]);

// Achievement thresholds for validation (base thresholds, may scale with game duration)
// These are set to 50% of the actual thresholds to account for time scaling
export const ACHIEVEMENT_WORD_THRESHOLDS: Record<string, number> = {
  'WORDSMITH': 25,
  'LEXICON': 32,
  'UNSTOPPABLE': 37,
  'VOCABULARY_TITAN': 42,
  'DICTIONARY_DIVER': 32,
};

/**
 * Filter achievements to only show game-specific achievements
 * Excludes lifetime/career achievements and achievements that don't match player's round stats
 */
export function filterGameAchievements(
  achievements: GameAchievement[],
  allWords?: WordObject[]
): GameAchievement[] {
  if (!achievements || !Array.isArray(achievements)) return [];

  const validWordCount = allWords
    ? allWords.filter(w => w && !w.isDuplicate && w.validated).length
    : 0;

  return achievements.filter(ach => {
    const key = ach.key || ach.name || '';

    // Filter out lifetime achievements
    if (LIFETIME_ACHIEVEMENT_KEYS.has(key)) {
      logger.debug(`[RESULTS] Filtering out lifetime achievement: ${key}`);
      return false;
    }

    // Validate word-count-based achievements against actual round stats
    const threshold = ACHIEVEMENT_WORD_THRESHOLDS[key];
    if (threshold && validWordCount < threshold * 0.5) {
      logger.warn(`[RESULTS] Filtering out invalid achievement: ${key} (${validWordCount} words < ${threshold * 0.5} threshold)`);
      return false;
    }

    return true;
  });
}

/**
 * Get the color for a word based on its point value
 */
export function getPointColor(points: number): string {
  return POINT_COLORS[points] ?? POINT_COLORS[8] ?? 'var(--neo-pink)';
}

/**
 * Get text color based on background - ensure WCAG AA contrast (4.5:1)
 * All point color backgrounds need dark text for proper contrast
 */
export function getTextColor(points: number): string {
  // All point colors (cyan, orange, purple, pink, gray) are light enough to need dark text
  return 'rgb(var(--neo-black))';
}
