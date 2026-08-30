/**
 * Convert a starter pack selection into a VocabularyWord array
 *
 * Transforms LessonWord (from starter packs) to VocabularyWord (for storage/game)
 * by adding the required canIntegrate field.
 */

import type { LessonWord } from '@/types/education';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export function convertPackWordsToLessonWords(words: LessonWord[]): VocabularyWord[] {
  return words.map((packWord) => ({
    word: packWord.word,
    definition: packWord.definition,
    canIntegrate: true, // All starter pack words are validated and safe to integrate
  }));
}
