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
 * Generate blanks display for a word with some letters revealed
 * E.g., revealPositions = [0, 2] for "WORD" -> "W _ R _"
 */
function generateBlanksDisplay(word: string, revealPositions: number[]): string {
  const chars: string[] = [];
  for (let i = 0; i < word.length; i++) {
    if (revealPositions.includes(i)) {
      chars.push(word[i].toUpperCase());
    } else {
      chars.push('_');
    }
  }
  return chars.join(' ');
}

/**
 * Fallback hint generation (non-AI, basic hints)
 * Generates progressive hints that reveal letters in blanks format
 * Ensures revealed letters are NOT adjacent (at least 1 space between)
 */
function generateFallbackHints(
  targetWord: string,
  language: Language
): HintGenerationResult {
  const wordLength = targetWord.length;

  // Progressive reveal positions with spacing between revealed letters
  // For 4-letter word "BIRD": [] -> [0] -> [0,2] -> [0,2,3] (never adjacent until final)
  // For 5-letter word "HOUSE": [] -> [0] -> [0,2] -> [0,2,4] -> [0,1,2,4]
  const hints: HintLevel[] = [
    {
      level: 1,
      hint: generateBlanksDisplay(targetWord, []), // "_ _ _ _"
      unlockCost: 0, // Free - shown immediately
    },
    {
      level: 2,
      hint: generateBlanksDisplay(targetWord, [0]), // "B _ _ _"
      unlockCost: 0, // Free - shown after 2 words found
    },
  ];

  // Add progressive hints - ensure non-adjacent reveals for earlier hints
  if (wordLength >= 4) {
    // Level 3: First and third letters (positions 0, 2) - not adjacent
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(targetWord, [0, 2]), // "B _ R _"
      unlockCost: 4,
    });

    // Level 4: First, third, and last (positions 0, 2, last) - spaced out
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(targetWord, [0, 2, wordLength - 1]), // "B _ R D"
      unlockCost: 6,
    });

    // Level 5: All but one letter - keep position 1 hidden (second letter)
    // This maintains some mystery while being very helpful
    const allButSecond: number[] = [];
    for (let i = 0; i < wordLength; i++) {
      if (i !== 1) allButSecond.push(i);
    }
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(targetWord, allButSecond), // "B _ R D"
      unlockCost: 8,
    });
  } else if (wordLength === 3) {
    // For 3-letter words - first and last (not adjacent)
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(targetWord, [0, 2]), // "C _ T"
      unlockCost: 4,
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
