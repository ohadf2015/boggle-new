import logger from '@/utils/logger';
import { POINT_COLORS } from '../../utils/consts';
import type { GameAchievement, WordObject } from './types';

/**
 * Longest word in a list, tolerating an empty or missing list.
 *
 * Several results surfaces used `words.reduce((a, b) => ...)` with no initial
 * value, which throws "Reduce of empty array with no initial value" the moment a
 * player finishes a round without a single valid word (Sentry JAVASCRIPT-NEXTJS-206).
 * Accepts plain strings or `{ word }` objects since both shapes are in use.
 */
export function longestWordOf(
  words: ReadonlyArray<string | { word?: string }> | null | undefined,
): string | undefined {
  let longest: string | undefined;
  for (const entry of words ?? []) {
    const word = typeof entry === 'string' ? entry : entry?.word;
    if (word && word.length > (longest?.length ?? 0)) longest = word;
  }
  return longest;
}

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
 * Most point color backgrounds need dark text for proper contrast
 */
export function getTextColor(points: number): string {
  // 1-point words have dark gray background (#2d2d44), need light text
  if (points === 1) return 'var(--neo-cream)';
  // Other point colors (cyan, orange, purple, pink) are light enough to need dark text
  return 'rgb(var(--neo-black))';
}

/**
 * Word summary statistics calculated from a word list
 */
export interface WordStats {
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  longestWord: string;
  avgWordLength: number;
  accuracy: number;
  totalComboBonus: number;
  totalFireRoundBonus: number;
}

/**
 * Categorized word lists
 */
export interface CategorizedWords {
  validWords: WordObject[];
  invalidWords: WordObject[];
  duplicateWords: WordObject[];
  wordsByPoints: Record<number, WordObject[]>;
  sortedPointGroups: number[];
}

/**
 * Categorize words into valid, invalid, and duplicate groups
 * Also groups valid words by point value for display
 */
export function categorizeWords(allWords: WordObject[] | undefined): CategorizedWords {
  if (!allWords || allWords.length === 0) {
    return {
      validWords: [],
      invalidWords: [],
      duplicateWords: [],
      wordsByPoints: {},
      sortedPointGroups: [],
    };
  }

  const duplicateWords = allWords.filter(w => w && w.isDuplicate);
  const invalidWords = allWords.filter(w => w && !w.isDuplicate && !w.validated);
  const validWords = allWords.filter(w => w && !w.isDuplicate && w.validated);

  // Group valid words by points
  const wordsByPoints: Record<number, WordObject[]> = {};
  validWords.forEach(wordObj => {
    const points = wordObj.score || 0;
    if (!wordsByPoints[points]) wordsByPoints[points] = [];
    wordsByPoints[points].push(wordObj);
  });

  // Sort words alphabetically within each point group
  Object.keys(wordsByPoints).forEach(points => {
    wordsByPoints[Number(points)]?.sort((a, b) => a.word.localeCompare(b.word));
  });

  // Sort point groups descending
  const sortedPointGroups = Object.keys(wordsByPoints)
    .map(Number)
    .sort((a, b) => b - a);

  return {
    validWords,
    invalidWords,
    duplicateWords,
    wordsByPoints,
    sortedPointGroups,
  };
}

/**
 * Calculate summary statistics from a word list
 */
export function calculateWordStats(allWords: WordObject[] | undefined): WordStats {
  if (!allWords || allWords.length === 0) {
    return {
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      longestWord: '',
      avgWordLength: 0,
      accuracy: 0,
      totalComboBonus: 0,
      totalFireRoundBonus: 0,
    };
  }

  const { validWords, invalidWords, duplicateWords } = categorizeWords(allWords);

  const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);
  const totalFireRoundBonus = validWords.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0);

  const longestWord = validWords.reduce((max, w) =>
    w.word.length > max.length ? w.word : max, ''
  );

  const totalLength = validWords.reduce((sum, w) => sum + w.word.length, 0);
  const avgWordLength = validWords.length > 0
    ? Math.round((totalLength / validWords.length) * 10) / 10
    : 0;

  const accuracy = allWords.length > 0
    ? Math.round((validWords.length / allWords.length) * 100)
    : 0;

  return {
    validCount: validWords.length,
    invalidCount: invalidWords.length,
    duplicateCount: duplicateWords.length,
    longestWord,
    avgWordLength,
    accuracy,
    totalComboBonus,
    totalFireRoundBonus,
  };
}
