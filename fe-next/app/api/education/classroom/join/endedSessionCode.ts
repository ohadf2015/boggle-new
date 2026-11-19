import { getCacheClient } from '@/backend/cache/redisCache';
import { classroomGameKey } from '@/lib/education/classroomGameLookup';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

/** The class an ended session code belonged to, while its record still lives (4h TTL). Rejects when Redis fails. */
export async function readEndedClassroomSession(gameCode: string): Promise<{ classroomId: string } | null> {
  const raw = await getCacheClient().get(classroomGameKey(gameCode));
  if (!raw) return null;
  let game: { classroomId?: string; status?: string; endedAt?: string };
  try {
    game = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!game?.classroomId) return null;
  if (game.status !== 'ended' && !game.endedAt) return null;
  return { classroomId: game.classroomId };
}

export async function lookupEndedClassroomSession(gameCode: string): Promise<{ classroomId: string } | null> {
  try {
    const ended = await readEndedClassroomSession(gameCode);
    if (ended) return ended;
    // A live record owns the code. History must not call a round that is playing "ended".
    const raw = await getCacheClient().get(classroomGameKey(gameCode));
    if (raw) return null;
  } catch (err) {
    logger.warn('ended session lookup failed:', err);
    return null;
  }
  // Redis keeps an ended code for four hours. The whiteboard link outlives that;
  // the round row is the durable "this code belonged to this class".
  return lookupHistoricalClassroomCode(gameCode);
}

/** The class a finished round was played under, once Redis has forgotten the code. Never throws. */
export async function lookupHistoricalClassroomCode(gameCode: string): Promise<{ classroomId: string } | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;
    const { data, error } = await admin
      .from('classroom_rounds')
      .select('classroom_id')
      .eq('game_code', gameCode)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.classroom_id) return null;
    return { classroomId: data.classroom_id as string };
  } catch (err) {
    logger.warn('historical classroom code lookup failed:', err);
    return null;
  }
}

export { recordEndedCodeTry, countEndedCodeTries, countRecentEndedCodeTries, clearEndedCodeTries } from '@/lib/education/endedCodeTries';
