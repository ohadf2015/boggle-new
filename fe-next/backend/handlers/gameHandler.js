/**
 * Game Handler
 * Handles game lifecycle events: create, join, start, end, reset, close
 */

const {
  games,
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  addUserToGame,
  removeUserFromGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getGameUsers,
  getActiveRooms,
  updateHostSocketId,
  updateUserSocketId,
  resetGameForNewRound,
  getLeaderboard,
  getTournamentIdFromGame,
  getAuthUserConnection,
  markUserActivity
} = require('../modules/gameStateManager');

const {
  broadcastToRoom,
  broadcastToRoomExceptSender,
  getGameRoom,
  joinRoom,
  leaveRoom,
  leaveAllGameRooms,
  safeEmit,
  getSocketById,
  disconnectSocket
} = require('../utils/socketHelpers');

const { makePositionsMap } = require('../modules/wordValidator');
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const gameStartCoordinator = require('../utils/gameStartCoordinator');
const timerManager = require('../utils/timerManager');
const tournamentManager = require('../modules/tournamentManager');
const redisClient = require('../redisClient');
const { inc, incPerGame, ensureGame } = require('../utils/metrics');
const { generateRandomAvatar } = require('../utils/gameUtils');
const { getRandomLongWords } = require('../dictionary');
const { ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const logger = require('../utils/logger');
const { startGameTimer, endGame } = require('./shared');
const {
  validatePayload,
  createGameSchema,
  joinGameSchema,
  startGameSchema,
  leaveRoomSchema
} = require('../utils/socketValidation');

// Configuration
const MAX_PLAYERS_PER_ROOM = 50;

/**
 * Register game-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerGameHandlers(io, socket) {

  // Handle game creation
  socket.on('createGame', async (data) => {
    if (!checkRateLimit(socket.id)) {
      inc('rateLimited');
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(createGameSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    const { gameCode, roomName, language, hostUsername, playerId, avatar, authUserId, guestTokenHash, isRanked, profilePictureUrl } = validation.data;

    logger.info('SOCKET', `Create game request: ${gameCode} by ${hostUsername}${isRanked ? ' (RANKED)' : ''}`);

    // Sanitize playerId
    const sanitizedPlayerId = playerId && typeof playerId === 'string'
      ? playerId.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, '')
      : null;

    // Check if game already exists
    if (gameExists(gameCode)) {
      emitError(socket, 'Game code already in use');
      return;
    }

    // Handle multi-tab detection for authenticated users
    if (authUserId) {
      await handleExistingAuthConnection(io, socket, authUserId, gameCode);
    }

    // Create the game
    const game = createGame(gameCode, {
      hostSocketId: socket.id,
      hostUsername: hostUsername || 'Host',
      hostPlayerId: sanitizedPlayerId,
      roomName: roomName || gameCode,
      language: language || 'en',
      isRanked: isRanked || false,
      allowLateJoin: isRanked ? false : true
    });

    // Add host as first user
    const hostAvatar = avatar || generateRandomAvatar();
    addUserToGame(gameCode, hostUsername || 'Host', socket.id, {
      avatar: { ...hostAvatar, profilePictureUrl: profilePictureUrl || null },
      isHost: true,
      playerId: sanitizedPlayerId,
      authUserId: authUserId || null,
      guestTokenHash: guestTokenHash || null
    });

    // Join socket to game room
    joinRoom(socket, getGameRoom(gameCode));

    // Confirm game creation
    socket.emit('joined', {
      success: true,
      gameCode,
      isHost: true,
      username: hostUsername || 'Host',
      roomName: roomName || gameCode,
      language: language || 'en',
      users: getGameUsers(gameCode)
    });

    ensureGame(gameCode);

    // Broadcast updated room list
    io.emit('activeRooms', { rooms: getActiveRooms() });

    // Broadcast user list update
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });

    // Save to Redis
    try {
      await redisClient.saveGameState(gameCode, game);
    } catch (err) {
      logger.error('REDIS', 'Failed to save game state', err);
      safeEmit(socket, 'warning', {
        type: 'persistence',
        message: 'Game state could not be saved.'
      });
    }

    logger.info('SOCKET', `Game ${gameCode} created by ${hostUsername}`);
  });

  // Handle request for words to embed in board
  socket.on('getWordsForBoard', (data) => {
    const { language, boardSize } = data;
    const rows = boardSize?.rows || 5;
    const cols = boardSize?.cols || 5;
    const totalCells = rows * cols;
    const wordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    const maxWordLen = Math.min(8, Math.max(rows, cols));
    const words = getRandomLongWords(language || 'en', wordCount, 3, maxWordLen);
    socket.emit('wordsForBoard', { words });
  });

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

  // Handle game start
  socket.on('startGame', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { letterGrid, timerSeconds, language, minWordLength } = data;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorMessages.ONLY_HOST_CAN_START);
      return;
    }

    const validTimer = Math.max(30, Math.min(600, parseInt(timerSeconds) || 180));

    updateGame(gameCode, {
      letterGrid,
      timerSeconds: validTimer,
      remainingTime: validTimer,
      gameDuration: validTimer,
      language: language || game.language,
      minWordLength: minWordLength || 2,
      gameState: 'in-progress',
      gameStartedAt: Date.now()
    });

    // Precompute letter positions
    const positions = makePositionsMap(letterGrid);
    const current = getGame(gameCode);
    if (current) {
      current.letterPositions = positions;
    }
    ensureGame(gameCode);

    // Initialize player data
    initializePlayerData(game, gameCode);

    // Initialize game start coordination
    const users = getGameUsers(gameCode);
    const playerUsernames = users.map(u => u.username);
    const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);

    // Broadcast start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
      letterGrid,
      timerSeconds: validTimer,
      language: language || game.language,
      minWordLength: minWordLength || 2,
      messageId
    });

    // Set acknowledgment timeout
    gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 2000, () => {
      startGameTimer(io, gameCode, validTimer);
    });

    logger.info('SOCKET', `Game ${gameCode} starting with ${playerUsernames.length} players`);
  });

  // Handle start game acknowledgment
  socket.on('startGameAck', (data) => {
    const { messageId } = data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const result = gameStartCoordinator.recordAcknowledgment(gameCode, username, messageId);

    if (result.valid && result.allReady) {
      const game = getGame(gameCode);
      startGameTimer(io, gameCode, game?.timerSeconds || 180);
    }
  });

  // Handle end game
  socket.on('endGame', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorMessages.ONLY_HOST_CAN_END);
      return;
    }

    endGame(io, gameCode);
  });

  // Handle reset game
  socket.on('resetGame', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only host can reset the game');
      return;
    }

    timerManager.clearGameTimer(gameCode);
    resetGameForNewRound(gameCode);

    broadcastToRoom(io, getGameRoom(gameCode), 'gameReset', {
      users: getGameUsers(gameCode)
    });

    logger.info('SOCKET', `Game ${gameCode} reset by host`);
  });

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

  // Handle grid shuffling broadcast
  socket.on('broadcastShufflingGrid', (data) => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game || game.hostSocketId !== socket.id) return;

    broadcastToRoom(io, getGameRoom(gameCode), 'gridShuffling', data);
  });
}

// Helper functions

async function handleExistingAuthConnection(io, socket, authUserId, gameCode) {
  const existingConnection = getAuthUserConnection(authUserId);
  if (!existingConnection) return;

  const isSameSocket = existingConnection.socketId === socket.id;

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
        message: 'Host started a new game. Room is closing.'
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

function initializePlayerData(game, gameCode) {
  const users = getGameUsers(gameCode);
  const playerUsernames = users.map(u => u.username);
  const gameForInit = getGame(gameCode);

  if (gameForInit) {
    if (!gameForInit.playerWordDetails) gameForInit.playerWordDetails = {};
    if (!gameForInit.playerAchievements) gameForInit.playerAchievements = {};
    if (!gameForInit.playerScores) gameForInit.playerScores = {};
    if (!gameForInit.playerWords) gameForInit.playerWords = {};

    playerUsernames.forEach(username => {
      gameForInit.playerWordDetails[username] = [];
      gameForInit.playerWords[username] = [];
      gameForInit.playerScores[username] = 0;
      gameForInit.playerAchievements[username] = [];
    });

    gameForInit.firstWordFound = false;
    gameForInit.startTime = Date.now();
  }
}

module.exports = { registerGameHandlers, MAX_PLAYERS_PER_ROOM };
