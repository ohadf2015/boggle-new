import type { SupabaseClient } from '@supabase/supabase-js';
import type { Language } from '@/shared/types/game';
import logger from '@/utils/logger';
import { toVocabularyWords } from './practiceWordShape';
import { recordWordReviews } from './recordWordReviews';
import { utcDay } from './practiceStreak';
import type { WordResult } from './wordMemory';

/**
 * Practice PATCH → word memory. The lesson is the session's own (ownership was
 * checked by the caller), so a client can only move words of a lesson it practised.
 * Never throws: a failed write must not fail the session or its XP.
 */
export async function recordPracticeWordReviews(
  getAdmin: () => SupabaseClient | null,
  args: { studentId: string; lessonId: string; wordResults: readonly WordResult[] | undefined; nowMs: number },
): Promise<void> {
  if (!args.wordResults?.length) return;
  try {
    const admin = getAdmin();
    if (!admin) throw new Error('service-role client unavailable');
    const { data: lesson, error } = await admin.from('vocabulary_lessons').select('words, language').eq('id', args.lessonId).maybeSingle();
    if (error || !lesson) throw new Error(`lesson ${args.lessonId} unreadable: ${error?.message ?? 'not found'}`);
    const row = lesson as { words: unknown[] | null; language: string | null };
    await recordWordReviews(admin, {
      studentId: args.studentId,
      lessonId: args.lessonId,
      lesson: { language: (row.language || 'en') as Language, words: toVocabularyWords(row.words).map((w) => w.word) },
      reviews: args.wordResults,
      today: utcDay(args.nowMs),
    });
  } catch (err) {
    logger.error(`Word memory not updated for student ${args.studentId}, lesson ${args.lessonId}:`, err);
  }
}
