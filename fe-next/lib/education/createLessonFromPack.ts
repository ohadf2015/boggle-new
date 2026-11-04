/**
 * Convert a starter pack selection into a VocabularyWord array
 *
 * Transforms LessonWord (from starter packs) to VocabularyWord (for storage/game)
 * by adding the required canIntegrate field.
 */

import type { LessonWord } from '@/types/education';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';
import {
  createLessonAndAssign,
  type CreateLessonAndAssignResult,
  type CreateLessonFn,
} from '@/lib/education/createLessonWithAssignment';

export function convertPackWordsToLessonWords(words: LessonWord[]): VocabularyWord[] {
  return words.map((packWord) => ({
    word: packWord.word,
    definition: packWord.definition,
    canIntegrate: true, // All starter pack words are validated and safe to integrate
  }));
}

/** A new class's picked starter pack becomes its first assignment, so students who join have words waiting. */
export function assignStarterPack({
  pack,
  title,
  classroomId,
  teacherId,
  createLesson,
}: {
  pack: StarterLessonPack;
  title: string;
  classroomId: string;
  teacherId: string;
  createLesson: CreateLessonFn;
}): Promise<CreateLessonAndAssignResult> {
  return createLessonAndAssign({
    lesson: {
      name: title,
      language: pack.language,
      words: convertPackWordsToLessonWords(pack.words),
      classroomId,
    },
    teacherId,
    createLesson,
  });
}
