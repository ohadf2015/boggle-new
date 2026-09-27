/**
 * Country Utilities
 * Shared country-related functions
 *
 * Consolidates duplicated code from:
 * - fe-next/components/daily/DailyLeaderboard.tsx
 * - fe-next/components/daily/TabbedDailyLeaderboard.tsx
 */

/**
 * Convert a 2-letter ISO country code to flag emoji
 * Uses regional indicator symbols (Unicode range U+1F1E6 to U+1F1FF)
 *
 * @param countryCode - 2-letter ISO country code (e.g., "US", "IL", "SE")
 * @returns Flag emoji (e.g., "🇺🇸", "🇮🇱", "🇸🇪") or empty string if invalid
 *
 * @example
 * getCountryFlag('US') // returns "🇺🇸"
 * getCountryFlag('IL') // returns "🇮🇱"
 * getCountryFlag(null) // returns ""
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';

  // Convert each letter to regional indicator symbol
  // 'A' = 65, regional indicator for A = 127462 (0x1F1E6)
  // So offset is 127462 - 65 = 127397
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
