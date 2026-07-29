/**
 * Format a rank number with the appropriate ordinal suffix for the current locale.
 *
 * Uses translation keys: common.ordinal1, common.ordinal2, common.ordinal3, common.ordinalN
 * Each language defines its own format:
 * - English: 1st, 2nd, 3rd, 4th
 * - Hebrew: מקום 1 (place 1)
 * - Swedish: 1:a, 2:a, 3:e
 * - Japanese: 1位, 2位, 3位
 * - Spanish: 1°, 2°, 3°
 */
export function formatRankOrdinal(
  rank: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  // Try rank-specific keys first (1st, 2nd, 3rd have unique forms in many languages)
  if (rank === 1) return t('common.ordinal1');
  if (rank === 2) return t('common.ordinal2');
  if (rank === 3) return t('common.ordinal3');
  // Generic ordinal for 4th+
  return t('common.ordinalN', { n: rank });
}
