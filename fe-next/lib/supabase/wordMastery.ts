/**
 * Teacher Pro "Word Mastery" card data source.
 *
 * Reads the same `practice_sessions` rows as the free "Last class game" card
 * (`lib/supabase/analyticsLastGame.ts`) but folds them through
 * `lib/education/wordMasteryTrend.buildClassMastery` to answer a different
 * question: across EVERY lesson game (not just the latest one), which words
 * is this class actually mastering vs. still stuck on.
 *
 * Teacher ownership of the classroom is enforced by RLS
 * ("Teachers view student practice" /
 * `20260917100000_practice_sessions_teacher_of_student_select.sql`), not
 * here — this file only shapes rows, same as `getRecentClassroomGames`.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { buildClassMastery, type ClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';

interface MasteryRow {
  student_id: string;
  started_at: string;
  results: unknown;
}

/** Rows scanned per classroom; a class's full session history is bounded. */
const MAX_ROWS = 2000;

export async function getClassMastery(
  classroomId: string,
  client?: typeof supabase,
): Promise<{ data: ClassMastery | null; error: { message: string } | null }> {
  const db = client ?? supabase;
  if (!db) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }
  if (!classroomId) {
    return { data: null, error: null };
  }

  try {
    const { data: rows, error } = await db
      .from('practice_sessions')
      .select('student_id, started_at, results')
      // Board-mode rows never set `lessonWordsAsked` — skip them here rather
      // than scan and discard in buildClassMastery.
      .eq('classroom_id', classroomId)
      .not('results->>lessonWordsAsked', 'is', null)
      .order('started_at', { ascending: true })
      .limit(MAX_ROWS);

    if (error) {
      logger.error('Error fetching practice sessions for word mastery:', error);
      return { data: null, error: { message: error.message } };
    }

    const sessionRows: MasterySessionRow[] = ((rows ?? []) as MasteryRow[]).map((row) => ({
      studentId: row.student_id,
      startedAt: row.started_at,
      results: row.results,
    }));

    return { data: buildClassMastery(sessionRows), error: null };
  } catch (err) {
    logger.error('Error building word mastery:', err);
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Failed to load word mastery' },
    };
  }
}
