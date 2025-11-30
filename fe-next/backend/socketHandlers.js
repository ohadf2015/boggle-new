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
  cleanupEmptyRooms,
  isHost,
  updateHostSocketId,
  resetGameForNewRound,
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,
  getTournamentIdFromGame,
  setTournamentIdForGame,
  // Auth user tracking
  getAuthUserConnection,
  removeAuthUserConnection,
  clearSocketMappings,
  // Presence tracking
  updateUserPresence,
  updateUserHeartbeat,
  markUserActivity,
  getPresenceConfig
} = require('./modules/gameStateManager');

const { processGameResults, isSupabaseConfigured, saveHostApprovedWord } = require('./modules/supabaseServer');
const { invalidateLeaderboardCaches } = require('./redisClient');

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
} = require('./utils/socketHelpers');

const { validateWordOnBoard, makePositionsMap } = require('./modules/wordValidator');
const { isWordOnBoardAsync } = require('./modules/wordValidatorPool');
const { isProfane, cleanProfanity } = require('./utils/profanityFilter');
const { calculateWordScore, calculateGameScores } = require('./modules/scoringEngine');
const { checkAndAwardAchievements, getPlayerAchievements, ACHIEVEMENTS, getLocalizedAchievements, awardFinalAchievements } = require('./modules/achievementManager');
const { calculatePlayerTitles } = require('./modules/playerTitlesManager');
const { isDictionaryWord, getAvailableDictionaries, addApprovedWord, normalizeWord, getRandomLongWords } = require('./dictionary');
const { incrementWordApproval } = require('./redisClient');
const { loadCommunityWords, collectNonDictionaryWords, getWordForPlayer, recordVote } = require('./modules/communityWordManager');
const gameStartCoordinator = require('./utils/gameStartCoordinator');
const timerManager = require('./utils/timerManager');
const { checkRateLimit, resetRateLimit } = require('./utils/rateLimiter');
const redisClient = require('./redisClient');
const tournamentManager = require('./modules/tournamentManager');
const { cleanupPlayerData } = require('./utils/playerCleanup');
const { emitError, ErrorMessages } = require('./utils/errorHandler');
const { inc, incPerGame, ensureGame } = require('./utils/metrics');
const { DIFFICULTIES } = require('../utils/consts');
const { generateRandomAvatar, generateRoomCode } = require('../utils/utils');

// Game configuration constants
const MAX_PLAYERS_PER_ROOM = 50; // Maximum number of players allowed in a single room

/**
 * Initialize Socket.IO event handlers
 * @param {Server} io - Socket.IO server instance
 */
