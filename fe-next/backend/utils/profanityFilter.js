/**
 * Profanity Filter Utility
 * Provides exact word matching to avoid false positives in non-Latin scripts
 */

const Filter = require('bad-words');

// Initialize bad words filter with exact word matching only
// The default bad-words library uses regex that causes false positives for non-Latin scripts (Hebrew, etc.)
const badWordsFilter = new Filter({ placeHolder: '*' });

// Get the list of bad words for exact matching
const badWordsList = new Set(badWordsFilter.list.map(w => w.toLowerCase()));

/**
 * Check if text contains profanity using exact word matching
 * This avoids false positives in Hebrew and other non-Latin scripts
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains profanity
 */
function isProfane(text) {
  if (!text) return false;
  // Split into words and check each one exactly (not substring matching)
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => badWordsList.has(word));
}

/**
 * Clean profanity from text using exact word matching
 * Only replaces exact bad words, not substrings
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text with profanity replaced by asterisks
 */
function cleanProfanity(text) {
  if (!text) return text;
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

module.exports = {
  isProfane,
  cleanProfanity
};
