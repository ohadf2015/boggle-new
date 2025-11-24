const { saveGameState, deleteGameState } = require('./redisClient');
const dictionary = require('./dictionary');
const { isWordOnBoard } = require('./modules/wordValidator');
const { calculateWordScore } = require('./modules/scoringEngine');
const { ACHIEVEMENTS, checkLiveAchievements, awardFinalAchievements, getLocalizedAchievements } = require('./modules/achievementManager');
const { games, gameWs, wsUsername, getActiveRooms, getGame, getUsernameFromWs, getWsHostFromGameCode, getWsFromUsername, getGameCodeFromUsername, deleteGame: deleteGameFromState } = require('./modules/gameStateManager');
const { safeSend, broadcast } = require('./utils/websocketHelpers');

// Avatar generation
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

const generateRandomAvatar = () => {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
  };
};

// Generate a unique player ID
const generatePlayerId = () => {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Comprehensive cleanup function to prevent memory leaks
const cleanupGameTimers = (gameCode) => {
  if (!games[gameCode]) {
    return;
  }

  const game = games[gameCode];

  console.log(`[CLEANUP] Cleaning up game ${gameCode} timers and references`);

  // Clear game timer interval
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }

  // Clear validation timeout
  if (game.validationTimeout) {
    clearTimeout(game.validationTimeout);
    game.validationTimeout = null;
  }

  // Clear host disconnect timeout
  if (game.hostDisconnectTimeout) {
    clearTimeout(game.hostDisconnectTimeout);
    game.hostDisconnectTimeout = null;
  }

  // Clear all player disconnect timeouts
  if (game.disconnectedPlayers) {
    Object.values(game.disconnectedPlayers).forEach(player => {
      if (player.timeout) {
        clearTimeout(player.timeout);
      }
    });
    game.disconnectedPlayers = {};
  }

  // Clear empty room timeout
  if (game.emptyRoomTimeout) {
    clearTimeout(game.emptyRoomTimeout);
    game.emptyRoomTimeout = null;
  }

  // MEMORY LEAK FIX: Clean up WebSocket references from Maps
  // Remove host WebSocket from Maps
  if (game.host) {
    gameWs.delete(game.host);
    wsUsername.delete(game.host);
  }

  // Remove all player WebSockets from Maps
  if (game.users) {
    Object.values(game.users).forEach(ws => {
      if (ws) {
        gameWs.delete(ws);
        wsUsername.delete(ws);
      }
    });
  }

  console.log(`[CLEANUP] Game ${gameCode} cleanup complete`);
};

const setNewGame = async (gameCode, host, roomName, language = 'en', hostUsername = null) => {
    // SECURITY: Validate and sanitize inputs
    if (!gameCode || typeof gameCode !== 'string' || !/^\d{4}$/.test(gameCode)) {
        console.warn(`[CREATE] Invalid game code format: ${gameCode}`);
        safeSend(host, { action: "error", message: "Invalid game code format" });
        return;
    }

    const finalHostUsername = sanitizeInput(hostUsername || 'Host', 20);
    const finalRoomName = sanitizeInput(roomName || finalHostUsername, 50);
    const hostPlayerId = generatePlayerId(); // Generate unique ID for host
    console.log(`[CREATE] Creating game - gameCode: ${gameCode}, hostUsername: ${finalHostUsername}, hostId: ${hostPlayerId}, roomName: ${finalRoomName}, language: ${language}`);

    const existingGame = getGame(gameCode);

    if (!existingGame) {
        // Generate avatar for host
        const hostAvatar = generateRandomAvatar();

        // Create new game with host as a player
        games[gameCode] = {
            host,
            hostUsername: finalHostUsername,
            hostPlayerId, // Store host's unique player ID
            roomName: finalRoomName,
            users: {
                [finalHostUsername]: host  // Add host as a player
            },
            playerScores: {
                [finalHostUsername]: 0
            },
            playerWords: {
                [finalHostUsername]: []
            },
            playerAchievements: {
                [finalHostUsername]: []
            },
            playerWordDetails: {
                [finalHostUsername]: []
            },
            playerAvatars: {
                [finalHostUsername]: hostAvatar
            },
            playerIds: {
                [finalHostUsername]: hostPlayerId // Map username to player ID
            },
            firstWordFound: false,
            gameState: 'waiting',
            startTime: null,
            letterGrid: null,
            language: language,
        };

        gameWs.set(host, gameCode);
        wsUsername.set(host, finalHostUsername); // Use actual username instead of __HOST__
        console.log(`[CREATE] Game ${gameCode} ("${finalRoomName}") created with host ${finalHostUsername}`);

        // Save game state to Redis (non-blocking but logged)
        saveGameState(gameCode, games[gameCode]).catch(err =>
          console.error('[REDIS] Error saving game state:', err)
        );

        host.send(JSON.stringify({
            action: "joined",
            isHost: true,
            language: language,
            username: finalHostUsername,
            playerId: hostPlayerId, // Send player ID to client
            avatar: hostAvatar
        }));

        // Send initial user list (just the host for now)
        const playerList = Object.keys(existingGame?.users || games[gameCode].users).map(username => ({
            username,
            avatar: games[gameCode].playerAvatars[username],
            isHost: username === finalHostUsername
        }));
        host.send(JSON.stringify({
            action: "updateUsers",
            users: playerList,
            hostUsername: finalHostUsername
        }));
    } else if (existingGame.hostDisconnected) {
        // Host is reconnecting - update the WebSocket and clear disconnect timeout
        console.log(`[CREATE] Host reconnecting to game ${gameCode}`);

        // Clear the disconnect timeout
        if (existingGame.hostDisconnectTimeout) {
            clearTimeout(existingGame.hostDisconnectTimeout);
            existingGame.hostDisconnectTimeout = null;
        }

        // Update host WebSocket reference
        existingGame.host = host;
        existingGame.hostDisconnected = false;

        // Update mappings
        gameWs.set(host, gameCode);
        wsUsername.set(host, existingGame.hostUsername);

        console.log(`[CREATE] Host reconnected to game ${gameCode}`);
        host.send(JSON.stringify({
            action: "joined",
            isHost: true,
            language: existingGame.language,
            username: existingGame.hostUsername,
            playerId: existingGame.hostPlayerId || existingGame.playerIds?.[existingGame.hostUsername], // Send existing player ID
            avatar: existingGame.playerAvatars[existingGame.hostUsername]
        }));

        // Send current user list with avatar info
        const playerList = Object.keys(existingGame.users).map(username => ({
            username,
            avatar: existingGame.playerAvatars[username],
            isHost: username === existingGame.hostUsername
        }));
        host.send(JSON.stringify({
            action: "updateUsers",
            users: playerList,
            hostUsername: existingGame.hostUsername
        }));
    } else {
        // Game already exists but host is not marked as disconnected
        // This can happen if the host's WebSocket reconnected quickly
        // Check if this is actually the host trying to reconnect
        console.log(`[CREATE] Game ${gameCode} already exists (not a reconnect), checking if this is the host...`);

        // If this WebSocket is from the host, update the mapping
        if (existingGame.hostUsername === finalHostUsername) {
            console.log(`[CREATE] Detected host ${finalHostUsername} attempting to reconnect with existing game`);

            // Update host WebSocket reference and mappings
            existingGame.host = host;
            gameWs.set(host, gameCode);
            wsUsername.set(host, existingGame.hostUsername);

            host.send(JSON.stringify({
                action: "joined",
                isHost: true,
                language: existingGame.language,
                username: existingGame.hostUsername,
                playerId: existingGame.hostPlayerId || existingGame.playerIds?.[existingGame.hostUsername],
                avatar: existingGame.playerAvatars[existingGame.hostUsername]
            }));

            // Send current user list
            const playerList = Object.keys(existingGame.users).map(username => ({
                username,
                avatar: existingGame.playerAvatars[username],
                isHost: username === existingGame.hostUsername
            }));
            host.send(JSON.stringify({
                action: "updateUsers",
                users: playerList,
                hostUsername: existingGame.hostUsername
            }));

            // Re-add host to users if they're not there
            if (!existingGame.users[existingGame.hostUsername]) {
                existingGame.users[existingGame.hostUsername] = host;
            }

            return;
        }

        // Not the host, game truly already exists
        host.send(JSON.stringify({ action: "gameExists" }));
        return;
    }
}

