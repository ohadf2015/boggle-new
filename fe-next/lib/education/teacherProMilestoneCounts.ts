/**
 * Cheap engagement counts for the Teacher Pro upgrade milestone.
 *
 * Not the last-game insight card: that hydrates names, missed words and
 * absentees. Here we only need "how many distinct live games" and "how many
 * assignment completions" so we can stop at 5.
 */

import { supabase } from '@/lib/supabase';
import { TEACHER_PRO_MILESTONE_MIN_COMPLETED } from '@/lib/education/teacherProMilestone';
import { TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS } from '@/lib/education/teacherUsagePrompt';

const MAX_SESSION_ROWS = TEACHER_PRO_MILESTONE_MIN_COMPLETED * 60;

type SessionRow = { results?: { gameCode?: string } | null };

export type ClassroomCompletedCounts = {
  gameCount: number;
  assignmentCompletedCount: number;
};

export async function countClassroomCompletedActivities(
  classroomId: string,
  client?: typeof supabase,
): Promise<ClassroomCompletedCounts> {
  const db = client ?? supabase;
  const empty = { gameCount: 0, assignmentCompletedCount: 0 };
  if (!db || !classroomId) return empty;

  try {
    const { data: rows, error: sessionError } = await db
      .from('practice_sessions')
      .select('results')
      .eq('classroom_id', classroomId)
      .not('results->>gameCode', 'is', null)
      .limit(MAX_SESSION_ROWS);

    if (sessionError) {
      return empty;
    }

    const codes = new Set<string>();
    for (const row of (rows ?? []) as SessionRow[]) {
      const code = row.results?.gameCode;
      if (!code) continue;
      codes.add(code);
      if (codes.size >= TEACHER_PRO_MILESTONE_MIN_COMPLETED) break;
    }
    const gameCount = codes.size;
    if (gameCount >= TEACHER_PRO_MILESTONE_MIN_COMPLETED) {
      return { gameCount, assignmentCompletedCount: 0 };
    }

    const { data: assignments, error: assignmentError } = await db
      .from('lesson_assignments')
      .select('id')
      .eq('classroom_id', classroomId);

    if (assignmentError) {
      return { gameCount, assignmentCompletedCount: 0 };
    }

    const ids = ((assignments ?? []) as Array<{ id?: string }>)
      .map((a) => a.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (ids.length === 0) return { gameCount, assignmentCompletedCount: 0 };

    const { count, error: completionError } = await db
      .from('student_lesson_progress')
      .select('id', { count: 'exact', head: true })
      .in('assignment_id', ids)
      .not('completed_at', 'is', null);

    if (completionError) {
      return { gameCount, assignmentCompletedCount: 0 };
    }

    return { gameCount, assignmentCompletedCount: count ?? 0 };
  } catch {
    return empty;
  }
}

/**
 * How many assignments a classroom has (created, any status) — the input for
 * the usage-triggered Pro prompt and the assignment-cap check. Counts, never
 * rows: the caller only thresholds at TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS,
 * so the count saturates there. Unknown reads fail closed to 0, same as the
 * counts above — a late answer cannot retract an upsell (pitfall class 1).
 */
export async function countClassroomCreatedAssignments(
  classroomId: string,
  client?: typeof supabase,
): Promise<number> {
  const db = client ?? supabase;
  if (!db || !classroomId) return 0;

  try {
    const { count, error } = await db
      .from('lesson_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', classroomId);

    if (error) return 0;
    return Math.min(count ?? 0, TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS);
  } catch {
    return 0;
  }
}
