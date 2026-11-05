/**
 * Keep a class together when the teacher opens a NEW game for it.
 *
 * Rounds inside one room already keep the class: Rematch / next round is the
 * same room under the same code. What scattered classes (prod, 2026-11-03: two
 * waves of ~6 students each typing "game not found" codes, then re-typing a new
 * code a minute later) is the other way a teacher moves on: back to the
 * dashboard, START A NEW GAME. That mints a new code, and creating the new room
 * closes the teacher's old one (`handleExistingAuthConnection`), which told the
 * students "host started a new game, room is closing" and sent them to the
 * student hub. Their clients' automatic re-join of the old code then answered
 * GAME_NOT_FOUND.
 *
 * The class has not ended — it moved. So both doors now say where it went:
 *
 *   1. The closing old room hears `classroomGameMoved { fromCode, toCode }`
 *      instead of `hostLeftRoomClosing`, and the client re-joins the new code in
 *      place (the CLASSROOM_NOT_OPEN wait covers the moment before the teacher's
 *      new room is up).
 *   2. A student who re-joins the old code later (reconnect, refresh, the code
 *      still on the board) is answered with the same event, pointing at the
 *      class's newest live game, instead of GAME_NOT_FOUND.
 *
 * Never throws: a failed lookup falls back to exactly the old answer.
 */

import type { Server, Socket } from 'socket.io';

import { getRedisClient } from '../redisClient';
import { getClassroomGame, type ClassroomGame } from '../modules/classroomGameManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';
import { captureEduServerEvents } from '../utils/educationTelemetry';
import { getGameRoom } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';

export type ClassroomMoveReason = 'host_new_game' | 'old_code_rejoin';

export interface ClassroomGameMovedPayload {
  fromCode: string;
  toCode: string;
  reason: ClassroomMoveReason;
}

/**
 * The class's newest live game other than `record`, created after it.
 * "Newer" matters: an older game still listed for the class must never pull a
 * student BACK out of the lesson they just came from.
 */
export async function findNewerClassroomGame(record: ClassroomGame | null | undefined): Promise<string | null> {
  try {
    if (!record?.classroomId || !record.gameCode) return null;
    const redis = getRedisClient();
    if (!redis) return null;
    const codes: string[] = (await redis.smembers(`classroom_games:${record.classroomId}`)) ?? [];
    let best: { code: string; createdAt: string } | null = null;
    for (const code of codes) {
      if (code === record.gameCode) continue;
      const game = await getClassroomGame(code);
      if (!game || game.classroomId !== record.classroomId) continue;
      if (isClassroomSessionEnded(game)) continue;
      const createdAt = game.createdAt ?? '';
      if (record.createdAt && createdAt && createdAt <= record.createdAt) continue;
      if (!best || createdAt > best.createdAt) best = { code, createdAt };
    }
    return best?.code ?? null;
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Newer classroom game lookup failed for ${record?.gameCode}: ${(err as Error)?.message ?? err}`);
    return null;
  }
}

/**
 * Is the room the teacher is leaving a game of the same class as the code
 * they are opening? Only then is it a move; anything else keeps the old
 * "room is closing" answer.
 */
export async function isSameClassroomMove(fromCode: string, toClassroomId: string | null | undefined): Promise<boolean> {
  if (!toClassroomId || !fromCode) return false;
  try {
    const from = await getClassroomGame(fromCode);
    return !!from && from.classroomId === toClassroomId;
  } catch {
    return false;
  }
}

/** `edu_classroom_game_moved`: one row per move, so carried vs dropped can be counted. */
export function captureClassroomGameMoved(args: {
  fromCode: string;
  toCode: string;
  reason: ClassroomMoveReason;
  classroomId?: string | null;
  teacherId?: string | null;
  actorId?: string | null;
  /** Students told at once (host_new_game). 1 for a single re-join. */
  students: number;
}): void {
  try {
    captureEduServerEvents([
      {
        distinctId: args.actorId || args.teacherId || `anonymous-${args.fromCode}`,
        event: 'edu_classroom_game_moved',
        properties: {
          from_code: args.fromCode,
          to_code: args.toCode,
          reason: args.reason,
          classroom_id: args.classroomId ?? null,
          students: args.students,
        },
      },
    ]);
  } catch (err) {
    logger.warn('EDU_TELEMETRY', `game moved event failed for ${args.fromCode}: ${(err as Error)?.message ?? err}`);
  }
}

/** Tell one socket, or a whole room, where the class went. */
export function emitClassroomGameMoved(
  target: Socket | ReturnType<Server['to']>,
  payload: ClassroomGameMovedPayload
): void {
  try {
    target.emit('classroomGameMoved', payload);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Could not announce move ${payload.fromCode} -> ${payload.toCode}: ${(err as Error)?.message ?? err}`);
  }
}

/**
 * The teacher is opening `toCode` while still hosting `fromCode`. When both are
 * the same class, tell the old room where the class is going and return true;
 * the caller then skips its "room is closing" broadcast and tears the old room
 * down as before. Returns false for anything that is not a same-class move.
 */
export async function announceClassroomMove(
  io: Server,
  args: {
    fromCode: string;
    toCode: string;
    toClassroomId?: string | null;
    students: number;
    teacherId?: string | null;
    /** The teacher's own socket(s): they are opening the new room, they must not "follow" into it as a student. */
    exceptSocketIds?: string[];
  }
): Promise<boolean> {
  const { fromCode, toCode, toClassroomId } = args;
  if (!fromCode || !toCode || fromCode === toCode) return false;
  if (!(await isSameClassroomMove(fromCode, toClassroomId))) return false;
  const except = (args.exceptSocketIds ?? []).filter(Boolean);
  const room = io.to(getGameRoom(fromCode));
  emitClassroomGameMoved(except.length ? room.except(except) : room, { fromCode, toCode, reason: 'host_new_game' });
  logger.info('CLASSROOM_GAME', `Class moved ${fromCode} -> ${toCode} (${args.students} students told)`);
  captureClassroomGameMoved({
    fromCode,
    toCode,
    reason: 'host_new_game',
    classroomId: toClassroomId,
    teacherId: args.teacherId,
    students: args.students,
  });
  return true;
}
