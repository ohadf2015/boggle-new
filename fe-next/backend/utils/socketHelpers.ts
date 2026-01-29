/**
 * Socket.IO Helper Functions
 * Utility functions for Socket.IO communication patterns
 */

import type { Server, Socket } from 'socket.io';

// ==========================================
// Safe Emit Functions
// ==========================================

/**
 * Safely emit an event to a socket
 */
export function safeEmit(socket: Socket, event: string, data: unknown): boolean {
  try {
    if (socket && socket.connected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SOCKET] Error emitting to socket:', (error as Error).message);
    return false;
  }
}

/**
 * Broadcast to all sockets in a room
 */
export function broadcastToRoom(io: Server, room: string, event: string, data: unknown): void {
  try {
    io.to(room).emit(event, data);
  } catch (error) {
    console.error('[SOCKET] Error broadcasting to room:', (error as Error).message);
  }
}

/**
 * Broadcast to all sockets in a room except the sender
 */
export function broadcastToRoomExceptSender(socket: Socket, room: string, event: string, data: unknown): void {
  try {
    socket.to(room).emit(event, data);
  } catch (error) {
    console.error('[SOCKET] Error broadcasting to room except sender:', (error as Error).message);
  }
}

// ==========================================
// Room Query Functions
// ==========================================

/**
 * Get all sockets in a room
 */
export async function getSocketsInRoom(io: Server, room: string): Promise<Set<string>> {
  try {
    return await io.in(room).allSockets();
  } catch (error) {
    console.error('[SOCKET] Error getting sockets in room:', (error as Error).message);
    return new Set();
  }
}

/**
 * Get count of sockets in a room
 */
export async function getRoomSize(io: Server, room: string): Promise<number> {
  const sockets = await getSocketsInRoom(io, room);
  return sockets.size;
}

/**
 * Check if a socket is in a specific room
 */
export function isInRoom(socket: Socket, room: string): boolean {
  return socket.rooms.has(room);
}

// ==========================================
// Room Management Functions
// ==========================================

/**
 * Join a socket to a room
 */
export function joinRoom(socket: Socket, room: string): void {
  socket.join(room);
}

/**
 * Leave a room
 */
export function leaveRoom(socket: Socket, room: string): void {
  socket.leave(room);
}

/**
 * Leave all game rooms (rooms starting with "game:")
 */
export function leaveAllGameRooms(socket: Socket): void {
  for (const room of socket.rooms) {
    if (room.startsWith('game:')) {
      socket.leave(room);
    }
  }
}

/**
 * Get the game room name from a game code
 */
export function getGameRoom(gameCode: string): string {
  return `game:${gameCode}`;
}

// ==========================================
// Broadcast Functions
// ==========================================

/**
 * Emit to all connected sockets
 */
export function broadcastToAll(io: Server, event: string, data: unknown): void {
  try {
    io.emit(event, data);
  } catch (error) {
    console.error('[SOCKET] Error broadcasting to all:', (error as Error).message);
  }
}

// ==========================================
// Socket Management Functions
// ==========================================

/**
 * Get a socket by its ID
 */
export function getSocketById(io: Server, socketId: string): Socket | null {
  return io.sockets.sockets.get(socketId) || null;
}

/**
 * Disconnect a socket gracefully
 */
export function disconnectSocket(socket: Socket, close: boolean = false): void {
  try {
    if (socket && socket.connected) {
      socket.disconnect(close);
    }
  } catch (error) {
    console.error('[SOCKET] Error disconnecting socket:', (error as Error).message);
  }
}

/**
 * Check if socket is migrating to another tab
 * Used to prevent treating tab migrations as disconnects
 */
export function isSocketMigrating(socket: Socket): boolean {
  return socket.data && socket.data.migrating === true;
}
