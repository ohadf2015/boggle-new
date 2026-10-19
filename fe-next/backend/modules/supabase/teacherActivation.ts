import logger from '../../utils/logger';
import { getSupabase } from './client';

/** Stamps the onboarding checklist's "ran a live game" step when a room is created; first stamp wins, never throws. */
export async function markTeacherLiveStarted(teacherId: string): Promise<void> {
  if (!teacherId) return;
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ teacher_activation_live_started_at: new Date().toISOString() })
      .eq('id', teacherId)
      .is('teacher_activation_live_started_at', null);
    if (error) logger.info('TEACHER_ACTIVATION', `live-started stamp failed: ${error.message}`);
  } catch (err) {
    logger.info('TEACHER_ACTIVATION', `live-started stamp threw: ${(err as Error).message}`);
  }
}
