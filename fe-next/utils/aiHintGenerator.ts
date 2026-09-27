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
 * Scoring & rewards: ./aiHintScoring.ts
 */

import type { Language } from '@/types';
import logger from '@/utils/logger';

// Re-export scoring module for backward compatibility
export {
  calculateLifeReward,
  calculateTokenReward,
  getScoreBreakdown,
  calculateEfficiencyScore,
  getLettersToEliminate,
  getLetterToReveal,
} from './aiHintScoring';
export type { ScoreBreakdown } from './aiHintScoring';

// ============================================
// Type Definitions
// ============================================

export interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number;
}

export interface HintGenerationResult {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
  wordType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ClueShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

export interface ExtendedHintGenerationResult extends HintGenerationResult {
  lettersToEliminate?: string[];
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// ============================================
// Constants
// ============================================

export const HINT_UNLOCK_COSTS = {
  LEVEL_1: 0,
  LEVEL_2: 4,
  LEVEL_3: 8,
  LEVEL_4: 12,
  LEVEL_5: 16,
} as const;

export const CLUE_SHOP_ITEMS: ClueShopItem[] = [
  {
    id: 'reveal_letter',
    name: 'Reveal Letter',
    description: 'Reveal a random letter in the target word (keeps 1 letter hidden)',
    cost: 3,
    icon: 'Lightbulb',
  },
  {
    id: 'reveal_category',
    name: 'Reveal Category',
    description: 'Show the word category (e.g., "Animals > Mammals")',
    cost: 9,
    icon: 'Tag',
  },
  {
    id: 'example_sentence',
    name: 'Example Sentence',
    description: 'See the word used in a sentence (word is blank)',
    cost: 15,
    icon: 'FileText',
  },
];

const VOWEL_SETS: Record<Language, string[]> = {
  en: ['A', 'E', 'I', 'O', 'U'],
  he: ['א', 'ע', 'י', 'ו'],
  sv: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'],
  ja: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'],
  es: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'],
  fr: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'],
  de: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'],
  ru: ['А', 'Е', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'],
};

// ============================================
// Configuration
// ============================================

interface HintRequestConfig {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

const DEFAULT_CONFIG: Required<HintRequestConfig> = {
  timeoutMs: 12000,
  retryCount: 1,
  retryDelayMs: 1000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown, response?: Response): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  if (response) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(response.status);
  }
  return false;
}

function validateHintResponse(data: unknown): data is ExtendedHintGenerationResult {
  if (!data || typeof data !== 'object') return false;

  const response = data as Record<string, unknown>;
  if (!Array.isArray(response.hints) || response.hints.length === 0) {
    return false;
  }

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

// ============================================
// Core Hint Generation
// ============================================

/**
 * Generate progressive hints for a target word using AI
 */
export async function generateProgressiveHints(
  targetWord: string,
  language: Language = 'en',
  config: HintRequestConfig = {}
): Promise<ExtendedHintGenerationResult> {
  const { timeoutMs, retryCount, retryDelayMs } = { ...DEFAULT_CONFIG, ...config };

  if (!targetWord || typeof targetWord !== 'string') {
    logger.error('[HintGenerator] Invalid target word:', targetWord);
    return generateFallbackHints('WORD', 'en');
  }

  const normalizedWord = targetWord.toUpperCase().trim();
  if (normalizedWord.length < 2) {
    logger.error('[HintGenerator] Word too short:', normalizedWord);
    return generateFallbackHints(normalizedWord || 'WORD', language);
  }

  let lastError: Error | null = null;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      logger.log(`[HintGenerator] Retry attempt ${attempt} for ${normalizedWord}`);
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

        if (isRetryableError(null, response) && attempt < retryCount) {
          logger.debug(`[HintGenerator] Retryable error: ${response.status}`);
          continue;
        }

        if (response.status === 429) {
          logger.debug('[HintGenerator] Rate limited, using fallback:', errorText);
        } else {
          logger.error('[HintGenerator] API error:', response.status, errorText);
        }
        return generateFallbackHints(normalizedWord, language);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const responseText = await response.text().catch(() => '');
        logger.warn('[HintGenerator] Non-JSON response received:', contentType, responseText.substring(0, 100));
        return generateFallbackHints(normalizedWord, language);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        logger.warn('[HintGenerator] Failed to parse JSON response:', parseError);
        return generateFallbackHints(normalizedWord, language);
      }

      if (!validateHintResponse(data)) {
        logger.warn('[HintGenerator] Invalid API response structure, using fallback');
        return generateFallbackHints(normalizedWord, language);
      }

      const result: ExtendedHintGenerationResult = {
        hints: data.hints,
        category: data.category || 'Unknown',
        exampleSentence: data.exampleSentence || generateDefaultExampleSentence(normalizedWord, language),
        wordType: data.wordType,
        difficulty: data.difficulty,
      };

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
          logger.log('[HintGenerator] Request timed out');
          if (attempt < retryCount) {
            continue;
          }
        } else if (isRetryableError(error, lastResponse) && attempt < retryCount) {
          logger.log(`[HintGenerator] Retryable error: ${error.message}`);
          continue;
        }
      }