const addUserToGame = async (gameCode, username, ws) => {
    // SECURITY: Validate and sanitize inputs
    if (!gameCode || typeof gameCode !== 'string' || !/^\d{4}$/.test(gameCode)) {
        console.warn(`[JOIN] Invalid game code format: ${gameCode}`);
        safeSend(ws, { action: "error", message: "Invalid game code format" });
        return;
    }

    if (!username || typeof username !== 'string' || username.length > 20) {
        console.warn(`[JOIN] Invalid username: ${username}`);
        safeSend(ws, { action: "error", message: "Invalid username" });
        return;
    }

    // Sanitize username for security
    username = sanitizeInput(username, 20);

    if(!getGame(gameCode)) {
      console.log(`[JOIN] Game ${gameCode} does not exist`);
      ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
      return;
    }

    const game = games[gameCode];

    // Check if this username exists in the disconnected players list (reconnection)
    if(game.disconnectedPlayers && game.disconnectedPlayers[username]) {
      // Clear the disconnect timeout
      if (game.disconnectedPlayers[username].timeout) {
        clearTimeout(game.disconnectedPlayers[username].timeout);
      }

      // Re-add user to active users
      game.users[username] = ws;
      gameWs.set(ws, gameCode);
      wsUsername.set(ws, username);

      // Remove from disconnected players
      delete game.disconnectedPlayers[username];

      console.log(`[JOIN] Player ${username} reconnected to game ${gameCode}`);
    } else if(game.users[username]) {
      // Username exists in active users - truly taken by someone else
      ws.send(JSON.stringify({ action: "usernameTaken" }));
      return;
    } else {
      console.log(`[JOIN] User ${username} joined game ${gameCode}`);

      // Generate avatar and player ID for new player (or reuse existing if available)
      const playerAvatar = game.playerAvatars[username] || generateRandomAvatar();
      const playerId = game.playerIds?.[username] || generatePlayerId();

      // New player joining
      game.users[username] = ws;
      game.playerScores[username] = 0;
      game.playerWords[username] = [];
      game.playerAchievements[username] = [];
      game.playerWordDetails[username] = [];
      game.playerAvatars[username] = playerAvatar;

      // Initialize playerIds map if it doesn't exist (for backward compatibility)
      if (!game.playerIds) {
        game.playerIds = {};
      }
      game.playerIds[username] = playerId;

      gameWs.set(ws, gameCode);
      wsUsername.set(ws, username);
    }

    // Check if this player is joining an empty room (should become host)
    const activeUsers = Object.keys(game.users);
    const isNowHost = activeUsers.length === 1 && activeUsers[0] === username;

    if (isNowHost && game.hostUsername !== username) {
      console.log(`[JOIN] Player ${username} is joining empty room ${gameCode}, promoting to host`);
      game.host = ws;
      game.hostUsername = username;
      game.hostPlayerId = game.playerIds[username];

      // Save the host promotion to Redis immediately
      saveGameState(gameCode, games[gameCode]).catch(err =>
        console.error('[REDIS] Error saving host promotion:', err)
      );
    }

    // Send confirmation to the player who just joined
    ws.send(JSON.stringify({
        action: "joined",
        isHost: isNowHost,
        username: username,
        playerId: game.playerIds[username], // Send unique player ID
        avatar: game.playerAvatars[username]
    }));

    // Sync the current game state to the player
    if (game.gameState === 'playing') {
      // Game is active - send current state
      const remainingTime = Math.max(0, Math.floor((game.endTime - Date.now()) / 1000));
      ws.send(JSON.stringify({
        action: "startGame",
        letterGrid: game.letterGrid,
        timerSeconds: remainingTime,
        language: game.language,
        isLateJoin: true
      }));

      // Send current remaining time
      ws.send(JSON.stringify({
        action: "timeUpdate",
        remainingTime: remainingTime
      }));

      // Notify host about late join
      sendHostAMessage(gameCode, {
        action: "playerJoinedLate",
        username: username,
        remainingTime: remainingTime
      });

      console.log(`Late join: ${username} joined active game ${gameCode} with ${remainingTime}s remaining`);
    } else if (game.gameState === 'ended') {
      // Game has ended - send end game state
      ws.send(JSON.stringify({ action: "endGame" }));
      ws.send(JSON.stringify({ action: "timeUpdate", remainingTime: 0 }));
      console.log(`Player ${username} rejoined after game ended in ${gameCode}`);
    } else if (game.gameState === 'waiting') {
      // Game is waiting - send waiting state
      console.log(`Player ${username} joined game ${gameCode} in waiting state`);
    }

    // Clear empty room timeout if it exists (room is no longer empty)
    if (game.emptyRoomTimeout) {
      console.log(`[JOIN] Clearing empty room timeout for game ${gameCode}`);
      clearTimeout(game.emptyRoomTimeout);
      game.emptyRoomTimeout = null;
    }

    // Broadcast updated user list with avatar info
    const playerList = Object.keys(game.users).map(username => ({
        username,
        avatar: game.playerAvatars[username],
        isHost: username === game.hostUsername
    }));
    broadcastPlayerList(gameCode);
    broadcastLeaderboard(gameCode);

    // Save updated game state to Redis
    saveGameState(gameCode, games[gameCode]).catch(err =>
      console.error('[REDIS] Error saving game state:', err)
    );
}

