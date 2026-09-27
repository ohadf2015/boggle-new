/**
 * Every socket a student owns — not just the first one found.
 *
 * `useDuelSocket` opens its own connection per hook instance, and the duels
 * lobby mounts it three times (DuelNotification, DuelLobby, and the challenge
 * modal once it opens). One student is therefore several entries in
 * `namespace.sockets`, and `Array.from(namespace.sockets.values()).find(...)`
 * returns whichever one Map iteration happens to reach first.
 *
 * That coin toss decided real behaviour: the challenge banner rendered (the
 * notification's socket won) while the lobby's socket never heard the event and
 * kept showing "No pending challenges", and on accept only one of the
 * challenger's sockets joined `duel:<id>` — when it was the wrong one,
 * `duel:started` reached nobody and the challenger watched the lobby for the
 * whole 180 seconds of their own duel.
 *
 * Fan out instead of guessing. Socket.IO rooms already de-duplicate, and a
 * student legitimately open in two tabs gets both updated.
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from './types';

/** Every connected socket belonging to `userId` (possibly none). */
export function socketsForUser(namespace: Namespace, userId: string): DuelSocket[] {
  if (!userId) return [];
  return Array.from(namespace.sockets.values()).filter(
    (socket) => (socket as unknown as DuelSocket).data?.userId === userId
  ) as unknown as DuelSocket[];
}

/**
 * Send one event to all of a student's sockets.
 * Returns how many were reached — 0 means the student is offline, which is a
 * real outcome the caller may want to log rather than a silent no-op.
 */
export function emitToUser(
  namespace: Namespace,
  userId: string,
  event: string,
  payload: unknown
): number {
  const sockets = socketsForUser(namespace, userId);
  for (const socket of sockets) {
    socket.emit(event as never, payload as never);
  }
  return sockets.length;
}

/** Put all of a student's sockets in a room. Returns how many joined. */
export function joinUserToRoom(namespace: Namespace, userId: string, room: string): number {
  const sockets = socketsForUser(namespace, userId);
  for (const socket of sockets) {
    socket.join(room);
  }
  return sockets.length;
}
