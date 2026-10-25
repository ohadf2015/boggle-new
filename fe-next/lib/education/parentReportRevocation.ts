import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParentReportTokenPayload } from './parentReportToken';
import { migrationPendingHint } from '@/lib/supabase/migrationPendingHint';
import logger from '@/utils/logger';

const TABLE = 'parent_report_link_revocations';

/**
 * A teacher revokes a student's parent links by stamping a cutoff; every link
 * issued before it dies. Links minted before tokens carried an issue time die
 * on any revocation. Fails closed on read errors, except a not-yet-migrated table.
 */
export async function isParentReportRevoked(admin: SupabaseClient, payload: ParentReportTokenPayload): Promise<boolean> {
  const { data, error } = await admin
    .from(TABLE)
    .select('revoked_before')
    .eq('classroom_id', payload.classroomId)
    .eq('student_id', payload.studentId);
  if (error) {
    const pending = migrationPendingHint(error);
    if (pending) {
      logger.error('[parent-report] revocation check skipped:', pending);
      return false;
    }
    return true;
  }
  const issuedAt = typeof payload.iat === 'number' ? payload.iat : -Infinity;
  return ((data ?? []) as Array<{ revoked_before: string }>).some((r) => Date.parse(r.revoked_before) > issuedAt);
}

export async function revokeParentReportLinks(
  admin: SupabaseClient,
  classroomId: string,
  studentId: string,
  nowMs: number = Date.now(),
): Promise<{ error: string | null }> {
  const { error } = await admin
    .from(TABLE)
    .upsert(
      { classroom_id: classroomId, student_id: studentId, revoked_before: new Date(nowMs).toISOString() },
      { onConflict: 'classroom_id,student_id' },
    );
  return { error: error?.message ?? null };
}