const handleStartGame = async (host, letterGrid, timerSeconds, language) => {
  const gameCode = gameWs.get(host);

  if (!gameCode || !games[gameCode]) {
    console.error(`[START_GAME] Invalid game - gameCode: ${gameCode}`);
    return;
  }

  console.log(`[START_GAME] Starting game ${gameCode}`);

  games[gameCode].gameState = 'playing';
  games[gameCode].startTime = Date.now();
  games[gameCode].endTime = Date.now() + (timerSeconds * 1000);
  games[gameCode].letterGrid = letterGrid;
  games[gameCode].firstWordFound = false;
  games[gameCode].timerSeconds = timerSeconds;
  if (language) {
    games[gameCode].language = language;
  }

  // Reset all player scores, words, and achievements
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
    games[gameCode].playerAchievements[username] = [];
    games[gameCode].playerWordDetails[username] = [];
  });

  const startMessage = { action: "startGame", letterGrid, timerSeconds, language: games[gameCode].language };
  sendAllPlayerAMessage(gameCode, startMessage);
  broadcastLeaderboard(gameCode);

  // Start server-side timer with broadcasts every second
  startServerTimer(gameCode, timerSeconds);
}

// Server-side timer that broadcasts remaining time to all clients
const startServerTimer = (gameCode, totalSeconds) => {
  // RACE CONDITION FIX: Safety check before accessing game
  if (!games[gameCode]) {
    console.warn(`[TIMER] Cannot start timer for non-existent game ${gameCode}`);
    return;
  }

  // Clear any existing timer to prevent multiple timers
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
    games[gameCode].timerInterval = null;
  }

  const intervalId = setInterval(() => {
    // RACE CONDITION FIX: Check if game still exists at the start of each tick
    if (!games[gameCode]) {
      console.warn(`[TIMER] Game ${gameCode} no longer exists, stopping timer`);
      // Clear the interval to prevent memory leak
      clearInterval(intervalId);
      return;
    }

    if (games[gameCode].gameState !== 'playing') {
      console.log(`[TIMER] Game ${gameCode} is no longer playing, stopping timer`);
      clearInterval(games[gameCode].timerInterval);
      games[gameCode].timerInterval = null;
      return;
    }

    const now = Date.now();
    const remainingMs = games[gameCode].endTime - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    // Broadcast time update to all players and host
    const timeUpdate = {
      action: "timeUpdate",
      remainingTime: remainingSeconds
    };

    sendAllPlayerAMessage(gameCode, timeUpdate);
    sendHostAMessage(gameCode, timeUpdate);

    // Auto end game when time runs out
    if (remainingSeconds <= 0) {
      console.log(`[TIMER] Time expired for game ${gameCode}, ending game`);
      // Store interval reference before clearing
      const intervalId = games[gameCode].timerInterval;
      games[gameCode].timerInterval = null;
      clearInterval(intervalId);

      // RACE CONDITION FIX: Check host still exists before calling handleEndGame
      if (games[gameCode].host) {
        handleEndGame(games[gameCode].host);
      } else {
        console.warn(`[TIMER] No host found for game ${gameCode}, cannot end game`);
      }
    }
  }, 1000); // Broadcast every second

  // Store the interval reference
  games[gameCode].timerInterval = intervalId;
}

