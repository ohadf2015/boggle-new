/**
 * Anagram solver logic
 * Used server-side by the anagram page route
 */

/**
 * Count occurrences of each letter in a string
 */
export function getLetterCounts(str: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of str) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

/**
 * Check if a word can be formed from available letters
 */
function canFormWord(word: string, available: Record<string, number>): boolean {
  const needed = getLetterCounts(word);
  for (const [letter, count] of Object.entries(needed)) {
    if ((available[letter] || 0) < count) return false;
  }
  return true;
}

/**
 * Validate and normalize letter input for anagram solver
 * - Must be a-z only (no numbers, spaces, special chars)
 * - Must be 2-10 characters
 * - Max 4 of any single letter (sanity check against spam)
 * - Normalizes to lowercase
 *
 * @param raw - Raw input string
 * @returns Normalized letter string, or null if invalid
 */
export function parseLetters(raw: string): string | null {
  // Normalize to lowercase and filter to a-z only
  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');

  // Length check: 2-10 characters
  if (normalized.length < 2 || normalized.length > 10) {
    return null;
  }

  // Sanity check: no more than 4 of any single letter
  const counts = getLetterCounts(normalized);
  for (const count of Object.values(counts)) {
    if (count > 4) {
      return null;
    }
  }

  return normalized;
}

/**
 * Find all anagrams that can be formed from the given letters
 *
 * @param letters - Normalized letter string (from parseLetters)
 * @param dictionary - Array of valid words (all lowercase)
 * @returns Array of anagrams, sorted by length (desc) then alphabetically, capped at 300
 */
export function findAnagramsFromLetters(
  letters: string,
  dictionary: string[]
): string[] {
  if (!letters) return [];

  const letterCounts = getLetterCounts(letters);
  const results: string[] = [];

  for (const word of dictionary) {
    // Filter: word length must be 2-input length, no shorter than 2 letters
    if (word.length < 2 || word.length > letters.length) continue;

    // Check if word can be formed
    if (canFormWord(word, letterCounts)) {
      results.push(word);
    }
  }

  // Sort by length descending, then alphabetically
  results.sort((a, b) => b.length - a.length || a.localeCompare(b));

  // Cap at 300 for SSR performance
  return results.slice(0, 300);
}
