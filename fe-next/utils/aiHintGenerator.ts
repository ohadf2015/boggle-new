/**
 * AI Hint Generator for Word Hunt Survival Mode
 * Generates progressive, contextual hints using Claude API
 *
 * Hint System Overview:
 * - Level 1: All blanks (free)
 * - Level 2: First vowel revealed (4 words found)
 * - Level 3: 25% letters revealed (8 words found)
 * - Level 4: 37.5% letters revealed (12 words found)
 * - Level 5: 50% letters revealed (16 words found)
 *
 * Additional purchasable clues:
 * - Category hint (semantic category path)
 * - Example sentence (contextual usage)
 * - Letter elimination (removes wrong letters from consideration)
 * - Direct letter reveal (reveals a specific letter)
 */

import type { Language } from '@/types';

// ============================================
// Type Definitions
// ============================================

export interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number; // How many words needed to unlock (auto-unlock system)
}

export interface HintGenerationResult {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
  wordType?: string; // noun, verb, adjective, etc.
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ClueShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

// ============================================
// Constants
// ============================================

/**
 * Hint unlock costs - words that need to be found to unlock each level
 */
export const HINT_UNLOCK_COSTS = {
  LEVEL_1: 0,  // Free - shown immediately
  LEVEL_2: 4,  // 4 words to unlock
  LEVEL_3: 8,  // 8 words to unlock
  LEVEL_4: 12, // 12 words to unlock
  LEVEL_5: 16, // 16 words to unlock
} as const;

/**
 * Clue shop items and their costs (in clue tokens earned from finding words)
 * Costs increased 3x for score-first UI (auto-unlocks are hidden, so difficulty increased)
 * Players earn 1-4 tokens per word found based on length
 */
export const CLUE_SHOP_ITEMS: ClueShopItem[] = [
  {
    id: 'reveal_letter',
    name: 'Reveal Letter',
    description: 'Reveal a random letter in the target word (keeps 1 letter hidden)',
    cost: 3, // Increased from 1 (3x harder)
    icon: '💡',
  },
  {
    id: 'reveal_category',
    name: 'Reveal Category',
    description: 'Show the word category (e.g., "Animals > Mammals")',
    cost: 9, // Increased from 3 (3x harder)
    icon: '🏷️',
  },
  {
    id: 'example_sentence',
    name: 'Example Sentence',
    description: 'See the word used in a sentence (word is blank)',
    cost: 15, // Increased from 5 (3x harder)
    icon: '📝',
  },
];

/**
 * Language-specific vowel sets for hint generation
 */
const VOWEL_SETS: Record<Language, string[]> = {
  en: ['A', 'E', 'I', 'O', 'U'],
  he: ['א', 'ע', 'י', 'ו'], // Hebrew vowel letters (matres lectionis)
  sv: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'],
  ja: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'], // Hiragana/Katakana vowels
  es: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'],
  fr: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'],
  de: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'],
};

// ============================================
// Core Hint Generation Functions
// ============================================

/**
 * Extended hint generation result including additional AI-generated fields
 */
export interface ExtendedHintGenerationResult extends HintGenerationResult {
  lettersToEliminate?: string[];
  tokenUsage?: {
    input: number;
    output: number;
  };
}

/**
 * Configuration for hint generation requests
 */
interface HintRequestConfig {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

const DEFAULT_CONFIG: Required<HintRequestConfig> = {
  timeoutMs: 12000,      // 12 second timeout (allow for AI processing)
  retryCount: 1,         // One retry on failure
  retryDelayMs: 1000,    // 1 second between retries
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is likely transient and worth retrying
 */
function isRetryableError(error: unknown, response?: Response): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Specific HTTP status codes that are retryable
  if (response) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(response.status);
  }