const handleEndGame = (host) => {
  const gameCode = gameWs.get(host);

  // Safety check: ensure game still exists
  if (!games[gameCode]) {
    console.warn(`[END_GAME] Game ${gameCode} no longer exists, skipping end game`);
    return;
  }

  games[gameCode].gameState = 'ended';

  // Clear the timer interval
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
    games[gameCode].timerInterval = null;
  }

  // Calculate final scores with detailed stats
  const gameLanguage = games[gameCode].language || 'he';
  const localizedAchievements = getLocalizedAchievements(gameLanguage);

  const finalScores = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    words: games[gameCode].playerWords[username],
    wordCount: (games[gameCode].playerWordDetails[username] || []).length,
    achievements: games[gameCode].playerAchievements[username].map(ach => localizedAchievements[ach]),
    longestWord: games[gameCode].playerWords[username].reduce((longest, word) =>
      word.length > longest.length ? word : longest, ''),
  })).sort((a, b) => b.score - a.score);

  // Auto-validate words using dictionary
  const wordsNeedingValidation = new Set();
  let autoValidatedCount = 0;

  // Collect all unique words and validate them against the dictionary
  const uniqueWords = new Set();
  Object.keys(games[gameCode].users).forEach(username => {
    if (games[gameCode].playerWordDetails[username]) {
      games[gameCode].playerWordDetails[username].forEach(wordDetail => {
        uniqueWords.add(wordDetail.word);
      });
    }
  });

  // Validate each unique word against the dictionary
  uniqueWords.forEach(word => {
    const isValidInDictionary = dictionary.isValidWord(word, gameLanguage);

    if (isValidInDictionary === true) {
      // Word found in dictionary - auto-validate as true
      autoValidatedCount++;
      // Mark the word as auto-validated in all players' word details
      Object.keys(games[gameCode].users).forEach(username => {
        if (games[gameCode].playerWordDetails[username]) {
          const wordDetail = games[gameCode].playerWordDetails[username].find(w => w.word === word);
          if (wordDetail) {
            wordDetail.autoValidated = true;
            wordDetail.inDictionary = true;
          }
        }
      });
    } else if (isValidInDictionary === false) {
      // Word NOT in dictionary - mark for host validation
      wordsNeedingValidation.add(word);
      Object.keys(games[gameCode].users).forEach(username => {
        if (games[gameCode].playerWordDetails[username]) {
          const wordDetail = games[gameCode].playerWordDetails[username].find(w => w.word === word);
          if (wordDetail) {
            wordDetail.inDictionary = false;
          }
        }
      });
    } else {
      // Dictionary not loaded or word couldn't be validated - send to host
      wordsNeedingValidation.add(word);
    }
  });

  // Send all words to host for validation (only words not in dictionary)
  const allPlayerWords = Object.keys(games[gameCode].users).map(username => ({
    username,
    words: games[gameCode].playerWordDetails[username]
  }));

  // Send final time update to ensure all clients show 0:00
  sendAllPlayerAMessage(gameCode, {
    action: "timeUpdate",
    remainingTime: 0
  });

  sendAllPlayerAMessage(gameCode, { action: "endGame" });
  // finalScores will be sent after validation is complete

  // Send validation interface data to host
  sendHostAMessage(gameCode, {
    action: "showValidation",
    playerWords: allPlayerWords,
    autoValidatedCount,
    totalWords: uniqueWords.size
  });

  // Log dictionary validation stats
  console.log(`[Dictionary] Auto-validated ${autoValidatedCount} words, ${wordsNeedingValidation.size} words need host validation`);

  // Start auto-validation timeout in case host is AFK (15 seconds)
  games[gameCode].validationTimeout = setTimeout(() => {
    // Check if game still exists and hasn't been validated yet
    if (games[gameCode] && games[gameCode].gameState === 'ended') {
      console.log(`[AUTO_VALIDATION] Host AFK for game ${gameCode}, auto-validating dictionary words only`);

      // Auto-validate only words that were found in the dictionary
      const autoValidations = [];
      const processedWords = new Set();

      Object.keys(games[gameCode].users).forEach(username => {
        if (games[gameCode].playerWordDetails[username]) {
          games[gameCode].playerWordDetails[username].forEach(wordDetail => {
            // Only validate words that were auto-validated (in dictionary)
            if (wordDetail.autoValidated && !processedWords.has(wordDetail.word)) {
              autoValidations.push({ word: wordDetail.word, isValid: true });
              processedWords.add(wordDetail.word);
            } else if (!wordDetail.autoValidated && !processedWords.has(wordDetail.word)) {
              // Words not in dictionary are marked as invalid
              autoValidations.push({ word: wordDetail.word, isValid: false });
              processedWords.add(wordDetail.word);
            }
          });
        }
      });

      // Call the validation handler
      handleValidateWords(games[gameCode].host, autoValidations, games[gameCode].letterGrid);

      // Notify host that auto-validation occurred
      sendHostAMessage(gameCode, {
        action: "autoValidationOccurred",
        message: "Auto-validation completed due to inactivity"
      });
    }
  }, 15000); // 15 seconds
}

const handleSendAnswer = (ws, foundWords) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);
  const wsHost = getWsHostFromGameCode(gameCode);
  sendHostAMessage(gameCode, { action: "updateScores", username, foundWords });
}

// Check and award LIVE achievements during gameplay - using module
const checkAndBroadcastLiveAchievements = (gameCode, username, word, timeSinceStart) => {
  const game = games[gameCode];
  const newAchievements = checkLiveAchievements(game, username, word, timeSinceStart);

  // Broadcast new achievements to the player who unlocked them
  if (newAchievements.length > 0) {
    const playerWs = game.users[username];
    if (playerWs && playerWs.readyState === 1) { // Check connection is open
      try {
        playerWs.send(JSON.stringify({
          action: "liveAchievementUnlocked",
          achievements: newAchievements
        }));
      } catch (error) {
        console.error(`Error sending achievements to ${username}:`, error);
      }
    }
  }
};

