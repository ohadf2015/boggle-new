const { saveGameState, deleteGameState } = require('./redisClient');

const games = {};
// Use Map instead of plain objects to properly store WebSocket as keys
const gameWs = new Map();
const wsUsername = new Map();

// Normalize Hebrew letters - convert final forms to regular forms
function normalizeHebrewLetter(letter) {
  const finalToRegular = {
    'ץ': 'צ',
    'ך': 'כ',
    'ם': 'מ',
    'ן': 'נ',
    'ף': 'פ'
  };
  return finalToRegular[letter] || letter;
}

// Normalize an entire Hebrew word
function normalizeHebrewWord(word) {
  return word.split('').map(normalizeHebrewLetter).join('');
}

// Word validation: Check if a word exists on the board as a valid path
function isWordOnBoard(word, board) {
  if (!word || !board || board.length === 0) return false;

  const rows = board.length;
  const cols = board[0].length;
  // Normalize and lowercase the word for comparison
  const wordNormalized = normalizeHebrewWord(word.toLowerCase());

  // Find all starting positions (cells with the first letter)
  const startPositions = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cellNormalized = normalizeHebrewLetter(board[i][j].toLowerCase());
      if (cellNormalized === wordNormalized[0]) {
        startPositions.push([i, j]);
      }
    }
  }

  // Try to find the word starting from each position
  for (const [startRow, startCol] of startPositions) {
    if (searchWord(board, wordNormalized, startRow, startCol, 0, new Set())) {
      return true;
    }
  }

  return false;
}

// Helper function to search for word using DFS
function searchWord(board, word, row, col, index, visited) {
  // Base case: found the entire word
  if (index === word.length) {
    return true;
  }

  // Check bounds
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return false;
  }

  // Check if already visited this cell
  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) {
    return false;
  }

  // Check if current cell matches current letter (with normalization)
  const cellNormalized = normalizeHebrewLetter(board[row][col].toLowerCase());
  if (cellNormalized !== word[index]) {
    return false;
  }

  // Mark as visited
  visited.add(cellKey);

  // Search in all 8 directions (horizontal, vertical, diagonal)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],  // top-left, top, top-right
    [0, -1],           [0, 1],   // left, right
    [1, -1],  [1, 0],  [1, 1]    // bottom-left, bottom, bottom-right
  ];

  for (const [dx, dy] of directions) {
    if (searchWord(board, word, row + dx, col + dy, index + 1, new Set(visited))) {
      return true;
    }
  }

  return false;
}

// Function to get active rooms (show all rooms while host is present)
const getActiveRooms = () => {
  return Object.keys(games).map(gameCode => ({
    gameCode,
    roomName: games[gameCode].roomName || `Room ${gameCode}`,
    playerCount: Object.keys(games[gameCode].users).length,
    gameState: games[gameCode].gameState,
    language: games[gameCode].language || 'en', // Default to English if not set
  })); // Show all rooms as long as they exist (host hasn't left)
};

// Achievement definitions (Hebrew) - Expanded
const ACHIEVEMENTS = {
  FIRST_BLOOD: { name: 'דם ראשון', description: 'ראשון למצוא מילה', icon: '🎯' },
  SPEED_DEMON: { name: 'שד המהירות', description: 'מצא 10 מילים ב-2 דקות', icon: '⚡' },
  WORD_MASTER: { name: 'אדון המילים', description: 'מצא מילה בת 7+ אותיות', icon: '📚' },
  COMBO_KING: { name: 'מלך הקומבו', description: '5 מילים ברצף', icon: '🔥' },
  PERFECTIONIST: { name: 'פרפקציוניסט', description: 'כל המילים תקינות', icon: '✨' },
  LEXICON: { name: 'לקסיקון', description: 'מצא 20+ מילים', icon: '🏆' },
  WORDSMITH: { name: 'צורף מילים', description: 'מצא 15 מילים תקינות', icon: '🎓' },
  QUICK_THINKER: { name: 'חושב מהיר', description: 'מצא מילה בתוך 10 שניות', icon: '💨' },
  LONG_HAULER: { name: 'מרתונאי', description: 'מצא מילה בדקה האחרונה', icon: '🏃' },
  DIVERSE_VOCABULARY: { name: 'אוצר מילים מגוון', description: 'מצא מילים באורכים שונים', icon: '🌈' },
  DOUBLE_TROUBLE: { name: 'צמד מנצח', description: 'מצא 2 מילים בתוך 5 שניות', icon: '⚡⚡' },
  TREASURE_HUNTER: { name: 'צייד אוצרות', description: 'מצא מילה נדירה (8+ אותיות)', icon: '💎' },
};

