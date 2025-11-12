const games = {};
const gameWs = {};
const wsUsername = {};

// Function to get active rooms
const getActiveRooms = () => {
  return Object.keys(games).map(gameCode => ({
    gameCode,
    playerCount: Object.keys(games[gameCode].users).length,
    gameState: games[gameCode].gameState,
  })).filter(room => room.gameState === 'waiting'); // Only show rooms waiting for players
};

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_BLOOD: { name: 'First Blood', description: 'First to find a word', icon: '🎯' },
  SPEED_DEMON: { name: 'Speed Demon', description: 'Found 10 words in 2 minutes', icon: '⚡' },
  WORD_MASTER: { name: 'Word Master', description: 'Found a 7+ letter word', icon: '📚' },
  COMBO_KING: { name: 'Combo King', description: '5 words in a row', icon: '🔥' },
  PERFECTIONIST: { name: 'Perfectionist', description: 'All words valid', icon: '✨' },
  LEXICON: { name: 'Lexicon', description: 'Found 20+ words', icon: '🏆' },
};

// Calculate score based on word length with bonus for longer words
const calculateWordScore = (word) => {
    const length = word.length;
    if (length <= 2) return 0;
    if (length === 3) return 1;
    if (length === 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 8 + (length - 8) * 2; // 8+ letters get extra bonus
};

const setNewGame = (gameCode, host) => {
    if (!getGame(gameCode)) {
        games[gameCode] = {
            host,
            users: {},
            playerScores: {},
            playerWords: {},
            playerAchievements: {},
            playerWordDetails: {}, // Store word details with timestamps
            firstWordFound: false,
            gameState: 'waiting', // waiting, playing, ended
            startTime: null,
            letterGrid: null,
        };
        // Send confirmation to host
        host.send(JSON.stringify({ action: "joined", isHost: true }));
        gameWs[host] = gameCode;
    } else {
        host.send(JSON.stringify({ action: "gameExists" }));
        return;
    }
}

const addUserToGame = (gameCode, username, ws) => {
    if(!getGame(gameCode)) {
      ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
      return;
    } else if(getGame(gameCode).users[username]) {
      ws.send(JSON.stringify({ action: "usernameTaken" }));
      return;
    } else {
        console.log(`User ${username} joined game ${gameCode}`);
    }
    games[gameCode].users[username] = ws;
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
    games[gameCode].playerAchievements[username] = [];
    games[gameCode].playerWordDetails[username] = [];
    gameWs[ws] = gameCode;
    wsUsername[ws] = username;

    // Send confirmation to the player who just joined
    ws.send(JSON.stringify({ action: "joined", isHost: false }));

    sendHostAMessage(gameCode, { action: "updateUsers", users: Object.keys(games[gameCode].users) });
    broadcastLeaderboard(gameCode);
}

const handleStartGame = (host, letterGrid) => {
  const gameCode = gameWs[host];
  games[gameCode].gameState = 'playing';
  games[gameCode].startTime = Date.now();
  games[gameCode].letterGrid = letterGrid;
  games[gameCode].firstWordFound = false;

  // Reset all player scores, words, and achievements
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
    games[gameCode].playerAchievements[username] = [];
    games[gameCode].playerWordDetails[username] = [];
  });

  sendAllPlayerAMessage(gameCode, { action: "startGame", letterGrid });
  broadcastLeaderboard(gameCode);
}

const handleEndGame = (host) => {
  const gameCode = gameWs[host];
  games[gameCode].gameState = 'ended';

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
}

const handleSendAnswer = (ws, foundWords) => {
  const gameCode = gameWs[ws];
  const username = wsUsername[ws];
  const wsHost = getWsHostFromGameCode(gameCode);
  console.log("sendAnswer", username, gameCode, wsHost, foundWords);
  sendHostAMessage(gameCode, { action: "updateScores", username, foundWords });
}

// Check and award achievements
const checkAndAwardAchievements = (gameCode, username, word, timeSinceStart) => {
  const game = games[gameCode];
  const achievements = game.playerAchievements[username];
  const newAchievements = [];

  // First Blood - first word in the game
  if (!game.firstWordFound && !achievements.includes('FIRST_BLOOD')) {
    game.firstWordFound = true;
    achievements.push('FIRST_BLOOD');
    newAchievements.push(ACHIEVEMENTS.FIRST_BLOOD);
  }

  // Word Master - 7+ letter word
  if (word.length >= 7 && !achievements.includes('WORD_MASTER')) {
    achievements.push('WORD_MASTER');
    newAchievements.push(ACHIEVEMENTS.WORD_MASTER);
  }

  // Speed Demon - 10 words in 2 minutes
  if (game.playerWords[username].length >= 10 && timeSinceStart <= 120 && !achievements.includes('SPEED_DEMON')) {
    achievements.push('SPEED_DEMON');
    newAchievements.push(ACHIEVEMENTS.SPEED_DEMON);
  }

  // Lexicon - 20+ words
  if (game.playerWords[username].length >= 20 && !achievements.includes('LEXICON')) {
    achievements.push('LEXICON');
    newAchievements.push(ACHIEVEMENTS.LEXICON);
  }

  // Combo King - 5 words (check if last 5 words were all found)
  if (game.playerWords[username].length >= 5 &&
      game.playerWords[username].length % 5 === 0 &&
      !achievements.includes('COMBO_KING')) {
    achievements.push('COMBO_KING');
    newAchievements.push(ACHIEVEMENTS.COMBO_KING);
  }

  // Broadcast new achievements
  if (newAchievements.length > 0) {
    sendAllPlayerAMessage(gameCode, {
      action: "achievementUnlocked",
      username,
      achievements: newAchievements
    });
  }
};

