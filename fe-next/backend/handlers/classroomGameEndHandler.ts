/**
 * Ending a classroom session — and ending the ROOM with it.
 *
 * Lifted whole out of `classroomGameHandler.ts` (which is over the 500-line
 * limit and may not grow) because this is now two jobs, not one, and the
 * second is what rounds 1-3 kept missing.
 *
 * WHAT ROUND 3 LEFT BEHIND. Ending the session wrote `ended` + `endedAt` to the
 * Redis classroom record and emitted `classroomGameEnded` to
 * `classroom:<classroomId>`. Four doors learned to respect `endedAt`. Nobody
 * told the ROOM. `gameStateManager` kept the in-memory game standing with its
 * players inside it, so:
 *
 *   - Students sitting in `game:<gameCode>` were told NOTHING. The teacher's
 *     event goes to the classroom room, which holds the teacher's dashboard
 *     sockets and enrolled students who came through `joinClassroomGame`. A
 *     guest who scanned the projector QR arrived through the base `join` and
 *     is in `game:<gameCode>` and nowhere else. They sat on a board that would
 *     never tick again — pitfall class 4, a failure with no output at all.
 *
 *   - `getGame(code)` kept answering, so the base `join` kept seating people
 *     into a dead session. That is the gap a blind critic reproduced live with
 *     socket.io-client.
 *
 * So the fix here is the root one — the session ending is the room ending —
 * and `classroomSeatGate` is the belt for what teardown structurally cannot
 * reach: `deleteGame` early-returns when the room is not in THIS instance's
 * memory, so on another instance the room stands and the code is a door again.
 *
 * ORDER IS LOAD-BEARING: broadcast, then persist, then tear down. `deleteGame`
 * fires `gameCleanupEmitter.emitGameEnd` and a fire-and-forget
 * `endClassroomGameSession`; neither may race the score write, and a broadcast
 * into a room the same tick deleted reaches nobody.
 *
 * NO NEW COPY. Students are told through `hostLeftRoomClosing`, the event the
 * multiplayer client already answers with a toast, a grace modal, and — for a
 * classroom student — a route home to `/student` instead of the arcade
 * (`lib/education/classroomRoomGone`). It carries the EXISTING key
 * `education.student.classroomRoomGone` ("Your class game ended. Ask your
 * teacher to start a new one."), already translated in all six locales.
 * `reason` is deliberately OMITTED: `HostLeftGraceModal` maps `reason` through
 * a `Record` over a closed union, so inventing a member there would be a
 * type error in a file this change has no business touching. Without it the
 * modal shows its generic body while the toast carries the specific line.
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';

import {
  getClassroomGame,
  updateClassroomGameStatus,
} from '../modules/classroomGameManager.js';
import { deleteGame, getActiveRooms } from '../modules/gameStateManager.js';
import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
} from '../utils/socketHelpers.js';
import { persistClassroomGameScores } from './classroomGamePersistence.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { gameCodeSchema } from '../utils/socketValidation.js';
import { sessionEndedNotice } from './classroomSessionEndedNotice.js';
import logger from '../utils/logger.js';

const endClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
  playerScores: z.array(z.object({
    userId: z.string().uuid(),
    score: z.number().min(0),
    wordsFound: z.array(z.string()).optional(),
  })).optional(),
});

/** Tell everyone actually sitting in the room that the teacher ended the class. */
function announceSessionEnded(io: Server, gameCode: string): void {
  broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', sessionEndedNotice());
}

/**
 * End a classroom game, persist its results, and close the room.
 *
 * ONE body, registered under both historical event names. They used to be two
 * near-identical copies and only `endClassroomGame` checked that the caller is
 * the teacher — `classroomGameEnd` accepted any authenticated socket. That is
 * recurring pitfall class 3 (two routes to the same outcome, one silently
 * weaker), and it was a P0: the game code is on the projector, in the QR and
 * on every student's screen, so any student could end the round, take the
 * Redis `SET NX` idempotency lock inside `persistClassroomGameScores`, and
 * leave the server's own end-of-round write with nothing to do — the whole
 * class's session, word progress and XP silently lost (class 4).
 *
 * `playerScores` is client-supplied, so it is also filtered down to userIds
 * that actually joined this game before it reaches persistence.
 */
export function registerClassroomGameEndHandlers(io: Server, socket: Socket): void {
  const handleEndClassroomGame = async (data: unknown): Promise<void> => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = endClassroomGameSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${validation.error.issues[0]?.message}` });
      return;
    }
    const payload = validation.data as { gameCode: string; playerScores?: Array<{ userId: string; score: number; wordsFound?: string[] }> };

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      socket.emit('classroomGameError', { error: 'Authentication required' });
      return;
    }

    try {
      const game = await getClassroomGame(payload.gameCode);
      if (!game) {
        socket.emit('classroomGameError', { error: 'Game not found' });
        return;
      }

      if (authUserId !== game.teacherId) {
        socket.emit('classroomGameError', { error: 'Only the teacher can end this game' });
        return;
      }

      await updateClassroomGameStatus(payload.gameCode, 'ended');

      // FIRST, while the room still exists and its sockets are still in it.
      announceSessionEnded(io, payload.gameCode);

      // Persistence is fenced off from teardown. The session record was
      // written `ended` above, so the session IS over whatever Supabase does
      // next — and a room left standing because a score write failed would put
      // the room and the session back out of step, which is the exact gap this
      // round exists to close. A swallowed error here is loud, not silent
      // (pitfall class 4): it is logged, and the teacher's own end-of-round
      // path still holds the results.
      try {
        // Only score rows for players the server saw join this game. Anything
        // else is a fabricated userId with a fabricated score and XP behind it.
        const joinedUserIds = new Set((game.players || []).map((p) => p.userId));
        const verifiedScores = payload.playerScores?.filter((s) => joinedUserIds.has(s.userId));

        // Persist scores to Supabase (S2.5) — F-24: capture per-player rewards
        const rewards = await persistClassroomGameScores(game, verifiedScores);

        io.to(`classroom:${game.classroomId}`).emit('classroomGameEnded', {
          gameCode: payload.gameCode, sessionEnded: true, // the SESSION, not a round
          rewards,
        });
      } catch (error) {
        logger.error(
          'CLASSROOM_GAME',
          `Scores for ${payload.gameCode} did not persist, closing the room anyway: ${error}`
        );
      }

      // LAST. The session is over, so the room is over: drop the in-memory
      // game, its timers and its Redis key, so `getGame` stops answering and
      // the code stops being a door. Idempotent — a room already gone (another
      // instance, a prior teardown) is a no-op, which is exactly why the seat
      // gate exists as well.
      deleteGame(payload.gameCode);
      broadcastActiveRooms(io, getActiveRooms());

      logger.info('CLASSROOM_GAME', `Teacher ${authUserId} ended game ${payload.gameCode} and closed its room`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to end game: ${error}`);
      socket.emit('classroomGameError', { error: 'Failed to end game' });
    }
  };

  // S2.7 (teacher ends early) and S2.5 (game completion) — same outcome, so the
  // same guarded body. Do not re-fork these.
  socket.on('endClassroomGame', handleEndClassroomGame);
  socket.on('classroomGameEnd', handleEndClassroomGame);
}

export default registerClassroomGameEndHandlers;
