import { getSupabase } from '../modules/supabase/client';
import type { ClassroomGame } from '../modules/classroomGameTypes';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import { recordEndedCodeTry } from '@/lib/education/endedCodeTries';
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

async function readRecordedRounds(game: ClassroomGame): Promise<{ count: number; peakPlayers: number } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, count, error } = await sb
    .from('classroom_rounds' as never)
    .select('player_count', { count: 'exact' })
    .eq('teacher_id', game.teacherId)
    .eq('game_code', game.gameCode);
  if (error) return null;
  const rows = (data ?? []) as Array<{ player_count: number | null }>;
  return { count: count ?? rows.length, peakPlayers: Math.max(0, ...rows.map((r) => r.player_count ?? 0)) };
}

export async function captureLiveGameEnded(game: ClassroomGame): Promise<void> {
  try {
    const [isTestAccount, recorded] = await Promise.all([
      isAnyTestAccount(getSupabase(), [game.teacherId]),
      readRecordedRounds(game),
    ]);
    const ev = buildLiveGameEndedEvent(game, {
      isTestAccount,
      now: new Date(),
      roundsRecorded: recorded?.count ?? null,
      peakPlayers: recorded?.peakPlayers,
    });
    if (ev) captureEduServerEvents([ev]);
  } catch (err) {
    logger.error('EDU_TELEMETRY', `live game ended event failed for ${game?.gameCode}: ${(err as Error).message}`);
  }
}

/**
 * Record one socket refusal. A SESSION_ENDED refusal also lands in the class's
 * late-join tally (`studentKey`, see lateJoinStudentKey) so the teacher's HQ can
 * say how many students tried to join after the game ended.
 */
export async function captureJoinRefusal(
  refusal: Omit<ClassroomJoinRefusal, 'isTestAccount'>,
  opts: { studentKey?: string | null } = {},
): Promise<void> {
  if (refusal?.reason === 'SESSION_ENDED' && refusal.classroomId) {
    try {
      await recordEndedCodeTry(refusal.classroomId, opts.studentKey || refusal.actorId || `guest:${refusal.gameCode}`);
    } catch (err) {
      logger.warn('EDU_TELEMETRY', `late join not tallied for ${refusal.gameCode}: ${(err as Error).message}`);
    }
  }
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
