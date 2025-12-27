/**
 * Room Management Handler
 * Handles room lifecycle events: close, get active rooms, grid shuffling
 */

import type { Server, Socket } from 'socket.io';
import type { ActiveRoom } from '@/shared/types';

const {
  getGame,
  deleteGame,
  getGameBySocketId,
  getActiveRooms
} = require('../modules/gameStateManager');

const {
  broadcastToRoom,
  getGameRoom
} = require('../utils/socketHelpers');

const { checkRateLimit } = require('../utils/rateLimiter');
const timerManager = require('../utils/timerManager');
const botManager = require('../modules/botManager');
const logger = require('../utils/logger');

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

    timerManager.clearGameTimer(gameCode);
    botManager.cleanupGameBots(gameCode);

    broadcastToRoom(io, getGameRoom(gameCode), 'roomClosed', {});
    deleteGame(gameCode);
    io.emit('activeRooms', { rooms: getActiveRooms() as ActiveRoom[] });

    logger.info('SOCKET', `Room ${gameCode} closed by host`);
  });

  // Handle get active rooms
  socket.on('getActiveRooms', () => {
    socket.emit('activeRooms', { rooms: getActiveRooms() as ActiveRoom[] });
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

module.exports = { registerRoomManagementHandlers };

export { registerRoomManagementHandlers };
