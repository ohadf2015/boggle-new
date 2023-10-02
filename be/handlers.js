const games = {};
const gameWs = {};
const wsUsername = {};

export const setNewGame = (gameCode, host) => {
    if (!getGame(gameCode)) {
        games[gameCode] = {
            host,
            users: {},
        };
    } else {
        host.send(JSON.stringify({ action: "gameExists" }));
        return;
    }
}

export const addUserToGame = (gameCode, username, ws) => {
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
    gameWs[ws] = gameCode;
    wsUsername[ws] = username;

    sendHostAMessage(gameCode, { action: "updateUsers", users: Object.keys(games[gameCode].users) });
}

export const handleStartGame = (host) => {
  const gameCode = gameWs[host];
  sendAllPlayerAMessage(gameCode, { action: "startGame" });
}

export const handleEndGame = (host) => {
  const gameCode = gameWs[host];
  sendAllPlayerAMessage(gameCode, { action: "endGame" });
}

export const handleSendAnswer = (ws, foundWords) => {
  const gameCode = gameWs[ws];
  const username = wsUsername[ws];
  const wsHost = getWsHostFromGameCode(gameCode);
  console.log("sendAnswer", username, gameCode, wsHost, foundWords);
  sendHostAMessage(gameCode, { action: "updateScores", username, foundWords });
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

export const getGame = (gameCode) => games[gameCode];

export const getUsernameFromWs = (ws) => wsUsername[ws];
  
export const getWsHostFromGameCode = (gameCode) => games[gameCode].host;
  
export const getWsFromUsername = (gameCode, username) => games[gameCode].users[username];

export const getGameCodeFromUsername = (username) => {
  for (const gameCode in games) {
    if (games[gameCode].users[username]) {
      return gameCode;
    }
  }
  return null;
}