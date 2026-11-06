import { createHash } from 'crypto';

/**
 * The seat token of a teacher's practice seat in their own classroom room.
 *
 * The seat is keyed by this token alone (never by the account), so a practice seat
 * on the host's own account can neither reconnect into the host seat nor register
 * as that account's connection. The same owner gets the same token back, so a
 * dropped practice frame, tab or phone returns to its seat.
 */
export function practiceSeatToken(verifiedUserId: string | undefined, guestTokenHash: string | undefined, socketId: string): string {
  const owner = verifiedUserId ? `user:${verifiedUserId}` : guestTokenHash ? `guest:${guestTokenHash}` : `socket:${socketId}`;
  return `practice-${createHash('sha256').update(owner).digest('hex').slice(0, 40)}`;
}

