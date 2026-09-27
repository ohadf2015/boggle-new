/**
 * What the base `join` door says when a code has no socket room.
 *
 * A classroom code exists in two places that come alive at different moments
 * (recurring pitfall class 1): the Redis classroom record is written the moment
 * the teacher's "Join the game" screen shows the code, but the socket ROOM is
 * only created when the teacher taps START GAME and the multiplayer host page
 * emits `createGame`. Children join the instant the code is on the wall, so
 * "record yes, room not yet" is the NORMAL first state of a class — and it used
 * to be answered GAME_NOT_FOUND, which the classroom client reads as "your
 * class game ended" and sends the child back to /student.
 *
 * So the one Redis read that already ran on this path for telemetry now also
 * decides the answer:
 *
 *   - a live session still in its lobby (`status: 'waiting'`, not ended)
 *     → CLASSROOM_NOT_OPEN. Not a refusal: the client holds the child on a
 *     "waiting for your teacher" screen and re-asks until the room opens.
 *   - anything else (unknown code, ended session, a playing session whose room
 *     was lost to a restart, a Redis error) → GAME_NOT_FOUND, exactly as
 *     before. A failed read must never become a wait that cannot end.
 *
 * This reveals nothing new about a code: `/api/education/join-code/resolve`
 * already answers `kind: 'game'` for the same record, and an ended session
 * stays indistinguishable from a wrong one (F-03).
 */

import type { Server, Socket } from 'socket.io';

import { getClassroomGame, type ClassroomGame } from '../modules/classroomGameManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';
import { buildClassroomJoinRefusedEvent, captureEduServerEvents } from '../utils/educationTelemetry.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/** Where sockets told CLASSROOM_NOT_OPEN are parked until the room opens. */
export function classroomWaitRoom(gameCode: string): string {
  return `classroomRoomWait:${gameCode}`;
}

/**
 * Called by `createGame` once the room exists: every parked socket is told at
 * once and re-emits `join`. The client also re-asks on a slow timer, so a lost
 * announcement (another instance, a reconnect) costs seconds, never the round.
 * Never throws — room creation must not fail on a courtesy broadcast.
 */
export function announceClassroomRoomOpened(io: Server, gameCode: string): void {
  try {
    const room = classroomWaitRoom(gameCode);
    io.to(room).emit('classroomRoomOpened', { gameCode });
    io.in(room).socketsLeave(room);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not announce room open for ${gameCode}: ${(err as Error)?.message ?? err}`);
  }
}

/** A live classroom session whose room the teacher has not opened yet. */
export function isClassroomAwaitingRoom(record: ClassroomGame | null | undefined): boolean {
  return !!record && record.status === 'waiting' && !isClassroomSessionEnded(record);
}

/** Answer a `join` whose code has no room in memory or in Redis. Never throws. */
export async function answerMissingRoom(socket: Socket, gameCode: string): Promise<void> {
  let record: ClassroomGame | null = null;
  try {
    record = await getClassroomGame(gameCode);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not read classroom record for missing room ${gameCode}: ${(err as Error)?.message ?? err}`);
  }

  if (isClassroomAwaitingRoom(record)) {
    logger.info('CLASSROOM_GAME', `Early join for ${gameCode}: room not open yet, client will wait`);
    void socket.join(classroomWaitRoom(gameCode));
    emitError(socket, ErrorCodes.CLASSROOM_NOT_OPEN);
    return;
  }

  emitError(socket, ErrorCodes.GAME_NOT_FOUND);
  if (!record) return;

  // The room is gone from memory AND from Redis while the class session is
  // live. For a class this is the most common way a child is turned away — 43
  // on production in the three weeks to 2026-09-16. Distinct from
  // SESSION_ENDED: the teacher never ended it; the ROOM stopped existing
  // (restart, redeploy, or an instance that never held it).
  try {
    const event = buildClassroomJoinRefusedEvent({
      gameCode,
      classroomId: record.classroomId,
      reason: 'ROOM_GONE',
      door: 'join',
      actorId: (socket.data?.verifiedUserId as string | undefined) ?? null,
    });
    if (event) captureEduServerEvents([event]);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not record a lost room for ${gameCode}: ${(err as Error)?.message ?? err}`);
  }
}
