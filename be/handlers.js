const games = {};
const gameWs = {};
const wsUsername = {};

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
            gameState: 'waiting', // waiting, playing, ended
            startTime: null,
            letterGrid: null,
        };
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
    gameWs[ws] = gameCode;
    wsUsername[ws] = username;

    sendHostAMessage(gameCode, { action: "updateUsers", users: Object.keys(games[gameCode].users) });
    broadcastLeaderboard(gameCode);
}

const handleStartGame = (host, letterGrid) => {
  const gameCode = gameWs[host];
  games[gameCode].gameState = 'playing';
  games[gameCode].startTime = Date.now();
  games[gameCode].letterGrid = letterGrid;

  // Reset all player scores and words
  Object.keys(games[gameCode].users).forEach(username => {
    games[gameCode].playerScores[username] = 0;
    games[gameCode].playerWords[username] = [];
  });

  sendAllPlayerAMessage(gameCode, { action: "startGame" });
  broadcastLeaderboard(gameCode);
}

const handleEndGame = (host) => {
  const gameCode = gameWs[host];
  games[gameCode].gameState = 'ended';

  // Calculate final scores
  const finalScores = Object.keys(games[gameCode].playerScores).map(username => ({
    username,
    score: games[gameCode].playerScores[username],
    words: games[gameCode].playerWords[username]
  })).sort((a, b) => b.score - a.score);

  sendAllPlayerAMessage(gameCode, { action: "endGame" });
  sendAllPlayerAMessage(gameCode, {
    action: "finalScores",
    scores: finalScores,
    winner: finalScores[0]?.username
  });
}

const handleSendAnswer = (ws, foundWords) => {
  const gameCode = gameWs[ws];
  const username = wsUsername[ws];
  const wsHost = getWsHostFromGameCode(gameCode);
  console.log("sendAnswer", username, gameCode, wsHost, foundWords);
  sendHostAMessage(gameCode, { action: "updateScores", username, foundWords });
}

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

  // Calculate score and add word
  const score = calculateWordScore(word);
  games[gameCode].playerWords[username].push(word);
  games[gameCode].playerScores[username] += score;

  // Send confirmation to player
  ws.send(JSON.stringify({
    action: "wordAccepted",
    word,
    score,
    totalScore: games[gameCode].playerScores[username]
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

// Export all functions
module.exports = {
  setNewGame,
  addUserToGame,
  handleStartGame,
  handleEndGame,
  handleSendAnswer,
  handleWordSubmission,
  getGame,
  getUsernameFromWs,
  getWsHostFromGameCode,
  getWsFromUsername,
  getGameCodeFromUsername,
};