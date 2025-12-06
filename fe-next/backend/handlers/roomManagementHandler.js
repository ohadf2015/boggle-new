/**
 * Room Management Handler
 * Handles room lifecycle events: close, get active rooms, grid shuffling
 */

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
const logger = require('../utils/logger');

/**
 * Register room management socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerRoomManagementHandlers(io, socket) {

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

    broadcastToRoom(io, getGameRoom(gameCode), 'roomClosed', {});
    deleteGame(gameCode);
    io.emit('activeRooms', { rooms: getActiveRooms() });

    logger.info('SOCKET', `Room ${gameCode} closed by host`);
  });

  // Handle get active rooms
  socket.on('getActiveRooms', () => {
    socket.emit('activeRooms', { rooms: getActiveRooms() });
  });

  // Handle grid shuffling broadcast
  socket.on('broadcastShufflingGrid', (data) => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game || game.hostSocketId !== socket.id) return;

    broadcastToRoom(io, getGameRoom(gameCode), 'gridShuffling', data);
  });
}

module.exports = { registerRoomManagementHandlers };
