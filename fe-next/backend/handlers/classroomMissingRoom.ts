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
import { getGame } from '../modules/gameStateManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';
import { captureJoinRefusal } from '../utils/eduLiveEvents';
import { lateJoinStudentKey } from '@/lib/education/endedCodeTries';
import { secondsSinceEnd } from '@/lib/education/secondsSinceEnd';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { captureClassroomGameMoved, emitClassroomGameMoved, findNewerClassroomGame } from './classroomGameMove';
import { restoreLiveRoomFromDb, getPersistedLiveRoomState } from '../modules/classroomLiveRoomPersistence.js';
import { getGameRoom } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';

interface WaitingStudent {
  username: string;
  avatar?: unknown;
  socketId: string;
}

const waitingStudents = new Map<string, Map<string, WaitingStudent>>();

export function getWaitingClassroomStudents(gameCode: string): Array<{ username: string; avatar?: unknown }> {
  const map = waitingStudents.get(gameCode);
  if (!map) return [];
  return Array.from(map.values()).map((s) => ({ username: s.username, avatar: s.avatar }));
}

export function clearWaitingClassroomStudents(gameCode: string): void {
  waitingStudents.delete(gameCode);
}

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
export function announceClassroomRoomOpened(io: Server, gameCode: string, classroomId?: string): void {
  try {
    clearWaitingClassroomStudents(gameCode);
    const room = classroomWaitRoom(gameCode);
    io.to(room).emit('classroomRoomOpened', { gameCode });
    io.in(room).socketsLeave(room);
    // Class pages auto-join only an open room; this is their signal that it now is.
    if (classroomId) io.to(`classroom:${classroomId}`).emit('classroomRoomOpened', { gameCode, classroomId });
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not announce room open for ${gameCode}: ${(err as Error)?.message ?? err}`);
  }
}

/** A live classroom session whose room the teacher has not opened yet. */
export function isClassroomAwaitingRoom(record: ClassroomGame | null | undefined): boolean {
  return !!record && record.status === 'waiting' && !isClassroomSessionEnded(record);
}

/**
 * Answer a `join` whose code has no room in memory or in Redis. Never throws.
 * Resolves 'opened' when the room appeared meanwhile, so the caller seats the child now.
 */
export async function answerMissingRoom(
  socket: Socket,
  gameCode: string,
  username?: string,
  avatar?: unknown,
  io?: Server
): Promise<'opened' | void> {
  // Check if room appeared in memory meanwhile
  if (getGame(gameCode)) return 'opened';

  // Attempt dead-room recovery from persistent Postgres DB
  const verifiedUserId = (socket.data?.verifiedUserId as string | undefined) || undefined;
  try {
    const recovered = await restoreLiveRoomFromDb(gameCode, socket, verifiedUserId);
    if (recovered && getGame(gameCode)) {
      logger.info('CLASSROOM_GAME', `Restored live room ${gameCode} from DB after restart`);
      return 'opened';
    }
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `DB recovery failed for ${gameCode}: ${(err as Error)?.message ?? err}`);
  }

  let record: ClassroomGame | null = null;
  try {
    record = await getClassroomGame(gameCode);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not read classroom record for missing room ${gameCode}: ${(err as Error)?.message ?? err}`);
  }
  // createGame may have run (and announced) during the await, before this socket could be parked.
  if (getGame(gameCode)) return 'opened';

  if (isClassroomAwaitingRoom(record)) {
    logger.info('CLASSROOM_GAME', `Early join for ${gameCode}: room not open yet, client will wait`);
    void socket.join(classroomWaitRoom(gameCode));

    if (username) {
      let map = waitingStudents.get(gameCode);
      if (!map) {
        map = new Map();
        waitingStudents.set(gameCode, map);
      }
      map.set(socket.id, { username, avatar, socketId: socket.id });

      const roster = getWaitingClassroomStudents(gameCode);
      const targetRoom = getGameRoom(gameCode);
      if (io) {
        io.to(targetRoom).emit('updateUsers', { users: roster });
        if (record?.classroomId) {
          io.to(`classroom:${record.classroomId}`).emit('updateUsers', { users: roster });
        }
      } else {
        socket.to(targetRoom).emit('updateUsers', { users: roster });
        if (record?.classroomId) {
          socket.to(`classroom:${record.classroomId}`).emit('updateUsers', { users: roster });
        }
      }

      socket.once('disconnect', () => {
        const currentMap = waitingStudents.get(gameCode);
        if (currentMap && currentMap.has(socket.id)) {
          currentMap.delete(socket.id);
          const updatedRoster = getWaitingClassroomStudents(gameCode);
          if (io) {
            io.to(targetRoom).emit('updateUsers', { users: updatedRoster });
            if (record?.classroomId) {
              io.to(`classroom:${record.classroomId}`).emit('updateUsers', { users: updatedRoster });
            }
          }
        }
      });
    }

    emitError(socket, ErrorCodes.CLASSROOM_NOT_OPEN);
    return;
  }

  // The teacher opened a newer game for this class: send the student there,
  // not out of the lesson (classroomGameMove.ts).
  const toCode = record ? await findNewerClassroomGame(record) : null;
  if (record && toCode) {
    logger.info('CLASSROOM_GAME', `Old code ${gameCode} re-joined: class moved to ${toCode}`);
    emitClassroomGameMoved(socket, { fromCode: gameCode, toCode, reason: 'old_code_rejoin' });
    captureClassroomGameMoved({
      fromCode: gameCode,
      toCode,
      reason: 'old_code_rejoin',
      classroomId: record.classroomId,
      teacherId: record.teacherId,
      actorId: (socket.data?.verifiedUserId as string | undefined) ?? null,
      students: 1,
    });
    return;
  }

  if (!record) {
    const persisted = await getPersistedLiveRoomState(gameCode).catch(() => null);
    if (persisted?.classroomId && persisted.currentPhase === 'ended') {
      void socket.join(`classroom:${persisted.classroomId}`);
      emitError(socket, ErrorCodes.CLASSROOM_SESSION_WAITING, { details: { classroomId: persisted.classroomId } });
      return;
    }
    emitError(socket, ErrorCodes.GAME_NOT_FOUND, { details: { gameCode } });
    return;
  }

  // An ended class is not a missing room. Park the student on the class channel
  // and tell the client to enroll and wait — re-asking this code is the retry loop.
  if (isClassroomSessionEnded(record)) {
    void socket.join(`classroom:${record.classroomId}`);
    emitError(socket, ErrorCodes.CLASSROOM_SESSION_WAITING, { details: { classroomId: record.classroomId } });
  } else {
    emitError(socket, ErrorCodes.GAME_NOT_FOUND, { details: { gameCode } });
  }

  // Ending a session tears its room down, so an ended session lands here, not
  // at the seat gate; only a LIVE session without a room is a real ROOM_GONE.
  try {
    const actorId = (socket.data?.verifiedUserId as string | undefined) ?? null;
    void captureJoinRefusal(
      {
        gameCode,
        classroomId: record.classroomId,
        // Parked students are not refused. SESSION_ENDED is the dead-wall metric.
        reason: isClassroomSessionEnded(record) ? 'SESSION_WAITING' : 'ROOM_GONE',
        door: 'join',
        actorId,
        secondsSinceEnd: isClassroomSessionEnded(record) ? secondsSinceEnd(record.endedAt, new Date()) : null,
      },
      { studentKey: lateJoinStudentKey({ actorId, gameCode, username, socketId: socket.id }) }
    );
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not record a lost room for ${gameCode}: ${(err as Error)?.message ?? err}`);
  }
}
