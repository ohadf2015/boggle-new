/**
 * Who is on this classroom socket.
 *
 * A leaf module so `classroomGameHandler` and `classroomGameEndHandler` share
 * ONE answer. The end handler is the single most security-sensitive listener in
 * the classroom set — the game code is on the projector, in the QR and on every
 * student's screen, so "is this the teacher?" is the only thing standing
 * between a bored student and the whole class's lost session. A second copy of
 * this function drifting from the first is exactly the shape of the bug that
 * once let `classroomGameEnd` through unguarded (pitfall class 3).
 *
 * Deliberately NOT `utils/socialHelpers.getAuthUserId`: that one reads
 * `socket.data.verifiedUserId` only. The classroom sockets still carry a
 * handshake fallback for older clients, and dropping it would log every one of
 * them out mid-lesson.
 */

import type { Socket } from 'socket.io';
import logger from '../utils/logger.js';

/** The verified user id, or the legacy handshake claim, or null. */
export function getAuthUserId(socket: Socket): string | null {
  // Prefer server-verified user ID (set by auth middleware)
  const verified = (socket.data as Record<string, unknown>)?.verifiedUserId as string | undefined;
  if (verified) return verified;
  // Fallback for backwards compatibility — log warning
  const handshakeAuth = (socket.handshake.auth?.authUserId as string) || null;
  if (handshakeAuth) {
    logger.warn('AUTH', `Using unverified authUserId from handshake for socket ${socket.id}`);
  }
  return handshakeAuth;
}

export default getAuthUserId;
