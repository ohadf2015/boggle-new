import type { Server } from 'socket.io';
import { getGame, getGameUsers } from '../modules/gameStateManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { broadcastClassroomRoster } from './classroomRosterBroadcast.js';

export const CLASSROOM_USERS_COALESCE_MS = 250;

const windows = new Map<string, { dirty: boolean }>();

function send(io: Server, gameCode: string): void {
  broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', { users: getGameUsers(gameCode) });
}

/** A class of 30 joining at once is 30 full-roster broadcasts to 30 sockets; classroom rooms get one per window. */
export function broadcastRoomUsers(io: Server, gameCode: string): void {
  const game = getGame(gameCode) as { isClassroom?: boolean } | undefined;
  if (!game?.isClassroom) {
    send(io, gameCode);
    return;
  }

  const open = windows.get(gameCode);
  if (open) {
    open.dirty = true;
    return;
  }

  send(io, gameCode);
  // The joined roster rides the same moments (join / reconnect); disconnects
  // and leaves flip a flag or remove an entry, and the next of those re-pushes.
  broadcastClassroomRoster(io, gameCode);
  const window = { dirty: false };
  windows.set(gameCode, window);
  const timer = setTimeout(() => {
    windows.delete(gameCode);
    if (window.dirty && getGame(gameCode)) {
      send(io, gameCode);
      broadcastClassroomRoster(io, gameCode);
    }
  }, CLASSROOM_USERS_COALESCE_MS);
  if (typeof timer.unref === 'function') timer.unref();
}
