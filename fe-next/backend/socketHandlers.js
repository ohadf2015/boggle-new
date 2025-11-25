/**
 * Socket.IO Event Handlers
 * Handles all real-time game events using Socket.IO
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
  removeUserBySocketId,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getUserBySocketId,
  updateUserSocketId,
  getGameUsers,
  getActiveRooms,
  isHost,
  updateHostSocketId,
  resetGameForNewRound,
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,
  getTournamentIdFromGame,
  setTournamentIdForGame
} = require('./modules/gameStateManager');

const {
  broadcastToRoom,
  broadcastToRoomExceptSender,
  getGameRoom,
  joinRoom,
  leaveRoom,
  leaveAllGameRooms,
  safeEmit,
  getSocketById
} = require('./utils/socketHelpers');

const { validateWordOnBoard } = require('./modules/wordValidator');
const { calculateWordScore, calculateGameScores } = require('./modules/scoringEngine');
const { checkAndAwardAchievements, getPlayerAchievements, ACHIEVEMENTS } = require('./modules/achievementManager');
const { isDictionaryWord, getAvailableDictionaries } = require('./dictionary');
const gameStartCoordinator = require('./utils/gameStartCoordinator');
const timerManager = require('./utils/timerManager');
const { checkRateLimit, resetRateLimit } = require('./utils/rateLimiter');
const redisClient = require('./redisClient');
const tournamentManager = require('./modules/tournamentManager');
const { cleanupPlayerData } = require('./utils/playerCleanup');
const { emitError, ErrorMessages } = require('./utils/errorHandler');

// Game configuration constants
const MAX_PLAYERS_PER_ROOM = 50; // Maximum number of players allowed in a single room

// Avatar generation constants
const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FAB', '#6BCF7F', '#FFB347', '#9D84B7', '#FF6F61'
];

const AVATAR_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

/**
 * Generate a random avatar with emoji and color
 */
const generateRandomAvatar = () => {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
  };
};

/**
 * Initialize Socket.IO event handlers
 * @param {Server} io - Socket.IO server instance
 */
