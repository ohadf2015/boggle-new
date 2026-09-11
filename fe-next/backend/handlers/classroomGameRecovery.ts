/**
 * The classroom half of `requestGameState`.
 *
 * `requestGameState` is the recovery door: the client fires it when `startGame`
 * never arrived, and `gameLifecycleHandler` answers with the board, the clock,
 * the pause flag and the leaderboard — and, until now, nothing about the
 * classroom. `join` answers with all of that PLUS `classroomContext`, the
 * student's differentiation level and the lesson word bank. Two routes to
 * "restore this student's game", one of them quietly thinner: recurring pitfall
 * class 3, the same shape as the reconnect bug that froze scores at zero.
 *
 * The student it costs is precisely the one the word bank exists for. Recovered
 * through this path, a support student saw an empty bank and was silently
 * treated as `core` for the rest of the round.
 *
 * Why a second listener instead of four lines in the lifecycle handler:
 * Socket.IO invokes EVERY listener registered for an event, so the two run for
 * one client emit. That keeps a classroom concern in classroom files, and keeps
 * an 850-line handler from growing for a feature it knows nothing about.
 * Registered from `registerClassroomGameHandlers`, which `backend/handlers/index.ts`
 * calls unconditionally for every socket — guests included, who are the students
 * this matters for.
 */

import type { Socket } from 'socket.io';

import { getGameBySocketId } from '../modules/gameStateManager.js';
import { emitClassroomContext } from '../modules/classroomGameContext.js';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';
import { sessionEndedNotice } from './classroomSessionEndedNotice.js';
import logger from '../utils/logger.js';

/**
 * Minimum gap between two context re-sends on one socket.
 *
 * This listener deliberately sits OUTSIDE the lifecycle handler's rate-limit
 * bucket: drawing on the same bucket would halve the real handler's
 * `requestGameState` budget and make it start returning early — a silent
 * failure (class 4) introduced by a fix. So it carries its own floor instead. A
 * client watchdog that retries three times in a second must not mean three
 * Supabase membership lookups per student, while a genuine second recovery
 * minutes later is still answered.
 */
const CONTEXT_RESEND_FLOOR_MS = 2000;

/**
 * Say the teacher ended the class, to one socket that asked too late.
 *
 * Its own read and its own listener step, deliberately kept OUT of the context
 * call above so that path stays exactly what it was. This is a rare branch —
 * a recovery watchdog only fires when `startGame` never arrived — and it must
 * not restructure the common one.
 *
 * Why it exists at all: once the teacher's end-session tears the room down,
 * the lifecycle handler's own `requestGameState` listener finds no game and
 * returns without a word. That is indistinguishable from "nothing to do"
 * (pitfall class 4) and leaves the student on a spinner. It is reachable by a
 * student whose `hostLeftRoomClosing` was dropped by a flaky connection: their
 * watchdog fires, and this is the only thing that answers.
 *
 * Unlike `classroomSeatGate`, this socket is ALREADY SEATED, so the honest
 * answer is the ending everyone else received — not "we didn't recognize that
 * code". Fails silently open on a read error: inventing an ending for a class
 * still playing would be worse than the spinner.
 */
async function announceIfSessionEnded(socket: Socket, gameCode: string): Promise<void> {
  try {
    const game = await getClassroomGame(gameCode);
    if (game && isClassroomSessionEnded(game)) {
      socket.emit('hostLeftRoomClosing', sessionEndedNotice());
    }
  } catch (err) {
    logger.warn(
      'CLASSROOM_GAME',
      `Recovery could not read ${gameCode}, leaving the student in place: ${(err as Error)?.message ?? err}`
    );
  }
}

/**
 * Re-send this socket's classroom context whenever it asks for a game-state
 * recovery — and, if the session it is recovering into is already over, say so
 * rather than going quiet. No-ops off a classroom room (one cheap Redis read)
 * and for a socket that is not in a game at all.
 */
export function registerClassroomRecoveryHandlers(socket: Socket): void {
  let lastSentAt = 0;

  socket.on('requestGameState', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const now = Date.now();
    if (now - lastSentAt < CONTEXT_RESEND_FLOOR_MS) return;
    lastSentAt = now;

    // Fire-and-forget: a Supabase membership read must never delay the board
    // the lifecycle listener is restoring on the same event.
    void emitClassroomContext(
      socket,
      gameCode,
      ((socket.data as Record<string, unknown>)?.verifiedUserId as string) || undefined
    );

    // Same throttle, separate concern, separate read — see above.
    void announceIfSessionEnded(socket, gameCode);
  });
}

export default registerClassroomRecoveryHandlers;
