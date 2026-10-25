import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { buildParentReportViewedEvent } from '@/backend/utils/educationRoundTelemetry';
import { isAnyTestAccount } from './eduTestAccount';

/** A teacher checking their own share link is not a parent view. */
export async function captureParentReportView(
  admin: Pick<SupabaseClient, 'from'>,
  args: { token: string; classroomId: string; locale: string; viewerId: string | null },
): Promise<void> {
  try {
    const { data } = await admin.from('classrooms').select('teacher_id').eq('id', args.classroomId).maybeSingle();
    const teacherId = (data as { teacher_id?: string } | null)?.teacher_id ?? null;
    if (teacherId && args.viewerId === teacherId) return;
    const isTestAccount = await isAnyTestAccount(admin, [teacherId, args.viewerId]);
    captureEduServerEvents([
      buildParentReportViewedEvent({ token: args.token, classroomId: args.classroomId, locale: args.locale, isTestAccount }),
    ]);
  } catch (err) {
    logger.error('[parent-report] view event failed', err instanceof Error ? err.message : err);
  }
}
