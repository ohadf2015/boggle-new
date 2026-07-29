/**
 * Wikipedia Word Processor
 * Validates and ranks words extracted from Wikipedia for daily challenges
 */

import type { Language } from '@/shared/types/game';
import logger from '@/utils/logger';

// Minimum word lengths by language
const MIN_WORD_LENGTH: Record<Language, number> = {
  en: 4,
  he: 4,
  sv: 4,
  ja: 2, // Japanese kanji compounds are typically 2-4 characters
  es: 4,
  fr: 4,
  de: 4
};

// Maximum word lengths by language
const MAX_WORD_LENGTH: Record<Language, number> = {
  en: 6,
  he: 6,
  sv: 6,
  ja: 4,
  es: 6,
  fr: 6,
  de: 6
};

// Character set validators by language
const CHARACTER_VALIDATORS: Record<Language, RegExp> = {
  en: /^[A-Z]+$/,
  he: /^[\u0590-\u05FF]+$/,
  sv: /^[A-ZÅÄÖ]+$/,
  ja: /^[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]+$/,
  es: /^[A-ZÁÉÍÓÚÜÑ]+$/,
  fr: /^[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ]+$/,
  de: /^[A-ZÄÖÜẞ]+$/
};

// Overused/common words to penalize (reduces interestingness score)
const OVERUSED_WORDS: Record<Language, Set<string>> = {
  en: new Set([
    'TREE', 'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND',
    'BIRD', 'FISH', 'STAR', 'MOON', 'RAIN', 'WIND', 'SNOW', 'BOAT', 'GAME',
    'KING', 'TIME', 'YEAR', 'LIFE', 'WORK', 'PART', 'WORD', 'FACT', 'SIDE'
  ]),
  he: new Set([
    'בית', 'מים', 'אדם', 'דבר', 'עולם', 'יום', 'שנה', 'עבודה'
  ]),
  sv: new Set([
    'HUS', 'DAG', 'ÅR', 'TID', 'MAN', 'BARN', 'LAND'
  ]),
  ja: new Set([
    '日本', '東京', '時間', '仕事'
  ]),
  es: new Set([
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'TIEMPO', 'MUNDO'
  ]),
  fr: new Set([
    'MAISON', 'MONDE', 'TEMPS', 'JOUR', 'NUIT'
  ]),
  de: new Set([
    'HAUS', 'ZEIT', 'JAHR', 'WELT', 'LAND'
  ])
};

/**
 * Known Hebrew transliterations and foreign loanwords to reject.
 * These are words written in Hebrew letters but originating from foreign languages.
 * They make poor daily challenge words because players expect native Hebrew vocabulary.
 */
const HEBREW_TRANSLITERATION_BLOCKLIST = new Set([
  // Scientific/chemical terms
  'ניטרון', 'פרוטון', 'נויטרון', 'אלקטרון', 'פוטון', 'ביולוגיה', 'פיזיקה', 'כימיה',
  // Technology
  'טלוויזיה', 'אינטרנט', 'טלפון', 'קומפיוטר', 'טכנולוגיה', 'דיגיטל', 'וידאו',
  // Names (common transliterations)
  'ניקולאה', 'ניקולה', 'אלכסנדר', 'ויקטוריה', 'נפוליאון', 'קליאופטרה',
  // Common loanwords
  'אוניברסיטה', 'פוליטיקה', 'דמוקרטיה', 'אקדמיה', 'פילוסופיה', 'תיאטרון',
  'קולנוע', 'סטודנט', 'פרופסור', 'דוקטור',
]);

/**
 * Suffix patterns common in Hebrew transliterations of foreign words.
 * These suffixes indicate the word is likely a phonetic adaptation, not a native Hebrew word.
 */
const HEBREW_TRANSLITERATION_SUFFIXES = [
  'ציה',   // -tion/-zia (e.g., דמוקרטיציה, רבולוציה)
  'ציון',  // -tion (e.g., אינפלציון)
  'לוגיה', // -logy (e.g., ביולוגיה)
  'גרפיה', // -graphy (e.g., ביוגרפיה)
  'סקופ',  // -scope (e.g., טלסקופ)
  'יסטי',  // -istic (e.g., אופטימיסטי)
  'יזם',   // -ism (when transliterated)
];

/**
 * Detect if a Hebrew word is likely a transliteration of a foreign word.
 * Uses blocklist + suffix pattern matching.
 */
