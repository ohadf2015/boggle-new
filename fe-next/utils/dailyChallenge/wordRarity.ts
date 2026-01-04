/**
 * Word Rarity Utilities
 *
 * Calculate and display word rarity for discovered words
 */

import type { Language } from '@/types';
import { WORD_FREQUENCY_TIERS } from './constants';

/**
 * Get the rarity score of a word (1-5, higher = rarer)
 * Returns 3 (average) for unknown words
 */
export function getWordRarity(word: string, language: Language): number {
  const wordUpper = word.toUpperCase();
  const tiers = WORD_FREQUENCY_TIERS[language] || {};
  return tiers[wordUpper] || 3; // Default to average rarity
}

/**
 * Get rarity label and emoji based on rarity score
 */
export function getRarityLabel(rarity: number): { label: string; emoji: string; color: string } {
  if (rarity >= 5) return { label: 'LEGENDARY', emoji: '💎', color: 'text-purple-500' };
  if (rarity >= 4) return { label: 'RARE', emoji: '🌟', color: 'text-yellow-500' };
  if (rarity >= 3) return { label: 'UNCOMMON', emoji: '✨', color: 'text-blue-500' };
  return { label: 'COMMON', emoji: '📖', color: 'text-gray-500' };
}

/**
 * Find the rarest word from a list of discovered words
 */
export function findRarestWord(
  words: Array<{ word: string }>,
  language: Language
): { word: string; rarity: number; label: string; emoji: string } | null {
  if (!words || words.length === 0) return null;

  let rarestWord = words[0].word;
  let highestRarity = getWordRarity(words[0].word, language);

  for (const { word } of words) {
    const rarity = getWordRarity(word, language);
    if (rarity > highestRarity) {
      highestRarity = rarity;
      rarestWord = word;
    }
  }

  const { label, emoji } = getRarityLabel(highestRarity);
  return { word: rarestWord, rarity: highestRarity, label, emoji };
}