// Input validation and sanitization helper
const sanitizeInput = (input, maxLength = 100) => {
  if (typeof input !== 'string') return '';
  // Remove any potential XSS characters and limit length
  return input.trim().slice(0, maxLength).replace(/[<>'"]/g, '');
};

// New function: Handle real-time word submission with board validation
const handleWordSubmission = (ws, word) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);

  if (!games[gameCode]) {
    console.warn(`Invalid game code for word submission: ${gameCode}`);
    return;
  }

  // SECURITY: Validate word length to prevent DoS attacks
  if (!word || typeof word !== 'string' || word.length > 50) {
    console.warn(`Invalid word length from ${username}: ${word?.length || 0} characters`);
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({
          action: "error",
          message: "Invalid word format"
        }));
      } catch (error) {
        console.error("Error sending validation error:", error);
      }
    }
    return;
  }

  // Sanitize the word to prevent XSS
  word = sanitizeInput(word, 50);

  // If game is not in 'playing' state, sync the client with current state
  if (games[gameCode].gameState !== 'playing') {
    console.warn(`Player ${username} tried to submit word during game state: ${games[gameCode].gameState}`);

    // If game has ended, notify the player
    if (games[gameCode].gameState === 'ended') {
      if (ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({ action: "endGame" }));
          ws.send(JSON.stringify({ action: "timeUpdate", remainingTime: 0 }));
        } catch (error) {
          console.error("Error syncing game end state:", error);
        }
      }
    }
    return;
  }

  // Safety check: ensure player exists in game
  if (!games[gameCode].playerWords[username] || !games[gameCode].playerWordDetails[username]) {
    console.error(`Player ${username} data missing in game ${gameCode}`);
    return;
  }

  // Check if word was already found by this player
  if (games[gameCode].playerWords[username].includes(word)) {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({ action: "wordAlreadyFound", word }));
      } catch (error) {
        console.error("Error sending wordAlreadyFound:", error);
      }
    }
    return;
  }

  // VALIDATE WORD AGAINST THE BOARD
  const letterGrid = games[gameCode].letterGrid;
  const isValidOnBoard = isWordOnBoard(word, letterGrid);

  if (!isValidOnBoard) {
    // Word doesn't exist on the board - reject it
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({
          action: "wordNotOnBoard",
          word,
          message: "המילה לא נמצאת על הלוח"
        }));
      } catch (error) {
        console.error("Error sending wordNotOnBoard:", error);
      }
    }
    return;
  }

  const currentTime = Date.now();
  const timeSinceStart = (currentTime - games[gameCode].startTime) / 1000; // in seconds

  // Store the word (it passed board validation)
  games[gameCode].playerWords[username].push(word);
  games[gameCode].playerWordDetails[username].push({
    word,
    score: 0, // Will be calculated after validation
    timestamp: currentTime,
    timeSinceStart,
    validated: null, // Will be set by host later (for dictionary/semantic validation)
    onBoard: true, // Passed board validation
  });

  // Send confirmation to player (no score yet)
  if (ws && ws.readyState === 1) { // Check connection is open
    try {
      ws.send(JSON.stringify({
        action: "wordAccepted",
        word,
      }));
    } catch (error) {
      console.error(`Error confirming word to ${username}:`, error);
    }
  }

  // Send general notification to host (without showing the actual word)
  const wordCount = games[gameCode].playerWords[username].length;
  const hostWs = games[gameCode].host;
  if (hostWs && hostWs.readyState === 1) {
    try {
      hostWs.send(JSON.stringify({
        action: "playerFoundWord",
        username,
        wordCount
      }));
    } catch (error) {
      console.error(`Error notifying host:`, error);
    }
  }

  // Check for live achievements
  checkAndBroadcastLiveAchievements(gameCode, username, word, timeSinceStart);

  // Update leaderboard for everyone
  broadcastLeaderboard(gameCode);
}

// Broadcast player list with avatars and host info
const broadcastPlayerList = (gameCode) => {
  if (!games[gameCode]) return;

  const game = games[gameCode];
  const playerList = Object.keys(game.users).map(username => ({
    username,
    avatar: game.playerAvatars[username],
    isHost: username === game.hostUsername
  }));

  const message = {
    action: "updateUsers",
    users: playerList,
    hostUsername: game.hostUsername
  };

  // Send to all players (including host since host is now a player)
  sendAllPlayerAMessage(gameCode, message);
};

// Broadcast live leaderboard (word count only during game, scores after validation)
const broadcastLeaderboard = (gameCode) => {
  if (!games[gameCode]) return;

  // Show all players in leaderboard (including host)
  const leaderboard = Object.keys(games[gameCode].playerScores)
    .map(username => ({
      username,
      score: games[gameCode].playerScores[username],
      wordCount: games[gameCode].playerWords[username] ? games[gameCode].playerWords[username].length : 0
    }))
    .sort((a, b) => b.wordCount - a.wordCount); // Sort by word count during game

  sendAllPlayerAMessage(gameCode, { action: "updateLeaderboard", leaderboard });
}

const sendAllPlayerAMessage = (gameCode, message) => {
  if (!games[gameCode]) {
    console.warn(`[BROADCAST] No game found for ${gameCode}`);
    return;
  }

  const game = games[gameCode];
  if (Object.keys(game.users).length === 0) {
    return; // No players to send to
  }

  // Use broadcast helper for efficient sending
  broadcast(game.users, message, `BROADCAST-${gameCode}`);
}

const sendHostAMessage = (gameCode, message) => {
  if (!games[gameCode]) {
    console.warn(`[HOST_MSG] No game found for ${gameCode}`);
    return;
  }

  const host = games[gameCode].host;
  if (!host) {
    console.warn(`[HOST_MSG] No host found for game ${gameCode}`);
    return;
  }

  // Use safeSend helper
  safeSend(host, message, `host-${gameCode}`);
}


