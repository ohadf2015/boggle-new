import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { buildStudentReturnedEvents, type StudentReturnSurface } from '@/backend/utils/educationRoundTelemetry';
import { loadTestAccountIds } from './eduTestAccount';

const MAX_CLASSROOMS = 20;

/**
 * `edu_student_returned` from a solo session start (practice, assignment, duel).
 * Live rounds emit their own from the round record. Indexed lookups only; never throws.
 */
export async function captureStudentReturned(
  sb: Pick<SupabaseClient, 'from'> | null,
  args: { studentId: string; gameMode: string; surface: StudentReturnSurface; lessonId?: string; now?: Date },
): Promise<void> {
  if (!sb || !args.studentId) return;
  try {
    const { data, error } = await sb
      .from('classroom_memberships')
      .select('classroom_id, joined_at')
      .eq('student_id', args.studentId)
      .order('joined_at', { ascending: true })
      .limit(MAX_CLASSROOMS);
    if (error) throw new Error(error.message);
    const rooms = (data ?? []) as Array<{ classroom_id: string; joined_at: string | null }>;
    if (rooms.length === 0) return;

    let classroomId = rooms[0].classroom_id;
    let surface = args.surface;
    if (args.lessonId && surface === 'practice') {
      const { data: assigned } = await sb
        .from('lesson_assignments')
        .select('classroom_id')
        .eq('lesson_id', args.lessonId)
        .in('classroom_id', rooms.map((r) => r.classroom_id))
        .limit(1);
      const hit = ((assigned ?? []) as Array<{ classroom_id: string }>)[0];
      if (hit) {
        classroomId = hit.classroom_id;
        surface = 'assignment';
      }
    }

    const flagged = await loadTestAccountIds(sb, [args.studentId]);
    captureEduServerEvents(
      buildStudentReturnedEvents({
        classroomId,
        now: args.now ?? new Date(),
        gameMode: args.gameMode,
        surface,
        students: [{ userId: args.studentId, joinedAt: rooms[0].joined_at, isTestAccount: flagged.has(args.studentId) }],
      }),
    );
  } catch (err) {
    logger.error('[edu-telemetry] student returned event failed', err instanceof Error ? err.message : err);
  }
}
