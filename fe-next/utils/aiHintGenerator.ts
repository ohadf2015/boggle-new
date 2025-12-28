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
 * Get vowels for a specific language
 */
function getVowelsForLanguage(language: Language): Set<string> {
  const vowelSets: Record<Language, string[]> = {
    en: ['A', 'E', 'I', 'O', 'U'],
    he: ['א', 'ע', 'י', 'ו'], // Hebrew vowel letters (matres lectionis)
    sv: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'],
    ja: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'], // Hiragana/Katakana vowels
    es: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'],
    fr: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'],
    de: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'],
  };
  return new Set(vowelSets[language] || vowelSets['en']);
}

/**
 * Find positions of vowels in a word
 */
function findVowelPositions(word: string, language: Language): number[] {
  const vowels = getVowelsForLanguage(language);
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (vowels.has(word[i].toUpperCase())) {
      positions.push(i);
    }
  }
  return positions;
}

/**
 * Fallback hint generation (non-AI, basic hints)
 * Generates progressive hints that reveal vowels starting from the END of the word
 * Always keeps at least 50% of letters hidden (never reveal more than half)
 */
function generateFallbackHints(
  targetWord: string,
  language: Language
): HintGenerationResult {
  const wordLength = targetWord.length;
  const vowelPositions = findVowelPositions(targetWord, language);

  // Maximum letters we can ever reveal is 50% of the word (rounded down)
  const maxReveal = Math.floor(wordLength / 2);

  // Sort vowel positions from end to start (reverse order)
  const vowelsFromEnd = [...vowelPositions].sort((a, b) => b - a);

  // Get consonant positions from end to start
  const consonantPositions = [...Array(wordLength).keys()]
    .filter(i => !vowelPositions.includes(i))
    .sort((a, b) => b - a);

  // Progressive reveal: vowels first (from end), then consonants (from end)
  // Never reveal more than 50% of the word
  // Level 1: All blanks
  // Level 2: Last vowel only (1 letter max)
  // Level 3-5: Progressively reveal up to maxReveal letters

  const hints: HintLevel[] = [
    {
      level: 1,
      hint: generateBlanksDisplay(targetWord, []), // "_ _ _ _"
      unlockCost: 0, // Free - shown immediately
    },
  ];

  // Level 2: Reveal last vowel (or last letter if no vowels) - max 1 letter
  const lastVowelPos = vowelsFromEnd.length > 0 ? [vowelsFromEnd[0]] : [wordLength - 1];
  hints.push({
    level: 2,
    hint: generateBlanksDisplay(targetWord, lastVowelPos.slice(0, 1)),
    unlockCost: 4,
  });

  if (wordLength >= 4) {
    // Build reveal order: vowels from end, then consonants from end
    const revealOrder = [...vowelsFromEnd, ...consonantPositions];

    // Level 3: Reveal up to ceil(maxReveal * 0.5) letters
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    const level3Positions = revealOrder.slice(0, level3Count);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(targetWord, level3Positions.sort((a, b) => a - b)),
      unlockCost: 8,
    });

    // Level 4: Reveal up to ceil(maxReveal * 0.75) letters
    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    const level4Positions = revealOrder.slice(0, level4Count);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(targetWord, level4Positions.sort((a, b) => a - b)),
      unlockCost: 12,
    });

    // Level 5: Reveal exactly maxReveal letters (50% of word)
    const level5Positions = revealOrder.slice(0, maxReveal);
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(targetWord, level5Positions.sort((a, b) => a - b)),
      unlockCost: 16,
    });
  }
  // Note: 3-letter words are no longer valid targets in daily challenge (minimum is 4 letters)

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
 * Minimum word length for daily challenge is 4 letters
 */
export function calculateLifeReward(wordLength: number): number {
  if (wordLength < 4) return 0; // Words less than 4 letters not valid in daily challenge
  if (wordLength === 4) return 10;
  if (wordLength === 5) return 15;
  if (wordLength === 6) return 20;
  return 25; // 7+ letters
}

/**
 * Calculate clue tokens reward based on word length
 * Minimum word length for daily challenge is 4 letters
 */
export function calculateTokenReward(wordLength: number): number {
  if (wordLength < 4) return 0; // Words less than 4 letters not valid in daily challenge
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
