import { getAuthUserConnection, getGame } from '../modules/gameStateManager.js';

// A teacher's second tab must never take over (and so close) a board with a class on it.
export function hostsClassroomElsewhere(authUserId: string | undefined, gameCode: string): boolean {
  if (!authUserId) return false;
  const existing = getAuthUserConnection(authUserId);
  return !!existing?.isHost && existing.gameCode !== gameCode && !!getGame(existing.gameCode)?.isClassroom;
}
