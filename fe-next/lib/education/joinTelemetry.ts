import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { captureEduServerEvents, type EduServerEvent } from '@/backend/utils/educationTelemetry';
import { buildFirstStudentJoinedEvent, buildStudentJoinedEvent } from '@/backend/utils/educationRoundTelemetry';
import { loadTestAccountIds } from './eduTestAccount';

/** A guest student has no email, so the teacher's flag is what marks a QA rig's students. */
export async function captureStudentJoinEvents(
  admin: Pick<SupabaseClient, 'from'> | null,
  args: { classroomId: string; studentId: string },
): Promise<void> {
  const events: EduServerEvent[] = [];
  try {
    const { data: room } = admin
      ? await admin.from('classrooms').select('teacher_id').eq('id', args.classroomId).maybeSingle()
      : { data: null };
    const teacherId = (room as { teacher_id?: string } | null)?.teacher_id ?? null;
    const flagged = await loadTestAccountIds(admin, [args.studentId, teacherId]);
    const isTestAccount = flagged.size > 0;
    events.push(buildStudentJoinedEvent({ studentId: args.studentId, classroomId: args.classroomId, isTestAccount }));

    if (admin && teacherId) {
      const { count, error } = await admin
        .from('classroom_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('classroom_id', args.classroomId)
        .neq('student_id', teacherId);
      if (error) throw new Error(error.message);
      if (count === 1) {
        events.push(buildFirstStudentJoinedEvent({ teacherId, classroomId: args.classroomId, isTestAccount }));
      }
    }
  } catch (err) {
    logger.error('[edu-telemetry] join events failed', err instanceof Error ? err.message : err);
    if (events.length === 0) {
      events.push(buildStudentJoinedEvent({ studentId: args.studentId, classroomId: args.classroomId, isTestAccount: false }));
    }
  }
  captureEduServerEvents(events);
}