      logger.log('[HintGenerator] Error generating hints:', error);
    }
  }

  if (lastError) {
    logger.log('[HintGenerator] All attempts failed:', lastError.message);
  }
  return generateFallbackHints(normalizedWord, language);
}

// ============================================
// Fallback Hint Helpers
// ============================================

function generateDefaultExampleSentence(word: string, language: Language): string {
  const templates: Record<Language, string[]> = {
    en: [
      `I saw a beautiful ${word.toLowerCase()} today.`,
      `The ${word.toLowerCase()} was quite impressive.`,
      `Have you ever seen such a ${word.toLowerCase()}?`,
    ],
    he: [`ראיתי ${word} יפה היום.`, `ה${word} היה מרשים מאוד.`],
    sv: [`Jag såg en vacker ${word.toLowerCase()} idag.`, `${word} var mycket imponerande.`],
    ja: [`今日、美しい${word}を見ました。`, `その${word}はとても印象的でした。`],
    es: [`Hoy vi un hermoso ${word.toLowerCase()}.`, `El ${word.toLowerCase()} era muy impresionante.`],
    fr: [`J'ai vu un beau ${word.toLowerCase()} aujourd'hui.`, `Le ${word.toLowerCase()} était très impressionnant.`],
    de: [`Ich habe heute einen schönen ${word} gesehen.`, `Der ${word} war sehr beeindruckend.`],
    ru: [`Сегодня я видел красивый ${word.toLowerCase()}.`, `${word} был очень впечатляющим.`],
  };

  const langTemplates = templates[language] || templates.en;
  return langTemplates[Math.floor(Math.random() * langTemplates.length)];
}

function getVowelsForLanguage(language: Language): Set<string> {
  return new Set(VOWEL_SETS[language] || VOWEL_SETS.en);
}

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

function calculateRevealOrder(word: string, language: Language): number[] {
  const lastPosition = word.length - 1;
  const vowelPositions = findVowelPositions(word, language);

  const vowelsFromEnd = [...vowelPositions]
    .filter(i => i !== lastPosition)
    .sort((a, b) => b - a);

  const consonantPositions = [...Array(word.length).keys()]
    .filter(i => !vowelPositions.includes(i) && i !== lastPosition)
    .sort((a, b) => b - a);

  return [...vowelsFromEnd, ...consonantPositions];
}

/**
 * Fallback hint generation (non-AI, algorithmic hints)
 */
export function generateFallbackHints(
  targetWord: string,
  language: Language
): HintGenerationResult {
  const word = targetWord.toUpperCase();
  const wordLength = word.length;
  const maxReveal = Math.floor(wordLength / 2);
  const revealOrder = calculateRevealOrder(word, language);
  const lastPosition = wordLength - 1;

  const vowelPositions = findVowelPositions(word, language);
  const vowelsFromEndExcludingLast = [...vowelPositions]
    .filter(i => i !== lastPosition)
    .sort((a, b) => b - a);

  const hints: HintLevel[] = [];

  hints.push({
    level: 1,
    hint: generateBlanksDisplay(word, []),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_1,
  });

  const level2Positions = vowelsFromEndExcludingLast.length > 0
    ? [vowelsFromEndExcludingLast[0]]
    : wordLength > 1 ? [0] : [];
  hints.push({
    level: 2,
    hint: generateBlanksDisplay(word, level2Positions),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_2,
  });

  if (wordLength >= 4) {
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    const level3Positions = revealOrder.slice(0, level3Count).sort((a, b) => a - b);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(word, level3Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_3,
    });

    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    const level4Positions = revealOrder.slice(0, level4Count).sort((a, b) => a - b);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(word, level4Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_4,
    });

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
 */
export function getNextHint(
  hints: HintLevel[],
  wordsFoundCount: number
): HintLevel | null {
  if (!hints || hints.length === 0) return null;

  const availableHints = hints.filter(h => h.unlockCost <= wordsFoundCount);
  if (availableHints.length === 0) return null;

  return availableHints.reduce((highest, current) =>
    current.level > highest.level ? current : highest
  );
}

/**
 * Check if a new hint level will be unlocked at a given word count
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
