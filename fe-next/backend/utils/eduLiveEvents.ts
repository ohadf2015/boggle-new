/** Live-game start/end events, tagged with the teacher's real test-account flag. Never throws. */
import { getSupabase } from '../modules/supabase/client';
import type { ClassroomGame } from '../modules/classroomGameTypes';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import { buildClassroomGameStartedEvent, captureEduServerEvents } from './educationTelemetry';
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

export async function captureLiveGameEnded(game: ClassroomGame): Promise<void> {
  try {
    const isTestAccount = await isAnyTestAccount(getSupabase(), [game.teacherId]);
    const ev = buildLiveGameEndedEvent(game, { isTestAccount, now: new Date() });
    if (ev) captureEduServerEvents([ev]);
  } catch (err) {
    logger.error('EDU_TELEMETRY', `live game ended event failed for ${game?.gameCode}: ${(err as Error).message}`);
  }
}