// New function: Handle real-time word submission
const handleWordSubmission = (ws, word) => {
  const gameCode = gameWs[ws];
  const username = wsUsername[ws];

  if (!games[gameCode] || games[gameCode].gameState !== 'playing') {
    return;
  }

  // Check if word was already found by this player
  if (games[gameCode].playerWords[username].includes(word)) {
    ws.send(JSON.stringify({ action: "wordAlreadyFound", word }));
    return;
  }

  const currentTime = Date.now();
  const timeSinceStart = (currentTime - games[gameCode].startTime) / 1000; // in seconds

  // Calculate score and add word
  const score = calculateWordScore(word);
  games[gameCode].playerWords[username].push(word);
  games[gameCode].playerWordDetails[username].push({
    word,
    score,
    timestamp: currentTime,
    validated: null, // Will be set by host later
  });
  games[gameCode].playerScores[username] += score;

  // Check for achievements
  checkAndAwardAchievements(gameCode, username, word, timeSinceStart);

  // Send confirmation to player with any new achievements
  ws.send(JSON.stringify({
    action: "wordAccepted",
    word,
    score,
    totalScore: games[gameCode].playerScores[username],
    achievements: games[gameCode].playerAchievements[username]
  }));

  // Broadcast updated leaderboard to all players
  broadcastLeaderboard(gameCode);

  // Notify all players that someone found a word (for animations)
  sendAllPlayerAMessage(gameCode, {
    action: "playerFoundWord",
    username,
    word,
    score
  });
}

// Broadcast live leaderboard
const broadcastLeaderboard = (gameCode) => {
  if (!games[gameCode]) return;

  const leaderboard = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    wordCount: games[gameCode].playerWords[username].length
  })).sort((a, b) => b.score - a.score);

  sendAllPlayerAMessage(gameCode, { action: "updateLeaderboard", leaderboard });
  sendHostAMessage(gameCode, { action: "updateLeaderboard", leaderboard });
}

const sendAllPlayerAMessage = (gameCode, message) => {
  if (games[gameCode]) {
    Object.values(games[gameCode].users).forEach((userWs) => {
      userWs.send(JSON.stringify(message));
    });
  }
}

const sendHostAMessage = (gameCode, message) => {
  if (games[gameCode]) {
    games[gameCode].host.send(JSON.stringify(message));
  }
}

const getGame = (gameCode) => games[gameCode];

const getUsernameFromWs = (ws) => wsUsername[ws];

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

// Handle word validation by host
const handleValidateWords = (host, validations) => {
  const gameCode = gameWs[host];
  if (!games[gameCode]) return;

  // Update scores based on validation
  validations.forEach(({ username, word, isValid }) => {
    const wordDetail = games[gameCode].playerWordDetails[username].find(w => w.word === word);
    if (wordDetail) {
      wordDetail.validated = isValid;

      // Deduct points if invalid
      if (!isValid) {
        games[gameCode].playerScores[username] -= wordDetail.score;
      }
    }
  });

  // Check for Perfectionist achievement (all words valid)
  Object.keys(games[gameCode].users).forEach(username => {
    const allWords = games[gameCode].playerWordDetails[username];
    const allValid = allWords.length > 0 && allWords.every(w => w.validated === true);

    if (allValid && !games[gameCode].playerAchievements[username].includes('PERFECTIONIST')) {
      games[gameCode].playerAchievements[username].push('PERFECTIONIST');
    }
  });

  // Recalculate final scores
  const finalScores = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    words: games[gameCode].playerWords[username],
    wordCount: games[gameCode].playerWords[username].length,
    validWordCount: games[gameCode].playerWordDetails[username].filter(w => w.validated === true).length,
    achievements: games[gameCode].playerAchievements[username].map(ach => ACHIEVEMENTS[ach]),
    longestWord: games[gameCode].playerWords[username].reduce((longest, word) =>
      word.length > longest.length ? word : longest, ''),
  })).sort((a, b) => b.score - a.score);

  // Send updated scores to all players
  sendAllPlayerAMessage(gameCode, {
    action: "validatedScores",
    scores: finalScores,
    winner: finalScores[0]?.username
  });

  sendHostAMessage(gameCode, {
    action: "validationComplete",
    scores: finalScores
  });
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
};