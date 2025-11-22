const { saveGameState, deleteGameState } = require('./redisClient');
const dictionary = require('./dictionary');
const { isWordOnBoard } = require('./modules/wordValidator');
const { calculateWordScore } = require('./modules/scoringEngine');
const { ACHIEVEMENTS, checkLiveAchievements, awardFinalAchievements } = require('./modules/achievementManager');
const { games, gameWs, wsUsername, getActiveRooms, getGame, getUsernameFromWs, getWsHostFromGameCode, getWsFromUsername, getGameCodeFromUsername, deleteGame: deleteGameFromState } = require('./modules/gameStateManager');
const { safeSend, broadcast } = require('./utils/websocketHelpers');

// Comprehensive cleanup function to prevent memory leaks
const cleanupGameTimers = (gameCode) => {
  if (!games[gameCode]) {
    return;
  }

  const game = games[gameCode];

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
};

const setNewGame = async (gameCode, host, roomName, language = 'en') => {
    console.log(`[CREATE] Creating game - gameCode: ${gameCode}, roomName: ${roomName}, language: ${language}`);

    const existingGame = getGame(gameCode);

    if (!existingGame) {
        // Create new game
        games[gameCode] = {
            host,
            roomName: roomName || `Room ${gameCode}`,
            users: {},
            playerScores: {},
            playerWords: {},
            playerAchievements: {},
            playerWordDetails: {},
            firstWordFound: false,
            gameState: 'waiting',
            startTime: null,
            letterGrid: null,
            language: language,
        };

        gameWs.set(host, gameCode);
        wsUsername.set(host, '__HOST__'); // Mark as host in the username map
        console.log(`[CREATE] Game ${gameCode} ("${roomName}") created successfully. Available games:`, Object.keys(games));

        // Save game state to Redis (non-blocking but logged)
        saveGameState(gameCode, games[gameCode]).catch(err =>
          console.error('[REDIS] Error saving game state:', err)
        );

        host.send(JSON.stringify({ action: "joined", isHost: true, language: language }));
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
        wsUsername.set(host, '__HOST__'); // Mark as host in the username map

        console.log(`[CREATE] Host reconnected to game ${gameCode}`);
        host.send(JSON.stringify({ action: "joined", isHost: true, language: existingGame.language }));

        // Send current user list
        host.send(JSON.stringify({
            action: "updateUsers",
            users: Object.keys(existingGame.users)
        }));
    } else {
        console.log(`[CREATE] Game ${gameCode} already exists (not a reconnect)`);
        host.send(JSON.stringify({ action: "gameExists" }));
        return;
    }
}

