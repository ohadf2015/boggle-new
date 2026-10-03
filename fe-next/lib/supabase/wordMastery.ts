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
import {
  buildClassMastery,
  buildSessionAccuracySeries,
  type ClassMastery,
  type MasterySessionRow,
  type SessionAccuracyPoint,
  type StudentMastery,
} from '@/lib/education/wordMasteryTrend';

/** Rows scanned per classroom; a class's full session history is bounded. */
const MAX_ROWS = 2000;

interface MasteryRow {
  student_id: string;
  started_at: string;
  results: unknown;
}

function toSessionRows(rows: MasteryRow[] | null): MasterySessionRow[] {
  return (rows ?? []).map((row) => ({
    studentId: row.student_id,
    startedAt: row.started_at,
    results: row.results,
  }));
}

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

    return { data: buildClassMastery(toSessionRows(rows as MasteryRow[] | null)), error: null };
  } catch (err) {
    logger.error('Error building word mastery:', err);
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Failed to load word mastery' },
    };
  }
}

export interface StudentArcData {
  /** Chronological per-session accuracy — the sparkline axis. */
  points: SessionAccuracyPoint[];
  /** This student's word trajectories, or null when they have no evidence. */
  mastery: StudentMastery | null;
}

/**
 * One student's cross-session arc (free reports surface). Same RLS-enforced
 * read as getClassMastery, narrowed to the student.
 */
export async function getStudentMasterySeries(
  classroomId: string,
  studentId: string,
  client?: typeof supabase,
): Promise<{ data: StudentArcData | null; error: { message: string } | null }> {
  const db = client ?? supabase;
  if (!db) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }
  if (!classroomId || !studentId) {
    return { data: null, error: null };
  }

  try {
    const { data: rows, error } = await db
      .from('practice_sessions')
      .select('student_id, started_at, results')
      .eq('classroom_id', classroomId)
      .eq('student_id', studentId)
      .not('results->>lessonWordsAsked', 'is', null)
      .order('started_at', { ascending: true })
      .limit(MAX_ROWS);

    if (error) {
      logger.error('Error fetching student mastery series:', error);
      return { data: null, error: { message: error.message } };
    }

    const sessionRows = toSessionRows(rows as MasteryRow[] | null);
    const mastery = buildClassMastery(sessionRows).students[0] ?? null;
    const points = buildSessionAccuracySeries(sessionRows).get(studentId) ?? [];
    return { data: { points, mastery }, error: null };
  } catch (err) {
    logger.error('Error building student mastery series:', err);
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Failed to load student mastery' },
    };
  }
}
