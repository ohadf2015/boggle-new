/**
 * Player Join Handler
 * Handles player join, leave, and reconnection events
 */

const {
  getGame,
  deleteGame,
  addUserToGame,
  removeUserFromGame,
  getGameBySocketId,
  getSocketIdByUsername,
  getGameUsers,
  getActiveRooms,
  updateHostSocketId,
  updateUserSocketId,
  getLeaderboard,
  getTournamentIdFromGame,
  getAuthUserConnection
} = require('../modules/gameStateManager');

const {
  broadcastToRoom,
  broadcastToRoomExceptSender,
  getGameRoom,
  joinRoom,
  leaveRoom,
  safeEmit,
  getSocketById,
  disconnectSocket
} = require('../utils/socketHelpers');

const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const timerManager = require('../utils/timerManager');
const tournamentManager = require('../modules/tournamentManager');
const { generateRandomAvatar } = require('../utils/gameUtils');
const { ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const logger = require('../utils/logger');
const { validatePayload, joinGameSchema, leaveRoomSchema } = require('../utils/socketValidation');
const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');

/**
 * Register player join/leave socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerPlayerJoinHandlers(io, socket) {

  // Handle player joining
  socket.on('join', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(joinGameSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    const { gameCode, username, playerId, avatar, authUserId, guestTokenHash, profilePictureUrl } = validation.data;

    logger.info('SOCKET', `Join request: ${username} to game ${gameCode}`);

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Handle multi-tab detection
    if (authUserId) {
      await handleExistingAuthConnectionJoin(io, socket, authUserId, gameCode, username);
    }

    // Block late joins for ranked games
    if (game.isRanked && game.gameState === 'in-progress' && !game.allowLateJoin) {
      const existingSocketId = getSocketIdByUsername(gameCode, username);
      if (!existingSocketId) {
        emitError(socket, 'Cannot join ranked game in progress');
        return;
      }
    }

    // Check for existing user (reconnection)
    const existingSocketId = getSocketIdByUsername(gameCode, username);

    // Check player limit
    if (!existingSocketId && Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
      joinRoom(socket, getGameRoom(gameCode));
      socket.emit('joinedAsSpectator', {
        success: true,
        gameCode,
        spectator: true,
        roomName: game.roomName,
        language: game.language
      });
      return;
    }

    // Handle reconnection
    if (existingSocketId || game.users[username]) {
      handleReconnection(io, socket, game, gameCode, username, authUserId, guestTokenHash);
      return;
    }

    // Add new user
    const userAvatar = avatar || generateRandomAvatar();
    addUserToGame(gameCode, username, socket.id, {
      avatar: { ...userAvatar, profilePictureUrl: profilePictureUrl || null },
      isHost: false,
      playerId,
      authUserId: authUserId || null,
      guestTokenHash: guestTokenHash || null
    });

    joinRoom(socket, getGameRoom(gameCode));

    socket.emit('joined', {
      success: true,
      gameCode,
      isHost: false,
      username,
      roomName: game.roomName,
      language: game.language,
      users: getGameUsers(gameCode)
    });

    // If game is in progress, send current state
    if (game.gameState === 'in-progress') {
      handleLateJoin(socket, game, gameCode, username);
    }

    // Handle tournament join
    handleTournamentJoin(io, socket, gameCode, username, userAvatar, profilePictureUrl);

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    io.emit('activeRooms', { rooms: getActiveRooms() });

    logger.info('SOCKET', `${username} joined game ${gameCode}`);
  });

  // Handle leave room
  socket.on('leaveRoom', ({ gameCode, username }) => {
    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

    removeUserFromGame(gameCode, username);
    leaveRoom(socket, getGameRoom(gameCode));

    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });

    socket.emit('leftRoom', { success: true });
    io.emit('activeRooms', { rooms: getActiveRooms() });

    logger.info('SOCKET', `${username} left room ${gameCode}`);
  });
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Handle existing authenticated connection when joining a game
 */
async function handleExistingAuthConnectionJoin(io, socket, authUserId, gameCode, username) {
  const existingConnection = getAuthUserConnection(authUserId);
  if (!existingConnection) return;

  const isSameSocket = existingConnection.socketId === socket.id;

  if (existingConnection.gameCode === gameCode) {
    if (!isSameSocket) {
      const oldSocket = getSocketById(io, existingConnection.socketId);
      if (oldSocket && oldSocket.connected) {
        oldSocket.data = oldSocket.data || {};
        oldSocket.data.migrating = true;
        safeEmit(oldSocket, 'sessionTakenOver', {
          message: 'Your session was moved to another tab',
          gameCode
        });
        setTimeout(() => {
          if (oldSocket.connected) disconnectSocket(oldSocket, true);
        }, 100);
      }
    }
    return;
  }

  if (!isSameSocket) {
    const oldSocket = getSocketById(io, existingConnection.socketId);
    if (oldSocket && oldSocket.connected) {
      safeEmit(oldSocket, 'sessionMigrated', {
        message: 'Your session was moved to another tab'
      });
      disconnectSocket(oldSocket, true);
    }
  }

  if (existingConnection.isHost) {
    const oldGame = getGame(existingConnection.gameCode);
    if (oldGame) {
      if (oldGame.reconnectionTimeout) {
        clearTimeout(oldGame.reconnectionTimeout);
        oldGame.reconnectionTimeout = null;
      }
      broadcastToRoom(io, getGameRoom(existingConnection.gameCode), 'hostLeftRoomClosing', {
        message: 'Host joined a different game. Room is closing.'
      });
      timerManager.clearGameTimer(existingConnection.gameCode);
      deleteGame(existingConnection.gameCode);
      io.emit('activeRooms', { rooms: getActiveRooms() });
    }
  } else {
    removeUserFromGame(existingConnection.gameCode, existingConnection.username);
    const oldGame = getGame(existingConnection.gameCode);
    if (oldGame) {
      broadcastToRoom(io, getGameRoom(existingConnection.gameCode), 'updateUsers', {
        users: getGameUsers(existingConnection.gameCode)
      });
    }
  }

  if (isSameSocket) {
    leaveRoom(socket, getGameRoom(existingConnection.gameCode));
  }
}

/**
 * Handle player reconnection to an existing game
 */
function handleReconnection(io, socket, game, gameCode, username, authUserId, guestTokenHash) {
  logger.info('SOCKET', `Reconnection detected for ${username}`);

  if (game.users[username]) {
    game.users[username].disconnected = false;
    delete game.users[username].disconnectedAt;

    if (game.users[username].reconnectionTimeout) {
      clearTimeout(game.users[username].reconnectionTimeout);
      delete game.users[username].reconnectionTimeout;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'playerReconnected', { username });
  }

  updateUserSocketId(gameCode, username, socket.id, {
    authUserId: authUserId || null,
    guestTokenHash: guestTokenHash || null
  });

  if (game.hostUsername === username) {
    updateHostSocketId(gameCode, socket.id);
    if (game.reconnectionTimeout) {
      clearTimeout(game.reconnectionTimeout);
      game.reconnectionTimeout = null;
    }
  }

  joinRoom(socket, getGameRoom(gameCode));

  socket.emit('joined', {
    success: true,
    gameCode,
    isHost: game.hostUsername === username,
    username,
    roomName: game.roomName,
    language: game.language,
    reconnected: true,
    users: getGameUsers(gameCode)
  });

  if (game.gameState === 'in-progress') {
    socket.emit('startGame', {
      letterGrid: game.letterGrid,
      timerSeconds: game.remainingTime || game.timerSeconds,
      language: game.language,
      minWordLength: game.minWordLength || 2,
      messageId: 'reconnect-' + Date.now(),
      reconnect: true,
      skipAck: true
    });
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
    users: getGameUsers(gameCode)
  });
}