// Cleanup when a connection closes
const handleDisconnect = (ws, wss) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);

  // Only log if there's actual game data to clean up
  if (gameCode || username) {
    console.log(`[DISCONNECT] ws disconnected - gameCode: ${gameCode}, username: ${username}`);
  }

  if (gameCode && games[gameCode]) {
    const game = games[gameCode];
    const isHost = game.host === ws;

    // Check if this was the host
    if (isHost) {
      console.log(`[DISCONNECT] Host ${username} disconnected from game ${gameCode}`);

      // Remove host from active users immediately
      delete game.users[username];

      // Get remaining players (excluding the disconnected host)
      const remainingPlayers = Object.keys(game.users);

      if (remainingPlayers.length === 0) {
        // No players left, close room immediately
        console.log(`[DISCONNECT] No players left in game ${gameCode}, closing room immediately`);

        // Clear any existing empty room timeout
        if (game.emptyRoomTimeout) {
          clearTimeout(game.emptyRoomTimeout);
        }

        // Close the room immediately
        console.log(`[AUTO-CLOSE] Closing empty room ${gameCode}`);
        cleanupGameTimers(gameCode);
        delete games[gameCode];

        // Delete from Redis
        deleteGameState(gameCode).catch(err =>
          console.error('[REDIS] Error deleting game state:', err)
        );

        // Broadcast updated rooms list
        if (wss) broadcastActiveRooms(wss);
      } else {
        // There are remaining players, start grace period
        console.log(`[DISCONNECT] ${remainingPlayers.length} player(s) remaining, starting grace period`);

        // Store the host in disconnected players
        if (!game.disconnectedPlayers) {
          game.disconnectedPlayers = {};
        }

        // Mark host as disconnected
        game.hostDisconnected = true;
        game.disconnectedPlayers[username] = {
          disconnectedAt: Date.now(),
          isHost: true,
          timeout: setTimeout(() => {
            // Only transfer/close if game still exists and host hasn't reconnected
            if (games[gameCode] && games[gameCode].hostDisconnected) {
              console.log(`[DISCONNECT] Host reconnect grace period expired for game ${gameCode}`);

              // Remove from disconnected players
              delete games[gameCode].disconnectedPlayers[username];

              // Get remaining players (excluding the disconnected host)
              const remainingPlayers = Object.keys(games[gameCode].users).filter(u => u !== username);

              if (remainingPlayers.length > 0) {
                // Transfer host to the first remaining player
                const newHostUsername = remainingPlayers[0];
                const newHostWs = games[gameCode].users[newHostUsername];

                console.log(`[DISCONNECT] Transferring host from ${username} to ${newHostUsername}`);

                games[gameCode].host = newHostWs;
                games[gameCode].hostUsername = newHostUsername;
                games[gameCode].hostDisconnected = false;
                games[gameCode].hostDisconnectTimeout = null;

                // Notify all players about the new host
                sendAllPlayerAMessage(gameCode, {
                  action: "hostTransferred",
                  newHost: newHostUsername,
                  message: `${newHostUsername} is now the host`
                });

                // Update player list with new host info
                broadcastPlayerList(gameCode);

                // Broadcast updated active rooms list
                if (wss) broadcastActiveRooms(wss);

                // Save to Redis
                saveGameState(gameCode, games[gameCode]).catch(err =>
                  console.error('[REDIS] Error saving game state:', err)
                );
              } else {
                // No players left, close the room
                console.log(`[DISCONNECT] No players left in game ${gameCode}, closing room`);
                cleanupGameTimers(gameCode);
                delete games[gameCode];

                // Delete from Redis
                deleteGameState(gameCode).catch(err =>
                  console.error('[REDIS] Error deleting game state:', err)
                );

                // Broadcast updated rooms list
                if (wss) broadcastActiveRooms(wss);
              }
            }
          }, 300000) // 5 minute grace period (300000ms)
        };

        // Notify remaining players
        broadcastPlayerList(gameCode);
        broadcastLeaderboard(gameCode);
      }
    } else if (username && games[gameCode].users[username]) {
      // Player disconnected - give them a grace period to reconnect (30 seconds)
      console.log(`[DISCONNECT] Player ${username} disconnected from game ${gameCode}, starting grace period`);

      // Store the player data temporarily
      if (!games[gameCode].disconnectedPlayers) {
        games[gameCode].disconnectedPlayers = {};
      }

      // Mark player as disconnected but keep them in the game
        games[gameCode].disconnectedPlayers[username] = {
        disconnectedAt: Date.now(),
        timeout: setTimeout(() => {
          // Only remove if game still exists and player hasn't reconnected
          if (games[gameCode] && games[gameCode].disconnectedPlayers?.[username]) {
            console.log(`[DISCONNECT] Player ${username} reconnect grace period expired, removing data from game ${gameCode}`);
            
            // Remove from disconnected players
            delete games[gameCode].disconnectedPlayers[username];
            
            // Data cleanup is done here (scores etc)
            if (games[gameCode].playerScores[username]) {
               delete games[gameCode].playerScores[username];
               delete games[gameCode].playerWords[username];
               delete games[gameCode].playerAchievements[username];
               delete games[gameCode].playerWordDetails[username];
               delete games[gameCode].playerAvatars[username];
            }
            
            // Broadcast updated leaderboard (to remove them from there too)
            broadcastLeaderboard(gameCode);
          }
        }, 30000) // 30 seconds grace period
      };

      // Remove from active users immediately so they disappear from the list
      delete games[gameCode].users[username];

      // Notify all players of updated user list immediately
      broadcastPlayerList(gameCode);

      // Broadcast updated leaderboard
      broadcastLeaderboard(gameCode);

      // Broadcast updated active rooms list to all clients
      if (wss) broadcastActiveRooms(wss);

      // Check if game should end (if 0 players left, or 1 player left and game is playing)
      // If 0 players, close room immediately.
      // If 1 player and playing, end game.
      const remainingPlayers = Object.keys(games[gameCode].users);
      if (remainingPlayers.length === 0) {
         console.log(`[DISCONNECT] No players left in game ${gameCode}, closing room immediately`);

         // Clear any existing empty room timeout
         if (games[gameCode].emptyRoomTimeout) {
           clearTimeout(games[gameCode].emptyRoomTimeout);
         }

         // Close the room immediately
         console.log(`[AUTO-CLOSE] Closing empty room ${gameCode}`);
         cleanupGameTimers(gameCode);
         delete games[gameCode];
         deleteGameState(gameCode).catch(e => console.error(e));
         // Broadcast updated rooms list
         if (wss) broadcastActiveRooms(wss);
      } else if (remainingPlayers.length <= 1 && games[gameCode].gameState === 'playing') {
         console.log(`[DISCONNECT] ${remainingPlayers.length} player(s) remain in game ${gameCode}, ending game automatically`);
         // Clear timer before ending game
         if (games[gameCode].timerInterval) {
           clearInterval(games[gameCode].timerInterval);
           games[gameCode].timerInterval = null;
         }
         handleEndGame(games[gameCode].host);
      }

  }
  }

  // Clean up the mappings
  gameWs.delete(ws);
  wsUsername.delete(ws);
};

