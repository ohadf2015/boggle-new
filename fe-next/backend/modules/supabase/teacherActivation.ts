import logger from '../../utils/logger';
import { getSupabase } from './client';

async function stampOnce(teacherId: string, column: string, label: string): Promise<void> {
  if (!teacherId) return;
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ [column]: new Date().toISOString() })
      .eq('id', teacherId)
      .is(column, null);
    if (error) logger.info('TEACHER_ACTIVATION', `${label} stamp failed: ${error.message}`);
  } catch (err) {
    logger.info('TEACHER_ACTIVATION', `${label} stamp threw: ${(err as Error).message}`);
  }
}

/** Stamps the checklist's "opened a room" signal when a room is created; first stamp wins, never throws. */
export async function markTeacherRoomOpened(teacherId: string): Promise<void> {
  await stampOnce(teacherId, 'teacher_activation_room_opened_at', 'room-opened');
}

/**
 * Stamps the onboarding checklist's "ran a live game" step. Server-side only:
 * called when the teacher's FIRST classroom round with 2+ real players
 * completes (the same predicate that starts the access-trial clock), never at
 * room creation — an empty room is not a taught round. First stamp wins,
 * never throws.
 */
export async function markTeacherLiveStarted(teacherId: string): Promise<void> {
  await stampOnce(teacherId, 'teacher_activation_live_started_at', 'live-started');
}
