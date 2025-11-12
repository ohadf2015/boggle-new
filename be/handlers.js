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

// Achievement definitions (Hebrew)
const ACHIEVEMENTS = {
  FIRST_BLOOD: { name: 'דם ראשון', description: 'ראשון למצוא מילה', icon: '🎯' },
  SPEED_DEMON: { name: 'שד המהירות', description: 'מצא 10 מילים ב-2 דקות', icon: '⚡' },
  WORD_MASTER: { name: 'אדון המילים', description: 'מצא מילה בת 7+ אותיות', icon: '📚' },
  COMBO_KING: { name: 'מלך הקומבו', description: '5 מילים ברצף', icon: '🔥' },
  PERFECTIONIST: { name: 'פרפקציוניסט', description: 'כל המילים תקינות', icon: '✨' },
  LEXICON: { name: 'לקסיקון', description: 'מצא 20+ מילים', icon: '🏆' },
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

const handleStartGame = (host, letterGrid, timerSeconds) => {
  const gameCode = gameWs[host];
  games[gameCode].gameState = 'playing';
  games[gameCode].startTime = Date.now();
  games[gameCode].letterGrid = letterGrid;
  games[gameCode].firstWordFound = false;
  games[gameCode].timerSeconds = timerSeconds;

  // Reset all player scores, words, and achievements
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
    games[gameCode].playerAchievements[username] = [];
    games[gameCode].playerWordDetails[username] = [];
  });

  sendAllPlayerAMessage(gameCode, { action: "startGame", letterGrid, timerSeconds });
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

  // Just store the word without calculating score yet
  games[gameCode].playerWords[username].push(word);
  games[gameCode].playerWordDetails[username].push({
    word,
    score: 0, // Will be calculated after validation
    timestamp: currentTime,
    timeSinceStart,
    validated: null, // Will be set by host later
  });

  // Send confirmation to player (no score yet)
  ws.send(JSON.stringify({
    action: "wordAccepted",
    word,
  }));

  // Notify all players that someone found a word (no score shown)
  sendAllPlayerAMessage(gameCode, {
    action: "playerFoundWord",
    username,
    word,
  });
}

// Broadcast live leaderboard (word count only during game, scores after validation)
const broadcastLeaderboard = (gameCode) => {
  if (!games[gameCode]) return;

  const leaderboard = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    wordCount: games[gameCode].playerWords[username].length
  })).sort((a, b) => b.wordCount - a.wordCount); // Sort by word count during game

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

// Handle word validation by host - THIS IS WHERE SCORING HAPPENS
const handleValidateWords = (host, validations, letterGrid) => {
  const gameCode = gameWs[host];
  if (!games[gameCode]) return;

  // Reset all scores before calculating
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerAchievements[username] = [];
  });

  // Update validation status and calculate scores ONLY for valid words
  validations.forEach(({ username, word, isValid }) => {
    const wordDetail = games[gameCode].playerWordDetails[username].find(w => w.word === word);
    if (wordDetail) {
      wordDetail.validated = isValid;

      // Calculate and add score ONLY if valid
      if (isValid) {
        const score = calculateWordScore(word);
        wordDetail.score = score;
        games[gameCode].playerScores[username] += score;
      } else {
        wordDetail.score = 0;
      }
    }
  });

  // NOW check and award achievements based on validated words
  Object.keys(games[gameCode].users).forEach(username => {
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

    // Combo King - 5+ valid words
    if (validWords.length >= 5 && validWords.length % 5 === 0) {
      games[gameCode].playerAchievements[username].push('COMBO_KING');
    }

    // Perfectionist - all words valid
    if (allWords.length > 0 && allWords.every(w => w.validated === true)) {
      games[gameCode].playerAchievements[username].push('PERFECTIONIST');
    }
  });

  // Calculate final scores with all validated data
  const finalScores = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    words: games[gameCode].playerWordDetails[username].filter(w => w.validated === true).map(w => w.word),
    allWords: games[gameCode].playerWordDetails[username], // For visualization
    wordCount: games[gameCode].playerWords[username].length,
    validWordCount: games[gameCode].playerWordDetails[username].filter(w => w.validated === true).length,
    achievements: games[gameCode].playerAchievements[username].map(ach => ACHIEVEMENTS[ach]),
    longestWord: games[gameCode].playerWordDetails[username]
      .filter(w => w.validated === true)
      .reduce((longest, wordObj) => wordObj.word.length > longest.length ? wordObj.word : longest, ''),
  })).sort((a, b) => b.score - a.score);

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