function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Wrap socket.emit to track error events for debugging
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(event, ...args) {
      if (event === 'error') {
        console.log('[SOCKET] Emitting error event:', { socketId: socket.id, data: args[0] });
        if (!args[0] || (typeof args[0] === 'object' && Object.keys(args[0]).length === 0)) {
          console.warn('[SOCKET] WARNING: Emitting empty error object!');
          console.trace('[SOCKET] Stack trace for empty error:');
        }
      }
      return originalEmit(event, ...args);
    };

    // Rate limiting
    if (!checkRateLimit(socket.id)) {
      console.warn(`[SOCKET] Rate limit exceeded for ${socket.id}`);
      socket.emit('rateLimited');
      socket.disconnect(true);
      return;
    }

    // Handle game creation
    socket.on('createGame', async (data) => {
      if (!checkRateLimit(socket.id)) {
        inc('rateLimited');
        // Note: gameCode not yet defined here, skip per-game metric
        socket.emit('rateLimited');
        return;
      }
      const { gameCode, roomName, language, hostUsername, playerId, avatar, authUserId, guestTokenHash, isRanked, profilePictureUrl } = data;

      console.log(`[SOCKET] Create game request: ${gameCode} by ${hostUsername}${isRanked ? ' (RANKED)' : ''}`);

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

      // Check if authenticated user is already in another game (multi-tab detection)
      if (authUserId) {
        const existingConnection = getAuthUserConnection(authUserId);
        if (existingConnection) {
          console.log(`[SOCKET] Auth user ${authUserId} already in game ${existingConnection.gameCode}, migrating session`);

          // Disconnect old socket
          const oldSocket = getSocketById(io, existingConnection.socketId);
          if (oldSocket && oldSocket.connected) {
            safeEmit(oldSocket, 'sessionMigrated', {
              message: 'Your session was moved to another tab'
            });
            disconnectSocket(oldSocket, true);
          }

          // Clean up old game
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
            // User was a player, just remove them from old game
            removeUserFromGame(existingConnection.gameCode, existingConnection.username);
            const oldGame = getGame(existingConnection.gameCode);
            if (oldGame) {
              broadcastToRoom(io, getGameRoom(existingConnection.gameCode), 'updateUsers', {
                users: getGameUsers(existingConnection.gameCode)
              });
            }
          }
        }
      }

      // Create the game with ranked mode settings
      const game = createGame(gameCode, {
        hostSocketId: socket.id,
        hostUsername: hostUsername || 'Host',
        hostPlayerId: playerId,
        roomName: roomName || gameCode,
        language: language || 'en',
        isRanked: isRanked || false,
        allowLateJoin: isRanked ? false : true // Ranked games don't allow late joins
      });

      // Add host as first user with auth context
      const hostAvatar = avatar || generateRandomAvatar();
      addUserToGame(gameCode, hostUsername || 'Host', socket.id, {
        avatar: { ...hostAvatar, profilePictureUrl: profilePictureUrl || null },
        isHost: true,
        playerId,
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null
      });

      // Join the socket to the game room
      joinRoom(socket, getGameRoom(gameCode));

      // Confirm game creation - include users list to avoid race condition
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
        // Warn host that game state may not persist across server restarts
        safeEmit(socket, 'warning', {
          type: 'persistence',
          message: 'Game state could not be saved. Progress may be lost on server restart.'
        });
      }

      console.log(`[SOCKET] Game ${gameCode} created by ${hostUsername}`);
    });

    // Handle request for words to embed in board (for enhanced gameplay)
    socket.on('getWordsForBoard', (data) => {
      const { language, boardSize } = data;

      // Calculate how many words to provide based on board size
      // Aim for roughly 1 word per 8 cells, with a minimum of 3 and maximum of 15
      const rows = boardSize?.rows || 7;
      const cols = boardSize?.cols || 7;
      const totalCells = rows * cols;
      const wordCount = Math.min(15, Math.max(3, Math.floor(totalCells / 6)));

      // Get random long words from the dictionary
      // Min length 4, max length based on board size (but capped at 8 for playability)
      const maxWordLen = Math.min(8, Math.max(rows, cols));
      const words = getRandomLongWords(language || 'en', wordCount, 4, maxWordLen);

      socket.emit('wordsForBoard', { words });
    });

    // Handle player joining
    socket.on('join', async (data) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('rateLimited');
        return;
      }
      const { gameCode, username, playerId, avatar, authUserId, guestTokenHash, profilePictureUrl } = data;

      console.log(`[SOCKET] Join request: ${username} to game ${gameCode}`, { authUserId, guestTokenHash: !!guestTokenHash });

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

      // Check if authenticated user is already in a DIFFERENT game (multi-tab detection)
      if (authUserId) {
        const existingConnection = getAuthUserConnection(authUserId);
        if (existingConnection && existingConnection.gameCode !== gameCode) {
          console.log(`[SOCKET] Auth user ${authUserId} migrating from game ${existingConnection.gameCode} to ${gameCode}`);

          // Disconnect old socket
          const oldSocket = getSocketById(io, existingConnection.socketId);
          if (oldSocket && oldSocket.connected) {
            safeEmit(oldSocket, 'sessionMigrated', {
              message: 'Your session was moved to another tab'
            });
            disconnectSocket(oldSocket, true);
          }

          // Clean up old game
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
            // User was a player, just remove them from old game
            removeUserFromGame(existingConnection.gameCode, existingConnection.username);
            const oldGame = getGame(existingConnection.gameCode);
            if (oldGame) {
              broadcastToRoom(io, getGameRoom(existingConnection.gameCode), 'updateUsers', {
                users: getGameUsers(existingConnection.gameCode)
              });
            }
          }
        }
      }

      // Block late joins for ranked games that are in progress
      if (game.isRanked && game.gameState === 'in-progress' && !game.allowLateJoin) {
        const existingSocketId = getSocketIdByUsername(gameCode, username);
        // Allow reconnection but not new joins
        if (!existingSocketId) {
          emitError(socket, 'Cannot join ranked game in progress');
          return;
        }
      }

      // Check for existing user (reconnection)
      const existingSocketId = getSocketIdByUsername(gameCode, username);

      // Check player limit (unless this is a reconnection)
      if (!existingSocketId && Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
        console.log(`[SOCKET] ${username} tried to join full room ${gameCode}`);
        // Spectator overflow: join room without adding to users
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
      if (existingSocketId || game.users[username]) {
        // Handle reconnection - either existing socket OR user marked as disconnected
        console.log(`[SOCKET] Reconnection detected for ${username}`, { authUserId, guestTokenHash: !!guestTokenHash });

        // Clear disconnected status on reconnection
        if (game.users[username]) {
          game.users[username].disconnected = false;
          delete game.users[username].disconnectedAt;
        }

        // Update socket ID and auth context (user may have logged in since original join)
        updateUserSocketId(gameCode, username, socket.id, {
          authUserId: authUserId || null,
          guestTokenHash: guestTokenHash || null
        });

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

        // Send current game state - include users list to avoid race condition
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

        // If game is in progress, send current state with remaining time
        if (game.gameState === 'in-progress') {
          socket.emit('startGame', {
            letterGrid: game.letterGrid,
            timerSeconds: game.remainingTime || game.timerSeconds, // Use remaining time if available
            language: game.language,
            minWordLength: game.minWordLength || 2,
            messageId: 'reconnect-' + Date.now(),
            reconnect: true,
            skipAck: true // Reconnecting players don't need to participate in game start coordination
          });
        }

        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode)
        });

        return;
      }

      // Add new user with auth context
      const userAvatar = avatar || generateRandomAvatar();
      addUserToGame(gameCode, username, socket.id, {
        avatar: { ...userAvatar, profilePictureUrl: profilePictureUrl || null },
        isHost: false,
        playerId,
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null
      });

      // Join room
      joinRoom(socket, getGameRoom(gameCode));

      // Confirm join - include users list to avoid race condition
      socket.emit('joined', {
        success: true,
        gameCode,
        isHost: false,
        username,
        roomName: game.roomName,
        language: game.language,
        users: getGameUsers(gameCode)
      });

      // If game is in progress, allow player to join mid-game
      if (game.gameState === 'in-progress') {
        console.log(`[SOCKET] ${username} joining game ${gameCode} in progress - allowing participation`);

        // Send startGame with the current remaining time (not original timer)
        socket.emit('startGame', {
          letterGrid: game.letterGrid,
          timerSeconds: game.remainingTime || game.timerSeconds, // Use remaining time if available
          language: game.language,
          minWordLength: game.minWordLength || 2,
          messageId: 'late-join-' + Date.now(),
          lateJoin: true,
          skipAck: true // Late-joining players don't need to participate in game start coordination
        });

        // Send current leaderboard
        const leaderboard = getLeaderboard(gameCode);
        socket.emit('updateLeaderboard', { leaderboard });

        // Send current achievements to late-joiner (including reconnecting players)
        const playerAchievementKeys = game.playerAchievements?.[username] || [];
        if (playerAchievementKeys.length > 0) {
          const localizedAchievements = getLocalizedAchievements(game.language || 'he');
          const achievements = playerAchievementKeys
            .map(key => localizedAchievements[key])
            .filter(Boolean);

          console.log(`[SOCKET] Syncing ${achievements.length} achievements to late-joiner ${username}`);
          socket.emit('liveAchievementUnlocked', { achievements });
        }
      }

      // Add to tournament if one is active (mid-tournament join)
      const tournamentId = getTournamentIdFromGame(gameCode);
      if (tournamentId) {
        try {
          const tournamentAvatar = { ...userAvatar, profilePictureUrl: profilePictureUrl || null };
          tournamentManager.addPlayerMidTournament(tournamentId, socket.id, username, tournamentAvatar);

          // Send tournament info to the joining player
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

          // Notify others that a new player joined the tournament
          broadcastToRoomExceptSender(socket, getGameRoom(gameCode), 'tournamentPlayerJoined', {
            username,
            standings
          });
        } catch (err) {
          console.log(`[TOURNAMENT] Could not add ${username} to tournament: ${err.message}`);
        }
      }

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

      // Verify sender is host
      if (game.hostSocketId !== socket.id) {
        emitError(socket, ErrorMessages.ONLY_HOST_CAN_START);
        return;
      }

      // Validate and clamp timer to reasonable bounds (30 seconds to 10 minutes)
      const validTimer = Math.max(30, Math.min(600, parseInt(timerSeconds) || 180));

      // Update game state
      updateGame(gameCode, {
        letterGrid,
        timerSeconds: validTimer,
        remainingTime: validTimer,  // Initialize remaining time for late joiners
        gameDuration: validTimer,   // Store original game duration for achievement calculations
        language: language || game.language,
        minWordLength: minWordLength || 2,  // Minimum word length setting
        gameState: 'in-progress',
        gameStartedAt: Date.now()  // Track when game started for debugging
      });

      // Precompute letter positions for faster validation
      const positions = makePositionsMap(letterGrid);
      const current = getGame(gameCode);
      if (current) {
        current.letterPositions = positions;
      }
      ensureGame(gameCode);

      // Reset player data and ensure achievements are initialized
      const users = getGameUsers(gameCode);
      const playerUsernames = users.map(u => u.username);

      // Initialize achievements and word details for all players
      // CRITICAL: playerWordDetails MUST be initialized BEFORE playerAchievements
      // because achievement checks reference playerWordDetails
      const gameForInit = getGame(gameCode);
      if (gameForInit) {
        // Ensure parent objects exist first
        if (!gameForInit.playerWordDetails) {
          gameForInit.playerWordDetails = {};
        }
        if (!gameForInit.playerAchievements) {
          gameForInit.playerAchievements = {};
        }
        if (!gameForInit.playerScores) {
          gameForInit.playerScores = {};
        }
        if (!gameForInit.playerWords) {
          gameForInit.playerWords = {};
        }

        playerUsernames.forEach(username => {
          // Reset all player data for new game (clear previous round data)
          // Initialize playerWordDetails FIRST (achievements depend on it)
          gameForInit.playerWordDetails[username] = [];
          gameForInit.playerWords[username] = [];
          gameForInit.playerScores[username] = 0;
          // Initialize achievements LAST (they may check other data)
          gameForInit.playerAchievements[username] = [];
        });
        // Reset game-level achievement tracking
        gameForInit.firstWordFound = false;
        gameForInit.startTime = Date.now();

        console.log(`[SOCKET] Initialized player data for ${playerUsernames.length} players in game ${gameCode}`);
      }

      // Initialize game start coordination
      const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);

      // Broadcast start game to all players
      broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
        letterGrid,
        timerSeconds: validTimer,
        language: language || game.language,
        minWordLength: minWordLength || 2,
        messageId
      });

      // Set up timeout for acknowledgments
      gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 2000, (stats) => {
        // Start timer even if not all players acknowledged
        startGameTimer(io, gameCode, validTimer);
      });

      console.log(`[SOCKET] Game ${gameCode} starting with ${playerUsernames.length} players`);
    });

    // Handle start game acknowledgment - NOT rate limited (essential for game coordination)
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
    const SUBMIT_WORD_WEIGHT = parseInt(process.env.RATE_WEIGHT_SUBMITWORD || '1');
    const CHAT_WEIGHT = parseInt(process.env.RATE_WEIGHT_CHAT || '1');

    socket.on('submitWord', async (data) => {
      if (!checkRateLimit(socket.id, SUBMIT_WORD_WEIGHT)) {
        socket.emit('rateLimited');
        return;
      }
      try {
        const { word, comboLevel = 0 } = data;

        const gameCode = getGameBySocketId(socket.id);
        const username = getUsernameBySocketId(socket.id);

        if (!gameCode || !username || !word) {
          console.warn(`[SOCKET] submitWord failed - socketId: ${socket.id}, gameCode: ${gameCode || 'NULL'}, username: ${username || 'NULL'}, word: ${word || 'NULL'}`);
          emitError(socket, ErrorMessages.INVALID_WORD_SUBMISSION);
          return;
        }

        const game = getGame(gameCode);
        if (!game || game.gameState !== 'in-progress') {
          emitError(socket, ErrorMessages.GAME_NOT_IN_PROGRESS);
          return;
        }

        // Mark user activity when submitting words
        markUserActivity(gameCode, username);

        // Cap word length to prevent abuse (max 50 chars)
        const normalizedWord = word.toLowerCase().trim().substring(0, 50);

        // Check for profanity - reject inappropriate words (exact word matching to avoid false positives)
        if (isProfane(normalizedWord)) {
          socket.emit('wordRejected', {
            word: normalizedWord,
            reason: 'inappropriate'
          });
          return;
        }

        // Validate minimum word length
        const minLength = game.minWordLength || 2;
        if (normalizedWord.length < minLength) {
          socket.emit('wordTooShort', {
            word: normalizedWord,
            minLength: minLength
          });
          return;
        }

        // Check if already found
        if (playerHasWord(gameCode, username, normalizedWord)) {
          socket.emit('wordAlreadyFound', { word: normalizedWord });
          return;
        }

        // Validate word on board using async worker pool (offloads CPU work from event loop)
        const isOnBoard = await isWordOnBoardAsync(normalizedWord, game.letterGrid, game.letterPositions);
        if (!isOnBoard) {
          inc('wordNotOnBoard');
          incPerGame(gameCode, 'wordNotOnBoard');
          socket.emit('wordNotOnBoard', { word: normalizedWord });
          return;
        }

        // Check dictionary first to determine if auto-validated
        const isInDictionary = isDictionaryWord(normalizedWord, game.language);

        if (isInDictionary) {
          // Calculate score with combo multiplier
          // Clamp combo level to reasonable bounds (0-10) to prevent abuse
          const safeComboLevel = Math.max(0, Math.min(10, parseInt(comboLevel) || 0));
          const baseScore = normalizedWord.length - 1; // Score without combo
          const wordScore = calculateWordScore(normalizedWord, safeComboLevel);
          const comboBonus = wordScore - baseScore;

          // Diagnostic logging for combo calculation
          console.log(`[COMBO] ${username} submitted "${normalizedWord}": baseScore=${baseScore}, comboLevel=${safeComboLevel}, comboBonus=${comboBonus}, totalScore=${wordScore}`);

          // Store combo level server-side for STREAK_MASTER achievement tracking
          if (!game.playerCombos) game.playerCombos = {};
          game.playerCombos[username] = safeComboLevel;

          // Add word to player's list with score and combo data
          addPlayerWord(gameCode, username, normalizedWord, {
            autoValidated: true,
            score: wordScore,
            comboBonus: comboBonus,
            comboLevel: safeComboLevel
          });

          updatePlayerScore(gameCode, username, wordScore, true);

          inc('wordAccepted');
          incPerGame(gameCode, 'wordAccepted');
          socket.emit('wordAccepted', {
            word: normalizedWord,
            score: wordScore,
            baseScore: baseScore,
            comboBonus: comboBonus,
            comboLevel: safeComboLevel,
            autoValidated: true
          });

          // Check for achievements
          console.log(`[ACHIEVEMENT] Checking live achievements for ${username} after word "${normalizedWord}"`);
          const achievements = checkAndAwardAchievements(gameCode, username, normalizedWord);
          if (achievements.length > 0) {
            console.log(`[ACHIEVEMENT] Emitting ${achievements.length} achievements to ${username}:`, achievements.map(a => a.name || a).join(', '));
            socket.emit('liveAchievementUnlocked', { achievements });
            console.log(`[ACHIEVEMENT] Emission complete for ${username}`);
          }
        } else {
          // Check if host is playing solo
          const playerCount = Object.keys(game.users).length;
          const isHostSoloGame = playerCount === 1;

          if (isHostSoloGame) {
            // Solo host game: reject non-dictionary words immediately (no validation needed)
            inc('wordNotValid');
            incPerGame(gameCode, 'wordNotValid');

            // Add word to playerWordDetails as invalid to track for achievements
            // This ensures PERFECTIONIST and other achievements work correctly
            addPlayerWord(gameCode, username, normalizedWord, {
              autoValidated: false,
              score: 0,
              comboBonus: 0,
              comboLevel: 0,
              validated: false  // Mark as invalid for achievement tracking
            });

            // Reset combo level since invalid word breaks combo
            if (!game.playerCombos) game.playerCombos = {};
            game.playerCombos[username] = 0;

            socket.emit('wordRejected', {
              word: normalizedWord,
              reason: 'notInDictionary'
            });
            console.log(`[SOCKET] Solo host game - rejected non-dictionary word: "${normalizedWord}"`);
          } else {
            // Multi-player game: word needs host validation
            // IMPORTANT: Preserve combo data even for non-dictionary words
            // so that if host validates the word, combo bonus is applied
            const safeComboLevel = Math.max(0, Math.min(10, parseInt(comboLevel) || 0));
            const baseScore = normalizedWord.length - 1;
            const potentialScore = calculateWordScore(normalizedWord, safeComboLevel);
            const comboBonus = potentialScore - baseScore;

            // Store combo level server-side for STREAK_MASTER achievement tracking
            if (!game.playerCombos) game.playerCombos = {};
            game.playerCombos[username] = safeComboLevel;

            addPlayerWord(gameCode, username, normalizedWord, {
              autoValidated: false,
              score: 0,  // Keep score 0 until validated
              comboBonus: comboBonus,     // Preserve combo bonus for later validation
              comboLevel: safeComboLevel  // Preserve combo level for later validation
            });

            inc('wordNeedsValidation');
            incPerGame(gameCode, 'wordNeedsValidation');
            socket.emit('wordNeedsValidation', {
              word: normalizedWord,
              message: 'Word will be validated by host'
            });

            // DO NOT check achievements for non-validated words
            // Achievements will be checked when host validates the word
            // This prevents awarding achievements like PERFECTIONIST for invalid words
          }
        }

        const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
        getLeaderboardThrottled(gameCode, (leaderboard) => {
          broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', {
            leaderboard
          });
        }, lbThrottleMs);
      } catch (error) {
        console.error('[SOCKET] Error in submitWord handler:', error);
        emitError(socket, 'An error occurred while processing your word');
      }
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
      if (!checkRateLimit(socket.id, CHAT_WEIGHT)) {
        inc('rateLimited');
        socket.emit('rateLimited');
        return;
      }
      const { message, gameCode: providedGameCode } = data;

      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !message) {
        emitError(socket, ErrorMessages.INVALID_MESSAGE);
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        emitError(socket, ErrorMessages.GAME_NOT_FOUND);
        return;
      }

      const isHostUser = game.hostSocketId === socket.id;

      // Sanitize HTML to prevent XSS attacks
      const sanitizeHtml = (str) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // Filter profanity (exact word matching to avoid false positives in other languages) and broadcast to room
      const cleanMessage = sanitizeHtml(cleanProfanity(message.trim().substring(0, 500)));
      broadcastToRoom(io, getGameRoom(gameCode), 'chatMessage', {
        username: isHostUser ? 'Host' : sanitizeHtml(username),
        message: cleanMessage,
        timestamp: Date.now(),
        isHost: isHostUser
      });
    });

    // Handle word vote submission (crowd-sourced dictionary improvement)
    socket.on('submitWordVote', async (data) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('rateLimited');
        return;
      }

      const { word, voteType, gameCode: providedGameCode } = data;
      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !word || !voteType) {
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        return;
      }

      // Get user data for auth context
      const userData = game.users?.[username];
      const userId = userData?.authUserId || null;
      const guestId = userData?.guestTokenHash || null;

      if (!userId && !guestId) {
        console.log(`[VOTE] No voter identifier for ${username}, skipping vote`);
        return;
      }

      // Record the vote
      const result = await recordVote({
        word,
        language: game.language || 'en',
        userId,
        guestId,
        gameCode,
        voteType,
        submitter: data.submittedBy || 'unknown'
      });

      if (result.success) {
        socket.emit('voteRecorded', { word, success: true });
        console.log(`[VOTE] ${username} voted ${voteType} on "${word}"`);

        // If word just became valid (crossed 6+ threshold), notify everyone
        if (result.isNowValid) {
          broadcastToRoom(io, getGameRoom(gameCode), 'wordBecameValid', {
            word,
            language: game.language || 'en'
          });
        }
      } else {
        socket.emit('voteRecorded', { word, success: false, error: result.error });
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

      // Verify sender is host
      if (game.hostSocketId !== socket.id) {
        emitError(socket, ErrorMessages.ONLY_HOST_CAN_END);
        return;
      }

      endGame(io, gameCode);
    });

    // Handle validate words (host validation)
    socket.on('validateWords', async (data) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('rateLimited');
        return;
      }
      const { validations } = data || {};

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
      // Include combo bonuses that were earned during live play
      const validatedScores = {};
      const playerWords = game.playerWords || {};

      for (const [username, words] of Object.entries(playerWords)) {
        const uniqueWords = [...new Set(words)];
        const playerWordDetails = game.playerWordDetails?.[username] || [];
        let totalScore = 0;

        for (const word of uniqueWords) {
          if (validWords.has(word)) {
            // Look up the score from word details (includes combo bonus earned during live play)
            const wordDetail = playerWordDetails.find(wd => wd.word === word);
            if (wordDetail && wordDetail.score > 0) {
              // Use the score that was recorded during live play (includes combo bonus)
              totalScore += wordDetail.score;
            } else {
              // For non-dictionary words validated by host, use stored combo level if available
              const comboLevel = wordDetail?.comboLevel || 0;
              const score = calculateWordScore(word, comboLevel);
              totalScore += score;
            }
          }
        }

        validatedScores[username] = totalScore;
      }

      // Update scores
      for (const [username, score] of Object.entries(validatedScores)) {
        updatePlayerScore(gameCode, username, score, false);
      }

      // Build word count map to detect duplicates
      const wordCountMap = {};
      for (const words of Object.values(playerWords)) {
        for (const word of words) {
          wordCountMap[word] = (wordCountMap[word] || 0) + 1;
        }
      }

      // Update playerWordDetails with validation status for achievement calculation
      // Also check live achievements for newly validated words
      for (const username of Object.keys(playerWords)) {
        const playerWordDetails = game.playerWordDetails?.[username] || [];
        for (const wordDetail of playerWordDetails) {
          const wasUnvalidated = wordDetail.validated === false;
          wordDetail.validated = validWords.has(wordDetail.word);

          // If this word was just validated (wasn't auto-validated before)
          // Check for live achievements now
          if (wasUnvalidated && wordDetail.validated) {
            const newAchievements = checkAndAwardAchievements(gameCode, username, wordDetail.word);
            if (newAchievements.length > 0) {
              // Find the player's socket to emit achievements
              const playerSocket = io.sockets.sockets.get(game.users[username]?.socketId);
              if (playerSocket) {
                playerSocket.emit('liveAchievementUnlocked', { achievements: newAchievements });
              }
            }
          }
        }
      }

      // Award final achievements based on validated words
      const usernames = Object.keys(playerWords);
      awardFinalAchievements(game, usernames);

      // Convert scores to array format for frontend
      const scoresArray = Object.entries(validatedScores).map(([username, score]) => {
        const playerWordsList = game.playerWords?.[username] || [];
        const playerWordDetailsList = game.playerWordDetails?.[username] || [];

        // Transform word strings to objects with validation metadata
        const allWords = playerWordsList.map(word => {
          const isValid = validWords.has(word);
          const isDuplicate = wordCountMap[word] > 1;

          // Look up score and combo bonus from word details (earned during live play)
          const wordDetail = playerWordDetailsList.find(wd => wd.word === word);
          const comboBonus = wordDetail?.comboBonus || 0;
          // Use stored score (includes combo) or calculate with stored combo level as fallback
          const storedComboLevel = wordDetail?.comboLevel || 0;
          const wordScore = isValid ? (wordDetail?.score || calculateWordScore(word, storedComboLevel)) : 0;

          return {
            word: word,
            score: isDuplicate ? 0 : wordScore, // Duplicates get 0 points
            comboBonus: comboBonus, // Bonus earned during live play
            validated: isValid,
            isDuplicate: isDuplicate
          };
        });

        // Calculate valid words count and longest word
        const validWordsInList = allWords.filter(w => w.validated && !w.isDuplicate);
        const longestWord = validWordsInList.length > 0
          ? validWordsInList.reduce((longest, w) => w.word.length > longest.length ? w.word : longest, '')
          : '';

        // Get localized achievements for this player
        const playerAchievementKeys = game.playerAchievements?.[username] || [];
        const localizedAchievements = getLocalizedAchievements(game.language || 'he');
        const playerAchievements = playerAchievementKeys.map(key => localizedAchievements[key]).filter(Boolean);

        // Comprehensive logging for results with translation check
        console.log(`[RESULTS] Player ${username} results:`, {
          score: score,
          wordCount: allWords.length,
          validWordCount: validWordsInList.length,
          achievementKeys: playerAchievementKeys,
          localizedAchievementsCount: playerAchievements.length,
          gameLanguage: game.language || 'he',
          comboBonus: allWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0)
        });

        // Check for missing translations
        if (playerAchievementKeys.length !== playerAchievements.length) {
          const missingKeys = playerAchievementKeys.filter(key => !localizedAchievements[key]);
          console.warn(`[RESULTS] Missing achievement translations for ${username}:`, missingKeys);
        }

        return {
          username,
          score,
          allWords,
          wordCount: allWords.length,
          validWordCount: validWordsInList.length,
          longestWord,
          avatar: game.users?.[username]?.avatar || null,
          achievements: playerAchievements
        };
      }).sort((a, b) => b.score - a.score);

      // Calculate player titles based on performance
      const gameDuration = game.gameDuration || 180;
      const playerTitles = calculatePlayerTitles(scoresArray, game.language || 'he', gameDuration);

      // Add titles to each player's score object
      scoresArray.forEach(playerScore => {
        const titleData = playerTitles[playerScore.username];
        if (titleData) {
          playerScore.title = titleData.title;
          playerScore.titleKey = titleData.titleKey;
        }
      });

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

      // Track host-approved words for community dictionary promotion
      // For words that were NOT in the dictionary but approved by host
      const language = game.language || 'en';
      const hostUserId = game.users[game.hostUsername]?.authUserId || null;
      const approvedNonDictionaryWords = validations.filter(v => {
        if (!v.isValid) return false;
        // Check if word was NOT in the original dictionary (host manually approved it)
        const isInDictionary = isDictionaryWord(v.word, language);
        return !isInDictionary;
      });

      // Process each approved non-dictionary word
      for (const { word } of approvedNonDictionaryWords) {
        const normalizedWord = normalizeWord(word, language);

        // Increment approval in Redis and check if threshold reached
        const approvalData = await incrementWordApproval(normalizedWord, language, gameCode);

        let promoted = false;
        if (approvalData && approvalData.approvalCount >= 2) {
          // Word has been approved by 2+ different game sessions - promote it!
          promoted = await addApprovedWord(normalizedWord, language);
          if (promoted) {
            console.log(`[SOCKET] Word "${word}" (${language}) promoted to community dictionary after ${approvalData.approvalCount} approvals from games: ${approvalData.gameIds.join(', ')}`);
          }
        } else if (approvalData) {
          console.log(`[SOCKET] Word "${word}" (${language}) approved in game ${gameCode} (${approvalData.approvalCount}/2 approvals needed)`);
        }

        // Save to Supabase for tracking and analytics
        await saveHostApprovedWord({
          word: normalizedWord,
          language,
          gameCode,
          hostUserId,
          promoted
        });
      }

      // Record game results to Supabase for leaderboard/stats
      await recordGameResultsToSupabase(gameCode, scoresArray, game);
    });

    // Handle reset game
    socket.on('resetGame', () => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('rateLimited');
        return;
      }
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      // Stop any running timers
      timerManager.clearGameTimer(gameCode);

      // Clear validation timeout to prevent auto-validation from firing after reset
      if (game.validationTimeout) {
        clearTimeout(game.validationTimeout);
        game.validationTimeout = null;
      }

      // Clean up any active game start sequence from previous game
      // This prevents race conditions when starting a new game quickly
      gameStartCoordinator.cleanupSequence(gameCode);

      // Reset game state
      resetGameForNewRound(gameCode);

      // Broadcast reset
      broadcastToRoom(io, getGameRoom(gameCode), 'resetGame', {
        message: 'Game has been reset. Get ready for a new round!'
      });

      // Broadcast updated user list to ensure all clients have correct player data
      // This helps players who may have stale state after the reset
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode)
      });

      console.log(`[SOCKET] Game ${gameCode} reset`);
    });

    // Handle close room
    socket.on('closeRoom', () => {
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }
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

    // Handle get active rooms - NOT rate limited (essential for lobby)
    socket.on('getActiveRooms', () => {
      socket.emit('activeRooms', { rooms: getActiveRooms() });
    });

    // Handle host keep alive - NOT rate limited (essential for connection health)
    socket.on('hostKeepAlive', () => {
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (game) {
        game.lastActivity = Date.now();
      }
    });

    // Handle host reactivate - NOT rate limited (essential for reconnection)
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
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }
      const { name, totalRounds, timerSeconds, difficulty, language } = data;

      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      // Create tournament with correct signature: hostPlayerId, hostUsername, settings
      const tournament = tournamentManager.createTournament(socket.id, game.hostUsername, {
        name: name || 'Tournament',
        totalRounds: totalRounds || 3,
        timerSeconds: timerSeconds || 180,
        difficulty: difficulty || 'medium',
        language: language || 'en',
      });
      setTournamentIdForGame(gameCode, tournament.id);

      // Add all current players to the tournament
      Object.entries(game.users).forEach(([username, userData]) => {
        const playerSocketId = Object.keys(game.playerSocketIds || {}).find(
          id => game.playerSocketIds[id] === username
        );
        if (playerSocketId) {
          tournamentManager.addPlayerToTournament(tournament.id, playerSocketId, username, userData.avatar);
        }
      });

      broadcastToRoom(io, getGameRoom(gameCode), 'tournamentCreated', {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          totalRounds: tournament.totalRounds,
          currentRound: tournament.currentRound
        }
      });
    });

    // Start a tournament round
    socket.on('startTournamentRound', () => {
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }

      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const game = getGame(gameCode);
      if (!game || game.hostSocketId !== socket.id) return;

      const tournamentId = getTournamentIdFromGame(gameCode);
      if (!tournamentId) return;

      const tournament = tournamentManager.getTournament(tournamentId);
      if (!tournament) return;

      // Check if tournament is already complete
      if (tournament.currentRound >= tournament.totalRounds) {
        socket.emit('tournamentComplete', {
          standings: tournamentManager.getTournamentStandings(tournamentId)
        });
        return;
      }

      try {
        // Start the round in tournament manager
        const roundData = tournamentManager.startTournamentRound(tournamentId, gameCode);

        // Get standings for display
        const standings = tournamentManager.getTournamentStandings(tournamentId);

        // Broadcast round starting to all players
        broadcastToRoom(io, getGameRoom(gameCode), 'tournamentRoundStarting', {
          roundNumber: roundData.roundNumber,
          totalRounds: tournament.totalRounds,
          standings: standings
        });

        // Generate new grid and start the game
        const { generateRandomTable } = require('../utils/utils');
        const difficultyKey = (tournament.settings.difficulty || 'HARD').toUpperCase();
        const difficultyConfig = DIFFICULTIES[difficultyKey] || DIFFICULTIES.HARD;
        const lang = tournament.settings.language;

        // Get words to embed for enhanced gameplay (except Japanese which handles it internally)
        let wordsToEmbed = [];
        if (lang !== 'ja') {
          const maxWordLen = Math.min(8, Math.max(difficultyConfig.rows, difficultyConfig.cols));
          const totalCells = difficultyConfig.rows * difficultyConfig.cols;
          const wordCount = Math.min(15, Math.max(3, Math.floor(totalCells / 6)));
          wordsToEmbed = getRandomLongWords(lang, wordCount, 4, maxWordLen);
        }

        const newTable = generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, lang, wordsToEmbed);
        const timerSeconds = tournament.settings.timerSeconds;

        // Reset game state for new round
        resetGameForNewRound(gameCode);

        // Update game state
        game.letterGrid = newTable;
        game.gameState = 'playing';
        game.minWordLength = game.minWordLength || 2;

        // Start the game
        broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
          letterGrid: newTable,
          timerSeconds: timerSeconds,
          language: tournament.settings.language,
          hostPlaying: game.hostPlaying,
          minWordLength: game.minWordLength
        });

        // Start timer
        startGameTimer(io, gameCode, timerSeconds);

        console.log(`[TOURNAMENT] Started round ${roundData.roundNumber}/${tournament.totalRounds} for game ${gameCode}`);
      } catch (err) {
        console.error('[TOURNAMENT] Error starting round:', err);
        socket.emit('error', { message: err?.message || String(err) || 'Failed to start tournament round' });
      }
    });

    socket.on('getTournamentStandings', () => {
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) return;

      const tournamentId = getTournamentIdFromGame(gameCode);
      if (!tournamentId) return;

      const standings = tournamentManager.getTournamentStandings(tournamentId);
      socket.emit('tournamentStandings', { standings });
    });

    socket.on('cancelTournament', () => {
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }
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
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }
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

        // Clean up empty rooms and broadcast updated room list
        const cleanedCount = cleanupEmptyRooms();
        if (cleanedCount > 0) {
          console.log(`[SOCKET] Cleaned up ${cleanedCount} empty room(s)`);
        }
        io.emit('activeRooms', { rooms: getActiveRooms() });
      }

      // Reset rate limit
      resetRateLimit(socket.id);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Client disconnected: ${socket.id} - ${reason}`);

      // Get user info WITHOUT removing them yet - we need to check if it's the host
      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !username) {
        resetRateLimit(socket.id);
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        // Clean up orphan mappings
        clearSocketMappings(socket.id);
        resetRateLimit(socket.id);
        return;
      }

      const isHostDisconnect = game.hostSocketId === socket.id;

      if (isHostDisconnect) {
        console.log(`[SOCKET] Host disconnected from game ${gameCode}`);

        // Mark host as disconnected but DON'T remove their user data yet
        // This allows reconnection to find them and restore their session
        if (game.users[username]) {
          game.users[username].disconnected = true;
          game.users[username].disconnectedAt = Date.now();
        }

        // Only clear socket mappings, NOT user data
        clearSocketMappings(socket.id);

        // Set reconnection timeout - only remove user data and close room if timeout expires
        const reconnectionTimeout = setTimeout(() => {
          const currentGame = getGame(gameCode);
          if (currentGame && currentGame.users[username]?.disconnected) {
            // Host didn't reconnect within grace period - NOW remove their data and close room
            console.log(`[SOCKET] Host reconnect grace period expired for game ${gameCode}`);

            removeUserFromGame(gameCode, username);
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
        // Regular player disconnected - use existing behavior (full removal)
        const userInfo = removeUserBySocketId(socket.id);
        if (!userInfo) {
          resetRateLimit(socket.id);
          return;
        }

        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode)
        });

        // Handle game start coordination
        gameStartCoordinator.handlePlayerDisconnect(gameCode, username);

        // Remove player from tournament if active
        const tournamentId = getTournamentIdFromGame(gameCode);
        if (tournamentId) {
          const removed = tournamentManager.removePlayerFromTournament(tournamentId, socket.id, true);
          if (removed) {
            console.log(`[TOURNAMENT] Removed disconnected player ${username} from tournament ${tournamentId}`);
            // Broadcast updated standings
            const standings = tournamentManager.getTournamentStandings(tournamentId);
            broadcastToRoom(io, getGameRoom(gameCode), 'tournamentPlayerLeft', {
              username,
              standings
            });
          }
        }

        // Clean up empty rooms and broadcast updated room list
        const cleanedCount = cleanupEmptyRooms();
        if (cleanedCount > 0) {
          console.log(`[SOCKET] Cleaned up ${cleanedCount} empty room(s)`);
        }
        io.emit('activeRooms', { rooms: getActiveRooms() });
      }

      // Reset rate limit
      resetRateLimit(socket.id);
    });

    // Ping/pong for connection health - NOT rate limited (essential for connection health)
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle presence update from client - NOT rate limited (essential for presence tracking)
    socket.on('presenceUpdate', (data) => {
      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      console.log(`[PRESENCE] Received from ${username} in ${gameCode}:`, data);

      if (!gameCode || !username) {
        console.log('[PRESENCE] No gameCode or username, ignoring');
        return;
      }

      const { isWindowFocused, isActive, isIdle } = data;

      // Update presence status
      // If explicitly idle, force the idle status regardless of lastActivityAt
      const newStatus = updateUserPresence(gameCode, username, {
        isWindowFocused,
        lastActivityAt: isActive ? Date.now() : undefined,
        forceIdle: isIdle === true, // Explicit idle flag from client
      });

      console.log(`[PRESENCE] updateUserPresence returned: ${newStatus}`);

      if (newStatus) {
        // Broadcast presence update to all players in room
        console.log(`[PRESENCE] Broadcasting to room ${getGameRoom(gameCode)}:`, { username, presenceStatus: newStatus, isWindowFocused });
        broadcastToRoom(io, getGameRoom(gameCode), 'playerPresenceUpdate', {
          username,
          presenceStatus: newStatus,
          isWindowFocused
        });
      }
    });

    // Handle presence heartbeat - proves client is still connected and active
    socket.on('presenceHeartbeat', () => {
      const gameCode = getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode || !username) return;

      updateUserHeartbeat(gameCode, username);
    });

    // Handle shuffling grid broadcast from host
    socket.on('broadcastShufflingGrid', (data) => {
      if (!checkRateLimit(socket.id)) {
        emitError(socket, ErrorMessages.RATE_LIMIT_EXCEEDED);
        return;
      }
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
  const intervalMs = parseInt(process.env.TIME_UPDATE_INTERVAL_MS || '1000');

  // Store remaining time in game state for late joiners
  updateGame(gameCode, { remainingTime });

  // Clear any existing timer
  timerManager.clearGameTimer(gameCode);

  // Create interval for time updates
  const timerId = setInterval(() => {
    remainingTime -= intervalMs / 1000;

    // Update remaining time in game state for late joiners
    updateGame(gameCode, { remainingTime });

    // Broadcast time update with game state for late joiners
    const currentGame = getGame(gameCode);
    broadcastToRoom(io, getGameRoom(gameCode), 'timeUpdate', {
      remainingTime
    });

    if (remainingTime <= 0) {
      timerManager.clearGameTimer(gameCode);
      endGame(io, gameCode);
    }
  }, intervalMs);

  timerManager.setGameTimer(gameCode, timerId);

  // Broadcast that game has officially started (timer running)
  broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
    timerSeconds: remainingTime
  });
}

/**
 * End the game - NEW FLOW: No host validation, crowd-sourced word feedback
 */
function endGame(io, gameCode) {
  const game = getGame(gameCode);
  if (!game) return;

  // Stop timer
  timerManager.clearGameTimer(gameCode);

  // Update game state
  updateGame(gameCode, { gameState: 'finished' });

  // Calculate preliminary scores (dictionary words only for now)
  const scores = calculateGameScores(gameCode);

  // Broadcast end game
  broadcastToRoom(io, getGameRoom(gameCode), 'endGame', {
    scores
  });

  // Collect non-dictionary words for feedback
  const nonDictWords = collectNonDictionaryWords(game);
  const playerCount = Object.keys(game.users).length;
  const FEEDBACK_TIMEOUT_SECONDS = 10;

  console.log(`[GAME_END] Game ${gameCode} ended. ${nonDictWords.length} non-dictionary words found.`);

  // Send word feedback to each player (they vote on words they didn't submit)
  if (nonDictWords.length > 0 && playerCount > 1) {
    for (const [username, userData] of Object.entries(game.users)) {
      const wordForPlayer = getWordForPlayer(nonDictWords, username);

      if (wordForPlayer) {
        const playerSocket = getSocketById(io, userData.socketId);
        if (playerSocket) {
          safeEmit(playerSocket, 'showWordFeedback', {
            word: wordForPlayer.word,
            submittedBy: wordForPlayer.submittedBy,
            submitterAvatar: wordForPlayer.submitterAvatar,
            timeoutSeconds: FEEDBACK_TIMEOUT_SECONDS,
            gameCode,
            language: game.language || 'en'
          });
          console.log(`[FEEDBACK] Sent word "${wordForPlayer.word}" to ${username} for feedback`);
        }
      } else {
        // No eligible word for this player (they submitted all non-dict words)
        const playerSocket = getSocketById(io, userData.socketId);
        if (playerSocket) {
          safeEmit(playerSocket, 'noWordFeedback', {});
        }
      }
    }
  }

  // Set timeout for feedback phase, then calculate final scores
  const feedbackTimeoutMs = (nonDictWords.length > 0 && playerCount > 1)
    ? (FEEDBACK_TIMEOUT_SECONDS + 1) * 1000
    : 0;

  setTimeout(async () => {
    await calculateAndBroadcastFinalScores(io, gameCode);
  }, feedbackTimeoutMs);

  // Check for tournament
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (tournamentId) {
    // Record round results - convert scores object to round results format
    const roundResults = {};
    Object.keys(scores).forEach(username => {
      // Find the player's socket ID
      const playerSocketId = Object.keys(game.playerSocketIds || {}).find(
        id => game.playerSocketIds[id] === username
      );
      if (playerSocketId) {
        roundResults[playerSocketId] = {
          score: scores[username]?.totalScore || 0,
          words: (game.playerWords && game.playerWords[username]) || []
        };
      }
    });

    tournamentManager.completeTournamentRound(tournamentId, roundResults);
    const standings = tournamentManager.getTournamentStandings(tournamentId);
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

/**
 * Calculate and broadcast final scores after feedback phase
 * No host validation - just auto-validate dictionary + community-validated words
 */
async function calculateAndBroadcastFinalScores(io, gameCode) {
  const game = getGame(gameCode);
  if (!game || game.gameState !== 'finished') return;

  console.log(`[FINAL_SCORES] Calculating final scores for game ${gameCode}`);

  // Build word count map to detect duplicates across all players
  const wordCountMap = {};
  Object.values(game.playerWords || {}).forEach(words => {
    words.forEach(word => {
      wordCountMap[word] = (wordCountMap[word] || 0) + 1;
    });
  });

  // Calculate scores: dictionary words + community-validated words (6+ net votes)
  const validatedScores = {};
  const playerWordObjects = {};

  Object.keys(game.users).forEach(username => {
    const playerWords = game.playerWords?.[username] || [];
    const playerWordDetailsList = game.playerWordDetails?.[username] || [];
    let score = 0;
    const wordObjects = [];

    playerWords.forEach(word => {
      // Word is valid if: in dictionary OR community-validated (6+ net votes)
      // isDictionaryWord now includes community word check
      const isValid = isDictionaryWord(word, game.language || 'en');
      const isDuplicate = wordCountMap[word] > 1;

      // Look up score and combo bonus from word details
      const wordDetail = playerWordDetailsList.find(wd => wd.word === word);
      const comboBonus = wordDetail?.comboBonus || 0;
      const storedComboLevel = wordDetail?.comboLevel || 0;
      const wordScore = isValid ? (wordDetail?.score || calculateWordScore(word, storedComboLevel)) : 0;

      // Only add to score if valid and not a duplicate
      if (isValid && !isDuplicate) {
        score += wordScore;
      }

      wordObjects.push({
        word: word,
        score: isDuplicate ? 0 : wordScore,
        comboBonus: comboBonus,
        validated: isValid,
        isDuplicate: isDuplicate
      });
    });

    validatedScores[username] = score;
    playerWordObjects[username] = wordObjects;
  });

  // Update scores
  for (const [username, score] of Object.entries(validatedScores)) {
    updatePlayerScore(gameCode, username, score, false);
  }

  // Update playerWordDetails with validation status for achievement calculation
  for (const username of Object.keys(game.users)) {
    const playerWordDetails = game.playerWordDetails?.[username] || [];
    for (const wordDetail of playerWordDetails) {
      wordDetail.validated = isDictionaryWord(wordDetail.word, game.language || 'en');
    }
  }

  // Award final achievements based on validated words
  const usernames = Object.keys(game.users);
  awardFinalAchievements(game, usernames);

  // Convert scores to array format for frontend
  const scoresArray = Object.entries(validatedScores).map(([username, score]) => {
    const allWords = playerWordObjects[username] || [];
    const validWords = allWords.filter(w => w.validated && !w.isDuplicate);
    const longestWord = validWords.length > 0
      ? validWords.reduce((longest, w) => w.word.length > longest.length ? w.word : longest, '')
      : '';

    // Get localized achievements for this player
    const playerAchievementKeys = game.playerAchievements?.[username] || [];
    const localizedAchievements = getLocalizedAchievements(game.language || 'he');
    const playerAchievements = playerAchievementKeys.map(key => localizedAchievements[key]).filter(Boolean);

    return {
      username,
      score,
      allWords,
      wordCount: allWords.length,
      validWordCount: validWords.length,
      longestWord,
      avatar: game.users?.[username]?.avatar || null,
      achievements: playerAchievements
    };
  }).sort((a, b) => b.score - a.score);

  // Calculate player titles based on performance
  const gameDuration = game.gameDuration || 180;
  const playerTitles = calculatePlayerTitles(scoresArray, game.language || 'he', gameDuration);

  // Add titles to each player's score object
  scoresArray.forEach(playerScore => {
    const titleData = playerTitles[playerScore.username];
    if (titleData) {
      playerScore.title = titleData.title;
      playerScore.titleKey = titleData.titleKey;
    }
  });

  // Broadcast final scores to everyone
  broadcastToRoom(io, getGameRoom(gameCode), 'validatedScores', {
    scores: scoresArray,
    letterGrid: game.letterGrid
  });

  // Also send validationComplete to host for backward compatibility
  const hostSocketId = game.hostSocketId;
  if (hostSocketId) {
    const hostSocket = getSocketById(io, hostSocketId);
    if (hostSocket) {
      safeEmit(hostSocket, 'validationComplete', {
        scores: scoresArray
      });
    }
  }

  // Record game results to Supabase
  await recordGameResultsToSupabase(gameCode, scoresArray, game);

  console.log(`[FINAL_SCORES] Final scores broadcast for game ${gameCode}`);
}

/**
 * Record game results to Supabase for leaderboard and stats
 * @param {string} gameCode - Game code
 * @param {array} scoresArray - Array of player scores with metadata
 * @param {object} game - Game object
 */
async function recordGameResultsToSupabase(gameCode, scoresArray, game) {
  if (!isSupabaseConfigured()) {
    console.log(`[SUPABASE] Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY), skipping stats save for game ${gameCode}`);
    return;
  }

  try {
    // Build scores with placement and additional metadata
    const scoresWithPlacement = scoresArray.map((playerScore, index) => {
      const validPlayerWords = playerScore.allWords?.filter(w => w.validated && !w.isDuplicate) || [];
      const longestWord = validPlayerWords.length > 0
        ? validPlayerWords.reduce((longest, w) => w.word.length > longest.length ? w.word : longest, '')
        : '';

      return {
        username: playerScore.username,
        score: playerScore.score,
        wordCount: validPlayerWords.length,
        longestWord,
        placement: index + 1, // 1-based placement
        achievements: game.playerAchievements?.[playerScore.username] || []
      };
    });

    // Build auth map from game users
    const userAuthMap = {};
    console.log(`[SUPABASE] Building userAuthMap from game.users:`, Object.keys(game.users || {}));
    for (const [username, userData] of Object.entries(game.users || {})) {
      // Validate userData is an object before accessing properties
      if (!userData || typeof userData !== 'object') {
        console.warn(`[SUPABASE] Skipping invalid userData for ${username}`);
        continue;
      }
      console.log(`[SUPABASE] User ${username} auth data:`, { authUserId: userData.authUserId, guestTokenHash: !!userData.guestTokenHash });
      if (userData.authUserId || userData.guestTokenHash) {
        userAuthMap[username] = {
          authUserId: userData.authUserId || null,
          guestTokenHash: userData.guestTokenHash || null
        };
      }
    }
    console.log(`[SUPABASE] Final userAuthMap:`, JSON.stringify(userAuthMap));

    // Only process if there are users with auth context
    if (Object.keys(userAuthMap).length === 0) {
      console.log(`[SUPABASE] No authenticated users in game ${gameCode}, skipping result recording`);
      return;
    }

    // Calculate time played (in seconds)
    // Use the original timer setting since that's how long the round lasted
    const timePlayed = game.timerSeconds || 180;

    // Process game results
    const { xpResults } = await processGameResults(
      gameCode,
      scoresWithPlacement,
      {
        language: game.language || 'en',
        isRanked: game.isRanked || false,
        timePlayed
      },
      userAuthMap
    ) || { xpResults: {} };

    // Emit XP events to players
    if (xpResults && Object.keys(xpResults).length > 0) {
      for (const [username, xpInfo] of Object.entries(xpResults)) {
        if (xpInfo.socketId) {
          const playerSocket = io.sockets.sockets.get(xpInfo.socketId);
          if (playerSocket) {
            // Emit XP gained event
            playerSocket.emit('xpGained', {
              xpEarned: xpInfo.xpEarned,
              xpBreakdown: xpInfo.xpBreakdown,
              newTotalXp: xpInfo.newTotalXp,
              newLevel: xpInfo.newLevel,
            });
            console.log(`[XP] Emitted xpGained to ${username}: +${xpInfo.xpEarned} XP`);

            // Emit level up event if applicable
            if (xpInfo.leveledUp) {
              playerSocket.emit('levelUp', {
                oldLevel: xpInfo.oldLevel,
                newLevel: xpInfo.newLevel,
                levelsGained: xpInfo.levelsGained,
                newTitles: xpInfo.newTitles,
              });
              console.log(`[XP] Emitted levelUp to ${username}: Level ${xpInfo.oldLevel} -> ${xpInfo.newLevel}`);
            }
          }
        }
      }
    }

    // Invalidate leaderboard cache after recording results
    await invalidateLeaderboardCaches();

    console.log(`[SUPABASE] Recorded game results for ${gameCode} - ${scoresWithPlacement.length} players`);
  } catch (error) {
    console.error(`[SUPABASE] Error recording game results for ${gameCode}:`, error);
  }
}

module.exports = { initializeSocketHandlers };