  return false;
}

/**
 * Validate the structure of API response data
 */
function validateHintResponse(data: unknown): data is ExtendedHintGenerationResult {
  if (!data || typeof data !== 'object') return false;

  const response = data as Record<string, unknown>;

  // Required: hints array with at least one entry
  if (!Array.isArray(response.hints) || response.hints.length === 0) {
    return false;
  }

  // Validate each hint has required structure
  for (const hint of response.hints) {
    if (
      typeof hint !== 'object' ||
      hint === null ||
      typeof (hint as Record<string, unknown>).level !== 'number' ||
      typeof (hint as Record<string, unknown>).hint !== 'string' ||
      typeof (hint as Record<string, unknown>).unlockCost !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Generate progressive hints for a target word using AI
 *
 * This function:
 * 1. Calls the backend API to get AI-enhanced hints
 * 2. Implements retry logic for transient failures
 * 3. Falls back to algorithmic hints if AI is unavailable
 * 4. Returns a structured hint progression with category, example, and elimination letters
 *
 * @param targetWord - The word to generate hints for
 * @param language - The language of the word
 * @param config - Optional configuration for timeouts and retries
 * @returns Promise resolving to hint generation result
 */
export async function generateProgressiveHints(
  targetWord: string,
  language: Language = 'en',
  config: HintRequestConfig = {}
): Promise<ExtendedHintGenerationResult> {
  const { timeoutMs, retryCount, retryDelayMs } = { ...DEFAULT_CONFIG, ...config };

  // Input validation
  if (!targetWord || typeof targetWord !== 'string') {
    console.error('[HintGenerator] Invalid target word:', targetWord);
    return generateFallbackHints('WORD', 'en');
  }

  const normalizedWord = targetWord.toUpperCase().trim();
  if (normalizedWord.length < 2) {
    console.error('[HintGenerator] Word too short:', normalizedWord);
    return generateFallbackHints(normalizedWord || 'WORD', language);
  }

  let lastError: Error | null = null;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    // Add delay between retries
    if (attempt > 0) {
      console.info(`[HintGenerator] Retry attempt ${attempt} for ${normalizedWord}`);
      await sleep(retryDelayMs);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('/api/generate-word-hints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          targetWord: normalizedWord,
          language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastResponse = response;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        lastError = new Error(`API error ${response.status}: ${errorText}`);

        // Check if we should retry
        if (isRetryableError(null, response) && attempt < retryCount) {
          console.warn(`[HintGenerator] Retryable error: ${response.status}`);
          continue;
        }

        console.error('[HintGenerator] API error:', response.status, errorText);
        return generateFallbackHints(normalizedWord, language);
      }

      // Check content-type before parsing as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const responseText = await response.text().catch(() => '');
        console.warn('[HintGenerator] Non-JSON response received:', contentType, responseText.substring(0, 100));
        return generateFallbackHints(normalizedWord, language);
      }

      // Safely parse JSON with error handling
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('[HintGenerator] Failed to parse JSON response:', parseError);
        return generateFallbackHints(normalizedWord, language);
      }

      // Validate response structure
      if (!validateHintResponse(data)) {
        console.warn('[HintGenerator] Invalid API response structure, using fallback');
        return generateFallbackHints(normalizedWord, language);
      }

      // Build the result with all available fields
      const result: ExtendedHintGenerationResult = {
        hints: data.hints,
        category: data.category || 'Unknown',
        exampleSentence: data.exampleSentence || generateDefaultExampleSentence(normalizedWord, language),
        wordType: data.wordType,
        difficulty: data.difficulty,
      };

      // Include optional fields if present
      if (data.lettersToEliminate && Array.isArray(data.lettersToEliminate)) {
        result.lettersToEliminate = data.lettersToEliminate;
      }

      if (data.tokenUsage) {
        result.tokenUsage = data.tokenUsage;
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        lastError = error;

        if (error.name === 'AbortError') {
          console.warn('[HintGenerator] Request timed out');
          // Timeouts are retryable
          if (attempt < retryCount) {
            continue;
          }
        } else if (isRetryableError(error, lastResponse) && attempt < retryCount) {
          console.warn(`[HintGenerator] Retryable error: ${error.message}`);
          continue;
        }
      }

      console.error('[HintGenerator] Error generating hints:', error);
    }
  }

  // All attempts failed, return fallback
  if (lastError) {
    console.error('[HintGenerator] All attempts failed:', lastError.message);
  }
  return generateFallbackHints(normalizedWord, language);
}

/**
 * Generate a default example sentence for fallback scenarios
 */
function generateDefaultExampleSentence(word: string, language: Language): string {
  const templates: Record<Language, string[]> = {
    en: [
      `I saw a beautiful ${word.toLowerCase()} today.`,
      `The ${word.toLowerCase()} was quite impressive.`,
      `Have you ever seen such a ${word.toLowerCase()}?`,
    ],
    he: [
      `ראיתי ${word} יפה היום.`,
      `ה${word} היה מרשים מאוד.`,
    ],
    sv: [
      `Jag såg en vacker ${word.toLowerCase()} idag.`,
      `${word} var mycket imponerande.`,
    ],
    ja: [
      `今日、美しい${word}を見ました。`,
      `その${word}はとても印象的でした。`,
    ],
    es: [
      `Hoy vi un hermoso ${word.toLowerCase()}.`,
      `El ${word.toLowerCase()} era muy impresionante.`,
    ],
    fr: [
      `J'ai vu un beau ${word.toLowerCase()} aujourd'hui.`,
      `Le ${word.toLowerCase()} était très impressionnant.`,
    ],
    de: [
      `Ich habe heute einen schönen ${word} gesehen.`,
      `Der ${word} war sehr beeindruckend.`,
    ],
  };

  const langTemplates = templates[language] || templates.en;
  return langTemplates[Math.floor(Math.random() * langTemplates.length)];
}

// ============================================
// Algorithmic Hint Generation (Fallback)
// ============================================

/**
 * Get vowels for a specific language
 */
function getVowelsForLanguage(language: Language): Set<string> {
  return new Set(VOWEL_SETS[language] || VOWEL_SETS.en);
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
 * Calculate optimal letter reveal order for hints
 *
 * Strategy:
 * 1. Reveal vowels first (from second-to-last position backward)
 * 2. Then reveal consonants (from second-to-last position backward)
 * 3. NEVER include the last position - always keep at least one letter hidden
 *
 * Revealing from near the end helps players who may have guessed the start
 * but are unsure about the ending, while still maintaining mystery.
 *
 * @param word - The target word
 * @param language - Language for vowel detection
 * @returns Array of positions in reveal order (excludes last position)
 */
function calculateRevealOrder(word: string, language: Language): number[] {
  const lastPosition = word.length - 1;
  const vowelPositions = findVowelPositions(word, language);

  // Sort vowel positions from end to start, EXCLUDING the last position
  const vowelsFromEnd = [...vowelPositions]
    .filter(i => i !== lastPosition)
    .sort((a, b) => b - a);

  // Get consonant positions from end to start, EXCLUDING the last position
  const consonantPositions = [...Array(word.length).keys()]
    .filter(i => !vowelPositions.includes(i) && i !== lastPosition)
    .sort((a, b) => b - a);

  // Vowels first, then consonants (last position is never included)
  return [...vowelsFromEnd, ...consonantPositions];
}

/**
 * Fallback hint generation (non-AI, algorithmic hints)
 *
 * Generates progressive hints that reveal letters starting from vowels at the END.
 * Never reveals more than 50% of letters to maintain challenge.
 *
 * @param targetWord - Word to generate hints for
 * @param language - Language for vowel detection
 * @returns Hint generation result with algorithmic hints
 */
export function generateFallbackHints(
  targetWord: string,
  language: Language
): HintGenerationResult {
  const word = targetWord.toUpperCase();
  const wordLength = word.length;

  // Maximum letters we can ever reveal is 50% of the word (rounded down)
  const maxReveal = Math.floor(wordLength / 2);

  // Calculate optimal reveal order (excludes last position)
  const revealOrder = calculateRevealOrder(word, language);
  const lastPosition = wordLength - 1;

  // Find vowels excluding the last position
  const vowelPositions = findVowelPositions(word, language);
  const vowelsFromEndExcludingLast = [...vowelPositions]
    .filter(i => i !== lastPosition)
    .sort((a, b) => b - a);

  const hints: HintLevel[] = [];

  // Level 1: All blanks (always free)
  hints.push({
    level: 1,
    hint: generateBlanksDisplay(word, []),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_1,
  });

  // Level 2: Reveal last vowel (excluding final position) or first letter if no vowels
  // IMPORTANT: Never reveal the last letter - always keep at least one letter hidden
  // to prevent visual confusion where all boxes appear green but game continues
  const level2Positions = vowelsFromEndExcludingLast.length > 0
    ? [vowelsFromEndExcludingLast[0]]
    : wordLength > 1 ? [0] : [];
  hints.push({
    level: 2,
    hint: generateBlanksDisplay(word, level2Positions),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_2,
  });

  // For words of 4+ letters, add more progressive hints
  if (wordLength >= 4) {
    // Level 3: Reveal ~25% of max letters
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    const level3Positions = revealOrder.slice(0, level3Count).sort((a, b) => a - b);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(word, level3Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_3,
    });

    // Level 4: Reveal ~37.5% of max letters
    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    const level4Positions = revealOrder.slice(0, level4Count).sort((a, b) => a - b);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(word, level4Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_4,
    });

    // Level 5: Reveal exactly 50% (max allowed)
    const level5Positions = revealOrder.slice(0, maxReveal).sort((a, b) => a - b);
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(word, level5Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_5,
    });
  }

  return {
    hints,
    category: 'Unknown',
    exampleSentence: generateDefaultExampleSentence(word, language),
  };
}