function isHebrewTransliteration(word: string): boolean {
  // Check blocklist
  if (HEBREW_TRANSLITERATION_BLOCKLIST.has(word)) {
    return true;
  }

  // Check suffix patterns (only for words 5+ chars to avoid false positives)
  if (word.length >= 5) {
    for (const suffix of HEBREW_TRANSLITERATION_SUFFIXES) {
      if (word.endsWith(suffix)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Result of word validation
 */
export interface WordValidationResult {
  valid: boolean;
  reason: string;
  word: string;
  normalizedWord: string;
}

/**
 * Ranked word with interestingness score
 */
export interface RankedWord {
  word: string;
  score: number;
  source: string;
  url?: string;
}

/**
 * Validate a word for use in the daily challenge
 *
 * @param word - Word to validate
 * @param language - Language code
 * @returns Validation result
 */
export function validateGameWord(
  word: string,
  language: Language
): WordValidationResult {
  // Normalize the word
  const normalizedWord = normalizeWord(word, language);

  // Check minimum length
  const minLength = MIN_WORD_LENGTH[language];
  if (normalizedWord.length < minLength) {
    return {
      valid: false,
      reason: `Word must be at least ${minLength} characters`,
      word,
      normalizedWord
    };
  }

  // Check maximum length
  const maxLength = MAX_WORD_LENGTH[language];
  if (normalizedWord.length > maxLength) {
    return {
      valid: false,
      reason: `Word must be at most ${maxLength} characters`,
      word,
      normalizedWord
    };
  }

  // Check character set
  const validator = CHARACTER_VALIDATORS[language];
  if (!validator.test(normalizedWord)) {
    return {
      valid: false,
      reason: 'Word contains invalid characters',
      word,
      normalizedWord
    };
  }

  // Check for spaces, hyphens, apostrophes (must be single word)
  if (/[\s\-']/.test(word)) {
    return {
      valid: false,
      reason: 'Word must be a single word without spaces or hyphens',
      word,
      normalizedWord
    };
  }

  // Check for numbers
  if (/\d/.test(word)) {
    return {
      valid: false,
      reason: 'Word must not contain numbers',
      word,
      normalizedWord
    };
  }

  // Hebrew: reject transliterations of foreign words and proper nouns
  if (language === 'he' && isHebrewTransliteration(normalizedWord)) {
    return {
      valid: false,
      reason: 'Word appears to be a transliteration of a foreign word',
      word,
      normalizedWord
    };
  }

  return {
    valid: true,
    reason: 'Valid',
    word,
    normalizedWord
  };
}

/**
 * Normalize a word for the target language
 * Converts to uppercase for Latin alphabets, handles special characters
 *
 * @param word - Word to normalize
 * @param language - Language code
 * @returns Normalized word
 */
export function normalizeWord(word: string, language: Language): string {
  if (language === 'ja') {
    // Japanese words stay as-is
    return word.trim();
  }

  if (language === 'he') {
    // Hebrew: Normalize final letters to regular forms
    // Final letters: ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ
    return word
      .trim()
      .replace(/ך/g, 'כ')
      .replace(/ם/g, 'מ')
      .replace(/ן/g, 'נ')
      .replace(/ף/g, 'פ')
      .replace(/ץ/g, 'צ');
  }

  // Latin alphabet languages: uppercase and trim
  return word.trim().toUpperCase();
}

/**
 * Calculate interestingness score for a word
 * Higher scores indicate more interesting/unique words
 *
 * @param word - Word to score
 * @param language - Language code
 * @param source - Source of the word (tfa, mostread, onthisday)
 * @returns Score from 0-100
 */
export function calculateInterestingnessScore(
  word: string,
  language: Language,
  source: string
): number {
  let score = 50; // Base score

  const normalizedWord = normalizeWord(word, language);

  // Source bonus: Featured articles are more curated
  const sourceBonus: Record<string, number> = {
    tfa: 20,       // Today's Featured Article - highest quality
    mostread: 10,  // Popular articles - topical
    onthisday: 15, // Historical - interesting but varied
    random: 5      // Random - lower confidence
  };
  score += sourceBonus[source] || 0;

  // Character variety bonus: More unique characters = more interesting
  const uniqueChars = new Set(normalizedWord.split('')).size;
  const varietyRatio = uniqueChars / normalizedWord.length;
  score += Math.round(varietyRatio * 15); // Up to +15 points

  // Length bonus: Slightly longer words are often more interesting
  if (language !== 'ja') {
    if (normalizedWord.length >= 5) score += 5;
    if (normalizedWord.length >= 6) score += 5;
  }

  // Overused penalty: Common words are less interesting
  const overused = OVERUSED_WORDS[language];
  if (overused.has(normalizedWord)) {
    score -= 25;
  }

  // Hebrew transliteration penalty
  if (language === 'he' && isHebrewTransliteration(normalizedWord)) {
    score -= 50;
  }

  // Double letter penalty (less interesting): BOOK, TREE, etc.
  const hasDoubleLetters = /(.)\1/.test(normalizedWord);
  if (hasDoubleLetters) {
    score -= 5;
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * Rank candidate words by interestingness
 *
 * @param candidates - Array of candidate words with source info
 * @param language - Language code
 * @returns Sorted array of ranked words (highest score first)
 */
export function rankWordsByInterest(
  candidates: Array<{ word: string; source: string; url?: string }>,
  language: Language
): RankedWord[] {
  const ranked: RankedWord[] = [];
  const seenWords = new Set<string>();

  for (const candidate of candidates) {
    const validation = validateGameWord(candidate.word, language);

    if (!validation.valid) {
      continue;
    }

    // Skip duplicates (case-insensitive)
    const normalizedWord = validation.normalizedWord;
    if (seenWords.has(normalizedWord)) {
      continue;
    }
    seenWords.add(normalizedWord);

    const score = calculateInterestingnessScore(
      candidate.word,
      language,
      candidate.source
    );

    ranked.push({
      word: normalizedWord,
      score,
      source: candidate.source,
      url: candidate.url
    });
  }

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

/**
 * Select the best word from ranked candidates
 *
 * @param rankedWords - Array of ranked words
 * @param excludeWords - Words to exclude (e.g., recently used)
 * @returns Best word or null if none available
 */
export function selectBestWord(
  rankedWords: RankedWord[],
  excludeWords: Set<string> = new Set()
): RankedWord | null {
  for (const word of rankedWords) {
    if (!excludeWords.has(word.word)) {
      return word;
    }
  }
  return null;
}

/**
 * Get recently used words to avoid repetition
 *
 * @param language - Language code
 * @param days - Number of days to look back
 * @returns Set of recently used words
 */
export async function getRecentlyUsedWords(
  language: Language,
  days: number = 30
): Promise<Set<string>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('daily_target_words')
      .select('target_word')
      .eq('language', language)
      .gte('puzzle_date', cutoffDate.toISOString().split('T')[0]);

    if (error) {
      logger.error('[WordProcessor] Error fetching recent words:', error.message);
      return new Set();
    }

    return new Set((data || []).map(d => normalizeWord(d.target_word, language)));

  } catch (error) {
    logger.error('[WordProcessor] Error fetching recent words:', error);
    return new Set();
  }
}

// Minimum score for format-only fallback validation
// Words with this score or higher can be approved without AI when AI is unavailable
export const FORMAT_ONLY_FALLBACK_THRESHOLD = 85;

/**
 * Validate a word using AI service with fallback to format validation
 * When AI is unavailable, high-scoring words that pass format validation are approved
 *
 * @param word - Word to validate
 * @param language - Language code
 * @param score - Interestingness score (used for fallback decision)
 * @returns Whether the word is valid, reason, and validation source
 */
export async function validateWordWithAI(
  word: string,
  language: Language,
  score?: number
): Promise<{ valid: boolean; reason: string; source: 'ai' | 'format' }> {
  try {
    // Dynamic import to avoid circular dependencies
    const { gameAIService } = await import('@/lib/ai-service');

    // First try database-only check (fast)
    const dbResult = await gameAIService.checkDatabaseOnly(word, language);
    if (dbResult.source === 'database' && dbResult.isValid) {
      return {
        valid: true,
        reason: 'Dictionary validated',
        source: 'ai'  // Actually database, but same pipeline
      };
    }

    // If not in database, validate with AI and save if valid
    const result = await gameAIService.validateAndSaveWord(word, language);

    return {
      valid: result.isValid,
      reason: result.reason || (result.isValid ? 'AI validated' : 'AI rejected'),
      source: 'ai'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`[WordProcessor] AI validation error for ${word}:`, errorMessage);

    // FALLBACK: For high-scoring words, use format validation
    if (score !== undefined && score >= FORMAT_ONLY_FALLBACK_THRESHOLD) {
      const formatResult = validateGameWord(word, language);

      if (formatResult.valid) {
        logger.log(`[WordProcessor] Using format-only fallback for ${word} (score: ${score})`);
        return {
          valid: true,
          reason: 'Format validated (AI unavailable)',
          source: 'format'
        };
      }
    }

    // Default to invalid on error for lower-scoring words
    return {
      valid: false,
      reason: 'AI validation unavailable',
      source: 'ai'
    };
  }
}

/**
 * Update validation status of a word candidate in database
 */
/**
 * Update validation status for a word in the UNIFIED WORD BANK
 * NOTE: Now updates daily_challenge_word_bank instead of wikipedia_word_candidates
 * Mapping: 'valid' -> 'approved', 'invalid' -> 'rejected'
 */
export async function updateWordValidationStatus(
  language: Language,
  word: string,
  fetchDate: string,
  status: 'valid' | 'invalid' | 'approved' | 'rejected',
  score?: number
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Map old status values to new unified values
    const statusMap: Record<string, string> = {
      'valid': 'approved',
      'invalid': 'rejected',
      'approved': 'approved',
      'rejected': 'rejected'
    };
    const mappedStatus = statusMap[status] || status;

    const updateData: Record<string, unknown> = {
      validation_status: mappedStatus
    };

    if (score !== undefined) {
      updateData.interestingness_score = score;
    }

    // Update in unified word bank (word + language is unique)
    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .update(updateData)
      .eq('language', language)
      .eq('word', word.toUpperCase());

    if (error) {
      logger.error('[WordProcessor] Error updating validation status:', error.message);
    }

  } catch (error) {
    logger.error('[WordProcessor] Error updating validation status:', error);
  }
}
