/**
 * AI Hint Generator for Word Hunt Survival Mode
 * Generates progressive, contextual hints using Claude API
 */

import type { Language } from '@/types';

export interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number; // How many words needed to unlock (auto-unlock system)
}

export interface HintGenerationResult {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
}

/**
 * Generate progressive hints for a target word using AI
 * Hints start vague and get increasingly specific
 */
export async function generateProgressiveHints(
  targetWord: string,
  language: Language = 'en'
): Promise<HintGenerationResult> {
  try {
    const response = await fetch('/api/generate-word-hints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWord, language }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate hints');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating hints:', error);
    // Fallback to basic hints if AI fails
    return generateFallbackHints(targetWord, language);
  }
}

/**
 * Fallback hint generation (non-AI, basic hints)
 */
function generateFallbackHints(
  targetWord: string,
  language: Language
): HintGenerationResult {
  const wordLength = targetWord.length;
  const maxRevealCount = wordLength - 1; // Never reveal all letters (N-1 max)

  // For 4-letter words, we can reveal max 3 letters
  // Hint progression: general -> specific, but never reveal position 4 (last unrevealed)
  const hints: HintLevel[] = [
    {
      level: 1,
      hint: `The target is a ${wordLength}-letter word`,
      unlockCost: 0, // Free - shown immediately
    },
    {
      level: 2,
      hint: `It starts with "${targetWord[0]}"`,
      unlockCost: 0, // Free - shown after 2 words found
    },
  ];

  // Add progressive hints that reveal letters but never all
  if (wordLength >= 4) {
    hints.push({
      level: 3,
      hint: `The second letter is "${targetWord[1]}"`,
      unlockCost: 4, // Auto-unlock after 4 words found
    });

    hints.push({
      level: 4,
      hint: `It ends with "${targetWord[targetWord.length - 1]}"`,
      unlockCost: 6, // Auto-unlock after 6 words found
    });

    // Final hint reveals N-2 letters (for 4-letter word: show 2 letters with blanks)
    const revealedPart = targetWord.substring(0, maxRevealCount - 1);
    const blanks = '_'.repeat(wordLength - revealedPart.length);
    hints.push({
      level: 5,
      hint: `Almost there! ${revealedPart}${blanks}`,
      unlockCost: 8, // Auto-unlock after 8 words found
    });
  }

  return {
    hints,
    category: 'Unknown',
    exampleSentence: `The ${targetWord} was beautiful.`,
  };
}

/**
 * Get the next available hint based on words found
 */
export function getNextHint(
  hints: HintLevel[],
  wordsFoundCount: number
): HintLevel | null {
  // Find the most advanced hint that's unlocked
  const availableHints = hints.filter(h => h.unlockCost <= wordsFoundCount);
  if (availableHints.length === 0) return null;

  return availableHints[availableHints.length - 1];
}

/**
 * Calculate life points reward based on word length
 */
export function calculateLifeReward(wordLength: number): number {
  if (wordLength === 3) return 5;
  if (wordLength === 4) return 10;
  if (wordLength === 5) return 15;
  if (wordLength === 6) return 20;
  return 25; // 7+ letters
}

/**
 * Calculate clue tokens reward based on word length
 */
export function calculateTokenReward(wordLength: number): number {
  if (wordLength === 3) return 0;
  if (wordLength === 4) return 1;
  if (wordLength === 5) return 2;
  if (wordLength === 6) return 3;
  return 4; // 7+ letters
}

/**
 * Calculate efficiency score for leaderboard
 * Higher is better
 */
export function calculateEfficiencyScore(
  lifeRemaining: number,
  unusedTokens: number,
  guessesUsed: number,
  wordsFound: number,
  solved: boolean
): number {
  if (!solved) return 0;

  return (
    (lifeRemaining * 10) +
    (unusedTokens * 5) +
    (wordsFound * 3) -
    (guessesUsed * 2)
  );
}

/**
 * Clue shop items and their costs
 */
export interface ClueShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

export const CLUE_SHOP_ITEMS: ClueShopItem[] = [
  {
    id: 'reveal_letter',
    name: 'Reveal Letter',
    description: 'Reveal a random letter in the target word (keeps 1 letter hidden)',
    cost: 1,
    icon: '💡',
  },
  {
    id: 'eliminate_letters',
    name: 'Eliminate Wrong Letters',
    description: 'Remove 3 letters that are NOT in the word',
    cost: 2,
    icon: '❌',
  },
  {
    id: 'example_sentence',
    name: 'Example Sentence',
    description: 'See the word used in a sentence (word is blank)',
    cost: 3,
    icon: '📝',
  },
  {
    id: 'reveal_category',
    name: 'Reveal Category',
    description: 'Show the word category (e.g., "Animals > Mammals")',
    cost: 5,
    icon: '🏷️',
  },
];
