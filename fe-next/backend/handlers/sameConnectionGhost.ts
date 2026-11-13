import type { Socket } from 'socket.io';

// A client that sends CONNECT twice on one connection leaves the first socket as an inert ghost.
// Disconnecting it closes (or unroutes) the shared connection and drops the live socket with it.
export function parkSameConnectionGhost(oldSocket: Socket, socket: Socket): boolean {
  if (!oldSocket.conn || oldSocket.conn !== socket.conn) return false;
  oldSocket.data = oldSocket.data || {};
  if (oldSocket.data.migrationTimeout) clearTimeout(oldSocket.data.migrationTimeout);
  oldSocket.data.migrationTimeout = null;
  oldSocket.data.migrating = true;
  for (const room of [...(oldSocket.rooms ?? [])]) {
    if (room !== oldSocket.id) void oldSocket.leave(room);
  }
  return true;
}
