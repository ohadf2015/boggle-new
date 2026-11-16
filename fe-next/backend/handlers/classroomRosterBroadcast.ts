/**
 * Classroom lobby roster broadcast.
 *
 * The projector/host lobby headline has to answer "how many of my class are
 * in the room", not "how many phones currently hold a socket" — a teacher
 * mid-lesson watched 4 connected where 21 students had joined (room REMAFZ,
 * 2026-11-13 audit). The live `updateUsers` roster only knows socket-connected
 * seats and the client drops a disconnected one after a 30s grace, so it can
 * never answer the first question.
 *
 * This module pushes the JOINED roster: every student seated by any door, from
 * the Redis classroom record (which outlives socket drops) unioned with the
 * room's in-memory seats, each annotated with the live connection state. The
 * client renders the full roster and keeps connection as per-student overlay.
 *
 * Classroom rooms only; ordinary rooms never see this event.
 */

import type { Server, Socket } from 'socket.io';
import type { Avatar } from '@/shared/types/game';
import { getGame, getGameBySocketId, getGameUsers } from '../modules/gameStateManager.js';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';

export const CLASSROOM_ROSTER_COALESCE_MS = 250;

export interface ClassroomRosterStudent {
  username: string;
  /** Socket currently connected. False = joined but offline: overlay, not removal. */
  connected: boolean;
  isBot?: boolean;
  isPractice?: boolean;
  avatar?: Avatar | null;
}

export interface ClassroomRosterPayload {
  gameCode: string;
  students: ClassroomRosterStudent[];
}

/**
 * The joined roster for a classroom room.
 * Pure (async only for the Redis read) so the payload shape is unit-testable.
 * Returns null for non-classroom rooms and for classroom rooms whose record is
 * gone (expired / not a classroom code) — callers no-op on null.
 */
export async function buildClassroomRoster(gameCode: string): Promise<ClassroomRosterPayload | null> {
  const game = getGame(gameCode) as {
    isClassroom?: boolean;
    users?: Record<string, { authUserId?: string | null } | undefined>;
  } | undefined;
  if (!game?.isClassroom) return null;

  const roomUsers = getGameUsers(gameCode);
  const byUsername = new Map(roomUsers.map((u) => [u.username, u]));

  // getClassroomGame already swallows its own Redis errors (returns null); the
  // extra catch keeps this builder total for every caller, including mocks.
  let record: Awaited<ReturnType<typeof getClassroomGame>> = null;
  try {
    record = await getClassroomGame(gameCode);
  } catch {
    record = null;
  }
  const teacherId = record?.teacherId;
  const students: ClassroomRosterStudent[] = [];
  const seen = new Set<string>();

  // Door 1 — the Redis record: everyone who joined through the classroom flow.
  // This list survives socket drops (and a server restart), so it is the
  // headline source of truth for "who joined".
  for (const player of record?.players ?? []) {
    if (!player.username || player.userId === teacherId || seen.has(player.username)) continue;
    seen.add(player.username);
    const live = byUsername.get(player.username);
    students.push({
      username: player.username,
      connected: !!live && !live.disconnected,
      ...(live?.isBot ? { isBot: true } : {}),
      ...(live?.isPractice ? { isPractice: true } : {}),
      ...(live?.avatar ? { avatar: live.avatar } : {}),
    });
  }

  // Door 2 — in-memory seats: students who came in through the ordinary join
  // (QR / typed code / invite link) are only named here, and so are bots and
  // the teacher's practice seat, which the wall shows but the count excludes.
  // A guest has no durable identity, but while the room still holds the seat
  // (including the reconnect grace) they joined — a slept phone must not shrink
  // the class. The seat leaving game.users is what takes them off the wall.
  for (const user of roomUsers) {
    if (user.isHost || seen.has(user.username)) continue;
    // getGameUsers strips authUserId. The raw seat is what says "this is the teacher".
    const authUserId = game.users?.[user.username]?.authUserId;
    if (authUserId && authUserId === teacherId && !user.isPractice && !user.isBot) continue;
    seen.add(user.username);
    students.push({
      username: user.username,
      connected: !user.disconnected,
      ...(user.isBot ? { isBot: true } : {}),
      ...(user.isPractice ? { isPractice: true } : {}),
      ...(user.avatar ? { avatar: user.avatar } : {}),
    });
  }

  return { gameCode, students };
}

const windows = new Map<string, { dirty: boolean }>();

const generations = new Map<string, number>();

async function send(io: Server, gameCode: string, generation: number): Promise<void> {
  const payload = await buildClassroomRoster(gameCode);
  // A slower Redis read must not paint an older class over a newer one.
  if (generations.get(gameCode) !== generation) return;
  if (payload) broadcastToRoom(io, getGameRoom(gameCode), 'classroomRosterUpdate', payload);
}

function startSend(io: Server, gameCode: string): void {
  const generation = (generations.get(gameCode) ?? 0) + 1;
  generations.set(gameCode, generation);
  void send(io, gameCode, generation).catch((error) => {
    logger.error('CLASSROOM_GAME', `Failed to broadcast roster for ${gameCode}: ${(error as Error).message}`);
  });
}

/**
 * Coalesced roster push: a class of 30 joining at once is 30 Redis reads and
 * 30 broadcasts without this. One send now, one trailing send for whatever
 * changed inside the window — same shape as `broadcastRoomUsers`.
 */
export function broadcastClassroomRoster(io: Server, gameCode: string): void {
  const game = getGame(gameCode) as { isClassroom?: boolean } | undefined;
  if (!game?.isClassroom) return;

  const open = windows.get(gameCode);
  if (open) {
    open.dirty = true;
    return;
  }

  startSend(io, gameCode);
  const window = { dirty: false };
  windows.set(gameCode, window);
  const timer = setTimeout(() => {
    windows.delete(gameCode);
    if (window.dirty && getGame(gameCode)) startSend(io, gameCode);
  }, CLASSROOM_ROSTER_COALESCE_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

/**
 * The lobby remounts between rounds and would otherwise miss the last push,
 * falling back to the 30s socket hide. Reply only to a socket seated in the
 * room — the code is the server's binding, not the client's claim.
 */
export function registerClassroomRosterRequest(socket: Socket): void {
  socket.on('requestClassroomRoster', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;
    void buildClassroomRoster(gameCode)
      .then((payload) => {
        if (payload) socket.emit('classroomRosterUpdate', payload);
      })
      .catch((error) => {
        logger.error('CLASSROOM_GAME', `Failed to reply roster for ${gameCode}: ${(error as Error).message}`);
      });
  });
}
