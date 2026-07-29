/**
 * Socket.IO Helper Functions
 * Utility functions for Socket.IO communication patterns
 */

import type { Server, Socket } from 'socket.io';
import logger from './logger';

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
    logger.error('SOCKET', 'Error emitting to socket', { error: (error as Error).message });
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
    logger.error('SOCKET', 'Error broadcasting to room', { error: (error as Error).message });
  }
}

/**
 * Volatile broadcast to all sockets in a room.
 * Volatile events are silently dropped if the transport is not ready (like UDP).
 * Use for non-critical updates: leaderboard, presence, achievements, chat.
 */
export function volatileBroadcastToRoom(io: Server, room: string, event: string, data: unknown): void {
  try {
    io.to(room).volatile.emit(event, data);
  } catch (error) {
    logger.error('SOCKET', 'Error volatile broadcasting to room', { error: (error as Error).message });
  }
}

/**
 * Broadcast to all sockets in a room except the sender
 */
export function broadcastToRoomExceptSender(socket: Socket, room: string, event: string, data: unknown): void {
  try {
    socket.to(room).emit(event, data);
  } catch (error) {
    logger.error('SOCKET', 'Error broadcasting to room except sender', { error: (error as Error).message });
  }
}

// ==========================================
// Lobby Room (for activeRooms broadcasts)
// ==========================================

/** Room that lobby/room-list clients join to receive activeRooms updates */
export const LOBBY_ROOM = 'lobby:rooms';

// Throttle state for broadcastActiveRooms (leading-edge + trailing debounce, 500ms)
const BROADCAST_THROTTLE_MS = 500;
let _broadcastActiveRoomsTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingBroadcastArgs: { io: Server; rooms: unknown[] } | null = null;

function _executeBroadcast(): void {
  if (_pendingBroadcastArgs) {
    const { io, rooms } = _pendingBroadcastArgs;
    try {
      io.to(LOBBY_ROOM).emit('activeRooms', { rooms });
    } catch (error) {
      logger.error('SOCKET', 'Error broadcasting activeRooms to lobby', { error: (error as Error).message });
    }
    _pendingBroadcastArgs = null;
  }
  _broadcastActiveRoomsTimer = null;
}

/**
 * Broadcast activeRooms to lobby subscribers only (not all connected sockets).
 * Throttled: first call fires immediately, subsequent calls within 500ms
 * are debounced so only the last one executes after the window.
 */
export function broadcastActiveRooms(io: Server, rooms: unknown[]): void {
  _pendingBroadcastArgs = { io, rooms };

  // Leading edge: if no timer running, execute immediately and start cooldown
  if (!_broadcastActiveRoomsTimer) {
    _executeBroadcast();
    _broadcastActiveRoomsTimer = setTimeout(() => {
      // Trailing edge: flush any pending call that arrived during cooldown
      _executeBroadcast();
    }, BROADCAST_THROTTLE_MS);
  }
  // Otherwise, _pendingBroadcastArgs is updated and will fire when timer expires
}

/** Reset throttle state between tests */
export function _resetBroadcastThrottle(): void {
  if (_broadcastActiveRoomsTimer) {
    clearTimeout(_broadcastActiveRoomsTimer);
  }
  _broadcastActiveRoomsTimer = null;
  _pendingBroadcastArgs = null;
}

// Expose reset on globalThis so tests can reach it regardless of which
// module instance Vitest resolved (dual-specifier .ts vs .js issue).
// Test-only — production bundles must not leak internals.
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {

  (globalThis as any).__resetBroadcastThrottle = _resetBroadcastThrottle;
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
    logger.error('SOCKET', 'Error getting sockets in room', { error: (error as Error).message });
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
    logger.error('SOCKET', 'Error broadcasting to all', { error: (error as Error).message });
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
    logger.error('SOCKET', 'Error disconnecting socket', { error: (error as Error).message });
  }
}

/**
 * Check if socket is migrating to another tab
 * Used to prevent treating tab migrations as disconnects
 */
export function isSocketMigrating(socket: Socket): boolean {
  return socket.data && socket.data.migrating === true;
}
