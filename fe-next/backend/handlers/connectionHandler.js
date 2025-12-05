/**
 * Connection Handler
 * Handles disconnect events and connection cleanup
 */

const {
  games,
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  deleteGame,
  updateHostSocketId
} = require('../modules/gameStateManager');

const {
  broadcastToRoom,
  getGameRoom,
  safeEmit,
  getSocketById,
  leaveAllGameRooms
} = require('../utils/socketHelpers');

const timerManager = require('../utils/timerManager');
const { resetRateLimit } = require('../utils/rateLimiter');
const { cleanupPlayerData } = require('../utils/playerCleanup');
const botManager = require('../modules/botManager');
const logger = require('../utils/logger');

// Configuration
const HOST_RECONNECTION_GRACE_PERIOD = parseInt(process.env.HOST_RECONNECTION_GRACE_PERIOD || '30000');
const PLAYER_RECONNECTION_GRACE_PERIOD = parseInt(process.env.PLAYER_RECONNECTION_GRACE_PERIOD || '120000');

/**
 * Register connection-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerConnectionHandlers(io, socket) {

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    // Skip if this socket was migrating (multi-tab scenario)
    if (socket.data && socket.data.migrating) {
      logger.debug('SOCKET', `Socket ${socket.id} disconnect skipped (was migrating)`);
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    logger.info('SOCKET', `Socket ${socket.id} disconnected (reason: ${reason})${gameCode ? ` from game ${gameCode}` : ''}`);

    // Clean up rate limiting
    resetRateLimit(socket.id);

    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Check if this is the host disconnecting
    if (game.hostSocketId === socket.id) {
      handleHostDisconnect(io, socket, game, gameCode, username, reason);
    } else if (username) {
      handlePlayerDisconnect(io, socket, game, gameCode, username, reason);
    }
  });
}

/**
 * Handle host disconnection
 */
function handleHostDisconnect(io, socket, game, gameCode, username, reason) {
  logger.info('SOCKET', `Host (${username}) disconnected from game ${gameCode}`);

  // Clear any existing host reconnection timeout
  if (game.reconnectionTimeout) {
    clearTimeout(game.reconnectionTimeout);
    game.reconnectionTimeout = null;
  }

  // Notify players that host disconnected
  broadcastToRoom(io, getGameRoom(gameCode), 'hostDisconnected', {
    message: 'Host disconnected. Waiting for reconnection...',
    gracePeriodMs: HOST_RECONNECTION_GRACE_PERIOD
  });

  // Start grace period for host reconnection
  game.reconnectionTimeout = setTimeout(() => {
    const currentGame = getGame(gameCode);
    if (!currentGame) return;

    // Check if host is still disconnected (socket hasn't changed)
    if (currentGame.hostSocketId === socket.id) {
      logger.info('SOCKET', `Host reconnection timeout for game ${gameCode} - closing room`);

      // Stop timer and bots
      timerManager.clearGameTimer(gameCode);
      botManager.stopAllBots(gameCode);

      // Notify all players
      broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
        message: 'Host did not reconnect. Room is closing.'
      });

      // Clean up game
      deleteGame(gameCode);
      io.emit('activeRooms', { rooms: getActiveRooms() });
    }
  }, HOST_RECONNECTION_GRACE_PERIOD);

  logger.debug('SOCKET', `Started ${HOST_RECONNECTION_GRACE_PERIOD}ms reconnection timer for host in game ${gameCode}`);
}

/**
 * Handle player disconnection
 */
function handlePlayerDisconnect(io, socket, game, gameCode, username, reason) {
  logger.info('SOCKET', `Player ${username} disconnected from game ${gameCode}`);

  // Check if user is a bot (bots don't have reconnection handling)
  const userData = game.users?.[username];
  if (userData?.isBot) {
    // Remove bot immediately
    removeUserFromGame(gameCode, username);
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    return;
  }

  // Mark user as disconnected but don't remove yet (allow reconnection)
  if (game.users[username]) {
    game.users[username].disconnected = true;
    game.users[username].disconnectedAt = Date.now();

    // Notify other players
    broadcastToRoom(io, getGameRoom(gameCode), 'playerDisconnected', {
      username,
      message: `${username} disconnected. Waiting for reconnection...`
    });

    // Start player reconnection grace period
    const reconnectionTimeout = setTimeout(() => {
      const currentGame = getGame(gameCode);
      if (!currentGame) return;

      const currentUserData = currentGame.users?.[username];
      if (currentUserData && currentUserData.disconnected) {
        logger.info('SOCKET', `Player ${username} reconnection timeout - removing from game ${gameCode}`);

        // Clean up player data
        cleanupPlayerData(gameCode, username);
        removeUserFromGame(gameCode, username);

        // Notify remaining players
        broadcastToRoom(io, getGameRoom(gameCode), 'playerLeft', {
          username,
          message: `${username} did not reconnect and was removed.`
        });

        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode)
        });

        io.emit('activeRooms', { rooms: getActiveRooms() });
      }
    }, PLAYER_RECONNECTION_GRACE_PERIOD);

    // Store timeout reference for cancellation on reconnect
    game.users[username].reconnectionTimeout = reconnectionTimeout;

    logger.debug('SOCKET', `Started ${PLAYER_RECONNECTION_GRACE_PERIOD}ms reconnection timer for ${username} in game ${gameCode}`);
  }
}

module.exports = { registerConnectionHandlers };
