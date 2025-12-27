/**
 * Profanity Filter Utility
 * Provides exact word matching to avoid false positives in non-Latin scripts
 */

import Filter from 'bad-words';

// Initialize bad words filter with exact word matching only
// The default bad-words library uses regex that causes false positives for non-Latin scripts (Hebrew, etc.)
const badWordsFilter = new Filter({ placeHolder: '*' });

// Get the list of bad words for exact matching
const badWordsList = new Set<string>(badWordsFilter.list.map((w: string) => w.toLowerCase()));

/**
 * Check if text contains profanity using exact word matching
 * This avoids false positives in Hebrew and other non-Latin scripts
 */
export function isProfane(text: string | null | undefined): boolean {
  if (!text) return false;
  // Split into words and check each one exactly (not substring matching)
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => badWordsList.has(word));
}

/**
 * Clean profanity from text using exact word matching
 * Only replaces exact bad words, not substrings
 */
export function cleanProfanity(text: string | null | undefined): string {
  if (!text) return text || '';
  // Split into words, replace bad words, rejoin
  return text.split(/(\s+)/).map(part => {
    // Check if this part (ignoring whitespace) is a bad word
    const lowerPart = part.toLowerCase();
    if (badWordsList.has(lowerPart)) {
      return '*'.repeat(part.length);
    }
    return part;
  }).join('');
}
