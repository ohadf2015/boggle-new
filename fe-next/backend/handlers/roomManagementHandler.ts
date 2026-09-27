/**
 * Room Management Handler
 * Handles room lifecycle events: close, get active rooms, grid shuffling
 */

import type { Server, Socket } from 'socket.io';
import type { ActiveRoom } from '@/shared/types';

import {
  getGame,
  deleteGame,
  getGameBySocketId,
  getActiveRooms
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom
} from '../utils/socketHelpers.js';

import { checkRateLimit } from '../utils/rateLimiter.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { cleanupGameBots } from '../modules/botManager.js';
import logger from '../utils/logger.js';

// Types for payloads
interface GridShufflingData {
  gridState: unknown;
}

/**
 * Register room management socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerRoomManagementHandlers(io: Server, socket: Socket): void {

  // Handle close room
  socket.on('closeRoom', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game || game.hostSocketId !== socket.id) return;

    clearGameTimer(gameCode);
    cleanupGameBots(gameCode);

    broadcastToRoom(io, getGameRoom(gameCode), 'roomClosed', {});
    deleteGame(gameCode);
    broadcastActiveRooms(io, getActiveRooms());

    logger.info('SOCKET', `Room ${gameCode} closed by host`);
  });

  // Handle get active rooms
  socket.on('getActiveRooms', () => {
    if (!checkRateLimit(socket.id)) return;
    socket.emit('activeRooms', { rooms: getActiveRooms() });
  });

  // Handle grid shuffling broadcast
  socket.on('broadcastShufflingGrid', (data: GridShufflingData) => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game || game.hostSocketId !== socket.id) return;

    broadcastToRoom(io, getGameRoom(gameCode), 'gridShuffling', data);
  });
}

export { registerRoomManagementHandlers };
