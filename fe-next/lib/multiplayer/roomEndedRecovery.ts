/**
 * One-tap recovery for a player whose room no longer exists.
 *
 * Prod, last 28 days: 156 people got GAME_NOT_FOUND on join (mostly old room
 * links) and about a third never played afterward. They were told the room was
 * gone and left on the lobby. Now the arcade player is offered "Play now",
 * which starts Quick Play (join an open public room or host one).
 *
 * One tap, not an automatic jump: the CrazyGames policy (2026-05-03) forbids
 * silently throwing a player into a room, and a code that resolved to no
 * classroom record can still belong to a class.
 *
 * A classroom student never gets this: their home is the student hub
 * (`roomGoneAction`), never public matchmaking. 'pending' means the classroom
 * record has not answered yet, so it is treated as "not arcade" (pitfall
 * class 1: no optimistic default that a later source can flip).
 *
 * Pure apart from the acceptance marker, which bridges the toast's button (in
 * the entry screen) to the `joined` handler (page level) so the funnel
 * offered → accepted → joined can be counted.
 */
import type { ClassroomContext } from '@/lib/education/classroomRoomGone';

export interface RoomEndedRecoveryInput {
  /** The player was already seated in this room (mid-game teardown). */
  wasActive: boolean;
  /** Tri-state classroom detection for the room that is gone. */
  context: ClassroomContext;
  /** This client holds (or is booting into) the host seat. */
  isHost: boolean;
}

export function shouldOfferQuickPlayRecovery({ wasActive, context, isHost }: RoomEndedRecoveryInput): boolean {
  return !wasActive && !isHost && context === 'arcade';
}

let accepted = false;

/** The player tapped "Play now" on the room-ended toast. */
export function markRoomEndedRecoveryAccepted(): void {
  accepted = true;
}

/** True once after an accept; the next `joined` is the recovered join. */
export function consumeRoomEndedRecoveryAccepted(): boolean {
  const was = accepted;
  accepted = false;
  return was;
}

export function resetRoomEndedRecoveryForTests(): void {
  accepted = false;
}