// ============================================
// Hint State Management
// ============================================

/**
 * Get the next available hint based on words found count
 *
 * @param hints - Array of available hints
 * @param wordsFoundCount - Number of words the player has found
 * @returns The highest-level hint that's unlocked, or null
 */
export function getNextHint(
  hints: HintLevel[],
  wordsFoundCount: number
): HintLevel | null {
  if (!hints || hints.length === 0) return null;

  // Find the most advanced hint that's unlocked
  const availableHints = hints.filter(h => h.unlockCost <= wordsFoundCount);
  if (availableHints.length === 0) return null;

  // Return the highest level hint
  return availableHints.reduce((highest, current) =>
    current.level > highest.level ? current : highest
  );
}

/**
 * Check if a new hint level will be unlocked at a given word count
 *
 * @param hints - Array of available hints
 * @param currentWordsFound - Current number of words found
 * @param newWordsFound - New number of words (after finding one more)
 * @returns The newly unlocked hint, or null if no new unlock
 */
export function getNewlyUnlockedHint(
  hints: HintLevel[],
  currentWordsFound: number,
  newWordsFound: number
): HintLevel | null {
  const currentHint = getNextHint(hints, currentWordsFound);
  const newHint = getNextHint(hints, newWordsFound);

  if (!newHint) return null;
  if (!currentHint) return newHint;

  return newHint.level > currentHint.level ? newHint : null;
}

