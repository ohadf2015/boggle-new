/**
 * Vocabulary types for enriched lesson content
 */

/**
 * Example sentence showing word usage
 */
export interface VocabularyExample {
  /** Example sentence text */
  text: string;
  /** Translation of example (optional) */
  translation?: string;
}

/**
 * Enriched vocabulary word with definition, pronunciation, and examples
 */
export interface EnrichedVocabularyWord {
  /** The word itself */
  word: string;
  /** Dictionary definition */
  definition: string;
  /** IPA pronunciation guide (optional) */
  pronunciation?: string;
  /** Usage examples */
  examples: VocabularyExample[];
  /** Contextual examples from themed content (optional) */
  contextualExamples?: VocabularyExample[];
  /** Part of speech (noun, verb, etc.) */
  partOfSpeech?: string;
}
