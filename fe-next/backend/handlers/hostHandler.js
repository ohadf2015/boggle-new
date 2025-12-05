/**
 * Host Handler
 * Handles host-specific operations: keep alive, reactivate
 */

const {
  getGame,
  getGameBySocketId,
  markHostActive,
  reactivateHost
} = require('../modules/gameStateManager');

const logger = require('../utils/logger');

/**
 * Register host-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerHostHandlers(io, socket) {

  // Handle host keep alive
  socket.on('hostKeepAlive', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Verify sender is host
    if (game.hostSocketId !== socket.id) return;

    markHostActive(gameCode);
    logger.debug('HOST', `Host keep-alive for game ${gameCode}`);
  });

  // Handle host reactivate (after being idle)
  socket.on('hostReactivate', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Verify sender is host
    if (game.hostSocketId !== socket.id) return;

    reactivateHost(gameCode);
    logger.info('HOST', `Host reactivated for game ${gameCode}`);

    socket.emit('hostReactivated', { success: true });
  });
}

module.exports = { registerHostHandlers };
