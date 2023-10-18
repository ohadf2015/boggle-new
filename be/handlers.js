const _ = require("lodash");
const WebSocket = require("ws");

const games = {};
const gameWs = {};
const wsUsername = {};
const allWaitingWs = [];

module.exports.setNewGame = (gameCode, host) => {
  if (!getGame(gameCode)) {
    games[gameCode] = {
      host,
      users: {},
    };
    const message = { action: "activeGames", activeGames: this.getAllActiveGamesCode() };
    sendWsAMessage(allWaitingWs, message);

    console.log("new game created code: ", gameCode)
  } else {
    host.send(JSON.stringify({ action: "gameExists" }));
    return;
  }
}

module.exports.handleGetUsers = (ws, gameCode) => {
  if(!getGame(gameCode)){
    ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
    return;
  }
  const users = Object.keys(games[gameCode]?.users);
  const message = { action: "updateUsers", users };
  ws.send(JSON.stringify(message));
}

module.exports.handleGetActiveGames = (ws) => {
  allWaitingWs.push(ws);
  const message = { action: "activeGames", activeGames: this.getAllActiveGamesCode() };
  sendWsAMessage(allWaitingWs, message);
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

  this.sendHostAMessage(gameCode, { action: "updateUsers", users: Object.keys(games[gameCode].users) });
}

module.exports.handleStartGame = (gameCode) => {
  this.sendAllPlayerAMessage(gameCode, { action: "startGame" });
}

module.exports.handleEndGame = (gameCode) => {
  this.calculateScores(gameCode);
  this.sendAllPlayerAMessage(gameCode, { action: "endGame" });
}

module.exports.handleSendAnswer = (ws, foundWords, gameCode, username) => {
  if(!getGame(gameCode)){
    ws.send(JSON.stringify({ action: "gameDoesNotExist" }));
    return;
  } else {
    console.log(`User ${username} sent answer for game ${gameCode}`);
    games[gameCode].users[username].foundWords = foundWords;
    if(_.every(games[gameCode].users, (user) => user.foundWords)){
      this.handleEndGame(gameCode);
    }
  }
  this.sendHostAMessage(gameCode, { action: "updateScores", username, foundWords });
}

module.exports.calculateScores = (gameCode) => {
  const users = games[gameCode].users;
  const allWords = _.flatten(Object.values(users).map((user) => user.foundWords));
  const uniqueWords = _.uniq(allWords);
  const scores = {};
  uniqueWords.forEach((word) => {
    scores[word] = 0;
    Object.values(users).forEach((user) => {
      if (user.foundWords.includes(word)) {
        user.score = user.score || 0;
        user.score += word.length -1;
      }
    });
  });
}

module.exports.getAllActiveGamesCode = () => {
  const activeGames = _.pickBy(games, (game) => game.host.readyState === WebSocket.OPEN);
  const gamesCode = Object.keys(activeGames);
  return gamesCode;
}

module.exports.sendAllPlayerAMessage = (gameCode, message) => {
  if (games[gameCode]) {
    Object.values(games[gameCode].users).forEach((userWs) => {
      userWs.send(JSON.stringify(message));
    });
  }
}
const sendWsAMessage = (ws, message) => {
  if(_.isArray(ws)){
    ws.forEach((w) => w.send(JSON.stringify(message)))
  } else {
    ws.send(JSON.stringify(message))
  }
}

module.exports.sendHostAMessage = (gameCode, message) => {
  if (games[gameCode]) {
    games[gameCode].host.send(JSON.stringify(message));
  }
}

const getGame = (gameCode) => games[gameCode];