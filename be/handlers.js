const games = {};
const gameWs = {};
const wsUsername = {};

module.exports.setNewGame = (gameCode, host) => {
  if (!getGame(gameCode)) {
    games[gameCode] = {
      host,
      users: {},
    };
    console.log("new game created code: ", gameCode)
  } else {
    host.send(JSON.stringify({ action: "gameExists" }));
    return;
  }
}

module.exports.handleGetActiveGames = (ws) => {
  const gamesCode = Object.keys(games);
  const message = { action: "activeGames", activeGames: gamesCode };
  sendWsAMessage(ws, message);
}

module.exports.addUserToGame = (gameCode, username, ws) => {
  if (!getGame(gameCode)) {
    ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
    return;
  } else if (getGame(gameCode).users[username]) {
    ws.send(JSON.stringify({ action: "usernameTaken" }));
    return;
  } else {
    console.log(`User ${username} joined game ${gameCode}`);
  }
  games[gameCode].users[username] = ws;
  gameWs[ws] = gameCode;
  wsUsername[ws] = username;

  sendHostAMessage(gameCode, { action: "updateUsers", users: Object.keys(games[gameCode].users) });
}

module.exports.handleStartGame = (host) => {
  const gameCode = gameWs[host];
  sendAllPlayerAMessage(gameCode, { action: "startGame" });
}

module.exports.handleEndGame = (host) => {
  const gameCode = gameWs[host];
  sendAllPlayerAMessage(gameCode, { action: "endGame" });
}

module.exports.handleSendAnswer = (ws, foundWords) => {
  const gameCode = gameWs[ws];
  const username = wsUsername[ws];
  const wsHost = getWsHostFromGameCode(gameCode);
  console.log("sendAnswer", username, gameCode, wsHost, foundWords);
  sendHostAMessage(gameCode, { action: "updateScores", username, foundWords });
}
module.exports.sendAllPlayerAMessage = (gameCode, message) => {
  if (games[gameCode]) {
    Object.values(games[gameCode].users).forEach((userWs) => {
      userWs.send(JSON.stringify(message));
    });
  }
}
const sendWsAMessage = (ws, message) => {
  ws.send(JSON.stringify(message))
}
module.exports.sendHostAMessage = (gameCode, message) => {
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