// Handle word validation by host - THIS IS WHERE SCORING HAPPENS
const handleValidateWords = (host, validations, letterGrid) => {
  const gameCode = gameWs.get(host);
  if (!games[gameCode]) {
    console.error("Game not found for validation");
    return;
  }

  console.log(`Validating words for game ${gameCode}, ${validations.length} validations received`);

  // Clear auto-validation timeout since host is validating manually
  if (games[gameCode].validationTimeout) {
    clearTimeout(games[gameCode].validationTimeout);
    games[gameCode].validationTimeout = null;
  }

  // Timing-based achievements that should be preserved (not affected by validation)
  const TIMING_BASED_ACHIEVEMENTS = ['FIRST_BLOOD', 'QUICK_THINKER', 'LONG_HAULER', 'DOUBLE_TROUBLE'];

  // Reset all scores before calculating - only for existing players
  Object.keys(games[gameCode].users).forEach(username => {
    if (games[gameCode].playerScores[username] !== undefined) {
      games[gameCode].playerScores[username] = 0;
    }
    if (games[gameCode].playerAchievements[username] !== undefined) {
      // Preserve timing-based achievements, reset others
      games[gameCode].playerAchievements[username] = games[gameCode].playerAchievements[username]
        .filter(ach => TIMING_BASED_ACHIEVEMENTS.includes(ach));
    }
  });

  // First, detect duplicate words across all players
  const wordCounts = {}; // Track which words appear and how many times
  const wordsByUser = {}; // Track which user has which words

  Object.keys(games[gameCode].users).forEach(username => {
    // Safety check: ensure player word details exist
    if (!games[gameCode].playerWordDetails[username]) {
      console.warn(`Player ${username} missing word details, skipping...`);
      return;
    }

    games[gameCode].playerWordDetails[username].forEach(wordDetail => {
      const word = wordDetail.word;
      if (!wordCounts[word]) {
        wordCounts[word] = 0;
        wordsByUser[word] = [];
      }
      wordCounts[word]++;
      wordsByUser[word].push(username);
    });
  });

  // Create a map of unique words with their validation status
  // Combine auto-validated words (from dictionary) with host validations
  const wordValidationMap = {};

  // First, add auto-validated words (words found in dictionary)
  Object.keys(games[gameCode].users).forEach(username => {
    if (games[gameCode].playerWordDetails[username]) {
      games[gameCode].playerWordDetails[username].forEach(wordDetail => {
        if (wordDetail.autoValidated && !wordValidationMap[wordDetail.word]) {
          wordValidationMap[wordDetail.word] = true; // Auto-validated words are valid
        }
      });
    }
  });

  // Then, apply host validations (for words not in dictionary)
  validations.forEach(({ word, isValid }) => {
    // Host validations can override or add to the validation map
    wordValidationMap[word] = isValid;
  });

  // Apply validations to all players who have each word
  Object.keys(wordValidationMap).forEach(word => {
    const isValid = wordValidationMap[word];
    const isDuplicate = wordCounts[word] && wordCounts[word] >= 2;

    // Apply validation to all players who submitted this word
    if (wordsByUser[word]) {
      wordsByUser[word].forEach(username => {
        // Check if player still exists (may have disconnected)
        if (!games[gameCode].playerWordDetails[username]) {
          return; // Skip players who disconnected
        }

        const wordDetail = games[gameCode].playerWordDetails[username].find(w => w.word === word);
        if (wordDetail) {
          // If word is duplicate, mark as invalid for everyone
          if (isDuplicate) {
            wordDetail.validated = false;
            wordDetail.score = 0;
            wordDetail.isDuplicate = true;
          } else {
            wordDetail.validated = isValid;

            // Calculate and add score ONLY if valid and not duplicate
            if (isValid) {
              const score = calculateWordScore(word);
              wordDetail.score = score;
              // Only add score if player is still connected
              if (games[gameCode].playerScores[username] !== undefined) {
                games[gameCode].playerScores[username] += score;
              }
            } else {
              wordDetail.score = 0;
            }
          }
        }
      });
    }
  });

  // Award final achievements based on validated words - using module
  awardFinalAchievements(games[gameCode], Object.keys(games[gameCode].users));

  // Get localized achievements
  const gameLanguage = games[gameCode].language || 'he';
  const localizedAchievements = getLocalizedAchievements(gameLanguage);

  // Calculate final scores with all validated data - only for existing players
  const finalScores = Object.keys(games[gameCode].playerScores)
    .filter(username => games[gameCode].users[username]) // Only include players still in game
    .map(username => {
      // Safety checks for all data
      const playerWordDetails = games[gameCode].playerWordDetails[username] || [];
      const playerWords = games[gameCode].playerWords[username] || [];
      const playerAchievements = games[gameCode].playerAchievements[username] || [];

      return {
        username,
        score: games[gameCode].playerScores[username] || 0,
        words: playerWordDetails.filter(w => w.validated === true).map(w => w.word),
        allWords: playerWordDetails, // For visualization
        wordCount: playerWordDetails.length,
        validWordCount: playerWordDetails.filter(w => w.validated === true).length,
        achievements: playerAchievements.map(ach => localizedAchievements[ach]),
        longestWord: playerWordDetails
          .filter(w => w.validated === true)
          .reduce((longest, wordObj) => wordObj.word.length > longest.length ? wordObj.word : longest, ''),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Send validated scores with word validation visualization to all players
  sendAllPlayerAMessage(gameCode, {
    action: "validatedScores",
    scores: finalScores,
    winner: finalScores[0]?.username,
    letterGrid: games[gameCode].letterGrid // Send grid for word path visualization
  });

  sendHostAMessage(gameCode, {
    action: "validationComplete",
    scores: finalScores
  });
};

// Handle host manually closing the room
const handleCloseRoom = (host, gameCode, wss) => {
  console.log(`[CLOSE_ROOM] Host manually closing room ${gameCode}`);

  if (!games[gameCode]) {
    console.warn(`[CLOSE_ROOM] Game ${gameCode} not found`);
    return;
  }

  // Notify all players that the room is closing
  sendAllPlayerAMessage(gameCode, {
    action: "hostLeftRoomClosing",
    message: "המנחה עזב את החדר. החדר נסגר."
  });

  // Clean up all timers and timeouts
  cleanupGameTimers(gameCode);

  // Delete the game after a short delay to ensure messages are sent
  setTimeout(() => {
    if (games[gameCode]) {
      delete games[gameCode];
      console.log(`[CLOSE_ROOM] Game ${gameCode} deleted`);

      // Delete from Redis
      deleteGameState(gameCode).catch(err =>
        console.error('[REDIS] Error deleting game state:', err)
      );

      // Broadcast updated rooms list
      if (wss) broadcastActiveRooms(wss);
    }
  }, 500);
};

// Handle resetting game for a new round
const handleResetGame = async (host) => {
  const gameCode = gameWs.get(host);

  if (!gameCode || !games[gameCode]) {
    console.error(`[RESET_GAME] Invalid game - gameCode: ${gameCode}`);
    return;
  }

  console.log(`[RESET_GAME] Resetting game ${gameCode} for new round`);

  // Clean up all timers and timeouts (except host/player disconnect timeouts)
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
    games[gameCode].timerInterval = null;
  }

  if (games[gameCode].validationTimeout) {
    clearTimeout(games[gameCode].validationTimeout);
    games[gameCode].validationTimeout = null;
  }

  // Reset game state
  games[gameCode].gameState = 'waiting';
  games[gameCode].startTime = null;
  games[gameCode].endTime = null;
  games[gameCode].letterGrid = null;
  games[gameCode].firstWordFound = false;

  // Reset all player scores, words, and achievements
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
    games[gameCode].playerAchievements[username] = [];
    games[gameCode].playerWordDetails[username] = [];
  });

  // Notify all players to reset their state
  sendAllPlayerAMessage(gameCode, {
    action: "resetGame",
    message: "המארח מתחיל משחק חדש"
  });

  // Update leaderboard (will be empty)
  broadcastLeaderboard(gameCode);

  // Save updated game state to Redis
  saveGameState(gameCode, games[gameCode]).catch(err =>
    console.error('[REDIS] Error saving game state:', err)
  );

  console.log(`[RESET_GAME] Game ${gameCode} reset complete`);
};