// ============================================
// Reward Calculation Functions
// ============================================

/**
 * Calculate life points reward based on word length
 *
 * Reward structure:
 * - 2 letters: 3 life (minimal for Japanese kanji)
 * - 3 letters: 5 life
 * - 4 letters: 10 life
 * - 5 letters: 15 life
 * - 6 letters: 20 life
 * - 7+ letters: 25 life
 *
 * @param wordLength - Length of the found word
 * @returns Life points to award
 */
export function calculateLifeReward(wordLength: number): number {
  if (wordLength < 2) return 0;
  if (wordLength === 2) return 3;  // Japanese kanji compounds
  if (wordLength === 3) return 5;
  if (wordLength === 4) return 10;
  if (wordLength === 5) return 15;
  if (wordLength === 6) return 20;
  return 25; // 7+ letters
}

/**
 * Calculate clue tokens reward based on word length
 *
 * Only 4+ letter words give tokens (3-letter words give life instead).
 * This encourages finding longer words.
 *
 * Token structure:
 * - 2-3 letters: 0 tokens (life only)
 * - 4 letters: 1 token
 * - 5 letters: 2 tokens
 * - 6 letters: 3 tokens
 * - 7+ letters: 4 tokens
 *
 * @param wordLength - Length of the found word
 * @returns Clue tokens to award
 */
export function calculateTokenReward(wordLength: number): number {
  if (wordLength < 4) return 0;
  if (wordLength === 4) return 1;
  if (wordLength === 5) return 2;
  if (wordLength === 6) return 3;
  return 4; // 7+ letters
}

/**
 * Score breakdown for UI display
 */
export interface ScoreBreakdown {
  /** Speed score: life remaining × 4, capped at 400 */
  speed: number;
  /** Accuracy score: 400 - (guesses - 1) × 40, min 0 */
  accuracy: number;
  /** Exploration bonus: words × 10, capped at 200 */
  exploration: number;
  /** Total efficiency score (0-1000) */
  total: number;
  /** Maximum possible score */
  maxScore: 1000;
  /** Raw values for display */
  raw: {
    lifeRemaining: number;
    guessesUsed: number;
    wordsFound: number;
  };
}

