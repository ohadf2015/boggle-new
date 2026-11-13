import type { Server, Socket } from 'socket.io';
import { getAuthUserConnection, getGame } from '../modules/gameStateManager.js';
import { getSocketById } from '../utils/socketHelpers.js';

// A second tab must never pull a live classroom seat (the teacher's board or a student's) out of its class.
export function inClassroomElsewhere(io: Server, socket: Socket, authUserId: string | undefined, gameCode: string): boolean {
  if (!authUserId) return false;
  const existing = getAuthUserConnection(authUserId);
  if (!existing || existing.gameCode === gameCode) return false;
  const classGame = getGame(existing.gameCode);
  if (!classGame?.isClassroom) return false;
  if (existing.isHost) return true;
  // Same socket = the student navigated away in this tab; a closed class tab = they already left.
  if (existing.socketId === socket.id || !classGame.users?.[existing.username]) return false;
  return !!getSocketById(io, existing.socketId)?.connected;
}