// Export all functions
// Broadcast active rooms to all connected clients
const broadcastActiveRooms = (wss) => {
  if (!wss || !wss.clients) return;

  const rooms = getActiveRooms();
  const message = JSON.stringify({ action: 'activeRooms', rooms });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
        sentCount++;
      } catch (error) {
        console.error('[BROADCAST] Error sending active rooms:', error.message);
      }
    }
  });
};

// Handle chat messages in a room
const handleChatMessage = (ws, gameCode, username, message, isHost) => {
  if (!games[gameCode]) {
    console.warn(`[CHAT] No game found for ${gameCode}`);
    return;
  }

  // SECURITY: Validate and sanitize chat message
  if (!message || typeof message !== 'string' || message.length > 500) {
    console.warn(`[CHAT] Invalid message length from ${username}`);
    return;
  }

  const sanitizedMessage = sanitizeInput(message, 500);

  const chatMessage = {
    action: 'chatMessage',
    username: sanitizeInput(username, 20),
    message: sanitizedMessage,
    timestamp: Date.now(),
    isHost: isHost || false
  };

  // Broadcast to all players (including host, since host is now a player)
  sendAllPlayerAMessage(gameCode, chatMessage);
};

module.exports = {
  setNewGame,
  addUserToGame,
  handleStartGame,
  handleEndGame,
  handleSendAnswer,
  handleWordSubmission,
  handleValidateWords,
  getGame,
  getUsernameFromWs,
  getWsHostFromGameCode,
  getWsFromUsername,
  getGameCodeFromUsername,
  getActiveRooms,
  handleDisconnect,
  handleCloseRoom,
  handleResetGame,
  broadcastActiveRooms,
  handleChatMessage,
};
