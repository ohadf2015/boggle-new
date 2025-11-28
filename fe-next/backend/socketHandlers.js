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
  setTournamentIdForGame
} = require('./modules/gameStateManager');

const { processGameResults, isSupabaseConfigured } = require('./modules/supabaseServer');
const { invalidateLeaderboardCaches } = require('./redisClient');

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

const { validateWordOnBoard, makePositionsMap } = require('./modules/wordValidator');
const Filter = require('bad-words');

// Initialize bad words filter with exact word matching only
// The default bad-words library uses regex that causes false positives for non-Latin scripts (Hebrew, etc.)
const badWordsFilter = new Filter({ placeHolder: '*' });

// Get the list of bad words for exact matching
const badWordsList = new Set(badWordsFilter.list.map(w => w.toLowerCase()));

/**
 * Check if text contains profanity using exact word matching
 * This avoids false positives in Hebrew and other non-Latin scripts
 */
function isProfane(text) {
  if (!text) return false;
  // Split into words and check each one exactly (not substring matching)
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => badWordsList.has(word));
}

/**
 * Clean profanity from text using exact word matching
 * Only replaces exact bad words, not substrings
 */
function cleanProfanity(text) {
  if (!text) return text;
  // Split into words, replace bad words, rejoin
  return text.split(/(\s+)/).map(part => {
    // Check if this part (ignoring whitespace) is a bad word
    const lowerPart = part.toLowerCase();
    if (badWordsList.has(lowerPart)) {
      return '*'.repeat(part.length);
    }
    return part;
  }).join('');
}
const { calculateWordScore, calculateGameScores } = require('./modules/scoringEngine');
const { checkAndAwardAchievements, getPlayerAchievements, ACHIEVEMENTS } = require('./modules/achievementManager');
const { isDictionaryWord, getAvailableDictionaries, addApprovedWord, normalizeWord } = require('./dictionary');
const { incrementWordApproval } = require('./redisClient');
const gameStartCoordinator = require('./utils/gameStartCoordinator');
const timerManager = require('./utils/timerManager');
const { checkRateLimit, resetRateLimit } = require('./utils/rateLimiter');
const redisClient = require('./redisClient');
const tournamentManager = require('./modules/tournamentManager');
const { cleanupPlayerData } = require('./utils/playerCleanup');
const { emitError, ErrorMessages } = require('./utils/errorHandler');
const { inc, incPerGame, ensureGame } = require('./utils/metrics');
const { DIFFICULTIES } = require('../utils/consts');

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
      }

      console.log(`[SOCKET] Game ${gameCode} created by ${hostUsername}`);
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

      // Reset player data
      const users = getGameUsers(gameCode);
      const playerUsernames = users.map(u => u.username);

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

    socket.on('submitWord', (data) => {
      if (!checkRateLimit(socket.id, SUBMIT_WORD_WEIGHT)) {
        socket.emit('rateLimited');
        return;
      }
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

      // Validate word on board
      const isOnBoard = validateWordOnBoard(normalizedWord, game.letterGrid, game.letterPositions);
      if (!isOnBoard) {
        inc('wordNotOnBoard');
        incPerGame(gameCode, 'wordNotOnBoard');
        socket.emit('wordNotOnBoard', { word: normalizedWord });
        return;
      }

      // Add word to player's list
      addPlayerWord(gameCode, username, normalizedWord);

      // Check dictionary
      const isInDictionary = isDictionaryWord(normalizedWord, game.language);

      if (isInDictionary) {
        // Calculate score with combo multiplier
        // Clamp combo level to reasonable bounds (0-10) to prevent abuse
        const safeComboLevel = Math.max(0, Math.min(10, parseInt(comboLevel) || 0));
        const wordScore = calculateWordScore(normalizedWord, safeComboLevel);
        updatePlayerScore(gameCode, username, wordScore, true);

        inc('wordAccepted');
        incPerGame(gameCode, 'wordAccepted');
        socket.emit('wordAccepted', {
          word: normalizedWord,
          score: wordScore,
          comboLevel: safeComboLevel,
          autoValidated: true
        });

        // Check for achievements
        const achievements = checkAndAwardAchievements(gameCode, username, normalizedWord);
        if (achievements.length > 0) {
          socket.emit('liveAchievementUnlocked', { achievements });
        }
      } else {
        inc('wordNeedsValidation');
        incPerGame(gameCode, 'wordNeedsValidation');
        socket.emit('wordNeedsValidation', {
          word: normalizedWord,
          message: 'Word will be validated by host'
        });
      }

      const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '1000');
      getLeaderboardThrottled(gameCode, (leaderboard) => {
        broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', {
          leaderboard
        });
      }, lbThrottleMs);
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

      // Filter profanity (exact word matching to avoid false positives in other languages) and broadcast to room
      const cleanMessage = cleanProfanity(message.trim().substring(0, 500));
      broadcastToRoom(io, getGameRoom(gameCode), 'chatMessage', {
        username: isHostUser ? 'Host' : username,
        message: cleanMessage,
        timestamp: Date.now(),
        isHost: isHostUser
      });
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
      const validatedScores = {};
      const playerWords = game.playerWords || {};

      for (const [username, words] of Object.entries(playerWords)) {
        const uniqueWords = [...new Set(words)];
        let totalScore = 0;

        for (const word of uniqueWords) {
          if (validWords.has(word)) {
            // Calculate score using consistent scoring formula (no combo for manual validation)
            const score = calculateWordScore(word, 0);
            totalScore += score;
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

      // Convert scores to array format for frontend
      const scoresArray = Object.entries(validatedScores).map(([username, score]) => {
        const playerWordsList = game.playerWords?.[username] || [];

        // Transform word strings to objects with validation metadata
        const allWords = playerWordsList.map(word => {
          const isValid = validWords.has(word);
          const isDuplicate = wordCountMap[word] > 1;
          const wordScore = isValid ? calculateWordScore(word, 0) : 0;

          return {
            word: word,
            score: isDuplicate ? 0 : wordScore, // Duplicates get 0 points
            validated: isValid,
            isDuplicate: isDuplicate
          };
        });

        return {
          username,
          score,
          allWords,
          avatar: game.users?.[username]?.avatar || null
        };
      }).sort((a, b) => b.score - a.score);

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

        if (approvalData && approvalData.approvalCount >= 2) {
          // Word has been approved by 2+ different game sessions - promote it!
          const promoted = await addApprovedWord(normalizedWord, language);
          if (promoted) {
            console.log(`[SOCKET] Word "${word}" (${language}) promoted to community dictionary after ${approvalData.approvalCount} approvals from games: ${approvalData.gameIds.join(', ')}`);
          }
        } else if (approvalData) {
          console.log(`[SOCKET] Word "${word}" (${language}) approved in game ${gameCode} (${approvalData.approvalCount}/2 approvals needed)`);
        }
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
        const newTable = generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, tournament.settings.language);
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

  // Check if there are any non-auto-validated words that need host review
  const hasNonAutoValidatedWords = allPlayerWords.some(player =>
    player.words.some(w => !w.autoValidated)
  );

  // Send validation data to host
  const hostSocketId = game.hostSocketId;
  if (hostSocketId) {
    const hostSocket = getSocketById(io, hostSocketId);
    if (hostSocket) {
      safeEmit(hostSocket, 'showValidation', {
        playerWords: allPlayerWords,
        autoValidatedCount,
        totalWords: uniqueWords.size,
        skipValidation: !hasNonAutoValidatedWords  // Skip validation screen if all words are auto-validated
      });

      console.log(`[SOCKET] Sent showValidation to host for game ${gameCode} - ${uniqueWords.size} unique words, ${autoValidatedCount} auto-validated, skipValidation: ${!hasNonAutoValidatedWords}`);
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

      // Build word count map to detect duplicates across all players
      const wordCountMap = {};
      Object.values(currentGame.playerWords || {}).forEach(words => {
        words.forEach(word => {
          wordCountMap[word] = (wordCountMap[word] || 0) + 1;
        });
      });

      // Auto-validate dictionary words, mark others as invalid
      const validatedScores = {};
      const playerWordObjects = {}; // Store formatted word objects for each player

      Object.keys(currentGame.users).forEach(username => {
        const playerWords = currentGame.playerWords?.[username] || [];
        let score = 0;
        const wordObjects = [];

        playerWords.forEach(word => {
          const isValid = isDictionaryWord(word, currentGame.language || 'en');
          const isDuplicate = wordCountMap[word] > 1;
          const wordScore = isValid ? calculateWordScore(word) : 0;

          // Only add to score if valid and not a duplicate
          if (isValid && !isDuplicate) {
            score += wordScore;
          }

          wordObjects.push({
            word: word,
            score: isDuplicate ? 0 : wordScore,
            validated: isValid,
            isDuplicate: isDuplicate
          });
        });

        validatedScores[username] = score;
        playerWordObjects[username] = wordObjects;
      });

      // Update scores and broadcast
      for (const [username, score] of Object.entries(validatedScores)) {
        updatePlayerScore(gameCode, username, score, false);
      }

      // Convert scores to array format for frontend with properly formatted word objects
      const scoresArray = Object.entries(validatedScores).map(([username, score]) => {
        const allWords = playerWordObjects[username] || [];
        const validWords = allWords.filter(w => w.validated && !w.isDuplicate);
        const longestWord = validWords.length > 0
          ? validWords.reduce((longest, w) => w.word.length > longest.length ? w.word : longest, '')
          : '';

        return {
          username,
          score,
          allWords,
          wordCount: allWords.length,
          validWordCount: validWords.length,
          longestWord,
          avatar: currentGame.users?.[username]?.avatar || null
        };
      }).sort((a, b) => b.score - a.score);

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

      // Record game results to Supabase for leaderboard/stats (auto-validation case)
      recordGameResultsToSupabase(gameCode, scoresArray, currentGame);
    }
  }, timeoutDuration);

  // Store timeout so it can be cleared if manual validation occurs
  game.validationTimeout = validationTimeout;

  // Check for tournament
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
 * Record game results to Supabase for leaderboard and stats
 * @param {string} gameCode - Game code
 * @param {array} scoresArray - Array of player scores with metadata
 * @param {object} game - Game object
 */
async function recordGameResultsToSupabase(gameCode, scoresArray, game) {
  if (!isSupabaseConfigured()) {
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

    // Process game results
    await processGameResults(
      gameCode,
      scoresWithPlacement,
      {
        language: game.language || 'en',
        isRanked: game.isRanked || false
      },
      userAuthMap
    );

    // Invalidate leaderboard cache after recording results
    await invalidateLeaderboardCaches();

    console.log(`[SUPABASE] Recorded game results for ${gameCode} - ${scoresWithPlacement.length} players`);
  } catch (error) {
    console.error(`[SUPABASE] Error recording game results for ${gameCode}:`, error);
  }
}

module.exports = { initializeSocketHandlers };
