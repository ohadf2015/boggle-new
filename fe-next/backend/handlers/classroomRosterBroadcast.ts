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

import type { Server } from 'socket.io';
import type { Avatar } from '@/shared/types/game';
import { getGame, getGameUsers } from '../modules/gameStateManager.js';
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
  const game = getGame(gameCode) as { isClassroom?: boolean; users?: Record<string, { isHost?: boolean } | undefined> } | undefined;
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
  // A connected guest has no persistent identity (nothing to roster them under
  // once the socket drops), so they show while connected and vanish offline.
  for (const user of roomUsers) {
    if (user.isHost || seen.has(user.username)) continue;
    if (user.authUserId && user.authUserId === teacherId && !user.isPractice && !user.isBot) continue;
    const rostered = !!user.authUserId || !!user.isBot || !!user.isPractice;
    if (!rostered && user.disconnected) continue;
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

async function send(io: Server, gameCode: string): Promise<void> {
  const payload = await buildClassroomRoster(gameCode);
  if (payload) broadcastToRoom(io, getGameRoom(gameCode), 'classroomRosterUpdate', payload);
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

  void send(io, gameCode).catch((error) => {
    logger.error('CLASSROOM_GAME', `Failed to broadcast roster for ${gameCode}: ${(error as Error).message}`);
  });
  const window = { dirty: false };
  windows.set(gameCode, window);
  const timer = setTimeout(() => {
    windows.delete(gameCode);
    if (window.dirty && getGame(gameCode)) {
      void send(io, gameCode).catch((error) => {
        logger.error('CLASSROOM_GAME', `Failed to broadcast roster for ${gameCode}: ${(error as Error).message}`);
      });
    }
  }, CLASSROOM_ROSTER_COALESCE_MS);
  if (typeof timer.unref === 'function') timer.unref();
}
