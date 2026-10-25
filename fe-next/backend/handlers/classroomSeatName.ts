import { suggestAvailableGuestName } from '@/lib/education/guestNameCollision';
import { USERNAME_SOCKET_MAX } from '@/shared/constants/namePattern';

interface SeatIdentity {
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

/**
 * The seat name for a signed-in student in a classroom room. Their name comes from
 * their profile, so a classmate with the same name must not lock them out: they
 * get their own earlier seat back, or the next free "Name 2".
 */
export function classroomSeatName(users: Record<string, SeatIdentity | undefined>, requested: string, authUserId: string): string {
  const holder = users[requested];
  const heldBySomeoneElse = !!holder && (holder.authUserId ? holder.authUserId !== authUserId : !!holder.guestTokenHash);
  if (!heldBySomeoneElse) return requested;
  const own = Object.keys(users).find((name) => users[name]?.authUserId === authUserId);
  if (own) return own;
  const base = Array.from(requested.trim()).slice(0, USERNAME_SOCKET_MAX - 3).join('');
  return suggestAvailableGuestName(base, new Set(Object.keys(users))).name;
}