function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Rate limiting
    if (!checkRateLimit(socket.id)) {
      console.warn(`[SOCKET] Rate limit exceeded for ${socket.id}`);
      emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
      socket.disconnect(true);
      return;
    }

    // Handle game creation
    socket.on('createGame', async (data) => {
      const { gameCode, roomName, language, hostUsername, playerId, avatar } = data;

      console.log(`[SOCKET] Create game request: ${gameCode} by ${hostUsername}`);

      // Validate game code
      if (!gameCode || gameCode.length !== 4) {
        emitError(socket, ErrorMessages.INVALID_GAME_CODE);
        return;
      }

      // Check if game already exists
      if (gameExists(gameCode)) {
        emitError(socket, 'Game code already in use');
        return;
      }

      // Create the game
      const game = createGame(gameCode, {
        hostSocketId: socket.id,
        hostUsername: hostUsername || 'Host',
        hostPlayerId: playerId,
        roomName: roomName || gameCode,
        language: language || 'en'
      });

      // Add host as first user
      addUserToGame(gameCode, hostUsername || 'Host', socket.id, {
        avatar: avatar || generateRandomAvatar(),
        isHost: true,
        playerId
      });

      // Join the socket to the game room
      joinRoom(socket, getGameRoom(gameCode));

      // Confirm game creation
      socket.emit('joined', {
        success: true,
        gameCode,
        isHost: true,
        username: hostUsername || 'Host',
        roomName: roomName || gameCode,
        language: language || 'en'
      });

      // Broadcast updated room list to all clients
      io.emit('activeRooms', { rooms: getActiveRooms() });

      // Broadcast user list update
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode)
      });

      // Save to Redis if available
      try {
        await redisClient.saveGameState(gameCode, game);
      } catch (err) {
        console.error('[REDIS] Failed to save game state:', err);
      }

      console.log(`[SOCKET] Game ${gameCode} created by ${hostUsername}`);
    });

    // Handle player joining
    socket.on('join', async (data) => {
      const { gameCode, username, playerId, avatar } = data;

      console.log(`[SOCKET] Join request: ${username} to game ${gameCode}`);

      // Validate
      if (!gameCode || !username) {
        emitError(socket, ErrorMessages.USERNAME_REQUIRED);
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        emitError(socket, ErrorMessages.GAME_NOT_FOUND);
        return;
      }

      // Check for existing user (reconnection)
      const existingSocketId = getSocketIdByUsername(gameCode, username);

      // Check player limit (unless this is a reconnection)
      if (!existingSocketId && Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
        emitError(socket, ErrorMessages.ROOM_FULL(MAX_PLAYERS_PER_ROOM));
        console.log(`[SOCKET] ${username} tried to join full room ${gameCode}`);
        return;
      }
      if (existingSocketId) {
        // Handle reconnection
        console.log(`[SOCKET] Reconnection detected for ${username}`);

        // Update socket ID
        updateUserSocketId(gameCode, username, socket.id);

        // Check if this is the host reconnecting
        if (game.hostUsername === username) {
          updateHostSocketId(gameCode, socket.id);

          // Clear reconnection timeout if host is reconnecting
          if (game.reconnectionTimeout) {
            clearTimeout(game.reconnectionTimeout);
            game.reconnectionTimeout = null;
            console.log(`[SOCKET] Cleared host reconnection timeout for game ${gameCode}`);
          }
        }

        // Join room
        joinRoom(socket, getGameRoom(gameCode));

        // Send current game state
        socket.emit('joined', {
          success: true,
          gameCode,
          isHost: game.hostUsername === username,
          username,
          roomName: game.roomName,
          language: game.language,
          reconnected: true
        });

        // If game is in progress, send current state
        if (game.gameState === 'in-progress') {
          socket.emit('startGame', {
            letterGrid: game.letterGrid,
            timerSeconds: game.timerSeconds,
            language: game.language,
            messageId: 'reconnect-' + Date.now()
          });
        }

        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode)
        });

        return;
      }

      // Add new user
      addUserToGame(gameCode, username, socket.id, {
        avatar: avatar || generateRandomAvatar(),
        isHost: false,
        playerId
      });

      // Join room
      joinRoom(socket, getGameRoom(gameCode));

      // Confirm join
      socket.emit('joined', {
        success: true,
        gameCode,
        isHost: false,
        username,
        roomName: game.roomName,
        language: game.language
      });

      // Broadcast user list update
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode)
      });

      // Broadcast updated room list
      io.emit('activeRooms', { rooms: getActiveRooms() });

      console.log(`[SOCKET] ${username} joined game ${gameCode}`);
    });

    // Handle game start
    socket.on('startGame', (data) => {
      const { letterGrid, timerSeconds, language } = data;

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

      // Verify sender is host
      if (game.hostSocketId !== socket.id) {
        emitError(socket, ErrorMessages.ONLY_HOST_CAN_START);
        return;
      }

      // Update game state
      updateGame(gameCode, {
        letterGrid,
        timerSeconds: timerSeconds || 180,
        language: language || game.language,
        gameState: 'in-progress'
      });

      // Reset player data
      const users = getGameUsers(gameCode);
      const playerUsernames = users.map(u => u.username);

      // Initialize game start coordination
      const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);

      // Broadcast start game to all players
      broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
        letterGrid,
        timerSeconds: timerSeconds || 180,
        language: language || game.language,
        messageId
      });

      // Set up timeout for acknowledgments
      gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 2000, (stats) => {
        // Start timer even if not all players acknowledged
        startGameTimer(io, gameCode, timerSeconds || 180);
      });

      console.log(`[SOCKET] Game ${gameCode} starting with ${playerUsernames.length} players`);
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

    // Handle word submission
    socket.on('submitWord', (data) => {
      const { word } = data;

      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !username || !word) return;

      const game = getGame(gameCode);
      if (!game || game.gameState !== 'in-progress') return;

      const normalizedWord = word.toLowerCase().trim();

      // Check if already found
      if (playerHasWord(gameCode, username, normalizedWord)) {
        socket.emit('wordAlreadyFound', { word: normalizedWord });
        return;
      }

      // Validate word on board
      const isOnBoard = validateWordOnBoard(normalizedWord, game.letterGrid);
      if (!isOnBoard) {
        socket.emit('wordNotOnBoard', { word: normalizedWord });
        return;
      }

      // Add word to player's list
      addPlayerWord(gameCode, username, normalizedWord);

      // Check dictionary
      const isInDictionary = isDictionaryWord(normalizedWord, game.language);

      if (isInDictionary) {
        // Calculate score
        const wordScore = calculateWordScore(normalizedWord);
        updatePlayerScore(gameCode, username, wordScore, true);

        socket.emit('wordAccepted', {
          word: normalizedWord,
          score: wordScore,
          autoValidated: true
        });

        // Check for achievements
        const achievements = checkAndAwardAchievements(gameCode, username, normalizedWord);
        if (achievements.length > 0) {
          socket.emit('liveAchievementUnlocked', { achievements });
        }
      } else {
        socket.emit('wordNeedsValidation', {
          word: normalizedWord,
          message: 'Word will be validated by host'
        });
      }

      // Update leaderboard with throttling to prevent excessive broadcasts
      getLeaderboardThrottled(gameCode, (leaderboard) => {
        broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', {
          leaderboard
        });
      });
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
      const { message, gameCode: providedGameCode } = data;

      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !message) return;

      const game = getGame(gameCode);
      if (!game) return;

      const isHostUser = game.hostSocketId === socket.id;

      // Broadcast to room
      broadcastToRoom(io, getGameRoom(gameCode), 'chatMessage', {
        username: isHostUser ? 'Host' : username,
        message: message.trim().substring(0, 500), // Limit message length
        timestamp: Date.now(),
        isHost: isHostUser
      });
    });

    // Handle end game
    socket.on('endGame', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game) return;

      // Verify sender is host
      if (game.hostSocketId !== socket.id) {
        emitError(socket, ErrorMessages.ONLY_HOST_CAN_END);
        return;
      }

      endGame(io, gameCode);
    });

    // Handle validate words (host validation)
    socket.on('validateWords', (data) => {
      const { validations } = data || {};

      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      // Validate that validations exists and is an array
      if (!validations || !Array.isArray(validations)) {
        console.error(`[SOCKET] Invalid validations received for game ${gameCode}:`, validations);
        return;
      }

      // Clear auto-validation timeout since host is manually validating
      if (game.validationTimeout) {
        clearTimeout(game.validationTimeout);
        game.validationTimeout = null;
        console.log(`[SOCKET] Cleared auto-validation timeout for game ${gameCode} - host validated manually`);
      }

      // Create a map of valid words for quick lookup
      const validWords = new Set(
        validations.filter(v => v.isValid).map(v => v.word)
      );

      // Calculate scores for each player based on validated words
      const validatedScores = {};
      const playerWords = game.playerWords || {};

      for (const [username, words] of Object.entries(playerWords)) {
        const uniqueWords = [...new Set(words)];
        let totalScore = 0;

        for (const word of uniqueWords) {
          if (validWords.has(word)) {
            // Calculate score: word length - 1
            const score = Math.max(0, word.length - 1);
            totalScore += score;
          }
        }

        validatedScores[username] = totalScore;
      }

      // Update scores
      for (const [username, score] of Object.entries(validatedScores)) {
        updatePlayerScore(gameCode, username, score, false);
      }

      // Convert scores to array format for frontend
      const scoresArray = Object.entries(validatedScores).map(([username, score]) => ({
        username,
        score,
        allWords: game.playerWords?.[username] || []
      })).sort((a, b) => b.score - a.score);

      // Log validation results
      console.log(`[SOCKET] Validation complete for game ${gameCode}:`, {
        totalPlayers: Object.keys(validatedScores).length,
        scores: validatedScores,
        validWordsCount: validWords.size
      });

      // Broadcast validated scores
      broadcastToRoom(io, getGameRoom(gameCode), 'validatedScores', {
        scores: scoresArray,
        letterGrid: game.letterGrid
      });

      // Send validation complete event to host with array format
      const emitSuccess = safeEmit(socket, 'validationComplete', {
        scores: scoresArray
      });

      console.log(`[SOCKET] Sent validationComplete to host for game ${gameCode} - ${emitSuccess ? 'SUCCESS' : 'FAILED'}`);
    });

    // Handle reset game
    socket.on('resetGame', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      // Stop any running timers
      timerManager.clearGameTimer(gameCode);

      // Reset game state
      resetGameForNewRound(gameCode);

      // Broadcast reset
      broadcastToRoom(io, getGameRoom(gameCode), 'resetGame', {
        message: 'Game has been reset. Get ready for a new round!'
      });

      console.log(`[SOCKET] Game ${gameCode} reset`);
    });

    // Handle close room
    socket.on('closeRoom', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      // Stop any running timers
      timerManager.clearGameTimer(gameCode);

      // Notify all players
      broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
        message: 'Host has closed the room'
      });

      // Remove game
      deleteGame(gameCode);

      // Update room list
      io.emit('activeRooms', { rooms: getActiveRooms() });

      console.log(`[SOCKET] Room ${gameCode} closed by host`);
    });

    // Handle get active rooms
    socket.on('getActiveRooms', () => {
      socket.emit('activeRooms', { rooms: getActiveRooms() });
    });

    // Handle host keep alive
    socket.on('hostKeepAlive', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (game) {
        game.lastActivity = Date.now();
      }
    });

    // Handle host reactivate
    socket.on('hostReactivate', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (game) {
        game.lastActivity = Date.now();
        console.log(`[SOCKET] Host reactivated for game ${gameCode}`);
      }
    });

    // Tournament handlers
    socket.on('createTournament', (data) => {
      const { name, totalRounds } = data;

      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      const tournament = tournamentManager.createTournament(name, gameCode, totalRounds);
      setTournamentIdForGame(gameCode, tournament.id);

      broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCreated', {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          totalRounds: tournament.totalRounds,
          currentRound: tournament.currentRound
        }
      });
    });

    socket.on('getTournamentStandings', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const tournamentId = getTournamentIdFromGame(gameCode);
      if (!tournamentId) return;

      const standings = tournamentManager.getStandings(tournamentId);
      socket.emit('tournamentStandings', { standings });
    });

    socket.on('cancelTournament', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      const tournamentId = getTournamentIdFromGame(gameCode);
      if (!tournamentId) return;

      tournamentManager.deleteTournament(tournamentId);
      setTournamentIdForGame(gameCode, null);

      broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCancelled', {
        message: 'Tournament has been cancelled'
      });
    });

    // Handle intentional player leave
    socket.on('leaveRoom', ({ gameCode, username }) => {
      console.log(`[SOCKET] Player ${username} intentionally leaving game ${gameCode}`);

      const game = getGame(gameCode);
      if (!game) {
        console.log(`[SOCKET] Game ${gameCode} not found for leaveRoom`);
        return;
      }

      // Check if this is the host
      if (game.hostSocketId === socket.id) {
        console.log(`[SOCKET] Host intentionally left game ${gameCode} - closing room immediately`);

        // No grace period for intentional host exit
        timerManager.clearGameTimer(gameCode);

        broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
          message: 'Host has left the room. Room is closing.'
        });

        deleteGame(gameCode);
        io.emit('activeRooms', { rooms: getActiveRooms() });
      } else {
        // Regular player intentionally left
        console.log(`[SOCKET] Player ${username} left game ${gameCode}`);

        // Remove player completely including all their data
        removeUserBySocketId(socket.id);

        // Clean up player-specific game data using centralized utility
        cleanupPlayerData(game, username);

        // Broadcast player left notification
        broadcastToRoom(io, getGameRoom(gameCode), 'playerLeft', {
          username,
          message: `${username} has left the room`
        });

        // Update user list for remaining players
        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode)
        });

        // Handle game start coordination
        gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
      }

      // Reset rate limit
      resetRateLimit(socket.id);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Client disconnected: ${socket.id} - ${reason}`);

      const userInfo = removeUserBySocketId(socket.id);
      if (!userInfo) return;

      const { gameCode, username } = userInfo;
      const game = getGame(gameCode);

      if (!game) return;

      // Check if this was the host
      if (game.hostSocketId === socket.id) {
        console.log(`[SOCKET] Host disconnected from game ${gameCode}`);

        // Wait a bit for potential reconnection
        const reconnectionTimeout = setTimeout(() => {
          const currentGame = getGame(gameCode);
          if (currentGame && currentGame.hostSocketId === socket.id &&
              currentGame.reconnectionTimeout === reconnectionTimeout) {
            // Host didn't reconnect, close the room
            timerManager.clearGameTimer(gameCode);

            broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
              message: 'Host disconnected. Room is closing.'
            });

            deleteGame(gameCode);
            io.emit('activeRooms', { rooms: getActiveRooms() });
          }
        }, 30000); // 30 second grace period

        // Store timeout ID in game object
        game.reconnectionTimeout = reconnectionTimeout;
      } else {
        // Regular player disconnected
        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode)
        });

        // Handle game start coordination
        gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
      }

      // Reset rate limit
      resetRateLimit(socket.id);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle shuffling grid broadcast from host
    socket.on('broadcastShufflingGrid', (data) => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      // Broadcast the shuffling grid to all players in the room (except host)
      broadcastToRoomExceptSender(socket, getGameRoom(gameCode), 'shufflingGridUpdate', {
        grid: data.grid,
        highlightedCells: data.highlightedCells || []
      });
    });
  });

  return io;
}

/**
 * Start the game timer
 */
function startGameTimer(io, gameCode, timerSeconds) {
  const game = getGame(gameCode);
  if (!game) return;

  let remainingTime = timerSeconds;

  // Clear any existing timer
  timerManager.clearGameTimer(gameCode);

  // Create interval for time updates
  const timerId = setInterval(() => {
    remainingTime--;

    // Broadcast time update
    broadcastToRoom(io, getGameRoom(gameCode), 'timeUpdate', {
      remainingTime
    });

    if (remainingTime <= 0) {
      timerManager.clearGameTimer(gameCode);
      endGame(io, gameCode);
    }
  }, 1000);

  timerManager.setGameTimer(gameCode, timerId);

  // Broadcast that game has officially started (timer running)
  broadcastToRoom(io, getGameRoom(gameCode), 'gameStarted', {
    timerSeconds: remainingTime
  });
}

/**
 * End the game
 */
function endGame(io, gameCode) {
  const game = getGame(gameCode);
  if (!game) return;

  // Stop timer
  timerManager.clearGameTimer(gameCode);

  // Update game state
  updateGame(gameCode, { gameState: 'finished' });

  // Calculate final scores
  const scores = calculateGameScores(gameCode);

  // Broadcast end game
  broadcastToRoom(io, getGameRoom(gameCode), 'endGame', {
    scores
  });

  // Prepare validation data for host
  const allPlayerWords = [];
  const uniqueWords = new Set();
  let autoValidatedCount = 0;

  Object.keys(game.users).forEach(username => {
    const playerWords = game.playerWords?.[username] || [];
    const wordsWithValidation = playerWords.map(word => {
      const isAutoValidated = isDictionaryWord(word, game.language || 'en');
      if (isAutoValidated) {
        autoValidatedCount++;
      }
      uniqueWords.add(word);
      return {
        word,
        autoValidated: isAutoValidated
      };
    });

    if (wordsWithValidation.length > 0) {
      allPlayerWords.push({
        username,
        words: wordsWithValidation
      });
    }
  });

  // Send validation data to host
  const hostSocketId = game.hostSocketId;
  if (hostSocketId) {
    const hostSocket = getSocketById(io, hostSocketId);
    if (hostSocket) {
      safeEmit(hostSocket, 'showValidation', {
        playerWords: allPlayerWords,
        autoValidatedCount,
        totalWords: uniqueWords.size
      });

      console.log(`[SOCKET] Sent showValidation to host for game ${gameCode} - ${uniqueWords.size} unique words, ${autoValidatedCount} auto-validated`);
    }
  }

  // Set auto-validation timeout
  const tournamentId = getTournamentIdFromGame(gameCode);
  const timeoutDuration = tournamentId ? 30000 : 15000;

  // Send timeout notification to host
  if (hostSocketId) {
    const hostSocket = getSocketById(io, hostSocketId);
    if (hostSocket) {
      safeEmit(hostSocket, 'validationTimeoutStarted', {
        timeoutSeconds: timeoutDuration / 1000,
        isTournament: !!tournamentId
      });
    }
  }

  // Set up auto-validation timeout
  const validationTimeout = setTimeout(() => {
    const currentGame = getGame(gameCode);
    if (currentGame && currentGame.gameState === 'finished') {
      console.log(`[AUTO_VALIDATION] Host AFK for game ${gameCode}, auto-validating dictionary words only`);

      // Auto-validate dictionary words, mark others as invalid
      const validatedScores = {};
      Object.keys(currentGame.users).forEach(username => {
        const playerWords = currentGame.playerWords?.[username] || [];
        let score = 0;

        playerWords.forEach(word => {
          if (isDictionaryWord(word, currentGame.language || 'en')) {
            score += calculateWordScore(word);
          }
        });

        validatedScores[username] = score;
      });

      // Update scores and broadcast
      for (const [username, score] of Object.entries(validatedScores)) {
        updatePlayerScore(gameCode, username, score, false);
      }

      // Convert scores to array format for frontend
      const scoresArray = Object.entries(validatedScores).map(([username, score]) => ({
        username,
        score,
        allWords: currentGame.playerWords?.[username] || []
      })).sort((a, b) => b.score - a.score);

      broadcastToRoom(io, getGameRoom(gameCode), 'validatedScores', {
        scores: scoresArray,
        letterGrid: currentGame.letterGrid
      });

      // Notify host of auto-validation with results
      if (hostSocketId) {
        const hostSocket = getSocketById(io, hostSocketId);
        if (hostSocket) {
          safeEmit(hostSocket, 'autoValidationOccurred', {
            message: 'Auto-validation completed due to inactivity'
          });

          // Also send validation complete to trigger results display
          safeEmit(hostSocket, 'validationComplete', {
            scores: scoresArray
          });
        }
      }
    }
  }, timeoutDuration);

  // Store timeout so it can be cleared if manual validation occurs
  game.validationTimeout = validationTimeout;

  // Check for tournament
  if (tournamentId) {
    // Record round results
    const standings = tournamentManager.recordRoundResults(tournamentId, scores);
    const tournament = tournamentManager.getTournament(tournamentId);

    if (tournament && tournament.currentRound >= tournament.totalRounds) {
      // Tournament complete
      broadcastToRoom(io, getGameRoom(gameCode), 'tournamentComplete', {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          totalRounds: tournament.totalRounds,
          currentRound: tournament.currentRound,
          status: 'completed'
        },
        standings
      });
    } else {
      // Round complete
      broadcastToRoom(io, getGameRoom(gameCode), 'tournamentRoundCompleted', {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          totalRounds: tournament.totalRounds,
          currentRound: tournament.currentRound
        },
        standings
      });
    }
  }

  console.log(`[SOCKET] Game ${gameCode} ended`);
}

module.exports = { initializeSocketHandlers };