/**
 * Handle late join to an in-progress game
 */
function handleLateJoin(socket, game, gameCode, username) {
  logger.info('SOCKET', `${username} joining game ${gameCode} in progress`);

  socket.emit('startGame', {
    letterGrid: game.letterGrid,
    timerSeconds: game.remainingTime || game.timerSeconds,
    language: game.language,
    minWordLength: game.minWordLength || 2,
    messageId: 'late-join-' + Date.now(),
    lateJoin: true,
    skipAck: true
  });

  const leaderboard = getLeaderboard(gameCode);
  socket.emit('updateLeaderboard', { leaderboard });

  const playerAchievementKeys = game.playerAchievements?.[username] || [];
  if (playerAchievementKeys.length > 0) {
    const achievements = playerAchievementKeys
      .map(key => ({ key, icon: ACHIEVEMENT_ICONS[key] }))
      .filter(a => a.icon);
    socket.emit('liveAchievementUnlocked', { achievements });
  }
}

/**
 * Handle tournament join for a player
 */
function handleTournamentJoin(io, socket, gameCode, username, userAvatar, profilePictureUrl) {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  try {
    const tournamentAvatar = { ...userAvatar, profilePictureUrl: profilePictureUrl || null };
    tournamentManager.addPlayerMidTournament(tournamentId, socket.id, username, tournamentAvatar);

    const tournament = tournamentManager.getTournament(tournamentId);
    const standings = tournamentManager.getTournamentStandings(tournamentId);

    socket.emit('tournamentInfo', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound,
        status: tournament.status
      },
      standings
    });

    broadcastToRoomExceptSender(socket, getGameRoom(gameCode), 'tournamentPlayerJoined', {
      username,
      standings
    });
  } catch (err) {
    logger.warn('TOURNAMENT', `Could not add ${username} to tournament: ${err.message}`);
  }
}

module.exports = {
  registerPlayerJoinHandlers,
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
};