const addUserToGame = async (gameCode, username, ws) => {
    console.log(`[JOIN] Attempting to join - gameCode: ${gameCode}, username: ${username}`);
    console.log(`[JOIN] Available games:`, Object.keys(games));

    if(!getGame(gameCode)) {
      console.log(`[JOIN] Game ${gameCode} does not exist`);
      ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
      return;
    }

    const game = games[gameCode];

    // Check if this username exists in the disconnected players list (reconnection)
    if(game.disconnectedPlayers && game.disconnectedPlayers[username]) {
      console.log(`[JOIN] Player ${username} reconnecting to game ${gameCode}`);

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

      console.log(`[JOIN] Player ${username} successfully reconnected to game ${gameCode}`);
    } else if(game.users[username]) {
      // Username exists in active users - truly taken by someone else
      console.log(`[JOIN] Username ${username} already taken in game ${gameCode}`);
      ws.send(JSON.stringify({ action: "usernameTaken" }));
      return;
    } else {
      console.log(`[JOIN] User ${username} successfully joined game ${gameCode}`);

      // New player joining
      game.users[username] = ws;
      game.playerScores[username] = 0;
      game.playerWords[username] = [];
      game.playerAchievements[username] = [];
      game.playerWordDetails[username] = [];
      gameWs.set(ws, gameCode);
      wsUsername.set(ws, username);
    }

    // Send confirmation to the player who just joined
    ws.send(JSON.stringify({ action: "joined", isHost: false }));

    // Sync the current game state to the player
    if (game.gameState === 'playing') {
      // Game is active - send current state
      const remainingTime = Math.max(0, Math.floor((game.endTime - Date.now()) / 1000));
      ws.send(JSON.stringify({
        action: "startGame",
        letterGrid: game.letterGrid,
        timerSeconds: remainingTime,
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
    }

    const usersList = Object.keys(game.users);
    console.log(`[JOIN] Notifying host and players about updated users:`, usersList);
    sendHostAMessage(gameCode, { action: "updateUsers", users: usersList });
    sendAllPlayerAMessage(gameCode, { action: "updateUsers", users: usersList });
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
  console.log(`[START_GAME] Broadcasting to ${Object.keys(games[gameCode].users).length} players:`, Object.keys(games[gameCode].users));
  sendAllPlayerAMessage(gameCode, startMessage);
  broadcastLeaderboard(gameCode);

  // Start server-side timer with broadcasts every second
  startServerTimer(gameCode, timerSeconds);
}

// Server-side timer that broadcasts remaining time to all clients
const startServerTimer = (gameCode, totalSeconds) => {
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
  }

  games[gameCode].timerInterval = setInterval(() => {
    if (!games[gameCode] || games[gameCode].gameState !== 'playing') {
      clearInterval(games[gameCode].timerInterval);
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
      clearInterval(games[gameCode].timerInterval);
      handleEndGame(games[gameCode].host);
    }
  }, 1000); // Broadcast every second
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
  const finalScores = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    words: games[gameCode].playerWords[username],
    wordCount: games[gameCode].playerWords[username].length,
    achievements: games[gameCode].playerAchievements[username].map(ach => ACHIEVEMENTS[ach]),
    longestWord: games[gameCode].playerWords[username].reduce((longest, word) =>
      word.length > longest.length ? word : longest, ''),
  })).sort((a, b) => b.score - a.score);

  // Auto-validate words using dictionary
  const gameLanguage = games[gameCode].language || 'en';
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

  sendAllPlayerAMessage(gameCode, { action: "endGame" });
  sendAllPlayerAMessage(gameCode, {
    action: "finalScores",
    scores: finalScores,
    winner: finalScores[0]?.username
  });

  // Send validation interface data to host
  sendHostAMessage(gameCode, {
    action: "showValidation",
    playerWords: allPlayerWords,
    autoValidatedCount,
    totalWords: uniqueWords.size
  });

  // Log dictionary validation stats
  console.log(`[Dictionary] Auto-validated ${autoValidatedCount} words, ${wordsNeedingValidation.size} words need host validation`);

  // Start auto-validation timeout in case host is AFK (60 seconds)
  games[gameCode].validationTimeout = setTimeout(() => {
    // Check if game still exists and hasn't been validated yet
    if (games[gameCode] && games[gameCode].gameState === 'ended') {
      console.log(`[AUTO_VALIDATION] Host AFK for game ${gameCode}, auto-validating all words as valid`);

      // Auto-validate all words as true
      const autoValidations = [];
      const uniqueWords = new Set();

      Object.keys(games[gameCode].users).forEach(username => {
        if (games[gameCode].playerWordDetails[username]) {
          games[gameCode].playerWordDetails[username].forEach(wordDetail => {
            uniqueWords.add(wordDetail.word);
          });
        }
      });

      uniqueWords.forEach(word => {
        autoValidations.push({ word, isValid: true });
      });

      // Call the validation handler with all words marked as valid
      handleValidateWords(games[gameCode].host, autoValidations, games[gameCode].letterGrid);

      // Notify host that auto-validation occurred
      sendHostAMessage(gameCode, {
        action: "autoValidationOccurred",
        message: "Auto-validation completed due to inactivity"
      });
    }
  }, 60000); // 60 seconds
}

const handleSendAnswer = (ws, foundWords) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);
  const wsHost = getWsHostFromGameCode(gameCode);
  console.log("sendAnswer", username, gameCode, wsHost, foundWords);
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

