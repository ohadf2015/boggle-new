/**
 * When is a classroom code actually dead?
 *
 * A classroom game has TWO clocks and they are not the same clock.
 *
 *   round  — `status: 'waiting' | 'playing' | 'finished'`. `'finished'` is
 *            written at the end of EVERY round: `gameScores.ts:405` the instant
 *            a board timer expires, `vocabQuizRound.ts:92` when a quiz's last
 *            question closes. The next round starts when the TEACHER presses
 *            it, seconds to minutes later, while the class reads the results
 *            screen. The room, the roster and the code are all alive for that
 *            whole gap, and Rematch is the same room under the same code.
 *
 *   session — `endedAt`, written once and never unwritten. This is "the teacher
 *            ended the game", the thing that kills a Kahoot PIN.
 *
 * Reading the round clock as the session clock is what made an ended round's
 * code stop resolving — first for four hours after round one (the original dead
 * room), then, once the reopen was added, for the whole teacher-paced gap
 * between two rounds, where a latecomer typing the code off the whiteboard was
 * told "we didn't recognize that game PIN" while the class was mid-lesson.
 * Both are the same mistake read from opposite ends. `endedAt` is the fix: the
 * gates ask this file, and this file asks only about the session.
 *
 * Two things write it, and nothing else:
 *
 *   1. The teacher's own `endClassroomGame` / `classroomGameEnd` socket event
 *      (`classroomGameHandler.ts`), which now passes `'ended'` where it used to
 *      pass `'finished'`.
 *   2. `endClassroomGameSession`, called from `gameStateManager.deleteGame` —
 *      the one point every genuine teardown converges on: `closeRoom`, host
 *      left with no successor, host reconnect grace expired, host started a new
 *      game elsewhere, the empty-room sweep, the stale-game sweep.
 *
 * Deliberately NOT `gameCleanupEmitter.onGameEnd`, the obvious-looking hook:
 * `services/gameLifecycle/gameEnd.ts:85` fires that at every ROUND end, so
 * subscribing to it would rebuild the between-round dead end under a new name.
 *
 * The record is marked, never deleted. `gameScores.ts` re-reads it while it
 * scores the round it just ended (participation bonus, classroom summary), so
 * deleting on end would trade a dead end for a silently lost round — pitfall
 * class 4, and the same reason `lookupLiveClassroomGame` gates instead of
 * deleting.
 */

import { getRedisClient } from '../redisClient.js';
import logger from '../utils/logger.js';
import { getClassroomGame, updateClassroomGameStatus } from './classroomGameManager.js';
import { isClassroomSessionEnded } from './classroomGameSessionState.js';

export { isClassroomSessionEnded } from './classroomGameSessionState.js';
export type { ClassroomSessionState } from './classroomGameSessionState.js';

/**
 * Mark a classroom session over because its room is gone.
 *
 * Called on EVERY room teardown in the app, the overwhelming majority of which
 * are ordinary multiplayer rooms, so the no-op path must cost one Redis read
 * and nothing else — and must never throw. `deleteGame` is synchronous
 * bookkeeping; a Redis hiccup here cannot be allowed to take a room teardown
 * with it.
 */
export async function endClassroomGameSession(gameCode: string): Promise<void> {
  try {
    // The Next-route module registry has no Socket.IO Redis client, and neither
    // do most unit tests. Nothing to end, and no error worth logging.
    if (!getRedisClient()) return;

    const game = await getClassroomGame(gameCode);
    if (!game) return; // an ordinary multiplayer room: the common case
    if (isClassroomSessionEnded(game)) return; // idempotent: two sweeps, one write

    await updateClassroomGameStatus(gameCode, 'ended');
  } catch (error) {
    // Loud, not silent: a swallowed failure here leaves a projector code
    // joinable for the rest of its four-hour TTL.
    logger.error(
      'CLASSROOM_GAME',
      `Failed to end classroom session for ${gameCode}: ${(error as Error).message}`
    );
  }
}

export default endClassroomGameSession;