// Calculate score based on word length with bonus for longer words (whole numbers)
const calculateWordScore = (word) => {
    const length = word.length;
    if (length === 1) return 0; // Single letters not allowed
    if (length === 2) return 1; // 2-letter words: 1 point
    if (length === 3) return 1; // 3-letter words: 1 point
    if (length === 4) return 2; // 4-letter words: 2 points
    if (length === 5) return 3; // 5-letter words: 3 points
    if (length === 6) return 5; // 6-letter words: 5 points
    if (length === 7) return 7; // 7-letter words: 7 points
    return 10 + (length - 8) * 3; // 8+ letters: 10, 13, 16, 19...
};

const setNewGame = (gameCode, host, roomName, language = 'en') => {
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

        // Save game state to Redis (async, non-blocking)
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

const addUserToGame = (gameCode, username, ws) => {
    console.log(`[JOIN] Attempting to join - gameCode: ${gameCode}, username: ${username}`);
    console.log(`[JOIN] Available games:`, Object.keys(games));

    if(!getGame(gameCode)) {
      console.log(`[JOIN] Game ${gameCode} does not exist`);
      ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
      return;
    }

    const game = games[gameCode];

    // Check if this username exists and is in the disconnected players list (reconnection)
    if(game.users[username] && game.disconnectedPlayers && game.disconnectedPlayers[username]) {
      console.log(`[JOIN] Player ${username} reconnecting to game ${gameCode}`);

      // Clear the disconnect timeout
      if (game.disconnectedPlayers[username].timeout) {
        clearTimeout(game.disconnectedPlayers[username].timeout);
      }

      // Update WebSocket (data is already in game.users, etc.)
      game.users[username] = ws;
      gameWs.set(ws, gameCode);
      wsUsername.set(ws, username);

      // Remove from disconnected players
      delete game.disconnectedPlayers[username];

      console.log(`[JOIN] Player ${username} successfully reconnected to game ${gameCode}`);
    } else if(game.users[username]) {
      // Username exists but NOT in disconnected list - truly taken by someone else
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

    // If game is already in progress, sync the current game state to the new player
    if (game.gameState === 'playing') {
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
    }

    const usersList = Object.keys(game.users);
    console.log(`[JOIN] Notifying host about updated users:`, usersList);
    sendHostAMessage(gameCode, { action: "updateUsers", users: usersList });
    broadcastLeaderboard(gameCode);

    // Save updated game state to Redis
    saveGameState(gameCode, games[gameCode]).catch(err =>
      console.error('[REDIS] Error saving game state:', err)
    );
}

const handleStartGame = (host, letterGrid, timerSeconds, language) => {
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

  // Send all words to host for validation
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
    playerWords: allPlayerWords
  });

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

// Check and award LIVE achievements during gameplay (selective achievements only)
const checkLiveAchievements = (gameCode, username, word, timeSinceStart) => {
  const game = games[gameCode];
  const achievements = game.playerAchievements[username];
  const newAchievements = [];

  // First Blood - first word in the game (LIVE)
  if (!game.firstWordFound && !achievements.includes('FIRST_BLOOD')) {
    game.firstWordFound = true;
    achievements.push('FIRST_BLOOD');
    newAchievements.push(ACHIEVEMENTS.FIRST_BLOOD);
  }

  // Word Master - 7+ letter word (LIVE)
  if (word.length >= 7 && !achievements.includes('WORD_MASTER')) {
    achievements.push('WORD_MASTER');
    newAchievements.push(ACHIEVEMENTS.WORD_MASTER);
  }

  // Treasure Hunter - 8+ letter word (LIVE)
  if (word.length >= 8 && !achievements.includes('TREASURE_HUNTER')) {
    achievements.push('TREASURE_HUNTER');
    newAchievements.push(ACHIEVEMENTS.TREASURE_HUNTER);
  }

  // Quick Thinker - word within 10 seconds (LIVE)
  if (timeSinceStart <= 10 && !achievements.includes('QUICK_THINKER')) {
    achievements.push('QUICK_THINKER');
    newAchievements.push(ACHIEVEMENTS.QUICK_THINKER);
  }

  // Speed Demon - 10 words in 2 minutes (LIVE)
  if (game.playerWords[username].length >= 10 && timeSinceStart <= 120 && !achievements.includes('SPEED_DEMON')) {
    achievements.push('SPEED_DEMON');
    newAchievements.push(ACHIEVEMENTS.SPEED_DEMON);
  }

  // Combo King - multiples of 5 words (LIVE)
  if (game.playerWords[username].length >= 5 &&
      game.playerWords[username].length % 5 === 0 &&
      !achievements.includes('COMBO_KING')) {
    achievements.push('COMBO_KING');
    newAchievements.push(ACHIEVEMENTS.COMBO_KING);
  }

  // Wordsmith - 15 words (LIVE)
  if (game.playerWords[username].length >= 15 && !achievements.includes('WORDSMITH')) {
    achievements.push('WORDSMITH');
    newAchievements.push(ACHIEVEMENTS.WORDSMITH);
  }

  // Lexicon - 20+ words (LIVE)
  if (game.playerWords[username].length >= 20 && !achievements.includes('LEXICON')) {
    achievements.push('LEXICON');
    newAchievements.push(ACHIEVEMENTS.LEXICON);
  }

  // Double Trouble - 2 words within 5 seconds (LIVE)
  const playerWordDetails = game.playerWordDetails[username];
  if (playerWordDetails.length >= 2 && !achievements.includes('DOUBLE_TROUBLE')) {
    const lastTwo = playerWordDetails.slice(-2);
    if (lastTwo[1].timeSinceStart - lastTwo[0].timeSinceStart <= 5) {
      achievements.push('DOUBLE_TROUBLE');
      newAchievements.push(ACHIEVEMENTS.DOUBLE_TROUBLE);
    }
  }

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

  if (!games[gameCode] || games[gameCode].gameState !== 'playing') {
    console.warn(`Invalid game state for word submission: ${gameCode}`);
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
  checkLiveAchievements(gameCode, username, word, timeSinceStart);

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
  if (games[gameCode]) {
    const players = Object.keys(games[gameCode].users);
    console.log(`[BROADCAST] Sending ${message.action} to ${players.length} players in game ${gameCode}:`, players);

    Object.entries(games[gameCode].users).forEach(([username, userWs]) => {
      if (userWs.readyState === 1) { // 1 = OPEN
        try {
          userWs.send(JSON.stringify(message));
          console.log(`[BROADCAST] ✓ Sent ${message.action} to ${username}`);
        } catch (error) {
          console.error(`[BROADCAST] ✗ Error sending ${message.action} to ${username}:`, error);
        }
      } else {
        console.warn(`[BROADCAST] ✗ WebSocket not open for ${username}, state: ${userWs.readyState}`);
      }
    });
  } else {
    console.warn(`[BROADCAST] No game found for ${gameCode}`);
  }
}

const sendHostAMessage = (gameCode, message) => {
  if (games[gameCode] && games[gameCode].host) {
    if (games[gameCode].host.readyState === 1) { // 1 = OPEN
      try {
        games[gameCode].host.send(JSON.stringify(message));
        console.log(`[HOST_MSG] ✓ Sent ${message.action} to host in game ${gameCode}`);
      } catch (error) {
        console.error(`[HOST_MSG] ✗ Error sending ${message.action} to host in game ${gameCode}:`, error);
      }
    } else {
      console.warn(`[HOST_MSG] ✗ Host WebSocket not open for game ${gameCode}, state: ${games[gameCode].host.readyState}`);
    }
  } else {
    console.warn(`[HOST_MSG] ✗ No host found for game ${gameCode}`);
  }
}

const getGame = (gameCode) => games[gameCode];

const getUsernameFromWs = (ws) => wsUsername.get(ws);

const getWsHostFromGameCode = (gameCode) => games[gameCode].host;

const getWsFromUsername = (gameCode, username) => games[gameCode].users[username];

const getGameCodeFromUsername = (username) => {
  for (const gameCode in games) {
    if (games[gameCode].users[username]) {
      return gameCode;
    }
  }
  return null;
}

// Cleanup when a connection closes
const handleDisconnect = (ws) => {
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

            // Clear timer if exists
            if (games[gameCode].timerInterval) {
              clearInterval(games[gameCode].timerInterval);
            }

            // Clear all player disconnect timeouts
            if (games[gameCode].disconnectedPlayers) {
              Object.values(games[gameCode].disconnectedPlayers).forEach(player => {
                if (player.timeout) {
                  clearTimeout(player.timeout);
                }
              });
            }

            // Cleanup after notification
            setTimeout(() => {
              if (games[gameCode]) {
                delete games[gameCode];
                console.log(`[DISCONNECT] Game ${gameCode} deleted`);

                // Delete from Redis
                deleteGameState(gameCode).catch(err =>
                  console.error('[REDIS] Error deleting game state:', err)
                );
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

      // Notify host of updated user list immediately
      const remainingPlayers = Object.keys(games[gameCode].users);
      sendHostAMessage(gameCode, {
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
         // Clear host disconnect timeout if exists
         if (games[gameCode].hostDisconnectTimeout) clearTimeout(games[gameCode].hostDisconnectTimeout);
         // Delete game
         delete games[gameCode];
         deleteGameState(gameCode).catch(e => console.error(e));
      } else if (remainingPlayers.length <= 1 && games[gameCode].gameState === 'playing') {
         console.log(`[DISCONNECT] ${remainingPlayers.length} player(s) remain in game ${gameCode}, ending game automatically`);
         if (games[gameCode].timerInterval) clearInterval(games[gameCode].timerInterval);
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
  const wordValidationMap = {};
  validations.forEach(({ word, isValid }) => {
    // Only store unique words - the first validation for each word wins
    if (!wordValidationMap[word]) {
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

  // NOW check and award achievements based on validated words
  Object.keys(games[gameCode].users).forEach(username => {
    // Safety check: ensure player data exists
    if (!games[gameCode].playerWordDetails[username]) {
      console.warn(`Player ${username} missing word details during achievement calculation`);
      return;
    }

    const allWords = games[gameCode].playerWordDetails[username];
    const validWords = allWords.filter(w => w.validated === true);

    // First Blood - first word in the game
    if (validWords.length > 0 && !games[gameCode].firstWordFound) {
      const firstWordEver = Object.keys(games[gameCode].users)
        .map(u => games[gameCode].playerWordDetails[u])
        .flat()
        .filter(w => w.validated === true)
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      if (firstWordEver && allWords.includes(firstWordEver)) {
        games[gameCode].playerAchievements[username].push('FIRST_BLOOD');
        games[gameCode].firstWordFound = true;
      }
    }

    // Word Master - 7+ letter word
    if (validWords.some(w => w.word.length >= 7)) {
      games[gameCode].playerAchievements[username].push('WORD_MASTER');
    }

    // Speed Demon - 10 valid words in 2 minutes
    const wordsIn2Min = validWords.filter(w => w.timeSinceStart <= 120);
    if (wordsIn2Min.length >= 10) {
      games[gameCode].playerAchievements[username].push('SPEED_DEMON');
    }

    // Lexicon - 20+ valid words
    if (validWords.length >= 20) {
      games[gameCode].playerAchievements[username].push('LEXICON');
    }

    // Combo King - 5+ valid words (multiples of 5)
    if (validWords.length >= 5 && validWords.length % 5 === 0) {
      games[gameCode].playerAchievements[username].push('COMBO_KING');
    }

    // Perfectionist - all words valid
    if (allWords.length > 0 && allWords.every(w => w.validated === true)) {
      games[gameCode].playerAchievements[username].push('PERFECTIONIST');
    }

    // Wordsmith - 15+ valid words
    if (validWords.length >= 15) {
      games[gameCode].playerAchievements[username].push('WORDSMITH');
    }

    // Quick Thinker - found a word within 10 seconds of game start
    if (validWords.some(w => w.timeSinceStart <= 10)) {
      games[gameCode].playerAchievements[username].push('QUICK_THINKER');
    }

    // Long Hauler - found a word in the last minute
    const gameTimerSeconds = games[gameCode].timerSeconds || 180;
    if (validWords.some(w => w.timeSinceStart >= gameTimerSeconds - 60)) {
      games[gameCode].playerAchievements[username].push('LONG_HAULER');
    }

    // Diverse Vocabulary - found words of at least 4 different lengths
    const uniqueLengths = new Set(validWords.map(w => w.word.length));
    if (uniqueLengths.size >= 4) {
      games[gameCode].playerAchievements[username].push('DIVERSE_VOCABULARY');
    }

    // Double Trouble - found 2 words within 5 seconds of each other
    for (let i = 1; i < validWords.length; i++) {
      if (validWords[i].timeSinceStart - validWords[i-1].timeSinceStart <= 5) {
        games[gameCode].playerAchievements[username].push('DOUBLE_TROUBLE');
        break;
      }
    }

    // Treasure Hunter - found an 8+ letter word
    if (validWords.some(w => w.word.length >= 8)) {
      games[gameCode].playerAchievements[username].push('TREASURE_HUNTER');
    }
  });

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
const handleCloseRoom = (host, gameCode) => {
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

  // Clear timer if exists
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
  }

  // Clear any disconnect timeout
  if (games[gameCode].hostDisconnectTimeout) {
    clearTimeout(games[gameCode].hostDisconnectTimeout);
  }

  // Clear validation timeout if exists
  if (games[gameCode].validationTimeout) {
    clearTimeout(games[gameCode].validationTimeout);
  }

  // Clear all player disconnect timeouts
  if (games[gameCode].disconnectedPlayers) {
    Object.values(games[gameCode].disconnectedPlayers).forEach(player => {
      if (player.timeout) {
        clearTimeout(player.timeout);
      }
    });
  }

  // Delete the game after a short delay to ensure messages are sent
  setTimeout(() => {
    if (games[gameCode]) {
      delete games[gameCode];
      console.log(`[CLOSE_ROOM] Game ${gameCode} deleted`);

      // Delete from Redis
      deleteGameState(gameCode).catch(err =>
        console.error('[REDIS] Error deleting game state:', err)
      );
    }
  }, 500);
};

// Handle resetting game for a new round
const handleResetGame = (host) => {
  const gameCode = gameWs.get(host);

  if (!gameCode || !games[gameCode]) {
    console.error(`[RESET_GAME] Invalid game - gameCode: ${gameCode}`);
    return;
  }

  console.log(`[RESET_GAME] Resetting game ${gameCode} for new round`);

  // Clear timer if exists
  if (games[gameCode].timerInterval) {
    clearInterval(games[gameCode].timerInterval);
    games[gameCode].timerInterval = null;
  }

  // Clear validation timeout if exists
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
};
