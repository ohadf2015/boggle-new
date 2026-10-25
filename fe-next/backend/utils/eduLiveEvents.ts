import { getSupabase } from '../modules/supabase/client';
import type { ClassroomGame } from '../modules/classroomGameTypes';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import {
  buildClassroomGameStartedEvent,
  buildClassroomJoinRefusedEvent,
  captureEduServerEvents,
  type ClassroomJoinRefusal,
} from './educationTelemetry';
import { buildLiveGameEndedEvent, buildLiveRoundStartedEvent } from './educationRoundTelemetry';
import logger from './logger';

export async function captureLiveRoundStarted(game: ClassroomGame): Promise<void> {
  try {
    const isTestAccount = await isAnyTestAccount(getSupabase(), [game.teacherId]);
    captureEduServerEvents(
      [buildClassroomGameStartedEvent(game, { isTestAccount }), buildLiveRoundStartedEvent(game, { isTestAccount })]
        .filter((e) => e !== null),
    );
  } catch (err) {
    logger.error('EDU_TELEMETRY', `live round start event failed for ${game?.gameCode}: ${(err as Error).message}`);
  }
}

async function countRecordedRounds(game: ClassroomGame): Promise<number | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { count, error } = await sb
    .from('classroom_rounds' as never)
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', game.teacherId)
    .eq('game_code', game.gameCode);
  return error ? null : (count ?? 0);
}

export async function captureLiveGameEnded(game: ClassroomGame): Promise<void> {
  try {
    const [isTestAccount, roundsRecorded] = await Promise.all([
      isAnyTestAccount(getSupabase(), [game.teacherId]),
      countRecordedRounds(game),
    ]);
    const ev = buildLiveGameEndedEvent(game, { isTestAccount, now: new Date(), roundsRecorded });
    if (ev) captureEduServerEvents([ev]);
  } catch (err) {
    logger.error('EDU_TELEMETRY', `live game ended event failed for ${game?.gameCode}: ${(err as Error).message}`);
  }
}

export async function captureJoinRefusal(refusal: Omit<ClassroomJoinRefusal, 'isTestAccount'>): Promise<void> {
  try {
    const sb = getSupabase();
    let teacherId: string | null = null;
    if (sb && refusal.classroomId) {
      const { data } = await sb.from('classrooms').select('teacher_id').eq('id', refusal.classroomId).maybeSingle();
      teacherId = (data as { teacher_id?: string } | null)?.teacher_id ?? null;
    }
    const isTestAccount = await isAnyTestAccount(sb, [teacherId, refusal.actorId]);
    const ev = buildClassroomJoinRefusedEvent({ ...refusal, isTestAccount });
    if (ev) captureEduServerEvents([ev]);
  } catch (err) {
    logger.error('EDU_TELEMETRY', `join refusal event failed for ${refusal.gameCode}: ${(err as Error).message}`);
  }
}