/**
 * Calculate efficiency score breakdown for leaderboard
 *
 * New balanced formula (Season 2):
 * - Speed (40%): min(life, 100) × 4 = max 400 pts
 * - Accuracy (40%): max(0, 400 - (guesses - 1) × 40) = max 400 pts
 * - Exploration (20%): min(words, 20) × 10 = max 200 pts
 *
 * Total max: 1000 points (perfect game: 100+ life, 1 guess, 20+ words)
 *
 * @param lifeRemaining - Life points at end of game
 * @param guessesUsed - Number of target word attempts
 * @param wordsFound - Number of words discovered
 * @param solved - Whether the target was found
 * @returns Score breakdown with individual components
 */
export function getScoreBreakdown(
  lifeRemaining: number,
  guessesUsed: number,
  wordsFound: number,
  solved: boolean
): ScoreBreakdown {
  if (!solved) {
    return {
      speed: 0,
      accuracy: 0,
      exploration: 0,
      total: 0,
      maxScore: 1000,
      raw: { lifeRemaining: 0, guessesUsed: 0, wordsFound: 0 },
    };
  }

  // Ensure non-negative inputs
  const life = Math.max(0, lifeRemaining);
  const guesses = Math.max(1, guessesUsed); // At least 1 guess to solve
  const words = Math.max(0, wordsFound);

  // Speed: life × 4, capped at 100 life = 400 pts
  const speed = Math.min(life, 100) * 4;

  // Accuracy: 400 pts for 1 guess, -40 per additional guess, min 0
  const accuracy = Math.max(0, 400 - (guesses - 1) * 40);

  // Exploration: 10 pts per word, capped at 20 words = 200 pts
  const exploration = Math.min(words, 20) * 10;

  const total = speed + accuracy + exploration;

  return {
    speed: Math.round(speed),
    accuracy: Math.round(accuracy),
    exploration: Math.round(exploration),
    total: Math.round(total),
    maxScore: 1000,
    raw: {
      lifeRemaining: Math.round(life),
      guessesUsed: guesses,
      wordsFound: words,
    },
  };
}

/**
 * Calculate efficiency score for leaderboard
 *
 * New balanced formula (Season 2):
 * - Speed (40%): min(life, 100) × 4 = max 400 pts
 * - Accuracy (40%): max(0, 400 - (guesses - 1) × 40) = max 400 pts
 * - Exploration (20%): min(words, 20) × 10 = max 200 pts
 *
 * Total max: 1000 points (perfect game: 100+ life, 1 guess, 20+ words)
 *
 * @param lifeRemaining - Life points at end of game
 * @param unusedTokens - DEPRECATED: No longer used in scoring (kept for API compatibility)
 * @param guessesUsed - Number of target word attempts
 * @param wordsFound - Number of words discovered
 * @param solved - Whether the target was found
 * @returns Efficiency score (0 if not solved, 0-1000 if solved)
 */
export function calculateEfficiencyScore(
  lifeRemaining: number,
  _unusedTokens: number, // DEPRECATED: No longer used in scoring (kept for API compatibility)
  guessesUsed: number,
  wordsFound: number,
  solved: boolean
): number {
  return getScoreBreakdown(lifeRemaining, guessesUsed, wordsFound, solved).total;
}

// ============================================
// Utility Functions for Shop Items
// ============================================

/**
 * Get letters that can be eliminated (not in target word)
 *
 * @param targetWord - The target word
 * @param alreadyEliminated - Set of already eliminated letters
 * @param count - Number of letters to eliminate
 * @returns Array of letters to eliminate
 */
export function getLettersToEliminate(
  targetWord: string,
  alreadyEliminated: Set<string>,
  count: number = 3
): string[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetLetters = new Set(targetWord.toUpperCase().split(''));

  const wrongLetters = alphabet
    .split('')
    .filter(l => !targetLetters.has(l) && !alreadyEliminated.has(l));

  // Shuffle for randomness
  const shuffled = wrongLetters.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

/**
 * Get a random unrevealed letter position to reveal
 *
 * @param targetWord - The target word
 * @param alreadyRevealed - Set of already revealed positions
 * @returns Position to reveal, or -1 if all revealed or only 1 left
 */
export function getLetterToReveal(
  targetWord: string,
  alreadyRevealed: Set<number>
): number {
  const wordLength = targetWord.length;
  const unrevealed = [...Array(wordLength).keys()].filter(
    i => !alreadyRevealed.has(i)
  );

  // Keep at least 1 letter hidden
  if (unrevealed.length <= 1) {
    return -1;
  }

  // Return random unrevealed position
  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}
