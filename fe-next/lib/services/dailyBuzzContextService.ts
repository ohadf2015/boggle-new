/**
 * Daily Buzz Context Service
 * Enriches vocabulary words with contextual examples from trending topics
 */

import { getDailyBuzz } from '../../backend/services/buzz/databaseService';

/**
 * Vocabulary word with optional contextual examples
 */
export interface VocabularyWord {
  word: string;
  definition: string;
  contextualExamples?: string[];
  [key: string]: unknown;
}

/**
 * Normalize a word for stem matching
 * Removes common suffixes to match word variations (e.g., run/running/runs)
 */
export function normalizeWord(word: string): string {
  let normalized = word.toLowerCase().trim();

  // Remove common suffixes for stem matching (order matters)
  if (normalized.endsWith('ies') && normalized.length > 4) {
    // stories → stori
    normalized = normalized.slice(0, -3) + 'i';
  } else if (normalized.endsWith('ing') && normalized.length > 4) {
    // running → run (remove -ing)
    normalized = normalized.slice(0, -3);
    // Handle double consonant: running → runn → run
    if (normalized.length >= 2 && normalized[normalized.length - 1] === normalized[normalized.length - 2]) {
      normalized = normalized.slice(0, -1);
    }
  } else if (normalized.endsWith('ed') && normalized.length > 3) {
    // walked → walk
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith('es') && normalized.length > 3) {
    // technologies → technologi
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith('s') && normalized.length > 2) {
    // cars → car
    normalized = normalized.slice(0, -1);
  } else if (normalized.endsWith('y') && normalized.length > 2) {
    // technology → technolog
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Find contextual examples for a word from Daily Buzz trending context
 * Uses fuzzy matching to handle word variations (plural, tense, etc.)
 *
 * @param word - The vocabulary word to find examples for
 * @param language - Language code (en, he, sv, ja)
 * @param date - Optional date (defaults to today)
 * @returns Array of sentences containing the word
 */
export async function findContextualExamples(
  word: string,
  language: string,
  date?: string
): Promise<string[]> {
  try {
    // Default to today's date
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Fetch Daily Buzz for the target date
    const buzzData = await getDailyBuzz(targetDate, language);

    if (!buzzData || !buzzData.challenges) {
      return [];
    }

    const normalizedTarget = normalizeWord(word);
    const matchingSentences = new Set<string>();

    // Search through all challenges' trending_context
    for (const challenge of buzzData.challenges) {
      const context = challenge.trending_context;

      if (!context) continue;

      // Split context into sentences (simple split on . ! ?)
      const sentences = context
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const sentence of sentences) {
        // Normalize the sentence for fuzzy matching
        const normalizedSentence = sentence.toLowerCase();

        // Check if the normalized word appears in the sentence
        // Split sentence into words and normalize each
        const words = normalizedSentence.split(/\s+/);
        const stemmedWords = words.map((w) =>
          normalizeWord(w.replace(/[^a-z]/gi, ''))
        );

        // Check if any stemmed word matches or contains the target stem (or vice versa)
        const hasMatch = stemmedWords.some(
          (stemmed) =>
            stemmed === normalizedTarget ||
            stemmed.includes(normalizedTarget) ||
            normalizedTarget.includes(stemmed)
        );

        if (hasMatch) {
          // Add the original sentence (with proper capitalization)
          matchingSentences.add(sentence + '.');
        }
      }
    }

    return Array.from(matchingSentences);
  } catch (error) {
    console.error('[BUZZ_CONTEXT] Error finding contextual examples:', error);
    return [];
  }
}

/**
 * Enrich a vocabulary word with contextual examples from Daily Buzz
 *
 * @param word - The vocabulary word object
 * @param language - Language code
 * @param date - Optional date (defaults to today)
 * @returns Enriched word with contextualExamples array
 */
export async function enrichVocabularyWithContext(
  word: VocabularyWord,
  language: string,
  date?: string
): Promise<VocabularyWord> {
  try {
    const examples = await findContextualExamples(word.word, language, date);

    return {
      ...word,
      contextualExamples: examples,
    };
  } catch (error) {
    console.error('[BUZZ_CONTEXT] Error enriching vocabulary:', error);
    return {
      ...word,
      contextualExamples: [],
    };
  }
}
