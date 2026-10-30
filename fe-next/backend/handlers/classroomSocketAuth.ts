/**
 * Who is on this classroom socket.
 *
 * A leaf module so every classroom handler shares ONE answer: the game code is
 * on the projector, so "is this the teacher?" must not drift between copies.
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
