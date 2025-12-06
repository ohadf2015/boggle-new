/**
 * Game Lifecycle Handler
 * Handles game lifecycle events: create, start, end, reset
 */

const {
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  addUserToGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getGameUsers,
  getActiveRooms,
  resetGameForNewRound,
  getAuthUserConnection,
  transitionGameState,
  canTransitionGameState
} = require('../modules/gameStateManager');

const {
  broadcastToRoom,
  getGameRoom,
  joinRoom,
  leaveRoom,
  safeEmit,
  getSocketById,
  disconnectSocket
} = require('../utils/socketHelpers');

const { makePositionsMap } = require('../modules/wordValidator');
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const gameStartCoordinator = require('../utils/gameStartCoordinator');
const timerManager = require('../utils/timerManager');
const redisClient = require('../redisClient');
const { inc, ensureGame } = require('../utils/metrics');
const { generateRandomAvatar } = require('../utils/gameUtils');
const { getRandomLongWords } = require('../dictionary');
const logger = require('../utils/logger');
const { startGameTimer, endGame } = require('./shared');
const { validatePayload, createGameSchema, startGameSchema } = require('../utils/socketValidation');

/**
 * Register game lifecycle socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerGameLifecycleHandlers(io, socket) {

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

    // Check if game can be started (must be in 'waiting' state)
    if (!canTransitionGameState(gameCode, 'START')) {
      emitError(socket, 'Game cannot be started from current state');
      return;
    }

    const validTimer = Math.max(30, Math.min(600, parseInt(timerSeconds) || 180));

    // Update game settings first
    updateGame(gameCode, {
      letterGrid,
      timerSeconds: validTimer,
      remainingTime: validTimer,
      gameDuration: validTimer,
      language: language || game.language,
      minWordLength: minWordLength || 2,
      gameStartedAt: Date.now()
    });

    // Transition state using state machine
    const transitionResult = transitionGameState(gameCode, 'START');
    if (!transitionResult.success) {
      logger.error('SOCKET', `Failed to start game ${gameCode}: ${transitionResult.error}`);
      emitError(socket, 'Failed to start game');
      return;
    }

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
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Handle existing authenticated connection when creating a game
 */
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
    const { removeUserFromGame } = require('../modules/gameStateManager');
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
 * Initialize player data structures for a new game
 */
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

module.exports = {
  registerGameLifecycleHandlers,
  handleExistingAuthConnection,
  initializePlayerData
};
