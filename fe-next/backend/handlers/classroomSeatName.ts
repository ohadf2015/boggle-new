import { suggestAvailableGuestName } from '@/lib/education/guestNameCollision';
import { USERNAME_SOCKET_MAX } from '@/shared/constants/namePattern';
import { isProfaneJoinName } from '@/lib/education/joinNameModeration';
import { suggestPlayerName } from '@/utils/onboardingNameSuggestions';

interface SeatIdentity {
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

/** A signed-in student cannot rename (the name is their profile's), so a classmate's name must not lock them out. */
export function classroomSeatName(users: Record<string, SeatIdentity | undefined>, requested: string, authUserId: string): string {
  const holder = users[requested];
  const heldBySomeoneElse = !!holder && (holder.authUserId ? holder.authUserId !== authUserId : !!holder.guestTokenHash);
  if (!heldBySomeoneElse) return requested;
  const own = Object.keys(users).find((name) => users[name]?.authUserId === authUserId);
  if (own) return own;
  const base = Array.from(requested.trim()).slice(0, USERNAME_SOCKET_MAX - 3).join('');
  return suggestAvailableGuestName(base, new Set(Object.keys(users))).name;
}

/** The projector shows every seat name, so a profane one from a socket that skipped the join form is swapped server-side. */
export function cleanClassroomSeatName(
  users: Record<string, SeatIdentity | undefined>,
  requested: string,
  identity: SeatIdentity,
  language: string,
): string {
  if (!isProfaneJoinName(requested)) return requested;
  const own = Object.keys(users).find((name) => {
    const u = users[name];
    return !!u && ((!!identity.authUserId && u.authUserId === identity.authUserId) || (!!identity.guestTokenHash && u.guestTokenHash === identity.guestTokenHash));
  });
  if (own) return own;
  return suggestAvailableGuestName(suggestPlayerName(language), new Set(Object.keys(users))).name;
}
