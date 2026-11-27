import type { SupabaseClient } from '@supabase/supabase-js';
import type { Language } from '@/shared/types/game';
import logger from '@/utils/logger';
import { toVocabularyWords } from './practiceWordShape';
import { recordWordReviews } from './recordWordReviews';
import { utcDay } from './practiceStreak';
import type { ReviewKind, WordResult } from './wordMemory';

/** What each practice type (or session mode, checked first) can actually ask; a harder claimed kind is dropped. */
const ALLOWED_KINDS: Record<string, readonly ReviewKind[]> = {
  flashcard: ['recognise', 'context'],
  missed_review: ['recognise', 'spell'],
  matching: ['recognise'],
  vocab_focus: ['recognise', 'context', 'recall'],
  spelling: ['spell'],
  blitz: ['recall', 'spell'],
  solo_board: ['find'],
  warmup: ['find'],
  daily_quest: ['recognise', 'context', 'spell', 'recall', 'use'],
};

export function allowedReviewKinds(practiceType: string | null | undefined, mode: string | null | undefined): readonly ReviewKind[] {
  return (mode ? ALLOWED_KINDS[mode] : undefined) ?? ALLOWED_KINDS[practiceType ?? ''] ?? [];
}

/**
 * Practice PATCH → word memory. The lesson and practice type are the session's
 * own (ownership was checked by the caller), so a client can only move words of
 * a lesson it practised, with the kinds that practice can ask.
 * Never throws: a failed write must not fail the session or its XP.
 */
export async function recordPracticeWordReviews(
  getAdmin: () => SupabaseClient | null,
  args: {
    studentId: string;
    lessonId: string;
    practiceType: string | null | undefined;
    mode: string | null | undefined;
    wordResults: readonly WordResult[] | undefined;
    nowMs: number;
  },
): Promise<void> {
  const allowed = allowedReviewKinds(args.practiceType, args.mode);
  const reviews = (args.wordResults ?? []).filter((r) => allowed.includes(r.kind));
  if (reviews.length === 0) return;
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
      reviews,
      today: utcDay(args.nowMs),
    });
  } catch (err) {
    logger.error(`Word memory not updated for student ${args.studentId}, lesson ${args.lessonId}:`, err);
  }
}