// New function: Handle real-time word submission with board validation
const handleWordSubmission = (ws, word) => {
  const gameCode = gameWs.get(ws);
  const username = wsUsername.get(ws);

  if (!games[gameCode]) {
    console.warn(`Invalid game code for word submission: ${gameCode}`);
    return;
  }

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

// Broadcast live leaderboard (word count only during game, scores after validation)
const broadcastLeaderboard = (gameCode) => {
  if (!games[gameCode]) return;

  // Show all players in leaderboard (host is not in the players list)
  const leaderboard = Object.keys(games[gameCode].playerScores)
    .map(username => ({
      username,
      score: games[gameCode].playerScores[username],
      wordCount: games[gameCode].playerWords[username] ? games[gameCode].playerWords[username].length : 0
    }))
    .sort((a, b) => b.wordCount - a.wordCount); // Sort by word count during game

  sendAllPlayerAMessage(gameCode, { action: "updateLeaderboard", leaderboard });
  sendHostAMessage(gameCode, { action: "updateLeaderboard", leaderboard });
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
    // Check if this was the host
    if (games[gameCode].host === ws) {
      // Host disconnected - give them time to reconnect (30 seconds grace period)
      console.log(`[DISCONNECT] Host disconnected from game ${gameCode}, starting grace period`);

      // Mark the host as disconnected but don't delete the game yet
      if (!games[gameCode].hostDisconnectTimeout) {
        games[gameCode].hostDisconnected = true;
        games[gameCode].hostDisconnectTimeout = setTimeout(() => {
          // Only delete if the game still exists and host hasn't reconnected
          if (games[gameCode] && games[gameCode].hostDisconnected) {
            console.log(`[DISCONNECT] Host reconnect grace period expired for game ${gameCode}, closing room`);

            // Notify all players before closing
            sendAllPlayerAMessage(gameCode, {
              action: "hostLeftRoomClosing",
              message: "המנחה עזב את החדר. החדר נסגר."
            });

            // Clean up all timers and timeouts
            cleanupGameTimers(gameCode);

            // Cleanup after notification
            setTimeout(() => {
              if (games[gameCode]) {
                delete games[gameCode];
                console.log(`[DISCONNECT] Game ${gameCode} deleted`);

                // Delete from Redis
                deleteGameState(gameCode).catch(err =>
                  console.error('[REDIS] Error deleting game state:', err)
                );

                // Broadcast updated rooms list
                if (wss) broadcastActiveRooms(wss);
              }
            }, 500);
          }
        }, 300000); // 5 minute grace period (300000ms)
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
            }
            
            // Broadcast updated leaderboard (to remove them from there too)
            broadcastLeaderboard(gameCode);
          }
        }, 30000) // 30 seconds grace period
      };

      // Remove from active users immediately so they disappear from the list
      delete games[gameCode].users[username];

      // Notify host and all players of updated user list immediately
      const remainingPlayers = Object.keys(games[gameCode].users);
      sendHostAMessage(gameCode, {
        action: "updateUsers",
        users: remainingPlayers
      });
      sendAllPlayerAMessage(gameCode, {
        action: "updateUsers",
        users: remainingPlayers
      });
      
      // Broadcast updated leaderboard
      broadcastLeaderboard(gameCode);

      // Check if game should end (if 0 players left, or 1 player left and game is playing)
      // If 0 players, always end/delete.
      // If 1 player and playing, end game.
      if (remainingPlayers.length === 0) {
         console.log(`[DISCONNECT] No players left in game ${gameCode}, closing room.`);
         // Clean up all timers and timeouts
         cleanupGameTimers(gameCode);
         // Delete game
         delete games[gameCode];
         deleteGameState(gameCode).catch(e => console.error(e));
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

  // Reset all scores before calculating - only for existing players
  Object.keys(games[gameCode].users).forEach(username => {
    if (games[gameCode].playerScores[username] !== undefined) {
      games[gameCode].playerScores[username] = 0;
    }
    if (games[gameCode].playerAchievements[username] !== undefined) {
      games[gameCode].playerAchievements[username] = [];
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
    // Only store unique words - the first validation for each word wins
    // Host validations override auto-validations if present
    if (!wordValidationMap[word] || !wordValidationMap[word].autoValidated) {
      wordValidationMap[word] = isValid;
    }
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
        wordCount: playerWords.length,
        validWordCount: playerWordDetails.filter(w => w.validated === true).length,
        achievements: playerAchievements.map(ach => ACHIEVEMENTS[ach]),
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

  console.log(`[BROADCAST] Active rooms sent to ${sentCount} clients`);
};

// Handle chat messages in a room
const handleChatMessage = (ws, gameCode, username, message, isHost) => {
  if (!games[gameCode]) {
    console.warn(`[CHAT] No game found for ${gameCode}`);
    return;
  }

  console.log(`[CHAT] Message from ${username} in game ${gameCode}: ${message}`);

  const chatMessage = {
    action: 'chatMessage',
    username,
    message,
    timestamp: Date.now(),
    isHost: isHost || false
  };

  // Broadcast to all players
  sendAllPlayerAMessage(gameCode, chatMessage);

  // Send to host as well
  sendHostAMessage(gameCode, chatMessage);
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
